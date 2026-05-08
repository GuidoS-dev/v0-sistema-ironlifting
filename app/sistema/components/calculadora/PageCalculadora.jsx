import { useState, useEffect } from "react";
import { Modal } from "../common/Modal";
import { INTENS_COLS, TABLA_DEFAULT } from "../../data/tablas-default";
import { readLocalJson, writeLocalJson, safeSetItem, emitLocalSyncEvent } from "../../lib/storage";
import { COACH_SETTING_KEYS, loadCoachSetting, saveCoachSetting } from "../../lib/coach-settings";
import { _visResume } from "../../lib/sync";

export function PageCalculadora({ coachId }) {
  const DEFAULT_DESCRIPTIONS = {
    tabla1: "",
    tabla2: "",
    tabla3: "",
    tabla4: "",
    tabla5: "",
  };

  const normalizeTablas = (value) => {
    if (!value || typeof value !== "object")
      return { ...TABLA_DEFAULT, _descriptions: { ...DEFAULT_DESCRIPTIONS } };
    const merged = { ...TABLA_DEFAULT };
    Object.keys(TABLA_DEFAULT).forEach((k) => {
      if (Array.isArray(value[k])) merged[k] = value[k];
    });
    merged._descriptions = {
      ...DEFAULT_DESCRIPTIONS,
      ...(value._descriptions || {}),
    };
    return merged;
  };

  const [tablas, setTablas] = useState(() => {
    const local = readLocalJson("liftplan_tablas", null);
    return normalizeTablas(local);
  });

  // Top tabs: IRM | Series/Reps
  const [seccion, setSeccion] = useState("irm");
  // Sub-tabs within each section
  const [tabIRM, setTabIRM] = useState("tabla1");
  const [tabSR, setTabSR] = useState("lookup_general");
  const [editCell, setEditCell] = useState(null);

  useEffect(() => {
    if (!coachId) return;
    let cancelled = false;

    const syncFromDb = async () => {
      const remote = await loadCoachSetting(coachId, COACH_SETTING_KEYS.tablas);
      if (cancelled) return;

      if (remote && typeof remote === "object") {
        const merged = normalizeTablas(remote);
        setTablas(merged);
        writeLocalJson("liftplan_tablas", merged);
        return;
      }

      const local = readLocalJson("liftplan_tablas", null);
      const seed = normalizeTablas(local);
      writeLocalJson("liftplan_tablas", seed);
      setTablas(seed);
      await saveCoachSetting(coachId, COACH_SETTING_KEYS.tablas, seed);
    };

    syncFromDb().catch(() => {});
    const unsub = _visResume.sub(() => syncFromDb().catch(() => {}));
    return () => {
      cancelled = true;
      unsub();
    };
  }, [coachId]);

  const saveTablas = (newTablas) => {
    setTablas(newTablas);
    writeLocalJson("liftplan_tablas", newTablas);
    if (coachId) {
      saveCoachSetting(coachId, COACH_SETTING_KEYS.tablas, newTablas);
    }
  };

  const updateCell = (tablaKey, irmIdx, col, val) => {
    const newVal = val === "" ? 0 : Number(val);
    const newTablas = { ...tablas };
    newTablas[tablaKey] = tablas[tablaKey].map((row, i) =>
      i === irmIdx ? { ...row, [col]: newVal } : row,
    );
    saveTablas(newTablas);
  };

  const updateLookup = (tablaKey, rowIdx, field, val) => {
    const newTablas = { ...tablas };
    newTablas[tablaKey] = tablas[tablaKey].map((row, i) =>
      i === rowIdx ? { ...row, [field]: val === "" ? 0 : Number(val) } : row,
    );
    saveTablas(newTablas);
  };

  const resetTabla = (tablaKey) => {
    if (!confirm("¿Restaurar esta tabla a los valores originales?")) return;
    saveTablas({ ...tablas, [tablaKey]: TABLA_DEFAULT[tablaKey] });
  };

  const rowSum = (row) => INTENS_COLS.reduce((s, c) => s + (row[c] || 0), 0);

  // IRM resultante: media ponderada = (pct50*50 + pct60*60 + ... + pct95*95) / 100
  const calcIRMresultante = (row) =>
    Math.round(INTENS_COLS.reduce((s, c) => s + (row[c] || 0) * c, 0)) / 100;

  // Suggestion state: { tablaKey, rIdx, pivotCol, pivotVal, suggested }
  const [suggestion, setSuggestion] = useState(null);
  const [testIRM, setTestIRM] = useState(null);
  const [testReps, setTestReps] = useState(14);

  // Auto-balance: fix pivot col, distribute remaining so IRM_calc = irm_nominal exactly
  // Uses two-col interpolation: finds two bracketing cols and splits weight between them
  const computeBalance = (row, pivotCol, pivotVal) => {
    const pVal = Math.min(100, Math.max(0, Number(pivotVal)));
    const remaining = 100 - pVal;
    const irmNominal = row.irm;

    // Active cols = those with value > 0, plus pivot (always active)
    let activeCols = INTENS_COLS.filter(
      (c) => c === pivotCol || (row[String(c)] || 0) > 0,
    );
    // Fallback: if no other active cols, use all adjacent to pivot
    const otherActive = activeCols.filter((c) => c !== pivotCol);
    const resolvedOther =
      otherActive.length > 0
        ? otherActive
        : INTENS_COLS.filter((c) => c !== pivotCol);

    // Build result zeroing non-active cols
    const suggested = {};
    INTENS_COLS.forEach((c) => {
      suggested[String(c)] = 0;
    });
    suggested[String(pivotCol)] = pVal;

    if (remaining <= 0) return { ...row, ...suggested };

    // Target: IRM_calc = irmNominal
    // pivot contrib: pVal * pivotCol / 100
    // other contrib needed: irmNominal - pVal * pivotCol / 100
    // other contrib = sum(w_i * c_i) / 100, sum(w_i) = remaining
    // → target avg intensity of other = (irmNominal - pVal*pivotCol/100) * 100 / remaining
    const pivotContrib = (pVal * pivotCol) / 100;
    const otherContrib = irmNominal - pivotContrib;
    const targetAvg = (otherContrib * 100) / remaining;

    const sortedOther = [...resolvedOther].sort((a, b) => a - b);
    const minI = sortedOther[0];
    const maxI = sortedOther[sortedOther.length - 1];
    const clampedTarget = Math.max(minI, Math.min(maxI, targetAvg));

    if (sortedOther.length === 1) {
      suggested[String(sortedOther[0])] = remaining;
      return { ...row, ...suggested };
    }

    // Find two bracketing cols
    let lowCol = sortedOther[0],
      highCol = sortedOther[sortedOther.length - 1];
    for (let i = 0; i < sortedOther.length - 1; i++) {
      if (
        sortedOther[i] <= clampedTarget &&
        clampedTarget <= sortedOther[i + 1]
      ) {
        lowCol = sortedOther[i];
        highCol = sortedOther[i + 1];
        break;
      }
    }

    const alpha =
      lowCol === highCol ? 0 : (clampedTarget - lowCol) / (highCol - lowCol);
    const highW = Math.round(alpha * remaining * 10) / 10;
    const lowW = Math.round((remaining - highW) * 10) / 10;

    suggested[String(lowCol)] = lowW;
    suggested[String(highCol)] = highW;

    return { ...row, ...suggested };
  };

  const applySuggestion = () => {
    if (!suggestion) return;
    const { tablaKey, rIdx, suggested } = suggestion;
    const newTablas = { ...tablas };
    newTablas[tablaKey] = tablas[tablaKey].map((row, i) =>
      i === rIdx ? suggested : row,
    );
    saveTablas(newTablas);
    setSuggestion(null);
  };

  // ── IRM distribution tables ─────────────────────────────────────────────
  const renderTablaIRM = (tablaKey) => {
    const rows = tablas[tablaKey];
    return (
      <div style={{ overflowX: "auto" }}>
        <table className="norm-table" style={{ fontSize: 12, minWidth: 620 }}>
          <thead>
            <tr>
              <th style={{ width: 48 }}>IRM</th>
              {INTENS_COLS.map((c) => (
                <th key={c} style={{ textAlign: "center", width: 56 }}>
                  {c}%
                </th>
              ))}
              <th style={{ textAlign: "center", width: 56 }}>Total</th>
              <th style={{ textAlign: "center", width: 64 }}>IRM calc.</th>
              <th style={{ width: 36 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rIdx) => {
              const total = rowSum(row);
              const ok = Math.round(total * 10) === 1000; // handles floats
              return (
                <tr key={row.irm}>
                  <td
                    style={{
                      fontFamily: "'Bebas Neue'",
                      fontSize: 16,
                      color: "var(--gold)",
                    }}
                  >
                    {row.irm}
                  </td>
                  {INTENS_COLS.map((col) => {
                    const key = String(col);
                    const isEditing =
                      editCell?.tabla === tablaKey &&
                      editCell?.rIdx === rIdx &&
                      editCell?.col === key;
                    return (
                      <td
                        key={col}
                        style={{ textAlign: "center", padding: "3px 4px" }}
                      >
                        {isEditing ? (
                          <input
                            name="field_85"
                            autoFocus
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            defaultValue={row[key] || 0}
                            style={{
                              width: 50,
                              background: "var(--surface3)",
                              border: "1px solid var(--gold)",
                              borderRadius: 4,
                              color: "var(--text)",
                              textAlign: "center",
                              fontSize: 12,
                              padding: "2px 4px",
                              outline: "none",
                            }}
                            onBlur={(e) => {
                              const newVal = e.target.value;
                              updateCell(tablaKey, rIdx, key, newVal);
                              setEditCell(null);
                              // Compute balance suggestion
                              const suggested = computeBalance(
                                tablas[tablaKey][rIdx],
                                Number(key),
                                newVal,
                              );
                              const sugTotal =
                                Math.round(
                                  INTENS_COLS.reduce(
                                    (s, c) => s + (suggested[String(c)] || 0),
                                    0,
                                  ) * 10,
                                ) / 10;
                              if (sugTotal === 100) {
                                setSuggestion({
                                  tablaKey,
                                  rIdx,
                                  pivotCol: Number(key),
                                  pivotVal: Number(newVal),
                                  suggested,
                                });
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === "Escape")
                                e.target.blur();
                            }}
                          />
                        ) : (
                          <div
                            onClick={() =>
                              setEditCell({ tabla: tablaKey, rIdx, col: key })
                            }
                            style={{
                              cursor: "pointer",
                              padding: "3px 6px",
                              borderRadius: 4,
                              color: row[key] ? "var(--text)" : "var(--muted)",
                              background: row[key]
                                ? "var(--surface2)"
                                : "transparent",
                              minWidth: 36,
                              display: "inline-block",
                              border: "1px solid transparent",
                              transition: "border .1s",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.borderColor =
                                "var(--border)")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.borderColor =
                                "transparent")
                            }
                          >
                            {row[key] || "—"}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  {/* Total con semáforo */}
                  <td style={{ textAlign: "center" }}>
                    <span
                      style={{
                        fontFamily: "'Bebas Neue'",
                        fontSize: 15,
                        color: ok ? "var(--green)" : "var(--red)",
                        fontWeight: 700,
                      }}
                    >
                      {total % 1 === 0 ? total : total.toFixed(1)}
                    </span>
                  </td>
                  {/* IRM resultante */}
                  <td style={{ textAlign: "center" }}>
                    {(() => {
                      const irm_calc = calcIRMresultante(row);
                      const diff = Math.round((irm_calc - row.irm) * 10) / 10;
                      const color =
                        diff === 0
                          ? "var(--green)"
                          : Math.abs(diff) <= 1
                            ? "var(--gold)"
                            : "var(--red)";
                      return (
                        <div style={{ lineHeight: 1.2 }}>
                          <span
                            style={{
                              fontFamily: "'Bebas Neue'",
                              fontSize: 15,
                              color,
                            }}
                          >
                            {irm_calc}
                          </span>
                          {diff !== 0 && (
                            <div style={{ fontSize: 10, color, marginTop: 1 }}>
                              {diff > 0 ? "+" : ""}
                              {diff}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td style={{ textAlign: "center", padding: "3px 4px" }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTestIRM({
                          tablaKey,
                          origRow: row,
                          editRow: { ...row },
                        });
                      }}
                      title="Testear distribución de reps"
                      style={{
                        background: "none",
                        border: "1px solid var(--border)",
                        borderRadius: 6,
                        padding: "3px 7px",
                        cursor: "pointer",
                        fontSize: 13,
                        color: "var(--muted)",
                        transition: "all .15s",
                        lineHeight: 1,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "var(--gold)";
                        e.currentTarget.style.color = "var(--gold)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--border)";
                        e.currentTarget.style.color = "var(--muted)";
                      }}
                    >
                      🧪
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ marginTop: 10, fontSize: 12, color: "var(--muted)" }}>
          💡 Cada fila debe sumar exactamente{" "}
          <span style={{ color: "var(--gold)", fontWeight: 700 }}>100</span>.
          Click en cualquier celda para editar.
        </div>

        {/* Suggestion banner */}
        {suggestion && suggestion.tablaKey === tablaKey && (
          <div
            style={{
              marginTop: 12,
              padding: "12px 16px",
              background: "rgba(232,197,71,.08)",
              border: "1px solid rgba(232,197,71,.3)",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--gold)",
                  marginBottom: 4,
                }}
              >
                ⚡ Balance exacto — IRM {tablas[tablaKey][suggestion.rIdx]?.irm}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                Priorizando{" "}
                <span style={{ color: "var(--gold)", fontWeight: 700 }}>
                  {suggestion.pivotCol}% = {suggestion.pivotVal}
                </span>
                , el resto se distribuye en dos zonas para que el IRM calculado
                sea exactamente{" "}
                <span style={{ color: "var(--green)", fontWeight: 700 }}>
                  {tablas[tablaKey][suggestion.rIdx]?.irm}
                </span>
                :
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  marginTop: 8,
                  flexWrap: "wrap",
                }}
              >
                {INTENS_COLS.map((c) => {
                  const orig =
                    tablas[tablaKey][suggestion.rIdx]?.[String(c)] || 0;
                  const sug = suggestion.suggested[String(c)] || 0;
                  const changed = orig !== sug;
                  const isPivot = c === suggestion.pivotCol;
                  return (
                    <div
                      key={c}
                      style={{
                        background: isPivot
                          ? "rgba(232,197,71,.2)"
                          : changed
                            ? "rgba(71,180,232,.1)"
                            : "var(--surface2)",
                        border: `1px solid ${isPivot ? "var(--gold)" : changed ? "var(--blue)" : "var(--border)"}`,
                        borderRadius: 6,
                        padding: "4px 8px",
                        textAlign: "center",
                        minWidth: 52,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 9,
                          color: "var(--muted)",
                          textTransform: "uppercase",
                        }}
                      >
                        {c}%
                      </div>
                      <div
                        style={{
                          fontFamily: "'Bebas Neue'",
                          fontSize: 15,
                          color: isPivot
                            ? "var(--gold)"
                            : changed
                              ? "var(--blue)"
                              : "var(--text)",
                        }}
                      >
                        {sug % 1 === 0 ? sug : sug.toFixed(1)}
                      </div>
                      {changed && !isPivot && (
                        <div style={{ fontSize: 9, color: "var(--muted)" }}>
                          era {orig % 1 === 0 ? orig : orig.toFixed(1)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                flexShrink: 0,
              }}
            >
              <button className="btn btn-gold btn-sm" onClick={applySuggestion}>
                Aplicar
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setSuggestion(null)}
              >
                Ignorar
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Series/Reps lookup tables ───────────────────────────────────────────
  const renderLookup = (tablaKey) => {
    const rows = tablas[tablaKey];
    return (
      <div style={{ overflowX: "auto" }}>
        <table className="norm-table" style={{ fontSize: 12 }}>
          <thead>
            <tr>
              <th>Intensidad</th>
              <th>Modo</th>
              <th>Reps totales</th>
              <th style={{ textAlign: "center" }}>Series</th>
              <th style={{ textAlign: "center" }}>Reps / serie</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rIdx) => (
              <tr key={rIdx}>
                <td
                  style={{
                    fontFamily: "'Bebas Neue'",
                    fontSize: 15,
                    color: "var(--gold)",
                  }}
                >
                  {row.intens}%
                </td>
                <td>
                  <span
                    className={`badge ${row.modo === "Comp" ? "badge-gold" : "badge-blue"}`}
                  >
                    {row.modo}
                  </span>
                </td>
                <td style={{ color: "var(--muted)", fontWeight: 600 }}>
                  {row.reps}
                </td>
                <td style={{ textAlign: "center" }}>
                  <input
                    name="field_86"
                    type="number"
                    min={1}
                    value={row.series || 1}
                    onChange={(e) =>
                      updateLookup(tablaKey, rIdx, "series", e.target.value)
                    }
                    style={{
                      width: 52,
                      background: "var(--surface2)",
                      border: "1px solid var(--border)",
                      borderRadius: 4,
                      color: "var(--text)",
                      textAlign: "center",
                      fontSize: 12,
                      padding: "3px 4px",
                      outline: "none",
                    }}
                  />
                </td>
                <td style={{ textAlign: "center" }}>
                  <input
                    name="field_87"
                    type="number"
                    min={1}
                    value={row.reps_serie || 1}
                    onChange={(e) =>
                      updateLookup(tablaKey, rIdx, "reps_serie", e.target.value)
                    }
                    style={{
                      width: 52,
                      background: "var(--surface2)",
                      border: "1px solid var(--border)",
                      borderRadius: 4,
                      color: "var(--text)",
                      textAlign: "center",
                      fontSize: 12,
                      padding: "3px 4px",
                      outline: "none",
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const tabActiva = seccion === "irm" ? tabIRM : tabSR;

  return (
    <div>
      {/* Header */}
      <div className="flex-between mb16">
        <div>
          <div className="page-title">Calculadora</div>
          <div className="page-sub">
            Tablas compartidas para todos los atletas — editables globalmente
          </div>
        </div>
      </div>

      {/* Secciones principales */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          marginBottom: 16,
          overflow: "hidden",
        }}
      >
        {/* Fila 1 — IRM | Series/Reps */}
        <div
          style={{ display: "flex", borderBottom: "1px solid var(--border)" }}
        >
          {[
            { id: "irm", label: "Tablas IRM" },
            { id: "sr", label: "Series / Reps" },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setSeccion(s.id)}
              style={{
                flex: 1,
                padding: "12px 0",
                border: "none",
                background: "none",
                color: seccion === s.id ? "var(--gold)" : "var(--muted)",
                fontFamily: "'Bebas Neue'",
                fontSize: 18,
                letterSpacing: ".05em",
                cursor: "pointer",
                borderBottom:
                  seccion === s.id
                    ? "2px solid var(--gold)"
                    : "2px solid transparent",
                transition: "all .2s",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Fila 2 — sub-tabs */}
        <div style={{ padding: "0 16px", display: "flex", gap: 0, height: 40 }}>
          {seccion === "irm"
            ? [
                { id: "tabla1", label: "Tabla 1" },
                { id: "tabla2", label: "Tabla 2" },
                { id: "tabla3", label: "Tabla 3" },
                { id: "tabla4", label: "Tabla 4" },
                { id: "tabla5", label: "Tabla 5" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTabIRM(t.id)}
                  style={{
                    padding: "0 16px",
                    border: "none",
                    background: "none",
                    color: tabIRM === t.id ? "var(--gold)" : "var(--muted)",
                    fontFamily: "'DM Sans'",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    borderBottom:
                      tabIRM === t.id
                        ? "2px solid var(--gold)"
                        : "2px solid transparent",
                    transition: "all .2s",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t.label}
                  {tablas._descriptions?.[t.id]
                    ? ` — ${tablas._descriptions[t.id]}`
                    : ""}
                </button>
              ))
            : [
                { id: "lookup_general", label: "General" },
                { id: "lookup_tirones", label: "Tirones" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTabSR(t.id)}
                  style={{
                    padding: "0 16px",
                    border: "none",
                    background: "none",
                    color: tabSR === t.id ? "var(--gold)" : "var(--muted)",
                    fontFamily: "'DM Sans'",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    borderBottom:
                      tabSR === t.id
                        ? "2px solid var(--gold)"
                        : "2px solid transparent",
                    transition: "all .2s",
                  }}
                >
                  {t.label}
                </button>
              ))}
        </div>
      </div>

      {/* Descripción editable por tabla (solo sección IRM) */}
      {seccion === "irm" && (
        <div style={{ padding: "8px 16px 0" }}>
          <input
            type="text"
            name="irm_description"
            value={tablas._descriptions?.[tabIRM] || ""}
            onChange={(e) => {
              const newDescriptions = {
                ...tablas._descriptions,
                [tabIRM]: e.target.value,
              };
              saveTablas({ ...tablas, _descriptions: newDescriptions });
            }}
            placeholder="Descripción (ej: Principiantes, Avanzados...)"
            style={{
              width: "100%",
              padding: "6px 10px",
              background: "var(--bg2)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              color: "var(--fg)",
              fontFamily: "'DM Sans'",
              fontSize: 12,
              outline: "none",
            }}
            maxLength={60}
          />
        </div>
      )}

      {/* Contenido */}
      <div className="card">
        {seccion === "irm" ? renderTablaIRM(tabIRM) : renderLookup(tabSR)}
      </div>

      {/* Modal Testeo IRM */}
      {testIRM &&
        (() => {
          const { tablaKey, origRow, editRow } = testIRM;
          const tablaNum = tablaKey.replace("tabla", "");
          const tablaDesc = tablas._descriptions?.[tablaKey];
          const tablaLabel = `Tabla ${tablaNum}${tablaDesc ? ` — ${tablaDesc}` : ""}`;
          const stepVal = (col, delta) => {
            const key = String(col);
            const cur = editRow[key] || 0;
            const next = Math.max(
              0,
              Math.min(100, Math.round((cur + delta) * 10) / 10),
            );
            setTestIRM({ ...testIRM, editRow: { ...editRow, [key]: next } });
          };
          const results = INTENS_COLS.map((col) => {
            const key = String(col);
            const tablaVal = editRow[key] || 0;
            const origVal = origRow[key] || 0;
            const changed = tablaVal !== origVal;
            const raw = (tablaVal * testReps) / 100;
            const rounded = Math.round(raw);
            return { col, key, tablaVal, origVal, changed, raw, rounded };
          });
          const totalRounded = results.reduce((s, r) => s + r.rounded, 0);
          const totalPct = results.reduce((s, r) => s + r.tablaVal, 0);
          const totalPctOk = Math.round(totalPct * 10) === 1000;
          const hasChanges = results.some((r) => r.changed);
          const applyChanges = () => {
            const rIdx = tablas[tablaKey].findIndex(
              (r) => r.irm === editRow.irm,
            );
            if (rIdx < 0) return;
            const newTablas = { ...tablas };
            newTablas[tablaKey] = tablas[tablaKey].map((r, i) =>
              i === rIdx ? { ...editRow } : r,
            );
            saveTablas(newTablas);
            setTestIRM(null);
          };
          const stepBtnStyle = {
            background: "none",
            border: "1px solid var(--border)",
            borderRadius: 4,
            width: 22,
            height: 18,
            cursor: "pointer",
            color: "var(--muted)",
            fontSize: 10,
            lineHeight: 1,
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all .12s",
          };
          return (
            <Modal
              title={`🧪 Testeo IRM ${editRow.irm} — ${tablaLabel}`}
              onClose={() => setTestIRM(null)}
            >
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--muted)",
                    marginBottom: 12,
                  }}
                >
                  Simulá la distribución de repeticiones. Usá las flechas ▲▼
                  para ajustar los valores y ver el resultado en tiempo real.
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  <label
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text)",
                    }}
                  >
                    Repeticiones:
                  </label>
                  <input
                    name="field_test_irm_reps"
                    autoFocus
                    type="number"
                    min={1}
                    max={200}
                    value={testReps}
                    onChange={(e) =>
                      setTestReps(Math.max(1, Number(e.target.value) || 1))
                    }
                    style={{
                      width: 72,
                      background: "var(--surface2)",
                      border: "1px solid var(--gold)",
                      borderRadius: 6,
                      color: "var(--text)",
                      textAlign: "center",
                      fontSize: 18,
                      fontFamily: "'Bebas Neue'",
                      padding: "6px 8px",
                      outline: "none",
                    }}
                  />
                </div>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table
                  className="norm-table"
                  style={{ fontSize: 12, width: "100%" }}
                >
                  <thead>
                    <tr>
                      <th style={{ textAlign: "center" }}>Intensidad</th>
                      <th style={{ textAlign: "center" }}>% Tabla</th>
                      <th style={{ textAlign: "center" }}>Cálculo</th>
                      <th style={{ textAlign: "center" }}>Reps asignadas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <tr
                        key={r.col}
                        style={{
                          opacity: r.tablaVal > 0 || r.origVal > 0 ? 1 : 0.35,
                        }}
                      >
                        <td
                          style={{
                            textAlign: "center",
                            fontFamily: "'Bebas Neue'",
                            fontSize: 15,
                            color: "var(--gold)",
                          }}
                        >
                          {r.col}%
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 4,
                            }}
                          >
                            <button
                              style={stepBtnStyle}
                              onClick={() => stepVal(r.col, -0.5)}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor =
                                  "var(--gold)";
                                e.currentTarget.style.color = "var(--gold)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor =
                                  "var(--border)";
                                e.currentTarget.style.color = "var(--muted)";
                              }}
                            >
                              ▼
                            </button>
                            <div style={{ minWidth: 32, textAlign: "center" }}>
                              <span
                                style={{
                                  fontFamily: "'Bebas Neue'",
                                  fontSize: 15,
                                  color: r.changed
                                    ? "var(--blue)"
                                    : "var(--text)",
                                  fontWeight: r.changed ? 700 : 400,
                                }}
                              >
                                {r.tablaVal || "—"}
                              </span>
                              {r.changed && (
                                <div
                                  style={{
                                    fontSize: 9,
                                    color: "var(--muted)",
                                    lineHeight: 1,
                                  }}
                                >
                                  era {r.origVal}
                                </div>
                              )}
                            </div>
                            <button
                              style={stepBtnStyle}
                              onClick={() => stepVal(r.col, 0.5)}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor =
                                  "var(--gold)";
                                e.currentTarget.style.color = "var(--gold)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor =
                                  "var(--border)";
                                e.currentTarget.style.color = "var(--muted)";
                              }}
                            >
                              ▲
                            </button>
                          </div>
                        </td>
                        <td
                          style={{
                            textAlign: "center",
                            color: "var(--text)",
                            fontSize: 11,
                          }}
                        >
                          {r.tablaVal > 0 ? (
                            <span>
                              {r.tablaVal} × {testReps} / 100 ={" "}
                              <span style={{ color: "var(--gold)" }}>
                                {r.raw % 1 === 0 ? r.raw : r.raw.toFixed(2)}
                              </span>
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span
                            style={{
                              fontFamily: "'Bebas Neue'",
                              fontSize: 17,
                              color:
                                r.rounded > 0 ? "var(--green)" : "var(--muted)",
                              fontWeight: 700,
                            }}
                          >
                            {r.rounded || "—"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: "2px solid var(--border)" }}>
                      <td
                        style={{
                          textAlign: "center",
                          fontWeight: 600,
                          fontSize: 12,
                          color: totalPctOk ? "var(--green)" : "var(--red)",
                        }}
                      >
                        Σ {Math.round(totalPct * 10) / 10}
                      </td>
                      <td></td>
                      <td
                        style={{
                          textAlign: "right",
                          fontWeight: 600,
                          fontSize: 13,
                          color: "var(--text)",
                          paddingRight: 8,
                        }}
                      >
                        Total reps:
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span
                          style={{
                            fontFamily: "'Bebas Neue'",
                            fontSize: 20,
                            color:
                              totalRounded === testReps
                                ? "var(--green)"
                                : "var(--gold)",
                            fontWeight: 700,
                          }}
                        >
                          {totalRounded}
                        </span>
                        {totalRounded !== testReps && (
                          <span
                            style={{
                              fontSize: 11,
                              color:
                                totalRounded > testReps
                                  ? "var(--red)"
                                  : "var(--gold)",
                              marginLeft: 6,
                            }}
                          >
                            ({totalRounded > testReps ? "+" : ""}
                            {totalRounded - testReps})
                          </span>
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div
                style={{
                  marginTop: 14,
                  fontSize: 11,
                  color: "var(--muted)",
                  lineHeight: 1.6,
                }}
              >
                💡 Fórmula:{" "}
                <code
                  style={{
                    background: "var(--surface2)",
                    padding: "2px 6px",
                    borderRadius: 4,
                  }}
                >
                  reps = Math.round(% × reps / 100)
                </code>{" "}
                — mismo redondeo que la tabla de turnos.
              </div>
              <div className="modal-footer" style={{ marginTop: 16 }}>
                {hasChanges && (
                  <button className="btn btn-gold" onClick={applyChanges}>
                    Aplicar a tabla
                  </button>
                )}
                <button
                  className="btn btn-ghost"
                  onClick={() => setTestIRM(null)}
                >
                  {hasChanges ? "Descartar" : "Cerrar"}
                </button>
              </div>
            </Modal>
          );
        })()}
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
// Helpers de persistencia
const load = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};
const save = (key, val) => {
  try {
    safeSetItem(key, JSON.stringify(val));
    emitLocalSyncEvent(key);
  } catch {}
};

// ═══════════════════════════════════════════════════════════════
// PANEL DE REFERENCIA — vista lateral de solo lectura
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// PANEL DE REFERENCIA

class PanelTabBoundary extends React.Component {
  constructor(p) {
    super(p);
    this.state = { err: null };
  }
  static getDerivedStateFromError(e) {
    return { err: e };
  }
  componentDidCatch(e, i) {
    console.error(
      "[BOUNDARY]",
      this.props.tab,
      e?.message,
      i?.componentStack?.slice(0, 200),
    );
  }
  render() {
    if (this.state.err)
      return (
        <div
          style={{
            padding: 24,
            color: "#e85047",
            fontSize: 12,
            fontFamily: "monospace",
            wordBreak: "break-all",
            background: "#1a0000",
            borderRadius: 8,
            margin: 8,
          }}
        >
          <strong>💥 Error en {this.props.tab}:</strong>
          <br />
          {String(this.state.err?.message || this.state.err)}
        </div>
      );
    return this.props.children;
  }
}
