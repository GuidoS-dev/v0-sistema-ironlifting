import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  collectAtletaNormOverrides,
  restoreAtletaNormOverrides,
  buildMesoOverridesPayload,
  collectMesoOverrides,
  restoreMesoOverrides,
  collectAtletaPctOverrides,
  restoreAtletaPctOverrides,
} from "@/app/sistema/lib/overrides";

beforeEach(() => {
  localStorage.clear();
});

describe("collectAtletaNormOverrides", () => {
  it("retorna {} si no hay overrides", () => {
    expect(collectAtletaNormOverrides("a1")).toEqual({});
  });

  it("retorna el objeto guardado", () => {
    localStorage.setItem(
      "liftplan_normativos_atleta_a1",
      JSON.stringify({ "ej-1": 110 }),
    );
    expect(collectAtletaNormOverrides("a1")).toEqual({ "ej-1": 110 });
  });
});

describe("restoreAtletaNormOverrides", () => {
  it("guarda overrides y emite evento normativos-overrides-updated", () => {
    const handler = vi.fn();
    window.addEventListener("liftplan:normativos-overrides-updated", handler);
    restoreAtletaNormOverrides("a1", { "ej-1": 110 });
    expect(collectAtletaNormOverrides("a1")).toEqual({ "ej-1": 110 });
    expect(handler).toHaveBeenCalled();
    window.removeEventListener("liftplan:normativos-overrides-updated", handler);
  });

  it("ignora atletaId vacío", () => {
    restoreAtletaNormOverrides(null, { x: 1 });
    expect(localStorage.length).toBe(0);
  });

  it("ignora overrides null", () => {
    restoreAtletaNormOverrides("a1", null);
    expect(localStorage.length).toBe(0);
  });
});

describe("collectMesoOverrides", () => {
  it("retorna estructura vacía si no hay nada", () => {
    expect(collectMesoOverrides("m1")).toEqual({
      repsEdit: {},
      manualEdit: [],
      cellEdit: {},
      cellManual: [],
      nameEdit: {},
      noteEdit: {},
      semOvr: {},
      semMan: [],
      turnoOvr: {},
      turnoMan: [],
    });
  });

  it("hidrata desde localStorage", () => {
    localStorage.setItem("liftplan_pt_m1_repsEdit", JSON.stringify({ k: 1 }));
    localStorage.setItem("liftplan_pt_m1_manualEdit", JSON.stringify(["a"]));
    const result = collectMesoOverrides("m1");
    expect(result.repsEdit).toEqual({ k: 1 });
    expect(result.manualEdit).toEqual(["a"]);
  });
});

describe("restoreMesoOverrides", () => {
  it("escribe todos los buckets a localStorage", () => {
    restoreMesoOverrides("m1", {
      repsEdit: { a: 1 },
      manualEdit: ["x"],
      cellEdit: { c: 2 },
      cellManual: ["y"],
      nameEdit: { n: "n" },
      noteEdit: { z: "z" },
      semOvr: { s: 1 },
      semMan: ["sm"],
      turnoOvr: { t: 1 },
      turnoMan: ["tm"],
    });
    expect(JSON.parse(localStorage.getItem("liftplan_pt_m1_repsEdit") || "")).toEqual({ a: 1 });
    expect(JSON.parse(localStorage.getItem("liftplan_pct_m1_turnoMan") || "")).toEqual(["tm"]);
  });

  it("ignora overrides null/undefined", () => {
    restoreMesoOverrides("m1", null);
    expect(localStorage.length).toBe(0);
  });

  it("salta valores que son null dentro del payload", () => {
    restoreMesoOverrides("m1", { repsEdit: null, manualEdit: ["x"] } as any);
    expect(localStorage.getItem("liftplan_pt_m1_repsEdit")).toBeNull();
    expect(JSON.parse(localStorage.getItem("liftplan_pt_m1_manualEdit") || "")).toEqual(["x"]);
  });
});

describe("collectAtletaPctOverrides / restoreAtletaPctOverrides", () => {
  it("colecta defaults vacíos", () => {
    expect(collectAtletaPctOverrides("a1")).toEqual({
      semOvr: {},
      semMan: [],
      turnoOvr: {},
      turnoMan: [],
    });
  });

  it("round-trip", () => {
    restoreAtletaPctOverrides("a1", {
      semOvr: { s: 1 },
      semMan: ["m"],
      turnoOvr: { t: 1 },
      turnoMan: ["tm"],
    });
    expect(collectAtletaPctOverrides("a1")).toEqual({
      semOvr: { s: 1 },
      semMan: ["m"],
      turnoOvr: { t: 1 },
      turnoMan: ["tm"],
    });
  });

  it("ignora overrides null", () => {
    restoreAtletaPctOverrides("a1", null);
    expect(localStorage.length).toBe(0);
  });
});

describe("buildMesoOverridesPayload", () => {
  it("usa stored overrides cuando no hay liveOverrides", () => {
    localStorage.setItem("liftplan_pt_m1_repsEdit", JSON.stringify({ x: 1 }));
    const payload = buildMesoOverridesPayload({
      id: "m1",
      escuela: false,
      escuela_nivel: "1",
      num_bloques_basica: 3,
      pretemporada: false,
    });
    expect(payload.repsEdit).toEqual({ x: 1 });
    expect(payload._meta).toEqual({
      escuela: false,
      escuela_nivel: "1",
      num_bloques_basica: 3,
      distribucion: null,
      pretemporada: false,
    });
  });

  it("liveOverrides tiene prioridad sobre stored", () => {
    localStorage.setItem("liftplan_pt_m1_repsEdit", JSON.stringify({ x: 1 }));
    const payload = buildMesoOverridesPayload(
      { id: "m1" },
      { repsEdit: { y: 99 } } as any,
    );
    expect(payload.repsEdit).toEqual({ y: 99 });
  });

  it("aplica defaults a meta cuando los campos están ausentes", () => {
    const payload = buildMesoOverridesPayload({ id: "m1" });
    expect(payload._meta).toEqual({
      escuela: false,
      escuela_nivel: "1",
      num_bloques_basica: 3,
      distribucion: null,
      pretemporada: false,
    });
  });
});
