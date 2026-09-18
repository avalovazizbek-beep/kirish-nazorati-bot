require('dotenv').config();
const http = require('http');
const { google } = require('googleapis');

const PORT = 53682;
const REDIRECT_URI = `http://localhost:${PORT}`;

async function main() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error(
      "Avval .env fayliga GOOGLE_OAUTH_CLIENT_ID va GOOGLE_OAUTH_CLIENT_SECRET qiymatlarini kiriting, so'ng bu skriptni qayta ishga tushiring."
    );
    process.exit(1);
  }

  const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/drive.file'],
  });

  console.log('\nQuyidagi havolani brauzeringizda oching va Google hisobingiz bilan tasdiqlang:\n');
  console.log(authUrl);
  console.log('\nTasdiqlashni kutmoqdaman...\n');

  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, REDIRECT_URI);
      const authCode = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        res.end('Xatolik yuz berdi. Terminalga qayting.');
        server.close();
        reject(new Error(error));
        return;
      }
      if (authCode) {
        res.end('Tasdiqlandi! Bu oynani yopib, terminalga qaytishingiz mumkin.');
        server.close();
        resolve(authCode);
      }
    });
    server.listen(PORT);
  });

  const { tokens } = await oAuth2Client.getToken(code);

  if (!tokens.refresh_token) {
    console.error(
      "\nRefresh token olinmadi. Odatda bu hisob avval ruxsat bergan bo'lsa yuz beradi.\n" +
        'Google akkauntingizdagi "Third-party apps & services" bo\'limidan bu ilovaga ruxsatni bekor qiling va qayta urinib ko\'ring:\n' +
        'https://myaccount.google.com/permissions'
    );
    process.exit(1);
  }

  console.log("\n✅ Tayyor! Quyidagi qatorni .env fayliga qo'shing (yoki mavjudini shu bilan almashtiring):\n");
  console.log(`GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
  console.log('');
}

main().catch((err) => {
  console.error('Xatolik:', err.message);
  process.exit(1);
});
