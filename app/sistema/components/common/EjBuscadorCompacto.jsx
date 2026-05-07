import { useEffect, useRef, useState } from "react";
import { EJERCICIOS } from "../../data/ejercicios";
import { CAT_COLOR } from "../../data/constantes";
import { getEjercicioById } from "../../lib/calc";

export function EjBuscadorCompacto({
  value,
  onChange,
  color,
  title,
  navAttrs = {},
  normativos: normativosProp = null,
}) {
  const ejData = value ? getEjercicioById(Number(value), normativosProp) : null;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeSearchIdx, setActiveSearchIdx] = useState(0);
  const inputRef = useRef(null);
  const triggerRef = useRef(null);
  const modalRef = useRef(null);

  const normativos =
    normativosProp ??
    (() => {
      try {
        return (
          JSON.parse(localStorage.getItem("liftplan_normativos") || "null") ||
          EJERCICIOS
        );
      } catch {
        return EJERCICIOS;
      }
    })();

  const results = (() => {
    const q = query.trim().toLowerCase();
    if (!q) return normativos;
    const byId = normativos.filter((e) => String(e.id).startsWith(q));
    const byName = normativos.filter(
      (e) => !String(e.id).startsWith(q) && e.nombre.toLowerCase().includes(q),
    );
    return [...byId, ...byName];
  })();

  const select = (ej) => {
    onChange(ej ? ej.id : null);
    closePicker();
  };

  const closePicker = (restoreFocus = true) => {
    setOpen(false);
    setQuery("");
    setActiveSearchIdx(0);
    if (restoreFocus) {
      setTimeout(() => {
        triggerRef.current?.focus({ preventScroll: true });
      }, 0);
    }
  };

  // Block body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
      setTimeout(() => inputRef.current?.focus(), 80);
    } else {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, [open]);

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

    const onKeyDown = (e) => {
      if (e.key !== "Tab") return;

      const root = modalRef.current;
      if (!root) return;

      const items = getFocusable();
      if (items.length === 0) {
        e.preventDefault();
        root.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const isInside = root.contains(active);

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

  const listRef2 = useRef(null);
  const GRUPOS_EJ2 = [
    "Arranque",
    "Envion",
    "Tirones",
    "Piernas",
    "Complementarios",
  ];
  const jumpToGroup2 = (g) => {
    const el = listRef2.current?.querySelector(`[data-firstgroup="${g}"]`);
    if (el) el.scrollIntoView({ block: "start", behavior: "smooth" });
  };
  const currentActiveSearchIdx =
    results.length === 0 ? -1 : Math.min(activeSearchIdx, results.length - 1);
  const scrollToSearchIdx = (idx) => {
    const el = listRef2.current?.querySelector(`[data-search-index="${idx}"]`);
    if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        {...navAttrs}
        className={`sembrado-kb-nav ${navAttrs.className || ""}`.trim()}
        onClick={() => {
          setOpen(true);
          setActiveSearchIdx(0);
        }}
        title={title}
        style={{
          background: "var(--surface3)",
          borderRadius: 3,
          cursor: "pointer",
          userSelect: "none",
          touchAction: "manipulation",
          width: "100%",
          padding: "2px 4px",
          display: "flex",
          alignItems: "center",
          gap: 4,
          overflow: "hidden",
          border: "none",
          textAlign: "left",
        }}
      >
        <span
          style={{ fontSize: 11, fontWeight: 700, color: color, flexShrink: 0 }}
        >
          {ejData ? ejData.id : "—"}
        </span>
        {ejData && (
          <span
            style={{
              fontSize: 11,
              color: "var(--text)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
            }}
          >
            {ejData.nombre}
          </span>
        )}
      </button>

      {open && (
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
            if (e.target === e.currentTarget) closePicker();
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
                name="field_29"
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveSearchIdx(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    closePicker();
                    return;
                  }
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    if (!results.length) return;
                    const next =
                      currentActiveSearchIdx < 0
                        ? 0
                        : (currentActiveSearchIdx + 1) % results.length;
                    setActiveSearchIdx(next);
                    scrollToSearchIdx(next);
                    return;
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    if (!results.length) return;
                    const next =
                      currentActiveSearchIdx < 0
                        ? results.length - 1
                        : (currentActiveSearchIdx - 1 + results.length) %
                          results.length;
                    setActiveSearchIdx(next);
                    scrollToSearchIdx(next);
                    return;
                  }
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  const typed = query.trim();
                  const exactById = typed
                    ? normativos.find((item) => String(item.id) === typed)
                    : null;
                  const highlighted =
                    currentActiveSearchIdx >= 0
                      ? results[currentActiveSearchIdx]
                      : null;
                  select(exactById || highlighted || results[0]);
                }}
                placeholder="Número o nombre..."
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
                onClick={closePicker}
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
            {/* Salto rápido por grupo */}
            <div
              style={{
                display: "flex",
                gap: 4,
                padding: "6px 16px",
                borderBottom: "1px solid var(--border)",
                flexWrap: "wrap",
              }}
            >
              {GRUPOS_EJ2.map((g) => (
                <button
                  key={g}
                  onClick={() => jumpToGroup2(g)}
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
            <div ref={listRef2} style={{ overflowY: "auto", flex: 1 }}>
              {ejData && (
                <div
                  onClick={() => select(null)}
                  style={{
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    borderBottom: "1px solid var(--border)",
                    cursor: "pointer",
                    color: "var(--red)",
                    fontSize: 13,
                  }}
                >
                  ✕ Quitar ejercicio
                </div>
              )}
              {(() => {
                const seen2 = new Set();
                return results.map((e, idx) => {
                  const col = CAT_COLOR[e.categoria] || "var(--muted)";
                  const sel = e.id === Number(value);
                  const isFirst =
                    !seen2.has(e.categoria) && seen2.add(e.categoria);
                  return (
                    <div
                      key={e.id}
                      onClick={() => select(e)}
                      onMouseEnter={() => setActiveSearchIdx(idx)}
                      data-search-index={idx}
                      {...(isFirst ? { "data-firstgroup": e.categoria } : {})}
                      style={{
                        padding: "10px 16px",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        borderBottom: "1px solid var(--border)",
                        cursor: "pointer",
                        background:
                          idx === currentActiveSearchIdx
                            ? "rgba(80,180,255,.12)"
                            : sel
                              ? `${col}18`
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
                        style={{ flex: 1, fontSize: 13, color: "var(--text)" }}
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
      )}
    </>
  );
}
