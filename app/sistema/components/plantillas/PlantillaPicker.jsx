import { useState } from "react";
import { Modal } from "../common/Modal";

export function PlantillaPicker({ plantillas, tipo = "meso", onSelect, onClose }) {
  const [filtro, setFiltro] = useState("");
  const filtradas = plantillas
    .filter((p) => p.tipo === tipo)
    .filter(
      (p) => !filtro || p.nombre.toLowerCase().includes(filtro.toLowerCase()),
    );

  const [selected, setSelected] = useState(null);
  const [opts, setOpts] = useState({
    irm: true,
    volumen: true,
    reps: true,
    celdas: true,
    grupos: true,
    complementarios: true,
  });
  const toggleOpt = (k) => setOpts((o) => ({ ...o, [k]: !o[k] }));

  const hasIrm = selected?.irm_arranque || selected?.irm_envion;
  const hasReps = selected?.semanas?.some((s) =>
    s.turnos.some((t) => t.ejercicios.some((e) => e.reps_asignadas > 0)),
  );
  const hasCeldas =
    selected?.overrides &&
    Object.keys(selected.overrides.cellEdit || {}).length > 0;
  const hasGrupos =
    selected?.overrides &&
    Object.keys(selected.overrides.semPcts || {}).length > 0;
  const hasComps = selected?.semanas?.some((s) =>
    s.turnos.some(
      (t) =>
        (t.complementarios_before?.length || 0) +
          (t.complementarios_after?.length || 0) >
        0,
    ),
  );

  if (selected) {
    return (
      <Modal title="Opciones de importación" onClose={() => setSelected(null)}>
        <div
          style={{
            marginBottom: 14,
            padding: "10px 14px",
            background: "var(--surface2)",
            borderRadius: 8,
            fontSize: 12,
            color: "var(--muted)",
          }}
        >
          Importando:{" "}
          <strong style={{ color: "var(--gold)" }}>{selected.nombre}</strong>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginBottom: 20,
          }}
        >
          {[
            {
              k: "estructura",
              label: "Estructura",
              desc: "Semanas, turnos y ejercicios",
              always: true,
            },
            {
              k: "volumen",
              label: "Volumen total y % semanal",
              desc: `${selected.volumen_total || "?"} reps`,
              show: !!selected.volumen_total,
            },
            {
              k: "irm",
              label: "IRM del atleta",
              desc: `Arr: ${selected.irm_arranque || "—"} / Env: ${selected.irm_envion || "—"}`,
              show: !!hasIrm,
            },
            {
              k: "reps",
              label: "Reps asignadas",
              desc: "Reps concretas de cada ejercicio",
              show: !!hasReps,
            },
            {
              k: "celdas",
              label: "Overrides de celdas",
              desc: "Series/Reps/Kg editados manualmente",
              show: !!hasCeldas,
            },
            {
              k: "grupos",
              label: "Distribución de grupos",
              desc: "% por semana y turno",
              show: !!hasGrupos,
            },
            {
              k: "complementarios",
              label: "Ejercicios complementarios",
              desc: "Ejercicios antes/después de cada turno",
              show: !!hasComps,
            },
          ].map(({ k, label, desc, always, show = true }) =>
            show || always ? (
              <label
                key={k}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  cursor: always ? "default" : "pointer",
                  padding: "8px 12px",
                  background: "var(--surface2)",
                  borderRadius: 8,
                  border: `1px solid ${always || opts[k] ? "var(--gold)" : "var(--border)"}`,
                  opacity: always ? 0.7 : 1,
                }}
              >
                <input
                  name="field_71"
                  type="checkbox"
                  checked={always || opts[k]}
                  disabled={always}
                  onChange={() => !always && toggleOpt(k)}
                  style={{
                    marginTop: 2,
                    accentColor: "var(--gold)",
                    width: 16,
                    height: 16,
                    flexShrink: 0,
                  }}
                />
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--text)",
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--muted)",
                      marginTop: 1,
                    }}
                  >
                    {desc}
                  </div>
                </div>
              </label>
            ) : null,
          )}
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" onClick={() => setSelected(null)}>
            Volver
          </button>
          <button
            className="btn btn-gold"
            onClick={() => {
              onSelect(selected, opts);
              onClose();
            }}
          >
            Importar plantilla
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Importar plantilla" onClose={onClose}>
      <input
        name="field_72"
        style={{
          width: "100%",
          background: "var(--surface2)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "7px 12px",
          color: "var(--text)",
          fontSize: 13,
          outline: "none",
          fontFamily: "'DM Sans'",
          marginBottom: 12,
          boxSizing: "border-box",
        }}
        placeholder="Buscar plantilla..."
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
      />
      {filtradas.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "24px 0",
            color: "var(--muted)",
            fontSize: 12,
          }}
        >
          {plantillas.filter((p) => p.tipo === tipo).length === 0
            ? "No hay plantillas de este tipo guardadas"
            : "Sin resultados"}
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            maxHeight: 320,
            overflowY: "auto",
          }}
        >
          {filtradas.map((plt) => (
            <PlantillaCard
              key={plt.id}
              plt={plt}
              compact
              onUse={() => setSelected(plt)}
            />
          ))}
        </div>
      )}
    </Modal>
  );
}
