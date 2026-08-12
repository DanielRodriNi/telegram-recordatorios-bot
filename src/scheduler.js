const schedule = require('node-schedule');
const { removeReminder } = require('./store');

// id -> node-schedule Job
const jobs = new Map();

function buildRule(reminder) {
  if (reminder.type === 'once') {
    const { year, month, day } = reminder.date;
    return new Date(year, month - 1, day, reminder.hour, reminder.minute, 0);
  }

  const rule = new schedule.RecurrenceRule();
  rule.hour = reminder.hour;
  rule.minute = reminder.minute;
  rule.second = 0;

  if (reminder.type === 'weekly') rule.dayOfWeek = reminder.weekday;
  if (reminder.type === 'monthly') rule.date = reminder.dayOfMonth;

  return rule;
}

function scheduleReminder(bot, reminder) {
  const rule = buildRule(reminder);
  const job = schedule.scheduleJob(rule, async () => {
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
