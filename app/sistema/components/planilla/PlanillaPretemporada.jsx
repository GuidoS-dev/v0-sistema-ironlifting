import { useState, useEffect, useRef, useMemo } from "react";
import { X } from "lucide-react";
import { EJERCICIOS } from "../../data/ejercicios";
import { CAT_COLOR, EMPTY_NAME_SENTINEL, mkId, mkBloqueBasica, mkEjPretemp, resolveExerciseName } from "../../data/constantes";

export function PlanillaPretemporada({
  semanas,
  onChange,
  numBloques = 3,
  onBeforeChange,
  irm_arr = 100,
  irm_env = 200,
  normativos: normativosProp = null,
}) {
  const [turnoGlobalActivo, setTurnoGlobalActivo] = useState(0);
  const [jumpTurno, setJumpTurno] = useState("");
  const pendingTurnoIdRef = useRef(null);

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

  const turnosFlat = React.useMemo(() => {
    const out = [];
    let globalNumero = 1;
    (semanas || []).forEach((s, semIdx) => {
      (s.turnos || []).forEach((t, turnoIdx) => {
        out.push({ semIdx, turnoIdx, turno: t, globalNumero });
        globalNumero += 1;
      });
    });
    return out;
  }, [semanas]);

  useEffect(() => {
    if (!turnosFlat.length) {
      setTurnoGlobalActivo(0);
      return;
    }
    if (turnoGlobalActivo >= turnosFlat.length) {
      setTurnoGlobalActivo(turnosFlat.length - 1);
    }
  }, [turnosFlat, turnoGlobalActivo]);

  useEffect(() => {
    if (!pendingTurnoIdRef.current || !turnosFlat.length) return;
    const idx = turnosFlat.findIndex(
      (x) => x.turno.id === pendingTurnoIdRef.current,
    );
    if (idx >= 0) {
      setTurnoGlobalActivo(idx);
      pendingTurnoIdRef.current = null;
    }
  }, [turnosFlat]);

  const turnoRefGlobal = turnosFlat[turnoGlobalActivo] || null;
  const semActiva = turnoRefGlobal?.semIdx ?? 0;
  const turnoActivo = turnoRefGlobal?.turnoIdx ?? 0;
  const sem = semanas[semActiva];
  const turno = turnoRefGlobal?.turno || sem?.turnos?.[turnoActivo];
  const ejs = turno?.ejercicios || [];

  const totalTurnos = turnosFlat.length;
  const turnosPorRango = 12;
  const rangoActivo = Math.floor(turnoGlobalActivo / turnosPorRango);
  const totalRangos = Math.max(1, Math.ceil(totalTurnos / turnosPorRango));
  const inicioRango = rangoActivo * turnosPorRango;
  const finRango = Math.min(totalTurnos, inicioRango + turnosPorRango);

  const _bc = () => {
    try {
      if (onBeforeChange) onBeforeChange();
    } catch {}
  };

  // Calc kg using LOWEST pct_base among all ejercicio_ids with normativos
  const calcKgPretemp = (ejercicio_ids, pct) => {
    if (!ejercicio_ids || !ejercicio_ids.length || !pct) return null;
    let lowestKgBase = null;
    for (const { eid } of ejercicio_ids) {
      if (!eid) continue;
      const ejData = normativos.find((e) => e.id === Number(eid));
      if (!ejData || !ejData.pct_base) continue;
      const irm =
        ejData.base === "arranque" ? Number(irm_arr) : Number(irm_env);
      if (!irm) continue;
      const kgBase = (irm * ejData.pct_base) / 100;
      if (lowestKgBase === null || kgBase < lowestKgBase) lowestKgBase = kgBase;
    }
    if (lowestKgBase === null) return null;
    return Math.round(((lowestKgBase * pct) / 100) * 2) / 2;
  };

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
        const newPct = value === "" ? null : Number(value);
        const autoKg = calcKgPretemp(ej.ejercicio_ids, newPct);
        ej.bloques[bIdx] = { ...ej.bloques[bIdx], pct: newPct, kg: autoKg };
      } else if (field === "nota") {
        ej.bloques[bIdx] = { ...ej.bloques[bIdx], nota: value };
      } else {
        ej.bloques[bIdx] = {
          ...ej.bloques[bIdx],
          [field]:
            value === "" ? null : isNaN(Number(value)) ? value : Number(value),
        };
      }
      return ss;
    });
  };

  const setSubEjId = (ejIdx, subIdx, newId) => {
    updateSemanas((ss) => {
      const ej = ss[semActiva].turnos[turnoActivo].ejercicios[ejIdx];
      if (!ej.ejercicio_ids) ej.ejercicio_ids = [{ eid: null, link: "-" }];
      ej.ejercicio_ids[subIdx] = {
        ...ej.ejercicio_ids[subIdx],
        eid: newId ? Number(newId) : null,
      };
      // Recalculate kg for all blocks
      if (ej.bloques) {
        ej.bloques.forEach((b) => {
          if (b.pct) b.kg = calcKgPretemp(ej.ejercicio_ids, b.pct);
        });
      }
      return ss;
    });
  };

  const addSubEj = (ejIdx) => {
    updateSemanas((ss) => {
      const ej = ss[semActiva].turnos[turnoActivo].ejercicios[ejIdx];
      if (!ej.ejercicio_ids) ej.ejercicio_ids = [{ eid: null, link: "-" }];
      // Change last "-" to "+"
      const last = ej.ejercicio_ids[ej.ejercicio_ids.length - 1];
      if (last.link === "-") last.link = "+";
      ej.ejercicio_ids.push({ eid: null, link: "-" });
      return ss;
    });
  };

  const removeSubEj = (ejIdx, subIdx) => {
    updateSemanas((ss) => {
      const ej = ss[semActiva].turnos[turnoActivo].ejercicios[ejIdx];
      if (!ej.ejercicio_ids || ej.ejercicio_ids.length <= 1) return ss;
      ej.ejercicio_ids.splice(subIdx, 1);
      // First element always has link "-"
      ej.ejercicio_ids[0].link = "-";
      // Last element always has link "-"
      ej.ejercicio_ids[ej.ejercicio_ids.length - 1].link = "-";
      // Recalculate kg
      if (ej.bloques) {
        ej.bloques.forEach((b) => {
          if (b.pct) b.kg = calcKgPretemp(ej.ejercicio_ids, b.pct);
        });
      }
      return ss;
    });
  };

  const cycleLink = (ejIdx, subIdx) => {
    updateSemanas((ss) => {
      const ej = ss[semActiva].turnos[turnoActivo].ejercicios[ejIdx];
      const sub = ej.ejercicio_ids[subIdx];
      sub.link = sub.link === "+" ? "c" : "+";
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
      ss[semActiva].turnos[turnoActivo].ejercicios.push(
        mkEjPretemp(numBloques),
      );
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

  const removeTurno = () => {
    if (!sem || totalTurnos <= 1) return;
    const targetGlobalIdx = Math.max(0, turnoGlobalActivo - 1);
    updateSemanas((ss) => {
      ss[semActiva].turnos.splice(turnoActivo, 1);
      ss[semActiva].turnos.forEach((t, i) => {
        t.numero = i + 1;
      });
      if (ss[semActiva].turnos.length === 0 && ss.length > 1) {
        ss.splice(semActiva, 1);
        ss.forEach((s, i) => {
          s.numero = i + 1;
        });
      }
      return ss;
    });
    setTurnoGlobalActivo(targetGlobalIdx);
  };

  const addTurno = () => {
    const newTurnoId = mkId();
    updateSemanas((ss) => {
      const semIdx = Math.max(0, Math.min(semActiva, ss.length - 1));
      const semSel = ss[semIdx];
      const insertIdx = Math.max(
        0,
        Math.min(turnoActivo + 1, semSel.turnos.length),
      );
      semSel.turnos.splice(insertIdx, 0, {
        id: newTurnoId,
        numero: 0,
        dia: "",
        momento: "",
        ejercicios: Array.from({ length: 6 }, () => mkEjPretemp(numBloques)),
      });
      semSel.turnos.forEach((t, i) => {
        t.numero = i + 1;
      });
      return ss;
    });
    pendingTurnoIdRef.current = newTurnoId;
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

  const moveEj = (ejIdx, dir) => {
    const tgt = ejIdx + dir;
    if (tgt < 0 || tgt >= ejs.length) return;
    updateSemanas((ss) => {
      const arr = ss[semActiva].turnos[turnoActivo].ejercicios;
      [arr[ejIdx], arr[tgt]] = [arr[tgt], arr[ejIdx]];
      return ss;
    });
  };

  const irATurnoGlobal = (idx) => {
    if (!turnosFlat.length) return;
    const safe = Math.max(0, Math.min(idx, turnosFlat.length - 1));
    setTurnoGlobalActivo(safe);
  };

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

  // Build auto-name from ejercicio_ids
  const buildAutoName = (ejercicio_ids) => {
    if (!ejercicio_ids || !ejercicio_ids.length) return "";
    return ejercicio_ids
      .map((sub, i) => {
        const ejData = sub.eid
          ? normativos.find((e) => e.id === Number(sub.eid))
          : null;
        const name = ejData?.nombre || "";
        if (i === 0) return name;
        const sep = sub.link === "c" ? " c/ " : " + ";
        return sep + name;
      })
      .join("");
  };

  if (!sem) return null;

  return (
    <div>
      {/* ── Navegación por turnos globales ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              padding: "4px 8px",
              borderRadius: 8,
              background: "rgba(255,152,0,.12)",
              border: "1px solid rgba(255,152,0,.3)",
              fontSize: 11,
              color: "#ffb74d",
              fontWeight: 700,
            }}
          >
            Turnos: {totalTurnos}
          </div>
          <div
            style={{
              fontFamily: "'Bebas Neue'",
              fontSize: 20,
              color: "var(--gold)",
              lineHeight: 1,
            }}
          >
            T{Math.min(totalTurnos, turnoGlobalActivo + 1)}
            <span
              style={{
                fontFamily: "'DM Sans'",
                fontSize: 12,
                color: "var(--muted)",
                marginLeft: 6,
              }}
            >
              de {totalTurnos}
            </span>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => irATurnoGlobal(turnoGlobalActivo - 1)}
            disabled={turnoGlobalActivo <= 0}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "var(--surface2)",
              color: "var(--muted)",
              cursor: turnoGlobalActivo <= 0 ? "not-allowed" : "pointer",
              fontSize: 11,
              opacity: turnoGlobalActivo <= 0 ? 0.45 : 1,
            }}
          >
            ◀ Anterior
          </button>
          <button
            onClick={() => irATurnoGlobal(turnoGlobalActivo + 1)}
            disabled={turnoGlobalActivo >= totalTurnos - 1}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "var(--surface2)",
              color: "var(--muted)",
              cursor:
                turnoGlobalActivo >= totalTurnos - 1
                  ? "not-allowed"
                  : "pointer",
              fontSize: 11,
              opacity: turnoGlobalActivo >= totalTurnos - 1 ? 0.45 : 1,
            }}
          >
            Siguiente ▶
          </button>
          <input
            name="field_pt_jump_turno"
            type="number"
            min={1}
            max={Math.max(1, totalTurnos)}
            className="no-spin"
            value={jumpTurno}
            placeholder="N°"
            onChange={(e) => setJumpTurno(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              const n = Number(jumpTurno);
              if (!Number.isInteger(n)) return;
              irATurnoGlobal(n - 1);
            }}
            style={{
              width: 58,
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "4px 6px",
              color: "var(--text)",
              textAlign: "center",
              fontFamily: "'Bebas Neue'",
              fontSize: 15,
              outline: "none",
            }}
          />
        </div>
      </div>

      <div
        style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}
      >
        {Array.from({ length: totalRangos }).map((_, i) => {
          const ini = i * turnosPorRango + 1;
          const fin = Math.min(totalTurnos, (i + 1) * turnosPorRango);
          const activo = i === rangoActivo;
          return (
            <button
              key={`rango-${i}`}
              onClick={() => irATurnoGlobal(i * turnosPorRango)}
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                border: activo
                  ? "1px solid var(--gold)"
                  : "1px solid var(--border)",
                background: activo ? "rgba(232,197,71,.14)" : "var(--surface2)",
                color: activo ? "var(--gold)" : "var(--muted)",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {ini}-{fin}
            </button>
          );
        })}
      </div>

      {/* ── Turnos del rango activo ── */}
      <div
        style={{
          display: "flex",
          gap: 4,
          flexWrap: "wrap",
          marginBottom: 12,
          alignItems: "center",
        }}
      >
        {turnosFlat.slice(inicioRango, finRango).map((tRef, i) => {
          const globalIdx = inicioRango + i;
          const t = tRef.turno;
          return (
            <button
              key={t.id}
              onClick={() => irATurnoGlobal(globalIdx)}
              style={{
                padding: "4px 12px",
                borderRadius: 6,
                border: "none",
                background:
                  turnoGlobalActivo === globalIdx
                    ? "var(--gold)"
                    : "var(--surface3)",
                color: turnoGlobalActivo === globalIdx ? "#000" : "var(--text)",
                fontFamily: "'Bebas Neue'",
                fontSize: 14,
                cursor: "pointer",
                letterSpacing: ".04em",
              }}
            >
              T{tRef.globalNumero}
              {t.dia ? ` · ${t.dia.slice(0, 3)}` : ""}
            </button>
          );
        })}
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
        {totalTurnos > 1 && (
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
              Turno {Math.min(totalTurnos, turnoGlobalActivo + 1)}
            </div>
            <select
              name="field_pt_day"
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
              name="field_pt_mom"
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
                      minWidth: 80,
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
                  const subEjs = ej.ejercicio_ids || [
                    { eid: ej.ejercicio_id || null, link: "-" },
                  ];
                  // Find lowest pct_base for color
                  const firstEid = subEjs.find((s) => s.eid)?.eid;
                  const firstEjData = firstEid
                    ? normativos.find((e) => e.id === Number(firstEid))
                    : null;
                  const col = firstEjData
                    ? CAT_COLOR[firstEjData.categoria]
                    : "var(--border)";
                  const bloques =
                    ej.bloques ||
                    Array.from({ length: numBloques }, mkBloqueBasica);
                  const autoName = buildAutoName(subEjs);
                  const displayName = resolveExerciseName(
                    ej.nombre_custom,
                    autoName,
                  );

                  return (
                    <tr
                      key={ej.id}
                      style={{
                        background:
                          eIdx % 2 === 0 ? "var(--surface2)" : "transparent",
                      }}
                    >
                      {/* REF — multi-ID con botones de enlace */}
                      <td
                        style={{
                          padding: "4px 4px",
                          textAlign: "center",
                          border: `1px solid ${col}40`,
                          borderRadius: 5,
                          background: `${col}0a`,
                          verticalAlign: "middle",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          {subEjs.map((sub, sIdx) => {
                            const subEjData = sub.eid
                              ? normativos.find((x) => x.id === Number(sub.eid))
                              : null;
                            const subCol = subEjData
                              ? CAT_COLOR[subEjData.categoria]
                              : "var(--border)";
                            return (
                              <React.Fragment key={sIdx}>
                                {/* Link button between sub-exercises */}
                                {sIdx > 0 && (
                                  <button
                                    onClick={() => cycleLink(eIdx, sIdx)}
                                    title={
                                      sub.link === "+"
                                        ? "Secuencial (+): click para cambiar a combinado"
                                        : "Combinado (c): click para cambiar a secuencial"
                                    }
                                    style={{
                                      width: 20,
                                      height: 14,
                                      borderRadius: 3,
                                      border: "none",
                                      cursor: "pointer",
                                      fontSize: 9,
                                      fontWeight: 900,
                                      padding: 0,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      background:
                                        sub.link === "c"
                                          ? "rgba(232,71,71,.25)"
                                          : "rgba(71,180,232,.25)",
                                      color:
                                        sub.link === "c"
                                          ? "var(--red)"
                                          : "var(--blue)",
                                      fontFamily: "'Bebas Neue'",
                                      lineHeight: 1,
                                      margin: "-1px 0",
                                    }}
                                  >
                                    {sub.link === "c" ? "C" : "+"}
                                  </button>
                                )}
                                {/* ID container */}
                                <div
                                  style={{
                                    position: "relative",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: 40,
                                    minHeight: 28,
                                    borderRadius: 6,
                                    border: `1.5px solid ${sub.eid ? subCol : "var(--border)"}`,
                                    background: sub.eid
                                      ? `${subCol}12`
                                      : "var(--surface2)",
                                    transition: "all .15s",
                                  }}
                                >
                                  <input
                                    name={`field_pt_ref_${eIdx}_${sIdx}`}
                                    type="number"
                                    min={1}
                                    max={999}
                                    className="no-spin"
                                    value={sub.eid || ""}
                                    placeholder="—"
                                    onChange={(e) =>
                                      setSubEjId(eIdx, sIdx, e.target.value)
                                    }
                                    style={cellInput({
                                      width: 34,
                                      fontFamily: "'Bebas Neue'",
                                      fontSize: 15,
                                      fontWeight: 700,
                                      color: subEjData
                                        ? subCol
                                        : "var(--muted)",
                                      padding: "2px 0",
                                    })}
                                  />
                                  {/* X to remove sub-exercise */}
                                  {subEjs.length > 1 && sIdx > 0 && (
                                    <button
                                      onClick={() => removeSubEj(eIdx, sIdx)}
                                      title="Quitar este ejercicio"
                                      style={{
                                        position: "absolute",
                                        top: -5,
                                        right: -5,
                                        width: 14,
                                        height: 14,
                                        borderRadius: "50%",
                                        border: "1.5px solid var(--surface1)",
                                        background: "var(--red)",
                                        color: "#fff",
                                        cursor: "pointer",
                                        fontSize: 8,
                                        lineHeight: 1,
                                        padding: 0,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        zIndex: 2,
                                      }}
                                    >
                                      ×
                                    </button>
                                  )}
                                </div>
                              </React.Fragment>
                            );
                          })}
                          {/* Button to add more sub-exercises */}
                          <button
                            onClick={() => addSubEj(eIdx)}
                            title="Agregar ejercicio a esta fila"
                            style={{
                              width: 40,
                              height: 18,
                              borderRadius: 4,
                              border: "1px dashed var(--border)",
                              background: "transparent",
                              color: "var(--muted)",
                              cursor: "pointer",
                              fontSize: 11,
                              fontWeight: 700,
                              padding: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              lineHeight: 1,
                              opacity: 0.6,
                            }}
                          >
                            +
                          </button>
                        </div>
                      </td>
                      {/* Ejercicio nombre */}
                      <td
                        style={{
                          padding: "6px 8px",
                          border: "1px solid var(--border)",
                          borderRadius: 6,
                          position: "relative",
                          minWidth: 160,
                          maxWidth: 240,
                          verticalAlign: "middle",
                          background: "var(--surface2)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 9,
                            color: "var(--muted)",
                            fontFamily: "'DM Sans'",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: ".04em",
                            marginBottom: 2,
                            lineHeight: 1,
                          }}
                        >
                          Ejercicio
                        </div>
                        <textarea
                          name={`field_pt_name_${eIdx}`}
                          value={displayName}
                          placeholder="Nombre del ejercicio"
                          rows={2}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "") {
                              setNombreCustom(eIdx, EMPTY_NAME_SENTINEL);
                              return;
                            }
                            if (val === autoName) {
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
                            resize: "none",
                            lineHeight: 1.3,
                            overflow: "hidden",
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
                                name={`field_pt_pct_${eIdx}_${bIdx}`}
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
                                name={`field_pt_s_${eIdx}_${bIdx}`}
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
                                name={`field_pt_r_${eIdx}_${bIdx}`}
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
                                name={`field_pt_kg_${eIdx}_${bIdx}`}
                                type="number"
                                step="0.5"
                                className="no-spin"
                                value={
                                  calcKgPretemp(subEjs, b.pct) ?? b.kg ?? ""
                                }
                                readOnly
                                style={cellInput({
                                  color: "var(--muted)",
                                  fontSize: 12,
                                })}
                              />
                            </div>
                            <input
                              name={`field_pt_nota_${eIdx}_${bIdx}`}
                              type="text"
                              value={b.nota || ""}
                              placeholder="…"
                              onChange={(e) =>
                                updateBloque(eIdx, bIdx, "nota", e.target.value)
                              }
                              title="Aclaración"
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
                            calcKgPretemp(subEjs, b.pct) ?? b.kg ?? 0,
                          );
                          volReps += s * r;
                          volKg += s * r * kg;
                        });
                        const pesoMedio =
                          volReps > 0
                            ? Math.round((volKg / volReps) * 2) / 2
                            : null;
                        // Int media: use lowest pct_base
                        let intMedia = null;
                        if (volReps > 0 && volKg > 0) {
                          let lowestKgBase = null;
                          for (const { eid } of subEjs) {
                            if (!eid) continue;
                            const ejD = normativos.find(
                              (e) => e.id === Number(eid),
                            );
                            if (!ejD || !ejD.pct_base) continue;
                            const irm =
                              ejD.base === "arranque"
                                ? Number(irm_arr)
                                : Number(irm_env);
                            if (!irm) continue;
                            const kb = (irm * ejD.pct_base) / 100;
                            if (lowestKgBase === null || kb < lowestKgBase)
                              lowestKgBase = kb;
                          }
                          if (lowestKgBase)
                            intMedia = Math.round(
                              (volKg / volReps / lowestKgBase) * 100,
                            );
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

          {/* Info resumen del turno */}
          {(() => {
            const ejsConDatos = ejs.filter((e) =>
              (e.ejercicio_ids || []).some((s) => s.eid),
            );
            if (ejsConDatos.length === 0) return null;
            let totalReps = 0,
              totalKg = 0;
            ejsConDatos.forEach((e) => {
              const subEjsR = e.ejercicio_ids || [
                { eid: e.ejercicio_id, link: "-" },
              ];
              (e.bloques || []).slice(0, numBloques).forEach((b) => {
                if (!b.series && !b.reps) return;
                const s =
                  typeof b.series === "string" && b.series.includes("+")
                    ? b.series.split("+").reduce((a, v) => a + Number(v), 0)
                    : Number(b.series) || 0;
                const r = Number(b.reps) || 0;
                const kg = Number(calcKgPretemp(subEjsR, b.pct) ?? b.kg ?? 0);
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
