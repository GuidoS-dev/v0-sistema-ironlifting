import { useState } from "react";
import { Library } from "lucide-react";
import { CATEGORIAS, CAT_COLOR, mkId } from "../../data/constantes";
import { getSembradoStats } from "../../lib/calc";
import { safeSetItem } from "../../lib/storage";
import { TurnoCard } from "../planilla/TurnoCard";

export function SemanaView({ semana, irm_arr, irm_env, meso, onChange }) {
  const [clipboardTurno, setClipboardTurno] = useState(null);
  const repsCalc = calcVolumenSemana(meso.volumen_total, semana.pct_volumen);
  const repsAjust = semana.reps_ajustadas || repsCalc;
  const repsPorGrupo = calcRepsPorGrupo(repsAjust, semana.pct_grupos);
  const sembStats = getSembradoStats(semana.turnos);

  const updateTurno = (tIdx, newT) => {
    const ts = [...semana.turnos];
    ts[tIdx] = newT;
    onChange({ ...semana, turnos: ts });
  };

  const updateGrupo = (g, val) => {
    const otros = Object.keys(semana.pct_grupos).filter((k) => k !== g);
    const restante = 100 - Number(val);
    const totalOtros = otros.reduce((s, k) => s + semana.pct_grupos[k], 0);
    const newGrupos = { ...semana.pct_grupos, [g]: Number(val) };
    if (totalOtros > 0) {
      otros.forEach((k) => {
        newGrupos[k] = Math.round(
          (semana.pct_grupos[k] / totalOtros) * restante,
        );
      });
    }
    onChange({ ...semana, pct_grupos: newGrupos });
  };

  return (
    <div>
      {/* Volumen */}
      <div className="card mb16">
        <div className="card-title">Volumen Semanal</div>
        <div className="vol-grid">
          <div className="vol-item">
            <div className="vol-label">% del Ciclo</div>
            <div className="vol-val">{semana.pct_volumen}%</div>
          </div>
          <div className="vol-item">
            <div className="vol-label">Reps calculadas</div>
            <div className="vol-val">{repsCalc}</div>
          </div>
          <div className="vol-item">
            <div className="vol-label">Reps ajustadas</div>
            <input
              name="field_36"
              className="form-input"
              type="number"
              value={repsAjust}
              onChange={(e) =>
                onChange({ ...semana, reps_ajustadas: Number(e.target.value) })
              }
              style={{
                fontSize: 20,
                fontFamily: "'Bebas Neue'",
                textAlign: "center",
                color: "var(--gold)",
                padding: "4px 8px",
              }}
            />
          </div>
          <div className="vol-item">
            <div className="vol-label">Ejercicios sembrados</div>
            <div className="vol-val">{sembStats.total}</div>
            <div className="vol-sub">
              de {semana.turnos.length * 10} posibles
            </div>
          </div>
        </div>
      </div>

      {/* Grupos */}
      <div className="card mb16">
        <div className="flex-between mb12">
          <div className="card-title" style={{ marginBottom: 0 }}>
            Distribución por Grupo
          </div>
          <span className="text-sm text-muted">Desde sembrado → ajustable</span>
        </div>
        <div className="grupos-grid">
          {CATEGORIAS.slice(0, 4).map((g) => (
            <div
              key={g}
              className="grupo-item"
              style={{ borderLeftColor: CAT_COLOR[g] }}
            >
              <div className="grupo-label" style={{ color: CAT_COLOR[g] }}>
                {g}
              </div>
              <div className="grupo-pct">
                <input
                  name="field_37"
                  type="number"
                  min={0}
                  max={100}
                  value={semana.pct_grupos[g]}
                  onChange={(e) => updateGrupo(g, e.target.value)}
                  style={{
                    background: "var(--surface3)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    color: "var(--text)",
                    fontSize: 14,
                    fontWeight: 600,
                    padding: "4px 8px",
                    width: 60,
                    textAlign: "center",
                    outline: "none",
                  }}
                />
                <span className="text-muted">%</span>
                <span
                  style={{
                    color: CAT_COLOR[g],
                    fontFamily: "'Bebas Neue'",
                    fontSize: 18,
                    marginLeft: 4,
                  }}
                >
                  {sembStats.pcts[g] || 0}%
                </span>
                <span className="text-sm text-muted">sembrado</span>
              </div>
              <div className="grupo-reps">{repsPorGrupo[g]} reps asignadas</div>
              <div className="prog-bar mt8">
                <div
                  className="prog-fill"
                  style={{
                    width: `${semana.pct_grupos[g]}%`,
                    background: CAT_COLOR[g],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="text-sm text-muted">
          Total:{" "}
          <span
            style={{
              color:
                Object.values(semana.pct_grupos).reduce((s, v) => s + v, 0) ===
                100
                  ? "var(--green)"
                  : "var(--red)",
            }}
          >
            {Object.values(semana.pct_grupos).reduce((s, v) => s + v, 0)}%
          </span>
        </div>
      </div>

      {/* Turnos */}
      <div className="card">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <div className="card-title" style={{ margin: 0 }}>
            Sembrado — {semana.turnos.length} Turnos
          </div>
          <button
            className="btn btn-ghost btn-sm"
            style={{ fontSize: 11, color: "var(--muted)" }}
            onClick={() => {
              try {
                const stored = JSON.parse(
                  localStorage.getItem("liftplan_plantillas") || "[]",
                );
                const nuevo = {
                  id: mkId(),
                  tipo: "semana",
                  creado: new Date().toISOString().slice(0, 10),
                  nombre: `Semana ${semana.numero}`,
                  descripcion: `${semana.turnos.filter((t) => t.ejercicios.some((e) => e.ejercicio_id)).length} turnos con ejercicios`,
                  periodo: "general",
                  objetivo: "mixto",
                  nivel: "intermedio",
                  duracion_semanas: 1,
                  semana: {
                    pct_volumen: semana.pct_volumen,
                    turnos: semana.turnos.map((t) => ({
                      dia: t.dia,
                      momento: t.momento,
                      ejercicios: t.ejercicios
                        .filter((e) => e.ejercicio_id)
                        .map((e) => ({
                          ejercicio_id: e.ejercicio_id,
                          intensidad: e.intensidad,
                          tabla: e.tabla,
                        })),
                    })),
                  },
                };
                safeSetItem(
                  "liftplan_plantillas",
                  JSON.stringify([...stored, nuevo]),
                );
                alert(`Semana ${semana.numero} guardada como plantilla ✓`);
              } catch (e) {
                alert("Error al guardar");
              }
            }}
          >
            <Library size={12} /> Guardar semana
          </button>
        </div>
        {semana.turnos.map((t, i) => (
          <TurnoCard
            key={t.id}
            turno={t}
            semana_idx={semana.numero - 1}
            irm_arr={irm_arr}
            irm_env={irm_env}
            onChange={(newT) => updateTurno(i, newT)}
            clipboardTurno={clipboardTurno}
            setClipboardTurno={setClipboardTurno}
            normativos={normativosProp}
            onPaste={(copied) => {
              const newT = {
                ...t,
                ejercicios: copied.ejercicios.map((e) => ({
                  ...e,
                  id: mkId(),
                  reps_asignadas: 0,
                })),
              };
              updateTurno(i, newT);
            }}
          />
        ))}
      </div>
    </div>
  );
}
