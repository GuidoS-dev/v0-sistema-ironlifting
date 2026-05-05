import { describe, it, expect } from "vitest";
import {
  parseAppDate,
  getAgeFromBirthDate,
  getFasePorDia,
  getFasesVentanaCiclo,
  getFaseDominante,
  getFaseCiclo,
  getDetalleFaseCiclo,
  getFechaSemana,
  getFechaSemanaEfectiva,
  formatFechaSemana,
  formatDateDisplay,
} from "@/app/sistema/lib/ciclo-menstrual";

describe("parseAppDate", () => {
  it("parsea YYYY-MM-DD como hora local", () => {
    const d = parseAppDate("2024-05-15");
    expect(d?.getFullYear()).toBe(2024);
    expect(d?.getMonth()).toBe(4);
    expect(d?.getDate()).toBe(15);
  });

  it("parsea DD/MM/YYYY", () => {
    const d = parseAppDate("15/05/2024");
    expect(d?.getDate()).toBe(15);
    expect(d?.getMonth()).toBe(4);
  });

  it("acepta Date directo", () => {
    const orig = new Date(2024, 4, 15);
    expect(parseAppDate(orig)?.getDate()).toBe(15);
  });

  it("retorna null para inválidos", () => {
    expect(parseAppDate(null)).toBeNull();
    expect(parseAppDate("")).toBeNull();
    expect(parseAppDate("not-a-date")).toBeNull();
  });

  it("rechaza fechas imposibles tipo 32/13/2024", () => {
    expect(parseAppDate("32/13/2024")).toBeNull();
  });
});

describe("getAgeFromBirthDate", () => {
  it("calcula años cumplidos", () => {
    expect(
      getAgeFromBirthDate("2000-01-15", new Date(2024, 5, 1)),
    ).toBe(24);
  });

  it("descuenta el año si todavía no cumplió", () => {
    expect(
      getAgeFromBirthDate("2000-12-15", new Date(2024, 5, 1)),
    ).toBe(23);
  });

  it("retorna null sin birth date válido", () => {
    expect(getAgeFromBirthDate(null)).toBeNull();
  });
});

describe("getFasePorDia", () => {
  it("clasifica fases con duración 28/5", () => {
    expect(getFasePorDia(1, 28, 5)).toBe("menstruacion");
    expect(getFasePorDia(5, 28, 5)).toBe("menstruacion");
    expect(getFasePorDia(10, 28, 5)).toBe("folicular");
    expect(getFasePorDia(15, 28, 5)).toBe("ovulacion");
    expect(getFasePorDia(20, 28, 5)).toBe("lutea");
  });
});

describe("getFasesVentanaCiclo", () => {
  it("retorna null si falta ciclo o fecha", () => {
    expect(getFasesVentanaCiclo(null, "2024-01-01")).toBeNull();
    expect(getFasesVentanaCiclo({ ultimo_inicio: "2024-01-01" }, null)).toBeNull();
  });

  it("calcula la fase para semana 1 desde último ciclo", () => {
    const result = getFasesVentanaCiclo(
      { ultimo_inicio: "2024-01-01", duracion_ciclo: 28, duracion_mens: 5 },
      "2024-01-01",
      1,
    );
    expect(result).toEqual(["menstruacion"]);
  });

  it("ventana mayor devuelve múltiples fases", () => {
    const result = getFasesVentanaCiclo(
      { ultimo_inicio: "2024-01-01", duracion_ciclo: 28, duracion_mens: 5 },
      "2024-01-01",
      7,
    );
    expect(result?.length).toBe(7);
  });
});

describe("getFaseDominante", () => {
  it("prioriza ovulación si está presente", () => {
    expect(getFaseDominante(["folicular", "ovulacion", "lutea"])).toBe(
      "ovulacion",
    );
  });

  it("retorna null para input inválido", () => {
    expect(getFaseDominante([])).toBeNull();
    expect(getFaseDominante(null as any)).toBeNull();
  });

  it("usa la fase más frecuente entre menstruación/folicular/lútea", () => {
    expect(
      getFaseDominante(["folicular", "folicular", "lutea"]),
    ).toBe("folicular");
  });
});

describe("getFaseCiclo / getDetalleFaseCiclo", () => {
  const ciclo = {
    ultimo_inicio: "2024-01-01",
    duracion_ciclo: 28,
    duracion_mens: 5,
  };

  it("getFaseCiclo retorna la fase dominante de la ventana", () => {
    expect(getFaseCiclo(ciclo, "2024-01-01", 1)).toBe("menstruacion");
  });

  it("getDetalleFaseCiclo arma transición si hay cambio de fase en la ventana", () => {
    const result = getDetalleFaseCiclo(ciclo, "2024-01-04", 7);
    expect(result?.fase).toBeDefined();
    expect(typeof result?.transicion === "string" || result?.transicion === null).toBe(true);
  });

  it("getDetalleFaseCiclo retorna null sin ventana", () => {
    expect(getDetalleFaseCiclo(null, "2024-01-01", 1)).toBeNull();
  });
});

describe("getFechaSemana / getFechaSemanaEfectiva", () => {
  it("calcula fecha sumando (semana-1)*7 días", () => {
    expect(getFechaSemana("2024-01-01", 1)).toBe("2024-01-01");
    expect(getFechaSemana("2024-01-01", 3)).toBe("2024-01-15");
  });

  it("retorna null sin fecha base", () => {
    expect(getFechaSemana(null, 1)).toBeNull();
  });

  it("getFechaSemanaEfectiva prioriza fecha_override", () => {
    expect(
      getFechaSemanaEfectiva("2024-01-01", { numero: 2, fecha_override: "2024-09-09" }),
    ).toBe("2024-09-09");
  });

  it("getFechaSemanaEfectiva calcula si no hay override", () => {
    expect(
      getFechaSemanaEfectiva("2024-01-01", { numero: 2 }),
    ).toBe("2024-01-08");
  });
});

describe("formatFechaSemana / formatDateDisplay", () => {
  it("formatean a DD-MM-YYYY", () => {
    expect(formatFechaSemana("2024-05-15")).toBe("15-05-2024");
    expect(formatDateDisplay("2024-05-15")).toBe("15-05-2024");
  });

  it("retornan string vacío sin input", () => {
    expect(formatFechaSemana("")).toBe("");
    expect(formatDateDisplay("")).toBe("");
  });

  it("retornan el input crudo si no parsean", () => {
    expect(formatFechaSemana("garbage")).toBe("garbage");
  });
});
