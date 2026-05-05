import {
  asPlainObject,
  asArray,
  readLocalJson,
  writeLocalJson,
} from "./storage";


export function collectAtletaNormOverrides(atletaId) {
  return asPlainObject(
    readLocalJson(`liftplan_normativos_atleta_${atletaId}`, {}),
  );
}

export function restoreAtletaNormOverrides(atletaId, overrides) {
  if (!atletaId || overrides == null) return;
  writeLocalJson(
    `liftplan_normativos_atleta_${atletaId}`,
    asPlainObject(overrides),
  );
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("liftplan:normativos-overrides-updated", {
        detail: { atletaId },
      }),
    );
  }
}

export function buildMesoOverridesPayload(meso, liveOverrides = null) {
  const stored = collectMesoOverrides(meso.id);
  return {
    repsEdit: asPlainObject(liveOverrides?.repsEdit ?? stored.repsEdit),
    manualEdit: asArray(liveOverrides?.manualEdit ?? stored.manualEdit),
    cellEdit: asPlainObject(liveOverrides?.cellEdit ?? stored.cellEdit),
    cellManual: asArray(liveOverrides?.cellManual ?? stored.cellManual),
    nameEdit: asPlainObject(liveOverrides?.nameEdit ?? stored.nameEdit),
    noteEdit: asPlainObject(liveOverrides?.noteEdit ?? stored.noteEdit),
    semOvr: asPlainObject(liveOverrides?.semPctOverrides ?? stored.semOvr),
    semMan: asArray(liveOverrides?.semPctManual ?? stored.semMan),
    turnoOvr: asPlainObject(
      liveOverrides?.turnoPctOverrides ?? stored.turnoOvr,
    ),
    turnoMan: asArray(liveOverrides?.turnoPctManual ?? stored.turnoMan),
    _meta: {
      escuela: meso.escuela ?? false,
      escuela_nivel: meso.escuela_nivel ?? "1",
      num_bloques_basica: meso.num_bloques_basica ?? 3,
      distribucion: meso.distribucion ?? null,
      pretemporada: meso.pretemporada ?? false,
    },
  };
}
// ─── DB SYNC HELPERS ─────────────────────────────────────────────────────────
// Recolecta los overrides de celdas de un mesociclo desde localStorage
export function collectMesoOverrides(mesoId) {
  const get = (k) => {
    try {
      return JSON.parse(localStorage.getItem(k) || "null");
    } catch {
      return null;
    }
  };
  return {
    repsEdit: get(`liftplan_pt_${mesoId}_repsEdit`) || {},
    manualEdit: get(`liftplan_pt_${mesoId}_manualEdit`) || [],
    cellEdit: get(`liftplan_pt_${mesoId}_cellEdit`) || {},
    cellManual: get(`liftplan_pt_${mesoId}_cellManual`) || [],
    nameEdit: get(`liftplan_pt_${mesoId}_nameEdit`) || {},
    noteEdit: get(`liftplan_pt_${mesoId}_noteEdit`) || {},
    semOvr: get(`liftplan_pct_${mesoId}_semOvr`) || {},
    semMan: get(`liftplan_pct_${mesoId}_semMan`) || [],
    turnoOvr: get(`liftplan_pct_${mesoId}_turnoOvr`) || {},
    turnoMan: get(`liftplan_pct_${mesoId}_turnoMan`) || [],
  };
}

// Restaura los overrides de un mesociclo en localStorage al cargar desde DB
export function restoreMesoOverrides(mesoId, overrides) {
  if (!overrides) return;
  const set = (k, v) => {
    try {
      if (v != null) localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  };
  set(`liftplan_pt_${mesoId}_repsEdit`, overrides.repsEdit);
  set(`liftplan_pt_${mesoId}_manualEdit`, overrides.manualEdit);
  set(`liftplan_pt_${mesoId}_cellEdit`, overrides.cellEdit);
  set(`liftplan_pt_${mesoId}_cellManual`, overrides.cellManual);
  set(`liftplan_pt_${mesoId}_nameEdit`, overrides.nameEdit);
  set(`liftplan_pt_${mesoId}_noteEdit`, overrides.noteEdit);
  set(`liftplan_pct_${mesoId}_semOvr`, overrides.semOvr);
  set(`liftplan_pct_${mesoId}_semMan`, overrides.semMan);
  set(`liftplan_pct_${mesoId}_turnoOvr`, overrides.turnoOvr);
  set(`liftplan_pct_${mesoId}_turnoMan`, overrides.turnoMan);
}

// Recolecta los overrides de porcentajes de un atleta desde localStorage
export function collectAtletaPctOverrides(atletaId) {
  const get = (k) => {
    try {
      return JSON.parse(localStorage.getItem(k) || "null");
    } catch {
      return null;
    }
  };
  return {
    semOvr: get(`liftplan_pct_${atletaId}_semOvr`) || {},
    semMan: get(`liftplan_pct_${atletaId}_semMan`) || [],
    turnoOvr: get(`liftplan_pct_${atletaId}_turnoOvr`) || {},
    turnoMan: get(`liftplan_pct_${atletaId}_turnoMan`) || [],
  };
}

// Restaura los overrides de porcentajes de un atleta en localStorage
export function restoreAtletaPctOverrides(atletaId, overrides) {
  if (!overrides) return;
  const set = (k, v) => {
    try {
      if (v != null) localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  };
  set(`liftplan_pct_${atletaId}_semOvr`, overrides.semOvr);
  set(`liftplan_pct_${atletaId}_semMan`, overrides.semMan);
  set(`liftplan_pct_${atletaId}_turnoOvr`, overrides.turnoOvr);
  set(`liftplan_pct_${atletaId}_turnoMan`, overrides.turnoMan);
}
