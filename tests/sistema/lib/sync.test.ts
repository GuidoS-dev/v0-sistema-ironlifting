import { describe, it, expect, beforeEach } from "vitest";
import {
  _visResume,
  markDbSync,
  broadcastDbWrite,
} from "@/app/sistema/lib/sync";

beforeEach(() => {
  localStorage.clear();
});

describe("_visResume", () => {
  it("expone sub() que retorna unsubscribe", () => {
    const unsub = _visResume.sub(() => {});
    expect(typeof unsub).toBe("function");
    unsub();
  });
});

describe("markDbSync", () => {
  it("guarda timestamp en liftplan_last_db_sync", () => {
    markDbSync();
    const v = localStorage.getItem("liftplan_last_db_sync");
    expect(v).not.toBeNull();
    expect(Number(v)).toBeGreaterThan(0);
  });
});

describe("broadcastDbWrite", () => {
  it("llama a markDbSync (timestamp queda en localStorage)", () => {
    broadcastDbWrite("atletas");
    expect(localStorage.getItem("liftplan_last_db_sync")).not.toBeNull();
  });

  it("no rompe si BroadcastChannel falla", () => {
    expect(() => broadcastDbWrite("plantillas")).not.toThrow();
  });
});
