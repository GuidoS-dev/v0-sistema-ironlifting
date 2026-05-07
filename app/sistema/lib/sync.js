// ── Global visibility-resume throttle ────────────────────────────────────────
// Prevents 5+ data-sync pulls from all firing on every tab switch.
// Subscribers register callbacks; on resume we fire them staggered, with a
// minimum 30s gap between resume bursts.
export const _visResume = (() => {
  if (typeof document === "undefined") return { sub: () => () => {}, _last: 0 };
  const MIN_GAP_MS = 30_000;
  const STAGGER_MS = 400;
  const cbs = new Set();
  let lastFire = 0;
  let timer = null;

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    const now = Date.now();
    if (now - lastFire < MIN_GAP_MS) return;
    lastFire = now;
    if (timer) clearTimeout(timer);
    // Small debounce so rapid focus/visibility flickers don't trigger
    timer = setTimeout(() => {
      let i = 0;
      cbs.forEach((fn) => {
        setTimeout(fn, i * STAGGER_MS);
        i++;
      });
    }, 300);
  });

  return {
    sub: (fn) => {
      cbs.add(fn);
      return () => cbs.delete(fn);
    },
    _last: () => lastFire,
  };
})();

// BroadcastChannel — notifica a otras pestañas cuando hay un write a DB
export const _bc = (() => {
  if (typeof window === "undefined") return null;
  try {
    return new BroadcastChannel("liftplan:db-sync");
  } catch {
    return null;
  }
})();

export function markDbSync() {
  try {
    localStorage.setItem("liftplan_last_db_sync", Date.now().toString());
  } catch {}
}

export function broadcastDbWrite(type) {
  try {
    _bc?.postMessage({ type });
    markDbSync();
  } catch {}
}
