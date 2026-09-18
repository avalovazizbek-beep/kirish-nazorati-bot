const { Scenes, Markup } = require('telegraf');
const sheets = require('../services/sheetsService');
const { notifyAdmins } = require('../services/notifyAdmins');
const { mainMenu } = require('../keyboards/mainMenu');
const { REQUEST_TYPE } = require('../constants');
const { uploadPhotoAndGetUrl } = require('../services/driveService');

const resetScene = new Scenes.WizardScene(
  'reset-scene',

  // 0: ism familiya so'rash
  async (ctx) => {
    ctx.wizard.state.data = { telegramId: ctx.from.id, username: ctx.from.username || '' };
    await ctx.reply(
      'Ism va familiyangizni kiriting:\n\nBekor qilish uchun /cancel',
      Markup.removeKeyboard()
    );
    return ctx.wizard.next();
  },

  // 1: ism familiya -> rasm so'rash
  async (ctx) => {
    const text = ctx.message && ctx.message.text && ctx.message.text.trim();
    if (!text) {
      await ctx.reply("Iltimos, ism va familiyangizni matn ko'rinishida kiriting.");
      return;
    }
    ctx.wizard.state.data.fullName = text;
    await ctx.reply('Passport (yoki ID karta) rasmini yuboring 📷');
    return ctx.wizard.next();
  },

  // 2: rasm -> tasdiqlash uchun xulosa
  async (ctx) => {
    const photos = ctx.message && ctx.message.photo;
    if (!photos || !photos.length) {
      await ctx.reply('Iltimos, rasmni surat (photo) ko\'rinishida yuboring.');
      return;
    }
    ctx.wizard.state.data.photoFileId = photos[photos.length - 1].file_id;
    const d = ctx.wizard.state.data;
    const summary = `Ma'lumotlaringizni tekshiring:\n\n👤 F.I.Sh: ${d.fullName}`;
    await ctx.replyWithPhoto(d.photoFileId, {
      caption: summary,
      ...Markup.inlineKeyboard([
        Markup.button.callback('✅ Tasdiqlash', 'reset_confirm'),
        Markup.button.callback('❌ Bekor qilish', 'reset_cancel'),
      ]),
    });
    return ctx.wizard.next();
  },

  // 3: tugmani kutish
  async (ctx) => {
    await ctx.reply('Iltimos, yuqoridagi tugmalardan birini bosing.');
  }
);

resetScene.command('cancel', async (ctx) => {
  await ctx.reply('Amal bekor qilindi.', mainMenu);
  return ctx.scene.leave();
});

resetScene.action('reset_confirm', async (ctx) => {
  await ctx.answerCbQuery();
  const d = ctx.wizard.state.data;
  let photoUrl = '';
  try {
    photoUrl = await uploadPhotoAndGetUrl(ctx.telegram, d.photoFileId);
  } catch (err) {
    console.error('Rasmni Drive-ga yuklashda xatolik:', err.message);
  }
  const applicationData = { ...d, requestType: REQUEST_TYPE.RESET, photoUrl };
  const id = await sheets.addApplication(applicationData);
  await ctx.editMessageCaption("✅ So'rovingiz qabul qilindi, admin ko'rib chiqmoqda...", {
    reply_markup: { inline_keyboard: [] },
  });
  await notifyAdmins(ctx, id, applicationData);
  await ctx.reply(
    "So'rovingiz yuborildi. Admin tasdiqlagach, yangi login va parolingiz shu yerga yuboriladi.",
    mainMenu
  );
  return ctx.scene.leave();
});

resetScene.action('reset_cancel', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageCaption('❌ Bekor qilindi.', { reply_markup: { inline_keyboard: [] } });
  await ctx.reply('Amal bekor qilindi.', mainMenu);
  return ctx.scene.leave();
});

module.exports = resetScene;
