import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "../common/Modal";
import { INTENSIDADES, IRM_VALUES, TABLA_DEFAULT, PREVIEW_REPS } from "../../data/tablas-default";

export function IntensityPickerModal({ value, onSelect, onClose, tabla = 1 }) {
  const listRef = useRef(null);
  const typedBufferResetRef = useRef(null);
  const [typedBuffer, setTypedBuffer] = useState("");
  const [activeValue, setActiveValue] = useState(value);

  // Load the coach's custom tables (or defaults)
  const tablas = useMemo(
    () => JSON.parse(localStorage.getItem("liftplan_tablas") || "null") || TABLA_DEFAULT,
    [],
  );
  const tablaKey = `tabla${Math.min(5, Math.max(1, Number(tabla) || 1))}`;
  const tablaData = tablas[tablaKey] || [];

  // Pre-compute the reps preview grid for every IRM row
  const previewGrid = useMemo(() => {
    const grid = {};
    for (const irm of IRM_VALUES) {
      const row = tablaData.find((r) => r.irm === irm);
      const cells = INTENSIDADES.map((col) => {
        const pct = row ? row[String(col)] || 0 : 0;
        return Math.round((pct * PREVIEW_REPS) / 100);
      });
      const total = cells.reduce((s, v) => s + v, 0);
      grid[irm] = { cells, total };
    }
    return grid;
  }, [tablaData]);

  const scrollToIntensity = useCallback((target) => {
    const el = listRef.current?.querySelector(`[data-intensity="${target}"]`);
    if (el) el.scrollIntoView({ block: "center" });
  }, []);

  useEffect(() => {
    setActiveValue(value);
    setTypedBuffer("");
    listRef.current?.focus({ preventScroll: true });
    scrollToIntensity(value);
  }, [value, scrollToIntensity]);

  useEffect(() => {
    return () => {
      if (typedBufferResetRef.current) {
        clearTimeout(typedBufferResetRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const onWheel = (ev) => {
      const list = listRef.current;
      if (!list) return;

      const maxScroll = list.scrollHeight - list.clientHeight;
      if (maxScroll <= 0) return;

      const delta = ev.deltaY;
      if (!delta) return;

      const next = Math.max(0, Math.min(maxScroll, list.scrollTop + delta));
      if (next !== list.scrollTop) {
        list.scrollTop = next;
      }

      ev.preventDefault();
      ev.stopPropagation();
    };

    window.addEventListener("wheel", onWheel, {
      passive: false,
      capture: true,
    });

    return () => {
      window.removeEventListener("wheel", onWheel, { capture: true });
    };
  }, []);

  const commitSelection = useCallback(() => {
    onSelect(activeValue);
    onClose();
  }, [activeValue, onClose, onSelect]);

  const resetTypedBufferSoon = useCallback(() => {
    if (typedBufferResetRef.current) {
      clearTimeout(typedBufferResetRef.current);
    }
    typedBufferResetRef.current = setTimeout(() => {
      setTypedBuffer("");
    }, 900);
  }, []);

  const handleKeyDown = useCallback(
    (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        commitSelection();
        return;
      }

      if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
        ev.preventDefault();
        const idx = IRM_VALUES.indexOf(activeValue);
        if (idx === -1) return;
        const nextIdx =
          ev.key === "ArrowDown"
            ? Math.min(IRM_VALUES.length - 1, idx + 1)
            : Math.max(0, idx - 1);
        const nextValue = IRM_VALUES[nextIdx];
        setActiveValue(nextValue);
        scrollToIntensity(nextValue);
        return;
      }

      if (ev.key === "Backspace") {
        ev.preventDefault();
        setTypedBuffer((prev) => prev.slice(0, -1));
        resetTypedBufferSoon();
        return;
      }

      if (!/^\d$/.test(ev.key)) return;

      ev.preventDefault();
      setTypedBuffer((prev) => {
        const nextBuffer = `${prev}${ev.key}`.slice(-2);
        const nextValue = Number(nextBuffer);
        if (IRM_VALUES.includes(nextValue)) {
          setActiveValue(nextValue);
          scrollToIntensity(nextValue);
        }
        return nextBuffer;
      });
      resetTypedBufferSoon();
    },
    [activeValue, commitSelection, resetTypedBufferSoon, scrollToIntensity],
  );

  const tblLabel = `T${Math.min(5, Math.max(1, Number(tabla) || 1))}`;

  return (
    <Modal title="Seleccionar intensidad" onClose={onClose} maxWidth="880px">
      <div
        style={{
          fontSize: 12,
          color: "var(--muted)",
          marginBottom: 8,
        }}
      >
        Elegí el porcentaje. Ejemplo con {PREVIEW_REPS} reps usando{" "}
        <span style={{ color: "var(--blue)", fontWeight: 700 }}>{tblLabel}</span>.
        Los ceros se muestran opacos.
      </div>
      <div
        ref={listRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        style={{
          maxHeight: "min(72vh, 760px)",
          overflowY: "auto",
          overflowX: "auto",
          border: "1px solid var(--border)",
          borderRadius: 8,
          background: "var(--surface2)",
          padding: 0,
        }}
      >
        {/* Sticky header row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "56px repeat(8, 1fr) 40px",
            position: "sticky",
            top: 0,
            zIndex: 2,
            background: "var(--surface2)",
            borderBottom: "1px solid var(--border)",
            padding: "6px 4px 4px",
            minWidth: 420,
          }}
        >
          <span style={{ fontSize: 10, color: "var(--muted)", textAlign: "center", fontWeight: 700 }}>IRM</span>
          {INTENSIDADES.map((col) => (
            <span
              key={col}
              style={{
                fontSize: 10,
                color: "var(--muted)",
                textAlign: "center",
                fontWeight: 700,
                fontFamily: "'Bebas Neue'",
                letterSpacing: ".02em",
              }}
            >
              {col}
            </span>
          ))}
          <span style={{ fontSize: 10, color: "var(--muted)", textAlign: "center", fontWeight: 700 }}>Σ</span>
        </div>

        {/* IRM rows */}
        {IRM_VALUES.map((v) => {
          const active = v === activeValue;
          const preview = previewGrid[v];
          return (
            <button
              key={v}
              data-intensity={v}
              type="button"
              onClick={() => {
                onSelect(v);
                onClose();
              }}
              style={{
                width: "100%",
                display: "grid",
                gridTemplateColumns: "56px repeat(8, 1fr) 40px",
                alignItems: "center",
                border: "none",
                borderRadius: 4,
                marginBottom: 1,
                background: active ? "rgba(71,180,232,.18)" : "transparent",
                cursor: "pointer",
                padding: "5px 4px",
                minWidth: 420,
              }}
            >
              {/* IRM label */}
              <span
                style={{
                  fontFamily: "'Bebas Neue'",
                  fontSize: 18,
                  lineHeight: 1,
                  color: active ? "var(--blue)" : "var(--text)",
                  textAlign: "center",
                }}
              >
                {v}%
              </span>
              {/* 8 intensity columns */}
              {preview.cells.map((reps, i) => (
                <span
                  key={i}
                  style={{
                    fontFamily: "'Bebas Neue'",
                    fontSize: 15,
                    lineHeight: 1,
                    textAlign: "center",
                    color: reps === 0
                      ? "var(--muted)"
                      : active
                        ? "var(--blue)"
                        : "var(--text)",
                    opacity: reps === 0 ? 0.3 : 1,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {reps === 0 ? "\u00B7" : reps}
                </span>
              ))}
              {/* Total column */}
              <span
                style={{
                  fontFamily: "'Bebas Neue'",
                  fontSize: 13,
                  lineHeight: 1,
                  textAlign: "center",
                  color: preview.total === PREVIEW_REPS
                    ? "var(--muted)"
                    : "var(--yellow, #e2b340)",
                  opacity: preview.total === PREVIEW_REPS ? 0.5 : 1,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {preview.total}
              </span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
