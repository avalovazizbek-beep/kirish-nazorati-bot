const { Scenes } = require('telegraf');
const sheets = require('../services/sheetsService');
const { STATUS, REQUEST_TYPE } = require('../constants');
const { provisionKerioUser, markSent } = require('../services/kerioProvisioning');

const adminApproveScene = new Scenes.WizardScene(
  'admin-approve-scene',

  // 0: ariza turi bo'yicha tarmoqlanadi.
  // - Ro'yxatdan o'tish: Kerio hisobi avtomatik yaratiladi, admindan hech narsa so'ralmaydi.
  // - Parolni tiklash: eskidek admin login/parolni qo'lda yozadi (hozircha o'zgartirilmadi).
  async (ctx) => {
    const { applicationId } = ctx.scene.state;
    const application = await sheets.getApplication(applicationId);
    if (!application) {
      await ctx.reply("Ariza topilmadi (o'chirilgan bo'lishi mumkin).");
      return ctx.scene.leave();
    }

    if (application.requestType !== REQUEST_TYPE.REGISTRATION) {
      await ctx.reply(
        "Login va parolni bo'sh joy bilan ajratib yuboring.\nMasalan: student123 Parol#2024\n\nBekor qilish uchun /cancel"
      );
      return ctx.wizard.next();
    }

    await sheets.updateApplication(applicationId, { status: STATUS.APPROVED, adminId: String(ctx.from.id) });
    await ctx.reply('⏳ Kerio Control orqali hisob yaratilmoqda...');

    let result;
    try {
      result = await provisionKerioUser({ application });
    } catch (err) {
      result = { success: false, error: err };
    }

    if (result.skipped) {
      await ctx.reply(`Bu foydalanuvchi uchun Kerio hisobi allaqachon yaratilgan (${result.username}).`);
      return ctx.scene.leave();
    }

    if (!result.success) {
      const reason = (result.error && result.error.message) || "noma'lum xatolik";
      await ctx.reply(
        `❌ Kerio user yaratilmadi\nF.I.Sh: ${application.fullName}\nGuruh: ${application.guruh}\nSabab: ${reason}`
      );
      try {
        await ctx.telegram.sendMessage(
          application.telegramId,
          '⏳ Arizangiz tasdiqlandi, lekin hisob yaratishda texnik xatolik yuz berdi. Administrator tez orada tekshiradi.'
        );
      } catch (sendErr) {
        await ctx.reply(`Foydalanuvchiga ham xabar yuborib bo'lmadi: ${sendErr.message}`);
      }
      return ctx.scene.leave();
    }

    if (result.dryRun) {
      await ctx.reply(
        `🧪 DRY RUN - real Kerio user yaratilmadi, foydalanuvchiga ham xabar yuborilmadi.\n\n` +
          `Login: ${result.username}\nParol: ${result.password}\n\n` +
          `Yuboriladigan so'rov:\n${JSON.stringify(result.request, null, 2)}`
      );
      return ctx.scene.leave();
    }

    try {
      await ctx.telegram.sendMessage(
        application.telegramId,
        '✅ Arizangiz tasdiqlandi.\n\n' +
          `🔐 Kerio Control login:\n${result.username}\n\n` +
          `🔑 Parol:\n${result.password}\n\n` +
          'Login ma\'lumotlaringizni boshqa odamlarga bermang.'
      );
      await markSent(applicationId);
      await ctx.reply(`✅ Kerio hisob yaratildi va foydalanuvchiga yuborildi.\nLogin: ${result.username}`);
    } catch (err) {
      await ctx.reply(
        `Kerio hisob yaratildi (login: ${result.username}), lekin foydalanuvchiga xabar yuborib bo'lmadi: ${err.message}`
      );
    }
    return ctx.scene.leave();
  },

  // 1: faqat "Parolni tiklash" so'rovlari shu yerga yetib keladi (eski xulq-atvor).
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
    const { telegramId } = application;
    const successText = `🔑 Login va parolingiz yangilandi.\n\n🔑 Login: ${login}\n🔒 Parol: ${password}`;
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
