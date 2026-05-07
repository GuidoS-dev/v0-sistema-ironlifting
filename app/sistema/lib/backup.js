import { sb } from "./supabase-client";

// ── Backup local automático ──────────────────────────────────────────────────
export const BACKUP_INTERVAL_MS = 5 * 60 * 60 * 1000; // 5 horas
export const BACKUP_PROMPTED_KEY = "liftplan_backup_prompted_at";

export function getLastDbSync() {
  try {
    const v = localStorage.getItem("liftplan_last_db_sync");
    return v ? Number(v) : 0;
  } catch {
    return 0;
  }
}

export function collectLocalData() {
  const get = (k, fb) => {
    try {
      const r = localStorage.getItem(k);
      return r ? JSON.parse(r) : fb;
    } catch {
      return fb;
    }
  };
  return {
    atletas: get("liftplan_atletas", []),
    mesociclos: get("liftplan_mesociclos", []),
    plantillas: get("liftplan_plantillas", []),
    normativos: get("liftplan_normativos", null),
    tablas: get("liftplan_tablas", null),
  };
}

export async function collectBackupData() {
  const local = collectLocalData();
  let supabaseData = null;
  try {
    const tables = [
      "atletas",
      "mesociclos",
      "plantillas",
      "coach_settings",
      "profiles",
    ];
    const results = await Promise.allSettled(
      tables.map((t) => sb.from(t).select("*").exec()),
    );
    supabaseData = {};
    tables.forEach((t, i) => {
      const r = results[i];
      supabaseData[t] =
        r.status === "fulfilled" && r.value.data ? r.value.data : null;
    });
  } catch {
    supabaseData = null;
  }
  return {
    _backup_version: 2,
    _created_at: new Date().toISOString(),
    _source: "localStorage+supabase",
    localStorage: local,
    supabase: supabaseData,
  };
}

export async function downloadBackup() {
  const data = await collectBackupData();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ironlifting-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  try {
    localStorage.setItem(BACKUP_PROMPTED_KEY, Date.now().toString());
  } catch {}
}
