const { randomInt } = require('crypto');

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function generatePassword(length = 6) {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += LETTERS[randomInt(LETTERS.length)];
  }
  return out;
}

module.exports = { generatePassword };
