import { describe, it, expect, beforeEach } from "vitest";
import {
  BACKUP_INTERVAL_MS,
  BACKUP_PROMPTED_KEY,
  getLastDbSync,
  collectLocalData,
} from "@/app/sistema/lib/backup";

beforeEach(() => {
  localStorage.clear();
});

describe("constantes", () => {
  it("BACKUP_INTERVAL_MS = 5 horas en ms", () => {
    expect(BACKUP_INTERVAL_MS).toBe(5 * 60 * 60 * 1000);
  });

  it("BACKUP_PROMPTED_KEY usa el nombre estable", () => {
    expect(BACKUP_PROMPTED_KEY).toBe("liftplan_backup_prompted_at");
  });
});

describe("getLastDbSync", () => {
  it("retorna 0 sin valor previo", () => {
    expect(getLastDbSync()).toBe(0);
  });

  it("retorna el timestamp guardado", () => {
    localStorage.setItem("liftplan_last_db_sync", "1234567890");
    expect(getLastDbSync()).toBe(1234567890);
  });

  it("retorna 0 ante valor inválido", () => {
    localStorage.setItem("liftplan_last_db_sync", "abc");
    expect(getLastDbSync()).toBeNaN();
  });
});

describe("collectLocalData", () => {
  it("retorna defaults vacíos sin datos en localStorage", () => {
    const result = collectLocalData();
    expect(result.atletas).toEqual([]);
    expect(result.mesociclos).toEqual([]);
    expect(result.plantillas).toEqual([]);
    expect(result.normativos).toBeNull();
    expect(result.tablas).toBeNull();
  });

  it("hidrata desde localStorage", () => {
    localStorage.setItem("liftplan_atletas", JSON.stringify([{ id: "a1" }]));
    localStorage.setItem("liftplan_normativos", JSON.stringify({ x: 1 }));
    const result = collectLocalData();
    expect(result.atletas).toEqual([{ id: "a1" }]);
    expect(result.normativos).toEqual({ x: 1 });
  });

  it("usa fallback ante JSON inválido", () => {
    localStorage.setItem("liftplan_atletas", "{not-json");
    expect(collectLocalData().atletas).toEqual([]);
  });
});
