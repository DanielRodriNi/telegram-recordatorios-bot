const DIA_NOMBRE = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const TIPO_LABEL = {
  daily: 'Diario',
  weekly: 'Semanal',
  interval: 'Cada X días',
  monthly: 'Mensual',
  once: 'Puntual',
};

function formatHora(r) {
  return `${String(r.hour).padStart(2, '0')}:${String(r.minute).padStart(2, '0')}`;
}

function formatFecha(date) {
  return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
}

function formatCuando(r) {
  const hora = formatHora(r);
  if (r.type === 'weekly') {
    const dias = r.weekdays || (r.weekday !== undefined ? [r.weekday] : []);
    return `${dias.map((d) => DIA_NOMBRE[d]).join(', ')} ${hora}`;
  }
  if (r.type === 'interval') return `cada ${r.intervalDays} días (desde ${formatFecha(r.startDate)}) ${hora}`;
  if (r.type === 'monthly') return `día ${r.dayOfMonth} de cada mes ${hora}`;
  if (r.type === 'once') return `${formatFecha(r.date)} ${hora}`;
  return hora; // daily
}

function formatReminderLine(r) {
  return `#${r.id} [${TIPO_LABEL[r.type]}] ${formatCuando(r)} — ${r.message}`;
}

module.exports = { DIA_NOMBRE, TIPO_LABEL, formatHora, formatFecha, formatCuando, formatReminderLine };
