import { useState, useRef, useCallback } from "react";
import { Copy } from "lucide-react";
import { EJERCICIOS } from "../../data/ejercicios";
import { CAT_COLOR, EMPTY_NAME_SENTINEL, mkId, mkBloqueBasica, mkEjBasica, mkTurnosBasica, resolveExerciseName } from "../../data/constantes";
import { handlePlanillaArrowNavigation } from "../../lib/navegacion";
import { ExercisePickerOverlay } from "../common/ExercisePickerOverlay";

export function PlanillaBasica({
  semanas,
  onChange,
  numBloques = 3,
  onBeforeChange,
  irm_arr = 100,
  irm_env = 200,
  normativos: normativosProp = null,
}) {
  const [semActiva, setSemActiva] = useState(0);
  const [turnoActivo, setTurnoActivo] = useState(0);
  const [ejPickerOpen, setEjPickerOpen] = useState(null); // ejIdx or null
  const [ejPickerQuery, setEjPickerQuery] = useState("");
  const [ejPickerActiveIdx, setEjPickerActiveIdx] = useState(0);
  const spreadsheetNavRef = useRef(null);

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

  const sem = semanas[semActiva];
  const turno = sem?.turnos[turnoActivo];
  const ejs = turno?.ejercicios || [];

  const _bc = () => {
    try {
      if (onBeforeChange) onBeforeChange();
    } catch {}
  };

  // Calcular kg automático: IRM × pct_base / 100 × pct_bloque / 100
  const calcKgBasica = (ejercicio_id, pct) => {
    if (!ejercicio_id || !pct) return null;
    const ejData = normativos.find((e) => e.id === Number(ejercicio_id));
    if (!ejData || !ejData.pct_base) return null;
    const irm = ejData.base === "arranque" ? Number(irm_arr) : Number(irm_env);
    if (!irm) return null;
    return Math.round(((((irm * ejData.pct_base) / 100) * pct) / 100) * 2) / 2;
  };

  // Deep-clone update — acepta updates extra para el form padre (ej: num_bloques_basica)
  const updateSemanas = (updater, extraFormUpdates) => {
    _bc();
    const next =
      typeof updater === "function"
        ? updater(JSON.parse(JSON.stringify(semanas)))
        : updater;
    onChange(next, extraFormUpdates);
  };

  const updateBloque = (ejIdx, bIdx, field, value) => {
    updateSemanas((ss) => {
      const ej = ss[semActiva].turnos[turnoActivo].ejercicios[ejIdx];
      if (!ej.bloques)
        ej.bloques = Array.from({ length: numBloques }, mkBloqueBasica);
      if (field === "pct") {
        // Al cambiar %, auto-calcular kg
        const newPct = value === "" ? null : Number(value);
        const autoKg = calcKgBasica(ej.ejercicio_id, newPct);
        ej.bloques[bIdx] = { ...ej.bloques[bIdx], pct: newPct, kg: autoKg };
      } else if (field === "nota") {
        ej.bloques[bIdx] = { ...ej.bloques[bIdx], nota: value };
      } else {
        ej.bloques[bIdx] = {
          ...ej.bloques[bIdx],
          [field]: value === "" ? null : Number(value),
        };
      }
      return ss;
    });
  };

  const setEjercicioId = (ejIdx, newId) => {
    updateSemanas((ss) => {
      const ej = ss[semActiva].turnos[turnoActivo].ejercicios[ejIdx];
      ej.ejercicio_id = newId ? Number(newId) : null;
      ej.nombre_custom = "";
      // Recalcular kg de todos los bloques con el nuevo ejercicio
      if (ej.bloques) {
        ej.bloques.forEach((b) => {
          if (b.pct) b.kg = calcKgBasica(ej.ejercicio_id, b.pct);
        });
      }
      return ss;
    });
  };

  const setNombreCustom = (ejIdx, nombre) => {
    updateSemanas((ss) => {
      ss[semActiva].turnos[turnoActivo].ejercicios[ejIdx].nombre_custom =
        nombre;
      return ss;
    });
  };

  const addEjercicio = () => {
    updateSemanas((ss) => {
      ss[semActiva].turnos[turnoActivo].ejercicios.push(mkEjBasica(numBloques));
      return ss;
    });
  };

  const removeEjercicio = (ejIdx) => {
    if (ejs.length <= 1) return;
    updateSemanas((ss) => {
      ss[semActiva].turnos[turnoActivo].ejercicios.splice(ejIdx, 1);
      return ss;
    });
  };

  const addTurno = () => {
    updateSemanas((ss) => {
      const s = ss[semActiva];
      s.turnos.push({
        id: mkId(),
        numero: s.turnos.length + 1,
        dia: "",
        momento: "",
        ejercicios: Array.from({ length: 6 }, () => mkEjBasica(numBloques)),
      });
      return ss;
    });
  };

  const removeTurno = () => {
    if (!sem || sem.turnos.length <= 1) return;
    updateSemanas((ss) => {
      ss[semActiva].turnos.splice(turnoActivo, 1);
      ss[semActiva].turnos.forEach((t, i) => {
        t.numero = i + 1;
      });
      return ss;
    });
    setTurnoActivo((v) =>
      Math.max(0, Math.min(v, (sem?.turnos.length || 2) - 2)),
    );
  };

  const addSemana = () => {
    updateSemanas((ss) => {
      ss.push({
        id: mkId(),
        numero: ss.length + 1,
        turnos: mkTurnosBasica(numBloques),
      });
      return ss;
    });
  };

  const removeSemana = () => {
    if (semanas.length <= 1) return;
    updateSemanas((ss) => {
      ss.splice(semActiva, 1);
      ss.forEach((s, i) => {
        s.numero = i + 1;
      });
      return ss;
    });
    setSemActiva((v) => Math.max(0, Math.min(v, semanas.length - 2)));
    setTurnoActivo(0);
  };

  const addBloqueCol = () => {
    const newNum = numBloques + 1;
    updateSemanas(
      (ss) => {
        ss.forEach((s) =>
          s.turnos.forEach((t) =>
            t.ejercicios.forEach((e) => {
              if (!e.bloques)
                e.bloques = Array.from({ length: numBloques }, mkBloqueBasica);
              e.bloques.push(mkBloqueBasica());
            }),
          ),
        );
        return ss;
      },
      { num_bloques_basica: newNum },
    );
  };

  const removeBloqueCol = (bIdx) => {
    if (numBloques <= 1) return;
    updateSemanas(
      (ss) => {
        ss.forEach((s) =>
          s.turnos.forEach((t) =>
            t.ejercicios.forEach((e) => {
              if (e.bloques && e.bloques.length > bIdx)
                e.bloques.splice(bIdx, 1);
            }),
          ),
        );
        return ss;
      },
      { num_bloques_basica: numBloques - 1 },
    );
  };

  // Move exercise up/down
  const moveEj = (ejIdx, dir) => {
    const tgt = ejIdx + dir;
    if (tgt < 0 || tgt >= ejs.length) return;
    updateSemanas((ss) => {
      const arr = ss[semActiva].turnos[turnoActivo].ejercicios;
      [arr[ejIdx], arr[tgt]] = [arr[tgt], arr[ejIdx]];
      return ss;
    });
  };

  // Copy turno to all weeks
  const copiarTurnoATodasSemanas = () => {
    if (!turno) return;
    updateSemanas((ss) => {
      const turnoBase = JSON.parse(JSON.stringify(turno));
      ss.forEach((s, sIdx) => {
        if (sIdx === semActiva) return;
        // Ensure turno index exists
        while (s.turnos.length <= turnoActivo) {
          s.turnos.push({
            id: mkId(),
            numero: s.turnos.length + 1,
            dia: "",
            momento: "",
            ejercicios: Array.from({ length: 6 }, () => mkEjBasica(numBloques)),
          });
        }
        const copy = JSON.parse(JSON.stringify(turnoBase));
        copy.id = s.turnos[turnoActivo].id; // keep original id
        copy.numero = turnoActivo + 1;
        s.turnos[turnoActivo] = copy;
      });
      return ss;
    });
  };

  // Compact input style
  const cellInput = (extra = {}) => ({
    width: "100%",
    background: "transparent",
    border: "none",
    fontFamily: "'Bebas Neue'",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 1.2,
    outline: "none",
    padding: "3px 2px",
    color: "var(--text)",
    MozAppearance: "textfield",
    appearance: "textfield",
    ...extra,
  });

  const handleSpreadsheetNavKeyDown = useCallback((event) => {
    handlePlanillaArrowNavigation(event, spreadsheetNavRef.current);
  }, []);

  if (!sem) return null;

  return (
    <div ref={spreadsheetNavRef} onKeyDown={handleSpreadsheetNavKeyDown}>
      {/* ── Semana tabs ── */}
      <div
        style={{
          display: "flex",
          gap: 4,
          flexWrap: "wrap",
          marginBottom: 8,
          alignItems: "center",
        }}
      >
        {semanas.map((s, i) => (
          <button
            key={s.id}
            className={`semana-tab${semActiva === i ? " active" : ""}`}
            onClick={() => {
              setSemActiva(i);
              setTurnoActivo(0);
            }}
          >
            Semana {s.numero}
          </button>
        ))}
        <button
          onClick={addSemana}
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            border: "1px dashed var(--border)",
            background: "transparent",
            color: "var(--gold)",
            cursor: "pointer",
            fontSize: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
          }}
        >
          +
        </button>
        {semanas.length > 1 && (
          <button
            onClick={removeSemana}
            title="Eliminar semana actual"
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: "1px dashed var(--border)",
              background: "transparent",
              color: "var(--red)",
              cursor: "pointer",
              fontSize: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
            }}
          >
            −
          </button>
        )}
      </div>

      {/* ── Turno tabs ── */}
      <div
        style={{
          display: "flex",
          gap: 4,
          flexWrap: "wrap",
          marginBottom: 12,
          alignItems: "center",
        }}
      >
        {sem.turnos.map((t, i) => (
          <button
            key={t.id}
            onClick={() => setTurnoActivo(i)}
            style={{
              padding: "4px 12px",
              borderRadius: 6,
              border: "none",
              background: turnoActivo === i ? "var(--gold)" : "var(--surface3)",
              color: turnoActivo === i ? "#000" : "var(--text)",
              fontFamily: "'Bebas Neue'",
              fontSize: 14,
              cursor: "pointer",
              letterSpacing: ".04em",
            }}
          >
            T{i + 1}
            {t.dia ? ` · ${t.dia.slice(0, 3)}` : ""}
          </button>
        ))}
        <button
          onClick={addTurno}
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            border: "1px dashed var(--border)",
            background: "transparent",
            color: "var(--gold)",
            cursor: "pointer",
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
          }}
        >
          +
        </button>
        {sem.turnos.length > 1 && (
          <button
            onClick={removeTurno}
            title="Eliminar turno actual"
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              border: "1px dashed var(--border)",
              background: "transparent",
              color: "var(--red)",
              cursor: "pointer",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
            }}
          >
            −
          </button>
        )}
        <button
          onClick={copiarTurnoATodasSemanas}
          title="Copiar este turno a todas las semanas"
          style={{
            marginLeft: 8,
            padding: "3px 10px",
            borderRadius: 6,
            border: "1px solid var(--border)",
            background: "var(--surface2)",
            color: "var(--muted)",
            cursor: "pointer",
            fontSize: 10,
            fontFamily: "'DM Sans'",
            fontWeight: 600,
          }}
        >
          Copiar a todas las semanas
        </button>
      </div>

      {/* ── Header del turno ── */}
      {turno && (
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 10,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                fontFamily: "'Bebas Neue'",
                fontSize: 20,
                color: "var(--gold)",
              }}
            >
              Semana {sem.numero} — Turno {turnoActivo + 1}
            </div>
            {/* Day/Moment inline selectors */}
            <select
              name="field_18"
              value={turno.dia || ""}
              onChange={(e) => {
                updateSemanas((ss) => {
                  ss[semActiva].turnos[turnoActivo].dia = e.target.value;
                  return ss;
                });
              }}
              style={{
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "3px 6px",
                color: "var(--text)",
                fontSize: 11,
                fontFamily: "'DM Sans'",
              }}
            >
              <option value="">Día</option>
              {[
                "Lunes",
                "Martes",
                "Miércoles",
                "Jueves",
                "Viernes",
                "Sábado",
                "Domingo",
              ].map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select
              name="field_19"
              value={turno.momento || ""}
              onChange={(e) => {
                updateSemanas((ss) => {
                  ss[semActiva].turnos[turnoActivo].momento = e.target.value;
                  return ss;
                });
              }}
              style={{
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "3px 6px",
                color: "var(--text)",
                fontSize: 11,
                fontFamily: "'DM Sans'",
              }}
            >
              <option value="">Momento</option>
              {["Mañana", "Tarde", "Noche"].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* ── Tabla de ejercicios ── */}
          <div style={{ overflowX: "auto" }}>
            <table
              className="planilla-tabla"
              style={{
                borderCollapse: "separate",
                borderSpacing: "2px 2px",
                width: "100%",
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      padding: "5px 6px",
                      background: "var(--surface2)",
                      border: "1px solid var(--border)",
                      borderRadius: 5,
                      textAlign: "center",
                      fontSize: 10,
                      color: "var(--muted)",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      width: 40,
                    }}
                  >
                    REF
                  </th>
                  <th
                    style={{
                      padding: "5px 6px",
                      background: "var(--surface2)",
                      border: "1px solid var(--border)",
                      borderRadius: 5,
                      fontSize: 10,
                      color: "var(--muted)",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      minWidth: 100,
                    }}
                  >
                    EJERCICIO
                  </th>
                  {Array.from({ length: numBloques }).map((_, bIdx) => (
                    <th
                      key={bIdx}
                      style={{
                        padding: "3px 4px",
                        background: "rgba(232,197,71,.08)",
                        border: "1px solid rgba(232,197,71,.3)",
                        borderRadius: 5,
                        textAlign: "center",
                        fontSize: 9,
                        color: "var(--gold)",
                        fontWeight: 700,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 2,
                        }}
                      >
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr 1fr 1fr",
                            gap: 0,
                            flex: 1,
                          }}
                        >
                          {["%", "S", "R", "Kg"].map((l) => (
                            <div
                              key={l}
                              style={{
                                fontSize: 8,
                                color: "var(--muted)",
                                textAlign: "center",
                                fontWeight: 700,
                              }}
                            >
                              {l}
                            </div>
                          ))}
                        </div>
                        {numBloques > 1 && (
                          <button
                            onClick={() => removeBloqueCol(bIdx)}
                            style={{
                              width: 14,
                              height: 14,
                              borderRadius: "50%",
                              border: "none",
                              background: "transparent",
                              color: "var(--muted)",
                              cursor: "pointer",
                              fontSize: 11,
                              lineHeight: 1,
                              padding: 0,
                              flexShrink: 0,
                            }}
                            title="Eliminar esta columna de %"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                  <th
                    style={{
                      padding: "3px 4px",
                      background: "rgba(232,197,71,.08)",
                      border: "1px solid rgba(232,197,71,.3)",
                      borderRadius: 5,
                      textAlign: "center",
                      fontSize: 9,
                      color: "var(--gold)",
                      fontWeight: 700,
                    }}
                  >
                    VOL
                    <br />
                    REPs
                  </th>
                  <th
                    style={{
                      padding: "3px 4px",
                      background: "rgba(71,180,232,.08)",
                      border: "1px solid rgba(71,180,232,.3)",
                      borderRadius: 5,
                      textAlign: "center",
                      fontSize: 9,
                      color: "var(--blue)",
                      fontWeight: 700,
                    }}
                  >
                    VOL
                    <br />
                    Kg
                  </th>
                  <th
                    style={{
                      padding: "3px 4px",
                      background: "rgba(71,232,160,.05)",
                      border: "1px solid rgba(71,232,160,.2)",
                      borderRadius: 5,
                      textAlign: "center",
                      fontSize: 9,
                      color: "var(--green)",
                      fontWeight: 700,
                    }}
                  >
                    Peso
                    <br />
                    Medio
                  </th>
                  <th
                    style={{
                      padding: "3px 4px",
                      background: "rgba(155,135,232,.05)",
                      border: "1px solid rgba(155,135,232,.2)",
                      borderRadius: 5,
                      textAlign: "center",
                      fontSize: 9,
                      color: "#9b87e8",
                      fontWeight: 700,
                    }}
                  >
                    Int
                    <br />
                    Media
                  </th>
                  <th
                    style={{
                      padding: "3px 4px",
                      background: "var(--surface2)",
                      border: "1px dashed var(--border)",
                      borderRadius: 5,
                      width: 30,
                    }}
                  >
                    <button
                      onClick={addBloqueCol}
                      title="Agregar columna de %"
                      style={{
                        width: "100%",
                        background: "transparent",
                        border: "none",
                        color: "var(--gold)",
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 700,
                        padding: 0,
                      }}
                    >
                      + %
                    </button>
                  </th>
                  <th style={{ width: 26 }} />
                </tr>
              </thead>
              <tbody>
                {ejs.map((ej, eIdx) => {
                  const ejData = ej.ejercicio_id
                    ? normativos.find((e) => e.id === Number(ej.ejercicio_id))
                    : null;
                  const col = ejData
                    ? CAT_COLOR[ejData.categoria]
                    : "var(--border)";
                  const bloques =
                    ej.bloques ||
                    Array.from({ length: numBloques }, mkBloqueBasica);
                  const displayName = resolveExerciseName(
                    ej.nombre_custom,
                    ejData?.nombre || "",
                  );

                  return (
                    <tr
                      key={ej.id}
                      style={{
                        background:
                          eIdx % 2 === 0 ? "var(--surface2)" : "transparent",
                      }}
                    >
                      {/* REF — input numérico */}
                      <td
                        style={{
                          padding: "3px 4px",
                          textAlign: "center",
                          border: `1px solid ${col}40`,
                          borderRadius: 5,
                          background: `${col}0a`,
                        }}
                      >
                        <input
                          name="field_20"
                          type="number"
                          min={1}
                          max={200}
                          className="no-spin"
                          value={ej.ejercicio_id || ""}
                          placeholder="—"
                          onChange={(e) => setEjercicioId(eIdx, e.target.value)}
                          style={cellInput({
                            width: 36,
                            fontFamily: "'Bebas Neue'",
                            fontSize: 16,
                            color: col,
                          })}
                        />
                      </td>
                      {/* Ejercicio nombre — click to edit */}
                      <td
                        style={{
                          padding: "3px 6px",
                          border: "1px solid var(--border)",
                          borderRadius: 5,
                          position: "relative",
                          minWidth: 100,
                        }}
                      >
                        <input
                          name="field_21"
                          type="text"
                          value={displayName}
                          placeholder="Nombre del ejercicio"
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "") {
                              setNombreCustom(eIdx, EMPTY_NAME_SENTINEL);
                              return;
                            }
                            if (ejData && val === ejData.nombre) {
                              setNombreCustom(eIdx, "");
                            } else {
                              setNombreCustom(eIdx, val);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (
                              e.key === "Backspace" &&
                              e.currentTarget.value === "" &&
                              ej.nombre_custom === EMPTY_NAME_SENTINEL
                            ) {
                              e.preventDefault();
                              setNombreCustom(eIdx, "");
                            }
                          }}
                          style={{
                            width: "100%",
                            background: "transparent",
                            border: "none",
                            color: "var(--text)",
                            fontSize: 11,
                            outline: "none",
                            padding: "2px 0",
                            fontFamily: "'DM Sans'",
                          }}
                        />
                      </td>
                      {/* Bloques: % | S | R | Kg + nota */}
                      {bloques.slice(0, numBloques).map((b, bIdx) => {
                        const hasNota = b.nota && b.nota.trim() !== "";
                        const hasData = b.pct || b.series || b.reps;
                        return (
                          <td
                            key={bIdx}
                            style={{
                              padding: "2px 3px",
                              textAlign: "center",
                              background: "rgba(232,197,71,.04)",
                              border: `1px solid ${hasNota ? "var(--muted)" : "rgba(232,197,71,.15)"}`,
                              borderRadius: 5,
                              position: "relative",
                            }}
                          >
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr 1fr 1fr",
                                gap: 0,
                              }}
                            >
                              <input
                                name="field_22"
                                type="number"
                                className="no-spin"
                                value={b.pct ?? ""}
                                placeholder="%"
                                onChange={(e) =>
                                  updateBloque(
                                    eIdx,
                                    bIdx,
                                    "pct",
                                    e.target.value,
                                  )
                                }
                                style={cellInput({
                                  fontSize: 13,
                                  color: "var(--gold)",
                                })}
                              />
                              <input
                                name="field_23"
                                type="text"
                                className="no-spin"
                                value={b.series ?? ""}
                                placeholder="—"
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  updateSemanas((ss) => {
                                    const ej2 =
                                      ss[semActiva].turnos[turnoActivo]
                                        .ejercicios[eIdx];
                                    if (!ej2.bloques)
                                      ej2.bloques = Array.from(
                                        { length: numBloques },
                                        mkBloqueBasica,
                                      );
                                    ej2.bloques[bIdx] = {
                                      ...ej2.bloques[bIdx],
                                      series:
                                        raw === ""
                                          ? null
                                          : isNaN(Number(raw))
                                            ? raw
                                            : Number(raw),
                                    };
                                    return ss;
                                  });
                                }}
                                style={cellInput()}
                              />
                              <input
                                name="field_24"
                                type="number"
                                className="no-spin"
                                value={b.reps ?? ""}
                                placeholder="—"
                                onChange={(e) =>
                                  updateBloque(
                                    eIdx,
                                    bIdx,
                                    "reps",
                                    e.target.value,
                                  )
                                }
                                style={cellInput()}
                              />
                              <input
                                name="field_25"
                                type="number"
                                step="0.5"
                                className="no-spin"
                                value={
                                  calcKgBasica(ej.ejercicio_id, b.pct) ??
                                  b.kg ??
                                  ""
                                }
                                readOnly
                                style={cellInput({
                                  color: "var(--muted)",
                                  fontSize: 12,
                                })}
                              />
                            </div>
                            <input
                              name="field_26"
                              type="text"
                              value={b.nota || ""}
                              placeholder="…"
                              onChange={(e) =>
                                updateBloque(eIdx, bIdx, "nota", e.target.value)
                              }
                              title="Aclaración (ej: 2+2+2 para combinados)"
                              style={{
                                display: hasData || hasNota ? "block" : "none",
                                width: "100%",
                                background: "transparent",
                                border: "none",
                                borderTop: hasNota
                                  ? "1px solid var(--border)"
                                  : "none",
                                color: "var(--muted)",
                                fontSize: 9,
                                textAlign: "center",
                                outline: "none",
                                padding: "2px 0 0",
                                fontFamily: "'DM Sans'",
                                marginTop: 2,
                              }}
                            />
                          </td>
                        );
                      })}
                      {/* Stats: VOL REPs, VOL Kg, Peso Medio, Int Media */}
                      {(() => {
                        let volReps = 0,
                          volKg = 0;
                        (bloques || []).slice(0, numBloques).forEach((b) => {
                          if (!b.series && !b.reps) return;
                          const s =
                            typeof b.series === "string" &&
                            b.series.includes("+")
                              ? b.series
                                  .split("+")
                                  .reduce((a, v) => a + Number(v), 0)
                              : Number(b.series) || 0;
                          const r = Number(b.reps) || 0;
                          const kg = Number(
                            calcKgBasica(ej.ejercicio_id, b.pct) ?? b.kg ?? 0,
                          );
                          volReps += s * r;
                          volKg += s * r * kg;
                        });
                        const pesoMedio =
                          volReps > 0
                            ? Math.round((volKg / volReps) * 2) / 2
                            : null;
                        let intMedia = null;
                        if (
                          volReps > 0 &&
                          volKg > 0 &&
                          ejData &&
                          ejData.pct_base
                        ) {
                          const irm =
                            ejData.base === "arranque"
                              ? Number(irm_arr)
                              : Number(irm_env);
                          if (irm) {
                            const kgBase = (irm * ejData.pct_base) / 100;
                            intMedia = Math.round(
                              (volKg / volReps / kgBase) * 100,
                            );
                          }
                        }
                        return (
                          <>
                            <td
                              style={{
                                padding: "5px 6px",
                                textAlign: "center",
                                background: "rgba(232,197,71,.06)",
                                border: "1px solid rgba(232,197,71,.2)",
                                borderRadius: 5,
                              }}
                            >
                              <div
                                style={{
                                  fontFamily: "'Bebas Neue'",
                                  fontSize: 16,
                                  color: "var(--gold)",
                                  lineHeight: 1,
                                }}
                              >
                                {volReps > 0 ? volReps : "—"}
                              </div>
                            </td>
                            <td
                              style={{
                                padding: "5px 6px",
                                textAlign: "center",
                                background: "rgba(71,180,232,.06)",
                                border: "1px solid rgba(71,180,232,.2)",
                                borderRadius: 5,
                              }}
                            >
                              <div
                                style={{
                                  fontFamily: "'Bebas Neue'",
                                  fontSize: 16,
                                  color: "var(--blue)",
                                  lineHeight: 1,
                                }}
                              >
                                {volKg > 0
                                  ? Number.isInteger(volKg)
                                    ? volKg
                                    : volKg.toFixed(1)
                                  : "—"}
                              </div>
                            </td>
                            <td
                              style={{
                                padding: "5px 6px",
                                textAlign: "center",
                                background: "rgba(71,232,160,.05)",
                                border: "1px solid rgba(71,232,160,.2)",
                                borderRadius: 5,
                              }}
                            >
                              <div
                                style={{
                                  fontFamily: "'Bebas Neue'",
                                  fontSize: 16,
                                  color: "var(--green)",
                                  lineHeight: 1,
                                }}
                              >
                                {pesoMedio !== null
                                  ? pesoMedio % 1 === 0
                                    ? pesoMedio
                                    : pesoMedio.toFixed(1)
                                  : "—"}
                              </div>
                            </td>
                            <td
                              style={{
                                padding: "5px 6px",
                                textAlign: "center",
                                background: "rgba(155,135,232,.05)",
                                border: "1px solid rgba(155,135,232,.2)",
                                borderRadius: 5,
                              }}
                            >
                              <div
                                style={{
                                  fontFamily: "'Bebas Neue'",
                                  fontSize: 16,
                                  color: "#9b87e8",
                                  lineHeight: 1,
                                }}
                              >
                                {intMedia !== null ? intMedia + "%" : "—"}
                              </div>
                            </td>
                          </>
                        );
                      })()}
                      {/* Spacer for the "+" column */}
                      <td style={{ border: "none" }} />
                      {/* Actions */}
                      <td
                        style={{
                          padding: 0,
                          textAlign: "center",
                          border: "none",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: 1,
                            justifyContent: "center",
                          }}
                        >
                          {eIdx > 0 && (
                            <button
                              onClick={() => moveEj(eIdx, -1)}
                              title="Mover arriba"
                              style={{
                                background: "none",
                                border: "none",
                                color: "var(--muted)",
                                cursor: "pointer",
                                fontSize: 10,
                                padding: "2px",
                              }}
                            >
                              ▲
                            </button>
                          )}
                          {eIdx < ejs.length - 1 && (
                            <button
                              onClick={() => moveEj(eIdx, 1)}
                              title="Mover abajo"
                              style={{
                                background: "none",
                                border: "none",
                                color: "var(--muted)",
                                cursor: "pointer",
                                fontSize: 10,
                                padding: "2px",
                              }}
                            >
                              ▼
                            </button>
                          )}
                          <button
                            onClick={() => removeEjercicio(eIdx)}
                            title="Eliminar ejercicio"
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--red)",
                              cursor: "pointer",
                              fontSize: 12,
                              padding: "2px",
                              opacity: 0.6,
                            }}
                          >
                            ×
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Agregar ejercicio */}
          <button
            onClick={addEjercicio}
            style={{
              marginTop: 8,
              padding: "6px 16px",
              borderRadius: 8,
              border: "1px dashed var(--border)",
              background: "transparent",
              color: "var(--gold)",
              cursor: "pointer",
              fontSize: 12,
              fontFamily: "'DM Sans'",
              fontWeight: 600,
              width: "100%",
            }}
          >
            + Agregar ejercicio
          </button>

          {/* Selector rápido de ejercicios */}
          <ExercisePickerOverlay
            open={ejPickerOpen !== null}
            normativos={normativos}
            query={ejPickerQuery}
            setQuery={setEjPickerQuery}
            activeIdx={ejPickerActiveIdx}
            setActiveIdx={setEjPickerActiveIdx}
            onClose={() => setEjPickerOpen(null)}
            onSelect={(ejercicio) => {
              if (ejPickerOpen === null) return;
              setEjercicioId(ejPickerOpen, ejercicio.id);
            }}
            inputName="ejercicio_query_basica"
          />

          {/* Info resumen del turno */}
          {(() => {
            const ejsConDatos = ejs.filter((e) => e.ejercicio_id);
            if (ejsConDatos.length === 0) return null;
            let totalReps = 0,
              totalKg = 0;
            ejsConDatos.forEach((e) => {
              const eData = normativos.find(
                (n) => n.id === Number(e.ejercicio_id),
              );
              (e.bloques || []).slice(0, numBloques).forEach((b) => {
                if (!b.series && !b.reps) return;
                const s =
                  typeof b.series === "string" && b.series.includes("+")
                    ? b.series.split("+").reduce((a, v) => a + Number(v), 0)
                    : Number(b.series) || 0;
                const r = Number(b.reps) || 0;
                const kg = Number(
                  calcKgBasica(e.ejercicio_id, b.pct) ?? b.kg ?? 0,
                );
                totalReps += s * r;
                totalKg += s * r * kg;
              });
            });
            const pesoMedioTotal =
              totalReps > 0 ? Math.round((totalKg / totalReps) * 2) / 2 : null;
            const metrics = [
              {
                label: "VOL REPs",
                value: totalReps > 0 ? totalReps : null,
                color: "var(--gold)",
              },
              {
                label: "VOL Kg",
                value:
                  totalKg > 0
                    ? Number.isInteger(totalKg)
                      ? totalKg
                      : totalKg.toFixed(1)
                    : null,
                color: "var(--blue)",
              },
              {
                label: "Peso Medio",
                value:
                  pesoMedioTotal !== null
                    ? pesoMedioTotal % 1 === 0
                      ? pesoMedioTotal
                      : pesoMedioTotal.toFixed(1)
                    : null,
                color: "var(--green)",
              },
            ];
            return (
              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--muted)",
                    padding: "6px 10px",
                    background: "var(--surface2)",
                    borderRadius: 8,
                  }}
                >
                  Ejercicios:{" "}
                  <span style={{ color: "var(--gold)", fontWeight: 700 }}>
                    {ejsConDatos.length}
                  </span>
                </div>
                {metrics.map(
                  (m) =>
                    m.value !== null && (
                      <div
                        key={m.label}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 8,
                          background: "var(--surface2)",
                          border: `1px solid ${m.color}30`,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          minWidth: 60,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 9,
                            color: "var(--muted)",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: ".04em",
                          }}
                        >
                          {m.label}
                        </div>
                        <div
                          style={{
                            fontFamily: "'Bebas Neue'",
                            fontSize: 18,
                            color: m.color,
                            lineHeight: 1,
                          }}
                        >
                          {m.value}
                        </div>
                      </div>
                    ),
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
