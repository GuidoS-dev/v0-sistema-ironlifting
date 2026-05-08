import { useState } from "react";
import { Clipboard, Copy } from "lucide-react";
import { EJERCICIOS } from "../../data/ejercicios";
import { CAT_COLOR, DIAS, MOMENTOS, mkId } from "../../data/constantes";
import { getSembradoStats } from "../../lib/calc";
import { ComplementarioRow } from "./ComplementarioRow";
import { EjercicioRow } from "./EjercicioRow";

export function TurnoCard({
  turno,
  semana_idx,
  irm_arr,
  irm_env,
  onChange,
  clipboardTurno,
  setClipboardTurno,
  onPaste,
  normativos = null,
}) {
  const [open, setOpen] = useState(semana_idx === 0 && turno.numero <= 2);
  const stats = getSembradoStats([turno], normativos);
  const totalReps = turno.ejercicios.reduce(
    (s, e) => s + Number(e.reps_asignadas),
    0,
  );

  // ── Reordenar ejercicios con flechas ──
  const normalizeEjs = (arr) => {
    const filled = arr.filter((e) => e?.ejercicio_id);
    const empty = arr.filter((e) => !e?.ejercicio_id);
    return [...filled, ...empty];
  };

  const moveEjTurno = (i, dir) => {
    const ejs = turno.ejercicios;
    if (!ejs[i]?.ejercicio_id) return;
    const j = i + dir;
    if (j < 0 || j >= ejs.length) return;
    if (!ejs[j]?.ejercicio_id) return;
    const arr = [...ejs];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    onChange({ ...turno, ejercicios: arr });
  };

  const updateEjTurno = (ejIdx, newEj) => {
    const ejs = [...turno.ejercicios];
    ejs[ejIdx] = newEj;
    onChange({ ...turno, ejercicios: normalizeEjs(ejs) });
  };

  const updateEj = (ejIdx, newEj) => {
    const ejs = [...turno.ejercicios];
    ejs[ejIdx] = newEj;
    onChange({ ...turno, ejercicios: ejs });
  };

  // ── Complementarios antes/después ──
  const normalizeComplementarios = (arr) => {
    const filled = arr.filter((c) => c?.ejercicio_id);
    const empty = arr.filter((c) => !c?.ejercicio_id);
    return [...filled, ...empty];
  };

  const addComplementario = (position) => {
    const newComp = {
      id: mkId(),
      ejercicio_id: null,
      intensidad: 75,
      tabla: 1,
      reps_asignadas: 0,
      aclaracion: "",
    };
    const arr =
      position === "before"
        ? [...turno.complementarios_before, newComp]
        : [...turno.complementarios_after, newComp];
    const key =
      position === "before"
        ? "complementarios_before"
        : "complementarios_after";
    onChange({ ...turno, [key]: arr });
  };

  const updateComplementario = (position, idx, newComp) => {
    const arr =
      position === "before"
        ? [...turno.complementarios_before]
        : [...turno.complementarios_after];
    arr[idx] = newComp;
    const key =
      position === "before"
        ? "complementarios_before"
        : "complementarios_after";
    onChange({ ...turno, [key]: normalizeComplementarios(arr) });
  };

  const deleteComplementario = (position, idx) => {
    const arr =
      position === "before"
        ? [...turno.complementarios_before]
        : [...turno.complementarios_after];
    arr.splice(idx, 1);
    const key =
      position === "before"
        ? "complementarios_before"
        : "complementarios_after";
    onChange({ ...turno, [key]: arr });
  };

  const moveComplementario = (position, idx, dir) => {
    const arr =
      position === "before"
        ? [...turno.complementarios_before]
        : [...turno.complementarios_after];
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    const key =
      position === "before"
        ? "complementarios_before"
        : "complementarios_after";
    onChange({ ...turno, [key]: arr });
  };

  return (
    <div className="turno-card">
      <div className="turno-header" onClick={() => setOpen((o) => !o)}>
        <div className="turno-num">T{turno.numero}</div>
        <div className="turno-dia">
          <select
            name="field_4"
            value={turno.dia}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation();
              onChange({ ...turno, dia: e.target.value });
            }}
          >
            <option value="">Día</option>
            {DIAS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <select
            name="field_5"
            value={turno.momento}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation();
              onChange({ ...turno, momento: e.target.value });
            }}
          >
            <option value="">Momento</option>
            {MOMENTOS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          {turno.dia && (
            <span className="badge badge-blue">
              {turno.dia} {turno.momento}
            </span>
          )}
        </div>
        <div className="turno-stats">
          {Object.entries(stats.pcts)
            .filter(([, v]) => v > 0)
            .map(([k, v]) => (
              <div key={k} className="turno-stat">
                <div className="turno-stat-val" style={{ color: CAT_COLOR[k] }}>
                  {v}%
                </div>
                <div className="turno-stat-lbl">{k.slice(0, 3)}</div>
              </div>
            ))}
          {totalReps > 0 && (
            <div className="turno-stat">
              <div className="turno-stat-val text-gold">{totalReps}</div>
              <div className="turno-stat-lbl">reps</div>
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {setClipboardTurno && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setClipboardTurno(turno);
              }}
              title="Copiar turno"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--muted)",
                padding: "3px 5px",
                borderRadius: 5,
                lineHeight: 1,
                fontSize: 11,
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--gold)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--muted)")
              }
            >
              <Copy size={12} />
            </button>
          )}
          {onPaste && clipboardTurno && clipboardTurno.id !== turno.id && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPaste(clipboardTurno);
              }}
              title={`Pegar ejercicios de T${clipboardTurno.numero || "?"}`}
              style={{
                background: "rgba(232,197,71,.15)",
                border: "1px solid rgba(232,197,71,.3)",
                cursor: "pointer",
                color: "var(--gold)",
                padding: "3px 6px",
                borderRadius: 5,
                lineHeight: 1,
                fontSize: 10,
                fontWeight: 600,
                fontFamily: "'DM Sans'",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(232,197,71,.3)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "rgba(232,197,71,.15)")
              }
            >
              <Clipboard size={12} />
            </button>
          )}
          <div className={`turno-chevron${open ? " open" : ""}`}>▾</div>
        </div>
      </div>
      {open && (
        <div className="turno-body">
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "28px 1fr 80px 70px 70px 80px 150px 20px auto",
              gap: 8,
              padding: "4px 0 8px",
              borderBottom: "1px solid var(--border)",
              marginBottom: 4,
            }}
          >
            <div />
            <div className="text-sm text-muted">Ejercicio</div>
            <div className="text-sm text-muted text-center">Int %</div>
            <div className="text-sm text-muted text-center">Tabla</div>
            <div className="text-sm text-muted text-center">Reps</div>
            <div className="text-sm text-muted text-center">Kg</div>
            <div className="text-sm text-muted text-center">Aclaración</div>
            <div />
            <div />
          </div>

          {/* COMPLEMENTARIOS ANTES */}
          {(turno.complementarios_before?.length > 0 || true) && (
            <div style={{ marginBottom: 12 }}>
              <div
                className="text-sm text-muted"
                style={{
                  fontWeight: 600,
                  marginBottom: 6,
                  color: "var(--blue)",
                }}
              >
                ANTES DEL TURNO
              </div>
              {turno.complementarios_before?.filter(Boolean).map((comp, i) => {
                const canUp = i > 0;
                const canDown =
                  i < turno.complementarios_before.filter(Boolean).length - 1;
                return (
                  <div
                    key={comp.id}
                    style={{ display: "flex", alignItems: "center", gap: 4 }}
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
                        onClick={() => moveComplementario("before", i, -1)}
                        disabled={!canUp}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: canUp ? "pointer" : "default",
                          color: canUp ? "var(--blue)" : "var(--surface3)",
                          fontSize: 10,
                          lineHeight: 1,
                          padding: "1px 3px",
                        }}
                        title="Mover arriba"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => moveComplementario("before", i, 1)}
                        disabled={!canDown}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: canDown ? "pointer" : "default",
                          color: canDown ? "var(--blue)" : "var(--surface3)",
                          fontSize: 10,
                          lineHeight: 1,
                          padding: "1px 3px",
                        }}
                        title="Mover abajo"
                      >
                        ▼
                      </button>
                    </div>
                    <ComplementarioRow
                      comp={comp}
                      idx={i}
                      irm_arr={irm_arr}
                      irm_env={irm_env}
                      onChange={(newComp) =>
                        updateComplementario("before", i, newComp)
                      }
                      onDelete={() => deleteComplementario("before", i)}
                      normativos={normativos}
                    />
                  </div>
                );
              })}
              <button
                onClick={() => addComplementario("before")}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--blue)",
                  fontSize: 12,
                  padding: "4px 0",
                  marginTop: 4,
                  fontWeight: 500,
                }}
              >
                + Agregar complementario
              </button>
            </div>
          )}

          {/* EJERCICIOS PRINCIPALES */}
          <div style={{ marginBottom: 12 }}>
            <div
              className="text-sm text-muted"
              style={{ fontWeight: 600, marginBottom: 6, color: "var(--gold)" }}
            >
              TRABAJO PRINCIPAL
            </div>
            {turno.ejercicios.filter(Boolean).map((ej, i) => {
              const canUp =
                i > 0 &&
                !!ej.ejercicio_id &&
                !!turno.ejercicios[i - 1]?.ejercicio_id;
              const canDown =
                i < turno.ejercicios.length - 1 &&
                !!ej.ejercicio_id &&
                !!turno.ejercicios[i + 1]?.ejercicio_id;
              return (
                <div
                  key={ej.id}
                  style={{ display: "flex", alignItems: "center", gap: 4 }}
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
                      onClick={() => moveEjTurno(i, -1)}
                      disabled={!canUp}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: canUp ? "pointer" : "default",
                        color: canUp ? "var(--gold)" : "var(--surface3)",
                        fontSize: 10,
                        lineHeight: 1,
                        padding: "1px 3px",
                      }}
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => moveEjTurno(i, 1)}
                      disabled={!canDown}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: canDown ? "pointer" : "default",
                        color: canDown ? "var(--gold)" : "var(--surface3)",
                        fontSize: 10,
                        lineHeight: 1,
                        padding: "1px 3px",
                      }}
                    >
                      ▼
                    </button>
                  </div>
                  <EjercicioRow
                    ej={ej}
                    idx={i}
                    irm_arr={irm_arr}
                    irm_env={irm_env}
                    onChange={(newEj) => updateEjTurno(i, newEj)}
                    normativos={normativos}
                  />
                </div>
              );
            })}
          </div>

          {/* COMPLEMENTARIOS DESPUÉS */}
          {(turno.complementarios_after?.length > 0 || true) && (
            <div>
              <div
                className="text-sm text-muted"
                style={{
                  fontWeight: 600,
                  marginBottom: 6,
                  color: "var(--green)",
                }}
              >
                DESPUÉS DEL TURNO
              </div>
              {turno.complementarios_after?.filter(Boolean).map((comp, i) => {
                const canUp = i > 0;
                const canDown =
                  i < turno.complementarios_after.filter(Boolean).length - 1;
                return (
                  <div
                    key={comp.id}
                    style={{ display: "flex", alignItems: "center", gap: 4 }}
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
                        onClick={() => moveComplementario("after", i, -1)}
                        disabled={!canUp}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: canUp ? "pointer" : "default",
                          color: canUp ? "var(--green)" : "var(--surface3)",
                          fontSize: 10,
                          lineHeight: 1,
                          padding: "1px 3px",
                        }}
                        title="Mover arriba"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => moveComplementario("after", i, 1)}
                        disabled={!canDown}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: canDown ? "pointer" : "default",
                          color: canDown ? "var(--green)" : "var(--surface3)",
                          fontSize: 10,
                          lineHeight: 1,
                          padding: "1px 3px",
                        }}
                        title="Mover abajo"
                      >
                        ▼
                      </button>
                    </div>
                    <ComplementarioRow
                      comp={comp}
                      idx={i}
                      irm_arr={irm_arr}
                      irm_env={irm_env}
                      onChange={(newComp) =>
                        updateComplementario("after", i, newComp)
                      }
                      onDelete={() => deleteComplementario("after", i)}
                      normativos={normativos}
                    />
                  </div>
                );
              })}
              <button
                onClick={() => addComplementario("after")}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--green)",
                  fontSize: 12,
                  padding: "4px 0",
                  marginTop: 4,
                  fontWeight: 500,
                }}
              >
                + Agregar complementario
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
