const { Markup } = require('telegraf');

const DIA_CORTO = ['D', 'L', 'M', 'X', 'J', 'V', 'S']; // domingo..sábado

function freqKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('☀️ Cada día', 'f:daily')],
    [Markup.button.callback('🔁 Cada X días', 'f:interval')],
    [Markup.button.callback('📅 Días concretos', 'f:weekdays')],
    [Markup.button.callback('🗓️ Mensual', 'f:monthly')],
    [Markup.button.callback('📌 Una vez', 'f:once')],
    [Markup.button.callback('✖️ Cancelar', 'f:cancel')],
  ]);
}

function weekdayKeyboard(selected) {
  const row = DIA_CORTO.map((label, i) =>
    Markup.button.callback(selected.includes(i) ? `✅${label}` : label, `wd:${i}`)
  );
  return Markup.inlineKeyboard([row, [Markup.button.callback('Continuar ▶️', 'wd:ok')]]);
}

function domKeyboard() {
  const rows = [];
  for (let i = 1; i <= 28; i += 7) {
    rows.push(
      Array.from({ length: 7 }, (_, j) => i + j).map((d) =>
        Markup.button.callback(String(d), `dom:${d}`)
      )
    );
  }
  return Markup.inlineKeyboard(rows);
}

function hourKeyboard() {
  const rows = [];
  for (let i = 0; i < 24; i += 6) {
    rows.push(
      Array.from({ length: 6 }, (_, j) => i + j).map((h) =>
        Markup.button.callback(String(h).padStart(2, '0'), `h:${h}`)
      )
    );
  }
  return Markup.inlineKeyboard(rows);
}

function minuteKeyboard() {
  return Markup.inlineKeyboard([
    [0, 15, 30, 45].map((m) => Markup.button.callback(`:${String(m).padStart(2, '0')}`, `mi:${m}`)),
    [Markup.button.callback('✏️ Escribir otra hora (HH:MM)', 'mi:manual')],
  ]);
}

function confirmKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('✅ Confirmar', 'c:yes'), Markup.button.callback('✖️ Cancelar', 'c:no')],
  ]);
}

module.exports = {
  DIA_CORTO,
  freqKeyboard,
  weekdayKeyboard,
  domKeyboard,
  hourKeyboard,
  minuteKeyboard,
  confirmKeyboard,
};
