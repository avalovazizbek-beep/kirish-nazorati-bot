const { Markup } = require('telegraf');
const config = require('../config');
const { REQUEST_TYPE } = require('../constants');

async function notifyAdmins(ctx, applicationId, data) {
  const emoji = data.requestType === REQUEST_TYPE.REGISTRATION ? '🆕' : '🔑';
  const typeLabel = `${emoji} ${data.requestType}`;

  let caption = `${typeLabel}\n\n`;
  caption += `👤 F.I.Sh: ${data.fullName}\n`;
  if (data.phone) caption += `📱 Telefon: ${data.phone}\n`;
  if (data.faculty) caption += `🏛 Fakultet: ${data.faculty}\n`;
  if (data.yonalish) caption += `🧭 Yo'nalish: ${data.yonalish}\n`;
  if (data.guruh) caption += `👥 Guruh: ${data.guruh}\n`;
  caption += `\n🆔 Telegram: ${data.telegramId}`;
  if (data.username) caption += ` (@${data.username})`;

  const keyboard = Markup.inlineKeyboard([
    Markup.button.callback('✅ Tasdiqlash', `approve_${applicationId}`),
    Markup.button.callback('❌ Rad etish', `reject_${applicationId}`),
  ]);

  for (const adminId of config.adminIds) {
    try {
      await ctx.telegram.sendPhoto(adminId, data.photoFileId, { caption, ...keyboard });
    } catch (err) {
      console.error(`Adminga yuborishda xatolik (${adminId}):`, err.message);
    }
  }
}

module.exports = { notifyAdmins };
