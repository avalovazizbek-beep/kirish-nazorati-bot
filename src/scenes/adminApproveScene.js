const { Scenes } = require('telegraf');
const sheets = require('../services/sheetsService');
const { STATUS, REQUEST_TYPE } = require('../constants');

const adminApproveScene = new Scenes.WizardScene(
  'admin-approve-scene',

  // 0: login/parol so'rash
  async (ctx) => {
    await ctx.reply(
      "Login va parolni bo'sh joy bilan ajratib yuboring.\nMasalan: student123 Parol#2024\n\nBekor qilish uchun /cancel"
    );
    return ctx.wizard.next();
  },

  // 1: login/parolni qabul qilish va saqlash
  async (ctx) => {
    const text = ctx.message && ctx.message.text && ctx.message.text.trim();
    const parts = text ? text.split(/\s+/) : [];
    if (parts.length !== 2) {
      await ctx.reply(
        "Noto'g'ri format. Login va parolni bo'sh joy bilan ajratib qayta yuboring:\nMasalan: student123 Parol#2024"
      );
      return;
    }
    const [login, password] = parts;
    const { applicationId } = ctx.scene.state;
    const application = await sheets.updateApplication(applicationId, {
      status: STATUS.APPROVED,
      login,
      password,
      adminId: String(ctx.from.id),
    });
    if (!application) {
      await ctx.reply("Ariza topilmadi (o'chirilgan bo'lishi mumkin).");
      return ctx.scene.leave();
    }
    const { telegramId, requestType } = application;
    const successText =
      requestType === REQUEST_TYPE.REGISTRATION
        ? `🎉 Tabriklaymiz! Arizangiz tasdiqlandi.\n\n🔑 Login: ${login}\n🔒 Parol: ${password}`
        : `🔑 Login va parolingiz yangilandi.\n\n🔑 Login: ${login}\n🔒 Parol: ${password}`;
    try {
      await ctx.telegram.sendMessage(telegramId, successText);
      await ctx.reply('✅ Yuborildi va saqlandi.');
    } catch (err) {
      await ctx.reply(`Foydalanuvchiga xabar yuborib bo'lmadi: ${err.message}`);
    }
    return ctx.scene.leave();
  }
);

adminApproveScene.command('cancel', async (ctx) => {
  await ctx.reply('Bekor qilindi.');
  return ctx.scene.leave();
});

module.exports = adminApproveScene;
