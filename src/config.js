require('dotenv').config();

function parseAdminIds(raw) {
  return (raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number);
}

const config = {
  botToken: process.env.BOT_TOKEN,
  adminIds: parseAdminIds(process.env.ADMIN_IDS),
  googleServiceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  googlePrivateKey: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  googleSheetId: process.env.GOOGLE_SHEET_ID,
  googleOAuthClientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
  googleOAuthClientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  googleOAuthRefreshToken: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
  kerioUrl: process.env.KERIO_URL,
  kerioApiPath: process.env.KERIO_API_PATH || '/admin/api/jsonrpc/',
  kerioUsername: process.env.KERIO_USERNAME,
  kerioPassword: process.env.KERIO_PASSWORD,
  kerioApplicationName: process.env.KERIO_APPLICATION_NAME || 'Telegram Bot',
  kerioApplicationVendor: process.env.KERIO_APPLICATION_VENDOR || 'SIES',
  kerioApplicationVersion: process.env.KERIO_APPLICATION_VERSION || '1.0',
  kerioAllowSelfSigned: (process.env.KERIO_ALLOW_SELF_SIGNED || 'true') === 'true',
  kerioDryRun: (process.env.KERIO_DRY_RUN || 'true') === 'true',
  kerioStudentGroupName: process.env.KERIO_STUDENT_GROUP_NAME || 'Студенты',
};

const required = [
  'botToken',
  'googleServiceAccountEmail',
  'googlePrivateKey',
  'googleSheetId',
  'googleOAuthClientId',
  'googleOAuthClientSecret',
  'googleOAuthRefreshToken',
];
const missing = required.filter((key) => !config[key]);
if (missing.length) {
  console.warn(`[Ogohlantirish] .env faylida to'ldirilmagan qiymatlar: ${missing.join(', ')}`);
}
if (!config.adminIds.length) {
  console.warn('[Ogohlantirish] ADMIN_IDS bo\'sh - hech kim admin sifatida aniqlanmaydi.');
}

module.exports = config;
