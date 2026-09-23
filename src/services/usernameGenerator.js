/**
 * Login formati mavjud Kerio bazasidagi 1958 ta real foydalanuvchi konvensiyasiga mos:
 * familiya_ismning-birinchi-harfi (masalan "Abduraimova Marjona" -> "abduraimova_m").
 * Bot orqali yaratilganini bildirish uchun oxiriga "_tg" qo'shiladi: "avalov_a_tg".
 * Band bo'lsa, oxiriga raqam qo'shiladi: "avalov_a_tg1", "avalov_a_tg2", ...
 */

function slugifyNamePart(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[’'`ʻʼ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function buildBaseUsername(familiya, ism) {
  const f = slugifyNamePart(familiya);
  const i = slugifyNamePart(ism);
  const initial = i.charAt(0) || 'x';
  return `${f || 'user'}_${initial}_tg`;
}

async function generateUniqueUsername(familiya, ism, isTaken) {
  const base = buildBaseUsername(familiya, ism);
  let candidate = base;
  let attempt = 1;
  while (await isTaken(candidate)) {
    candidate = `${base}${attempt}`;
    attempt += 1;
  }
  return candidate;
}

module.exports = { buildBaseUsername, generateUniqueUsername };
