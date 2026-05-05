export const LIFTPLAN_LOCAL_SYNC_EVENT = "liftplan:local-sync";

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
      return false;
    }
    return false;
  }
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
