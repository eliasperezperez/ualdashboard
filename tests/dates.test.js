import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cdmxDate, getMonth, monthLabel, getWeekRange, inWeek } from '../src/dates.js';

// ─── cdmxDate ────────────────────────────────────────────────────────────────

describe('cdmxDate', () => {
  describe('entradas inválidas o vacías', () => {
    it('retorna null para null', () => {
      expect(cdmxDate(null)).toBeNull();
    });

    it('retorna null para string vacío', () => {
      expect(cdmxDate('')).toBeNull();
    });

    it('retorna null para texto inválido', () => {
      expect(cdmxDate('no-es-una-fecha')).toBeNull();
    });
  });

  describe('formato con offset explícito (Zapier / Make)', () => {
    it('parsea timestamp de Zapier con +02:00 y microsegundos', () => {
      // Zapier envía con offset europeo y microsegundos
      const result = cdmxDate('2026-04-02T21:46:44.309077+02:00');
      // UTC = 21:46:44 - 2h = 19:46:44Z
      expect(result).toEqual(new Date('2026-04-02T19:46:44.000Z'));
    });

    it('parsea timestamp de Make con -06:00 (CDMX explícito)', () => {
      const result = cdmxDate('2026-04-02 12:00:00-06:00');
      // UTC = 12:00 + 6h = 18:00Z
      expect(result).toEqual(new Date('2026-04-02T18:00:00.000Z'));
    });

    it('parsea timestamp con Z (UTC)', () => {
      const result = cdmxDate('2026-04-01T12:00:00Z');
      expect(result).toEqual(new Date('2026-04-01T12:00:00.000Z'));
    });
  });

  describe('formato sin offset (Clientify CSV → se asume CDMX UTC-6)', () => {
    it('parsea fecha y hora normal de Clientify', () => {
      // "2026-04-01 18:16:24" en CDMX → UTC = +6h
      const result = cdmxDate('2026-04-01 18:16:24');
      expect(result).toEqual(new Date('2026-04-02T00:16:24.000Z'));
    });

    it('parsea hora de un dígito — bug fix "9:21:20"', () => {
      // Antes del fix, "2026-03-30T9:21:20-06:00" era inválido en algunos engines.
      // Después: se normaliza a "2026-03-30T09:21:20-06:00"
      const result = cdmxDate('2026-03-30 9:21:20');
      expect(result).toEqual(new Date('2026-03-30T15:21:20.000Z'));
    });

    it('elimina comillas dobles que PapaParse puede dejar', () => {
      const result = cdmxDate('"2026-04-01 18:16:24"');
      expect(result).toEqual(new Date('2026-04-02T00:16:24.000Z'));
    });

    it('elimina comillas simples', () => {
      const result = cdmxDate("'2026-04-01 18:16:24'");
      expect(result).toEqual(new Date('2026-04-02T00:16:24.000Z'));
    });
  });
});

// ─── getMonth ─────────────────────────────────────────────────────────────────

describe('getMonth', () => {
  it('retorna null para entrada nula', () => {
    expect(getMonth(null)).toBeNull();
  });

  it('retorna null para entrada inválida', () => {
    expect(getMonth('no-es-fecha')).toBeNull();
  });

  it('extrae mes en hora CDMX (caso normal)', () => {
    // "2026-04-15 10:00:00" → CDMX 10:00 del 15 de abril → "2026-04"
    expect(getMonth('2026-04-15 10:00:00')).toBe('2026-04');
  });

  it('cruza límite de mes: UTC April pero CDMX March', () => {
    // UTC 04:00 del 1 de abril → CDMX = UTC-6 = 22:00 del 31 de marzo
    expect(getMonth('2026-04-01T04:00:00+00:00')).toBe('2026-03');
  });

  it('cruza límite de año: UTC January pero CDMX December', () => {
    // UTC 04:00 del 1 de enero → CDMX = 22:00 del 31 de diciembre del año anterior
    expect(getMonth('2026-01-01T04:00:00+00:00')).toBe('2025-12');
  });
});

// ─── monthLabel ───────────────────────────────────────────────────────────────

describe('monthLabel', () => {
  it('retorna string vacío para entrada vacía', () => {
    expect(monthLabel('')).toBe('');
  });

  it('retorna string vacío para null', () => {
    expect(monthLabel(null)).toBe('');
  });

  it('formatea enero', () => {
    expect(monthLabel('2026-01')).toBe('Ene 26');
  });

  it('formatea diciembre', () => {
    expect(monthLabel('2025-12')).toBe('Dic 25');
  });

  it('formatea mes intermedio', () => {
    expect(monthLabel('2026-07')).toBe('Jul 26');
  });
});

// ─── getWeekRange ─────────────────────────────────────────────────────────────

describe('getWeekRange', () => {
  // Fijamos el tiempo a miércoles 1 de abril de 2026, 12:00 CDMX (18:00 UTC)
  const MOCK_NOW = new Date('2026-04-01T18:00:00.000Z').getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(MOCK_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('semana actual: inicia el lunes 30-mar a las 00:00 CDMX', () => {
    const [mon] = getWeekRange(0);
    // Lunes 30-mar 00:00 CDMX = 06:00 UTC
    expect(mon).toEqual(new Date('2026-03-30T06:00:00.000Z'));
  });

  it('semana actual: termina el domingo 5-abr a las 23:59:59.999 CDMX', () => {
    const [, sun] = getWeekRange(0);
    // Domingo 5-abr 23:59:59.999 CDMX = 6-abr 05:59:59.999 UTC
    expect(sun).toEqual(new Date('2026-04-06T05:59:59.999Z'));
  });

  it('semana anterior: inicia el lunes 23-mar a las 00:00 CDMX', () => {
    const [mon] = getWeekRange(-1);
    expect(mon).toEqual(new Date('2026-03-23T06:00:00.000Z'));
  });

  it('semana anterior: termina el domingo 29-mar a las 23:59:59.999 CDMX', () => {
    const [, sun] = getWeekRange(-1);
    expect(sun).toEqual(new Date('2026-03-30T05:59:59.999Z'));
  });

  it('cada semana dura exactamente 7 días', () => {
    const [mon, sun] = getWeekRange(0);
    const duracionMs = sun.getTime() - mon.getTime() + 1;
    expect(duracionMs).toBe(7 * 24 * 3600 * 1000);
  });
});

// ─── inWeek ───────────────────────────────────────────────────────────────────

describe('inWeek', () => {
  // Fijamos el tiempo a miércoles 1 de abril de 2026, 12:00 CDMX (18:00 UTC)
  // Semana actual: lun 30-mar 00:00 CDMX → dom 5-abr 23:59:59 CDMX
  const MOCK_NOW = new Date('2026-04-01T18:00:00.000Z').getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(MOCK_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retorna false para entrada nula', () => {
    expect(inWeek(null, 0)).toBe(false);
  });

  it('retorna false para fecha inválida', () => {
    expect(inWeek('no-es-fecha', 0)).toBe(false);
  });

  it('incluye el lunes de inicio exacto (límite inferior)', () => {
    // Lunes 30-mar 00:00:00 CDMX = inicio exacto de la semana
    expect(inWeek('2026-03-30 00:00:00', 0)).toBe(true);
  });

  it('incluye el domingo de cierre exacto (límite superior)', () => {
    // Domingo 5-abr 23:59:59 CDMX = cierre de la semana
    expect(inWeek('2026-04-05 23:59:59', 0)).toBe(true);
  });

  it('excluye el lunes siguiente (un segundo después del cierre)', () => {
    // Lunes 6-abr 00:00:00 CDMX = fuera de la semana actual
    expect(inWeek('2026-04-06 00:00:00', 0)).toBe(false);
  });

  it('excluye el domingo anterior (un segundo antes del inicio)', () => {
    // Domingo 29-mar 23:59:59 CDMX = semana anterior, no la actual
    expect(inWeek('2026-03-29 23:59:59', 0)).toBe(false);
  });

  it('funciona para semana anterior (offset -1)', () => {
    // Lunes 23-mar 00:00 CDMX → domingo 29-mar 23:59:59 CDMX
    expect(inWeek('2026-03-25 10:00:00', -1)).toBe(true);
    expect(inWeek('2026-03-30 00:00:00', -1)).toBe(false); // ya es semana actual
  });
});
