import { useEffect, useRef } from "react";

export function ExercisePickerOverlay({
  open,
  normativos,
  query,
  setQuery,
  activeIdx,
  setActiveIdx,
  onClose,
  onSelect,
  inputName = "exercise_query",
}) {
  const listRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const getFocusable = () => {
      const root = modalRef.current;
      if (!root) return [];
      return Array.from(
        root.querySelectorAll(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.getClientRects().length > 0);
    };

    const root = modalRef.current;
    const initial = getFocusable()[0] || root;
    if (initial && typeof initial.focus === "function") {
      initial.focus();
    }

    const onKeyDown = (e) => {
      if (e.key !== "Tab") return;

      const modalRoot = modalRef.current;
      if (!modalRoot) return;

      const items = getFocusable();
      if (items.length === 0) {
        e.preventDefault();
        modalRoot.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const isInside = modalRoot.contains(active);

      if (!isInside) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }

      if (e.shiftKey && active === first) {
        e.preventDefault();
        first.focus();
        return;
      }

      if (!e.shiftKey && active === last) {
        e.preventDefault();
        last.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  if (!open) return null;

  const q = query.trim().toLowerCase();
  const byId = normativos.filter((e) => String(e.id).startsWith(q));
  const byName = normativos.filter(
    (e) => !String(e.id).startsWith(q) && e.nombre.toLowerCase().includes(q),
  );
  const results = q ? [...byId, ...byName] : normativos;
  const currentActiveIdx =
    results.length === 0 ? -1 : Math.min(activeIdx, results.length - 1);

  const resetAndClose = () => {
    onClose();
    setQuery("");
    setActiveIdx(0);
  };

  const applySelection = (ejercicio) => {
    if (!ejercicio) return;
    onSelect(ejercicio);
    resetAndClose();
  };

  const scrollToIndex = (idx) => {
    const el = listRef.current?.querySelector(`[data-picker-index="${idx}"]`);
    if (el) {
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  };

  const GRUPOS = [
    "Arranque",
    "Envion",
    "Tirones",
    "Piernas",
    "Complementarios",
  ];

  const jumpToGroup = (g) => {
    const el = listRef.current?.querySelector(`[data-firstgroup="${g}"]`);
    if (el) {
      el.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(0,0,0,.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) resetAndClose();
      }}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        style={{
          background: "var(--surface)",
          borderRadius: 14,
          width: "100%",
          maxWidth: 520,
          maxHeight: "75vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 8px 40px rgba(0,0,0,.6)",
        }}
      >
        <div
          style={{
            padding: "12px 16px 8px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <input
            name={inputName}
            autoFocus
            data-grid-nav-ignore="true"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIdx(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                resetAndClose();
                return;
              }
              if (e.key === "ArrowDown") {
                e.preventDefault();
                if (!results.length) return;
                const next =
                  currentActiveIdx < 0
                    ? 0
                    : (currentActiveIdx + 1) % results.length;
                setActiveIdx(next);
                scrollToIndex(next);
                return;
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                if (!results.length) return;
                const next =
                  currentActiveIdx < 0
                    ? results.length - 1
                    : (currentActiveIdx - 1 + results.length) % results.length;
                setActiveIdx(next);
                scrollToIndex(next);
                return;
              }
              if (e.key !== "Enter") return;
              e.preventDefault();
              const typed = query.trim();
              const exactById = typed
                ? normativos.find((item) => String(item.id) === typed)
                : null;
              const highlighted =
                currentActiveIdx >= 0 ? results[currentActiveIdx] : null;
              applySelection(exactById || highlighted || results[0]);
            }}
            placeholder="Número o nombre del ejercicio..."
            style={{
              flex: 1,
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--text)",
              fontSize: 14,
              padding: "8px 12px",
              outline: "none",
              fontFamily: "'DM Sans'",
            }}
          />
          <button
            onClick={resetAndClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--muted)",
              cursor: "pointer",
              fontSize: 22,
              lineHeight: 1,
              padding: "0 4px",
            }}
          >
            ×
          </button>
        </div>
        <div
          style={{
            display: "flex",
            gap: 4,
            padding: "6px 16px",
            borderBottom: "1px solid var(--border)",
            flexWrap: "wrap",
          }}
        >
          {GRUPOS.map((g) => (
            <button
              key={g}
              onClick={() => jumpToGroup(g)}
              style={{
                padding: "2px 9px",
                borderRadius: 12,
                border: `1px solid ${CAT_COLOR[g] || "var(--border)"}`,
                background: `${CAT_COLOR[g] || "var(--muted)"}18`,
                color: CAT_COLOR[g] || "var(--muted)",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "'Bebas Neue'",
                letterSpacing: ".04em",
              }}
            >
              {g.slice(0, 3).toUpperCase()}
            </button>
          ))}
        </div>
        <div ref={listRef} style={{ overflowY: "auto", flex: 1 }}>
          {(() => {
            const seen = new Set();
            return results.map((e, idx) => {
              const col = CAT_COLOR[e.categoria] || "var(--muted)";
              const isFirst = !seen.has(e.categoria) && seen.add(e.categoria);
              return (
                <div
                  key={e.id}
                  {...(isFirst ? { "data-firstgroup": e.categoria } : {})}
                  data-picker-index={idx}
                  onClick={() => applySelection(e)}
                  onMouseEnter={() => setActiveIdx(idx)}
                  style={{
                    padding: "10px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    borderBottom: "1px solid var(--border)",
                    cursor: "pointer",
                    background:
                      idx === currentActiveIdx
                        ? "rgba(80,180,255,.12)"
                        : "transparent",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Bebas Neue'",
                      fontSize: 15,
                      color: col,
                      minWidth: 28,
                      textAlign: "right",
                    }}
                  >
                    {e.id}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      fontSize: 13,
                      color: "var(--text)",
                    }}
                  >
                    {e.nombre}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 7px",
                      borderRadius: 10,
                      background: `${col}20`,
                      color: col,
                      flexShrink: 0,
                    }}
                  >
                    {e.categoria.slice(0, 3)}
                  </span>
                </div>
              );
            });
          })()}
        </div>
      </div>
    </div>
  );
}
