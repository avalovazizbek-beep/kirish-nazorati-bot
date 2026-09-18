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
