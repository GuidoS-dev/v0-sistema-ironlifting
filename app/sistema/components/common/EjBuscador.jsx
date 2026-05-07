import { useEffect, useRef, useState } from "react";
import { EJERCICIOS } from "../../data/ejercicios";
import { CAT_COLOR } from "../../data/constantes";
import { getEjercicioById } from "../../lib/calc";

// ── Buscador de ejercicios con input de texto ────────────────────────────────
export function EjBuscador({ value, onChange, normativos: normativosProp = null }) {
  const ejData = value ? getEjercicioById(Number(value), normativosProp) : null;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

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
    setQuery("");
    setOpen(false);
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

  const listRef = useRef(null);

  const GRUPOS_EJ = [
    "Arranque",
    "Envion",
    "Tirones",
    "Piernas",
    "Complementarios",
  ];

  const jumpToGroup = (g) => {
    const el = listRef.current?.querySelector(`[data-firstgroup="${g}"]`);
    if (el) el.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  const displayName = ejData ? `${ejData.id}. ${ejData.nombre}` : "";

  return (
    <>
      <div
        className="ej-select"
        onClick={() => setOpen(true)}
        style={{
          cursor: "pointer",
          userSelect: "none",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          color: ejData ? "var(--text)" : "var(--muted)",
          flex: 1,
          minWidth: 0,
        }}
      >
        {displayName || "— ejercicio —"}
      </div>

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
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
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
            {/* Header */}
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
                ref={inputRef}
                name="ejercicio_query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
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
                onClick={() => setOpen(false)}
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
              {GRUPOS_EJ.map((g) => (
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
            {/* Lista */}
            <div ref={listRef} style={{ overflowY: "auto", flex: 1 }}>
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
                const seen = new Set();
                return results.map((e) => {
                  const col = CAT_COLOR[e.categoria] || "var(--muted)";
                  const sel = e.id === Number(value);
                  const isFirst =
                    !seen.has(e.categoria) && seen.add(e.categoria);
                  return (
                    <div
                      key={e.id}
                      onClick={() => select(e)}
                      {...(isFirst ? { "data-firstgroup": e.categoria } : {})}
                      style={{
                        padding: "10px 16px",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        borderBottom: "1px solid var(--border)",
                        cursor: "pointer",
                        background: sel ? `${col}18` : "transparent",
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
