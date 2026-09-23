const sheets = require('./sheetsService');
const kerio = require('./kerioService');
const { generateUniqueUsername } = require('./usernameGenerator');
const { generatePassword } = require('./passwordGenerator');
const config = require('../config');
const { KERIO_STATUS } = require('../constants');
const { formatDate } = require('../utils/date');

/** "Familiya Ism" tartibida saqlangan fullName'dan ikkalasini ajratib oladi. */
function splitFamiliyaIsm(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { familiya: '', ism: '' };
  const [familiya, ...rest] = parts;
  return { familiya, ism: rest.join(' ') || familiya };
}

/**
 * Tasdiqlangan ro'yxatdan o'tish arizasi uchun Kerio Control'da foydalanuvchi yaratadi,
 * Google Sheets'ni yangilaydi. Telegram xabarlarini bu funksiya YUBORMAYDI - buni
 * chaqiruvchi (adminApproveScene) natija asosida o'zi bajaradi.
 */
async function provisionKerioUser({ application }) {
  const { id, fullName, guruh, faculty, telegramId } = application;

  if (application.kerioStatus === KERIO_STATUS.CREATED || application.kerioStatus === KERIO_STATUS.SENT) {
    return { skipped: true, username: application.kerioUsername };
  }

  await sheets.updateApplication(id, { kerioStatus: KERIO_STATUS.CREATING });

  const { familiya, ism } = splitFamiliyaIsm(fullName);
  let username;
  try {
    username = await generateUniqueUsername(familiya, ism, (candidate) => kerio.usernameExists(candidate));
  } catch (err) {
    await sheets.updateApplication(id, {
      kerioStatus: KERIO_STATUS.ERROR,
      kerioError: `Username tekshirishda xato: ${err.message}`.slice(0, 500),
    });
    return { success: false, error: err };
  }

  const password = generatePassword(6);
  const description = [faculty, guruh].filter(Boolean).join(', ');

  let groupIds = [];
  try {
    const groupId = await kerio.getGroupIdByName(config.kerioStudentGroupName);
    groupIds = [groupId];
  } catch (err) {
    console.error("Kerio guruhini topishda xatolik (userga guruhsiz davom etiladi):", err.message);
  }

  let createResult;
  try {
    createResult = await kerio.createUser({ userName: username, password, fullName, description, groupIds });
  } catch (err) {
    await sheets.updateApplication(id, {
      kerioStatus: KERIO_STATUS.ERROR,
      kerioError: err.message.slice(0, 500),
    });
    return { success: false, error: err, telegramId };
  }

  if (createResult.dryRun) {
    await sheets.updateApplication(id, {
      kerioStatus: KERIO_STATUS.DRY_RUN,
      kerioUsername: username,
      kerioPassword: password,
    });
    return { success: true, dryRun: true, username, password, request: createResult.request, telegramId };
  }

  await sheets.updateApplication(id, {
    kerioStatus: KERIO_STATUS.CREATED,
    kerioUsername: username,
    kerioPassword: password,
    kerioUserId: createResult.kerioUserId || '',
    kerioCreatedAt: formatDate(new Date()),
  });

  return { success: true, dryRun: false, username, password, kerioUserId: createResult.kerioUserId, telegramId };
}

async function markSent(applicationId) {
  await sheets.updateApplication(applicationId, { kerioStatus: KERIO_STATUS.SENT });
}

module.exports = { provisionKerioUser, markSent };
