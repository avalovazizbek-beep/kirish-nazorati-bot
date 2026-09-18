# Kirish nazorati boti

Telegram bot: foydalanuvchilar ro'yxatdan o'tib yoki login/parolini tiklab, admin tasdig'idan so'ng
tizimga kirish uchun login va parol oladi. Ma'lumotlar Google Sheets'da saqlanadi, pasport rasmlari
esa (jadvalda ham ko'rinishi uchun) admin akkauntining shaxsiy Google Drive'iga yuklanadi.

## Imkoniyatlar

- **Ro'yxatdan o'tish**: telefon → ism familiya → fakultet → yo'nalish → guruh → passport rasmi →
  tasdiqlash → admin javobi (login/parol) foydalanuvchiga yuboriladi.
- **Login/Parolni tiklash**: ism familiya → passport rasmi → tasdiqlash → admin javobi (yangi
  login/parol) foydalanuvchiga yuboriladi.
- **Adminga murojaat**: foydalanuvchi va admin bot orqali bevosita yozishishi mumkin (matn, rasm va
  boshqa turdagi xabarlar).
- Admin arizani "✅ Tasdiqlash" tugmasi orqali login/parol yozib tasdiqlaydi yoki "❌ Rad etish" orqali
  sababi bilan rad etadi.
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

### 5. Ishga tushirish

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
- Login/parolni admin qo'lda kiritadi - bular tashqi tizim (masalan universitet portali) uchun
  hisob ma'lumotlari bo'lgani sabab, botda alohida shifrlanmaydi, faqat Google Sheets orqali saqlanadi.
