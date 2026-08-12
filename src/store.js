const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'reminders.json');

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');
}

function loadAll() {
  ensureFile();
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveAll(reminders) {
  ensureFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(reminders, null, 2));
}

function addReminder(reminder) {
  const reminders = loadAll();
  const id = reminders.length ? Math.max(...reminders.map((r) => r.id)) + 1 : 1;
  const full = { id, ...reminder, createdAt: new Date().toISOString() };
  reminders.push(full);
  saveAll(reminders);
  return full;
}

function removeReminder(chatId, id) {
  const reminders = loadAll();
  const idx = reminders.findIndex((r) => r.id === id && r.chatId === chatId);
  if (idx === -1) return null;
  const [removed] = reminders.splice(idx, 1);
  saveAll(reminders);
  return removed;
}

function getRemindersByChat(chatId) {
  return loadAll().filter((r) => r.chatId === chatId);
}

module.exports = { loadAll, saveAll, addReminder, removeReminder, getRemindersByChat };
