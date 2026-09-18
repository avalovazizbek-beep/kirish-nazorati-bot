const { Markup } = require('telegraf');

const BUTTONS = {
  REGISTER: "📝 Ro'yxatdan o'tish",
  RESET: '🔑 Login/Parolni tiklash',
  CONTACT_ADMIN: '💬 Adminga murojaat',
  END_CHAT: '🚫 Suhbatni tugatish',
};

const ADMIN_BUTTONS = {
  PENDING: '📋 Kutilayotgan arizalar',
  REPORTS: '📊 Hisobotlar',
  ADD_ADMIN: "➕ Admin qo'shish",
};

const mainMenu = Markup.keyboard([
  [BUTTONS.REGISTER],
  [BUTTONS.RESET],
  [BUTTONS.CONTACT_ADMIN],
]).resize();

const chatModeKeyboard = Markup.keyboard([[BUTTONS.END_CHAT]]).resize();

const adminMenu = Markup.keyboard([
  [ADMIN_BUTTONS.PENDING],
  [ADMIN_BUTTONS.REPORTS],
  [ADMIN_BUTTONS.ADD_ADMIN],
]).resize();

module.exports = { BUTTONS, ADMIN_BUTTONS, mainMenu, chatModeKeyboard, adminMenu };
