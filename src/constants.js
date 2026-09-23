const STATUS = {
  PENDING: 'Kutilmoqda',
  APPROVED: 'Tasdiqlangan',
  REJECTED: 'Rad etildi',
};

const REQUEST_TYPE = {
  REGISTRATION: "Ro'yxatdan o'tish",
  RESET: 'Parolni tiklash',
};

const KERIO_STATUS = {
  PENDING: 'PENDING',
  CREATING: 'CREATING',
  CREATED: 'CREATED',
  SENT: 'SENT',
  ERROR: 'ERROR',
  DRY_RUN: 'DRY_RUN',
};

module.exports = { STATUS, REQUEST_TYPE, KERIO_STATUS };
