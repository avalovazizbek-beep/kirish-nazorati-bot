const { Scenes } = require('telegraf');
const { addAdminId } = require('../services/adminStore');

const addAdminScene = new Scenes.WizardScene(
  'add-admin-scene',

  // 0: Telegram ID so'rash
  async (ctx) => {
    await ctx.reply(
      "Yangi adminning Telegram ID raqamini yuboring (masalan: 123456789).\n" +
        "ID'ni bilish uchun o'sha odam @userinfobot ga /start bosishi kerak.\n\n" +
        'Bekor qilish uchun /cancel'
    );
    return ctx.wizard.next();
  },

  // 1: ID'ni qabul qilish va saqlash
  async (ctx) => {
    const text = ctx.message && ctx.message.text && ctx.message.text.trim();
    if (text === '/cancel') {
      await ctx.reply('Bekor qilindi.');
      return ctx.scene.leave();
    }
    if (!text || !/^\d+$/.test(text)) {
      await ctx.reply(
        "Noto'g'ri format. Faqat raqamlardan iborat Telegram ID yuboring, yoki bekor qilish uchun /cancel:"
      );
      return;
    }
    addAdminId(text);
    await ctx.reply(`✅ ${text} endi admin sifatida qo'shildi.`);
    try {
      await ctx.telegram.sendMessage(text, '🎉 Sizga ushbu botda admin huquqi berildi.\n/start bosing.');
    } catch (err) {
      // foydalanuvchi botni hali ishga tushirmagan bo'lishi mumkin - bu muammo emas
    }
    return ctx.scene.leave();
  }
);

module.exports = addAdminScene;
