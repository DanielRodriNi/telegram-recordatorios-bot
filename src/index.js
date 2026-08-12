require('dotenv').config();
const { Telegraf } = require('telegraf');
const { addReminder, removeReminder, getRemindersByChat, loadAll } = require('./store');
const { scheduleReminder, cancelReminder, loadAllReminders } = require('./scheduler');
const { parseTime, parseWeekday, parseDayOfMonth, parseDate, parseInterval, todayDate } = require('./parse');
const { formatCuando, formatReminderLine, TIPO_LABEL } = require('./format');
const { getState, setState, clearState } = require('./wizardState');
const { freqKeyboard, weekdayKeyboard, domKeyboard, hourKeyboard, minuteKeyboard, confirmKeyboard } = require('./keyboards');

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

const AYUDA = `Puedo avisarte con recordatorios programados, como una alarma.

/nuevo
  Crea un recordatorio paso a paso con botones (frecuencia, hora y mensaje).

/recordatorios
  Lista tus recordatorios activos con su ID.

/borrar ID
  Elimina un recordatorio por su ID.

/cancelar
  Cancela la creación de un recordatorio en curso.

También puedes crear recordatorios escribiendo el comando directamente:

/diario HH:MM mensaje
  Ej: /diario 08:00 Tomar la pastilla

/semanal dia HH:MM mensaje  (dia = lunes..domingo)
  Ej: /semanal lunes 09:00 Sacar la basura

/mensual DD HH:MM mensaje  (DD = día del mes, 1-28)
  Ej: /mensual 1 10:00 Pagar el alquiler

/unavez AAAA-MM-DD HH:MM mensaje
  Ej: /unavez 2026-09-01 18:00 Cita médico`;

bot.start((ctx) => {
  ctx.reply(
    `¡Hola! Soy tu bot de recordatorios. Tu chat_id es ${ctx.chat.id}.\n\n${AYUDA}`
  );
});

bot.command('ayuda', (ctx) => ctx.reply(AYUDA));

// --- Flujo interactivo (/nuevo) ---------------------------------------

const PREGUNTA_HORA = '¿A qué hora? Elige una opción o escribe la hora en formato HH:MM.';

bot.command('nuevo', (ctx) => {
  setState(ctx.chat.id, { step: 'freq', data: {} });
  ctx.reply('¿Con qué frecuencia quieres este recordatorio?', freqKeyboard());
});

bot.command('cancelar', (ctx) => {
  if (!getState(ctx.chat.id)) return ctx.reply('No hay ningún recordatorio en creación.');
  clearState(ctx.chat.id);
  ctx.reply('Creación cancelada.');
});

bot.action('f:cancel', (ctx) => {
  clearState(ctx.chat.id);
  ctx.editMessageText('Cancelado.');
  return ctx.answerCbQuery();
});

bot.action('f:daily', (ctx) => {
  setState(ctx.chat.id, { step: 'hour', data: { type: 'daily' } });
  ctx.editMessageText(PREGUNTA_HORA, hourKeyboard());
  return ctx.answerCbQuery();
});

bot.action('f:interval', (ctx) => {
  setState(ctx.chat.id, { step: 'interval_days', data: { type: 'interval' } });
  ctx.editMessageText('¿Cada cuántos días? Escribe un número entero (2 o más). Ej: 3');
  return ctx.answerCbQuery();
});

bot.action('f:weekdays', (ctx) => {
  setState(ctx.chat.id, { step: 'weekdays', data: { type: 'weekly', weekdays: [] } });
  ctx.editMessageText('Elige los días (puedes marcar varios) y pulsa Continuar.', weekdayKeyboard([]));
  return ctx.answerCbQuery();
});

bot.action('f:monthly', (ctx) => {
  setState(ctx.chat.id, { step: 'dom', data: { type: 'monthly' } });
  ctx.editMessageText('¿Qué día del mes?', domKeyboard());
  return ctx.answerCbQuery();
});

bot.action('f:once', (ctx) => {
  setState(ctx.chat.id, { step: 'once_date', data: { type: 'once' } });
  ctx.editMessageText('¿Qué fecha? Escríbela como AAAA-MM-DD (ej. 2026-09-01).');
  return ctx.answerCbQuery();
});

bot.action(/^wd:(\d)$/, (ctx) => {
  const state = getState(ctx.chat.id);
  if (!state || state.step !== 'weekdays') return ctx.answerCbQuery();
  const day = Number(ctx.match[1]);
  const idx = state.data.weekdays.indexOf(day);
  if (idx === -1) state.data.weekdays.push(day);
  else state.data.weekdays.splice(idx, 1);
  ctx.editMessageReplyMarkup(weekdayKeyboard(state.data.weekdays).reply_markup);
  return ctx.answerCbQuery();
});

bot.action('wd:ok', (ctx) => {
  const state = getState(ctx.chat.id);
  if (!state || state.step !== 'weekdays') return ctx.answerCbQuery();
  if (!state.data.weekdays.length) return ctx.answerCbQuery('Elige al menos un día', { show_alert: true });
  state.step = 'hour';
  ctx.editMessageText(PREGUNTA_HORA, hourKeyboard());
  return ctx.answerCbQuery();
});

bot.action(/^dom:(\d+)$/, (ctx) => {
  const state = getState(ctx.chat.id);
  if (!state || state.step !== 'dom') return ctx.answerCbQuery();
  state.data.dayOfMonth = Number(ctx.match[1]);
  state.step = 'hour';
  ctx.editMessageText(PREGUNTA_HORA, hourKeyboard());
  return ctx.answerCbQuery();
});

bot.action(/^h:(\d+)$/, (ctx) => {
  const state = getState(ctx.chat.id);
  if (!state || state.step !== 'hour') return ctx.answerCbQuery();
  state.data.hour = Number(ctx.match[1]);
  state.step = 'minute';
  ctx.editMessageText('¿Y los minutos?', minuteKeyboard());
  return ctx.answerCbQuery();
});

bot.action(/^mi:(\d+)$/, (ctx) => {
  const state = getState(ctx.chat.id);
  if (!state || state.step !== 'minute') return ctx.answerCbQuery();
  state.data.minute = Number(ctx.match[1]);
  state.step = 'message';
  ctx.editMessageText('Escribe el mensaje del recordatorio.');
  return ctx.answerCbQuery();
});

bot.action('mi:manual', (ctx) => {
  const state = getState(ctx.chat.id);
  if (!state || state.step !== 'minute') return ctx.answerCbQuery();
  state.step = 'manual_time';
  ctx.editMessageText('Escribe la hora en formato HH:MM (ej. 08:30).');
  return ctx.answerCbQuery();
});

bot.action('c:yes', (ctx) => {
  const state = getState(ctx.chat.id);
  if (!state || state.step !== 'confirm') return ctx.answerCbQuery();
  const reminder = addReminder({ chatId: ctx.chat.id, ...state.data });
  scheduleReminder(bot, reminder);
  clearState(ctx.chat.id);
  ctx.editMessageText(`✅ Recordatorio creado.\n${formatReminderLine(reminder)}`);
  return ctx.answerCbQuery();
});

bot.action('c:no', (ctx) => {
  clearState(ctx.chat.id);
  ctx.editMessageText('Cancelado.');
  return ctx.answerCbQuery();
});

bot.on('text', (ctx, next) => {
  const state = getState(ctx.chat.id);
  const text = ctx.message.text.trim();
  if (!state || text.startsWith('/')) return next();

  if (state.step === 'interval_days') {
    const n = parseInterval(text);
    if (!n) return ctx.reply('Escribe un número entero de días (2 o más). Ej: 3');
    state.data.intervalDays = n;
    state.data.startDate = todayDate();
    state.step = 'hour';
    return ctx.reply(PREGUNTA_HORA, hourKeyboard());
  }

  if (state.step === 'once_date') {
    const date = parseDate(text);
    if (!date) return ctx.reply('Fecha no válida. Escríbela como AAAA-MM-DD. Ej: 2026-09-01');
    state.data.date = date;
    state.step = 'hour';
    return ctx.reply(PREGUNTA_HORA, hourKeyboard());
  }

  if (state.step === 'hour') {
    const time = parseTime(text);
    if (!time) return ctx.reply('Elige una hora con los botones o escribe la hora como HH:MM.');
    state.data.hour = time.hour;
    state.data.minute = time.minute;
    state.step = 'message';
    return ctx.reply('Escribe el mensaje del recordatorio.');
  }

  if (state.step === 'manual_time') {
    const time = parseTime(text);
    if (!time) return ctx.reply('Hora no válida. Escríbela como HH:MM. Ej: 08:30');
    state.data.hour = time.hour;
    state.data.minute = time.minute;
    state.step = 'message';
    return ctx.reply('Escribe el mensaje del recordatorio.');
  }

  if (state.step === 'message') {
    if (!text) return ctx.reply('El mensaje no puede estar vacío. Escribe el texto del recordatorio.');
    state.data.message = text;
    state.step = 'confirm';
    const resumen = `${TIPO_LABEL[state.data.type]}: ${formatCuando(state.data)}\nMensaje: ${text}`;
    return ctx.reply(`¿Confirmas este recordatorio?\n\n${resumen}`, confirmKeyboard());
  }

  return next();
});

// --- Comandos de texto (alternativa a /nuevo) --------------------------

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
    weekdays: [weekday],
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

bot.command('recordatorios', (ctx) => {
  const reminders = getRemindersByChat(ctx.chat.id);
  if (!reminders.length) return ctx.reply('No tienes recordatorios activos.');
  ctx.reply(reminders.map(formatReminderLine).join('\n'));
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
