/**
 * Parsea un timestamp de texto a un instante UTC (Date).
 *
 * Soporta dos formatos de entrada:
 *   1. Con offset explícito (Zapier: +02:00, Make: -06:00, Z, etc.)
 *      → respeta el offset y devuelve el instante UTC equivalente
 *   2. Sin offset (carga masiva CSV de Clientify: "2026-04-01 18:16:24")
 *      → asume hora CDMX (UTC-6) y convierte a UTC
 *
 * Nota: México eliminó el horario de verano en 2022, por lo que
 * CDMX es siempre UTC-6 fijo, sin cambios estacionales.
 */
export function cdmxDate(str) {
  if (!str) return null;
  // Eliminar comillas dobles o simples que PapaParse a veces deja como parte del valor
  const s = String(str).trim().replace(/^["']|["']$/g, '');

  // Detectar si el string tiene offset de zona horaria explícito
  // Formatos posibles: Z, +HH:MM, -HH:MM al final (puede haber microsegundos antes)
  const hasOffset = /Z$|[+\-]\d{2}:\d{2}$/.test(s);

  if (hasOffset) {
    // Tiene offset explícito (viene de Zapier con +02:00, Make con -06:00, etc.)
    // Reemplazar espacio por T si hace falta, recortar microsegundos pero conservar offset
    // Ejemplo: "2026-04-02T21:46:44.309077+02:00" → parsear con su offset real
    const normalized = s.replace(' ', 'T').replace(/(\.\d+)([Z+\-])/, '$2');
    const d = new Date(normalized);
    if (isNaN(d)) return null;
    return d;
  } else {
    // Sin offset: viene de la carga masiva CSV de Clientify, ya está en hora CDMX
    // Tratar como CDMX (UTC-6) agregando el offset manualmente
    // Normalizar hora de un dígito: "2026-03-30 9:21:20" → "2026-03-30T09:21:20"
    const clean = s.replace(' ', 'T').replace(/T(\d):/, 'T0$1:').slice(0, 19);
    if (!clean || clean.length < 16) return null;
    const d = new Date(clean + '-06:00');
    if (isNaN(d)) return null;
    return d;
  }
}

/**
 * Devuelve "YYYY-MM" del timestamp interpretado en hora CDMX (UTC-6).
 */
export function getMonth(d) {
  const dt = cdmxDate(d);
  if (!dt || isNaN(dt)) return null;
  // Extraer año/mes en hora CDMX (UTC-6), no en UTC del servidor
  const cdmx = new Date(dt.getTime() - 6 * 3600000);
  return `${cdmx.getUTCFullYear()}-${String(cdmx.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Formatea "YYYY-MM" como "Ene 26", "Feb 26", etc.
 */
export function monthLabel(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  return ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][+m] + ' ' + y.slice(2);
}

/**
 * Devuelve [inicio, fin] del rango lunes–domingo en CDMX para la semana
 * con el offset dado (0 = actual, -1 = anterior).
 * Ambos valores son instantes UTC.
 */
export function getWeekRange(offset = 0) {
  // Construir rango semanal en hora CDMX (UTC-6)
  // "ahora" en CDMX = UTC - 6h
  const nowCDMX = new Date(Date.now() - 6 * 3600000);
  const dayCDMX = nowCDMX.getUTCDay() === 0 ? 7 : nowCDMX.getUTCDay(); // lunes=1
  // Lunes 00:00:00 CDMX de la semana con offset dado
  const monCDMX = new Date(Date.UTC(
    nowCDMX.getUTCFullYear(), nowCDMX.getUTCMonth(),
    nowCDMX.getUTCDate() - dayCDMX + 1 + offset * 7,
    0, 0, 0, 0
  ));
  // Este Date.UTC ya representa 00:00 CDMX → sumar 6h para tener el instante UTC equivalente
  const monUTC = new Date(monCDMX.getTime() + 6 * 3600000);
  // Domingo 23:59:59.999 CDMX = lunes + 6 días y 23:59:59 CDMX
  const sunUTC = new Date(monUTC.getTime() + 7 * 86400000 - 1);
  return [monUTC, sunUTC];
}

/**
 * Devuelve true si el timestamp dateStr cae dentro de la semana CDMX
 * indicada por offset (0 = actual, -1 = anterior).
 */
export function inWeek(dateStr, offset = 0) {
  const [a, b] = getWeekRange(offset);
  const d = cdmxDate(dateStr);
  if (!d || isNaN(d)) return false;
  return d >= a && d <= b;
}
