const { Markup } = require('telegraf');
const sheets = require('../services/sheetsService');
const { REQUEST_TYPE } = require('../constants');

async function sendPendingApplications(ctx) {
  const rows = await sheets.getPendingApplications();
  if (!rows.length) {
    await ctx.reply("Hozircha kutilayotgan arizalar yo'q.");
    return;
  }
  for (const row of rows.slice(0, 20)) {
    const emoji = row.requestType === REQUEST_TYPE.REGISTRATION ? '🆕' : '🔑';
    const caption =
      `${emoji} ${row.requestType}\n` +
      `👤 ${row.fullName}\n` +
      `🆔 ${row.telegramId}\n` +
      `📅 ${row.createdAt}`;
    const keyboard = Markup.inlineKeyboard([
      Markup.button.callback('✅ Tasdiqlash', `approve_${row.id}`),
      Markup.button.callback('❌ Rad etish', `reject_${row.id}`),
    ]);
    if (row.photoFileId) {
      try {
        await ctx.replyWithPhoto(row.photoFileId, { caption, ...keyboard });
        continue;
      } catch (err) {
        console.error(`Rasmni yuborib bo'lmadi (ariza ${row.id}):`, err.message);
      }
    }
    await ctx.reply(caption, keyboard);
  }
}

module.exports = { sendPendingApplications };
