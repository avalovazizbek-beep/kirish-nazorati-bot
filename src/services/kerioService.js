const https = require('https');
const { URL } = require('url');
const config = require('../config');

/**
 * Kerio Control JSON-RPC klienti.
 *
 * Tasdiqlangan (real serverda tekshirilgan, hujjatga emas taxminga tayanmagan) faktlar:
 * - Session.login natijasida faqat { token } qaytadi.
 * - Keyingi har bir so'rovda HAM Cookie (SESSION_CONTROL_WEBADMIN + TOKEN_CONTROL_WEBADMIN)
 *   HAM "X-Token" header birga bo'lishi kerak - aks holda "-32001 Session expired." xatosi chiqadi.
 * - Mahalliy foydalanuvchilar domenining ID'si doim "local" (Domains.get orqali tasdiqlangan).
 * - Users.create tarmoq/routing metodlaridan farqli ravishda darhol kuchga kiradi
 *   (Session.confirmConfig / cutoff-prevention mexanizmiga bog'liq emas).
 * - Haqiqiy User obyekti maydonlari: credentials.userName/password/passwordChanged,
 *   fullName, description, email, authType, localEnabled, useTemplate,
 *   groups: [{ id, isGroup, domainName }].
 */

let session = null; // { cookie, token }
let domainIdCache = null;

function buildAgent() {
  return new https.Agent({ rejectUnauthorized: !config.kerioAllowSelfSigned });
}

function rawRequest(path, bodyObj, extraHeaders) {
  const target = new URL(config.kerioUrl);
  const body = JSON.stringify(bodyObj);
  const options = {
    hostname: target.hostname,
    port: target.port || 443,
    path,
    method: 'POST',
    agent: buildAgent(),
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      ...extraHeaders,
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ body: JSON.parse(data), setCookie: res.headers['set-cookie'] });
        } catch (err) {
          reject(new Error(`Kerio javobini o'qib bo'lmadi: ${err.message}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

let rpcId = 0;

async function rawRpc(method, params, authHeaders) {
  rpcId += 1;
  const path = config.kerioApiPath.endsWith('/') ? config.kerioApiPath : `${config.kerioApiPath}/`;
  const { body, setCookie } = await rawRequest(path, { jsonrpc: '2.0', id: rpcId, method, params }, authHeaders);
  return { body, setCookie };
}

async function login() {
  const { body, setCookie } = await rawRpc(
    'Session.login',
    {
      userName: config.kerioUsername,
      password: config.kerioPassword,
      application: {
        name: config.kerioApplicationName,
        vendor: config.kerioApplicationVendor,
        version: config.kerioApplicationVersion,
      },
    },
    {}
  );
  if (body.error || !body.result || !body.result.token) {
    throw new Error(`Kerio'ga kirib bo'lmadi: ${body.error ? body.error.message : "token qaytmadi"}`);
  }
  const cookie = (setCookie || []).map((c) => c.split(';')[0]).join('; ');
  session = { cookie, token: body.result.token };
  return session;
}

async function ensureSession() {
  if (!session) {
    await login();
  }
  return session;
}

function authHeadersFor(sess) {
  return {
    ...(sess.cookie ? { Cookie: sess.cookie } : {}),
    ...(sess.token ? { 'X-Token': sess.token } : {}),
  };
}

/** Session tugagan bo'lsa bir marta qayta login qilib qayta urinadi. */
async function rpc(method, params) {
  let sess = await ensureSession();
  let { body } = await rawRpc(method, params, authHeadersFor(sess));
  if (body.error && body.error.code === -32001) {
    sess = await login();
    ({ body } = await rawRpc(method, params, authHeadersFor(sess)));
  }
  if (body.error) {
    const err = new Error(body.error.message || 'Kerio API xatosi');
    err.kerioError = body.error;
    throw err;
  }
  return body.result;
}

async function getLocalDomainId() {
  if (domainIdCache) return domainIdCache;
  const result = await rpc('Domains.get', { query: { start: 0, limit: 50 } });
  const list = (result && result.list) || [];
  const local = list.find((d) => d.id === 'local') || list.find((d) => d.service && d.service.enabled);
  if (!local) throw new Error("Kerio'da mahalliy (local) domen topilmadi.");
  domainIdCache = local.id;
  return domainIdCache;
}

async function getGroupIdByName(name) {
  const domainId = await getLocalDomainId();
  const result = await rpc('UserGroups.get', { query: { start: 0, limit: 200 }, domainId });
  const list = (result && result.list) || [];
  const group = list.find((g) => g.name === name);
  if (!group) throw new Error(`Kerio'da "${name}" nomli guruh topilmadi.`);
  return group.id;
}

/** Barcha mahalliy userlarni yuklab, credentials.userName bo'yicha moslikni qidiradi. */
async function findUserByUsername(userName) {
  const domainId = await getLocalDomainId();
  const result = await rpc('Users.get', { query: { start: 0, limit: 5000 }, domainId });
  const list = (result && result.list) || [];
  const needle = userName.toLowerCase();
  return list.find((u) => u.credentials && String(u.credentials.userName || '').toLowerCase() === needle) || null;
}

async function usernameExists(userName) {
  const found = await findUserByUsername(userName);
  return !!found;
}

/**
 * Yangi Kerio foydalanuvchisini yaratadi.
 * KERIO_DRY_RUN=true bo'lsa, hech narsa yaratmaydi - faqat yuboriladigan so'rovni qaytaradi.
 */
async function createUser({ userName, password, fullName, description, groupIds }) {
  const domainId = await getLocalDomainId();
  const user = {
    credentials: { userName, password, passwordChanged: true },
    fullName: fullName || '',
    description: description || '',
    email: '',
    authType: 'Internal',
    localEnabled: true,
    useTemplate: true,
    groups: (groupIds || []).map((id) => ({ id, isGroup: true })),
  };

  if (config.kerioDryRun) {
    return {
      dryRun: true,
      request: { method: 'Users.create', params: { users: [{ ...user, credentials: { userName, password: '***', passwordChanged: true } }], domainId } },
    };
  }

  // Users.create ikkita "out" parametr qaytaradi (errors, result) - ikkalasi ham
  // shu bitta JSON-RPC javobi ichida birga keladi: { errors: [...], result: [...] }.
  const response = await rpc('Users.create', { users: [user], domainId });
  const errors = (response && response.errors) || [];
  if (errors.length) {
    const err = new Error(errors.map((e) => e.message).join('; '));
    err.kerioErrors = errors;
    throw err;
  }
  const created = response && response.result && response.result[0];
  return { dryRun: false, kerioUserId: created && created.id, raw: response };
}

async function logout() {
  if (!session) return;
  try {
    await rpc('Session.logout', {});
  } catch (err) {
    // logout xatosi kritik emas
  } finally {
    session = null;
  }
}

module.exports = {
  getLocalDomainId,
  getGroupIdByName,
  findUserByUsername,
  usernameExists,
  createUser,
  logout,
};
