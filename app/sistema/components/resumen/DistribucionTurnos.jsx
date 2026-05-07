import { useState, useRef } from "react";
import { EJERCICIOS } from "../../data/ejercicios";
import { CAT_COLOR } from "../../data/constantes";
import { calcSembradoSemana, getGrupo } from "../../lib/calc";
import { ResumenGrupos } from "./ResumenGrupos";

export function DistribucionTurnos({
  semanas,
  meso,
  turnoPctOverrides,
  turnoPctManual,
  setTurnoPctOverrides,
  setTurnoPctManual,
  onRequestReset,
  onBeforeChange,
  semPctOverrides,
  semPctManual,
}) {
  const [semActiva, setSemActiva] = useState(0);
  const containerRef = useRef(null);
  const rrReduceRef = useRef({});
  const rrIncreaseRef = useRef({});
  const _dtLastPush = useRef(0);
  const _dtBefore = () => {
    try {
      if (onBeforeChange) {
        const n = Date.now();
        if (n - _dtLastPush.current > 300) {
          _dtLastPush.current = n;
          onBeforeChange();
        }
      }
    } catch {}
  };
  const _dtBeforeForced = () => {
    try {
      if (onBeforeChange) {
        _dtLastPush.current = 0;
        onBeforeChange(true);
      }
    } catch {}
  };

  const cambiarSemana = (i) => {
    setSemActiva(i);
    setTimeout(() => {
      containerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 30);
  };
  const grupos = ["Arranque", "Envion", "Tirones", "Piernas"];

  const calcSemana = (sem) => {
    const result = {};
    grupos.forEach((g) => {
      const countPorTurno = sem.turnos.map(
        (turno) =>
          turno.ejercicios.filter((ej) => {
            return ej.ejercicio_id && getGrupo(ej.ejercicio_id) === g;
          }).length,
      );
      const totalGrupo = countPorTurno.reduce((s, v) => s + v, 0);
      // Largest-remainder: garantiza suma exactamente 100
      const pctPorTurno = (() => {
        if (totalGrupo === 0) return countPorTurno.map(() => 0);
        const exact = countPorTurno.map((c) => (c / totalGrupo) * 100);
        const floors = exact.map(Math.floor);
        const rem = 100 - floors.reduce((s, v) => s + v, 0);
        const order = exact
          .map((v, i) => [v - Math.floor(v), i])
          .sort((a, b) => b[0] - a[0]);
        order.slice(0, rem).forEach(([, i]) => floors[i]++);
        return floors;
      })();
      const idsPorTurno = sem.turnos.map((turno) =>
        turno.ejercicios
          .filter((ej) => ej.ejercicio_id && getGrupo(ej.ejercicio_id) === g)
          .map((ej) => Number(ej.ejercicio_id)),
      );
      result[g] = { countPorTurno, totalGrupo, pctPorTurno, idsPorTurno };
    });
    return result;
  };

  const sem = semanas[semActiva];
  const data = calcSemana(sem);
  const turnos = sem.turnos;
  const hasData = grupos.some((g) => data[g].totalGrupo > 0);

  // Helper: % efectivo de un grupo en una semana (respeta overrides de ResumenGrupos)
  const _getSemPct = (g, sIdx) => {
    const k = `${g}-${sIdx}`;
    if (semPctManual?.has(k)) return Number(semPctOverrides?.[k]) || 0;
    const { porGrupo, totalSem } = calcSembradoSemana(semanas[sIdx]);
    return totalSem > 0 ? (porGrupo[g].total / totalSem) * 100 : 0;
  };

  const toIntPct = (val) => {
    const n = Number(val);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(100, Math.round(n)));
  };

  const distributeReduction = (baseVals, keys, amount, rrKey = "default") => {
    const vals = { ...baseVals };
    let pending = Math.max(0, Math.round(amount));
    let cursor = rrReduceRef.current[rrKey] || 0;
    while (pending > 0) {
      const candidates = keys.filter((k) => (vals[k] || 0) > 0);
      if (candidates.length === 0) break;
      const start = cursor % candidates.length;
      for (let i = 0; i < candidates.length; i += 1) {
        const k = candidates[(start + i) % candidates.length];
        if (pending <= 0) break;
        if ((vals[k] || 0) > 0) {
          vals[k] -= 1;
          pending -= 1;
        }
      }
      cursor = (start + 1) % candidates.length;
    }
    rrReduceRef.current[rrKey] = cursor;
    return vals;
  };

  const distributeIncrease = (baseVals, keys, amount, rrKey = "default") => {
    const vals = { ...baseVals };
    let pending = Math.max(0, Math.round(amount));
    let cursor = rrIncreaseRef.current[rrKey] || 0;
    while (pending > 0) {
      const candidates = keys.filter((k) => (vals[k] || 0) < 100);
      if (candidates.length === 0) break;
      const start = cursor % candidates.length;
      for (let i = 0; i < candidates.length; i += 1) {
        const k = candidates[(start + i) % candidates.length];
        if (pending <= 0) break;
        if ((vals[k] || 0) < 100) {
          vals[k] += 1;
          pending -= 1;
        }
      }
      cursor = (start + 1) % candidates.length;
    }
    rrIncreaseRef.current[rrKey] = cursor;
    return vals;
  };

  const getVal = (g, tIdx) => {
    const k = `${g}-${semActiva}-${tIdx}`;
    const raw = turnoPctManual.has(k)
      ? turnoPctOverrides[k]
      : data[g].pctPorTurno[tIdx];
    return raw !== undefined && raw !== "" ? Math.round(Number(raw)) : raw;
  };
  const isManual = (g, tIdx) => turnoPctManual.has(`${g}-${semActiva}-${tIdx}`);
  const setVal = (g, tIdx, val) => {
    const k = `${g}-${semActiva}-${tIdx}`;
    setTurnoPctOverrides((prev) => ({
      ...prev,
      [k]: val === "" ? "" : toIntPct(val),
    }));
    setTurnoPctManual((prev) => new Set([...prev, k]));
  };
  const applyStepVal = (g, tIdx, delta) => {
    _dtBefore();
    const d = data[g];
    const turnKeys = d.pctPorTurno
      .map((_, idx) => idx)
      .filter(
        (idx) => d.countPorTurno[idx] > 0 || isManual(g, idx) || idx === tIdx,
      );
    const vals = {};
    turnKeys.forEach((idx) => {
      vals[idx] = toIntPct(getVal(g, idx));
    });

    const prevSum = turnKeys.reduce((acc, idx) => acc + (vals[idx] || 0), 0);
    const current = vals[tIdx] || 0;
    let applied = toIntPct(current + delta) - current;
    if (applied === 0) return;

    if (applied > 0) {
      const otherKeys = turnKeys.filter(
        (idx) => idx !== tIdx && (vals[idx] || 0) > 0,
      );
      const capacity = otherKeys.reduce(
        (acc, idx) => acc + (vals[idx] || 0),
        0,
      );
      const neededWhenNormal = Math.max(0, prevSum + applied - 100);
      const required =
        prevSum > 100 ? Math.min(applied, capacity) : neededWhenNormal;
      const missing = Math.max(0, required - capacity);
      if (missing > 0 && prevSum <= 100) {
        applied = Math.max(0, applied - missing);
      }
      if (applied === 0) return;

      vals[tIdx] = current + applied;
      const balanceAmount =
        prevSum > 100
          ? Math.min(applied, capacity)
          : Math.max(0, prevSum + applied - 100);
      const reduced = distributeReduction(
        vals,
        otherKeys,
        balanceAmount,
        `sem-${semActiva}-g-${g}`,
      );

      const updates = {};
      const changed = [];
      turnKeys.forEach((idx) => {
        const nextVal = toIntPct(reduced[idx] || 0);
        if (nextVal !== toIntPct(getVal(g, idx))) {
          updates[`${g}-${semActiva}-${idx}`] = nextVal;
          changed.push(`${g}-${semActiva}-${idx}`);
        }
      });
      if (Object.keys(updates).length === 0) return;
      setTurnoPctOverrides((prev) => ({ ...prev, ...updates }));
      setTurnoPctManual((prev) => new Set([...prev, ...changed]));
      return;
    }

    let dec = Math.abs(applied);
    const otherKeys = turnKeys.filter(
      (idx) => idx !== tIdx && (vals[idx] || 0) > 0 && (vals[idx] || 0) < 100,
    );
    const capacityUp = otherKeys.reduce(
      (acc, idx) => acc + (100 - (vals[idx] || 0)),
      0,
    );
    const neededWhenNormal = Math.max(0, 100 - (prevSum - dec));
    const required =
      prevSum < 100 ? Math.min(dec, capacityUp) : neededWhenNormal;
    const missing = Math.max(0, required - capacityUp);
    if (missing > 0 && prevSum >= 100) {
      dec = Math.max(0, dec - missing);
    }
    if (dec === 0) return;

    vals[tIdx] = current - dec;
    const balanceAmount =
      prevSum < 100
        ? Math.min(dec, capacityUp)
        : Math.max(0, 100 - (prevSum - dec));
    const increased = distributeIncrease(
      vals,
      otherKeys,
      balanceAmount,
      `sem-${semActiva}-g-${g}`,
    );

    const updates = {};
    const changed = [];
    turnKeys.forEach((idx) => {
      const nextVal = toIntPct(increased[idx] || 0);
      if (nextVal !== toIntPct(getVal(g, idx))) {
        updates[`${g}-${semActiva}-${idx}`] = nextVal;
        changed.push(`${g}-${semActiva}-${idx}`);
      }
    });
    if (Object.keys(updates).length === 0) return;
    setTurnoPctOverrides((prev) => ({ ...prev, ...updates }));
    setTurnoPctManual((prev) => new Set([...prev, ...changed]));
  };
  const resetSingleVal = (g, tIdx, e) => {
    if (e.detail === 2) {
      _dtBeforeForced(); // push A
      const k = `${g}-${semActiva}-${tIdx}`;
      setTurnoPctManual((prev) => {
        const s = new Set(prev);
        s.delete(k);
        return s;
      });
      setTimeout(() => {
        try {
          if (onBeforeChange) {
            _dtLastPush.current = 0;
            onBeforeChange(true);
          }
        } catch {}
      }, 0); // push B
    }
  };

  // Suma de % por fila de grupo (debe ser 100 por grupo en la semana activa)
  const sumByGrupo = {};
  grupos.forEach((g) => {
    const raw = data[g].pctPorTurno.reduce(
      (acc, _, tIdx) => acc + (Number(getVal(g, tIdx)) || 0),
      0,
    );
    sumByGrupo[g] = Math.round(raw);
  });

  const thBase = {
    padding: "5px 6px",
    background: "var(--surface2)",
    border: "1px solid var(--border)",
    borderRadius: 5,
    textAlign: "center",
    fontSize: 11,
  };

  const [tooltip, setTooltip] = useState(null);
  const [cellTip, setCellTip] = useState(null);

  const buildTooltip = (s) => {
    const resumen = [];
    s.turnos.forEach((t, tIdx) => {
      const ids = t.ejercicios
        .filter((e) => e.ejercicio_id)
        .map((e) => Number(e.ejercicio_id));
      if (ids.length === 0) return;
      resumen.push({ turno: tIdx + 1, dia: t.dia, momento: t.momento, ids });
    });
    return resumen;
  };

  const manualInSem = [...turnoPctManual].filter((k) =>
    k.includes(`-${semActiva}-`),
  ).length;

  return (
    <div ref={containerRef} style={{ marginTop: 16 }}>
      {/* Tabs de semanas */}
      <div
        className="semana-tabs"
        style={{ marginBottom: 10, position: "relative" }}
      >
        {semanas.map((s, i) => (
          <div
            key={s.id}
            style={{ position: "relative", display: "inline-block" }}
          >
            <button
              className={`semana-tab${semActiva === i ? " active" : ""}`}
              onClick={() => cambiarSemana(i)}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setTooltip({ semIdx: i, x: rect.left, y: rect.top });
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              Semana {s.numero}
            </button>
            {tooltip?.semIdx === i &&
              (() => {
                const resumen = buildTooltip(s);
                const totalEjs = resumen.reduce((a, t) => a + t.ids.length, 0);
                return (
                  <div
                    style={{
                      position: "fixed",
                      left: tooltip.x,
                      bottom: `calc(100vh - ${tooltip.y}px + 6px)`,
                      top: "auto",
                      zIndex: 200,
                      minWidth: "fit-content",
                      maxWidth: "80vw",
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      boxShadow: "0 8px 32px rgba(0,0,0,.5)",
                      padding: "12px 14px",
                      pointerEvents: "none",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "'Bebas Neue'",
                        fontSize: 17,
                        color: "var(--gold)",
                        letterSpacing: ".05em",
                        marginBottom: 8,
                        lineHeight: 1,
                      }}
                    >
                      Semana {s.numero}
                      <span
                        style={{
                          fontFamily: "'DM Sans'",
                          fontSize: 11,
                          color: "var(--muted)",
                          fontWeight: 400,
                          marginLeft: 8,
                        }}
                      >
                        {totalEjs} ejs · {resumen.length} turnos
                      </span>
                    </div>
                    {resumen.length === 0 ? (
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>
                        Sin ejercicios sembrados
                      </div>
                    ) : (
                      resumen.map((t) => (
                        <div
                          key={t.turno}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "4px 0",
                            borderTop: "1px solid var(--border)",
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "'Bebas Neue'",
                              fontSize: 14,
                              color: "var(--gold)",
                              minWidth: 22,
                              flexShrink: 0,
                            }}
                          >
                            T{t.turno}
                          </span>
                          {t.dia && (
                            <span
                              style={{
                                fontSize: 10,
                                color: "var(--blue)",
                                fontWeight: 600,
                                minWidth: 46,
                                flexShrink: 0,
                              }}
                            >
                              {t.dia.slice(0, 3)}
                              {t.momento ? ` ${t.momento.slice(0, 1)}` : ""}
                            </span>
                          )}
                          <div
                            style={{
                              display: "flex",
                              gap: 4,
                              flex: 1,
                              flexWrap: "wrap",
                            }}
                          >
                            {t.ids.map((id, k) => {
                              const ej = EJERCICIOS.find((e) => e.id === id);
                              const col = ej
                                ? CAT_COLOR[ej.categoria]
                                : "var(--muted)";
                              return (
                                <span
                                  key={k}
                                  style={{
                                    background: `${col}20`,
                                    color: col,
                                    fontSize: 10,
                                    fontWeight: 700,
                                    padding: "1px 5px",
                                    borderRadius: 4,
                                  }}
                                >
                                  {id}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                );
              })()}
          </div>
        ))}
      </div>

      {manualInSem > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 8,
            padding: "4px 10px",
            background: "transparent",
            border: "none",
            borderRadius: 7,
          }}
        >
          <span style={{ fontSize: 11, color: "var(--muted)" }}>
            ✏ {manualInSem}{" "}
            {manualInSem === 1 ? "valor modificado" : "valores modificados"}
          </span>
          <button
            onClick={() =>
              onRequestReset(
                `distribución de turnos — Semana ${semActiva + 1}`,
                () => {
                  const toRemove = [...turnoPctManual].filter((k) =>
                    k.includes(`-${semActiva}-`),
                  );
                  setTurnoPctManual((prev) => {
                    const s = new Set(prev);
                    toRemove.forEach((k) => s.delete(k));
                    return s;
                  });
                },
              )
            }
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              color: "var(--muted)",
              fontSize: 10,
              padding: "2px 4px",
              cursor: "pointer",
              textDecoration: "underline",
            }}
            onMouseEnter={(e) => (e.target.style.color = "var(--text)")}
            onMouseLeave={(e) => (e.target.style.color = "var(--muted)")}
          >
            resetear semana
          </button>
        </div>
      )}

      {!hasData ? (
        <div
          style={{
            padding: "16px 12px",
            textAlign: "center",
            color: "var(--muted)",
            fontSize: 12,
          }}
        >
          Sin ejercicios sembrados en esta semana
        </div>
      ) : (
        <div
          style={{
            overflowX: "auto",
            overflowY: "auto",
            maxHeight: "52vh",
            overscrollBehavior: "contain",
          }}
        >
          <table
            style={{
              borderCollapse: "separate",
              borderSpacing: 3,
              minWidth: 600,
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    ...thBase,
                    textAlign: "left",
                    width: 110,
                    fontSize: 10,
                    color: "var(--muted)",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: ".07em",
                  }}
                >
                  Grupo
                </th>
                {turnos.map((t, i) => (
                  <th key={i} style={thBase}>
                    <div
                      style={{
                        fontFamily: "'Bebas Neue'",
                        fontSize: 13,
                        color: "var(--gold)",
                        lineHeight: 1,
                      }}
                    >
                      T{i + 1}
                    </div>
                    {t.dia && (
                      <div
                        style={{
                          fontSize: 8,
                          color: "var(--muted)",
                          marginTop: 1,
                          lineHeight: 1,
                        }}
                      >
                        {t.dia.slice(0, 3)}
                        {t.momento ? ` ${t.momento.slice(0, 1)}` : ""}
                      </div>
                    )}
                  </th>
                ))}
                <th
                  style={{ ...thBase, border: "1px solid rgba(232,197,71,.3)" }}
                >
                  <div
                    style={{
                      fontFamily: "'Bebas Neue'",
                      fontSize: 13,
                      color: "var(--gold)",
                      lineHeight: 1,
                    }}
                  >
                    Total
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {grupos.map((g) => {
                const d = data[g];
                if (d.totalGrupo === 0) return null;
                const col = CAT_COLOR[g];
                const rowSum = sumByGrupo[g];
                const rowOk = Math.abs(rowSum - 100) < 0.01;
                return (
                  <tr key={g}>
                    <td
                      style={{
                        padding: "5px 8px",
                        fontFamily: "'Bebas Neue'",
                        fontSize: 14,
                        color: col,
                        letterSpacing: ".03em",
                      }}
                    >
                      {g}
                    </td>
                    {d.pctPorTurno.map((calcPct, tIdx) => {
                      const manual = isManual(g, tIdx);
                      const val = getVal(g, tIdx);
                      const hasEjs = d.countPorTurno[tIdx] > 0;
                      return (
                        <td
                          key={tIdx}
                          style={{
                            padding: "4px 5px",
                            textAlign: "center",
                            background: hasEjs ? `${col}0d` : "transparent",
                            border: `1px solid ${manual ? `${col}80` : hasEjs ? `${col}30` : "var(--border)"}`,
                            borderRadius: 5,
                            position: "relative",
                          }}
                          onMouseEnter={(e) => {
                            if (!hasEjs && !manual) return;
                            const rect =
                              e.currentTarget.getBoundingClientRect();
                            setCellTip({ g, tIdx, x: rect.left, y: rect.top });
                          }}
                          onMouseLeave={() => setCellTip(null)}
                        >
                          {manual && (
                            <span
                              style={{
                                position: "absolute",
                                top: 2,
                                right: 3,
                                width: 4,
                                height: 4,
                                borderRadius: "50%",
                                background: "var(--blue)",
                              }}
                            />
                          )}
                          {hasEjs || manual ? (
                            <>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "baseline",
                                  justifyContent: "center",
                                  gap: 1,
                                }}
                              >
                                <input
                                  name="field_28"
                                  type="number"
                                  className="no-spin"
                                  value={val ?? ""}
                                  placeholder="0"
                                  title={
                                    manual
                                      ? "Modificado · doble click para resetear"
                                      : "% en este turno"
                                  }
                                  onFocus={_dtBefore}
                                  onChange={(e) =>
                                    setVal(g, tIdx, e.target.value)
                                  }
                                  onClick={(e) => resetSingleVal(g, tIdx, e)}
                                  style={{
                                    width: 38,
                                    background: "transparent",
                                    border: "none",
                                    fontFamily: "'Bebas Neue'",
                                    fontSize: 16,
                                    textAlign: "right",
                                    color: col,
                                    lineHeight: 1,
                                    outline: "none",
                                    padding: 0,
                                    MozAppearance: "textfield",
                                    appearance: "textfield",
                                    cursor: "text",
                                  }}
                                />
                                <span
                                  style={{
                                    fontFamily: "'Bebas Neue'",
                                    fontSize: 11,
                                    color: col,
                                    lineHeight: 1,
                                  }}
                                >
                                  %
                                </span>
                                <div
                                  data-no-tooltip="1"
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 1,
                                    marginLeft: 8,
                                  }}
                                  onMouseEnter={(e) => {
                                    e.stopPropagation();
                                    setCellTip(null);
                                  }}
                                  onMouseLeave={(e) => {
                                    e.stopPropagation();
                                    const td = e.currentTarget.closest("td");
                                    const next = e.relatedTarget;
                                    const isBackToValueArea =
                                      td &&
                                      next &&
                                      td.contains(next) &&
                                      !next.closest?.('[data-no-tooltip="1"]');
                                    if (isBackToValueArea) {
                                      const rect = td.getBoundingClientRect();
                                      setCellTip({
                                        g,
                                        tIdx,
                                        x: rect.left,
                                        y: rect.top,
                                      });
                                    }
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={() => applyStepVal(g, tIdx, 1)}
                                    title="Subir 1%"
                                    style={{
                                      border: "none",
                                      background: "transparent",
                                      color: col,
                                      fontSize: 9,
                                      lineHeight: 1,
                                      cursor: "pointer",
                                      padding: 0,
                                    }}
                                    onMouseEnter={(e) => {
                                      e.stopPropagation();
                                      setCellTip(null);
                                    }}
                                  >
                                    ▲
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => applyStepVal(g, tIdx, -1)}
                                    title="Bajar 1%"
                                    style={{
                                      border: "none",
                                      background: "transparent",
                                      color: col,
                                      fontSize: 9,
                                      lineHeight: 1,
                                      cursor: "pointer",
                                      padding: 0,
                                    }}
                                    onMouseEnter={(e) => {
                                      e.stopPropagation();
                                      setCellTip(null);
                                    }}
                                  >
                                    ▼
                                  </button>
                                </div>
                              </div>
                              {(() => {
                                // Fix % Semanal: usa meso.semanas directo (siempre actualizado)
                                const volSem = meso
                                  ? meso.volumen_total *
                                    (meso.semanas[semActiva].pct_volumen / 100)
                                  : 0;
                                // Fix % Bloques: usa _getSemPct (respeta overrides de ResumenGrupos)
                                const pctGSem = _getSemPct(g, semActiva) / 100;
                                const reps = Math.round(
                                  (volSem *
                                    pctGSem *
                                    (Number(getVal(g, tIdx)) || 0)) /
                                    100,
                                );
                                return reps > 0 ? (
                                  <div
                                    style={{
                                      fontSize: 11,
                                      color: col,
                                      fontFamily: "'Bebas Neue'",
                                      lineHeight: 1,
                                      marginTop: 2,
                                    }}
                                  >
                                    {reps}
                                    <span
                                      style={{
                                        fontSize: 9,
                                        color: "var(--muted)",
                                        fontFamily: "'DM Sans'",
                                        marginLeft: 2,
                                      }}
                                    >
                                      reps
                                    </span>
                                  </div>
                                ) : null;
                              })()}
                              {cellTip?.g === g && cellTip?.tIdx === tIdx && (
                                <div
                                  style={{
                                    position: "fixed",
                                    left: cellTip.x,
                                    bottom: `calc(100vh - ${cellTip.y}px + 6px)`,
                                    top: "auto",
                                    zIndex: 200,
                                    minWidth: "fit-content",
                                    maxWidth: "80vw",
                                    background: "var(--surface)",
                                    border: `1px solid ${col}50`,
                                    borderRadius: 10,
                                    boxShadow: "0 8px 32px rgba(0,0,0,.5)",
                                    padding: "8px 12px",
                                    pointerEvents: "none",
                                    textAlign: "left",
                                  }}
                                >
                                  <div
                                    style={{
                                      fontFamily: "'Bebas Neue'",
                                      fontSize: 16,
                                      color: col,
                                      marginBottom: 8,
                                      lineHeight: 1,
                                    }}
                                  >
                                    {g} — T{tIdx + 1}
                                    {turnos[tIdx]?.dia && (
                                      <span
                                        style={{
                                          fontFamily: "'DM Sans'",
                                          fontSize: 10,
                                          color: "var(--blue)",
                                          fontWeight: 600,
                                          marginLeft: 8,
                                        }}
                                      >
                                        {turnos[tIdx].dia.slice(0, 3)}
                                        {turnos[tIdx].momento
                                          ? ` ${turnos[tIdx].momento.slice(0, 1)}`
                                          : ""}
                                      </span>
                                    )}
                                  </div>
                                  <div
                                    style={{
                                      display: "flex",
                                      gap: 6,
                                      flexWrap: "wrap",
                                    }}
                                  >
                                    {d.idsPorTurno[tIdx].map((id, k) => (
                                      <span
                                        key={k}
                                        style={{
                                          fontFamily: "'Bebas Neue'",
                                          background: `${col}20`,
                                          color: col,
                                          fontSize: 20,
                                          lineHeight: 1,
                                          padding: "3px 10px",
                                          borderRadius: 5,
                                        }}
                                      >
                                        {id}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <span
                              style={{ color: "var(--muted)", fontSize: 11 }}
                            >
                              —
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td
                      style={{
                        padding: "4px 5px",
                        textAlign: "center",
                        background: rowOk ? `${col}14` : "rgba(232,71,71,.08)",
                        border: `1px solid ${rowOk ? `${col}40` : "rgba(232,71,71,.4)"}`,
                        borderRadius: 5,
                        position: "relative",
                        cursor: "default",
                      }}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltip({
                          type: "dtTotal",
                          g,
                          x: rect.left,
                          y: rect.top,
                        });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      <div
                        style={{
                          fontFamily: "'Bebas Neue'",
                          fontSize: 16,
                          color: rowOk ? col : "var(--red)",
                          lineHeight: 1,
                        }}
                      >
                        {rowOk ? "100%" : `${rowSum}%`}
                      </div>
                      <div
                        style={{
                          fontSize: 9,
                          color: rowOk ? "var(--muted)" : "var(--red)",
                          marginTop: 1,
                          fontWeight: rowOk ? 400 : 700,
                        }}
                      >
                        {rowOk ? `${d.totalGrupo} ejs` : "≠ 100"}
                      </div>
                      {tooltip?.type === "dtTotal" &&
                        tooltip?.g === g &&
                        (() => {
                          return (
                            <div
                              style={{
                                position: "fixed",
                                left: tooltip.x,
                                bottom: `calc(100vh - ${tooltip.y}px + 6px)`,
                                top: "auto",
                                zIndex: 200,
                                minWidth: "fit-content",
                                maxWidth: "80vw",
                                background: "var(--surface)",
                                border: `1px solid ${col}50`,
                                borderRadius: 10,
                                boxShadow: "0 8px 32px rgba(0,0,0,.5)",
                                padding: "10px 12px",
                                pointerEvents: "none",
                                textAlign: "left",
                              }}
                            >
                              <div
                                style={{
                                  fontFamily: "'Bebas Neue'",
                                  fontSize: 15,
                                  color: col,
                                  letterSpacing: ".05em",
                                  marginBottom: 6,
                                  lineHeight: 1,
                                }}
                              >
                                {g} — Sem {semActiva + 1}
                              </div>
                              {d.idsPorTurno.map((ids, tIdx) => {
                                if (!ids.length) return null;
                                return (
                                  <div
                                    key={tIdx}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 6,
                                      padding: "6px 0",
                                      borderTop: "1px solid var(--border)",
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontFamily: "'Bebas Neue'",
                                        fontSize: 16,
                                        color: "var(--gold)",
                                        minWidth: 24,
                                        flexShrink: 0,
                                      }}
                                    >
                                      T{tIdx + 1}
                                    </span>
                                    {turnos[tIdx]?.dia && (
                                      <span
                                        style={{
                                          fontSize: 10,
                                          color: "var(--blue)",
                                          fontWeight: 600,
                                          minWidth: 44,
                                          flexShrink: 0,
                                        }}
                                      >
                                        {turnos[tIdx].dia.slice(0, 3)}
                                        {turnos[tIdx].momento
                                          ? ` ${turnos[tIdx].momento.slice(0, 1)}`
                                          : ""}
                                      </span>
                                    )}
                                    <div
                                      style={{
                                        display: "flex",
                                        gap: 4,
                                        flexWrap: "wrap",
                                      }}
                                    >
                                      {ids.map((id, k) => (
                                        <span
                                          key={k}
                                          style={{
                                            fontFamily: "'Bebas Neue'",
                                            background: `${col}20`,
                                            color: col,
                                            fontSize: 18,
                                            lineHeight: 1,
                                            padding: "2px 8px",
                                            borderRadius: 4,
                                          }}
                                        >
                                          {id}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
