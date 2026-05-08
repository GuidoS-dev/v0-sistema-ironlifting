import { useEffect, useRef, useState } from "react";
import { CAT_COLOR } from "../../data/constantes";
import { IRM_VALUES } from "../../data/tablas-default";
import { getEjercicioById } from "../../lib/calc";
import { EjBuscadorCompacto } from "../common/EjBuscadorCompacto";
import { IntensityPickerModal } from "./IntensityPickerModal";

export function EjCelda({
  ej,
  num,
  semIdx,
  turnoIdx,
  ejIdx,
  onChange,
  onRemove,
  canRemove,
  normativos = null,
}) {
  const [showIntModal, setShowIntModal] = useState(false);
  const intensityBtnRef = useRef(null);
  const restoreIntensityFocusRef = useRef(false);
  const ejData = ej.ejercicio_id
    ? getEjercicioById(ej.ejercicio_id, normativos)
    : null;
  const col = ejData ? CAT_COLOR[ejData.categoria] : "var(--border)";

  useEffect(() => {
    if (!showIntModal && restoreIntensityFocusRef.current) {
      restoreIntensityFocusRef.current = false;
      setTimeout(() => {
        intensityBtnRef.current?.focus({ preventScroll: true });
      }, 0);
    }
  }, [showIntModal]);

  // Columnas: # | EJ(fijo) | INT | TBL | KG | ✕
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "14px 1fr 38px 40px 14px",
        gap: 2,
        alignItems: "center",
        background: ejData ? `${col}12` : "transparent",
        border: `1px solid ${ejData ? `${col}40` : "var(--border)"}`,
        borderRadius: 4,
        padding: "2px 3px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <span
        style={{
          fontSize: 9,
          color: "var(--muted)",
          textAlign: "center",
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        {num}
      </span>

      {/* ID del ejercicio — buscador compacto */}
      <EjBuscadorCompacto
        value={ej.ejercicio_id}
        color={col}
        onChange={(id) => onChange({ ...ej, ejercicio_id: id })}
        navAttrs={{
          "data-sembrado-nav": "true",
          "data-role": "ejercicio",
          "data-sem-idx": String(semIdx),
          "data-turno-idx": String(turnoIdx),
          "data-ej-idx": String(ejIdx),
        }}
        title={
          ejData ? `${ejData.id} — ${ejData.nombre}` : "Seleccionar ejercicio"
        }
        normativos={normativos}
      />

      {/* INT */}
      <button
        ref={intensityBtnRef}
        type="button"
        onClick={() => {
          restoreIntensityFocusRef.current = true;
          setShowIntModal(true);
        }}
        data-sembrado-nav="true"
        data-role="intensidad"
        data-sem-idx={String(semIdx)}
        data-turno-idx={String(turnoIdx)}
        data-ej-idx={String(ejIdx)}
        className="sembrado-kb-nav"
        style={{
          background: "var(--surface3)",
          border: "1px solid transparent",
          borderRadius: 3,
          color: "var(--text)",
          fontSize: 11,
          padding: "1px 0",
          cursor: "pointer",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
        }}
      >
        <span>{ej.intensidad}%</span>
        <span style={{ color: "var(--muted)", fontSize: 9 }}>▼</span>
      </button>

      {/* TBL */}
      <button
        type="button"
        onClick={() =>
          onChange({ ...ej, tabla: ej.tabla >= 5 ? 1 : ej.tabla + 1 })
        }
        onKeyDown={(e) => {
          const byCode =
            e.code === "Digit1" || e.code === "Numpad1"
              ? 1
              : e.code === "Digit2" || e.code === "Numpad2"
                ? 2
                : e.code === "Digit3" || e.code === "Numpad3"
                  ? 3
                  : e.code === "Digit4" || e.code === "Numpad4"
                    ? 4
                    : e.code === "Digit5" || e.code === "Numpad5"
                      ? 5
                      : null;
          const byKey =
            e.key === "1"
              ? 1
              : e.key === "2"
                ? 2
                : e.key === "3"
                  ? 3
                  : e.key === "4"
                    ? 4
                    : e.key === "5"
                      ? 5
                      : null;
          const picked = byCode || byKey;
          if (!picked) return;
          e.preventDefault();
          onChange({ ...ej, tabla: picked });
        }}
        data-sembrado-nav="true"
        data-role="tabla"
        data-sem-idx={String(semIdx)}
        data-turno-idx={String(turnoIdx)}
        data-ej-idx={String(ejIdx)}
        className="sembrado-kb-nav"
        style={{
          background: "var(--surface3)",
          border: "1px solid transparent",
          borderRadius: 3,
          color: "var(--muted)",
          fontSize: 11,
          padding: "1px 0",
          cursor: "pointer",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
        }}
        title="Tabla (click para alternar, teclas 1-5 para seleccionar)"
      >
        <span>{`T${Math.min(5, Math.max(1, Number(ej.tabla) || 1))}`}</span>
        <span style={{ color: "var(--muted)", fontSize: 9 }}>▼</span>
      </button>

      {/* Borrar */}
      {canRemove && ej.ejercicio_id ? (
        <button
          onClick={onRemove}
          data-sembrado-nav="true"
          data-role="remove"
          data-sem-idx={String(semIdx)}
          data-turno-idx={String(turnoIdx)}
          data-ej-idx={String(ejIdx)}
          className="sembrado-kb-nav"
          style={{
            background: "none",
            border: "1px solid transparent",
            borderRadius: 3,
            color: "var(--muted)",
            cursor: "pointer",
            fontSize: 9,
            padding: 0,
            lineHeight: 1,
            textAlign: "center",
          }}
          title="Quitar"
        >
          ✕
        </button>
      ) : (
        <span />
      )}

      {showIntModal && (
        <IntensityPickerModal
          value={Number(ej.intensidad) || IRM_VALUES[0]}
          tabla={ej.tabla}
          onSelect={(next) => onChange({ ...ej, intensidad: Number(next) })}
          onClose={() => {
            restoreIntensityFocusRef.current = true;
            setShowIntModal(false);
          }}
        />
      )}
    </div>
  );
}
