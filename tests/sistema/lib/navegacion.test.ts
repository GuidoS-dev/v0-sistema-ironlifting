import { describe, it, expect } from "vitest";
import {
  PLANILLA_NAV_SELECTOR,
  buildPlanillaFocusGrid,
  focusPlanillaField,
  SEMBRADO_NAV_SELECTOR,
  SEMBRADO_ROLE_ORDER,
  getSembradoTabSequence,
} from "@/app/sistema/lib/navegacion";

describe("constantes y selectors", () => {
  it("PLANILLA_NAV_SELECTOR cubre input/select/textarea no deshabilitados", () => {
    expect(PLANILLA_NAV_SELECTOR).toContain("input");
    expect(PLANILLA_NAV_SELECTOR).toContain("select");
    expect(PLANILLA_NAV_SELECTOR).toContain("textarea");
    expect(PLANILLA_NAV_SELECTOR).toContain(":not([disabled])");
  });

  it("SEMBRADO_NAV_SELECTOR matchea el data-attribute esperado", () => {
    expect(SEMBRADO_NAV_SELECTOR).toBe('[data-sembrado-nav="true"]');
  });

  it("SEMBRADO_ROLE_ORDER define el orden esperado de roles", () => {
    expect(SEMBRADO_ROLE_ORDER.ejercicio).toBe(0);
    expect(SEMBRADO_ROLE_ORDER.intensidad).toBe(1);
    expect(SEMBRADO_ROLE_ORDER.tabla).toBe(2);
    expect(SEMBRADO_ROLE_ORDER.remove).toBe(3);
    expect(SEMBRADO_ROLE_ORDER.add).toBe(4);
  });
});

describe("buildPlanillaFocusGrid", () => {
  it("retorna null sin container", () => {
    expect(buildPlanillaFocusGrid(null as any)).toBeNull();
  });

  it("retorna null si no hay inputs visibles (jsdom no calcula bounding rects)", () => {
    const div = document.createElement("div");
    div.innerHTML = '<input /><input />';
    document.body.appendChild(div);
    // En jsdom todos los rects son 0,0,0,0 → no quedan items y retorna null
    expect(buildPlanillaFocusGrid(div)).toBeNull();
    document.body.removeChild(div);
  });
});

describe("focusPlanillaField", () => {
  it("ignora valores no-HTMLElement", () => {
    expect(() => focusPlanillaField(null as any)).not.toThrow();
    expect(() => focusPlanillaField("foo" as any)).not.toThrow();
  });

  it("llama a focus en el elemento", () => {
    const input = document.createElement("input");
    // jsdom no implementa scrollIntoView
    input.scrollIntoView = () => {};
    document.body.appendChild(input);
    focusPlanillaField(input);
    expect(document.activeElement).toBe(input);
    document.body.removeChild(input);
  });
});

describe("getSembradoTabSequence", () => {
  it("retorna [] sin container", () => {
    expect(getSembradoTabSequence(null as any)).toEqual([]);
  });

  it("retorna [] si no hay elementos visibles (jsdom)", () => {
    const div = document.createElement("div");
    div.innerHTML = '<button data-sembrado-nav="true" data-role="ejercicio" data-sem-idx="0" data-turno-idx="0" data-ej-idx="0">x</button>';
    document.body.appendChild(div);
    // jsdom no da bounding rects → filtro de visibilidad lo descarta
    expect(getSembradoTabSequence(div)).toEqual([]);
    document.body.removeChild(div);
  });
});
