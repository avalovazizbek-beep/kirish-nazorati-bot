const { Scenes, Markup } = require('telegraf');
const sheets = require('../services/sheetsService');
const { notifyAdmins } = require('../services/notifyAdmins');
const { mainMenu } = require('../keyboards/mainMenu');
const { REQUEST_TYPE } = require('../constants');
const { uploadPhotoAndGetUrl } = require('../services/driveService');

const registerScene = new Scenes.WizardScene(
  'register-scene',

  // 0: telefon raqamni so'rash
  async (ctx) => {
    ctx.wizard.state.data = { telegramId: ctx.from.id, username: ctx.from.username || '' };
    await ctx.reply(
      "Ro'yxatdan o'tish uchun telefon raqamingizni yuboring 👇\n\nBekor qilish uchun /cancel",
      Markup.keyboard([Markup.button.contactRequest('📱 Raqamni yuborish')]).resize().oneTime()
    );
    return ctx.wizard.next();
  },

  // 1: raqamni qabul qilish -> ism familiya so'rash
  async (ctx) => {
    const contact = ctx.message && ctx.message.contact;
    if (!contact) {
      await ctx.reply("Iltimos, pastdagi tugma orqali raqamingizni yuboring.");
      return;
    }
    if (contact.user_id && contact.user_id !== ctx.from.id) {
      await ctx.reply("Iltimos, faqat o'zingizning raqamingizni yuboring.");
      return;
    }
    ctx.wizard.state.data.phone = contact.phone_number;
    await ctx.reply('Ism va familiyangizni kiriting (masalan: Aziz Valiyev):', Markup.removeKeyboard());
    return ctx.wizard.next();
  },

  // 2: ism familiya -> fakultet so'rash
  async (ctx) => {
    const text = ctx.message && ctx.message.text && ctx.message.text.trim();
    if (!text) {
      await ctx.reply("Iltimos, ism va familiyangizni matn ko'rinishida yuboring.");
      return;
    }
    ctx.wizard.state.data.fullName = text;
    await ctx.reply('Fakultetingizni kiriting:');
    return ctx.wizard.next();
  },

  // 3: fakultet -> yo'nalish so'rash
  async (ctx) => {
    const text = ctx.message && ctx.message.text && ctx.message.text.trim();
    if (!text) {
      await ctx.reply("Iltimos, fakultet nomini matn ko'rinishida kiriting.");
      return;
    }
    ctx.wizard.state.data.faculty = text;
    await ctx.reply("Yo'nalishingizni kiriting:");
    return ctx.wizard.next();
  },

  // 4: yo'nalish -> guruh so'rash
  async (ctx) => {
    const text = ctx.message && ctx.message.text && ctx.message.text.trim();
    if (!text) {
      await ctx.reply("Iltimos, yo'nalishni matn ko'rinishida kiriting.");
      return;
    }
    ctx.wizard.state.data.yonalish = text;
    await ctx.reply('Guruhingizni kiriting:');
    return ctx.wizard.next();
  },

  // 5: guruh -> rasm so'rash
  async (ctx) => {
    const text = ctx.message && ctx.message.text && ctx.message.text.trim();
    if (!text) {
      await ctx.reply("Iltimos, guruh nomini matn ko'rinishida kiriting.");
      return;
    }
    ctx.wizard.state.data.guruh = text;
    await ctx.reply('Endi passport (yoki ID karta) rasmini yuboring 📷');
    return ctx.wizard.next();
  },

  // 6: rasm -> tasdiqlash uchun xulosa
  async (ctx) => {
    const photos = ctx.message && ctx.message.photo;
    if (!photos || !photos.length) {
      await ctx.reply('Iltimos, rasmni surat (photo) ko\'rinishida yuboring.');
      return;
    }
    ctx.wizard.state.data.photoFileId = photos[photos.length - 1].file_id;
    const d = ctx.wizard.state.data;
    const summary =
      `Ma'lumotlaringizni tekshiring:\n\n` +
      `📱 Telefon: ${d.phone}\n` +
      `👤 F.I.Sh: ${d.fullName}\n` +
      `🏛 Fakultet: ${d.faculty}\n` +
      `🧭 Yo'nalish: ${d.yonalish}\n` +
      `👥 Guruh: ${d.guruh}`;
    await ctx.replyWithPhoto(d.photoFileId, {
      caption: summary,
      ...Markup.inlineKeyboard([
        Markup.button.callback('✅ Tasdiqlash', 'reg_confirm'),
        Markup.button.callback('❌ Bekor qilish', 'reg_cancel'),
      ]),
    });
    return ctx.wizard.next();
  },

  // 7: tugmani kutish
  async (ctx) => {
    await ctx.reply('Iltimos, yuqoridagi tugmalardan birini bosing.');
  }
);

registerScene.command('cancel', async (ctx) => {
  await ctx.reply("Ro'yxatdan o'tish bekor qilindi.", mainMenu);
  return ctx.scene.leave();
});

registerScene.action('reg_confirm', async (ctx) => {
  await ctx.answerCbQuery();
  const d = ctx.wizard.state.data;
  let photoUrl = '';
  try {
    photoUrl = await uploadPhotoAndGetUrl(ctx.telegram, d.photoFileId);
  } catch (err) {
    console.error('Rasmni Drive-ga yuklashda xatolik:', err.message);
  }
  const applicationData = { ...d, requestType: REQUEST_TYPE.REGISTRATION, photoUrl };
  const id = await sheets.addApplication(applicationData);
  await ctx.editMessageCaption("✅ Arizangiz qabul qilindi, admin ko'rib chiqmoqda...", {
    reply_markup: { inline_keyboard: [] },
  });
  await notifyAdmins(ctx, id, applicationData);
  await ctx.reply(
    'Arizangiz yuborildi. Admin tasdiqlagach, login va parolingiz shu yerga yuboriladi.',
    mainMenu
  );
  return ctx.scene.leave();
});

registerScene.action('reg_cancel', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageCaption('❌ Bekor qilindi.', { reply_markup: { inline_keyboard: [] } });
  await ctx.reply("Ro'yxatdan o'tish bekor qilindi.", mainMenu);
  return ctx.scene.leave();
});

module.exports = registerScene;
