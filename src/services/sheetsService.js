const { randomUUID } = require('crypto');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const config = require('../config');
const { STATUS } = require('../constants');
const { formatDate } = require('../utils/date');

const SHEET_TITLE = 'Arizalar';

const HEADER_MAP = {
  id: 'ID',
  telegramId: 'Telegram ID',
  username: 'Foydalanuvchi nomi',
  requestType: "So'rov turi",
  phone: 'Telefon raqami',
  fullName: 'F.I.Sh',
  faculty: 'Fakultet',
  yonalish: "Yo'nalish",
  guruh: 'Guruh',
  photoFileId: 'Rasm ID',
  photoPreview: 'Rasm',
  status: 'Holati',
  login: 'Login',
  password: 'Parol',
  adminId: 'Admin ID',
  createdAt: 'Yaratilgan sana',
  updatedAt: 'Yangilangan sana',
  photoUrl: 'Rasm manzili',
};

const HEADERS = Object.values(HEADER_MAP);
const PHOTO_COLUMN_INDEX = Object.keys(HEADER_MAP).indexOf('photoPreview');
const ROW_HEIGHT_PX = 220;
const PHOTO_COLUMN_WIDTH_PX = 170;

let sheetPromise = null;

async function getSheet() {
  if (!sheetPromise) {
    sheetPromise = (async () => {
      const auth = new JWT({
        email: config.googleServiceAccountEmail,
        key: config.googlePrivateKey,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      const doc = new GoogleSpreadsheet(config.googleSheetId, auth);
      await doc.loadInfo();
      let sheet = doc.sheetsByTitle[SHEET_TITLE];
      if (!sheet) {
        sheet = await doc.addSheet({ title: SHEET_TITLE, headerValues: HEADERS });
      } else {
        try {
          await sheet.loadHeaderRow();
        } catch (err) {
          // varaqda hali sarlavha qatori yo'q, pastda yaratiladi
        }
        const current = sheet.headerValues || [];
        const isSame = current.length === HEADERS.length && current.every((h, i) => h === HEADERS[i]);
        if (!isSame) {
          await sheet.setHeaderRow(HEADERS);
        }
      }
      try {
        await sheet.updateDimensionProperties(
          'COLUMNS',
          { pixelSize: PHOTO_COLUMN_WIDTH_PX },
          { startIndex: PHOTO_COLUMN_INDEX, endIndex: PHOTO_COLUMN_INDEX + 1 }
        );
      } catch (err) {
        console.error("Rasm ustuni kengligini sozlashda xatolik:", err.message);
      }
      return sheet;
    })();
  }
  return sheetPromise;
}

function rowToObject(row) {
  const obj = {};
  for (const [key, header] of Object.entries(HEADER_MAP)) {
    obj[key] = row.get(header);
  }
  return obj;
}

async function findRowById(id) {
  const sheet = await getSheet();
  const rows = await sheet.getRows();
  return rows.find((r) => r.get(HEADER_MAP.id) === id) || null;
}

async function addApplication(data) {
  const sheet = await getSheet();
  const id = randomUUID();
  const now = formatDate(new Date());
  const values = {
    id,
    telegramId: String(data.telegramId || ''),
    username: data.username || '',
    requestType: data.requestType,
    phone: data.phone || '',
    fullName: data.fullName || '',
    faculty: data.faculty || '',
    yonalish: data.yonalish || '',
    guruh: data.guruh || '',
    photoFileId: data.photoFileId || '',
    photoPreview: data.photoUrl ? `=IMAGE("${data.photoUrl}")` : '',
    status: STATUS.PENDING,
    login: '',
    password: '',
    adminId: '',
    createdAt: now,
    updatedAt: now,
    photoUrl: data.photoUrl || '',
  };
  const row = {};
  for (const [key, header] of Object.entries(HEADER_MAP)) {
    row[header] = values[key];
  }
  const addedRow = await sheet.addRow(row);
  if (data.photoUrl) {
    try {
      await sheet.updateDimensionProperties(
        'ROWS',
        { pixelSize: ROW_HEIGHT_PX },
        { startIndex: addedRow.rowNumber - 1, endIndex: addedRow.rowNumber }
      );
    } catch (err) {
      console.error('Qator balandligini sozlashda xatolik:', err.message);
    }
  }
  return id;
}

async function updateApplication(id, fields) {
  const row = await findRowById(id);
  if (!row) return null;
  Object.entries(fields).forEach(([key, value]) => {
    const header = HEADER_MAP[key];
    if (header) row.set(header, value);
  });
  // google-spreadsheet qatorni saqlaganda uni to'liq qayta yozadi, lekin
  // =IMAGE(...) formulasining o'qilgan qiymati doim bo'sh bo'ladi - shuning
  // uchun formulani har safar saqlashdan oldin manzildan qayta tiklaymiz,
  // aks holda rasm o'chib qoladi.
  const photoUrl = row.get(HEADER_MAP.photoUrl);
  if (photoUrl) {
    row.set(HEADER_MAP.photoPreview, `=IMAGE("${photoUrl}")`);
  }
  row.set(HEADER_MAP.updatedAt, formatDate(new Date()));
  await row.save();
  return rowToObject(row);
}

async function getPendingApplications() {
  const sheet = await getSheet();
  const rows = await sheet.getRows();
  return rows.filter((r) => r.get(HEADER_MAP.status) === STATUS.PENDING).map(rowToObject);
}

module.exports = {
  addApplication,
  updateApplication,
  getPendingApplications,
};
