import { useState } from "react";
import { safeSetItem } from "../lib/storage";

// ── Hook de historial de modificaciones (persiste en localStorage) ───────────
export function useHistory(key, initial, maxLen = 15) {
  // stack: array de snapshots, idx apunta al estado actual
  const storageKey = `liftplan_hist_${key}`;

  const [stack, setStack] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (saved && Array.isArray(saved.stack) && saved.stack.length > 0)
        return saved;
    } catch {}
    return { stack: [initial], idx: 0 };
  });

  const persist = (s) => {
    safeSetItem(storageKey, JSON.stringify(s));
  };

  // Push nuevo estado — descarta el "futuro" si estábamos en medio del historial
  const push = (newState) => {
    setStack((prev) => {
      const base = prev.stack.slice(0, prev.idx + 1);
      const next = [...base, newState].slice(-maxLen);
      const result = { stack: next, idx: next.length - 1 };
      persist(result);
      return result;
    });
  };

  const undo = () => {
    setStack((prev) => {
      if (prev.idx <= 0) return prev;
      const result = { ...prev, idx: prev.idx - 1 };
      persist(result);
      return result;
    });
  };

  const redo = () => {
    setStack((prev) => {
      if (prev.idx >= prev.stack.length - 1) return prev;
      const result = { ...prev, idx: prev.idx + 1 };
      persist(result);
      return result;
    });
  };

  const clearHistory = (newInitial) => {
    const result = { stack: [newInitial], idx: 0 };
    setStack(result);
    persist(result);
  };

  const canUndo = stack.idx > 0;
  const canRedo = stack.idx < stack.stack.length - 1;
  const current = stack.stack[stack.idx];

  return { current, push, undo, redo, canUndo, canRedo, clearHistory };
}
