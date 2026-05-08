import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  LIFTPLAN_LOCAL_SYNC_EVENT,
  _freeLocalStorageSpace,
  safeSetItem,
  emitLocalSyncEvent,
  readLocalJson,
  writeLocalJson,
  asPlainObject,
  asArray,
} from "@/app/sistema/lib/storage";

beforeEach(() => {
  localStorage.clear();
});

describe("LIFTPLAN_LOCAL_SYNC_EVENT", () => {
  it("usa el nombre estable liftplan:local-sync", () => {
    expect(LIFTPLAN_LOCAL_SYNC_EVENT).toBe("liftplan:local-sync");
  });
});

describe("_freeLocalStorageSpace", () => {
  it("borra solo claves expendibles (history y drafts)", () => {
    localStorage.setItem("liftplan_hist_plt_42", "x");
    localStorage.setItem("liftplan_hist_meso_7", "y");
    localStorage.setItem("liftplan_plt_draft_99", "z");
    localStorage.setItem("liftplan_normativos_atleta_1", "keep");
    localStorage.setItem("sb_session", "keep-session");

    const removed = _freeLocalStorageSpace();

    expect(removed).toBe(3);
    expect(localStorage.getItem("liftplan_hist_plt_42")).toBeNull();
    expect(localStorage.getItem("liftplan_hist_meso_7")).toBeNull();
    expect(localStorage.getItem("liftplan_plt_draft_99")).toBeNull();
    expect(localStorage.getItem("liftplan_normativos_atleta_1")).toBe("keep");
    expect(localStorage.getItem("sb_session")).toBe("keep-session");
  });

  it("retorna 0 si no hay claves expendibles", () => {
    localStorage.setItem("sb_session", "x");
    expect(_freeLocalStorageSpace()).toBe(0);
  });
});

describe("safeSetItem", () => {
  it("guarda y retorna true en caso normal", () => {
    expect(safeSetItem("k", "v")).toBe(true);
    expect(localStorage.getItem("k")).toBe("v");
  });

  it("retorna false ante error no-quota", () => {
    const spy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementationOnce(() => {
        throw new Error("disk-full");
      });
    expect(safeSetItem("k", "v")).toBe(false);
    spy.mockRestore();
  });

  it("intenta liberar espacio y reintenta ante QuotaExceededError", () => {
    localStorage.setItem("liftplan_hist_plt_a", "x");
    let calls = 0;
    const spy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(function (this: Storage, k: string, v: string) {
        calls += 1;
        if (calls === 1) {
          const err = new Error("quota") as Error & { name: string };
          err.name = "QuotaExceededError";
          throw err;
        }
        (Storage.prototype.setItem as any).wrappedMethod?.call(this, k, v);
      });
    expect(safeSetItem("k", "v")).toBe(true);
    expect(calls).toBeGreaterThanOrEqual(2);
    spy.mockRestore();
  });
});

describe("emitLocalSyncEvent", () => {
  it("emite CustomEvent con la key en detail", () => {
    const handler = vi.fn();
    window.addEventListener(LIFTPLAN_LOCAL_SYNC_EVENT, handler as EventListener);
    emitLocalSyncEvent("k1");
    expect(handler).toHaveBeenCalledTimes(1);
    const evt = handler.mock.calls[0][0] as CustomEvent;
    expect(evt.detail).toEqual({ key: "k1" });
    window.removeEventListener(LIFTPLAN_LOCAL_SYNC_EVENT, handler as EventListener);
  });
});

describe("readLocalJson / writeLocalJson", () => {
  it("escribe y lee JSON", () => {
    writeLocalJson("k", { a: 1 });
    expect(readLocalJson("k", null)).toEqual({ a: 1 });
  });

  it("readLocalJson retorna fallback si la key no existe", () => {
    expect(readLocalJson("missing", { fb: true })).toEqual({ fb: true });
  });

  it("readLocalJson retorna fallback si el JSON es inválido", () => {
    localStorage.setItem("k", "{not-json");
    expect(readLocalJson("k", "fallback")).toBe("fallback");
  });

  it("writeLocalJson dispara evento de sync", () => {
    const handler = vi.fn();
    window.addEventListener(LIFTPLAN_LOCAL_SYNC_EVENT, handler as EventListener);
    writeLocalJson("k", { v: 1 });
    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener(LIFTPLAN_LOCAL_SYNC_EVENT, handler as EventListener);
  });
});

describe("asPlainObject", () => {
  it("retorna objetos planos sin cambios", () => {
    const o = { a: 1 };
    expect(asPlainObject(o)).toBe(o);
  });

  it("retorna {} para arrays, null, primitivos", () => {
    expect(asPlainObject([1, 2])).toEqual({});
    expect(asPlainObject(null)).toEqual({});
    expect(asPlainObject(42)).toEqual({});
    expect(asPlainObject("x")).toEqual({});
  });
});

describe("asArray", () => {
  it("retorna arrays sin cambios", () => {
    const a = [1, 2];
    expect(asArray(a)).toBe(a);
  });

  it("convierte Set en array", () => {
    expect(asArray(new Set([1, 2, 3]))).toEqual([1, 2, 3]);
  });

  it("retorna [] para no-array, no-Set", () => {
    expect(asArray(null)).toEqual([]);
    expect(asArray({})).toEqual([]);
    expect(asArray("x")).toEqual([]);
  });
});
