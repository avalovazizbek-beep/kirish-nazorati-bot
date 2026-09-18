const { google } = require('googleapis');
const { Readable } = require('stream');
const config = require('../config');

let driveClient = null;

function getDrive() {
  if (!driveClient) {
    const oAuth2Client = new google.auth.OAuth2(config.googleOAuthClientId, config.googleOAuthClientSecret);
    oAuth2Client.setCredentials({ refresh_token: config.googleOAuthRefreshToken });
    driveClient = google.drive({ version: 'v3', auth: oAuth2Client });
  }
  return driveClient;
}

async function uploadPhotoAndGetUrl(telegram, fileId) {
  const file = await telegram.getFile(fileId);
  const downloadUrl = `https://api.telegram.org/file/bot${config.botToken}/${file.file_path}`;
  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`Telegramdan rasmni yuklab olib bo'lmadi: ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());

  const drive = getDrive();

  const created = await drive.files.create({
    requestBody: {
      name: `passport-${Date.now()}.jpg`,
      mimeType: 'image/jpeg',
    },
    media: {
      mimeType: 'image/jpeg',
      body: Readable.from(buffer),
    },
    fields: 'id',
  });

  const driveFileId = created.data.id;

  await drive.permissions.create({
    fileId: driveFileId,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  return `https://drive.google.com/thumbnail?id=${driveFileId}&sz=w1000`;
}

module.exports = { uploadPhotoAndGetUrl };
