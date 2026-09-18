const config = require('../config');

function isAdminId(id) {
  return config.adminIds.includes(Number(id));
}

async function isAdmin(ctx, next) {
  if (!ctx.from || !isAdminId(ctx.from.id)) {
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery("Sizda ruxsat yo'q.");
    } else {
      await ctx.reply("Sizda ruxsat yo'q.");
    }
    return;
  }
  return next();
}

module.exports = { isAdmin, isAdminId };
