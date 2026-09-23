require('dotenv').config();
const https = require('https');
const { URL } = require('url');
const config = require('../src/config');

/**
 * DIQQAT: Bu skript faqat O'QISH (read-only) so'rovlari yuboradi
 * (Session.login, Domains.get, UserGroups.get, Users.get).
 * Users.create / Users.set / Users.remove HECH QACHON chaqirilmaydi.
 * Maqsad - hujjatlardan topilgan maydon nomlarini (masalan CredentialsConfig
 * ichida "userName" yoki "username") haqiqiy serverdan tasdiqlash.
 */

const SENSITIVE_KEYS = new Set(['password', 'passwd', 'token']);

function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SENSITIVE_KEYS.has(k) ? '***REDACTED***' : redact(v);
    }
    return out;
  }
  return value;
}

function requestJsonRpc({ hostname, port, path, method, params, id, cookie, token, allowSelfSigned }) {
  const body = JSON.stringify({ jsonrpc: '2.0', id, method, params });
  const options = {
    hostname,
    port,
    path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      ...(cookie ? { Cookie: cookie } : {}),
      ...(token ? { 'X-Token': token } : {}),
    },
    rejectUnauthorized: !allowSelfSigned,
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch (err) {
          return reject(new Error(`JSON parse xatosi (${method}): ${err.message}\nRaw: ${data.slice(0, 300)}`));
        }
        resolve({ body: parsed, setCookie: res.headers['set-cookie'] });
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  if (!config.kerioUrl || !config.kerioUsername || !config.kerioPassword) {
    console.error(
      "Avval .env fayliga KERIO_URL, KERIO_USERNAME va KERIO_PASSWORD qiymatlarini to'ldiring, so'ng qayta ishga tushiring."
    );
    process.exit(1);
  }

  const target = new URL(config.kerioUrl);
  const basePath = config.kerioApiPath.replace(/\/$/, '');
  const rpc = (method, params, id, cookie, token) =>
    requestJsonRpc({
      hostname: target.hostname,
      port: target.port || 443,
      path: basePath + '/',
      method,
      params,
      id,
      cookie,
      token,
      allowSelfSigned: config.kerioAllowSelfSigned,
    });

  console.log(`\n[1] Session.login -> ${config.kerioUrl}${basePath}/`);
  const loginRes = await rpc(
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
    1
  );

  if (loginRes.body.error) {
    console.error('Login xato qaytardi:', JSON.stringify(loginRes.body.error));
    process.exit(1);
  }

  const cookie = (loginRes.setCookie || []).map((c) => c.split(';')[0]).join('; ');
  const token = loginRes.body.result && loginRes.body.result.token;
  console.log('Login OK. result kalitlari:', Object.keys(loginRes.body.result || {}));
  console.log('Cookie nomlari:', (loginRes.setCookie || []).map((c) => c.split('=')[0]));
  console.log('(token/parol qiymatlari konsolga chiqarilmaydi)\n');

  let domainId = '';

  try {
    console.log('[2] Domains.get (mahalliy domain ID sini topish uchun)');
    const domainsRes = await rpc(
      'Domains.get',
      { query: { start: 0, limit: 50 } },
      2,
      cookie,
      token
    );
    if (domainsRes.body.error) {
      console.log('  -> Domains.get xato:', JSON.stringify(domainsRes.body.error));
    } else {
      console.log('  -> natija:', JSON.stringify(redact(domainsRes.body.result), null, 2));
      const list = (domainsRes.body.result && (domainsRes.body.result.list || domainsRes.body.result.domains)) || [];
      const localDomain = list.find((d) => d.id === 'local') || list.find((d) => d.service && d.service.enabled) || list[0];
      if (localDomain && localDomain.id) {
        domainId = localDomain.id;
        console.log('  -> aniqlangan domainId (local):', JSON.stringify(domainId));
      }
    }
  } catch (err) {
    console.log('  -> Domains.get chaqirib bo\'lmadi:', err.message);
  }

  try {
    console.log('\n[3] UserGroups.get (guruhlar ro\'yxati uchun)');
    const groupsRes = await rpc(
      'UserGroups.get',
      { query: { start: 0, limit: 50 }, domainId },
      3,
      cookie,
      token
    );
    if (groupsRes.body.error) {
      console.log('  -> UserGroups.get xato:', JSON.stringify(groupsRes.body.error));
    } else {
      console.log('  -> natija:', JSON.stringify(redact(groupsRes.body.result), null, 2));
    }
  } catch (err) {
    console.log('  -> UserGroups.get chaqirib bo\'lmadi:', err.message);
  }

  try {
    console.log('\n[4b] Users.get bilan fields: ["LIST_USERS"] (yengilroq javob sinovi)');
    const lightRes = await rpc(
      'Users.get',
      { query: { start: 0, limit: 3, fields: ['LIST_USERS'] }, domainId },
      41,
      cookie,
      token
    );
    if (lightRes.body.error) {
      console.log('  -> xato:', JSON.stringify(lightRes.body.error));
    } else {
      console.log('  -> natija:', JSON.stringify(redact(lightRes.body.result), null, 2));
    }
  } catch (err) {
    console.log('  -> chaqirib bo\'lmadi:', err.message);
  }

  try {
    console.log('\n[4c] Users.get "conditions" bilan aniq username filtri sinovi (ehtimoliy shakl)');
    const condRes = await rpc(
      'Users.get',
      {
        query: {
          start: 0,
          limit: 5,
          conditions: [[{ fieldName: 'login', comparator: 'Equal', value: 'abduraimova_m' }]],
        },
        domainId,
      },
      42,
      cookie,
      token
    );
    if (condRes.body.error) {
      console.log('  -> xato (bu normal, faqat shaklni aniqlash uchun urinish edi):', JSON.stringify(condRes.body.error));
    } else {
      console.log('  -> ISHLADI! natija:', JSON.stringify(redact(condRes.body.result), null, 2));
    }
  } catch (err) {
    console.log('  -> chaqirib bo\'lmadi:', err.message);
  }

  try {
    console.log('\n[4] Users.get (1-2 ta mavjud user orqali haqiqiy maydon nomlarini ko\'rish)');
    const usersRes = await rpc(
      'Users.get',
      { query: { start: 0, limit: 2 }, domainId },
      4,
      cookie,
      token
    );
    if (usersRes.body.error) {
      console.log('  -> Users.get xato:', JSON.stringify(usersRes.body.error));
    } else {
      console.log('  -> natija (parol/kredensial maydonlari yashirilgan):');
      console.log(JSON.stringify(redact(usersRes.body.result), null, 2));
    }
  } catch (err) {
    console.log('  -> Users.get chaqirib bo\'lmadi:', err.message);
  }

  console.log('\n[5] Session.logout');
  try {
    await rpc('Session.logout', {}, 5, cookie, token);
    console.log('  -> chiqildi.');
  } catch (err) {
    console.log('  -> logout chaqirib bo\'lmadi:', err.message);
  }
}

main().catch((err) => {
  console.error('Xatolik:', err.message);
  process.exit(1);
});
