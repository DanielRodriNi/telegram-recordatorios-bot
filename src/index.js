require('dotenv').config();
const { Telegraf } = require('telegraf');
const { addReminder, removeReminder, getRemindersByChat } = require('./store');
const { scheduleReminder, cancelReminder, loadAllReminders } = require('./scheduler');
const { parseTime, parseWeekday, parseDayOfMonth, parseDate } = require('./parse');
const { loadAll } = require('./store');

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('Falta BOT_TOKEN en el entorno. Copia .env.example a .env y añade tu token.');
  process.exit(1);
}

const ALLOWED_CHAT_IDS = (process.env.ALLOWED_CHAT_IDS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .map(Number);

const bot = new Telegraf(BOT_TOKEN);

if (ALLOWED_CHAT_IDS.length) {
  bot.use((ctx, next) => {
    if (ctx.chat && ALLOWED_CHAT_IDS.includes(ctx.chat.id)) return next();
    return ctx.reply('No estás autorizado a usar este bot.');
  });
}

const AYUDA = `Puedo avisarte con recordatorios programados, como una alarma. Comandos disponibles:

/diario HH:MM mensaje
  Ej: /diario 08:00 Tomar la pastilla

/semanal dia HH:MM mensaje  (dia = lunes..domingo)
  Ej: /semanal lunes 09:00 Sacar la basura

/mensual DD HH:MM mensaje  (DD = día del mes, 1-28)
  Ej: /mensual 1 10:00 Pagar el alquiler

/unavez AAAA-MM-DD HH:MM mensaje
  Ej: /unavez 2026-09-01 18:00 Cita médico

/recordatorios
  Lista tus recordatorios activos con su ID.

/borrar ID
  Elimina un recordatorio por su ID.`;

bot.start((ctx) => {
  ctx.reply(
    `¡Hola! Soy tu bot de recordatorios. Tu chat_id es ${ctx.chat.id}.\n\n${AYUDA}`
  );
});

bot.command('ayuda', (ctx) => ctx.reply(AYUDA));

bot.command('diario', (ctx) => {
  const args = ctx.message.text.split(' ').slice(1);
  const time = parseTime(args[0]);
  const message = args.slice(1).join(' ');
  if (!time || !message) {
    return ctx.reply('Uso: /diario HH:MM mensaje\nEj: /diario 08:00 Tomar la pastilla');
  }
  const reminder = addReminder({
    chatId: ctx.chat.id,
    type: 'daily',
    hour: time.hour,
    minute: time.minute,
    message,
  });
  scheduleReminder(bot, reminder);
  ctx.reply(`✅ Recordatorio diario #${reminder.id} creado a las ${args[0]}.`);
});

bot.command('semanal', (ctx) => {
  const args = ctx.message.text.split(' ').slice(1);
  const weekday = parseWeekday(args[0] || '');
  const time = parseTime(args[1]);
  const message = args.slice(2).join(' ');
  if (weekday === null || !time || !message) {
    return ctx.reply(
      'Uso: /semanal dia HH:MM mensaje\nEj: /semanal lunes 09:00 Sacar la basura\n(dia: lunes, martes, miercoles, jueves, viernes, sabado, domingo)'
    );
  }
  const reminder = addReminder({
    chatId: ctx.chat.id,
    type: 'weekly',
    weekday,
    hour: time.hour,
    minute: time.minute,
    message,
  });
  scheduleReminder(bot, reminder);
  ctx.reply(`✅ Recordatorio semanal #${reminder.id} creado: ${args[0]} a las ${args[1]}.`);
});

bot.command('mensual', (ctx) => {
  const args = ctx.message.text.split(' ').slice(1);
  const dayOfMonth = parseDayOfMonth(args[0] || '');
  const time = parseTime(args[1]);
  const message = args.slice(2).join(' ');
  if (!dayOfMonth || !time || !message) {
    return ctx.reply(
      'Uso: /mensual DD HH:MM mensaje\nEj: /mensual 1 10:00 Pagar el alquiler\n(DD entre 1 y 28, para que exista en todos los meses)'
    );
  }
  const reminder = addReminder({
    chatId: ctx.chat.id,
    type: 'monthly',
    dayOfMonth,
    hour: time.hour,
    minute: time.minute,
    message,
  });
  scheduleReminder(bot, reminder);
  ctx.reply(`✅ Recordatorio mensual #${reminder.id} creado: día ${args[0]} a las ${args[1]}.`);
});

bot.command('unavez', (ctx) => {
  const args = ctx.message.text.split(' ').slice(1);
  const date = parseDate(args[0] || '');
  const time = parseTime(args[1]);
  const message = args.slice(2).join(' ');
  if (!date || !time || !message) {
    return ctx.reply('Uso: /unavez AAAA-MM-DD HH:MM mensaje\nEj: /unavez 2026-09-01 18:00 Cita médico');
  }
  const reminder = addReminder({
    chatId: ctx.chat.id,
    type: 'once',
    date,
    hour: time.hour,
    minute: time.minute,
    message,
  });
  scheduleReminder(bot, reminder);
  ctx.reply(`✅ Recordatorio puntual #${reminder.id} creado para el ${args[0]} a las ${args[1]}.`);
});

const TIPO_LABEL = { daily: 'Diario', weekly: 'Semanal', monthly: 'Mensual', once: 'Puntual' };
const DIA_NOMBRE = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

bot.command('recordatorios', (ctx) => {
  const reminders = getRemindersByChat(ctx.chat.id);
  if (!reminders.length) return ctx.reply('No tienes recordatorios activos.');
  const lines = reminders.map((r) => {
    const hora = `${String(r.hour).padStart(2, '0')}:${String(r.minute).padStart(2, '0')}`;
    let cuando = hora;
    if (r.type === 'weekly') cuando = `${DIA_NOMBRE[r.weekday]} ${hora}`;
    if (r.type === 'monthly') cuando = `día ${r.dayOfMonth} ${hora}`;
    if (r.type === 'once') cuando = `${r.date.year}-${String(r.date.month).padStart(2, '0')}-${String(r.date.day).padStart(2, '0')} ${hora}`;
    return `#${r.id} [${TIPO_LABEL[r.type]}] ${cuando} — ${r.message}`;
  });
  ctx.reply(lines.join('\n'));
});

bot.command('borrar', (ctx) => {
  const id = Number(ctx.message.text.split(' ')[1]);
  if (!id) return ctx.reply('Uso: /borrar ID (usa /recordatorios para ver los IDs)');
  const removed = removeReminder(ctx.chat.id, id);
  if (!removed) return ctx.reply(`No encontré ningún recordatorio con ID ${id}.`);
  cancelReminder(id);
  ctx.reply(`🗑️ Recordatorio #${id} eliminado.`);
});

loadAllReminders(bot, loadAll());

bot.launch();
console.log('Bot de recordatorios en marcha.');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
