import { useState, useEffect, useRef } from "react";
import { EJERCICIOS } from "../../data/ejercicios";
import { CAT_COLOR } from "../../data/constantes";
import { INTENSIDADES, TABLA_DEFAULT } from "../../data/tablas-default";
import { LIFTPLAN_LOCAL_SYNC_EVENT } from "../../lib/storage";
import {
  calcSeriesRepsKg,
  getEjercicioById,
  getRepsVal,
  getSemPct,
  getTurnoPct,
} from "../../lib/calc";
import { formatDateDisplay } from "../../lib/ciclo-menstrual";
import { PageResumen } from "../resumen/PageResumen";
import { PagePDF } from "../pdf/PagePDF";
import { PanelTabBoundary } from "../common/PanelTabBoundary";

export function PanelReferencia({
  atletas,
  mesociclos,
  plantillas,
  liveMesoData = {},
  onClose,
  onWidthChange,
  isMobile,
}) {
  const [modo, setModo] = useState("atleta");
  const [atletaId, setAtletaId] = useState(atletas[0]?.id || null);
  const [mesoId, setMesoId] = useState(null);
  const [pltId, setPltId] = useState(plantillas[0]?.id || null);
  const [semIdx, setSemIdx] = useState(0);
  const [turnoIdx, setTurnoIdx] = useState(0);
  const [vista, setVista] = useState("planilla");
  const [vistaKey, setVistaKey] = useState({ planilla: 0, resumen: 0, pdf: 0 });
  const cambiarVista = (v) => {
    setVista(v);
    setVistaKey((prev) => ({ ...prev, [v]: Date.now() }));
  };

  const misMesos = mesociclos
    .filter((m) => m.atleta_id === atletaId)
    .sort((a, b) => (b.fecha_inicio || "").localeCompare(a.fecha_inicio || ""));
  const atleta = atletas.find((a) => a.id === atletaId) || null;
  const mesoBase = misMesos.find((m) => m.id === mesoId) || misMesos[0] || null;

  // Use live meso from emit if available, otherwise use stored
  // live.meso has the latest semanas/pct_grupos structure from PageAtleta state
  const live = liveMesoData?.[atletaId];
  const meso =
    live?.meso?.id === mesoBase?.id
      ? live?.meso
      : live?.meso || mesoBase || null;

  // Read overrides from localStorage — same approach as PageResumen/PagePDF
  // This always stays in sync because PageAtleta writes to localStorage on every change
  const mid = meso?.id;
  const lsGet = (key, dflt) => {
    try {
      return (
        JSON.parse(
          localStorage.getItem(`liftplan_pt_${mid}_${key}`) || "null",
        ) ?? dflt
      );
    } catch {
      return dflt;
    }
  };
  const lsPctGet = (key, dflt) => {
    try {
      return (
        JSON.parse(
          localStorage.getItem(`liftplan_pct_${mid}_${key}`) || "null",
        ) ?? dflt
      );
    } catch {
      return dflt;
    }
  };

  const liveRepsEdit = live?.repsEdit ?? lsGet("repsEdit", {});
  const liveManualEdit = new Set(live?.manualEdit ?? lsGet("manualEdit", []));
  const liveSemPctOvr = live?.semPctOverrides ?? lsPctGet("semOvr", {});
  const liveSemPctMan = new Set(live?.semPctManual ?? lsPctGet("semMan", []));
  const liveTurnoPctOvr = live?.turnoPctOverrides ?? lsPctGet("turnoOvr", {});
  const liveTurnoPctMan = new Set(
    live?.turnoPctManual ?? lsPctGet("turnoMan", []),
  );

  const globalNormativos = (() => {
    try {
      return (
        JSON.parse(localStorage.getItem("liftplan_normativos") || "null") ||
        EJERCICIOS
      );
    } catch {
      return EJERCICIOS;
    }
  })();
  const atletaNormOverrides = (() => {
    if (!atletaId) return {};
    try {
      return (
        JSON.parse(
          localStorage.getItem(`liftplan_normativos_atleta_${atletaId}`) ||
            "null",
        ) || {}
      );
    } catch {
      return {};
    }
  })();
  const atletaNormativos = globalNormativos.map((ej) => {
    const ovr = atletaNormOverrides[ej.id];
    if (!ovr) return ej;
    return {
      ...ej,
      ...(ovr.pct_base !== undefined ? { pct_base: ovr.pct_base } : {}),
      ...(ovr.base !== undefined ? { base: ovr.base } : {}),
    };
  });

  // Re-read local overrides only when relevant storage keys actually change.
  const [localRevision, setLocalRevision] = useState(0);
  useEffect(() => {
    const bump = () => setLocalRevision((v) => v + 1);
    const shouldRefreshForKey = (key) => {
      if (!key) return false;
      if (key === "liftplan_normativos") return true;
      if (key === "liftplan_tablas") return true;
      if (key === `liftplan_normativos_atleta_${atletaId}`) return true;
      if (!mid) return false;
      if (key.startsWith(`liftplan_pt_${mid}_`)) return true;
      if (key.startsWith(`liftplan_pct_${mid}_`)) return true;
      return false;
    };

    const onStorage = (event) => {
      if (shouldRefreshForKey(event?.key)) bump();
    };

    const onLocalSync = (event) => {
      const key = event?.detail?.key;
      if (shouldRefreshForKey(key)) bump();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(LIFTPLAN_LOCAL_SYNC_EVENT, onLocalSync);
    window.addEventListener("liftplan:normativos-overrides-updated", bump);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(LIFTPLAN_LOCAL_SYNC_EVENT, onLocalSync);
      window.removeEventListener("liftplan:normativos-overrides-updated", bump);
    };
  }, [mid, atletaId]);

  void localRevision;

  // Override bundle: live data from PageAtleta if mounted, fallback a localStorage
  const overrides = {
    repsEdit: liveRepsEdit,
    manualEdit: liveManualEdit,
    semPctOverrides: liveSemPctOvr,
    semPctManual: liveSemPctMan,
    turnoPctOverrides: liveTurnoPctOvr,
    turnoPctManual: liveTurnoPctMan,
  };
  const _getSemPct = (g, sIdx) => getSemPct(meso, g, sIdx, overrides);
  const _getTurnoPct = (g, sIdx, tIdx) =>
    getTurnoPct(meso, g, sIdx, tIdx, overrides);

  const plt = plantillas.find((p) => p.id === pltId) || null;
  const fuente = modo === "atleta" ? meso : plt?.semanas ? plt : null;
  const semanas = fuente?.semanas || [];
  const sem = semanas[semIdx] || semanas[0] || null;
  const turno = sem?.turnos?.[turnoIdx] || sem?.turnos?.[0] || null;

  useEffect(() => {
    setMesoId(null);
    setSemIdx(0);
    setTurnoIdx(0);
  }, [atletaId]);
  useEffect(() => {
    setSemIdx(0);
    setTurnoIdx(0);
  }, [mesoId, pltId, modo]);
  useEffect(() => {
    setTurnoIdx(0);
  }, [semIdx]);

  const irm_arr = modo === "atleta" ? Number(meso?.irm_arranque || 0) : 100;
  const irm_env = modo === "atleta" ? Number(meso?.irm_envion || 0) : 200;

  const TabBtn = ({ id, label }) => (
    <button
      onClick={() => cambiarVista(id)}
      style={{
        flex: 1,
        padding: "6px 0",
        border: "none",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 700,
        borderRadius: 8,
        background: vista === id ? "var(--gold)" : "var(--surface2)",
        color: vista === id ? "#000" : "var(--muted)",
        transition: "all .15s",
      }}
    >
      {label}
    </button>
  );

  const SemBtn = ({ s, i }) => (
    <button
      onClick={() => setSemIdx(i)}
      style={{
        padding: "4px 10px",
        borderRadius: 20,
        border: "none",
        cursor: "pointer",
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
        background: semIdx === i ? "var(--gold)" : "var(--surface2)",
        color: semIdx === i ? "#000" : "var(--muted)",
        transition: "all .15s",
      }}
    >
      Sem {s.numero}
    </button>
  );

  const TurnoBtn = ({ t, i }) => (
    <button
      onClick={() => setTurnoIdx(i)}
      style={{
        padding: "4px 10px",
        borderRadius: 20,
        border: "none",
        cursor: "pointer",
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
        background:
          turnoIdx === i ? "rgba(100,180,255,.85)" : "var(--surface2)",
        color: turnoIdx === i ? "#000" : "var(--muted)",
        transition: "all .15s",
      }}
    >
      T{t.numero || i + 1}
      {t.dia ? ` · ${t.dia}` : ""}
    </button>
  );

  // ── Vista PLANILLA (resumen + planilla de turnos) ────────────────
  const VistaPlanilla = () => {
    if (!fuente)
      return (
        <div
          style={{
            padding: 32,
            textAlign: "center",
            color: "var(--muted)",
            fontSize: 13,
          }}
        >
          Sin datos
        </div>
      );
    const volTotal = fuente.volumen_total || 0;
    const tablas = (() => {
      try {
        return (
          JSON.parse(localStorage.getItem("liftplan_tablas") || "null") ||
          TABLA_DEFAULT
        );
      } catch {
        return TABLA_DEFAULT;
      }
    })();
    const modo_ = fuente.modo || "Preparatorio";

    // % bloques y turnos — usar _getSemPct/_getTurnoPct (respetan overrides en tiempo real)
    const GRUPOS_PANEL = ["Arranque", "Envion", "Tirones", "Piernas"];
    const turnosRef = sem?.turnos || [];
    const gruposPct = GRUPOS_PANEL.map((g) => ({
      g,
      col: CAT_COLOR[g] || "var(--muted)",
      pctSem: Math.round(_getSemPct(g, semIdx)),
      pctTurnos: turnosRef
        .map((t, tIdx) => ({
          tIdx,
          label: `T${t.numero || tIdx + 1}${t.dia ? ` ${t.dia.slice(0, 3)}` : ""}`,
          pct: Math.round(_getTurnoPct(g, semIdx, tIdx)),
        }))
        .filter((x) => x.pct > 0),
    })).filter((x) => x.pctSem > 0);

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {/* IRM + vol */}
        {modo === "atleta" && meso && (
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {[
              { v: meso.irm_arranque, l: "Arr kg", c: "var(--gold)" },
              { v: meso.irm_envion, l: "Env kg", c: "var(--blue)" },
              { v: volTotal, l: "Vol reps", c: "var(--text)" },
            ].map(({ v, l, c }) => (
              <div key={l} style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontFamily: "'Bebas Neue'",
                    fontSize: 22,
                    color: c,
                    lineHeight: 1,
                  }}
                >
                  {v || "—"}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    letterSpacing: ".06em",
                    marginTop: 2,
                  }}
                >
                  {l}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* % Semanal — usa s.pct_volumen directo de live.meso (siempre actualizado) */}
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: ".07em",
              marginBottom: 8,
            }}
          >
            % Semanal · Reps
          </div>
          {semanas.map((s, i) => {
            const pct = s.pct_volumen;
            const reps = Math.round((volTotal * pct) / 100);
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 5,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--muted)",
                    width: 52,
                    flexShrink: 0,
                  }}
                >
                  Sem {s.numero}
                </div>
                <div
                  style={{
                    flex: 1,
                    height: 6,
                    background: "var(--surface3)",
                    borderRadius: 3,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      borderRadius: 3,
                      width: `${pct}%`,
                      background: "var(--gold)",
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--gold)",
                    width: 30,
                    textAlign: "right",
                    flexShrink: 0,
                  }}
                >
                  {pct}%
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--muted)",
                    width: 44,
                    textAlign: "right",
                    flexShrink: 0,
                  }}
                >
                  {reps}r
                </div>
              </div>
            );
          })}
        </div>

        {/* % Bloques — usa _getSemPct (respeta overrides) + desglose por turno */}
        {gruposPct.length > 0 && (
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: ".07em",
                marginBottom: 8,
              }}
            >
              % Bloques · Sem {sem?.numero}
            </div>
            {gruposPct.map(({ g, col, pctSem, pctTurnos }) => (
              <div key={g} style={{ marginBottom: 8 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 3,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: col,
                      width: 70,
                      flexShrink: 0,
                      fontWeight: 600,
                    }}
                  >
                    {g}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      height: 6,
                      background: "var(--surface3)",
                      borderRadius: 3,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        borderRadius: 3,
                        width: `${pctSem}%`,
                        background: col,
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: col,
                      width: 34,
                      textAlign: "right",
                      flexShrink: 0,
                    }}
                  >
                    {pctSem}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* % Bloques por turno — mismo formato, datos de _getTurnoPct del turno activo */}
        {gruposPct.length > 0 && (
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: ".07em",
                marginBottom: 8,
              }}
            >
              % Bloques · T{turno?.numero || turnoIdx + 1}
              {turno?.dia ? ` · ${turno.dia.slice(0, 3)}` : ""}
            </div>
            {gruposPct.map(({ g, col, pctSem }) => {
              const pct = Math.round(_getTurnoPct(g, semIdx, turnoIdx));
              if (!pct) return null;
              return (
                <div
                  key={g}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 5,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: col,
                      width: 70,
                      flexShrink: 0,
                      fontWeight: 600,
                    }}
                  >
                    {g}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      height: 6,
                      background: "var(--surface3)",
                      borderRadius: 3,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        borderRadius: 3,
                        width: `${pct}%`,
                        background: col,
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: col,
                      width: 34,
                      textAlign: "right",
                      flexShrink: 0,
                    }}
                  >
                    {pct}%
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* % Turnos — mismo formato que % Semanal, usando _getTurnoPct por bloque */}
        {turnosRef.length > 0 && gruposPct.length > 0 && (
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: ".07em",
                marginBottom: 8,
              }}
            >
              % Turnos · Sem {sem?.numero}
            </div>
            {turnosRef.map((t, tIdx) => {
              const pct = Math.round(
                gruposPct.reduce(
                  (sum, { g, pctSem }) =>
                    sum + (pctSem * _getTurnoPct(g, semIdx, tIdx)) / 100,
                  0,
                ),
              );
              if (!pct) return null;
              const label = `T${t.numero || tIdx + 1}${t.dia ? ` · ${t.dia.slice(0, 3)}` : ""}`;
              return (
                <div
                  key={tIdx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 5,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--muted)",
                      width: 52,
                      flexShrink: 0,
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      height: 6,
                      background: "var(--surface3)",
                      borderRadius: 3,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        borderRadius: 3,
                        width: `${pct}%`,
                        background: "var(--blue)",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--blue)",
                      width: 30,
                      textAlign: "right",
                      flexShrink: 0,
                    }}
                  >
                    {pct}%
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Divisor */}
        {turno &&
          turno.ejercicios?.filter((e) => e.ejercicio_id).length > 0 && (
            <div
              style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: ".07em",
                  marginBottom: 12,
                }}
              >
                Planilla · Sem {sem?.numero} · T{turno?.numero || turnoIdx + 1}
                {turno?.dia ? ` · ${turno.dia}` : ""}
              </div>
              {turno.ejercicios
                .filter((e) => e.ejercicio_id)
                .map((ej, i) => {
                  const data = getEjercicioById(
                    ej.ejercicio_id,
                    atletaNormativos,
                  );
                  const col = CAT_COLOR[data?.categoria] || "var(--muted)";
                  const k = `${semIdx}-${turnoIdx}-${ej.id}`;
                  const repsVal = getRepsVal(meso, ej, semIdx, turnoIdx, overrides);
                  const liveCellEdit = live?.cellEdit || {};
                  const liveCellManual = live?.cellManual || new Set();
                  const getC = (intens, field, def) => {
                    const k2 = `${semIdx}-${turnoIdx}-${ej.id}-${intens}-${field}`;
                    return liveCellManual.has(k2)
                      ? Number(liveCellEdit[k2]) || 0
                      : def;
                  };
                  const calcs =
                    repsVal > 0
                      ? calcSeriesRepsKg(
                          tablas,
                          ej,
                          data,
                          irm_arr,
                          irm_env,
                          modo_,
                          repsVal,
                        )
                      : null;
                  return (
                    <div
                      key={i}
                      style={{
                        border: `1px solid ${col}40`,
                        borderRadius: 10,
                        overflow: "hidden",
                        background: `${col}08`,
                        marginBottom: 8,
                      }}
                    >
                      <div
                        style={{
                          padding: "6px 10px",
                          borderBottom: `1px solid ${col}25`,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "'Bebas Neue'",
                            fontSize: 14,
                            color: col,
                            minWidth: 20,
                          }}
                        >
                          {ej.ejercicio_id}
                        </span>
                        <span
                          style={{
                            flex: 1,
                            fontSize: 12,
                            color: "var(--text)",
                            fontWeight: 600,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {data?.nombre || "?"}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            color: "var(--muted)",
                            flexShrink: 0,
                          }}
                        >
                          T{ej.tabla} · {ej.intensidad}%
                        </span>
                      </div>
                      <div style={{ padding: "6px 10px" }}>
                        {repsVal > 0 ? (
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
                                color: "var(--gold)",
                                fontWeight: 700,
                                fontFamily: "'Bebas Neue'",
                                fontSize: 16,
                              }}
                            >
                              {repsVal}r
                            </span>
                            {calcs &&
                              INTENSIDADES.map((intens, ii) => {
                                const c = calcs[ii];
                                if (!c || c.series == null) return null;
                                const s = getC(intens, "series", c.series);
                                const r = getC(intens, "reps", c.reps_serie);
                                const kg = getC(intens, "kg", c.kg);
                                return (
                                  <span
                                    key={intens}
                                    style={{
                                      padding: "2px 7px",
                                      borderRadius: 6,
                                      background: "var(--surface2)",
                                      fontSize: 11,
                                    }}
                                  >
                                    <span style={{ color: "var(--muted)" }}>
                                      {intens}%{" "}
                                    </span>
                                    <span
                                      style={{
                                        color: "var(--text)",
                                        fontWeight: 600,
                                      }}
                                    >
                                      {s}×{r}
                                    </span>
                                    {kg && (
                                      <span style={{ color: "var(--muted)" }}>
                                        {" "}
                                        {kg}kg
                                      </span>
                                    )}
                                  </span>
                                );
                              })}
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: "var(--muted)" }}>
                            Sin reps asignadas
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
      </div>
    );
  };

  // ── Resumen completo (reutiliza PageResumen) ─────────────────
  const _mesoRef = fuente
    ? modo === "atleta"
      ? meso
      : {
          ...fuente,
          id: fuente.id,
          modo: fuente.modo || "Preparatorio",
          irm_arranque: irm_arr,
          irm_envion: irm_env,
        }
    : null;
  // atleta puede ser null si el ID no matchea — usar fallback para no bloquear Resumen/PDF
  const _atletaBase = atleta || {
    id: atletaId || "?",
    nombre: "Atleta",
    telefono: "",
  };
  const _atletaRef = fuente
    ? modo === "atleta"
      ? _atletaBase
      : { nombre: fuente.nombre || "Atleta", id: fuente.id, telefono: "" }
    : null;
  const _hasDatos = !!_mesoRef?.semanas?.length;

  const [panelWidth, setPanelWidth] = useState(420);
  const resizing = useRef(false);
  const [isMobileState, setIsMobileState] = useState(
    typeof window !== "undefined" && window.innerWidth <= 768,
  );
  useEffect(() => {
    const check = () => setIsMobileState(window.innerWidth <= 768);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  const isM = isMobile !== undefined ? isMobile : isMobileState;

  const onResizeStart = (e) => {
    e.preventDefault();
    resizing.current = true;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "ew-resize";

    const onMove = (ev) => {
      if (!resizing.current) return;
      const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const raw = window.innerWidth - clientX;
      const newW = Math.min(Math.max(raw, 280), window.innerWidth * 0.85);
      setPanelWidth(newW);
      onWidthChange && onWidthChange(newW);
    };
    const onUp = () => {
      resizing.current = false;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
  };

  return (
    <div
      style={{
        position: isM ? "fixed" : "relative",
        right: isM ? 0 : undefined,
        top: isM ? 0 : undefined,
        bottom: isM ? 0 : undefined,
        zIndex: isM ? 300 : 1,
        width: panelWidth,
        minWidth: 260,
        flexShrink: 0,
        background: "var(--surface)",
        borderLeft: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        boxShadow: isM
          ? "-8px 0 32px rgba(0,0,0,.5)"
          : "-2px 0 12px rgba(0,0,0,.2)",
        height: isM ? undefined : "100%",
        overflowY: "hidden",
      }}
    >
      {/* Resize handle */}
      <div
        onMouseDown={onResizeStart}
        onTouchStart={onResizeStart}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 6,
          cursor: "ew-resize",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 3,
            height: 40,
            borderRadius: 3,
            background: "var(--border)",
            opacity: 0.6,
            pointerEvents: "none",
          }}
        />
      </div>
      {/* Header */}
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontFamily: "'Bebas Neue'",
            fontSize: 17,
            color: "var(--gold)",
            letterSpacing: ".04em",
            flex: 1,
          }}
        >
          Panel de Referencia
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "var(--muted)",
            cursor: "pointer",
            fontSize: 22,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      {/* Modo */}
      <div
        style={{
          padding: "8px 14px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          gap: 6,
          flexShrink: 0,
        }}
      >
        {[
          ["atleta", "Atleta/Meso"],
          ["plantilla", "Plantilla"],
        ].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setModo(v)}
            style={{
              flex: 1,
              padding: "5px 0",
              borderRadius: 7,
              border: "none",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
              background: modo === v ? "var(--gold)" : "var(--surface2)",
              color: modo === v ? "#000" : "var(--muted)",
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Selectores */}
      <div
        style={{
          padding: "8px 14px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          flexShrink: 0,
        }}
      >
        {modo === "atleta" ? (
          <>
            <select
              name="field_88"
              className="form-select"
              value={atletaId || ""}
              onChange={(e) => setAtletaId(e.target.value)}
              style={{ fontSize: 12, padding: "5px 10px" }}
            >
              {atletas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
            <select
              name="field_89"
              className="form-select"
              value={mesoId || misMesos[0]?.id || ""}
              onChange={(e) => setMesoId(e.target.value)}
              style={{ fontSize: 12, padding: "5px 10px" }}
            >
              {misMesos.length === 0 ? (
                <option value="">Sin mesociclos</option>
              ) : (
                misMesos.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre || "Sin nombre"} ·{" "}
                    {formatDateDisplay(m.fecha_inicio)} · {m.modo}
                  </option>
                ))
              )}
            </select>
          </>
        ) : (
          <select
            name="field_90"
            className="form-select"
            value={pltId || ""}
            onChange={(e) => setPltId(e.target.value)}
            style={{ fontSize: 12, padding: "5px 10px" }}
          >
            {plantillas.length === 0 ? (
              <option value="">Sin plantillas</option>
            ) : (
              plantillas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                  {p.escuela ? ` · EI N${p.escuela_nivel}` : ""}
                </option>
              ))
            )}
          </select>
        )}
      </div>

      {/* Vista tabs — botones inline directos, sin componente interno */}
      <div
        style={{
          padding: "8px 14px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          gap: 6,
          flexShrink: 0,
        }}
      >
        {(fuente?.pretemporada === true || fuente?.pretemporada === "true"
          ? ["planilla", "pdf"]
          : ["planilla", "resumen", "pdf"]
        ).map((id) => (
          <button
            key={id}
            onClick={() => {
              setVista(id);
              setVistaKey((prev) => ({ ...prev, [id]: Date.now() }));
            }}
            style={{
              flex: 1,
              padding: "6px 0",
              border: "none",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
              borderRadius: 8,
              background: vista === id ? "var(--gold)" : "var(--surface2)",
              color: vista === id ? "#000" : "var(--muted)",
              transition: "all .15s",
            }}
          >
            {id === "planilla"
              ? "Planilla"
              : id === "resumen"
                ? "Resumen"
                : "PDF"}
          </button>
        ))}
      </div>

      {/* Semanas */}
      {vista === "planilla" && semanas.length > 0 && (
        <div
          style={{
            padding: "6px 14px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            gap: 5,
            overflowX: "auto",
            flexShrink: 0,
            scrollbarWidth: "none",
          }}
        >
          {semanas.map((s, i) => (
            <button
              key={i}
              onClick={() => setSemIdx(i)}
              style={{
                padding: "4px 10px",
                borderRadius: 20,
                border: "none",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 700,
                whiteSpace: "nowrap",
                background: semIdx === i ? "var(--gold)" : "var(--surface2)",
                color: semIdx === i ? "#000" : "var(--muted)",
              }}
            >
              Sem {s.numero}
            </button>
          ))}
        </div>
      )}

      {/* Turnos */}
      {vista === "planilla" && sem?.turnos?.length > 0 && (
        <div
          style={{
            padding: "6px 14px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            gap: 5,
            overflowX: "auto",
            flexShrink: 0,
            scrollbarWidth: "none",
          }}
        >
          {sem.turnos.map((t, i) => (
            <button
              key={i}
              onClick={() => setTurnoIdx(i)}
              style={{
                padding: "4px 10px",
                borderRadius: 20,
                border: "none",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 700,
                whiteSpace: "nowrap",
                background:
                  turnoIdx === i ? "rgba(100,180,255,.85)" : "var(--surface2)",
                color: turnoIdx === i ? "#000" : "var(--muted)",
              }}
            >
              T{t.numero || i + 1}
              {t.dia ? ` · ${t.dia}` : ""}
            </button>
          ))}
        </div>
      )}

      {/* Contenido scrolleable */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
        {vista === "planilla" && <VistaPlanilla />}

        {vista === "resumen" && (
          <div>
            <div
              style={{
                fontSize: 10,
                color: "var(--muted)",
                padding: "4px 0 8px",
                fontFamily: "monospace",
              }}
            >
              debug: hasDatos={String(_hasDatos)} mesoId=
              {_mesoRef?.id || "null"} sems={_mesoRef?.semanas?.length || 0}
            </div>
            {_hasDatos ? (
              <PanelTabBoundary tab="Resumen">
                <PageResumen
                  key={vistaKey.resumen}
                  meso={_mesoRef}
                  atleta={_atletaRef}
                  irm_arr={irm_arr}
                  irm_env={irm_env}
                  normativos={atletaNormativos}
                />
              </PanelTabBoundary>
            ) : (
              <div
                style={{
                  padding: 32,
                  textAlign: "center",
                  color: "var(--muted)",
                  fontSize: 13,
                }}
              >
                Sin datos — seleccioná un atleta con mesociclo
              </div>
            )}
          </div>
        )}

        {vista === "pdf" &&
          (_hasDatos ? (
            <PanelTabBoundary tab="PDF">
              <PagePDF
                key={vistaKey.pdf}
                meso={_mesoRef}
                atleta={_atletaRef}
                irm_arr={irm_arr}
                irm_env={irm_env}
                normativos={atletaNormativos}
              />
            </PanelTabBoundary>
          ) : (
            <div
              style={{
                padding: 32,
                textAlign: "center",
                color: "var(--muted)",
                fontSize: 13,
              }}
            >
              Sin datos — seleccioná un atleta con mesociclo
            </div>
          ))}
      </div>
    </div>
  );
}
