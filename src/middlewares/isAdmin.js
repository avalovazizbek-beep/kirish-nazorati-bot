const config = require('../config');
const { getExtraAdminIds } = require('../services/adminStore');

function isAdminId(id) {
  const numId = Number(id);
  return config.adminIds.includes(numId) || getExtraAdminIds().includes(numId);
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
