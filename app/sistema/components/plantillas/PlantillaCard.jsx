import { useState } from "react";
import { Pencil, Trash2, Files, FileText } from "lucide-react";
import { EJERCICIOS } from "../../data/ejercicios";
import {
  PERIODO_LABEL, OBJETIVO_LABEL, NIVEL_LABEL,
  PERIODO_COLOR, OBJETIVO_COLOR,
  ESCUELA_NIVEL_LABEL, ESCUELA_NIVEL_COLOR,
} from "../../data/plantillas-meta";

export function PlantillaCard({
  plt,
  onUse,
  onOpen,
  onEdit,
  onDelete,
  onDuplicate,
  compact = false,
}) {
  const [hov, setHov] = useState(null);
  const normativos = (() => {
    try {
      return (
        JSON.parse(localStorage.getItem("liftplan_normativos") || "null") ||
        EJERCICIOS
      );
    } catch {
      return EJERCICIOS;
    }
  })();
  const iconBtn = (name, color = "var(--gold)") => ({
    background: "none",
    border: "none",
    cursor: "pointer",
    color: hov === name ? color : "var(--muted)",
    padding: "2px 5px",
    borderRadius: 5,
    fontSize: 12,
    lineHeight: 1,
    transition: "color .2s",
    pointerEvents: "auto",
  });

  const ejCount =
    plt.tipo === "meso"
      ? (plt.semanas || []).reduce(
          (a, s) =>
            a +
            s.turnos.reduce(
              (b, t) => b + t.ejercicios.filter((e) => e.ejercicio_id).length,
              0,
            ),
          0,
        )
      : plt.tipo === "semana"
        ? (plt.semana?.turnos || []).reduce(
            (a, t) => a + t.ejercicios.filter((e) => e.ejercicio_id).length,
            0,
          )
        : null;

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: compact ? "12px 14px" : "16px",
        borderLeft: `3px solid ${PERIODO_COLOR[plt.periodo] || "var(--border)"}`,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        transition: "border-color .2s",
        cursor: "default",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "'Bebas Neue'",
              fontSize: compact ? 15 : 18,
              color: "var(--text)",
              letterSpacing: ".03em",
              lineHeight: 1.1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {plt.nombre}
          </div>
          {plt.descripcion && !compact && (
            <div
              style={{
                fontSize: 11,
                color: "var(--muted)",
                marginTop: 3,
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {plt.descripcion}
            </div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            gap: 4,
            flexShrink: 0,
            position: "relative",
            zIndex: 10,
            pointerEvents: "auto",
          }}
        >
          {onOpen && (
            <button
              onClick={onOpen}
              title="Abrir"
              style={iconBtn("open")}
              onMouseEnter={() => setHov("open")}
              onMouseLeave={() => setHov(null)}
            >
              <FileText size={13} style={{ pointerEvents: "none" }} />
            </button>
          )}
          {onDuplicate && (
            <button
              onClick={onDuplicate}
              title="Duplicar como nueva plantilla"
              style={iconBtn("dup")}
              onMouseEnter={() => setHov("dup")}
              onMouseLeave={() => setHov(null)}
            >
              <Files size={13} style={{ pointerEvents: "none" }} />
            </button>
          )}
          {onEdit && (
            <button
              onClick={onEdit}
              title="Editar metadatos"
              style={iconBtn("edit")}
              onMouseEnter={() => setHov("edit")}
              onMouseLeave={() => setHov(null)}
            >
              <Pencil size={13} style={{ pointerEvents: "none" }} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              title="Eliminar"
              style={iconBtn("del", "var(--red)")}
              onMouseEnter={() => setHov("del")}
              onMouseLeave={() => setHov(null)}
            >
              <Trash2 size={13} style={{ pointerEvents: "none" }} />
            </button>
          )}
        </div>
      </div>

      {/* Tags */}
      <div
        style={{
          display: "flex",
          gap: 5,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            padding: "2px 7px",
            borderRadius: 20,
            background: `${PERIODO_COLOR[plt.periodo]}20`,
            color: PERIODO_COLOR[plt.periodo],
            textTransform: "uppercase",
            letterSpacing: ".05em",
          }}
        >
          {PERIODO_LABEL[plt.periodo]}
        </span>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            padding: "2px 7px",
            borderRadius: 20,
            background: `${OBJETIVO_COLOR[plt.objetivo]}20`,
            color: OBJETIVO_COLOR[plt.objetivo],
            textTransform: "uppercase",
            letterSpacing: ".05em",
          }}
        >
          {OBJETIVO_LABEL[plt.objetivo]}
        </span>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            padding: "2px 7px",
            borderRadius: 20,
            background: "var(--surface2)",
            color: "var(--muted)",
            textTransform: "uppercase",
            letterSpacing: ".05em",
          }}
        >
          {NIVEL_LABEL[plt.nivel]}
        </span>
        {plt.escuela && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              padding: "2px 7px",
              borderRadius: 20,
              background: `${ESCUELA_NIVEL_COLOR[plt.escuela_nivel] || "#4db6ac"}25`,
              color: ESCUELA_NIVEL_COLOR[plt.escuela_nivel] || "#4db6ac",
              textTransform: "uppercase",
              letterSpacing: ".05em",
            }}
          >
            EI · {ESCUELA_NIVEL_LABEL[plt.escuela_nivel] || "Escuela"}
          </span>
        )}
        {plt.duracion_semanas && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              padding: "2px 7px",
              borderRadius: 20,
              background: "var(--surface2)",
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: ".05em",
            }}
          >
            {plt.duracion_semanas}sem
          </span>
        )}
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            padding: "2px 7px",
            borderRadius: 20,
            background: "var(--surface2)",
            color: "var(--muted)",
            textTransform: "uppercase",
            letterSpacing: ".05em",
          }}
        >
          {plt.tipo === "meso"
            ? "Mesociclo"
            : plt.tipo === "semana"
              ? "Semana"
              : "Distribución"}
        </span>
      </div>

      {/* Stats */}
      {!compact && ejCount !== null && (
        <div
          style={{
            display: "flex",
            gap: 12,
            fontSize: 11,
            color: "var(--muted)",
          }}
        >
          {plt.tipo === "meso" && plt.semanas && (
            <span>
              <span
                style={{
                  color: "var(--gold)",
                  fontFamily: "'Bebas Neue'",
                  fontSize: 14,
                }}
              >
                {plt.semanas.length}
              </span>{" "}
              semanas
            </span>
          )}
          <span>
            <span
              style={{
                color: "var(--gold)",
                fontFamily: "'Bebas Neue'",
                fontSize: 14,
              }}
            >
              {ejCount}
            </span>{" "}
            ejercicios
          </span>
          {plt.creado && (
            <span style={{ marginLeft: "auto" }}>Creada {plt.creado}</span>
          )}
        </div>
      )}

      {/* Botón usar */}
      {onUse && (
        <button
          onClick={onUse}
          className="btn btn-gold btn-sm"
          style={{ width: "100%", justifyContent: "center", marginTop: 4 }}
        >
          Usar esta plantilla
        </button>
      )}
    </div>
  );
}
