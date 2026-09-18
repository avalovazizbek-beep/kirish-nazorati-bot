const { Markup } = require('telegraf');
const config = require('../config');
const { chatModeKeyboard } = require('../keyboards/mainMenu');

async function startUserChat(ctx) {
  ctx.session.chatMode = true;
  await ctx.reply(
    "Xabaringizni yozing, admin ko'rib javob beradi.\nSuhbatni tugatish uchun pastdagi tugmani bosing.",
    chatModeKeyboard
  );
}

async function endUserChat(ctx, mainMenu) {
  ctx.session.chatMode = false;
  await ctx.reply('Suhbat tugatildi.', mainMenu);
}

async function relayUserMessageToAdmins(ctx) {
  const nameLine = `${ctx.from.first_name || ''} ${ctx.from.last_name || ''}`.trim();
  const header =
    `✉️ Foydalanuvchidan xabar\n` +
    `👤 ${nameLine || 'Noma\'lum'}${ctx.from.username ? ` (@${ctx.from.username})` : ''}\n` +
    `🆔 ${ctx.from.id}`;
  const keyboard = Markup.inlineKeyboard([
    Markup.button.callback('↩️ Javob berish', `replyto_${ctx.from.id}`),
  ]);
  for (const adminId of config.adminIds) {
    try {
      await ctx.telegram.sendMessage(adminId, header, keyboard);
      await ctx.telegram.copyMessage(adminId, ctx.chat.id, ctx.message.message_id);
    } catch (err) {
      console.error(`Adminga xabar yuborishda xatolik (${adminId}):`, err.message);
    }
  }
}

async function relayAdminMessageToUser(ctx) {
  const userId = ctx.session.replyTo;
  if (!userId) return false;
  try {
    await ctx.telegram.sendMessage(userId, '👨‍💼 Admin javobi:');
    await ctx.telegram.copyMessage(userId, ctx.chat.id, ctx.message.message_id);
    await ctx.reply('✅ Yuborildi.');
  } catch (err) {
    await ctx.reply(`Yuborishda xatolik: ${err.message}`);
  }
  return true;
}

module.exports = {
  startUserChat,
  endUserChat,
  relayUserMessageToAdmins,
  relayAdminMessageToUser,
};
