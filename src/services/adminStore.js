const fs = require('fs');
const path = require('path');

const FILE_PATH = path.join(__dirname, '..', '..', 'admins.json');

function load() {
  try {
    const raw = fs.readFileSync(FILE_PATH, 'utf8');
    const ids = JSON.parse(raw);
    return Array.isArray(ids) ? ids.map(Number).filter((id) => !Number.isNaN(id)) : [];
  } catch (err) {
    return [];
  }
}

function save(ids) {
  fs.writeFileSync(FILE_PATH, JSON.stringify(ids, null, 2));
}

function getExtraAdminIds() {
  return load();
}

function addAdminId(id) {
  const numId = Number(id);
  const ids = load();
  if (!ids.includes(numId)) {
    ids.push(numId);
    save(ids);
  }
  return ids;
}

module.exports = { getExtraAdminIds, addAdminId };
