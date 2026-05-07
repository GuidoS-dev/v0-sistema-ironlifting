import { useState, useRef } from "react";
import { Library } from "lucide-react";
import { CAT_COLOR } from "../../data/constantes";
import { calcSembradoSemana, getGrupo } from "../../lib/calc";

export function ResumenGrupos({
  semanas,
  meso,
  semPctOverrides,
  semPctManual,
  setSemPctOverrides,
  setSemPctManual,
  onRequestReset,
  onGuardarDistribucion,
  onBeforeChange,
}) {
  const grupos = ["Arranque", "Envion", "Tirones", "Piernas"];
  const [tooltip, setTooltip] = useState(null);
  const _rgLastPush = useRef(0);
  const rrReduceRef = useRef({});
  const rrIncreaseRef = useRef({});
  const _rgBefore = () => {
    try {
      if (onBeforeChange) {
        const n = Date.now();
        if (n - _rgLastPush.current > 300) {
          _rgLastPush.current = n;
          onBeforeChange();
        }
      }
    } catch {}
  };
  const _rgBeforeForced = () => {
    try {
      if (onBeforeChange) {
        _rgLastPush.current = 0;
        onBeforeChange(true);
      }
    } catch {}
  };

  const bySemana = semanas.map((sem) => {
    const { porGrupo, totalSem: total } = calcSembradoSemana(sem);
    const conteo = {};
    grupos.forEach((g) => {
      conteo[g] = porGrupo[g].total;
    });
    // Largest-remainder para que la suma sea exactamente 100
    const exact = grupos.map((g) =>
      total > 0 ? (porGrupo[g].total / total) * 100 : 0,
    );
    const floors = exact.map(Math.floor);
    const rem = 100 - floors.reduce((a, b) => a + b, 0);
    exact
      .map((v, i) => [v - Math.floor(v), i])
      .sort((a, b) => b[0] - a[0])
      .slice(0, rem)
      .forEach(([, i]) => floors[i]++);
    const pcts = {};
    grupos.forEach((g, i) => {
      pcts[g] = conteo[g] > 0 ? floors[i] : 0;
    });
    return { conteo, total, pcts };
  });

  const totalConteo = { Arranque: 0, Envion: 0, Tirones: 0, Piernas: 0 };
  let grandTotal = 0;
  bySemana.forEach((s) => {
    grupos.forEach((g) => {
      totalConteo[g] += s.conteo[g];
    });
    grandTotal += s.total;
  });
  // Largest-remainder para totalPcts también
  const totalPcts = {};
  {
    const exact = grupos.map((g) =>
      grandTotal > 0 ? (totalConteo[g] / grandTotal) * 100 : 0,
    );
    const floors = exact.map(Math.floor);
    const rem = 100 - floors.reduce((a, b) => a + b, 0);
    exact
      .map((v, i) => [v - Math.floor(v), i])
      .sort((a, b) => b[0] - a[0])
      .slice(0, rem)
      .forEach(([, i]) => floors[i]++);
    grupos.forEach((g, i) => {
      totalPcts[g] = totalConteo[g] > 0 ? floors[i] : 0;
    });
  }

  if (grandTotal === 0) return null;

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

  const getVal = (g, sIdx) => {
    const k = `${g}-${sIdx}`;
    const raw = semPctManual.has(k)
      ? semPctOverrides[k]
      : bySemana[sIdx].pcts[g];
    return raw !== undefined && raw !== "" ? Math.round(Number(raw)) : raw;
  };
  const isManual = (g, sIdx) => semPctManual.has(`${g}-${sIdx}`);
  const setVal = (g, sIdx, val) => {
    const k = `${g}-${sIdx}`;
    setSemPctOverrides((prev) => ({
      ...prev,
      [k]: val === "" ? "" : toIntPct(val),
    }));
    setSemPctManual((prev) => new Set([...prev, k]));
  };
  const applyStepVal = (g, sIdx, delta) => {
    _rgBefore();
    const activeGroups = grupos.filter(
      (gx) => bySemana[sIdx].conteo[gx] > 0 || isManual(gx, sIdx) || gx === g,
    );
    const vals = {};
    activeGroups.forEach((gx) => {
      vals[gx] = toIntPct(getVal(gx, sIdx));
    });

    const prevSum = activeGroups.reduce((acc, gx) => acc + (vals[gx] || 0), 0);
    const current = vals[g] || 0;
    let applied = toIntPct(current + delta) - current;
    if (applied === 0) return;

    if (applied > 0) {
      const otherKeys = activeGroups.filter(
        (gx) => gx !== g && (vals[gx] || 0) > 0,
      );
      const capacity = otherKeys.reduce((acc, gx) => acc + (vals[gx] || 0), 0);
      const neededWhenNormal = Math.max(0, prevSum + applied - 100);
      const required =
        prevSum > 100 ? Math.min(applied, capacity) : neededWhenNormal;
      const missing = Math.max(0, required - capacity);
      if (missing > 0 && prevSum <= 100) {
        applied = Math.max(0, applied - missing);
      }
      if (applied === 0) return;

      vals[g] = current + applied;
      const balanceAmount =
        prevSum > 100
          ? Math.min(applied, capacity)
          : Math.max(0, prevSum + applied - 100);
      const reduced = distributeReduction(
        vals,
        otherKeys,
        balanceAmount,
        `sem-${sIdx}`,
      );

      const updates = {};
      const changed = [];
      activeGroups.forEach((gx) => {
        const nextVal = toIntPct(reduced[gx] || 0);
        if (nextVal !== toIntPct(getVal(gx, sIdx))) {
          updates[`${gx}-${sIdx}`] = nextVal;
          changed.push(`${gx}-${sIdx}`);
        }
      });
      if (Object.keys(updates).length === 0) return;
      setSemPctOverrides((prev) => ({ ...prev, ...updates }));
      setSemPctManual((prev) => new Set([...prev, ...changed]));
      return;
    }

    let dec = Math.abs(applied);
    const otherKeys = activeGroups.filter(
      (gx) => gx !== g && (vals[gx] || 0) > 0 && (vals[gx] || 0) < 100,
    );
    const capacityUp = otherKeys.reduce(
      (acc, gx) => acc + (100 - (vals[gx] || 0)),
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

    vals[g] = current - dec;
    const balanceAmount =
      prevSum < 100
        ? Math.min(dec, capacityUp)
        : Math.max(0, 100 - (prevSum - dec));
    const increased = distributeIncrease(
      vals,
      otherKeys,
      balanceAmount,
      `sem-${sIdx}`,
    );

    const updates = {};
    const changed = [];
    activeGroups.forEach((gx) => {
      const nextVal = toIntPct(increased[gx] || 0);
      if (nextVal !== toIntPct(getVal(gx, sIdx))) {
        updates[`${gx}-${sIdx}`] = nextVal;
        changed.push(`${gx}-${sIdx}`);
      }
    });
    if (Object.keys(updates).length === 0) return;
    setSemPctOverrides((prev) => ({ ...prev, ...updates }));
    setSemPctManual((prev) => new Set([...prev, ...changed]));
  };
  const resetSingleVal = (g, sIdx, e) => {
    if (e.detail === 2) {
      _rgBeforeForced(); // push A
      const k = `${g}-${sIdx}`;
      setSemPctManual((prev) => {
        const s = new Set(prev);
        s.delete(k);
        return s;
      });
      setTimeout(() => {
        try {
          if (onBeforeChange) {
            _rgLastPush.current = 0;
            onBeforeChange(true);
          }
        } catch {}
      }, 0); // push B
    }
  };

  // Suma de % por columna de semana (solo validar si hay ejercicios sembrados)
  const sumBySem = semanas.map((_, sIdx) => {
    if (bySemana[sIdx]?.total === 0) return 100; // sin sembrado → no validar
    const raw = grupos.reduce(
      (acc, g) => acc + (Number(getVal(g, sIdx)) || 0),
      0,
    );
    return Math.round(raw);
  });

  const buildDetalle = (g, semIdx) => {
    const sem = semanas[semIdx];
    const rows = [];
    sem.turnos.forEach((t, tIdx) => {
      const ids = t.ejercicios
        .filter((e) => e.ejercicio_id && getGrupo(e.ejercicio_id) === g)
        .map((e) => Number(e.ejercicio_id));
      if (ids.length > 0)
        rows.push({ turno: tIdx + 1, dia: t.dia, momento: t.momento, ids });
    });
    return rows;
  };

  const thBase = {
    padding: "6px 8px",
    background: "var(--surface2)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    textAlign: "center",
  };
  const manualCount = semPctManual.size;

  return (
    <div style={{ marginTop: 16, overflowX: "auto" }}>
      {manualCount > 0 && (
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
            ✏ {manualCount}{" "}
            {manualCount === 1 ? "valor modificado" : "valores modificados"}
          </span>
          {onGuardarDistribucion && (
            <button
              onClick={() => {
                const dist = { semPcts: {}, turnoPcts: {} };
                semanas.forEach((s, sIdx) => {
                  ["Arranque", "Envion", "Tirones", "Piernas"].forEach((g) => {
                    const k = `${g}-${sIdx}`;
                    if (semPctOverrides[k] !== undefined)
                      dist.semPcts[k] = semPctOverrides[k];
                  });
                });
                onGuardarDistribucion(dist);
              }}
              style={{
                background: "none",
                border: "none",
                color: "var(--muted)",
                fontSize: 10,
                padding: "2px 6px",
                cursor: "pointer",
                textDecoration: "underline",
              }}
              onMouseEnter={(e) => (e.target.style.color = "var(--text)")}
              onMouseLeave={(e) => (e.target.style.color = "var(--muted)")}
            >
              <Library size={10} /> guardar distribución
            </button>
          )}
          <button
            onClick={() =>
              onRequestReset("todos los % de grupos por semana", () => {
                setSemPctOverrides({});
                setSemPctManual(new Set());
              })
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
            resetear todo
          </button>
        </div>
      )}
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
            borderSpacing: 4,
            minWidth: 400,
            width: "100%",
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  ...thBase,
                  textAlign: "left",
                  width: 120,
                  fontSize: 10,
                  color: "var(--muted)",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: ".07em",
                }}
              />
              {semanas.map((s, sIdx) => {
                const sum = sumBySem[sIdx];
                const ok = Math.abs(sum - 100) < 0.01;
                const hasAnySembrado = bySemana[sIdx]?.total > 0;
                return (
                  <th
                    key={s.id}
                    style={{
                      ...thBase,
                      border: `1px solid ${ok ? "var(--border)" : "rgba(232,71,71,.5)"}`,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "'Bebas Neue'",
                        fontSize: 15,
                        color: "var(--gold)",
                        lineHeight: 1,
                      }}
                    >
                      Sem {s.numero}
                    </div>
                    {!ok ? (
                      <div
                        style={{
                          fontSize: 9,
                          marginTop: 1,
                          color: "var(--red)",
                          fontWeight: 700,
                        }}
                      >
                        Σ={sum}% ≠ 100
                      </div>
                    ) : hasAnySembrado ? (
                      <div
                        style={{
                          fontSize: 9,
                          marginTop: 1,
                          color: "var(--muted)",
                        }}
                      >
                        {bySemana[sIdx].total} ejs
                      </div>
                    ) : null}
                  </th>
                );
              })}
              <th
                style={{ ...thBase, border: "1px solid rgba(232,197,71,.3)" }}
              >
                <div
                  style={{
                    fontFamily: "'Bebas Neue'",
                    fontSize: 15,
                    color: "var(--gold)",
                    lineHeight: 1,
                  }}
                >
                  Total
                </div>
                <div
                  style={{ fontSize: 9, color: "var(--muted)", marginTop: 1 }}
                >
                  {grandTotal} ejs
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {grupos.map((g) => {
              if (!bySemana.some((s) => s.conteo[g] > 0)) return null;
              const col = CAT_COLOR[g];
              return (
                <tr key={g}>
                  <td
                    style={{
                      padding: "6px 10px",
                      fontFamily: "'Bebas Neue'",
                      fontSize: 15,
                      color: col,
                      letterSpacing: ".04em",
                    }}
                  >
                    {g}
                  </td>
                  {bySemana.map((s, sIdx) => {
                    const manual = isManual(g, sIdx);
                    const val = getVal(g, sIdx);
                    const semOk = Math.abs(sumBySem[sIdx] - 100) < 0.01;
                    return (
                      <td
                        key={sIdx}
                        style={{
                          padding: "6px 8px",
                          textAlign: "center",
                          background:
                            s.conteo[g] > 0 ? `${col}0d` : "transparent",
                          border: `1px solid ${manual ? `${col}70` : s.conteo[g] > 0 ? `${col}30` : "var(--border)"}`,
                          borderRadius: 6,
                          position: "relative",
                        }}
                        onMouseEnter={(e) => {
                          if (s.conteo[g] === 0 && !manual) return;
                          const rect = e.currentTarget.getBoundingClientRect();
                          setTooltip({
                            g,
                            semIdx: sIdx,
                            x: rect.left,
                            y: rect.top,
                          });
                        }}
                        onMouseLeave={() => setTooltip(null)}
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
                        {s.conteo[g] > 0 || manual ? (
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
                                name="field_27"
                                type="number"
                                className="no-spin"
                                value={val ?? ""}
                                placeholder="0"
                                title={
                                  manual
                                    ? "Modificado · doble click para resetear"
                                    : "% del grupo en esta semana"
                                }
                                onFocus={_rgBefore}
                                onChange={(e) =>
                                  setVal(g, sIdx, e.target.value)
                                }
                                onClick={(e) => resetSingleVal(g, sIdx, e)}
                                style={{
                                  width: 44,
                                  background: "transparent",
                                  border: "none",
                                  fontFamily: "'Bebas Neue'",
                                  fontSize: 20,
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
                                  fontSize: 13,
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
                                  setTooltip(null);
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
                                    setTooltip({
                                      g,
                                      semIdx: sIdx,
                                      x: rect.left,
                                      y: rect.top,
                                    });
                                  }
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => applyStepVal(g, sIdx, 1)}
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
                                    setTooltip(null);
                                  }}
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  onClick={() => applyStepVal(g, sIdx, -1)}
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
                                    setTooltip(null);
                                  }}
                                >
                                  ▼
                                </button>
                              </div>
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: col,
                                fontFamily: "'Bebas Neue'",
                                lineHeight: 1,
                                marginTop: 2,
                              }}
                            >
                              {meso
                                ? Math.round(
                                    meso.volumen_total *
                                      (semanas[sIdx].pct_volumen / 100) *
                                      ((Number(getVal(g, sIdx)) || 0) / 100),
                                  )
                                : ""}
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
                            {tooltip?.g === g &&
                              tooltip?.semIdx === sIdx &&
                              (() => {
                                const rows = buildDetalle(g, sIdx);
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
                                      {g} — Sem {sIdx + 1}
                                    </div>
                                    {rows.map((t) => (
                                      <div
                                        key={t.turno}
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
                                          T{t.turno}
                                        </span>
                                        {t.dia && (
                                          <span
                                            style={{
                                              fontSize: 10,
                                              color: "var(--blue)",
                                              fontWeight: 600,
                                              minWidth: 44,
                                              flexShrink: 0,
                                            }}
                                          >
                                            {t.dia.slice(0, 3)}
                                            {t.momento
                                              ? ` ${t.momento.slice(0, 1)}`
                                              : ""}
                                          </span>
                                        )}
                                        <div
                                          style={{
                                            display: "flex",
                                            gap: 5,
                                            flexWrap: "wrap",
                                          }}
                                        >
                                          {t.ids.map((id, k) => (
                                            <span
                                              key={k}
                                              style={{
                                                fontFamily: "'Bebas Neue'",
                                                background: `${col}20`,
                                                color: col,
                                                fontSize: 18,
                                                lineHeight: 1,
                                                padding: "2px 8px",
                                                borderRadius: 5,
                                              }}
                                            >
                                              {id}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                          </>
                        ) : (
                          <span style={{ color: "var(--muted)", fontSize: 12 }}>
                            —
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td
                    style={{
                      padding: "6px 8px",
                      textAlign: "center",
                      background: `${col}14`,
                      border: `1px solid ${col}40`,
                      borderRadius: 6,
                      position: "relative",
                      cursor: "default",
                    }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTooltip({
                        g,
                        type: "total",
                        x: rect.left,
                        y: rect.top,
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  >
                    <div
                      style={{
                        fontFamily: "'Bebas Neue'",
                        fontSize: 20,
                        color: col,
                        lineHeight: 1,
                      }}
                    >
                      {totalPcts[g]}%
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--muted)",
                        marginTop: 2,
                      }}
                    >
                      {totalConteo[g]} ejs
                    </div>
                    {tooltip?.g === g &&
                      tooltip?.type === "total" &&
                      (() => {
                        // Desglose por semana
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
                              {g} — Total mesociclo
                            </div>
                            {bySemana.map((s, sIdx) => {
                              if (s.conteo[g] === 0) return null;
                              const rows = buildDetalle(g, sIdx);
                              return (
                                <div
                                  key={sIdx}
                                  style={{
                                    padding: "6px 0",
                                    borderTop: "1px solid var(--border)",
                                  }}
                                >
                                  <div
                                    style={{
                                      fontFamily: "'Bebas Neue'",
                                      fontSize: 13,
                                      color: "var(--gold)",
                                      marginBottom: 3,
                                    }}
                                  >
                                    Sem {sIdx + 1}
                                  </div>
                                  {rows.map((t) => (
                                    <div
                                      key={t.turno}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 6,
                                        padding: "3px 0",
                                      }}
                                    >
                                      <span
                                        style={{
                                          fontFamily: "'Bebas Neue'",
                                          fontSize: 14,
                                          color: "var(--gold)",
                                          minWidth: 24,
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
                                            minWidth: 44,
                                            flexShrink: 0,
                                          }}
                                        >
                                          {t.dia.slice(0, 3)}
                                          {t.momento
                                            ? ` ${t.momento.slice(0, 1)}`
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
                                        {t.ids.map((id, k) => (
                                          <span
                                            key={k}
                                            style={{
                                              fontFamily: "'Bebas Neue'",
                                              background: `${col}20`,
                                              color: col,
                                              fontSize: 16,
                                              lineHeight: 1,
                                              padding: "2px 6px",
                                              borderRadius: 4,
                                            }}
                                          >
                                            {id}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
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
    </div>
  );
}
