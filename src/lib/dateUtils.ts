/**
 * Utilidades para formatear fechas y nombres de días en español
 * Maneja cadenas ISO 'YYYY-MM-DD' de manera determinista sin desfasar la zona horaria
 */

const DAYS_ES = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

const MONTHS_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

/**
 * Obtiene el nombre del día de la semana para una fecha 'YYYY-MM-DD'
 * @example getDayOfWeekName('2026-10-14') => 'Miércoles'
 */
export function getDayOfWeekName(dateStr?: string): string {
  if (!dateStr || !dateStr.includes('-')) return '';
  const parts = dateStr.split('-').map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return '';
  }
  const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
  return DAYS_ES[dateObj.getDay()] || '';
}

/**
 * Formatea una fecha con su nombre de día y formato legible
 * @example formatDateWithDay('2026-10-14') => 'Miércoles 14/10'
 */
export function formatDateWithDay(dateStr?: string): string {
  if (!dateStr) return '';
  const dayName = getDayOfWeekName(dateStr);
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const day = parts[2];
  const month = parts[1];
  return dayName ? `${dayName} ${day}/${month}` : dateStr;
}

/**
 * Formato largo con nombre de día
 * @example formatDateLongWithDay('2026-10-14') => 'Miércoles, 14 de Octubre de 2026'
 */
export function formatDateLongWithDay(dateStr?: string): string {
  if (!dateStr || !dateStr.includes('-')) return dateStr || '';
  const parts = dateStr.split('-').map(Number);
  if (parts.length < 3) return dateStr;
  const dayName = getDayOfWeekName(dateStr);
  const day = parts[2];
  const monthName = MONTHS_ES[parts[1] - 1] || parts[1];
  const year = parts[0];
  return `${dayName}, ${day} de ${monthName} de ${year}`;
}
