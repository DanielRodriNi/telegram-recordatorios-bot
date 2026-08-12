const DIAS_SEMANA = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  miércoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
  sábado: 6,
};

const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseTime(str) {
  const m = TIME_RE.exec(str);
  if (!m) return null;
  return { hour: Number(m[1]), minute: Number(m[2]) };
}

function parseWeekday(str) {
  const key = str.toLowerCase();
  return key in DIAS_SEMANA ? DIAS_SEMANA[key] : null;
}

function parseDayOfMonth(str) {
  const n = Number(str);
  if (!Number.isInteger(n) || n < 1 || n > 28) return null;
  return n;
}

function parseDate(str) {
  const m = DATE_RE.exec(str);
  if (!m) return null;
  const [, y, mo, d] = m;
  const date = { year: Number(y), month: Number(mo), day: Number(d) };
  const asDate = new Date(date.year, date.month - 1, date.day);
  const valido =
    asDate.getFullYear() === date.year &&
    asDate.getMonth() === date.month - 1 &&
    asDate.getDate() === date.day;
  return valido ? date : null;
}

function parseInterval(str) {
  const n = Number(str);
  if (!Number.isInteger(n) || n < 2) return null;
  return n;
}

function todayDate() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

module.exports = {
  parseTime,
  parseWeekday,
  parseDayOfMonth,
  parseDate,
  parseInterval,
  todayDate,
  DIAS_SEMANA,
};
