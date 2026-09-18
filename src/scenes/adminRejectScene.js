const { Scenes } = require('telegraf');
const sheets = require('../services/sheetsService');
const { STATUS } = require('../constants');

const adminRejectScene = new Scenes.WizardScene(
  'admin-reject-scene',

  // 0: sababni so'rash
  async (ctx) => {
    await ctx.reply("Rad etish sababini yozing (yoki o'tkazib yuborish uchun /skip):");
    return ctx.wizard.next();
  },

  // 1: sababni qabul qilish va saqlash
  async (ctx) => {
    const text = ctx.message && ctx.message.text && ctx.message.text.trim();
    if (text === '/cancel') {
      await ctx.reply('Bekor qilindi.');
      return ctx.scene.leave();
    }
    const reason = text === '/skip' ? '' : text || '';
    const { applicationId } = ctx.scene.state;
    const application = await sheets.updateApplication(applicationId, {
      status: STATUS.REJECTED,
      adminId: String(ctx.from.id),
    });
    if (!application) {
      await ctx.reply('Ariza topilmadi.');
      return ctx.scene.leave();
    }
    const { telegramId } = application;
    let userText = '❌ Arizangiz rad etildi.';
    if (reason) userText += `\nSabab: ${reason}`;
    try {
      await ctx.telegram.sendMessage(telegramId, userText);
      await ctx.reply('Rad etildi va foydalanuvchiga xabar berildi.');
    } catch (err) {
      await ctx.reply(`Foydalanuvchiga xabar yuborib bo'lmadi: ${err.message}`);
    }
    return ctx.scene.leave();
  }
);

module.exports = adminRejectScene;
