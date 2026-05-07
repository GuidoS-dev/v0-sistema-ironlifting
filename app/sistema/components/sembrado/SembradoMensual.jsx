import { useCallback, useRef, useState } from "react";
import { DIAS, MOMENTOS, mkId } from "../../data/constantes";
import { formatFechaSemana, getFechaSemanaEfectiva } from "../../lib/ciclo-menstrual";
import { handleSembradoTabNavigation } from "../../lib/navegacion";
import { CeldaSembrado } from "./CeldaSembrado";

export function SembradoMensual({
  semanas,
  irm_arr,
  irm_env,
  onChangeSemana,
  onChangeTodasSemanas,
  onSwapSemanas,
  meso,
  normativos = null,
}) {
  const numTurnos = semanas[0]?.turnos?.length ?? 3;
  const [importFrom, setImportFrom] = useState("");
  const [importTo, setImportTo] = useState("");
  const [importFeedback, setImportFeedback] = useState(false);
  const importTimerRef = useRef(null);
  const sembradoNavRef = useRef(null);

  const emptySlotCache = useRef({});

  const getEjs = (semIdx, tIdx) => {
    const ejs = (semanas[semIdx]?.turnos[tIdx]?.ejercicios || []).filter(
      Boolean,
    );
    if (ejs.length < DEFAULT_EJS) {
      const cacheKey = `${semIdx}-${tIdx}`;
      if (!emptySlotCache.current[cacheKey]) {
        emptySlotCache.current[cacheKey] = [];
      }
      const usedIds = new Set(ejs.map((e) => e?.id).filter(Boolean));
      const cache = emptySlotCache.current[cacheKey].filter(
        (slot) => !usedIds.has(slot?.id),
      );
      emptySlotCache.current[cacheKey] = cache;
      const needed = DEFAULT_EJS - ejs.length;
      while (cache.length < needed) {
        cache.push(mkEj());
      }
      return [...ejs, ...cache.slice(0, needed)];
    }
    return ejs;
  };

  const updateEjs = (semIdx, tIdx, newEjs) => {
    const seenIds = new Set();
    const cleanEjs = (newEjs || []).filter(Boolean).map((ej) => {
      if (!ej?.id) {
        return { ...ej, id: mkId() };
      }
      if (seenIds.has(ej.id)) {
        return { ...ej, id: mkId() };
      }
      seenIds.add(ej.id);
      return ej;
    });

    const cacheKey = `${semIdx}-${tIdx}`;
    if (emptySlotCache.current[cacheKey]) {
      const usedIds = new Set(cleanEjs.map((e) => e?.id).filter(Boolean));
      emptySlotCache.current[cacheKey] = emptySlotCache.current[
        cacheKey
      ].filter((slot) => !usedIds.has(slot?.id));
    }

    const semana = { ...semanas[semIdx] };
    const turnos = [...semana.turnos];
    turnos[tIdx] = { ...turnos[tIdx], ejercicios: cleanEjs };
    semana.turnos = turnos;
    onChangeSemana(semIdx, semana);
  };

  // Día y momento son INDEPENDIENTES por semana — se actualiza solo esa semana
  const updateDiaSemana = (semIdx, tIdx, dia, momento) => {
    const semana = { ...semanas[semIdx] };
    const turnos = [...semana.turnos];
    turnos[tIdx] = { ...turnos[tIdx], dia, momento };
    semana.turnos = turnos;
    onChangeSemana(semIdx, semana);
  };

  // Agregar turno a todas las semanas de una sola vez
  const addTurno = () => {
    const newSemanas = semanas.map((s) => ({
      ...s,
      turnos: [
        ...s.turnos,
        {
          id: mkId(),
          numero: s.turnos.length + 1,
          dia: "",
          momento: "",
          ejercicios: Array.from({ length: DEFAULT_EJS }, mkEj),
        },
      ],
    }));
    onChangeTodasSemanas(newSemanas);
  };

  // Quitar último turno — mínimo 1, confirma si tiene datos
  const removeTurno = () => {
    if (numTurnos <= 1) return;
    const lastIdx = numTurnos - 1;
    // Verificar si alguna semana tiene ejercicios cargados en el último turno
    const tieneDatos = semanas.some((s) => {
      const t = s.turnos[lastIdx];
      return (
        t && (t.dia || t.momento || t.ejercicios.some((e) => e.ejercicio_id))
      );
    });
    if (
      tieneDatos &&
      !confirm(
        `El Turno ${lastIdx + 1} tiene datos cargados. ¿Eliminar de todas formas?`,
      )
    )
      return;
    const newSemanas = semanas.map((s) => ({
      ...s,
      turnos: s.turnos.slice(0, -1),
    }));
    onChangeTodasSemanas(newSemanas);
  };

  const importarSemanaSembrado = () => {
    const src = Number(importFrom);
    const dst = Number(importTo);
    if (!Number.isInteger(src) || !Number.isInteger(dst)) return;
    if (src < 0 || src >= semanas.length) return;
    if (dst < 0 || dst >= semanas.length) return;
    if (src === dst) return;

    const newSemanas = JSON.parse(JSON.stringify(semanas));
    const sourceTurnos = newSemanas[src]?.turnos || [];
    const targetTurnos = newSemanas[dst]?.turnos || [];

    newSemanas[dst].turnos = sourceTurnos.map((t, i) => ({
      ...t,
      id: targetTurnos[i]?.id || mkId(),
      numero: targetTurnos[i]?.numero || i + 1,
      ejercicios: (t.ejercicios || []).map((e) => ({ ...e })),
    }));

    onChangeTodasSemanas(newSemanas);

    if (importTimerRef.current) clearTimeout(importTimerRef.current);
    setImportFeedback(true);
    importTimerRef.current = setTimeout(() => setImportFeedback(false), 1500);
  };

  const intercambiarSemanas = (aIdx, bIdx) => {
    if (aIdx === bIdx) return;
    if (aIdx < 0 || bIdx < 0) return;
    if (aIdx >= semanas.length || bIdx >= semanas.length) return;

    const newSemanas = JSON.parse(JSON.stringify(semanas));
    [newSemanas[aIdx], newSemanas[bIdx]] = [newSemanas[bIdx], newSemanas[aIdx]];
    newSemanas.forEach((s, i) => {
      s.numero = i + 1;
    });
    onChangeTodasSemanas(newSemanas);
    if (onSwapSemanas) onSwapSemanas(aIdx, bIdx);

    const remapSel = (value) => {
      if (value === "") return "";
      const idx = Number(value);
      if (!Number.isInteger(idx)) return "";
      if (idx === aIdx) return String(bIdx);
      if (idx === bIdx) return String(aIdx);
      return value;
    };

    setImportFrom((prev) => remapSel(prev));
    setImportTo((prev) => remapSel(prev));
  };

  const handleSembradoKeyDown = useCallback((event) => {
    handleSembradoTabNavigation(event, sembradoNavRef.current);
  }, []);

  return (
    <div ref={sembradoNavRef} onKeyDown={handleSembradoKeyDown}>
      {/* Controles de turnos */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 12, color: "var(--muted)" }}>
          <span
            style={{
              color: "var(--gold)",
              fontFamily: "'Bebas Neue'",
              fontSize: 16,
            }}
          >
            {numTurnos}
          </span>{" "}
          turnos
        </span>
        <button className="btn btn-ghost btn-xs" onClick={addTurno}>
          + Turno
        </button>
        {numTurnos > 1 && (
          <button className="btn btn-danger btn-xs" onClick={removeTurno}>
            − Turno
          </button>
        )}
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 10, color: "var(--muted)" }}>
            Importar sembrado
          </span>
          <select
            name="field_32"
            value={importFrom}
            onChange={(e) => setImportFrom(e.target.value)}
            style={{
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              color: "var(--text)",
              fontSize: 11,
              padding: "4px 8px",
              outline: "none",
            }}
          >
            <option value="">Semana origen</option>
            {semanas.map((s, i) => (
              <option key={`src-${s.id}`} value={i}>
                Semana {s.numero}
              </option>
            ))}
          </select>
          <span style={{ fontSize: 10, color: "var(--muted)" }}>→</span>
          <select
            name="field_33"
            value={importTo}
            onChange={(e) => setImportTo(e.target.value)}
            style={{
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              color: "var(--text)",
              fontSize: 11,
              padding: "4px 8px",
              outline: "none",
            }}
          >
            <option value="">Semana destino</option>
            {semanas.map((s, i) => (
              <option key={`dst-${s.id}`} value={i}>
                Semana {s.numero}
              </option>
            ))}
          </select>
          <button
            className="btn btn-ghost btn-xs"
            onClick={importarSemanaSembrado}
            disabled={
              importFrom === "" || importTo === "" || importFrom === importTo
            }
            style={{
              border: importFeedback
                ? "1px solid rgba(77,182,172,.45)"
                : undefined,
              color: importFeedback ? "#4db6ac" : undefined,
            }}
            title="Copia toda la semana origen en la semana destino (ejercicios, %, tabla, día y turno)"
          >
            {importFeedback ? "Importado" : "Importar"}
          </button>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            borderCollapse: "separate",
            borderSpacing: 4,
            minWidth: 600,
            width: "100%",
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  width: 40,
                  padding: "6px 4px",
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  fontSize: 10,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                  fontWeight: 600,
                  verticalAlign: "middle",
                  textAlign: "center",
                }}
              >
                #
              </th>
              {semanas.map((s, sIdx) => (
                <th
                  key={s.id}
                  style={{
                    padding: "6px 8px",
                    minWidth: 0,
                    maxWidth: 200,
                    width: 200,
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: 4,
                      marginBottom: 2,
                    }}
                  >
                    <button
                      onClick={() => intercambiarSemanas(sIdx, sIdx - 1)}
                      disabled={sIdx === 0}
                      title="Intercambiar con semana anterior"
                      style={{
                        background: "none",
                        border: "none",
                        color: sIdx === 0 ? "var(--surface3)" : "var(--gold)",
                        cursor: sIdx === 0 ? "default" : "pointer",
                        fontSize: 10,
                        lineHeight: 1,
                        padding: "1px 2px",
                      }}
                    >
                      ◀
                    </button>
                    <button
                      onClick={() => intercambiarSemanas(sIdx, sIdx + 1)}
                      disabled={sIdx === semanas.length - 1}
                      title="Intercambiar con semana siguiente"
                      style={{
                        background: "none",
                        border: "none",
                        color:
                          sIdx === semanas.length - 1
                            ? "var(--surface3)"
                            : "var(--gold)",
                        cursor:
                          sIdx === semanas.length - 1 ? "default" : "pointer",
                        fontSize: 10,
                        lineHeight: 1,
                        padding: "1px 2px",
                      }}
                    >
                      ▶
                    </button>
                  </div>
                  <div
                    style={{
                      fontFamily: "'Bebas Neue'",
                      fontSize: 16,
                      color: "var(--gold)",
                      lineHeight: 1,
                    }}
                  >
                    Semana {s.numero}
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      color: "var(--muted)",
                      marginTop: 1,
                      opacity: 0.8,
                    }}
                  >
                    {formatFechaSemana(
                      getFechaSemanaEfectiva(meso.fecha_inicio, s),
                    ) || "—"}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--muted)",
                      marginTop: 2,
                    }}
                  >
                    {s.pct_volumen}% ·{" "}
                    {s.reps_ajustadas || s.reps_calculadas || 0} reps
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "14px 1fr 38px 40px 14px",
                      gap: 2,
                      marginTop: 6,
                      padding: "2px 3px",
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  >
                    {["#", "EJ", "INT", "TBL", ""].map((h, i) => (
                      <div
                        key={i}
                        style={{
                          fontSize: 8,
                          color: "var(--muted)",
                          textAlign: "center",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: ".06em",
                        }}
                      >
                        {h}
                      </div>
                    ))}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: numTurnos }, (_, tIdx) => (
              <tr key={tIdx}>
                {/* Columna turno — número solamente */}
                <td
                  style={{
                    padding: "4px 2px",
                    verticalAlign: "top",
                    textAlign: "center",
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
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
                    T{tIdx + 1}
                  </div>
                </td>
                {/* Celdas por semana — cada una con su propio día/momento */}
                {semanas.map((s, sIdx) => (
                  <td
                    key={s.id}
                    style={{
                      padding: 4,
                      verticalAlign: "top",
                      maxWidth: 200,
                      width: 200,
                      overflow: "hidden",
                    }}
                  >
                    {/* Día y momento por semana */}
                    <div style={{ display: "flex", gap: 3, marginBottom: 4 }}>
                      <select
                        name="field_34"
                        value={s.turnos[tIdx]?.dia || ""}
                        onChange={(e) =>
                          updateDiaSemana(
                            sIdx,
                            tIdx,
                            e.target.value,
                            s.turnos[tIdx]?.momento || "",
                          )
                        }
                        style={{
                          flex: 1,
                          background: "var(--surface3)",
                          border: "1px solid var(--border)",
                          borderRadius: 4,
                          color: s.turnos[tIdx]?.dia
                            ? "var(--text)"
                            : "var(--muted)",
                          fontSize: 10,
                          padding: "2px 3px",
                          outline: "none",
                          cursor: "pointer",
                        }}
                      >
                        <option value="">Día</option>
                        {DIAS.map((d) => (
                          <option key={d}>{d}</option>
                        ))}
                      </select>
                      <select
                        name="field_35"
                        value={s.turnos[tIdx]?.momento || ""}
                        onChange={(e) =>
                          updateDiaSemana(
                            sIdx,
                            tIdx,
                            s.turnos[tIdx]?.dia || "",
                            e.target.value,
                          )
                        }
                        style={{
                          flex: 1,
                          background: "var(--surface3)",
                          border: "1px solid var(--border)",
                          borderRadius: 4,
                          color: s.turnos[tIdx]?.momento
                            ? "var(--text)"
                            : "var(--muted)",
                          fontSize: 10,
                          padding: "2px 3px",
                          outline: "none",
                          cursor: "pointer",
                        }}
                      >
                        <option value="">Turno</option>
                        {MOMENTOS.map((m) => (
                          <option key={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                    {/* Ejercicios */}
                    <CeldaSembrado
                      ejercicios={getEjs(sIdx, tIdx)}
                      irm_arr={irm_arr}
                      irm_env={irm_env}
                      semIdx={sIdx}
                      turnoIdx={tIdx}
                      onChange={(newEjs) => updateEjs(sIdx, tIdx, newEjs)}
                      normativos={normativos}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
