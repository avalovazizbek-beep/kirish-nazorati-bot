const { Telegraf, Scenes } = require('telegraf');
const LocalSession = require('telegraf-session-local');

const config = require('./config');
const { isAdmin, isAdminId } = require('./middlewares/isAdmin');
const { BUTTONS, ADMIN_BUTTONS, mainMenu, adminMenu } = require('./keyboards/mainMenu');
const { sendPendingApplications } = require('./handlers/pending');
const {
  startUserChat,
  endUserChat,
  relayUserMessageToAdmins,
  relayAdminMessageToUser,
} = require('./handlers/chat');

const registerScene = require('./scenes/registerScene');
const resetScene = require('./scenes/resetScene');
const adminApproveScene = require('./scenes/adminApproveScene');
const adminRejectScene = require('./scenes/adminRejectScene');
const addAdminScene = require('./scenes/addAdminScene');

const bot = new Telegraf(config.botToken);

const localSession = new LocalSession({ database: 'sessions.json' });
bot.use(localSession.middleware());

const stage = new Scenes.Stage([
  registerScene,
  resetScene,
  adminApproveScene,
  adminRejectScene,
  addAdminScene,
]);
bot.use(stage.middleware());

bot.start(async (ctx) => {
  ctx.session.chatMode = false;
  if (isAdminId(ctx.from.id)) {
    await ctx.reply(
      'Salom, Admin!\n\n' +
        "Foydalanuvchilardan kelgan ro'yxatdan o'tish va parol tiklash arizalari sizga shu yerga avtomatik keladi.\n\n" +
        '/pending - kutilayotgan arizalar ro\'yxati',
      adminMenu
    );
    return;
  }
  await ctx.reply(
    'Assalomu alaykum! 👋\n\n' +
      'Bu bot orqali tizimga kirish uchun LOGIN va PAROL olishingiz yoki mavjud login-parolingizni tiklashingiz mumkin.\n\n' +
      'Quyidagi tugmalardan birini tanlang:',
    mainMenu
  );
});

bot.hears(BUTTONS.REGISTER, (ctx) => ctx.scene.enter('register-scene'));
bot.hears(BUTTONS.RESET, (ctx) => ctx.scene.enter('reset-scene'));
bot.hears(BUTTONS.CONTACT_ADMIN, (ctx) => startUserChat(ctx));
bot.hears(BUTTONS.END_CHAT, (ctx) => endUserChat(ctx, mainMenu));

bot.command('pending', isAdmin, (ctx) => sendPendingApplications(ctx));
bot.hears(ADMIN_BUTTONS.PENDING, isAdmin, (ctx) => sendPendingApplications(ctx));

bot.hears(ADMIN_BUTTONS.REPORTS, isAdmin, async (ctx) => {
  const link = `https://docs.google.com/spreadsheets/d/${config.googleSheetId}/edit`;
  await ctx.reply(`📊 Barcha arizalar va foydalanuvchilar ma'lumotlari shu jadvalda:\n${link}`);
});

bot.hears(ADMIN_BUTTONS.ADD_ADMIN, isAdmin, (ctx) => ctx.scene.enter('add-admin-scene'));

bot.command('stopreply', isAdmin, async (ctx) => {
  ctx.session.replyTo = null;
  await ctx.reply("Javob berish rejimi tugatildi.");
});

bot.action(/^approve_(.+)$/, isAdmin, async (ctx) => {
  await ctx.answerCbQuery();
  const applicationId = ctx.match[1];
  await ctx.scene.enter('admin-approve-scene', { applicationId });
});

bot.action(/^reject_(.+)$/, isAdmin, async (ctx) => {
  await ctx.answerCbQuery();
  const applicationId = ctx.match[1];
  await ctx.scene.enter('admin-reject-scene', { applicationId });
});

bot.action(/^replyto_(\d+)$/, isAdmin, async (ctx) => {
  ctx.session.replyTo = ctx.match[1];
  await ctx.answerCbQuery();
  await ctx.reply('Endi yozgan xabaringiz shu foydalanuvchiga yuboriladi.\nTugatish: /stopreply');
});

bot.on('message', async (ctx) => {
  if (isAdminId(ctx.from.id)) {
    const handled = await relayAdminMessageToUser(ctx);
    if (!handled) {
      await ctx.reply('Javob berish uchun foydalanuvchi xabaridagi "Javob berish" tugmasini bosing.');
    }
    return;
  }
  if (ctx.session.chatMode) {
    await relayUserMessageToAdmins(ctx);
    return;
  }
  await ctx.reply('Buyruqni tushunmadim. Quyidagi tugmalardan birini tanlang:', mainMenu);
});

bot.catch((err, ctx) => {
  console.error(`Xatolik yuz berdi (update turi: ${ctx.updateType}):`, err);
});

bot
  .launch()
  .then(() => console.log('Bot ishga tushdi ✅'))
  .catch((err) => {
    console.error("Botni ishga tushirishda xatolik:", err);
    process.exit(1);
  });

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
