import { useEffect, useRef } from "react";
import { EjCelda } from "./EjCelda";

export function CeldaSembrado({
  ejercicios,
  irm_arr,
  irm_env,
  semIdx,
  turnoIdx,
  onChange,
  normativos = null,
}) {
  const cellRef = useRef(null);
  const pendingFocusEjIdxRef = useRef(null);

  const addEj = () => {
    pendingFocusEjIdxRef.current = ejercicios.length;
    onChange([...ejercicios, mkEj()]);
  };
  const removeEj = (i) => onChange(ejercicios.filter((_, idx) => idx !== i));

  useEffect(() => {
    const targetIdx = pendingFocusEjIdxRef.current;
    if (!Number.isInteger(targetIdx) || targetIdx < 0) return;
    const selector =
      `[data-sembrado-nav="true"][data-role="ejercicio"]` +
      `[data-sem-idx="${semIdx}"][data-turno-idx="${turnoIdx}"]` +
      `[data-ej-idx="${targetIdx}"]`;

    const nextField = cellRef.current?.querySelector(selector);
    if (!(nextField instanceof HTMLElement)) return;

    pendingFocusEjIdxRef.current = null;
    requestAnimationFrame(() => {
      focusPlanillaField(nextField);
    });
  }, [ejercicios.length, semIdx, turnoIdx]);

  // After any update, keep filled exercises before empty ones
  const normalize = (arr) => {
    const filled = arr.filter((e) => e?.ejercicio_id);
    const empty = arr.filter((e) => !e?.ejercicio_id);
    return [...filled, ...empty];
  };

  const updateEj = (i, newEj) => {
    const arr = [...ejercicios];
    arr[i] = newEj;
    onChange(normalize(arr));
  };

  const moveEj = (i, dir) => {
    if (!ejercicios[i]?.ejercicio_id) return; // can't move empty
    const j = i + dir;
    if (j < 0 || j >= ejercicios.length) return;
    if (!ejercicios[j]?.ejercicio_id) return; // can't swap with empty
    const arr = [...ejercicios];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    onChange(arr);
  };

  return (
    <div
      ref={cellRef}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        width: "100%",
      }}
    >
      {ejercicios.filter(Boolean).map((ej, i) => (
        <div
          key={ej.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            width: "100%",
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 1,
              flexShrink: 0,
            }}
          >
            <button
              onClick={() => moveEj(i, -1)}
              tabIndex={-1}
              disabled={
                i === 0 || !ej.ejercicio_id || !ejercicios[i - 1]?.ejercicio_id
              }
              style={{
                background: "none",
                border: "none",
                cursor:
                  i === 0 ||
                  !ej.ejercicio_id ||
                  !ejercicios[i - 1]?.ejercicio_id
                    ? "default"
                    : "pointer",
                color:
                  i === 0 ||
                  !ej.ejercicio_id ||
                  !ejercicios[i - 1]?.ejercicio_id
                    ? "var(--surface3)"
                    : "var(--gold)",
                fontSize: 8,
                lineHeight: 1,
                padding: "1px 2px",
              }}
            >
              ▲
            </button>
            <button
              onClick={() => moveEj(i, 1)}
              tabIndex={-1}
              disabled={
                i >= ejercicios.length - 1 ||
                !ej.ejercicio_id ||
                !ejercicios[i + 1]?.ejercicio_id
              }
              style={{
                background: "none",
                border: "none",
                cursor:
                  i >= ejercicios.length - 1 ||
                  !ej.ejercicio_id ||
                  !ejercicios[i + 1]?.ejercicio_id
                    ? "default"
                    : "pointer",
                color:
                  i >= ejercicios.length - 1 ||
                  !ej.ejercicio_id ||
                  !ejercicios[i + 1]?.ejercicio_id
                    ? "var(--surface3)"
                    : "var(--gold)",
                fontSize: 8,
                lineHeight: 1,
                padding: "1px 2px",
              }}
            >
              ▼
            </button>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <EjCelda
              ej={ej}
              num={i + 1}
              semIdx={semIdx}
              turnoIdx={turnoIdx}
              ejIdx={i}
              onChange={(newEj) => updateEj(i, newEj)}
              onRemove={() => removeEj(i)}
              canRemove={ejercicios.length > 1}
              normativos={normativos}
            />
          </div>
        </div>
      ))}
      <button
        onClick={addEj}
        data-sembrado-nav="true"
        data-role="add"
        data-sem-idx={String(semIdx)}
        data-turno-idx={String(turnoIdx)}
        data-ej-idx="999"
        className="sembrado-kb-nav"
        style={{
          background: "none",
          border: "1px dashed var(--border)",
          borderRadius: 3,
          color: "var(--muted)",
          fontSize: 9,
          fontWeight: 700,
          padding: "2px 0",
          cursor: "pointer",
          transition: "all .15s",
          letterSpacing: ".06em",
          width: "100%",
        }}
        onMouseEnter={(e) => {
          e.target.style.borderColor = "var(--gold)";
          e.target.style.color = "var(--gold)";
        }}
        onMouseLeave={(e) => {
          e.target.style.borderColor = "var(--border)";
          e.target.style.color = "var(--muted)";
        }}
      >
        + EJ
      </button>
    </div>
  );
}
