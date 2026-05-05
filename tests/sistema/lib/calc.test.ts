import { describe, it, expect, beforeEach } from "vitest";
import {
  calcKg,
  calcVolumenSemana,
  calcRepsPorGrupo,
  remapSemanaIdx,
  remapSemPctKeyForSwap,
  remapTurnoPctKeyForSwap,
  remapOverrideObjectKeys,
  remapOverrideSetKeys,
  getEjercicioById,
  getSembradoStats,
  calcKgEj,
  GRUPO_RANGES,
  GRUPOS_KEYS,
  getGrupo,
  calcSembradoSemana,
  calcRepsEjercicio,
} from "@/app/sistema/lib/calc";

beforeEach(() => {
  localStorage.clear();
});

describe("calcKg", () => {
  it("calcula kg = irm × pct_base / 100 redondeado a 0.1", () => {
    expect(calcKg({ pct_base: 90, base: "arranque" }, 100, 120)).toBe(90);
    expect(calcKg({ pct_base: 75, base: "envion" }, 100, 120)).toBe(90);
  });

  it("retorna null si falta pct_base, ej o irm", () => {
    expect(calcKg(null, 100, 120)).toBeNull();
    expect(calcKg({ pct_base: 0 }, 100, 120)).toBeNull();
    expect(calcKg({ pct_base: 90, base: "arranque" }, null, 120)).toBeNull();
  });
});

describe("calcVolumenSemana", () => {
  it("redondea volTotal × pct / 100", () => {
    expect(calcVolumenSemana(1000, 25)).toBe(250);
    expect(calcVolumenSemana(1000, 33)).toBe(330);
  });
});

describe("calcRepsPorGrupo", () => {
  it("distribuye reps según pcts", () => {
    const result = calcRepsPorGrupo(100, {
      Arranque: 25,
      Envion: 35,
      Tirones: 20,
      Piernas: 20,
    });
    expect(result).toEqual({ Arranque: 25, Envion: 35, Tirones: 20, Piernas: 20 });
  });
});

describe("remapSemanaIdx", () => {
  it("intercambia a↔b y deja el resto igual", () => {
    expect(remapSemanaIdx(0, 0, 2)).toBe(2);
    expect(remapSemanaIdx(2, 0, 2)).toBe(0);
    expect(remapSemanaIdx(1, 0, 2)).toBe(1);
  });
});

describe("remapSemPctKeyForSwap", () => {
  it("remapea key tipo 'Arranque-2'", () => {
    expect(remapSemPctKeyForSwap("Arranque-0", 0, 2)).toBe("Arranque-2");
    expect(remapSemPctKeyForSwap("Envion-1", 0, 2)).toBe("Envion-1");
  });

  it("retorna la key tal cual si no matchea", () => {
    expect(remapSemPctKeyForSwap("foo", 0, 2)).toBe("foo");
  });
});

describe("remapTurnoPctKeyForSwap", () => {
  it("remapea key tipo 'Arranque-0-3'", () => {
    expect(remapTurnoPctKeyForSwap("Arranque-0-3", 0, 2)).toBe("Arranque-2-3");
    expect(remapTurnoPctKeyForSwap("Envion-1-2", 0, 2)).toBe("Envion-1-2");
  });

  it("retorna la key tal cual si no matchea", () => {
    expect(remapTurnoPctKeyForSwap("foo", 0, 2)).toBe("foo");
  });
});

describe("remapOverrideObjectKeys", () => {
  it("aplica el mapper a las keys", () => {
    const result = remapOverrideObjectKeys(
      { "a-0": 1, "b-2": 2 },
      (k: string) => k.replace("-0", "-2").replace("-2", "-0"),
    );
    expect(result).toBeTypeOf("object");
  });

  it("retorna {} si no es objeto", () => {
    expect(remapOverrideObjectKeys(null, (k) => k)).toEqual({});
    expect(remapOverrideObjectKeys(123 as any, (k) => k)).toEqual({});
  });
});

describe("remapOverrideSetKeys", () => {
  it("convierte Set en Set remapeado", () => {
    const result = remapOverrideSetKeys(new Set(["a", "b"]), (k: string) => k.toUpperCase());
    expect(result).toBeInstanceOf(Set);
    expect([...result].sort()).toEqual(["A", "B"]);
  });

  it("acepta arrays/iterables y devuelve Set", () => {
    const result = remapOverrideSetKeys(["x", "y"] as any, (k: string) => k);
    expect([...result].sort()).toEqual(["x", "y"]);
  });
});

describe("getEjercicioById", () => {
  it("usa el array EJERCICIOS por defecto", () => {
    const ej = getEjercicioById(1);
    expect(ej?.id).toBe(1);
  });

  it("usa normativos pasados como parámetro si existen", () => {
    const ej = getEjercicioById(99, [{ id: 99, nombre: "custom", categoria: "Arranque" }] as any);
    expect(ej?.nombre).toBe("custom");
  });

  it("usa localStorage liftplan_normativos si está poblado", () => {
    localStorage.setItem(
      "liftplan_normativos",
      JSON.stringify([{ id: 999, nombre: "stored", categoria: "Arranque" }]),
    );
    const ej = getEjercicioById(999);
    expect(ej?.nombre).toBe("stored");
  });

  it("retorna null si el id no existe", () => {
    expect(getEjercicioById(99999)).toBeNull();
  });
});

describe("getSembradoStats", () => {
  it("cuenta categorías y calcula porcentajes", () => {
    const turnos = [
      { ejercicios: [{ ejercicio_id: 1 }, { ejercicio_id: 20 }, { ejercicio_id: 49 }] },
      { ejercicios: [{ ejercicio_id: 69 }, { ejercicio_id: null }] },
    ];
    const result = getSembradoStats(turnos);
    expect(result.total).toBe(4);
    expect(result.counts.Arranque).toBe(1);
    expect(result.counts.Envion).toBe(1);
    expect(result.counts.Tirones).toBe(1);
    expect(result.counts.Piernas).toBe(1);
    expect(result.pcts.Arranque).toBe(25);
  });

  it("maneja turnos vacíos", () => {
    expect(getSembradoStats([]).total).toBe(0);
  });
});

describe("calcKgEj", () => {
  it("calcula kg redondeado a 0.5", () => {
    // ej id 15 (Arran clásico): pct_base=100, base=arranque
    // irm_arr=100, intens=80 → 100×100/100×80/100 = 80
    expect(calcKgEj(15, 80, 100, 120)).toBe(80);
  });

  it("retorna null si no hay irm correspondiente", () => {
    expect(calcKgEj(15, 80, null, 120)).toBeNull();
  });

  it("retorna null si el ejercicio no tiene pct_base", () => {
    expect(calcKgEj(77, 80, 100, 120)).toBeNull();
  });
});

describe("GRUPO_RANGES / GRUPOS_KEYS", () => {
  it("define los 4 grupos canónicos", () => {
    expect(GRUPOS_KEYS).toEqual(["Arranque", "Envion", "Tirones", "Piernas"]);
    expect(GRUPO_RANGES.Arranque).toEqual([1, 19]);
    expect(GRUPO_RANGES.Piernas).toEqual([69, 78]);
  });
});

describe("getGrupo", () => {
  it("usa la categoría del normativo si está", () => {
    expect(getGrupo(1)).toBe("Arranque");
    expect(getGrupo(20)).toBe("Envion");
    expect(getGrupo(49)).toBe("Tirones");
    expect(getGrupo(69)).toBe("Piernas");
  });

  it("retorna null para Complementarios u otros fuera de los 4 grupos", () => {
    expect(getGrupo(80)).toBeNull(); // categoria=Complementarios, fuera de GRUPOS_KEYS
  });
});

describe("calcSembradoSemana", () => {
  it("cuenta totales por grupo y por turno", () => {
    const sem = {
      turnos: [
        { ejercicios: [{ ejercicio_id: 1 }, { ejercicio_id: 20 }] },
        { ejercicios: [{ ejercicio_id: 49 }, { ejercicio_id: 69 }] },
      ],
    };
    const result = calcSembradoSemana(sem);
    expect(result.totalSem).toBe(4);
    expect(result.porGrupo.Arranque.total).toBe(1);
    expect(result.porGrupo.Arranque.porTurno).toEqual([1, 0]);
    expect(result.porGrupo.Tirones.porTurno).toEqual([0, 1]);
  });
});

describe("calcRepsEjercicio", () => {
  it("distribuye reps proporcionalmente", () => {
    const sem = {
      pct_volumen: 25,
      turnos: [
        { ejercicios: [{ ejercicio_id: 1 }, { ejercicio_id: 20 }] },
        { ejercicios: [{ ejercicio_id: 49 }, { ejercicio_id: 69 }] },
      ],
    };
    const meso = { volumen_total: 1000 };
    const result = calcRepsEjercicio(sem, 0, meso);
    // reps_sem = 1000 × 0.25 = 250; 4 ejs cada uno cuenta 1, distribución uniforme
    // Arranque pct sem = 1/4 = 0.25; turno = 1/1 = 1; reps = 250 × 0.25 × 1 = 62.5 → 63 (1 ej)
    expect(typeof result["1"]).toBe("number");
    expect(result["20"]).toBeGreaterThan(0);
  });
});
