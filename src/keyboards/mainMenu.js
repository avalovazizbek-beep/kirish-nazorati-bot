const { Markup } = require('telegraf');

const BUTTONS = {
  REGISTER: "📝 Ro'yxatdan o'tish",
  RESET: '🔑 Login/Parolni tiklash',
  CONTACT_ADMIN: '💬 Adminga murojaat',
  END_CHAT: '🚫 Suhbatni tugatish',
};

const mainMenu = Markup.keyboard([
  [BUTTONS.REGISTER],
  [BUTTONS.RESET],
  [BUTTONS.CONTACT_ADMIN],
]).resize();

const chatModeKeyboard = Markup.keyboard([[BUTTONS.END_CHAT]]).resize();

module.exports = { BUTTONS, mainMenu, chatModeKeyboard };
