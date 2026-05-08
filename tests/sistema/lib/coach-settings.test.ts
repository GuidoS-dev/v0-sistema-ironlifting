import { describe, it, expect } from "vitest";
import {
  COACH_SETTING_KEYS,
  loadCoachSetting,
  loadCoachSettingRow,
  saveCoachSetting,
  resolveSharedCoachId,
} from "@/app/sistema/lib/coach-settings";

describe("COACH_SETTING_KEYS", () => {
  it("expone keys conocidas", () => {
    expect(COACH_SETTING_KEYS.normativos).toBe("normativos_globales");
    expect(COACH_SETTING_KEYS.tablas).toBe("tablas_calculadora");
  });
});

describe("loadCoachSetting / loadCoachSettingRow", () => {
  it("retornan null cuando coachId es vacío", async () => {
    expect(await loadCoachSetting(null as any, "x")).toBeNull();
    expect(await loadCoachSettingRow(null as any, "x")).toBeNull();
    expect(await loadCoachSetting("", "x")).toBeNull();
  });
});

describe("saveCoachSetting", () => {
  it("no-op silencioso cuando coachId es vacío", async () => {
    await expect(saveCoachSetting(null as any, "x", {})).resolves.toBe(false);
  });
});

describe("resolveSharedCoachId", () => {
  it("retorna null cuando coachId es vacío", async () => {
    expect(await resolveSharedCoachId(null as any)).toBeNull();
  });
});
