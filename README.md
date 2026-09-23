# Kirish nazorati boti

Telegram bot: foydalanuvchilar ro'yxatdan o'tib yoki login/parolini tiklab, admin tasdig'idan so'ng
tizimga kirish uchun login va parol oladi. Ma'lumotlar Google Sheets'da saqlanadi, pasport rasmlari
esa (jadvalda ham ko'rinishi uchun) admin akkauntining shaxsiy Google Drive'iga yuklanadi.

## Imkoniyatlar

- **Ro'yxatdan o'tish**: telefon → familiya → ism → fakultet → yo'nalish → guruh → passport rasmi →
  tasdiqlash → admin "✅ Tasdiqlash" bosgach, Kerio Control'da hisob avtomatik yaratiladi va
  login/parol foydalanuvchiga yuboriladi (qarang: "Kerio Control integratsiyasi").
- **Login/Parolni tiklash**: ism familiya → passport rasmi → tasdiqlash → admin javobi (yangi
  login/parol, hozircha qo'lda kiritiladi) foydalanuvchiga yuboriladi.
- **Adminga murojaat**: foydalanuvchi va admin bot orqali bevosita yozishishi mumkin (matn, rasm va
  boshqa turdagi xabarlar).
- Admin arizani "✅ Tasdiqlash" tugmasi orqali tasdiqlaydi yoki "❌ Rad etish" orqali sababi bilan
  rad etadi.
- `/pending` - adminlar uchun kutilayotgan barcha arizalar ro'yxati.

## O'rnatish

### 1. Loyihani sozlash

```bash
npm install
copy .env.example .env
```

### 2. Bot yaratish

1. Telegram'da [@BotFather](https://t.me/BotFather) ga `/newbot` yuboring, tokenni oling.
2. `.env` faylida `BOT_TOKEN` ga shu tokenni yozing.
3. O'zingizning (va boshqa adminlarning) Telegram ID raqamini [@userinfobot](https://t.me/userinfobot)
   orqali oling va `.env` faylidagi `ADMIN_IDS` ga vergul bilan ajratib yozing.

### 3. Google Sheets'ni ulash

1. [Google Cloud Console](https://console.cloud.google.com/) da yangi loyiha yarating (yoki mavjudidan
   foydalaning).
2. **APIs & Services → Library** bo'limidan **Google Sheets API**'ni yoqing.
3. **APIs & Services → Credentials → Create Credentials → Service Account** orqali yangi service
   account yarating.
4. Yaratilgan service account ichiga kirib, **Keys → Add Key → Create new key → JSON** tugmasini
   bosib, kalitni yuklab oling.
5. JSON fayl ichidagi `client_email` qiymatini `.env` dagi `GOOGLE_SERVICE_ACCOUNT_EMAIL` ga,
   `private_key` qiymatini esa `GOOGLE_PRIVATE_KEY` ga (tirnoq va `\n` belgilari bilan birga) nusxa
   ko'chiring.
6. [Google Sheets](https://sheets.google.com) da yangi jadval yarating.
7. Jadvalni ochib, **Share** tugmasi orqali yuqoridagi `client_email` manziliga **Editor** huquqi bilan
   ulashing.
8. Jadval linkidan ID'ni oling: `https://docs.google.com/spreadsheets/d/BU_YERDA_ID/edit` - shu ID'ni
   `.env` dagi `GOOGLE_SHEET_ID` ga yozing.

Bot birinchi marta ishga tushganda jadval ichida avtomatik ravishda "Arizalar" nomli varaq va kerakli
ustunlarni yaratadi.

### 4. Google Drive (rasm ko'rsatish)

Pasport rasmi jadvalda ham ko'rinishi uchun, u sizning shaxsiy Google Drive'ingizga yuklanadi. Buning
uchun bir martalik ulash (OAuth) kerak:

1. Xuddi shu Google Cloud loyihada **APIs & Services → Library**'dan **Google Drive API**'ni yoqing.
2. **APIs & Services → OAuth consent screen** ga o'ting. User Type sifatida **External** ni tanlang,
   ilova nomi va emailingizni kiriting, saqlang. Keyin **"Publish App"** tugmasini bosib, holatini
   **"In production"** ga o'tkazing (`drive.file` oddiy huquq bo'lgani uchun Google'ning tekshiruvi
   shart emas).
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID** ga o'ting. Application
   type sifatida **Desktop app**'ni tanlang, nom bering, **Create** bosing.
4. Chiqqan **Client ID** va **Client secret**'ni `.env` fayldagi `GOOGLE_OAUTH_CLIENT_ID` va
   `GOOGLE_OAUTH_CLIENT_SECRET` ga yozing.
5. Terminalda quyidagini ishga tushiring:
   ```bash
   node scripts/authorizeDrive.js
   ```
6. Chiqqan havolani brauzeringizda oching, o'zingizning Google hisobingiz bilan kirib, ruxsat bering.
7. Terminalga qaytib, chiqqan `GOOGLE_OAUTH_REFRESH_TOKEN=...` qatorini `.env` fayliga qo'ying.

Shundan so'ng yangi arizalardagi pasport rasmi ham jadvalning "Rasm" ustunida ko'rinadi.

### 5. Kerio Control integratsiyasi

Admin "✅ Tasdiqlash" tugmasini bosgach, **ro'yxatdan o'tish** arizalari uchun Kerio Control'da
foydalanuvchi avtomatik yaratiladi (login/parolni endi admin qo'lda kiritmaydi). Parolni tiklash
so'rovlari hozircha eski tartibda (admin login/parolni qo'lda yozadi) qoladi.

1. `.env` fayliga quyidagilarni to'ldiring:
   ```
   KERIO_URL=https://<kerio-server>:4081
   KERIO_API_PATH=/admin/api/jsonrpc/
   KERIO_USERNAME=<API uchun alohida Kerio admin hisobi>
   KERIO_PASSWORD=<shu hisobning paroli>
   KERIO_APPLICATION_NAME=Telegram Bot
   KERIO_APPLICATION_VENDOR=SIES
   KERIO_APPLICATION_VERSION=1.0
   KERIO_ALLOW_SELF_SIGNED=true
   KERIO_DRY_RUN=true
   KERIO_STUDENT_GROUP_NAME=Студенты
   ```
2. `KERIO_DRY_RUN=true` bo'lganda real user yaratilmaydi - faqat yuboriladigan so'rov adminga
   Telegram orqali ko'rsatiladi va Google Sheets'da `KerioStatus=DRY_RUN` qilib belgilanadi.
   Ishonch hosil qilgach `KERIO_DRY_RUN=false` qiling.
3. Login formati mavjud Kerio bazasidagi konvensiyaga mos: `familiya_ismning-birinchi-harfi_tg`
   (masalan "Avalov Azizbek" -> `avalov_a_tg`). Band bo'lsa oxiriga raqam qo'shiladi.
   Parol - 6 ta random harf.
4. Google Sheets'ga avtomatik quyidagi ustunlar qo'shiladi (mavjud ustunlarga tegilmaydi):
   `KerioStatus`, `KerioUsername`, `KerioPassword`, `KerioUserId`, `KerioError`, `KerioCreatedAt`.
5. `KerioStatus = CREATED` yoki `SENT` bo'lgan foydalanuvchi uchun ikkinchi marta Kerio user
   yaratilmaydi (duplicate himoyasi).
6. Diagnostika: `node scripts/kerioDiagnose.js` - Kerio API bilan bog'lanishni va real maydon
   nomlarini tekshiradigan, hech narsa yozmaydigan (faqat o'qish) skript.

### 6. Ishga tushirish

```bash
npm start
```

Ishlab chiqish vaqtida avtomatik qayta ishga tushirish uchun:

```bash
npm run dev
```

## Eslatmalar

- Har bir pasport rasmi Drive'ga yuklanganda, Sheets'da ko'rinishi uchun o'sha **bitta fayl**
  "havolaga ega har kim ko'ra oladi" qilib belgilanadi (Drive'dagi boshqa fayllaringizga tegmaydi).
  Shuning uchun Google Sheets jadvalining o'zini ham albatta cheklangan (faqat sizga) qilib
  ulashing - aks holda havolaga ega har kim ariza beruvchilarning pasport rasmlarini ko'ra oladi.
- Sessiya (foydalanuvchi holati, admin "javob berish" rejimi) `sessions.json` fayliga saqlanadi - bot
  qayta ishga tushirilganda ham yo'qolmaydi. Bu fayl `.env` kabi maxfiy emas, lekin `.gitignore`
  ro'yxatida.
- `ADMIN_IDS` ga kiritilmagan foydalanuvchilar admin buyruqlari va tugmalaridan foydalana olmaydi.
- Ro'yxatdan o'tish uchun login/parol Kerio Control orqali avtomatik yaratiladi (yuqoridagi "Kerio
  Control integratsiyasi" bo'limiga qarang). Parolni tiklash so'rovlarida esa hozircha admin
  login/parolni qo'lda kiritadi - bular Google Sheets orqali saqlanadi, alohida shifrlanmaydi.
