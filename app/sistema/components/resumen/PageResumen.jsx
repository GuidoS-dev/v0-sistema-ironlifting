import { useState, useEffect, useMemo, useCallback } from "react";
import { EJERCICIOS } from "../../data/ejercicios";
import { CAT_COLOR } from "../../data/constantes";
import { INTENSIDADES, TABLA_DEFAULT } from "../../data/tablas-default";
import {
  calcSeriesRepsKg,
  getRepsVal,
  loadMesoOverridesFromLocal,
} from "../../lib/calc";

// Wrapper con render diferido: paint skeleton primero, montar PageResumenContent en next tick.
// (PageResumenContent corre cómputos pesados al montar; sin diferir, el click "Resumen" se siente colgado)
export function PageResumen(props) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setReady(true), 0);
    return () => clearTimeout(id);
  }, []);
  if (!ready) {
    return (
      <div
        style={{
          padding: 24,
          color: "var(--muted)",
          fontFamily: "'DM Sans'",
          fontSize: 13,
          letterSpacing: ".05em",
        }}
      >
        Calculando métricas…
      </div>
    );
  }
  return <PageResumenContent {...props} />;
}

function PageResumenContent({
  meso,
  atleta,
  irm_arr,
  irm_env,
  normativos: normativosProp = null,
}) {
  const [semActiva, setSemActiva] = useState(null);
  const [turnoActivo, setTurnoActivo] = useState(null);

  // Recharts via import (disponible en el entorno React)
  const [RC, setRC] = useState({});
  useEffect(() => {
    import("recharts")
      .then((m) => setRC(m))
      .catch(() => {
        // fallback: intentar desde window si ya fue cargado
        if (window.Recharts) setRC(window.Recharts);
      });
  }, []);
  const {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell,
  } = RC;
  const hasRecharts = !!BarChart;

  const normativos = useMemo(() => {
    if (normativosProp) return normativosProp;
    try {
      return (
        JSON.parse(localStorage.getItem("liftplan_normativos") || "null") ||
        EJERCICIOS
      );
    } catch {
      return EJERCICIOS;
    }
  }, [normativosProp]);

  const tablas = useMemo(() => {
    try {
      return (
        JSON.parse(localStorage.getItem("liftplan_tablas") || "null") ||
        TABLA_DEFAULT
      );
    } catch {
      return TABLA_DEFAULT;
    }
  }, []);

  // ── Overrides persistidos del mesociclo (repsEdit, manualEdit, % por bloque/turno) ──
  const overrides = useMemo(
    () => loadMesoOverridesFromLocal(meso.id),
    [meso.id],
  );
  const cellEditSaved = useMemo(() => {
    try {
      return (
        JSON.parse(
          localStorage.getItem(`liftplan_pt_${meso.id}_cellEdit`) || "null",
        ) || {}
      );
    } catch {
      return {};
    }
  }, [meso.id]);
  const cellManualSaved = useMemo(() => {
    try {
      return new Set(
        JSON.parse(
          localStorage.getItem(`liftplan_pt_${meso.id}_cellManual`) || "[]",
        ),
      );
    } catch {
      return new Set();
    }
  }, [meso.id]);

  // ── Función core: calcular métricas de un array de {ej, semIdx, tIdx} ────
  const calcMetricas = useCallback((pairs) => {
    let volReps = 0,
      volKg = 0,
      sumIntReps = 0;
    let levGrupo = {
      Arranque: 0,
      Envion: 0,
      Tirones: 0,
      Piernas: 0,
      Complementarios: 0,
    };
    let tonGrupo = {
      Arranque: 0,
      Envion: 0,
      Tirones: 0,
      Piernas: 0,
      Complementarios: 0,
    };
    let sumIntMed = 0,
      repsConIRM = 0;

    const _isEscuela = meso.escuela === true || meso.escuela === "true";

    pairs.forEach(({ ej, semIdx, tIdx }) => {
      const ejData = normativos.find((e) => e.id === Number(ej.ejercicio_id));
      if (!ejData) return;

      let vR = 0,
        vK = 0;

      if (_isEscuela) {
        // Escuela: usar bloques directamente (no hay intensidades/sembrado)
        (ej.bloques || []).forEach((bloque) => {
          const s = Number(bloque.series) || 0;
          const r = Number(bloque.reps) || 0;
          const rT = Math.round(s) * Math.round(r);
          if (rT === 0) return;
          let kg = bloque.kg != null ? Number(bloque.kg) : null;
          if (kg == null && bloque.pct) {
            const irm =
              ejData.base === "arranque" ? Number(irm_arr) : Number(irm_env);
            if (irm && ejData.pct_base)
              kg =
                Math.round(
                  ((((irm * ejData.pct_base) / 100) * bloque.pct) / 100) * 2,
                ) / 2;
          }
          vR += rT;
          vK += rT * (kg || 0);
          sumIntReps += (bloque.pct || 0) * rT;
        });
      } else {
        const repsVal = getRepsVal(meso, ej, semIdx, tIdx, overrides);
        const calcs = calcSeriesRepsKg(
          tablas,
          ej,
          ejData,
          irm_arr,
          irm_env,
          meso.modo,
          repsVal,
        );
        if (!calcs) return;

        INTENSIDADES.forEach((intens, iIdx) => {
          const c = calcs[iIdx];
          if (!c) return;
          const ckf = (f) => `${semIdx}-${tIdx}-${ej.id}-${intens}-${f}`;
          const getV = (f, def) =>
            cellManualSaved.has(ckf(f))
              ? Number(cellEditSaved[ckf(f)]) || 0
              : def || 0;
          const s = getV("series", c.series);
          const r = getV("reps", c.reps_serie);
          const kg = getV("kg", c.kg);
          if (r === 0) return;
          const sEff = s && s > 0 ? s : 1;
          const rT = Math.round(sEff) * Math.round(r);
          if (rT === 0) return;
          vR += rT;
          vK += rT * (kg || 0);
          sumIntReps += intens * rT;
        });
      }

      volReps += vR;
      volKg += vK;
      const cat = ejData.categoria || "Complementarios";
      levGrupo[cat] = (levGrupo[cat] || 0) + vR;
      tonGrupo[cat] = (tonGrupo[cat] || 0) + vK;

      const irm2 =
        ejData.base === "arranque" ? Number(irm_arr) : Number(irm_env);
      const kgB =
        irm2 && ejData.pct_base ? (irm2 * ejData.pct_base) / 100 : null;
      if (kgB && vR > 0 && vK > 0) {
        sumIntMed += (vK / vR / kgB) * 100 * vR;
        repsConIRM += vR;
      }
    });

    const pesoMedio = volReps > 0 ? Math.round((volKg / volReps) * 2) / 2 : 0;
    const coefInt =
      volReps > 0 ? Math.round((sumIntReps / volReps) * 10) / 10 : 0;
    const intMedia = repsConIRM > 0 ? Math.round(sumIntMed / repsConIRM) : 0;
    const totalLev = Object.values(levGrupo).reduce((a, b) => a + b, 0);
    const grupoData = Object.entries(levGrupo)
      .filter(([, v]) => v > 0)
      .map(([g, v]) => ({
        name: g,
        lev: v,
        ton: Math.round(tonGrupo[g]),
        pct: totalLev > 0 ? Math.round((v / totalLev) * 100) : 0,
        color: CAT_COLOR[g],
      }));
    return {
      volReps,
      volKg: Math.round(volKg),
      pesoMedio,
      coefInt,
      intMedia,
      grupoData,
    };
  }, [meso, normativos, irm_arr, irm_env, tablas, overrides, cellManualSaved, cellEditSaved]);

  const _isEscuelaMeso = meso.escuela === true || meso.escuela === "true";

  // ── Métricas por semana ───────────────────────────────────────────────────
  const metSemanas = useMemo(
    () =>
      meso.semanas.map((sem, semIdx) => {
        const pairs = sem.turnos.flatMap((t, tIdx) =>
          t.ejercicios
            .filter((e) => e.ejercicio_id)
            .map((ej) => ({ ej, semIdx, tIdx })),
        );
        return {
          label: `Sem ${sem.numero}`,
          pct: sem.pct_volumen ?? null,
          plan:
            meso.volumen_total && sem.pct_volumen
              ? Math.round((meso.volumen_total * sem.pct_volumen) / 100)
              : null,
          ...calcMetricas(pairs),
        };
      }),
    [meso, calcMetricas],
  );

  // ── Métricas por turno de la semana activa ────────────────────────────────
  const semVista = useMemo(
    () => (semActiva !== null ? meso.semanas[semActiva] : null),
    [semActiva, meso],
  );
  const metTurnos = useMemo(
    () =>
      semVista
        ? semVista.turnos
            .map((t, tIdx) => {
              const pairs = t.ejercicios
                .filter((e) => e.ejercicio_id)
                .map((ej) => ({ ej, semIdx: semActiva, tIdx }));
              return {
                label: t.dia
                  ? `T${tIdx + 1} ${t.dia.slice(0, 3)}`
                  : `T${tIdx + 1}`,
                ...calcMetricas(pairs),
              };
            })
            .filter((t) => t.volReps > 0)
        : [],
    [semVista, semActiva, calcMetricas],
  );

  // ── Métricas globales del mesociclo ───────────────────────────────────────
  const totMeso = useMemo(
    () =>
      calcMetricas(
        meso.semanas.flatMap((sem, semIdx) =>
          sem.turnos.flatMap((t, tIdx) =>
            t.ejercicios
              .filter((e) => e.ejercicio_id)
              .map((ej) => ({ ej, semIdx, tIdx })),
          ),
        ),
      ),
    [meso, calcMetricas],
  );

  // ── UI helpers ────────────────────────────────────────────────────────────
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "8px 12px",
          fontSize: 11,
        }}
      >
        <div
          style={{
            color: "var(--gold)",
            fontFamily: "'Bebas Neue'",
            fontSize: 13,
            marginBottom: 4,
          }}
        >
          {label}
        </div>
        {payload.map((p, i) => (
          <div
            key={i}
            style={{
              color: p.color,
              display: "flex",
              gap: 8,
              justifyContent: "space-between",
            }}
          >
            <span>{p.name}:</span>
            <span style={{ fontWeight: 700 }}>{p.value}</span>
          </div>
        ))}
      </div>
    );
  };

  const cardStyle = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "16px 20px",
  };

  const MetricBox = ({ label, value, sub, color = "var(--gold)" }) => (
    <div
      style={{
        background: "var(--surface2)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "10px 12px",
        textAlign: "center",
        flex: 1,
        minWidth: 80,
      }}
    >
      <div
        style={{
          fontFamily: "'Bebas Neue'",
          fontSize: 24,
          color,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 9,
          color: "var(--muted)",
          textTransform: "uppercase",
          letterSpacing: ".06em",
          marginTop: 3,
        }}
      >
        {label}
      </div>
      {sub && (
        <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 1 }}>
          {sub}
        </div>
      )}
    </div>
  );

  // Datos activos según navegación
  const chartDataSem = useMemo(
    () =>
      metSemanas.map((s) => ({
        name: s.label,
        "Vol. Real": s.volReps,
        Planificado: s.plan,
        Tonelaje: s.volKg,
        "Int. Media": s.intMedia,
        "Coef. Int.": s.coefInt,
        "Peso Medio": s.pesoMedio,
      })),
    [metSemanas],
  );

  const chartDataTurno = useMemo(
    () =>
      metTurnos.map((t) => ({
        name: t.label,
        "Vol. Reps": t.volReps,
        Tonelaje: t.volKg,
        "Int. Media": t.intMedia,
        "Coef. Int.": t.coefInt,
        "Peso Medio": t.pesoMedio,
      })),
    [metTurnos],
  );

  const vistaMetricas = useMemo(
    () =>
      semActiva !== null && turnoActivo !== null
        ? calcMetricas(
            semVista.turnos[turnoActivo]?.ejercicios
              .filter((e) => e.ejercicio_id)
              .map((ej) => ({
                ej,
                semIdx: semActiva,
                tIdx: turnoActivo,
              })) || [],
          )
        : semActiva !== null
          ? calcMetricas(
              semVista.turnos.flatMap((t, tIdx) =>
                t.ejercicios
                  .filter((e) => e.ejercicio_id)
                  .map((ej) => ({ ej, semIdx: semActiva, tIdx })),
              ),
            )
          : totMeso,
    [semActiva, turnoActivo, semVista, calcMetricas, totMeso],
  );

  const vistaLabel =
    turnoActivo !== null && semVista
      ? `T${turnoActivo + 1}${semVista.turnos[turnoActivo]?.dia ? " · " + semVista.turnos[turnoActivo].dia : ""}`
      : semActiva !== null
        ? `Semana ${semActiva + 1}`
        : "Mesociclo completo";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ── Navegación semana / turno ─────────────────────────────────── */}
      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
            minWidth: 0,
            overflowX: "auto",
          }}
        >
          <button
            onClick={() => {
              setSemActiva(null);
              setTurnoActivo(null);
            }}
            style={{
              padding: "4px 12px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              background:
                semActiva === null ? "var(--gold)" : "var(--surface3)",
              color: semActiva === null ? "#000" : "var(--muted)",
              fontFamily: "'DM Sans'",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Mesociclo
          </button>
          {meso.semanas.map((s, i) => (
            <button
              key={i}
              onClick={() => {
                setSemActiva(i);
                setTurnoActivo(null);
              }}
              style={{
                padding: "4px 12px",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                background:
                  semActiva === i && turnoActivo === null
                    ? "var(--gold)"
                    : "var(--surface3)",
                color:
                  semActiva === i && turnoActivo === null
                    ? "#000"
                    : "var(--muted)",
                fontFamily: "'DM Sans'",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Sem {s.numero}
            </button>
          ))}
        </div>
        {semActiva !== null && metTurnos.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginTop: 8,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: 10,
                color: "var(--muted)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: ".06em",
              }}
            >
              Turno:
            </span>
            {semVista.turnos.map((t, i) => {
              const hasEjs = t.ejercicios.some((e) => e.ejercicio_id);
              if (!hasEjs) return null;
              return (
                <button
                  key={i}
                  onClick={() => setTurnoActivo(turnoActivo === i ? null : i)}
                  style={{
                    padding: "3px 10px",
                    borderRadius: 5,
                    border: "none",
                    cursor: "pointer",
                    background:
                      turnoActivo === i ? "var(--blue)" : "var(--surface3)",
                    color: turnoActivo === i ? "#fff" : "var(--muted)",
                    fontFamily: "'DM Sans'",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  T{i + 1}
                  {t.dia ? ` · ${t.dia.slice(0, 3)}` : ""}
                </button>
              );
            })}
          </div>
        )}
        <div style={{ marginTop: 8, fontSize: 11, color: "var(--muted)" }}>
          Viendo:{" "}
          <span style={{ color: "var(--gold)", fontWeight: 700 }}>
            {vistaLabel}
          </span>
        </div>
      </div>

      {/* ── KPIs de la vista activa ───────────────────────────────────── */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <MetricBox
          label="VOL REPs"
          value={vistaMetricas.volReps || "—"}
          color="var(--gold)"
        />
        <MetricBox
          label="VOL Kg"
          value={vistaMetricas.volKg || "—"}
          color="var(--blue)"
        />
        <MetricBox
          label="Peso Medio"
          value={
            vistaMetricas.pesoMedio ? `${vistaMetricas.pesoMedio} kg` : "—"
          }
          color="var(--green)"
        />
        <MetricBox
          label="Int. Media"
          value={vistaMetricas.intMedia ? `${vistaMetricas.intMedia}%` : "—"}
          color="#9b87e8"
        />
        {semActiva === null && (
          <MetricBox
            label="IRM Arranque"
            value={irm_arr ? `${irm_arr} kg` : "—"}
            color="var(--gold)"
          />
        )}
        {semActiva === null && (
          <MetricBox
            label="IRM Envión"
            value={irm_env ? `${irm_env} kg` : "—"}
            color="var(--blue)"
          />
        )}
      </div>

      {/* ── Gráficos (solo cuando hay datos suficientes) ──────────────── */}
      {!hasRecharts && (
        <div
          style={{
            ...cardStyle,
            textAlign: "center",
            color: "var(--muted)",
            padding: 32,
            fontSize: 12,
          }}
        >
          Los gráficos requieren conexión para cargar la librería de
          visualización.
          <br />
          Las tablas y métricas están disponibles igualmente.
        </div>
      )}

      {hasRecharts && semActiva === null && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {/* Volumen por semana */}
          <div style={cardStyle}>
            <div
              style={{
                fontFamily: "'Bebas Neue'",
                fontSize: 15,
                color: "var(--text)",
                marginBottom: 10,
              }}
            >
              Volumen por semana
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartDataSem} barGap={3}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "var(--muted)", fontSize: 10 }}
                />
                <YAxis tick={{ fill: "var(--muted)", fontSize: 9 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                {!_isEscuelaMeso && (
                  <Bar
                    dataKey="Planificado"
                    fill="rgba(232,197,71,.2)"
                    radius={[3, 3, 0, 0]}
                  />
                )}
                <Bar
                  dataKey="Vol. Real"
                  fill="var(--gold)"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Intensidad media por semana */}
          <div style={cardStyle}>
            <div
              style={{
                fontFamily: "'Bebas Neue'",
                fontSize: 15,
                color: "var(--text)",
                marginBottom: 10,
              }}
            >
              Intensidad media por semana
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartDataSem}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "var(--muted)", fontSize: 10 }}
                />
                <YAxis tick={{ fill: "var(--muted)", fontSize: 9 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line
                  type="monotone"
                  dataKey="Int. Media"
                  stroke="#9b87e8"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#9b87e8" }}
                />
                <Line
                  type="monotone"
                  dataKey="Coef. Int."
                  stroke="var(--green)"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "var(--green)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={cardStyle}>
            <div
              style={{
                fontFamily: "'Bebas Neue'",
                fontSize: 15,
                color: "var(--text)",
                marginBottom: 10,
              }}
            >
              Peso Medio por semana
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartDataSem}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "var(--muted)", fontSize: 10 }}
                />
                <YAxis tick={{ fill: "var(--muted)", fontSize: 9 }} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="Peso Medio"
                  name="Peso Medio (kg)"
                  stroke="var(--blue)"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "var(--blue)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Distribución por grupo */}
          <div style={cardStyle}>
            <div
              style={{
                fontFamily: "'Bebas Neue'",
                fontSize: 15,
                color: "var(--text)",
                marginBottom: 10,
              }}
            >
              Distribución por grupo
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={totMeso.grupoData} layout="vertical" barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  type="number"
                  tick={{ fill: "var(--muted)", fontSize: 9 }}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fill: "var(--muted)", fontSize: 9 }}
                  width={88}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="lev" name="Levant." radius={[0, 3, 3, 0]}>
                  {totMeso.grupoData.map((g, i) => (
                    <Cell key={i} fill={g.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Gráficos por semana — turnos */}
      {hasRecharts &&
        semActiva !== null &&
        turnoActivo === null &&
        metTurnos.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            <div style={cardStyle}>
              <div
                style={{
                  fontFamily: "'Bebas Neue'",
                  fontSize: 15,
                  color: "var(--text)",
                  marginBottom: 10,
                }}
              >
                Vol. Reps por turno — Semana {semActiva + 1}
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartDataTurno}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "var(--muted)", fontSize: 10 }}
                  />
                  <YAxis tick={{ fill: "var(--muted)", fontSize: 9 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="Vol. Reps"
                    fill="var(--gold)"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={cardStyle}>
              <div
                style={{
                  fontFamily: "'Bebas Neue'",
                  fontSize: 15,
                  color: "var(--text)",
                  marginBottom: 10,
                }}
              >
                Tonelaje por turno — Semana {semActiva + 1}
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartDataTurno}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "var(--muted)", fontSize: 10 }}
                  />
                  <YAxis tick={{ fill: "var(--muted)", fontSize: 9 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="Tonelaje"
                    fill="var(--blue)"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={cardStyle}>
              <div
                style={{
                  fontFamily: "'Bebas Neue'",
                  fontSize: 15,
                  color: "var(--text)",
                  marginBottom: 10,
                }}
              >
                Int. Media por turno — Sem {semActiva + 1}
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartDataTurno}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "var(--muted)", fontSize: 10 }}
                  />
                  <YAxis tick={{ fill: "var(--muted)", fontSize: 9 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="Int. Media"
                    name="Int. Media (%)"
                    stroke="#9b87e8"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#9b87e8" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div style={{ ...cardStyle, gridColumn: "1 / -1" }}>
              <div
                style={{
                  fontFamily: "'Bebas Neue'",
                  fontSize: 15,
                  color: "var(--text)",
                  marginBottom: 10,
                }}
              >
                Peso Medio por turno — Sem {semActiva + 1}
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartDataTurno}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "var(--muted)", fontSize: 10 }}
                  />
                  <YAxis tick={{ fill: "var(--muted)", fontSize: 9 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="Peso Medio"
                    name="Peso Medio (kg)"
                    stroke="var(--blue)"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "var(--blue)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

      {/* ── Tabla resumen ─────────────────────────────────────────────── */}
      {semActiva === null && (
        <div style={cardStyle}>
          <div
            style={{
              fontFamily: "'Bebas Neue'",
              fontSize: 15,
              color: "var(--text)",
              marginBottom: 10,
            }}
          >
            Tabla por semana
          </div>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                borderCollapse: "separate",
                borderSpacing: "3px 2px",
                width: "100%",
              }}
            >
              <thead>
                <tr>
                  {[
                    "Semana",
                    "% Vol",
                    "Planif.",
                    "VOL REPs",
                    "VOL Kg",
                    "Peso Medio",
                    "Int. Media",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "5px 8px",
                        background: "var(--surface2)",
                        border: "1px solid var(--border)",
                        borderRadius: 5,
                        fontSize: 9,
                        color: "var(--muted)",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: ".05em",
                        textAlign: "center",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metSemanas.map((s, i) => (
                  <tr
                    key={i}
                    style={{ cursor: "pointer" }}
                    onClick={() => setSemActiva(i)}
                  >
                    <td
                      style={{
                        padding: "6px 8px",
                        fontFamily: "'Bebas Neue'",
                        fontSize: 16,
                        color: "var(--gold)",
                        textAlign: "center",
                        border: "1px solid var(--border)",
                        borderRadius: 5,
                      }}
                    >
                      {s.label}
                    </td>
                    <td
                      style={{
                        padding: "5px 8px",
                        textAlign: "center",
                        border: "1px solid var(--border)",
                        borderRadius: 5,
                        color: "var(--muted)",
                      }}
                    >
                      {s.pct}%
                    </td>
                    <td
                      style={{
                        padding: "5px 8px",
                        textAlign: "center",
                        border: "1px solid var(--border)",
                        borderRadius: 5,
                      }}
                    >
                      {s.plan}
                    </td>
                    <td
                      style={{
                        padding: "5px 8px",
                        textAlign: "center",
                        background: "rgba(232,197,71,.06)",
                        border: "1px solid rgba(232,197,71,.2)",
                        borderRadius: 5,
                        fontFamily: "'Bebas Neue'",
                        fontSize: 16,
                        color: "var(--gold)",
                      }}
                    >
                      {s.volReps || "—"}
                    </td>
                    <td
                      style={{
                        padding: "5px 8px",
                        textAlign: "center",
                        background: "rgba(71,180,232,.06)",
                        border: "1px solid rgba(71,180,232,.2)",
                        borderRadius: 5,
                        fontFamily: "'Bebas Neue'",
                        fontSize: 16,
                        color: "var(--blue)",
                      }}
                    >
                      {s.volKg || "—"}
                    </td>
                    <td
                      style={{
                        padding: "5px 8px",
                        textAlign: "center",
                        background: "rgba(71,232,160,.06)",
                        border: "1px solid rgba(71,232,160,.2)",
                        borderRadius: 5,
                        fontFamily: "'Bebas Neue'",
                        fontSize: 16,
                        color: "var(--green)",
                      }}
                    >
                      {s.pesoMedio || "—"}
                    </td>
                    <td
                      style={{
                        padding: "5px 8px",
                        textAlign: "center",
                        background: "rgba(155,135,232,.06)",
                        border: "1px solid rgba(155,135,232,.2)",
                        borderRadius: 5,
                        fontFamily: "'Bebas Neue'",
                        fontSize: 16,
                        color: "#9b87e8",
                      }}
                    >
                      {s.intMedia ? `${s.intMedia}%` : "—"}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td
                    colSpan={3}
                    style={{
                      padding: "5px 8px",
                      textAlign: "right",
                      fontSize: 9,
                      color: "var(--muted)",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: ".06em",
                      borderTop: "2px solid var(--border)",
                    }}
                  >
                    Total
                  </td>
                  <td
                    style={{
                      padding: "5px 8px",
                      textAlign: "center",
                      background: "rgba(232,197,71,.12)",
                      border: "1px solid rgba(232,197,71,.4)",
                      borderRadius: 5,
                      fontFamily: "'Bebas Neue'",
                      fontSize: 18,
                      color: "var(--gold)",
                      fontWeight: 700,
                    }}
                  >
                    {totMeso.volReps || "—"}
                  </td>
                  <td
                    style={{
                      padding: "5px 8px",
                      textAlign: "center",
                      background: "rgba(71,180,232,.12)",
                      border: "1px solid rgba(71,180,232,.4)",
                      borderRadius: 5,
                      fontFamily: "'Bebas Neue'",
                      fontSize: 18,
                      color: "var(--blue)",
                      fontWeight: 700,
                    }}
                  >
                    {totMeso.volKg || "—"}
                  </td>
                  <td
                    style={{
                      padding: "5px 8px",
                      textAlign: "center",
                      background: "rgba(71,232,160,.12)",
                      border: "1px solid rgba(71,232,160,.4)",
                      borderRadius: 5,
                      fontFamily: "'Bebas Neue'",
                      fontSize: 18,
                      color: "var(--green)",
                      fontWeight: 700,
                    }}
                  >
                    {totMeso.pesoMedio ? `${totMeso.pesoMedio} kg` : "—"}
                  </td>
                  <td
                    style={{
                      padding: "5px 8px",
                      textAlign: "center",
                      background: "rgba(155,135,232,.12)",
                      border: "1px solid rgba(155,135,232,.4)",
                      borderRadius: 5,
                      fontFamily: "'Bebas Neue'",
                      fontSize: 18,
                      color: "#9b87e8",
                      fontWeight: 700,
                    }}
                  >
                    {totMeso.intMedia ? `${totMeso.intMedia}%` : "—"}
                  </td>
                </tr>
              </tbody>
            </table>
            <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 6 }}>
              💡 Click en una fila para ver el detalle por turnos de esa semana
            </div>
          </div>
        </div>
      )}

      {/* Tabla por turno cuando hay semana seleccionada */}
      {semActiva !== null && turnoActivo === null && metTurnos.length > 0 && (
        <div style={cardStyle}>
          <div
            style={{
              fontFamily: "'Bebas Neue'",
              fontSize: 15,
              color: "var(--text)",
              marginBottom: 10,
            }}
          >
            Detalle por turno — Semana {semActiva + 1}
          </div>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                borderCollapse: "separate",
                borderSpacing: "3px 2px",
                width: "100%",
              }}
            >
              <thead>
                <tr>
                  {[
                    "Turno",
                    "Día",
                    "VOL REPs",
                    "VOL Kg",
                    "Peso Medio",
                    "Int. Media",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "5px 8px",
                        background: "var(--surface2)",
                        border: "1px solid var(--border)",
                        borderRadius: 5,
                        fontSize: 9,
                        color: "var(--muted)",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: ".05em",
                        textAlign: "center",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {semVista.turnos.map((t, tIdx) => {
                  const mt = metTurnos.find((x) =>
                    x.label.startsWith(`T${tIdx + 1}`),
                  );
                  if (!mt) return null;
                  return (
                    <tr
                      key={tIdx}
                      style={{ cursor: "pointer" }}
                      onClick={() => setTurnoActivo(tIdx)}
                    >
                      <td
                        style={{
                          padding: "6px 8px",
                          fontFamily: "'Bebas Neue'",
                          fontSize: 16,
                          color: "var(--gold)",
                          textAlign: "center",
                          border: "1px solid var(--border)",
                          borderRadius: 5,
                        }}
                      >
                        T{tIdx + 1}
                      </td>
                      <td
                        style={{
                          padding: "5px 8px",
                          textAlign: "center",
                          border: "1px solid var(--border)",
                          borderRadius: 5,
                          color: "var(--muted)",
                          fontSize: 11,
                        }}
                      >
                        {t.dia || "—"}
                        {t.momento ? ` ${t.momento.slice(0, 1)}` : ""}
                      </td>
                      <td
                        style={{
                          padding: "5px 8px",
                          textAlign: "center",
                          background: "rgba(232,197,71,.06)",
                          border: "1px solid rgba(232,197,71,.2)",
                          borderRadius: 5,
                          fontFamily: "'Bebas Neue'",
                          fontSize: 16,
                          color: "var(--gold)",
                        }}
                      >
                        {mt.volReps || "—"}
                      </td>
                      <td
                        style={{
                          padding: "5px 8px",
                          textAlign: "center",
                          background: "rgba(71,180,232,.06)",
                          border: "1px solid rgba(71,180,232,.2)",
                          borderRadius: 5,
                          fontFamily: "'Bebas Neue'",
                          fontSize: 16,
                          color: "var(--blue)",
                        }}
                      >
                        {mt.volKg || "—"}
                      </td>
                      <td
                        style={{
                          padding: "5px 8px",
                          textAlign: "center",
                          background: "rgba(71,232,160,.06)",
                          border: "1px solid rgba(71,232,160,.2)",
                          borderRadius: 5,
                          fontFamily: "'Bebas Neue'",
                          fontSize: 16,
                          color: "var(--green)",
                        }}
                      >
                        {mt.pesoMedio || "—"}
                      </td>
                      <td
                        style={{
                          padding: "5px 8px",
                          textAlign: "center",
                          background: "rgba(155,135,232,.06)",
                          border: "1px solid rgba(155,135,232,.2)",
                          borderRadius: 5,
                          fontFamily: "'Bebas Neue'",
                          fontSize: 16,
                          color: "#9b87e8",
                        }}
                      >
                        {mt.intMedia ? `${mt.intMedia}%` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 6 }}>
              💡 Click en un turno para ver sus métricas individuales
            </div>
          </div>
        </div>
      )}

      {/* Desglose por grupo */}
      {vistaMetricas.grupoData.length > 0 && (
        <div style={cardStyle}>
          <div
            style={{
              fontFamily: "'Bebas Neue'",
              fontSize: 15,
              color: "var(--text)",
              marginBottom: 14,
            }}
          >
            Distribución por grupo — {vistaLabel}
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "flex-end",
            }}
          >
            {vistaMetricas.grupoData.map((g) => {
              const maxLev = Math.max(
                ...vistaMetricas.grupoData.map((x) => x.lev),
              );
              const pctH = maxLev > 0 ? g.lev / maxLev : 0;
              return (
                <div
                  key={g.name}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    minWidth: 70,
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--muted)",
                      fontFamily: "'Bebas Neue'",
                      letterSpacing: ".05em",
                    }}
                  >
                    {g.lev} reps
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: Math.max(8, Math.round(100 * pctH)),
                      background: g.color,
                      borderRadius: "4px 4px 0 0",
                      transition: "height .3s",
                      opacity: 0.85,
                    }}
                  />
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--muted)",
                      marginTop: 2,
                    }}
                  >
                    {g.ton} kg
                  </div>
                  <div
                    style={{
                      fontFamily: "'Bebas Neue'",
                      fontSize: 13,
                      color: g.color,
                      letterSpacing: ".04em",
                    }}
                  >
                    {g.name.slice(0, 3).toUpperCase()}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--muted)" }}>
                    {g.pct}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
