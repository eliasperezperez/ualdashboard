import { describe, it, expect } from 'vitest';
import { calcTppc, median, fmtTppc, tppcColor } from '../src/calculations.js';

// ─── calcTppc ─────────────────────────────────────────────────────────────────

describe('calcTppc', () => {
  describe('casos válidos', () => {
    it('calcula 2.5 horas de diferencia', () => {
      const item = { creado: '2026-04-01 10:00:00', ultimo: '2026-04-01 12:30:00' };
      expect(calcTppc(item)).toBe(2.5);
    });

    it('calcula exactamente 1 hora', () => {
      const item = { creado: '2026-04-01 08:00:00', ultimo: '2026-04-01 09:00:00' };
      expect(calcTppc(item)).toBe(1);
    });

    it('funciona con formatos mixtos (Zapier creado + Clientify ultimo)', () => {
      // creado en formato Zapier con offset explícito CDMX
      // ultimo en formato Clientify sin offset (se asume CDMX)
      const item = {
        creado: '2026-04-01T10:00:00-06:00', // UTC = 16:00Z
        ultimo: '2026-04-01 13:00:00',        // CDMX 13:00 → UTC = 19:00Z → 3h después
      };
      expect(calcTppc(item)).toBe(3);
    });

    it('calcula correctamente cuando el contacto es al día siguiente', () => {
      const item = { creado: '2026-04-01 22:00:00', ultimo: '2026-04-02 10:00:00' };
      expect(calcTppc(item)).toBe(12);
    });
  });

  describe('campos faltantes o vacíos', () => {
    it('retorna null si creado es null', () => {
      expect(calcTppc({ creado: null, ultimo: '2026-04-01 12:00:00' })).toBeNull();
    });

    it('retorna null si ultimo es null', () => {
      expect(calcTppc({ creado: '2026-04-01 10:00:00', ultimo: null })).toBeNull();
    });

    it('retorna null si creado es string vacío', () => {
      expect(calcTppc({ creado: '', ultimo: '2026-04-01 12:00:00' })).toBeNull();
    });

    it('retorna null si ultimo es string vacío', () => {
      expect(calcTppc({ creado: '2026-04-01 10:00:00', ultimo: '' })).toBeNull();
    });

    it('retorna null si ambos campos son nulos', () => {
      expect(calcTppc({ creado: null, ultimo: null })).toBeNull();
    });
  });

  describe('timestamps inválidos o invertidos', () => {
    it('retorna null si ultimo < creado (timestamps invertidos)', () => {
      const item = { creado: '2026-04-01 12:00:00', ultimo: '2026-04-01 10:00:00' };
      expect(calcTppc(item)).toBeNull();
    });

    it('retorna null si ultimo === creado (sin tiempo de respuesta)', () => {
      const item = { creado: '2026-04-01 10:00:00', ultimo: '2026-04-01 10:00:00' };
      expect(calcTppc(item)).toBeNull();
    });

    it('retorna null si creado es una fecha inválida', () => {
      const item = { creado: 'no-es-fecha', ultimo: '2026-04-01 12:00:00' };
      expect(calcTppc(item)).toBeNull();
    });
  });
});

// ─── median ───────────────────────────────────────────────────────────────────

describe('median', () => {
  it('retorna 0 para array vacío', () => {
    expect(median([])).toBe(0);
  });

  it('retorna el único elemento para array de un elemento', () => {
    expect(median([5])).toBe(5);
  });

  it('calcula mediana de array impar', () => {
    // [3, 1, 4, 1, 5] → sorted: [1, 1, 3, 4, 5] → mediana: 3
    expect(median([3, 1, 4, 1, 5])).toBe(3);
  });

  it('calcula mediana de array par (promedio de los dos centrales)', () => {
    // [1, 3] → (1+3)/2 = 2
    expect(median([1, 3])).toBe(2);
  });

  it('no muta el array original', () => {
    const arr = [5, 1, 3];
    median(arr);
    expect(arr).toEqual([5, 1, 3]);
  });
});

// ─── fmtTppc ─────────────────────────────────────────────────────────────────

describe('fmtTppc', () => {
  it('retorna "—" para null', () => {
    expect(fmtTppc(null)).toBe('—');
  });

  it('retorna "—" para 0 (falsy)', () => {
    expect(fmtTppc(0)).toBe('—');
  });

  it('formatea menos de 24h en horas', () => {
    expect(fmtTppc(1.5)).toBe('1.5h');
  });

  it('formatea 23.9h como horas (límite inferior del umbral)', () => {
    expect(fmtTppc(23.9)).toBe('23.9h');
  });

  it('formatea exactamente 24h en días', () => {
    expect(fmtTppc(24)).toBe('1.0d');
  });

  it('formatea 48h como días', () => {
    expect(fmtTppc(48)).toBe('2.0d');
  });
});

// ─── tppcColor ────────────────────────────────────────────────────────────────

describe('tppcColor', () => {
  it('retorna --muted para null', () => {
    expect(tppcColor(null)).toBe('var(--muted)');
  });

  it('retorna --muted para 0 (falsy)', () => {
    expect(tppcColor(0)).toBe('var(--muted)');
  });

  it('retorna --green para ≤ 24h (límite exacto)', () => {
    expect(tppcColor(24)).toBe('var(--green)');
  });

  it('retorna --green para contacto rápido (1h)', () => {
    expect(tppcColor(1)).toBe('var(--green)');
  });

  it('retorna --accent para 25h (entre 24h y 72h)', () => {
    expect(tppcColor(25)).toBe('var(--accent)');
  });

  it('retorna --accent para exactamente 72h (límite exacto)', () => {
    expect(tppcColor(72)).toBe('var(--accent)');
  });

  it('retorna --red para más de 72h', () => {
    expect(tppcColor(73)).toBe('var(--red)');
  });
});
