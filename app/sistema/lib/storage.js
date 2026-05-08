export const LIFTPLAN_LOCAL_SYNC_EVENT = "liftplan:local-sync";
export const LIFTPLAN_QUOTA_EXCEEDED_EVENT = "liftplan:storage-quota-exceeded";

// Keys donde persistimos los IDs pendientes de borrado en DB. Si el coach
// borra y cierra la pestaña antes de confirmarse el DELETE, sin esta
// persistencia el siguiente pull restauraría el item desde DB ("zombie").
export const PENDING_DELETE_KEYS = {
  atletas: "liftplan_pending_del_atletas",
  mesociclos: "liftplan_pending_del_mesociclos",
  plantillas: "liftplan_pending_del_plantillas",
};

// ── Safe localStorage helper (handles QuotaExceededError) ────────────────────
export function _freeLocalStorageSpace() {
  // Remove expendable keys to reclaim space:
  // 1. Plantilla undo/redo history stacks (largest savings)
  // 2. Plantilla draft snapshots (redundant when synced to Supabase)
  const toRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (
      k &&
      (k.startsWith("liftplan_hist_plt_") ||
        k.startsWith("liftplan_hist_meso_") ||
        k.startsWith("liftplan_plt_draft_"))
    )
      toRemove.push(k);
  }
  toRemove.forEach((k) => {
    try {
      localStorage.removeItem(k);
    } catch {}
  });
  return toRemove.length;
}

export function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    if (e?.name === "QuotaExceededError" || e?.code === 22) {
      // Try to free space and retry once
      const freed = _freeLocalStorageSpace();
      if (freed > 0) {
        try {
          localStorage.setItem(key, value);
          return true;
        } catch {}
      }
      console.warn("localStorage quota exceeded, data saved to server only");
      try {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent(LIFTPLAN_QUOTA_EXCEEDED_EVENT, { detail: { key } }),
          );
        }
      } catch {}
      return false;
    }
    return false;
  }
}

// Carga un Set de IDs persistido en localStorage (para pendingDelete*).
export function loadPendingDeleteSet(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

// Persiste el Set tal cual está (sin emit — uso interno de housekeeping).
export function savePendingDeleteSet(key, set) {
  try {
    if (!set || set.size === 0) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch {}
}

export function emitLocalSyncEvent(key) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(LIFTPLAN_LOCAL_SYNC_EVENT, {
      detail: { key },
    }),
  );
}

export function readLocalJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeLocalJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    emitLocalSyncEvent(key);
  } catch {}
}

export function asPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

export function asArray(value) {
  if (value instanceof Set) return [...value];
  return Array.isArray(value) ? value : [];
}
