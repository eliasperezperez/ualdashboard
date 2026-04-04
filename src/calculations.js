import { cdmxDate } from './dates.js';

/**
 * Calcula el Tiempo de Primer Contacto (TPPC) en horas.
 * Retorna null si los datos son inválidos o si ultimo <= creado.
 */
export function calcTppc(item) {
  if (!item.creado || !item.ultimo) return null;
  const c = cdmxDate(item.creado), u = cdmxDate(item.ultimo);
  if (!c || !u || isNaN(c) || isNaN(u) || u <= c) return null;
  return (u - c) / 3600000;
}

/**
 * Calcula la mediana de un array numérico.
 */
export function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Formatea horas como "24.5h" (menos de un día) o "2.3d" (días).
 */
export function fmtTppc(h) {
  if (!h) return '—';
  if (h < 24) return h.toFixed(1) + 'h';
  return (h / 24).toFixed(1) + 'd';
}

/**
 * Devuelve el color CSS correspondiente al tiempo de contacto.
 * ≤ 24h → verde, ≤ 72h → ámbar, > 72h → rojo.
 */
export function tppcColor(h) {
  if (!h) return 'var(--muted)';
  if (h <= 24) return 'var(--green)';
  if (h <= 72) return 'var(--accent)';
  return 'var(--red)';
}
