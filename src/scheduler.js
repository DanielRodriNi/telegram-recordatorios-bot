const schedule = require('node-schedule');
const { removeReminder } = require('./store');

// id -> node-schedule Job
const jobs = new Map();

const DAY_MS = 24 * 60 * 60 * 1000;

// node-schedule no soporta nativamente "cada X días". Para el tipo 'interval'
// se programa una regla que dispara cada día a la hora indicada y, en el
// callback, se compara la fecha actual contra la fecha de referencia
// (startDate) para decidir si toca enviar el aviso ese día.
function daysSince(date) {
  const start = new Date(date.year, date.month - 1, date.day);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((today - start) / DAY_MS);
}

function shouldFire(reminder) {
  if (reminder.type !== 'interval') return true;
  const diff = daysSince(reminder.startDate);
  return diff >= 0 && diff % reminder.intervalDays === 0;
}

function buildRule(reminder) {
  if (reminder.type === 'once') {
    const { year, month, day } = reminder.date;
    return new Date(year, month - 1, day, reminder.hour, reminder.minute, 0);
  }

  const rule = new schedule.RecurrenceRule();
  rule.hour = reminder.hour;
  rule.minute = reminder.minute;
  rule.second = 0;

  // 'weekly' admite tanto el campo legacy `weekday` (un solo día) como el
  // nuevo `weekdays` (varios días a la vez); node-schedule acepta ambos.
  if (reminder.type === 'weekly') rule.dayOfWeek = reminder.weekdays || reminder.weekday;
  if (reminder.type === 'monthly') rule.date = reminder.dayOfMonth;
  // 'daily' e 'interval' no fijan dayOfWeek/date, así que disparan cada día.

  return rule;
}

function scheduleReminder(bot, reminder) {
  const rule = buildRule(reminder);
  const job = schedule.scheduleJob(rule, async () => {
    if (!shouldFire(reminder)) return;
    try {
      await bot.telegram.sendMessage(reminder.chatId, `⏰ Recordatorio: ${reminder.message}`);
    } catch (err) {
      console.error(`No se pudo enviar el recordatorio ${reminder.id}:`, err.message);
    }
    if (reminder.type === 'once') {
      removeReminder(reminder.chatId, reminder.id);
      cancelReminder(reminder.id);
    }
  });
  jobs.set(reminder.id, job);
  return job;
}

function cancelReminder(id) {
  const job = jobs.get(id);
  if (job) {
    job.cancel();
    jobs.delete(id);
  }
}

function loadAllReminders(bot, reminders) {
  reminders.forEach((r) => scheduleReminder(bot, r));
}

module.exports = { scheduleReminder, cancelReminder, loadAllReminders };
