import React, { useState, useEffect, useRef, useMemo } from "react";
import { ChevronDown, Download, MessageCircle, Send, Timer } from "lucide-react";
import { EJERCICIOS } from "../../data/ejercicios";
import { resolveExerciseName } from "../../data/constantes";
import { INTENSIDADES, TABLA_DEFAULT } from "../../data/tablas-default";
import {
  calcSeriesRepsKg,
  getRepsVal,
  loadMesoOverridesFromLocal,
} from "../../lib/calc";
import { formatDateDisplay, formatFechaSemana, getFechaSemanaEfectiva } from "../../lib/ciclo-menstrual";
import { LogoHorizontal } from "../common/Logos";
import { NormativoInfoButton } from "../normativos/NormativoInfoButton";
import { NormativoInfoModal } from "../normativos/NormativoInfoModal";
import { findNormativoById } from "../../lib/normativos-info";

// ── Wrapper con render diferido: paint skeleton primero, montar PagePDFContent en next tick ──
// (PagePDFContent corre cómputos pesados al montar; sin diferir, el click "PDF" se siente colgado)
export function PagePDF(props) {
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
        Generando PDF…
      </div>
    );
  }
  return <PagePDFContent {...props} />;
}

function PagePDFContent({
  meso,
  atleta,
  irm_arr,
  irm_env,
  normativos: normativosProp = null,
  tablas: tablasProp = null,
  hideActions = false,
  onStartTimer = null,
}) {
  const previewRef = React.useRef(null);
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
  const tablas =
    tablasProp ??
    (() => {
      try {
        return (
          JSON.parse(localStorage.getItem("liftplan_tablas") || "null") ||
          TABLA_DEFAULT
        );
      } catch {
        return TABLA_DEFAULT;
      }
    })();
  const overrides = loadMesoOverridesFromLocal(meso.id);
  const cellEditSaved = (() => {
    try {
      return (
        JSON.parse(
          localStorage.getItem(`liftplan_pt_${meso.id}_cellEdit`) || "null",
        ) || {}
      );
    } catch {
      return {};
    }
  })();
  const cellManualSaved = (() => {
    try {
      return new Set(
        JSON.parse(
          localStorage.getItem(`liftplan_pt_${meso.id}_cellManual`) || "[]",
        ),
      );
    } catch {
      return new Set();
    }
  })();
  const nameEditSaved = (() => {
    try {
      return (
        JSON.parse(
          localStorage.getItem(`liftplan_pt_${meso.id}_nameEdit`) || "null",
        ) || {}
      );
    } catch {
      return {};
    }
  })();
  const noteEditSaved = (() => {
    try {
      return (
        JSON.parse(
          localStorage.getItem(`liftplan_pt_${meso.id}_noteEdit`) || "null",
        ) || {}
      );
    } catch {
      return {};
    }
  })();

  const getCell = (k, intens, field, calc) =>
    cellManualSaved.has(`${k}-${intens}-${field}`)
      ? cellEditSaved[`${k}-${intens}-${field}`]
      : calc;

  const GC = {
    Arranque: "#b8860b",
    Envion: "#1565c0",
    Tirones: "#b71c1c",
    Piernas: "#1b5e20",
    Complementarios: "#4a148c",
  };
  const GB = {
    Arranque: "#fff8e1",
    Envion: "#e3f2fd",
    Tirones: "#ffebee",
    Piernas: "#e8f5e9",
    Complementarios: "#f3e5f5",
  };

  // Calcular métricas resumen por semana
  const isEscuelaPdf = meso.escuela === true || meso.escuela === "true";
  const metricas = useMemo(() => meso.semanas.map((sem, semIdx) => {
    let volReps = 0,
      volKg = 0,
      sumIntReps = 0,
      sumIntMed = 0,
      repsConIRM = 0;
    const levGrupo = {
      Arranque: 0,
      Envion: 0,
      Tirones: 0,
      Piernas: 0,
      Complementarios: 0,
    };
    sem.turnos.forEach((t, tIdx) => {
      t.ejercicios
        .filter((e) => e.ejercicio_id)
        .forEach((ej) => {
          const ejData = normativos.find(
            (e) => e.id === Number(ej.ejercicio_id),
          );
          if (!ejData) return;

          let vR = 0,
            vK = 0;

          if (isEscuelaPdf) {
            // Escuela: usar bloques directamente
            (ej.bloques || []).forEach((bloque) => {
              const s = Number(bloque.series) || 0;
              const r = Number(bloque.reps) || 0;
              const rT = Math.round(s) * Math.round(r);
              if (rT === 0) return;
              let kg = bloque.kg != null ? Number(bloque.kg) : null;
              if (kg == null && bloque.pct) {
                const irm =
                  ejData.base === "arranque"
                    ? Number(irm_arr)
                    : Number(irm_env);
                if (irm && ejData.pct_base)
                  kg =
                    Math.round(
                      ((((irm * ejData.pct_base) / 100) * bloque.pct) / 100) *
                        2,
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
              const k2 = `${semIdx}-${tIdx}-${ej.id}`;
              const s = getCell(k2, intens, "series", c.series);
              const r = getCell(k2, intens, "reps", c.reps_serie);
              const kg = getCell(k2, intens, "kg", c.kg);
              if (!r) return;
              const sEff = s && s > 0 ? s : 1;
              const rT = Math.round(sEff) * Math.round(r);
              vR += rT;
              vK += rT * (kg || 0);
              sumIntReps += intens * rT;
            });
          }

          volReps += vR;
          volKg += vK;
          const cat = ejData.categoria || "Complementarios";
          levGrupo[cat] = (levGrupo[cat] || 0) + vR;
          const irm2 =
            ejData.base === "arranque" ? Number(irm_arr) : Number(irm_env);
          const kgB =
            irm2 && ejData.pct_base ? (irm2 * ejData.pct_base) / 100 : null;
          if (kgB && vR > 0 && vK > 0) {
            sumIntMed += (vK / vR / kgB) * 100 * vR;
            repsConIRM += vR;
          }
        });
    });
    return {
      volReps,
      volKg: Math.round(volKg),
      pesoMedio: volReps > 0 ? Math.round((volKg / volReps) * 2) / 2 : 0,
      coefInt: volReps > 0 ? Math.round((sumIntReps / volReps) * 10) / 10 : 0,
      intMedia: repsConIRM > 0 ? Math.round(sumIntMed / repsConIRM) : 0,
      levGrupo,
    };
  }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [meso, normativos, tablas, irm_arr, irm_env, isEscuelaPdf]);

  const totalVolReps = metricas.reduce((a, m) => a + m.volReps, 0);
  const totalVolKg = metricas.reduce((a, m) => a + m.volKg, 0);
  const pesoMedioTotal =
    totalVolReps > 0 ? Math.round((totalVolKg / totalVolReps) * 2) / 2 : 0;

  const hasBlockValue = (value) =>
    value !== null &&
    value !== undefined &&
    value !== "" &&
    !Number.isNaN(value);

  const hasComplementarioBlockContent = (bloque) => {
    if (!bloque) return false;
    return [
      bloque.pct,
      bloque.series,
      bloque.s,
      bloque.reps,
      bloque.r,
      bloque.kg,
      bloque.nota,
      bloque.note,
    ].some(hasBlockValue);
  };

  // Bar chart SVG inline para el resumen
  const BarChartSVG = ({ data, color, width = 200, height = 50 }) => {
    const max = Math.max(...data.map((d) => d.v), 1);
    const bw = (width - data.length * 2) / data.length;
    return (
      <svg
        viewBox={`0 0 ${width} ${height + 20}`}
        width="100%"
        style={{ overflow: "visible", maxWidth: width }}
      >
        {data.map((d, i) => {
          const h = Math.max(2, Math.round((d.v / max) * (height - 4)));
          const x = i * (bw + 2);
          return (
            <g key={i}>
              <rect
                x={x}
                y={height - h}
                width={bw}
                height={h}
                fill={color}
                opacity={0.85}
                rx={2}
              />
              <text
                x={x + bw / 2}
                y={height + 14}
                textAnchor="middle"
                fontSize={7}
                fill="#666"
              >
                {d.l}
              </text>
              {d.v > 0 && (
                <text
                  x={x + bw / 2}
                  y={height - h - 3}
                  textAnchor="middle"
                  fontSize={7}
                  fontWeight="700"
                  fill={color}
                >
                  {d.v}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    );
  };

  // Grupos donut-like horizontal bar
  const GrupoBar = ({ levGrupo }) => {
    const total = Object.values(levGrupo).reduce((a, b) => a + b, 0);
    if (!total) return null;
    const grupos = Object.entries(levGrupo).filter(([, v]) => v > 0);
    return (
      <div style={{ marginTop: 6 }}>
        <div
          style={{
            display: "flex",
            height: 10,
            borderRadius: 4,
            overflow: "hidden",
            gap: 1,
          }}
        >
          {grupos.map(([g, v]) => (
            <div
              key={g}
              style={{
                flex: v,
                background: GC[g],
                title: `${g}: ${v}`,
                minWidth: 2,
              }}
            />
          ))}
        </div>
        <div
          style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}
        >
          {grupos.map(([g, v]) => (
            <div
              key={g}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 3,
                fontSize: 7,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 1,
                  background: GC[g],
                  display: "inline-block",
                }}
              />
              <span style={{ color: "#555" }}>
                {g.slice(0, 3).toUpperCase()}
              </span>
              <span style={{ fontWeight: 700, color: "#1a1a2e" }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Helper para convertir complementario con bloques a row
  const buildComplementarioRow = (comp, semIdx, tIdx) => {
    const ejData = normativos.find((e) => e.id === Number(comp.ejercicio_id));

    const calcKgCompPdf = (pct) => {
      if (!ejData || !ejData.pct_base || pct == null) return null;
      if (pct === 0) return 0;
      const irmVal =
        ejData.base === "arranque" ? Number(irm_arr) : Number(irm_env);
      if (!irmVal) return null;
      return (
        Math.round(((((irmVal * ejData.pct_base) / 100) * pct) / 100) * 2) / 2
      );
    };

    // Los complementarios usan bloques en lugar de intensidades
    const cols = (comp.bloques || [])
      .map((bloque) => {
        const pct = bloque.pct;
        const kgCalc = pct != null ? calcKgCompPdf(pct) : null;
        return {
          pct,
          s: bloque.series,
          r: bloque.reps,
          kg: kgCalc != null ? kgCalc : bloque.kg,
          note: bloque.nota || "",
        };
      })
      .filter(hasComplementarioBlockContent);

    // Si no hay ejData, permitir si hay nombre_custom o aclaracion
    if (!ejData) {
      const hasCustomText = comp.nombre_custom || comp.aclaracion;
      if (!hasCustomText) return null;

      const nombre = resolveExerciseName(comp.nombre_custom, "");
      const aclaracion = comp.aclaracion ? ` (${comp.aclaracion})` : "";

      return {
        id: null,
        nombre: nombre + aclaracion,
        categoria: "Complementarios",
        cols,
        isComplementario: true,
        isCompBloques: true,
      };
    }

    const nombre = resolveExerciseName(comp.nombre_custom, ejData.nombre);
    const aclaracion = comp.aclaracion ? ` (${comp.aclaracion})` : "";

    return {
      id: comp.ejercicio_id,
      nombre: nombre + aclaracion,
      categoria: ejData.categoria,
      cols,
      isComplementario: true,
      isCompBloques: true, // Flag para indicar que usa bloques en lugar de intensidades
    };
  };

  // Helper para convertir ejercicio de pretemporada (ejercicio_ids + bloques) a row
  const buildPretemporadaRow = (ej) => {
    const ejercicio_ids = ej.ejercicio_ids || [];
    const hasAnyEid = ejercicio_ids.some((sub) => sub.eid);
    const hasCustomText = ej.nombre_custom || ej.aclaracion;
    if (!hasAnyEid && !hasCustomText) return null;

    // Build name from ejercicio_ids (same pattern as PlanillaPretemporada's buildAutoName)
    let nombre;
    if (ej.nombre_custom) {
      nombre = resolveExerciseName(ej.nombre_custom, "");
    } else {
      nombre = ejercicio_ids
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
    }
    const aclaracion = ej.aclaracion ? ` (${ej.aclaracion})` : "";

    // Build combined ID string like "27 + 34" or "27 c 74"
    const idDisplay = ejercicio_ids
      .map((sub, i) => {
        if (!sub.eid) return "";
        if (i === 0) return String(sub.eid);
        const sep = sub.link === "c" ? " c " : " + ";
        return sep + sub.eid;
      })
      .join("");

    // Determine categoria from first valid eid
    let categoria = "Complementarios";
    for (const sub of ejercicio_ids) {
      if (!sub.eid) continue;
      const ejData = normativos.find((e) => e.id === Number(sub.eid));
      if (ejData?.categoria) {
        categoria = ejData.categoria;
        break;
      }
    }

    // Calc kg using LOWEST pct_base among all ejercicio_ids (same as PlanillaPretemporada)
    const calcKgPretempPdf = (pct) => {
      if (!ejercicio_ids || !ejercicio_ids.length || pct == null) return null;
      if (pct === 0) return 0;
      let lowestKgBase = null;
      for (const { eid } of ejercicio_ids) {
        if (!eid) continue;
        const ejData = normativos.find((e) => e.id === Number(eid));
        if (!ejData || !ejData.pct_base) continue;
        const irm =
          ejData.base === "arranque" ? Number(irm_arr) : Number(irm_env);
        if (!irm) continue;
        const kgBase = (irm * ejData.pct_base) / 100;
        if (lowestKgBase === null || kgBase < lowestKgBase)
          lowestKgBase = kgBase;
      }
      if (lowestKgBase === null) return null;
      return Math.round(((lowestKgBase * pct) / 100) * 2) / 2;
    };

    const cols = (ej.bloques || [])
      .map((bloque) => {
        const pct = bloque.pct;
        const kg = pct != null ? calcKgPretempPdf(pct) : bloque.kg;
        return {
          pct,
          s: bloque.series,
          r: bloque.reps,
          kg: kg != null ? kg : bloque.kg,
          note: bloque.nota || "",
        };
      })
      .filter(hasComplementarioBlockContent);

    return {
      id: idDisplay || null,
      nombre: nombre + aclaracion,
      categoria,
      cols,
      isCompBloques: true,
      isPretemporadaRow: true,
    };
  };

  // Helper para convertir ejercicio a row
  const buildEjercicioRow = (ej, semIdx, tIdx, isComplementario = false) => {
    const ejData = normativos.find((e) => e.id === Number(ej.ejercicio_id));
    if (!ejData) return null;
    const k = `${semIdx}-${tIdx}-${ej.id}`;
    const nameKey = `${semIdx}-${tIdx}-${ej.ejercicio_id}`;
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
    const cols = INTENSIDADES.map((intens, iIdx) => {
      const c = calcs ? calcs[iIdx] : null;
      const s = getCell(k, intens, "series", c?.series);
      const r = getCell(k, intens, "reps", c?.reps_serie);
      const kg = getCell(k, intens, "kg", c?.kg);
      const noteKey = `${semIdx}-${tIdx}-${ej.id}-${intens}-note`;
      const note = noteEditSaved[noteKey] || "";
      return { intens, s, r, kg, note };
    }).filter((c) => c.s || c.r);
    const nombre = nameEditSaved[nameKey] || ejData.nombre;
    const aclaracion = ej.aclaracion ? ` (${ej.aclaracion})` : "";
    return {
      id: ej.ejercicio_id,
      nombre: nombre + aclaracion,
      categoria: ejData.categoria,
      cols,
      isComplementario,
    };
  };

  // ── Extract exercise data for timer ──
  const extractTimerExercises = (semIdx, tIdx) => {
    if (semIdx == null || tIdx == null) return [];
    const sem = meso.semanas[semIdx];
    if (!sem) return [];
    const turno = sem.turnos[tIdx];
    if (!turno) return [];
    const result = [];

    const pushCompRows = (comps, prefix) => {
      (comps || []).forEach((comp, ci) => {
        if (!comp.ejercicio_id && !comp.nombre_custom && !comp.aclaracion)
          return;
        const row = buildComplementarioRow(comp, semIdx, tIdx);
        if (!row || !row.cols.length) {
          // Si no hay bloques con contenido, al menos agregar la entrada base
          const ejData = comp.ejercicio_id
            ? normativos.find((e) => e.id === Number(comp.ejercicio_id))
            : null;
          const nombre =
            comp.nombre_custom || (ejData ? ejData.nombre : "Ejercicio");
          const acl = comp.aclaracion ? ` (${comp.aclaracion})` : "";
          result.push({
            id: comp.id || `${prefix}-${ci}`,
            name: nombre + acl,
            category: ejData?.categoria || "Complementarios",
            kg: null,
            reps: null,
            series: 3,
            notes: "",
            normativoId: comp.ejercicio_id ? String(comp.ejercicio_id) : undefined,
          });
          return;
        }
        const compId = comp.id || `${prefix}-${ci}`;
        const hasMulti = row.cols.length > 1;
        row.cols.forEach((col, colIdx) => {
          result.push({
            id: compId + (hasMulti ? `-${col.pct || ""}` : ""),
            name: row.nombre + (hasMulti && col.pct ? ` (${col.pct}%)` : ""),
            category: row.categoria,
            kg: col.kg || null,
            reps: col.r ? String(col.r) : null,
            series: col.s || 3,
            notes: col.note || "",
            normativoId: comp.ejercicio_id ? String(comp.ejercicio_id) : undefined,
            ...(hasMulti
              ? {
                  baseId: compId,
                  baseName: row.nombre,
                  intensityLabel: col.pct ? `${col.pct}%` : undefined,
                  intensityIndex: colIdx,
                  totalIntensities: row.cols.length,
                }
              : {}),
          });
        });
      });
    };

    pushCompRows(turno.complementarios_before, "cb");

    if (isPretemp) {
      // Pretemporada: ejercicios usan ejercicio_ids + bloques
      (turno.ejercicios || [])
        .filter(
          (e) =>
            (e.ejercicio_ids && e.ejercicio_ids.some((sub) => sub.eid)) ||
            e.nombre_custom ||
            e.aclaracion,
        )
        .forEach((ej) => {
          const row = buildPretemporadaRow(ej);
          if (!row || !row.cols.length) {
            // Fallback: at least push a basic entry
            result.push({
              id: ej.id || `pretemp-${result.length}`,
              name: row ? row.nombre : ej.nombre_custom || "Ejercicio",
              category: row ? row.categoria : "Complementarios",
              kg: null,
              reps: null,
              series: 3,
              notes: "",
              normativoId: row?.id || undefined,
            });
            return;
          }
          const ptId = ej.id || `pretemp-${result.length}`;
          const hasMulti = row.cols.length > 1;
          row.cols.forEach((col, colIdx) => {
            result.push({
              id: ptId + (hasMulti ? `-${col.pct || ""}` : ""),
              name: row.nombre + (hasMulti && col.pct ? ` (${col.pct}%)` : ""),
              category: row.categoria,
              kg: col.kg || null,
              reps: col.r ? String(col.r) : null,
              series: col.s || 3,
              notes: col.note || "",
              normativoId: row.id || undefined,
              ...(hasMulti
                ? {
                    baseId: ptId,
                    baseName: row.nombre,
                    intensityLabel: col.pct ? `${col.pct}%` : undefined,
                    intensityIndex: colIdx,
                    totalIntensities: row.cols.length,
                  }
                : {}),
            });
          });
        });
    } else if (isEscuelaPdf) {
      // Escuela: usar buildEscuelaRow (bloques)
      turno.ejercicios
        .filter((e) => e.ejercicio_id)
        .forEach((ej) => {
          const row = buildEscuelaRow(ej);
          if (!row || !row.cols.length) return;
          const hasMulti = row.cols.length > 1;
          row.cols.forEach((col, colIdx) => {
            result.push({
              id: ej.id + (hasMulti ? `-${col.pct || ""}` : ""),
              name: row.nombre + (hasMulti && col.pct ? ` (${col.pct}%)` : ""),
              category: row.categoria,
              kg: col.kg || null,
              reps: col.r ? String(col.r) : null,
              series: col.s || 3,
              notes: col.note || "",
              normativoId: ej.ejercicio_id ? String(ej.ejercicio_id) : undefined,
              ...(hasMulti
                ? {
                    baseId: ej.id,
                    baseName: row.nombre,
                    intensityLabel: col.pct ? `${col.pct}%` : undefined,
                    intensityIndex: colIdx,
                    totalIntensities: row.cols.length,
                  }
                : {}),
            });
          });
        });
    } else {
      turno.ejercicios
        .filter((e) => e.ejercicio_id)
        .forEach((ej) => {
          const row = buildEjercicioRow(ej, semIdx, tIdx, false);
          if (!row || !row.cols.length) return;
          const hasMulti = row.cols.length > 1;
          row.cols.forEach((col, colIdx) => {
            result.push({
              id: ej.id + (hasMulti ? `-${col.intens}` : ""),
              name: row.nombre + (hasMulti ? ` (${col.intens}%)` : ""),
              category: row.categoria,
              kg: col.kg || null,
              reps: col.r ? String(col.r) : null,
              series: col.s || 3,
              notes: col.note || "",
              normativoId: ej.ejercicio_id ? String(ej.ejercicio_id) : undefined,
              ...(hasMulti
                ? {
                    baseId: ej.id,
                    baseName: row.nombre,
                    intensityLabel: `${col.intens}%`,
                    intensityIndex: colIdx,
                    totalIntensities: row.cols.length,
                  }
                : {}),
            });
          });
        });
    }

    pushCompRows(turno.complementarios_after, "ca");

    // Enriquecer con descripción + video desde normativos globales (lookup por normativoId)
    return result.map((ex) => {
      if (!ex.normativoId) return ex;
      const ej = findNormativoById(normativos, ex.normativoId);
      if (!ej) return ex;
      const description = (ej.descripcion || "").trim();
      const videoUrl = (ej.videoUrl || "").trim();
      if (!description && !videoUrl) return ex;
      return {
        ...ex,
        description: description || undefined,
        videoUrl: videoUrl || undefined,
      };
    });
  };

  const isPretemp = meso.pretemporada === true || meso.pretemporada === "true";

  // Helper para construir row de ejercicio Escuela (bloques)
  const buildEscuelaRow = (ej) => {
    const ejData = normativos.find((e) => e.id === Number(ej.ejercicio_id));
    if (!ejData) return null;
    const cols = (ej.bloques || [])
      .map((bloque) => {
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
        return {
          pct: bloque.pct,
          s: bloque.series,
          r: bloque.reps,
          kg: kg != null ? kg : bloque.kg,
          note: bloque.nota || "",
        };
      })
      .filter(hasComplementarioBlockContent);
    const nombre = ejData.nombre;
    const aclaracion = ej.aclaracion ? ` (${ej.aclaracion})` : "";
    return {
      id: ej.ejercicio_id,
      nombre: nombre + aclaracion,
      categoria: ejData.categoria,
      cols,
      isCompBloques: true,
      isEscuelaRow: true,
    };
  };

  const semTurnos = useMemo(
    () =>
      meso.semanas.map((sem, semIdx) => {
        const turnos = sem.turnos
          .map((t, tIdx) => {
            const rows = [];

            if (isPretemp) {
              // Pretemporada: ejercicios usan ejercicio_ids + bloques
              const ejsPretemp = (t.ejercicios || []).filter(
                (e) =>
                  (e.ejercicio_ids && e.ejercicio_ids.some((sub) => sub.eid)) ||
                  e.nombre_custom ||
                  e.aclaracion,
              );
              if (!ejsPretemp.length) return null;
              ejsPretemp.forEach((ej) => {
                const row = buildPretemporadaRow(ej);
                if (row) rows.push(row);
              });
            } else if (isEscuelaPdf) {
              // Escuela: ejercicios usan ejercicio_id + bloques (sin intensidades)
              const ejs = t.ejercicios.filter((e) => e.ejercicio_id);
              if (!ejs.length) return null;
              ejs.forEach((ej) => {
                const row = buildEscuelaRow(ej);
                if (row) rows.push(row);
              });
            } else {
              // Regular: ejercicios usan ejercicio_id + intensidades
              const ejs = t.ejercicios.filter((e) => e.ejercicio_id);
              const hasEjerciciosPrincipales = ejs.length > 0;
              if (!hasEjerciciosPrincipales) return null;

              // Complementarios ANTES
              if (t.complementarios_before?.length > 0) {
                const compBefore = t.complementarios_before.filter(
                  (c) => c.ejercicio_id || c.nombre_custom || c.aclaracion,
                );
                compBefore.forEach((comp) => {
                  const row = buildComplementarioRow(comp, semIdx, tIdx);
                  if (row) rows.push({ ...row, isComplementarioBefore: true });
                });
              }

              // Ejercicios principales
              ejs.forEach((ej) => {
                const row = buildEjercicioRow(ej, semIdx, tIdx, false);
                if (row) rows.push(row);
              });

              // Complementarios DESPUÉS
              if (t.complementarios_after?.length > 0) {
                const compAfter = t.complementarios_after.filter(
                  (c) => c.ejercicio_id || c.nombre_custom || c.aclaracion,
                );
                compAfter.forEach((comp) => {
                  const row = buildComplementarioRow(comp, semIdx, tIdx);
                  if (row) rows.push({ ...row, isComplementarioAfter: true });
                });
              }
            }

            if (!rows.length) return null;
            return { tIdx, dia: t.dia, momento: t.momento, rows };
          })
          .filter(Boolean);
        return { sem, semIdx, turnos, met: metricas[semIdx] };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [meso, normativos, tablas, irm_arr, irm_env, metricas, isPretemp, isEscuelaPdf],
  );

  // Medir sem-header y posicionar turno-headers debajo (solo desktop, mobile no usa sticky)
  React.useLayoutEffect(() => {
    const container = previewRef.current;
    if (!container || window.innerWidth <= 768) return;
    container.querySelectorAll(".pdf-page").forEach((page) => {
      const semH = page.querySelector(".pdf-sem-header");
      if (!semH) return;
      const h = semH.offsetHeight;
      page.querySelectorAll(".pdf-turno-header").forEach((t) => {
        t.style.top = h + "px";
      });
    });
  }, [semTurnos]);

  const pdfStyle = `
    @media print {
      body > * { display: none !important; }
      #pdf-preview { display: block !important; position: static !important; }
      .no-print { display: none !important; }
      @page { margin: 10mm; size: A4 landscape; }
    }
    #pdf-preview * { box-sizing: border-box; }
    #pdf-preview {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 9px;
      color: #1a1a2e;
      background: #fff;
      line-height: 1.3;
    }
    .pdf-page {
      width: 100%;
      page-break-after: always;
      padding-bottom: 20px;
    }
    .pdf-page:last-child { page-break-after: avoid; }

    /* ── Portada / header general ── */
    .pdf-cover {
      background: #0d1117;
      color: #fff;
      padding: 18px 20px 16px;
      margin-bottom: 0;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      flex-wrap: wrap;
      gap: 12px;
    }
    .pdf-cover-name {
      font-size: 22px; font-weight: 900; letter-spacing: -.5px;
      color: #fff; line-height: 1.1;
    }
    .pdf-cover-meso {
      font-size: 11px; color: #f0b429; font-weight: 700;
      text-transform: uppercase; letter-spacing: .06em; margin-top: 3px;
    }
    .pdf-cover-sub {
      font-size: 9px; color: #888; margin-top: 6px;
    }
    .pdf-cover-right { text-align: right; }
    .pdf-irm-box {
      display: inline-flex; gap: 16px; margin-top: 8px;
    }
    .pdf-irm-item { text-align: center; }
    .pdf-irm-val {
      font-size: 16px; font-weight: 900; color: #f0b429; line-height: 1;
    }
    .pdf-irm-lbl {
      font-size: 7px; color: #888; text-transform: uppercase;
      letter-spacing: .08em; margin-top: 2px;
    }
    .pdf-accent-bar {
      height: 4px;
      background: linear-gradient(90deg, #f0b429 0%, #e05050 40%, #3090e0 70%, #30c080 100%);
      margin-bottom: 0;
    }

    /* ── Semana header ── */
    .pdf-sem-header {
      display: flex; align-items: stretch; margin-bottom: 10px;
      border: 1px solid #e0e0e0; border-radius: 6px; overflow: hidden;
    }
    .pdf-sem-num {
      display: none;
    }
    .pdf-sem-info { flex: 1; padding: 6px 10px; background: #fafafa; min-width: 0; }
    .pdf-sem-title { font-size: 10px; font-weight: 800; color: #1a1a2e; }
    .pdf-sem-details { font-size: 8px; color: #888; margin-top: 2px; }
    .pdf-sem-metrics {
      display: flex; gap: 1px; background: #e0e0e0;
    }
    .pdf-sem-metric {
      background: #fff; padding: 5px 7px; text-align: center; min-width: 44px;
    }
    .pdf-sem-metric-val {
      font-size: 11px; font-weight: 900; color: #1a1a2e; line-height: 1;
    }
    .pdf-sem-metric-lbl {
      font-size: 6px; color: #999; text-transform: uppercase;
      letter-spacing: .04em; margin-top: 1px;
    }

    /* ── Turno ── */
    .pdf-turno-header {
      background: #0d1117; color: #fff;
      padding: 3px 8px; margin: 6px 0 2px;
      display: flex; align-items: center; gap: 6px;
      border-radius: 3px;
    }
    .pdf-turno-num {
      font-size: 9px; font-weight: 900; color: #f0b429;
      text-transform: uppercase; letter-spacing: .04em;
    }
    .pdf-turno-dia { font-size: 8px; color: #aaa; }

    /* ── Collapsible turnos ── */
    .pdf-turno-header { cursor: pointer; user-select: none; -webkit-tap-highlight-color: transparent; }
    .pdf-turno-chevron {
      margin-left: auto; display: flex; align-items: center;
      transition: transform .25s ease;
      color: #666; flex-shrink: 0;
    }
    .pdf-turno-chevron.open { transform: rotate(180deg); color: #f0b429; }
    .pdf-turno-content {
      overflow: hidden; transition: max-height .3s ease, opacity .2s ease;
      max-height: 0; opacity: 0;
    }
    .pdf-turno-content.expanded {
      max-height: 9999px; opacity: 1;
    }
    @media print {
      .pdf-turno-content { max-height: none !important; opacity: 1 !important; overflow: visible !important; }
      .pdf-turno-chevron { display: none !important; }
      .pdf-sem-tabs-wrap { display: none !important; }
    }

    /* ── Week tabs ── */
    .pdf-sem-tabs-wrap {
      display: flex; align-items: center; gap: 6px;
      padding: 12px 12px; margin-bottom: 16px;
      background: transparent; border: none; border-radius: 0;
      flex-wrap: wrap;
    }
    .pdf-sem-tab {
      padding: 6px 14px; border-radius: 6px; border: 1px solid #1a1f2e;
      font-size: 11px; font-weight: 700; cursor: pointer;
      background: #0d1117; color: #f0b429; transition: all .2s;
      font-family: 'DM Sans', sans-serif;
    }
    .pdf-sem-tab.active {
      background: #0d1117; color: #f0b429; border-color: #f0b429; box-shadow: 0 0 0 1px #f0b429;
    }
    .pdf-sem-tab:hover:not(.active) { background: #161b22; }

    /* ── Tabla ejercicios ── */
    .pdf-table {
      width: 100%; border-collapse: collapse; margin-bottom: 6px;
    }
    .pdf-table thead tr {
      background: #f5f5f5; border-bottom: 2px solid #1a1a2e;
    }
    .pdf-table th {
      padding: 3px 3px; text-align: center;
      font-size: 7px; font-weight: 800; color: #1a1a2e;
      text-transform: uppercase; letter-spacing: .03em;
      border-right: 1px solid #e8e8e8;
    }
    .pdf-table th.left { text-align: left; }
    .pdf-table th.intens-header {
      background: #0d1117; color: #f0b429;
      font-size: 8px; font-weight: 900;
    }
    .pdf-table th.sub-header {
      font-size: 6px; font-weight: 600; color: #888;
      background: #f8f8f8; padding: 1px 2px;
    }
    .pdf-table td {
      padding: 3px 3px; border-bottom: 1px solid #f0f0f0;
      border-right: 1px solid #f0f0f0; text-align: center;
      vertical-align: middle;
    }
    .pdf-table td.left { text-align: left; }
    .pdf-table tr:hover td { background: #fafafa; }
    .pdf-table .grupo-dot {
      width: 6px; height: 6px; border-radius: 50%;
      display: inline-block; margin-right: 5px; vertical-align: middle;
    }
    .pdf-table .ej-nombre {
      font-size: 7.5px; font-weight: 600; color: #1a1a2e;
    }
    .pdf-table .cell-data {
      display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0;
      font-size: 8px; align-items: baseline; overflow: hidden;
    }
    .pdf-table .cell-data .cell-note {
      grid-column: 1 / -1; font-size: 6px; color: #666;
      text-align: center; line-height: 1.1; margin-top: 1px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .pdf-table .cell-series { font-weight: 900; color: #1a1a2e; font-size: 9px; }
    .pdf-table .cell-reps { color: #333; font-size: 8px; font-weight: 600; }
    .pdf-table .cell-kg { color: #888; font-size: 7px; font-weight: 400; }
    .pdf-table .cell-empty { color: #ddd; font-size: 10px; }
    .pdf-table tr.last-ej td { border-bottom: 2px solid #e0e0e0; }

    /* ── Resumen final ── */
    .pdf-resumen-page {
      padding: 24px 0 0;
    }
    .pdf-resumen-title {
      font-size: 14px; font-weight: 900; color: #1a1a2e;
      border-bottom: 2px solid #1a1a2e; padding-bottom: 4px; margin-bottom: 10px;
      text-transform: uppercase; letter-spacing: .05em;
    }
    .pdf-resumen-grid {
      display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; margin-bottom: 16px;
    }
    .pdf-kpi {
      background: #0d1117; padding: 8px 10px; border-radius: 6px;
    }
    .pdf-kpi-val {
      font-size: 17px; font-weight: 900; color: #f0b429; line-height: 1;
    }
    .pdf-kpi-lbl {
      font-size: 6.5px; color: #888; text-transform: uppercase;
      letter-spacing: .06em; margin-top: 2px;
    }
    .pdf-sem-table {
      width: 100%; border-collapse: collapse; margin-bottom: 16px;
    }
    .pdf-sem-table th {
      background: #0d1117; color: #fff; padding: 5px 8px;
      font-size: 8px; font-weight: 700; text-transform: uppercase;
      letter-spacing: .05em; text-align: center;
    }
    .pdf-sem-table td {
      padding: 5px 8px; border-bottom: 1px solid #f0f0f0;
      text-align: center; font-size: 9px;
    }
    .pdf-sem-table tr:last-child td {
      background: #f5f5f5; font-weight: 700; border-top: 2px solid #1a1a2e;
    }
    .pdf-footer {
      display: flex; justify-content: space-between; align-items: center;
      border-top: 1px solid #e0e0e0; padding-top: 6px; margin-top: 8px;
      font-size: 7px; color: #767676;
    }
    .pdf-footer strong { color: #1a1a2e; }

    /* ══════════════════════════════════════════════
       RESPONSIVE — Mobile-first (≤ 768px)
       ══════════════════════════════════════════════ */
    @media screen and (max-width: 768px) {
      #pdf-preview {
        font-size: 13px;
        line-height: 1.45;
      }

      /* ── Portada ── */
      .pdf-cover {
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 20px 16px 16px;
        gap: 6px;
      }
      .pdf-cover > div:first-child {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
      }
      .pdf-cover > div:first-child > div:first-child {
        flex-direction: column !important;
        align-items: center !important;
        gap: 8px !important;
      }
      .pdf-cover-name {
        font-size: 22px;
        word-break: break-word;
        text-align: center;
      }
      .pdf-cover-meso {
        font-size: 13px;
        text-align: center;
        line-height: 1.3;
      }
      .pdf-cover-sub {
        font-size: 11px;
        text-align: center;
      }
      .pdf-cover-right {
        text-align: center;
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        margin-top: 4px;
        padding-top: 10px;
        border-top: 1px solid rgba(255,255,255,.1);
      }
      .pdf-cover-right > div:first-child {
        font-size: 10px;
      }
      .pdf-irm-box {
        gap: 28px;
      }
      .pdf-irm-val {
        font-size: 26px;
      }
      .pdf-irm-lbl {
        font-size: 9px;
      }
      .pdf-cover svg {
        max-width: 180px;
        height: auto;
      }

      /* ── Semana header ── */
      .pdf-sem-header {
        flex-direction: column;
        border-radius: 8px;
        position: relative;
        z-index: 2;
        box-shadow: 0 2px 8px rgba(0,0,0,.15);
        background: #fafafa;
      }
      .pdf-sem-num {
        display: none;
      }
      .pdf-sem-info {
        padding: 10px 12px;
      }
      .pdf-sem-title {
        font-size: 13px;
      }
      .pdf-sem-details {
        font-size: 11px;
        margin-top: 4px;
      }
      .pdf-sem-metrics {
        flex-wrap: wrap;
        gap: 1px;
        border-radius: 0 0 8px 8px;
        overflow: hidden;
      }
      .pdf-sem-metric {
        flex: 1 1 auto;
        min-width: 60px;
        padding: 8px 6px;
      }
      .pdf-sem-metric-val {
        font-size: 15px;
      }
      .pdf-sem-metric-lbl {
        font-size: 8px;
        margin-top: 2px;
      }

      /* ── Turno ── */
      .pdf-turno-header {
        padding: 8px 12px;
        margin: 10px 0 0;
        border-radius: 6px;
        box-shadow: 0 2px 10px rgba(0,0,0,.25);
        position: relative;
        z-index: 2;
      }
      .pdf-turno-content {
        overflow: hidden;
      }
      .pdf-turno-num {
        font-size: 13px;
      }
      .pdf-turno-dia {
        font-size: 11px;
      }
      .pdf-turno-chevron { color: #888; }
      .pdf-turno-chevron.open { color: #f0b429; }

      /* ── Week tabs mobile ── */
      .pdf-sem-tabs-wrap {
        position: relative;
        background: transparent;
        border: none; border-radius: 0;
        margin: 0 0 16px; padding: 14px 4px 0;
        overflow-x: auto; flex-wrap: nowrap;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
        gap: 8px;
      }
      .pdf-sem-tabs-wrap::-webkit-scrollbar { display: none; }
      .pdf-sem-tab {
        font-size: 13px; padding: 10px 20px; white-space: nowrap; flex-shrink: 0;
        background: #0d1117; color: #f0b429;
        border: 1px solid #1a1f2e; border-radius: 8px;
      }
      .pdf-sem-tab.active {
        background: #0d1117; color: #f0b429; border-color: #f0b429; box-shadow: 0 0 0 1px #f0b429;
      }
      .pdf-sem-tab:hover:not(.active) { background: #161b22; }

      /* ── Tabla ejercicios — dark premium cards en móvil ── */
      .pdf-table,
      .pdf-table thead,
      .pdf-table tbody,
      .pdf-table th,
      .pdf-table td,
      .pdf-table tr {
        display: block;
      }
      .pdf-table thead {
        display: none;
      }

      /* Cada ejercicio = una card dark premium */
      .pdf-table tr {
        background: #0d1117;
        border: 1px solid #1e2733;
        border-radius: 10px;
        margin-bottom: 10px;
        padding: 0;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        box-shadow: 0 3px 12px rgba(0,0,0,.28);
      }
      .pdf-table tr.last-ej td {
        border-bottom: none;
      }
      .pdf-table td {
        border: none;
        padding: 0;
        text-align: left;
      }

      /* ID badge + nombre: header de la card */
      .pdf-table td:first-child {
        position: static;
        padding: 0;
        width: 48px;
        min-width: 48px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        align-self: stretch;
      }
      .pdf-table td:first-child span {
        font-size: 9px !important;
        padding: 2px 5px !important;
        border-radius: 3px !important;
        opacity: .8;
      }
      .pdf-table td.left {
        width: auto;
        flex: 1;
        min-width: 0;
        padding: 12px 12px 12px 8px;
        display: flex;
        align-items: center;
        align-self: stretch;
      }
      /* Wrap ID + name in same row */
      .pdf-table tr {
        flex-flow: row wrap;
      }
      .pdf-table td:first-child,
      .pdf-table td.left {
        border-bottom: 1px solid #1e2733;
        background: #0d1117;
      }
      /* Pretemporada merged ID+name cell: override first-child narrow width */
      .pdf-table td.pdf-pretemp-ej {
        width: auto !important;
        min-width: 0 !important;
        flex: 1 !important;
        justify-content: flex-start !important;
        padding: 10px 12px !important;
      }
      .pdf-table .cell-pct-pretemp {
        display: none;
      }
      .pdf-table .ej-nombre {
        font-size: 13px;
        font-weight: 700;
        line-height: 1.2;
        color: #e8e8e8;
        letter-spacing: .01em;
      }

      /* Cada celda de intensidad = una fila dentro de la card */
      .pdf-table td[data-label] {
        display: flex;
        align-items: center;
        padding: 0;
        border-bottom: 1px solid #1a2030;
        gap: 0;
        min-height: 42px;
        width: 100%;
        flex-basis: 100%;
        background: #0f1520 !important;
      }
      .pdf-table td[data-label]:last-child {
        border-bottom: none;
      }

      /* Label del porcentaje — columna fija a la izquierda */
      .pdf-table td[data-label]::before {
        content: attr(data-label);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        min-width: 48px;
        padding: 0;
        background: #0d1117;
        color: #d4a832;
        font-size: 11px;
        font-weight: 700;
        flex-shrink: 0;
        letter-spacing: -.02em;
        align-self: stretch;
        border-right: 1px solid #1e2733;
      }

      /* Cell data: two mini-cards [S×R] [Kg] */
      .pdf-table .cell-data {
        display: flex;
        align-items: center;
        gap: 0;
        font-size: 15px;
        flex: 1;
        padding: 10px 14px;
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        flex-wrap: wrap;
        overflow: visible;
      }
      /* Mini-card for series × reps */
      .pdf-table .cell-series {
        font-size: 15px;
        font-weight: 800;
        color: #fff;
        letter-spacing: -.3px;
      }
      .pdf-table .cell-series::after {
        content: '×';
        font-size: 11px;
        font-weight: 600;
        color: #d4a832;
        margin: 0 2px;
      }
      .pdf-table .cell-reps {
        font-size: 15px;
        font-weight: 800;
        color: #fff;
        letter-spacing: -.3px;
        padding-right: 2px;
      }
      .pdf-table .cell-reps::after {
        content: '';
        margin: 0;
      }
      /* Mini-card for kg */
      .pdf-table .cell-kg {
        font-size: 15px;
        font-weight: 800;
        color: #fff;
        background: #1a1a2e;
        padding: 5px 10px;
        border-radius: 6px;
        white-space: nowrap;
        margin-left: 6px;
      }
      .pdf-table .cell-kg::after {
        content: ' kg';
        font-size: 11px;
        font-weight: 600;
        color: #d4a832;
        margin-left: 2px;
        vertical-align: baseline;
      }
      /* Wrap series+reps in a mini-card too — via parent background trick */
      .pdf-table .cell-data {
        background: transparent;
      }
      .pdf-table .cell-data > .cell-series:first-child,
      .pdf-table .cell-data > .cell-pct-pretemp + .cell-series {
        background: #1a1a2e;
        padding: 5px 0 5px 10px;
        border-radius: 6px 0 0 6px;
        margin-left: 0;
      }
      .pdf-table .cell-data > .cell-reps {
        background: #1a1a2e;
        padding: 5px 10px 5px 0;
        border-radius: 0 6px 6px 0;
      }
      .pdf-table .cell-data .cell-note {
        font-size: 10px;
        white-space: normal;
        overflow: visible;
        text-overflow: unset;
        color: #8a95a8;
        font-style: italic;
        flex-basis: 100%;
        flex-shrink: 1;
        margin-left: 0;
        margin-top: 4px;
        padding-left: 0;
        text-align: left;
        line-height: 1.3;
      }

      /* Empty cells: hide (except pretemporada rows) */
      .pdf-table td[data-label]:has(.cell-empty) {
        display: none;
      }
      .pdf-table tr.pretemporada-row td[data-label]:has(.cell-empty) {
        display: flex;
      }
      .pdf-table tr.pretemporada-row td[data-label]:has(.cell-empty) .cell-empty {
        color: #333;
        font-size: 13px;
        padding: 10px 14px;
      }

      .pdf-table .cell-empty {
        font-size: 14px;
        color: #333;
      }
      .pdf-table .cell-pct-pretemp {
        font-size: 9px;
        font-weight: 700;
        color: #f0b429;
        background: #1a1a2e;
        padding: 3px 6px;
        border-radius: 4px;
        margin-right: 4px;
        white-space: nowrap;
      }

      /* Separator rows */
      .pdf-table tr[style*="height: 2px"],
      .pdf-table tr[style*="height:2px"] {
        height: 0 !important;
        margin: 4px 0;
        background: none !important;
        border: none;
        box-shadow: none;
        padding: 0;
      }
      .pdf-table tr[style*="height: 2px"] td,
      .pdf-table tr[style*="height:2px"] td {
        padding: 0;
        height: 0;
      }

      /* ── Páginas ── */
      .pdf-page {
        padding: 0 8px 20px !important;
        page-break-after: auto;
      }

      /* ── Resumen ── */
      .pdf-resumen-page {
        padding: 16px 8px 20px !important;
      }
      .pdf-resumen-title {
        font-size: 16px;
        margin-bottom: 12px;
      }
      .pdf-resumen-grid {
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .pdf-kpi {
        padding: 12px 14px;
        border-radius: 8px;
      }
      .pdf-kpi-val {
        font-size: 22px;
      }
      .pdf-kpi-lbl {
        font-size: 9px;
        margin-top: 4px;
      }

      /* ── Tabla resumen por semana ── */
      .pdf-sem-table {
        display: block;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }
      .pdf-sem-table th {
        font-size: 9px;
        padding: 8px 6px;
        white-space: nowrap;
      }
      .pdf-sem-table td {
        font-size: 12px;
        padding: 8px 6px;
        white-space: nowrap;
      }

      /* ── Footer ── */
      .pdf-footer {
        flex-direction: column;
        gap: 4px;
        align-items: flex-start;
        font-size: 10px;
        padding-top: 10px;
        margin-top: 16px;
        position: relative;
        z-index: 3;
      }
    }

    /* ══ Extra-small screens (≤ 400px) ══ */
    @media screen and (max-width: 400px) {
      .pdf-cover-name {
        font-size: 17px;
      }
      .pdf-resumen-grid {
        grid-template-columns: 1fr;
      }
      .pdf-table td[data-label]::before {
        width: 40px;
        min-width: 40px;
        font-size: 10px;
      }
      .pdf-table .cell-series,
      .pdf-table .cell-reps {
        font-size: 14px;
      }
      .pdf-table .cell-kg {
        font-size: 14px;
      }
    }

    /* ══ Mobile bottom navigation bar ══ */
    .pdf-mobile-nav {
      display: none;
    }
    @media screen and (max-width: 768px) {
      .pdf-mobile-nav {
        display: flex;
        flex-direction: column;
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 100;
        background: #0d1117;
        border-top: 1px solid rgba(240,180,41,.18);
        padding: 10px 12px 0;
        padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 36px);
        gap: 0;
        align-items: stretch;
        box-shadow: 0 -4px 20px rgba(0,0,0,.45);
        transition: transform .35s ease, opacity .35s ease;
      }
      .pdf-mobile-nav.mob-nav-hidden {
        transform: translateY(100%);
        opacity: 0;
        pointer-events: none;
      }
      .pdf-mobile-nav-row {
        display: flex;
        gap: 0;
        align-items: stretch;
        width: 100%;
        background: rgba(26,32,48,.7);
        border-radius: 10px;
        overflow: hidden;
        border: 1px solid rgba(255,255,255,.06);
      }
      .pdf-mobile-nav-pill {
        flex: 1;
        padding: 10px 4px;
        border-radius: 0;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: .02em;
        border: none;
        cursor: pointer;
        font-family: 'DM Sans', sans-serif;
        transition: all .2s ease;
        background: transparent;
        color: rgba(138,149,168,.7);
        position: relative;
        text-align: center;
        -webkit-tap-highlight-color: transparent;
      }
      .pdf-mobile-nav-pill + .pdf-mobile-nav-pill {
        border-left: 1px solid rgba(255,255,255,.04);
      }
      .pdf-mobile-nav-pill.active {
        background: rgba(240,180,41,.12);
        color: #f0b429;
      }
      .pdf-mobile-nav-pill.active::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 20%;
        right: 20%;
        height: 2px;
        background: #f0b429;
        border-radius: 2px 2px 0 0;
      }
      .pdf-mobile-nav-turnos {
        display: flex;
        gap: 6px;
        width: 100%;
        justify-content: center;
        padding-top: 8px;
        margin-top: 8px;
      }
      .pdf-mobile-nav-turno {
        flex: 1;
        max-width: 120px;
        padding: 7px 6px;
        border-radius: 8px;
        font-size: 11px;
        font-weight: 600;
        border: 1px solid rgba(255,255,255,.06);
        cursor: pointer;
        font-family: 'DM Sans', sans-serif;
        background: rgba(26,32,48,.6);
        color: rgba(138,149,168,.8);
        transition: all .15s;
        text-align: center;
        -webkit-tap-highlight-color: transparent;
      }
      .pdf-mobile-nav-turno:active,
      .pdf-mobile-nav-turno.active {
        background: rgba(240,180,41,.15);
        color: #f0b429;
        border-color: rgba(240,180,41,.3);
      }
      /* Disable exercise row hover on mobile */
      .pdf-table tr:hover td {
        background: inherit !important;
      }
      /* Floating indicator when nav is hidden */
      .mob-nav-indicator {
        position: fixed;
        bottom: calc(env(safe-area-inset-bottom, 0px) + 100px);
        right: 12px;
        z-index: 99;
        background: #0d1117;
        border: 1px solid rgba(240,180,41,.3);
        border-radius: 20px;
        padding: 6px 14px;
        font-size: 12px;
        font-weight: 700;
        font-family: 'DM Sans', sans-serif;
        color: #f0b429;
        cursor: pointer;
        box-shadow: 0 4px 16px rgba(0,0,0,.5);
        transition: opacity .25s ease, transform .25s ease;
        -webkit-tap-highlight-color: transparent;
        opacity: 1;
        transform: translateY(0);
      }
      .mob-nav-indicator.hidden {
        opacity: 0;
        transform: translateY(20px);
        pointer-events: none;
      }
      /* Padding inferior para que el contenido no quede tapado por la barra */
      #pdf-preview {
        padding-bottom: 80px !important;
      }
    }
  `;

  const [sharing, setSharing] = useState(false);

  const [shareStatus, setShareStatus] = useState("");
  const [downloading, setDownloading] = useState(false);

  // ── Mobile navigation state ──
  const [isMob, setIsMob] = useState(
    typeof window !== "undefined" && window.innerWidth <= 768,
  );
  const [mobNavActive, setMobNavActive] = useState(0);
  const [mobNavTurnos, setMobNavTurnos] = useState(true);
  const [mobActiveTurno, setMobActiveTurno] = useState(-1);
  const [mobNavHidden, setMobNavHidden] = useState(false);
  const mobNavTimerRef = React.useRef(null);
  const [infoEj, setInfoEj] = useState(null);

  // ── Collapsible turnos + week filter ──
  const [pdfActiveSem, setPdfActiveSem] = useState(() => {
    const idx = (meso.semanas || []).findIndex((sem) =>
      (sem.turnos || []).some((t) =>
        (t.ejercicios || []).some(
          (e) =>
            e.ejercicio_id ||
            (e.ejercicio_ids && e.ejercicio_ids.some((sub) => sub.eid)),
        ),
      ),
    );
    return idx >= 0 ? idx : 0;
  });
  const [expandedTurnos, setExpandedTurnos] = useState(new Set());

  const toggleTurno = (key) =>
    setExpandedTurnos((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const toggleAllTurnos = (semIdx, turnos) => {
    setExpandedTurnos((prev) => {
      const next = new Set(prev);
      const allExpanded = turnos.every((t) => next.has(`${semIdx}-${t.tIdx}`));
      turnos.forEach((t) => {
        const k = `${semIdx}-${t.tIdx}`;
        allExpanded ? next.delete(k) : next.add(k);
      });
      return next;
    });
  };

  // Detect mobile on resize
  React.useEffect(() => {
    const check = () => setIsMob(window.innerWidth <= 768);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Auto-hide mobile nav after 1s of no scrolling (athlete view only)
  React.useEffect(() => {
    if (!isMob || !hideActions) return;
    const onScroll = () => {
      setMobNavHidden(false);
      clearTimeout(mobNavTimerRef.current);
      mobNavTimerRef.current = setTimeout(() => setMobNavHidden(true), 1000);
    };
    // Start the initial timer
    mobNavTimerRef.current = setTimeout(() => setMobNavHidden(true), 1000);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(mobNavTimerRef.current);
    };
  }, [isMob, hideActions]);

  // Track which semana is currently visible via IntersectionObserver
  React.useEffect(() => {
    if (!isMob) return;
    const container = previewRef.current;
    if (!container) return;
    const pages = container.querySelectorAll(".pdf-page[data-sem-idx]");
    if (!pages.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const idx = parseInt(e.target.dataset.semIdx, 10);
            if (!isNaN(idx)) setMobNavActive(idx);
          }
        });
      },
      { rootMargin: "-10% 0px -70% 0px", threshold: 0 },
    );
    pages.forEach((p) => observer.observe(p));
    return () => observer.disconnect();
  }, [isMob]);

  // Track which turno is currently visible via IntersectionObserver
  React.useEffect(() => {
    if (!isMob) return;
    const container = previewRef.current;
    if (!container) return;
    const turnoEls = container.querySelectorAll(".pdf-turno-header[id]");
    if (!turnoEls.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const parts = e.target.id.match(/^pdf-turno-(\d+)-(\d+)$/);
            if (parts) {
              const tIdx = parseInt(parts[2], 10);
              setMobActiveTurno(tIdx);
              setMobNavTurnos(true);
            }
          }
        });
      },
      { rootMargin: "-10% 0px -70% 0px", threshold: 0 },
    );
    turnoEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [isMob]);

  const handleShareWhatsApp = () => {
    const phone = atleta.telefono ? atleta.telefono.replace(/\D/g, "") : "";
    const nombre = atleta.nombre;
    const msoNombre = meso.nombre || "Mesociclo";
    const msg = encodeURIComponent(
      `Hola ${nombre}! Te envío tu planilla: *${msoNombre}* 💪`,
    );
    const waUrl = phone
      ? `https://wa.me/${phone}?text=${msg}`
      : `https://wa.me/?text=${msg}`;
    window.open(waUrl, "_blank");
  };

  const handleDownload = () => {
    setDownloading(true);
    try {
      const previewEl = previewRef.current;
      if (!previewEl) return;

      // Temporarily expand all turnos and show all weeks for capture
      const turnoContents = previewEl.querySelectorAll(".pdf-turno-content");
      turnoContents.forEach((el) => el.classList.add("expanded"));
      const chevrons = previewEl.querySelectorAll(".pdf-turno-chevron");
      chevrons.forEach((el) => el.classList.add("open"));
      // Show all pdf-page
      const pages = previewEl.querySelectorAll(".pdf-page");
      pages.forEach((p) => {
        p.style.display = "";
      });

      // Setear top de turno-headers antes de capturar el HTML
      previewEl.querySelectorAll(".pdf-page").forEach((page) => {
        const semH = page.querySelector(".pdf-sem-header");
        if (!semH) return;
        const h = semH.offsetHeight;
        page.querySelectorAll(".pdf-turno-header").forEach((t) => {
          t.style.top = h + "px";
        });
      });
      // Construir HTML con estilos completos
      const style = Array.from(document.querySelectorAll("style"))
        .map((s) => s.innerHTML)
        .join("\n");
      const capturedHTML = previewEl.outerHTML;

      // Restore current state
      turnoContents.forEach((el) => {
        const turnoHeader = el.previousElementSibling;
        const turnoId = turnoHeader?.id || "";
        const parts = turnoId.match(/^pdf-turno-(\d+)-(\d+)$/);
        if (parts) {
          const k = `${parts[1]}-${parts[2]}`;
          if (!expandedTurnos.has(k)) {
            el.classList.remove("expanded");
          }
        }
      });
      chevrons.forEach((el) => {
        const header = el.closest(".pdf-turno-header");
        const turnoId = header?.id || "";
        const parts = turnoId.match(/^pdf-turno-(\d+)-(\d+)$/);
        if (parts) {
          const k = `${parts[1]}-${parts[2]}`;
          if (!expandedTurnos.has(k)) {
            el.classList.remove("open");
          }
        }
      });
      // Restore page visibility to show only active semana
      pages.forEach((p) => {
        const pIdx = parseInt(p.dataset.semIdx, 10);
        if (!isNaN(pIdx) && pIdx !== pdfActiveSem) p.style.display = "none";
      });

      const html = `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,maximum-scale=5"/>
<meta name="apple-mobile-web-app-capable" content="yes"/>
<meta name="mobile-web-app-capable" content="yes"/>
<meta name="theme-color" content="#0d1117"/>
<title>${atleta.nombre} — ${meso.nombre || "Mesociclo"}</title>
<style>
html{-webkit-text-size-adjust:100%;text-size-adjust:100%}
body{margin:0;padding:0;background:#fff;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;
  padding-top:env(safe-area-inset-top,0px);
  padding-left:env(safe-area-inset-left,0px);
  padding-right:env(safe-area-inset-right,0px);
  padding-bottom:env(safe-area-inset-bottom,0px);
}
@media screen and (min-width:769px){body{padding:16px}}
@media screen and (max-width:768px){
  body{padding-top:calc(env(safe-area-inset-top,0px) + 52px);padding-left:0;padding-right:0;padding-bottom:0}
  .pdf-sem-header{top:calc(env(safe-area-inset-top,0px) + 52px)!important}
}
@media print{@page{size:A4 landscape;margin:8mm}body{padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}.pdf-sem-header{top:0!important}}
${pdfStyle}
</style>
</head>
<body>
${capturedHTML}
<script>
// Posicionar turno sticky debajo de semana header, considerando offset de barra de visor
function updateStickyTurnos(){
  var isMobile=window.innerWidth<=768;
  var barOffset=isMobile?52:0;
  document.querySelectorAll('.pdf-page').forEach(function(page){
    var semH=page.querySelector('.pdf-sem-header');
    if(!semH)return;
    if(isMobile)semH.style.top=barOffset+'px';
    var h=semH.offsetHeight+barOffset;
    page.querySelectorAll('.pdf-turno-header').forEach(function(t){
      t.style.top=h+'px';
    });
  });
}
updateStickyTurnos();
window.addEventListener('resize',updateStickyTurnos);
window.addEventListener('load',updateStickyTurnos);

// Collapsible turnos
document.querySelectorAll('.pdf-turno-header').forEach(function(header){
  // Start all collapsed
  var content=header.nextElementSibling;
  if(content&&content.classList.contains('pdf-turno-content')){
    content.classList.remove('expanded');
    var chev=header.querySelector('.pdf-turno-chevron');
    if(chev)chev.classList.remove('open');
  }
  header.addEventListener('click',function(){
    var c=this.nextElementSibling;
    if(!c||!c.classList.contains('pdf-turno-content'))return;
    var chev=this.querySelector('.pdf-turno-chevron');
    c.classList.toggle('expanded');
    if(chev)chev.classList.toggle('open');
  });
});

// Week tabs
(function(){
  var tabs=document.querySelectorAll('.pdf-sem-tab');
  var pages=document.querySelectorAll('.pdf-page[data-sem-idx]');
  if(!tabs.length||!pages.length)return;
  // Show only first week initially
  pages.forEach(function(p,i){p.style.display=i===0?'':'none'});
  tabs.forEach(function(tab){
    tab.addEventListener('click',function(){
      var idx=parseInt(this.dataset.semIdx||this.getAttribute('data-sem-idx'));
      tabs.forEach(function(t){t.classList.remove('active')});
      this.classList.add('active');
      pages.forEach(function(p){
        var pIdx=parseInt(p.dataset.semIdx);
        p.style.display=pIdx===idx?'':'none';
      });
    });
  });
  // Expand/collapse all button
  var toggleBtn=document.querySelector('.pdf-sem-tabs-actions button');
  if(toggleBtn){
    toggleBtn.addEventListener('click',function(){
      var activePage=document.querySelector('.pdf-page[data-sem-idx]:not([style*="display: none"])');
      if(!activePage)return;
      var contents=activePage.querySelectorAll('.pdf-turno-content');
      var allExp=Array.from(contents).every(function(c){return c.classList.contains('expanded')});
      contents.forEach(function(c){
        c.classList.toggle('expanded',!allExp);
        var h=c.previousElementSibling;
        if(h){var chev=h.querySelector('.pdf-turno-chevron');if(chev)chev.classList.toggle('open',!allExp);}
      });
      this.textContent=allExp?'Expandir todos':'Colapsar todos';
    });
  }
})();
</script>
</body></html>`;
      // Crear blob y link de descarga — funciona en la mayoría de browsers modernos
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${atleta.nombre.replace(/\s+/g, "_")}_${(meso.nombre || "Meso").replace(/\s+/g, "_")}.html`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) {
      alert(
        'Para guardar el PDF: usá el botón del browser "Compartir → Imprimir → Guardar como PDF"',
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      <style>{pdfStyle}</style>

      {/* Barra de acciones */}
      {!hideActions && (
        <div
          className="no-print"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
            padding: "14px 20px",
            flexWrap: "wrap",
            gap: 10,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'Bebas Neue'",
                fontSize: 18,
                color: "var(--gold)",
                letterSpacing: ".05em",
              }}
            >
              Vista previa — Planilla del atleta
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
              Usá "Guardar como PDF" en el diálogo de impresión · Orientación
              horizontal A4
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={handleShareWhatsApp}
              disabled={sharing}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 18px",
                background:
                  shareStatus === "error"
                    ? "#e53935"
                    : shareStatus === "done"
                      ? "#43a047"
                      : sharing
                        ? "var(--surface3)"
                        : "#25D366",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                cursor: sharing ? "default" : "pointer",
                fontFamily: "'DM Sans'",
                fontSize: 13,
                fontWeight: 600,
                opacity: sharing ? 0.85 : 1,
                transition: "all .3s",
                minWidth: 200,
                justifyContent: "center",
              }}
            >
              {sharing ? (
                <>
                  <Download
                    size={15}
                    style={{ animation: "spin 1s linear infinite" }}
                  />{" "}
                  Generando PDF...
                </>
              ) : shareStatus === "done" ? (
                <>
                  <Send size={15} /> Enviado
                </>
              ) : shareStatus === "error" ? (
                "Error — reintentando..."
              ) : (
                <>
                  <MessageCircle size={15} /> Enviar por WhatsApp
                </>
              )}
            </button>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="btn btn-gold"
              style={{
                gap: 8,
                padding: "10px 18px",
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                opacity: downloading ? 0.7 : 1,
                transition: "all .2s",
              }}
            >
              <Download
                size={15}
                style={
                  downloading ? { animation: "spin 1s linear infinite" } : {}
                }
              />
              {downloading ? "Generando..." : "Descargar PDF"}
            </button>
          </div>
        </div>
      )}

      {/* Preview */}
      <div
        ref={previewRef}
        id="pdf-preview"
        style={{
          background: "#fff",
          borderRadius: 12,
          border: "1px solid var(--border)",
          boxShadow: "0 8px 40px rgba(0,0,0,.4)",
        }}
      >
        {/* ── PORTADA / HEADER ── */}
        <div className="pdf-cover">
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 4,
              }}
            >
              <LogoHorizontal height={73} />
              <div>
                <div className="pdf-cover-name">
                  {atleta.nombre.toUpperCase()}
                </div>
              </div>
            </div>
            <div className="pdf-cover-meso">
              {meso.nombre ||
                (isPretemp ? "Pretemporada" : "Mesociclo de Entrenamiento")}
            </div>
            <div className="pdf-cover-sub">
              {formatDateDisplay(meso.fecha_inicio)}
              {!isPretemp && meso.modo ? <>&nbsp;·&nbsp; {meso.modo}</> : null}
              {!isPretemp && meso.volumen_total ? (
                <>
                  &nbsp;·&nbsp; {meso.volumen_total.toLocaleString()} reps
                  totales
                </>
              ) : null}
            </div>
          </div>
          <div className="pdf-cover-right">
            <div
              style={{
                fontSize: 8,
                color: "#888",
                textTransform: "uppercase",
                letterSpacing: ".08em",
                marginBottom: 6,
              }}
            >
              Marcas personales
            </div>
            <div className="pdf-irm-box">
              {irm_arr && (
                <div className="pdf-irm-item">
                  <div className="pdf-irm-val">{irm_arr}</div>
                  <div className="pdf-irm-lbl">Arranque kg</div>
                </div>
              )}
              {irm_env && (
                <div className="pdf-irm-item">
                  <div className="pdf-irm-val" style={{ color: "#3090e0" }}>
                    {irm_env}
                  </div>
                  <div className="pdf-irm-lbl">Envión kg</div>
                </div>
              )}
            </div>
            <div style={{ fontSize: 7, color: "#555", marginTop: 10 }}>
              {formatDateDisplay(new Date().toISOString().slice(0, 10))}
            </div>
          </div>
        </div>
        <div className="pdf-accent-bar" />

        {/* ── WEEK TABS ── */}
        {(() => {
          const validSems = semTurnos.filter((s) => s.turnos.length > 0);
          if (validSems.length <= 1) return null;
          // Compute offsets for pretemporada
          const tabOffsets = [];
          let tabCum = 0;
          (meso.semanas || []).forEach((s) => {
            tabOffsets.push(tabCum);
            tabCum += (s.turnos || []).length;
          });
          const activeSemData =
            validSems.find((s) => s.semIdx === pdfActiveSem) || validSems[0];
          const activeTurnos = activeSemData?.turnos || [];
          const allExpanded = activeTurnos.every((t) =>
            expandedTurnos.has(`${activeSemData.semIdx}-${t.tIdx}`),
          );
          return (
            <div className="pdf-sem-tabs-wrap no-print">
              {validSems.map(({ sem, semIdx: sIdx }) => {
                const off = tabOffsets[sIdx] || 0;
                const first = off + 1;
                const last = off + (sem.turnos || []).length;
                return (
                  <button
                    key={sIdx}
                    data-sem-idx={sIdx}
                    className={`pdf-sem-tab${pdfActiveSem === sIdx ? " active" : ""}`}
                    onClick={() => {
                      setPdfActiveSem(sIdx);
                      setMobNavActive(sIdx);
                      setMobActiveTurno(-1);
                    }}
                  >
                    {isPretemp ? `T${first}-${last}` : `Semana ${sem.numero}`}
                  </button>
                );
              })}
            </div>
          );
        })()}

        {/* ── SEMANAS ── */}
        {(() => {
          // Compute cumulative turno offsets per semana for pretemporada labeling
          const turnoOffsets = [];
          let cumTurnos = 0;
          (meso.semanas || []).forEach((s) => {
            turnoOffsets.push(cumTurnos);
            cumTurnos += (s.turnos || []).length;
          });
          // Render all semanas, hide inactive ones (so download captures all)
          return semTurnos.map(({ sem, semIdx, turnos, met }) => {
            if (!turnos.length) return null;
            const tOff = turnoOffsets[semIdx] || 0;
            const tFirst = tOff + 1;
            const tLast = tOff + (sem.turnos || []).length;
            const isActiveSem = semIdx === pdfActiveSem;
            return (
              <div
                key={sem.id}
                id={`pdf-sem-${semIdx}`}
                data-sem-idx={semIdx}
                className="pdf-page"
                style={{
                  padding: "0 12px 16px",
                  display: isActiveSem ? undefined : "none",
                }}
              >
                {/* Sem header */}
                <div className="pdf-sem-header">
                  <div className="pdf-sem-info">
                    <div className="pdf-sem-title">
                      {isPretemp
                        ? `TURNOS ${tFirst}-${tLast}`
                        : `SEMANA ${sem.numero}`}
                      {!isPretemp &&
                        (() => {
                          const fechaSem = getFechaSemanaEfectiva(
                            meso.fecha_inicio,
                            sem,
                          );
                          return fechaSem ? (
                            <span
                              style={{
                                fontWeight: 400,
                                fontSize: 9,
                                color: "#666",
                                marginLeft: 8,
                              }}
                            >
                              {formatFechaSemana(fechaSem)}
                            </span>
                          ) : null;
                        })()}
                    </div>
                    {isPretemp ? (
                      <div className="pdf-sem-details">
                        {turnos.length} turno{turnos.length !== 1 ? "s" : ""}
                      </div>
                    ) : isEscuelaPdf ? (
                      <>
                        <div className="pdf-sem-details">
                          Escuela Inicial · Nivel {meso.escuela_nivel || "—"}
                        </div>
                        {met && <GrupoBar levGrupo={met.levGrupo} />}
                      </>
                    ) : (
                      <>
                        <div className="pdf-sem-details">
                          {sem.pct_volumen}% del volumen total &nbsp;·&nbsp;
                          {sem.reps_ajustadas ||
                            sem.reps_calculadas ||
                            Math.round(
                              (meso.volumen_total * sem.pct_volumen) / 100,
                            )}{" "}
                          reps planificadas
                        </div>
                        {met && <GrupoBar levGrupo={met.levGrupo} />}
                      </>
                    )}
                  </div>
                  {!isPretemp && (
                    <div className="pdf-sem-metrics">
                      {met?.volReps > 0 && (
                        <>
                          <div className="pdf-sem-metric">
                            <div className="pdf-sem-metric-val">
                              {met.volReps}
                            </div>
                            <div className="pdf-sem-metric-lbl">Vol. Reps</div>
                          </div>
                          <div className="pdf-sem-metric">
                            <div className="pdf-sem-metric-val">
                              {met.volKg}
                            </div>
                            <div className="pdf-sem-metric-lbl">Vol. Kg</div>
                          </div>
                          <div className="pdf-sem-metric">
                            <div className="pdf-sem-metric-val">
                              {met.pesoMedio}
                            </div>
                            <div className="pdf-sem-metric-lbl">Peso Medio</div>
                          </div>
                          {met.intMedia > 0 && (
                            <div className="pdf-sem-metric">
                              <div className="pdf-sem-metric-val">
                                {met.intMedia}%
                              </div>
                              <div className="pdf-sem-metric-lbl">
                                Int. Media
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Turnos */}
                {turnos.map(({ tIdx, dia, momento, rows }) => {
                  const turnoKey = `${semIdx}-${tIdx}`;
                  const isExpanded = expandedTurnos.has(turnoKey);
                  return (
                    <React.Fragment key={tIdx}>
                      <div
                        className="pdf-turno-header"
                        id={`pdf-turno-${semIdx}-${tIdx}`}
                        style={{ display: "flex", alignItems: "center" }}
                      >
                        <div
                          onClick={() => toggleTurno(turnoKey)}
                          style={{
                            flex: 1,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            cursor: "pointer",
                          }}
                        >
                          <span className="pdf-turno-num">
                            Turno {isPretemp ? tOff + tIdx + 1 : tIdx + 1}
                          </span>
                          {dia && (
                            <span className="pdf-turno-dia">
                              {dia}
                              {momento ? ` · ${momento}` : ""}
                            </span>
                          )}
                          <span
                            className={`pdf-turno-chevron${isExpanded ? " open" : ""}`}
                          >
                            <ChevronDown size={14} />
                          </span>
                        </div>
                        {onStartTimer && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const exercises = extractTimerExercises(
                                semIdx,
                                tIdx,
                              );
                              if (exercises.length > 0)
                                onStartTimer(exercises, {
                                  semana: semIdx + 1,
                                  turno: isPretemp ? tOff + tIdx + 1 : tIdx + 1,
                                  dia: dia || null,
                                  momento: momento || null,
                                });
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                              padding: "4px 12px",
                              borderRadius: 6,
                              border: "1px solid #47e8a0",
                              background: "rgba(71,232,160,.12)",
                              color: "#47e8a0",
                              cursor: "pointer",
                              fontFamily: "'Bebas Neue'",
                              fontSize: 12,
                              letterSpacing: ".05em",
                              flexShrink: 0,
                              transition: "all .2s",
                            }}
                          >
                            <Timer size={13} /> ENTRENAR
                          </button>
                        )}
                      </div>

                      <div
                        className={`pdf-turno-content${isExpanded ? " expanded" : ""}`}
                      >
                        <div
                          style={{
                            overflowX: "auto",
                            WebkitOverflowScrolling: "touch",
                          }}
                        >
                          <table className="pdf-table">
                            <thead>
                              <tr>
                                <th style={{ width: 20 }} className="left" />
                                <th className="left" style={{ minWidth: 130 }}>
                                  Ejercicio
                                </th>
                                {(() => {
                                  // Detectar si tenemos complementarios con bloques
                                  const hasCompBloques = rows.some(
                                    (r) => r.isCompBloques,
                                  );
                                  const hasRegularIntensidades = rows.some(
                                    (r) => !r.isCompBloques,
                                  );
                                  const hasPretemporadaRows = rows.some(
                                    (r) => r.isPretemporadaRow,
                                  );
                                  const hasEscuelaRows = rows.some(
                                    (r) => r.isEscuelaRow,
                                  );
                                  const isPctBlockTable =
                                    (hasEscuelaRows || hasPretemporadaRows) &&
                                    !hasRegularIntensidades;

                                  if (isPctBlockTable) {
                                    // Escuela / Pretemporada: columnas por % real utilizado (estilo sembrado)
                                    const pctList = Array.from(
                                      new Set(
                                        rows.flatMap((r) =>
                                          (r.cols || [])
                                            .map((c) => c?.pct)
                                            .filter((p) => p != null),
                                        ),
                                      ),
                                    ).sort((a, b) => Number(a) - Number(b));
                                    return pctList.map((p) => (
                                      <th
                                        key={p}
                                        className="intens-header"
                                        style={{ width: 58 }}
                                      >
                                        {p}%
                                      </th>
                                    ));
                                  }

                                  if (
                                    hasCompBloques &&
                                    !hasRegularIntensidades
                                  ) {
                                    // Solo complementarios con bloques - mostrar headers dinámicos
                                    const maxBloques = Math.max(
                                      ...rows.map((r) => r.cols?.length || 0),
                                    );
                                    return Array.from({
                                      length: maxBloques,
                                    }).map((_, bIdx) => (
                                      <th
                                        key={bIdx}
                                        className="intens-header"
                                        style={{ width: 58 }}
                                      >
                                        Bloque{bIdx + 1}
                                      </th>
                                    ));
                                  }
                                  // Regular con intensidades
                                  return INTENSIDADES.map((v) => (
                                    <th
                                      key={v}
                                      className="intens-header"
                                      style={{ width: 58 }}
                                    >
                                      {v}%
                                    </th>
                                  ));
                                })()}
                              </tr>
                              <tr>
                                <th />
                                <th />
                                {(() => {
                                  const hasCompBloques = rows.some(
                                    (r) => r.isCompBloques,
                                  );
                                  const hasRegularIntensidades = rows.some(
                                    (r) => !r.isCompBloques,
                                  );
                                  const hasPretemporadaRows = rows.some(
                                    (r) => r.isPretemporadaRow,
                                  );
                                  const hasEscuelaRows2 = rows.some(
                                    (r) => r.isEscuelaRow,
                                  );
                                  const isPctBlockTable2 =
                                    (hasEscuelaRows2 || hasPretemporadaRows) &&
                                    !hasRegularIntensidades;

                                  if (isPctBlockTable2) {
                                    // Escuela / Pretemporada: una sub-cabecera por cada % usado
                                    const pctList = Array.from(
                                      new Set(
                                        rows.flatMap((r) =>
                                          (r.cols || [])
                                            .map((c) => c?.pct)
                                            .filter((p) => p != null),
                                        ),
                                      ),
                                    ).sort((a, b) => Number(a) - Number(b));
                                    return pctList.map((p) => (
                                      <th key={p} className="sub-header">
                                        <div
                                          style={{
                                            display: "grid",
                                            gridTemplateColumns: "1fr 1fr 1fr",
                                            gap: 0,
                                            fontSize: 6.5,
                                          }}
                                        >
                                          <span>Ser</span>
                                          <span>Rep</span>
                                          <span>Kg</span>
                                        </div>
                                      </th>
                                    ));
                                  }

                                  if (
                                    hasCompBloques &&
                                    !hasRegularIntensidades
                                  ) {
                                    // Solo complementarios - mostrar headers de bloque
                                    const maxBloques = Math.max(
                                      ...rows.map((r) => r.cols?.length || 0),
                                    );
                                    return Array.from({
                                      length: maxBloques,
                                    }).map((_, bIdx) => (
                                      <th key={bIdx} className="sub-header">
                                        <div
                                          style={{
                                            display: "grid",
                                            gridTemplateColumns: "1fr 1fr 1fr",
                                            gap: 0,
                                            fontSize: 6.5,
                                          }}
                                        >
                                          <span>Ser</span>
                                          <span>Rep</span>
                                          <span>Kg</span>
                                        </div>
                                      </th>
                                    ));
                                  }
                                  // Regular con intensidades
                                  return INTENSIDADES.map((v) => (
                                    <th key={v} className="sub-header">
                                      <div
                                        style={{
                                          display: "grid",
                                          gridTemplateColumns: "1fr 1fr 1fr",
                                          gap: 0,
                                          fontSize: 6.5,
                                        }}
                                      >
                                        <span>Ser</span>
                                        <span>Rep</span>
                                        <span>Kg</span>
                                      </div>
                                    </th>
                                  ));
                                })()}
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                let section = null;
                                const hasCompBloques = rows.some(
                                  (r) => r.isCompBloques,
                                );
                                const hasRegularIntensidades = rows.some(
                                  (r) => !r.isCompBloques,
                                );
                                const hasPretemporadaRows = rows.some(
                                  (r) => r.isPretemporadaRow,
                                );
                                const hasEscuelaRowsBody = rows.some(
                                  (r) => r.isEscuelaRow,
                                );
                                const isPctBlockTableBody =
                                  (hasEscuelaRowsBody ||
                                    hasPretemporadaRows) &&
                                  !hasRegularIntensidades;
                                const pctBlockList = isPctBlockTableBody
                                  ? Array.from(
                                      new Set(
                                        rows.flatMap((r) =>
                                          (r.cols || [])
                                            .map((c) => c?.pct)
                                            .filter((p) => p != null),
                                        ),
                                      ),
                                    ).sort((a, b) => Number(a) - Number(b))
                                  : [];
                                const maxBloques = hasCompBloques
                                  ? Math.max(
                                      ...rows.map((r) => r.cols?.length || 0),
                                    )
                                  : 0;

                                return rows
                                  .map((row, rIdx) => {
                                    const rowArr = [];

                                    // Detectar cambios de sección
                                    let newSection = null;
                                    if (row.isComplementarioBefore)
                                      newSection = "ANTES";
                                    else if (row.isComplementarioAfter)
                                      newSection = "DESPUÉS";
                                    else newSection = "PRINCIPAL";

                                    if (newSection !== section && rIdx > 0) {
                                      section = newSection;
                                      const sectionColors = {
                                        ANTES: {
                                          bg: "#e3f2fd",
                                          text: "#1565c0",
                                        },
                                        PRINCIPAL: {
                                          bg: "#fff8e1",
                                          text: "#b8860b",
                                        },
                                        DESPUÉS: {
                                          bg: "#e8f5e9",
                                          text: "#1b5e20",
                                        },
                                      };
                                      const colors = sectionColors[newSection];
                                      const colSpan =
                                        2 +
                                        (isPctBlockTableBody
                                          ? pctBlockList.length
                                          : hasCompBloques &&
                                              !hasRegularIntensidades
                                            ? maxBloques
                                            : INTENSIDADES.length);
                                      rowArr.push(
                                        <tr
                                          key={`sep-${rIdx}`}
                                          style={{
                                            height: 2,
                                            background: "#ddd",
                                          }}
                                        >
                                          <td colSpan={colSpan}></td>
                                        </tr>,
                                      );
                                    } else if (rIdx === 0) {
                                      section = newSection;
                                    }

                                    const gc = GC[row.categoria] || "#555";
                                    const gb = GB[row.categoria] || "#fafafa";
                                    const isLast = rIdx === rows.length - 1;

                                    rowArr.push(
                                      <tr
                                        key={rIdx}
                                        className={`${isLast ? "last-ej" : ""} ${row.isPretemporadaRow ? "pretemporada-row" : ""}`}
                                      >
                                        {row.isPretemporadaRow ? (
                                          <>
                                            <td
                                              colSpan={2}
                                              className="left pdf-pretemp-ej"
                                              style={{ padding: "3px 4px" }}
                                            >
                                              <div
                                                style={{
                                                  display: "flex",
                                                  alignItems: "baseline",
                                                  gap: 4,
                                                  flexWrap: "wrap",
                                                }}
                                              >
                                                <span
                                                  style={{
                                                    background: gc,
                                                    color: "#fff",
                                                    fontSize: 8,
                                                    fontWeight: 800,
                                                    padding: "1px 4px",
                                                    borderRadius: 2,
                                                    whiteSpace: "nowrap",
                                                    flexShrink: 0,
                                                  }}
                                                >
                                                  {row.id}
                                                </span>
                                                <span
                                                  className="ej-nombre"
                                                  style={{
                                                    whiteSpace: "normal",
                                                    wordBreak: "break-word",
                                                  }}
                                                >
                                                  {row.nombre}
                                                </span>
                                                <NormativoInfoButton
                                                  ejercicio={findNormativoById(
                                                    normativos,
                                                    row.id,
                                                  )}
                                                  onClick={(ej) => setInfoEj(ej)}
                                                  size={16}
                                                  style={{ marginLeft: 4 }}
                                                />
                                              </div>
                                            </td>
                                          </>
                                        ) : (
                                          <>
                                            <td style={{ padding: "3px 4px" }}>
                                              <span
                                                style={{
                                                  background: gc,
                                                  color: "#fff",
                                                  fontSize: 8,
                                                  fontWeight: 800,
                                                  padding: "1px 4px",
                                                  borderRadius: 2,
                                                  whiteSpace: "nowrap",
                                                }}
                                              >
                                                {row.id}
                                              </span>
                                            </td>
                                            <td className="left">
                                              <span
                                                style={{
                                                  display: "inline-flex",
                                                  alignItems: "center",
                                                  gap: 6,
                                                }}
                                              >
                                                <span
                                                  className="ej-nombre"
                                                  style={{
                                                    fontStyle:
                                                      row.isComplementario
                                                        ? "italic"
                                                        : "normal",
                                                  }}
                                                >
                                                  {row.nombre}
                                                </span>
                                                <NormativoInfoButton
                                                  ejercicio={findNormativoById(
                                                    normativos,
                                                    row.id,
                                                  )}
                                                  onClick={(ej) => setInfoEj(ej)}
                                                  size={16}
                                                />
                                              </span>
                                            </td>
                                          </>
                                        )}
                                        {(() => {
                                          // Escuela / Pretemporada: una columna por cada % usado en el turno
                                          if (
                                            isPctBlockTableBody &&
                                            (row.isEscuelaRow ||
                                              row.isPretemporadaRow)
                                          ) {
                                            return pctBlockList.map((p) => {
                                              const col = (row.cols || []).find(
                                                (c) =>
                                                  c != null &&
                                                  Number(c.pct) === Number(p),
                                              );
                                              if (
                                                !hasComplementarioBlockContent(
                                                  col,
                                                )
                                              ) {
                                                return (
                                                  <td
                                                    key={p}
                                                    data-label={`${p}%`}
                                                  >
                                                    <span className="cell-empty">
                                                      –
                                                    </span>
                                                  </td>
                                                );
                                              }
                                              return (
                                                <td
                                                  key={p}
                                                  data-label={`${p}%`}
                                                  style={{ background: gb }}
                                                >
                                                  <div className="cell-data">
                                                    <span className="cell-series">
                                                      {col.s}
                                                    </span>
                                                    <span className="cell-reps">
                                                      {col.r}
                                                    </span>
                                                    <span className="cell-kg">
                                                      {col.kg}
                                                    </span>
                                                    {col.note && (
                                                      <span className="cell-note">
                                                        {col.note}
                                                      </span>
                                                    )}
                                                  </div>
                                                </td>
                                              );
                                            });
                                          }

                                          // Si es complementario con bloques
                                          if (row.isCompBloques) {
                                            return Array.from({
                                              length: maxBloques,
                                            }).map((_, bIdx) => {
                                              const col = row.cols[bIdx];
                                              if (
                                                !hasComplementarioBlockContent(
                                                  col,
                                                )
                                              ) {
                                                return (
                                                  <td
                                                    key={bIdx}
                                                    data-label={
                                                      col?.pct != null
                                                        ? `${col.pct}%`
                                                        : ""
                                                    }
                                                  >
                                                    <span className="cell-empty">
                                                      –
                                                    </span>
                                                  </td>
                                                );
                                              }
                                              return (
                                                <td
                                                  key={bIdx}
                                                  data-label={
                                                    col?.pct != null
                                                      ? `${col.pct}%`
                                                      : ""
                                                  }
                                                  style={{ background: gb }}
                                                >
                                                  <div className="cell-data">
                                                    <span className="cell-series">
                                                      {col.s}
                                                    </span>
                                                    <span className="cell-reps">
                                                      {col.r}
                                                    </span>
                                                    <span className="cell-kg">
                                                      {col.kg}
                                                    </span>
                                                    {col.note && (
                                                      <span className="cell-note">
                                                        {col.note}
                                                      </span>
                                                    )}
                                                  </div>
                                                </td>
                                              );
                                            });
                                          }

                                          // Regular con intensidades
                                          return INTENSIDADES.map((intens) => {
                                            const col = row.cols.find(
                                              (c) => c.intens === intens,
                                            );
                                            if (!col || !col.s) {
                                              return (
                                                <td
                                                  key={intens}
                                                  data-label={`${intens}%`}
                                                >
                                                  <span className="cell-empty">
                                                    –
                                                  </span>
                                                </td>
                                              );
                                            }
                                            return (
                                              <td
                                                key={intens}
                                                data-label={`${intens}%`}
                                                style={{ background: gb }}
                                              >
                                                <div className="cell-data">
                                                  <span className="cell-series">
                                                    {col.s}
                                                  </span>
                                                  <span className="cell-reps">
                                                    {col.r}
                                                  </span>
                                                  <span className="cell-kg">
                                                    {col.kg}
                                                  </span>
                                                  {col.note && (
                                                    <span className="cell-note">
                                                      {col.note}
                                                    </span>
                                                  )}
                                                </div>
                                              </td>
                                            );
                                          });
                                        })()}
                                      </tr>,
                                    );

                                    return rowArr;
                                  })
                                  .flat();
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}

                <div className="pdf-footer">
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 5 }}
                  >
                    <span
                      dangerouslySetInnerHTML={{
                        __html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 380" width="14" height="13.3"><defs><linearGradient id="pfs-g" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#f8e47a"/><stop offset="100%" stop-color="#9a7010"/></linearGradient><linearGradient id="pfs-gh" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#604800"/><stop offset="50%" stop-color="#f5d96a"/><stop offset="100%" stop-color="#604800"/></linearGradient></defs><text x="200" y="100" font-family="Arial Black,sans-serif" font-size="32" letter-spacing="14" fill="url(#pfs-g)" text-anchor="middle">SISTEMA</text><rect x="100" y="112" width="200" height="1.5" fill="url(#pfs-gh)" opacity="0.5"/><text x="218" y="300" font-family="Arial Black,sans-serif" font-size="240" letter-spacing="-4" fill="url(#pfs-g)" text-anchor="middle">IL</text><text x="200" y="344" font-family="Arial Black,sans-serif" font-size="15" letter-spacing="9" fill="url(#pfs-g)" text-anchor="middle">IRONLIFTING</text></svg>`,
                      }}
                    />
                    <strong>{atleta.nombre}</strong>
                  </div>
                  <div>
                    {isPretemp
                      ? `Turnos ${tFirst}-${tLast}`
                      : `Semana ${sem.numero} de ${meso.semanas.length}`}
                  </div>
                </div>
              </div>
            );
          });
        })()}

        {/* ── PÁGINA DE RESUMEN FINAL ── */}
        {!isPretemp && (
          <div
            className="pdf-page pdf-resumen-page"
            style={{ padding: "14px 12px 16px" }}
          >
            <div className="pdf-resumen-title">Resumen del Mesociclo</div>

            {/* KPIs */}
            <div className="pdf-resumen-grid">
              <div className="pdf-kpi">
                <div className="pdf-kpi-val">
                  {totalVolReps.toLocaleString()}
                </div>
                <div className="pdf-kpi-lbl">Volumen Total (reps)</div>
              </div>
              <div className="pdf-kpi">
                <div className="pdf-kpi-val" style={{ color: "#3090e0" }}>
                  {totalVolKg.toLocaleString()}
                </div>
                <div className="pdf-kpi-lbl">Tonelaje Total (kg)</div>
              </div>
              <div className="pdf-kpi">
                <div className="pdf-kpi-val" style={{ color: "#30c080" }}>
                  {pesoMedioTotal ? `${pesoMedioTotal} kg` : "—"}
                </div>
                <div className="pdf-kpi-lbl">Peso Medio</div>
              </div>
              <div className="pdf-kpi">
                <div className="pdf-kpi-val" style={{ color: "#c080f0" }}>
                  {irm_arr && irm_env
                    ? `${irm_arr} / ${irm_env}`
                    : irm_arr || irm_env || "—"}
                </div>
                <div className="pdf-kpi-lbl">IRM Arr / Env (kg)</div>
              </div>
            </div>

            {/* Tabla resumen por semana */}
            <table className="pdf-sem-table">
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Semana</th>
                  {!isEscuelaPdf && <th>% Vol</th>}
                  {!isEscuelaPdf && <th>Planificado</th>}
                  <th>Vol. Reps</th>
                  <th>Vol. Kg</th>
                  <th>Peso Medio</th>
                  <th>Int. Media</th>
                </tr>
              </thead>
              <tbody>
                {meso.semanas.map((sem, i) => {
                  const m = metricas[i];
                  return (
                    <tr key={sem.id}>
                      <td style={{ textAlign: "left", fontWeight: 700 }}>
                        Semana {sem.numero}
                      </td>
                      {!isEscuelaPdf && <td>{sem.pct_volumen}%</td>}
                      {!isEscuelaPdf && (
                        <td>
                          {Math.round(
                            (meso.volumen_total * sem.pct_volumen) / 100,
                          )}
                        </td>
                      )}
                      <td style={{ fontWeight: 700, color: "#b8860b" }}>
                        {m.volReps || "—"}
                      </td>
                      <td style={{ fontWeight: 700, color: "#1565c0" }}>
                        {m.volKg || "—"}
                      </td>
                      <td style={{ color: "#1b5e20" }}>{m.pesoMedio || "—"}</td>
                      <td style={{ color: "#4a148c" }}>
                        {m.intMedia ? `${m.intMedia}%` : "—"}
                      </td>
                    </tr>
                  );
                })}
                <tr>
                  <td style={{ textAlign: "left" }}>TOTAL</td>
                  {!isEscuelaPdf && <td>100%</td>}
                  {!isEscuelaPdf && <td>{meso.volumen_total}</td>}
                  <td style={{ color: "#b8860b" }}>{totalVolReps || "—"}</td>
                  <td style={{ color: "#1565c0" }}>{totalVolKg || "—"}</td>
                  <td style={{ color: "#1b5e20" }}>
                    {pesoMedioTotal ? `${pesoMedioTotal} kg` : "—"}
                  </td>
                  <td>—</td>
                </tr>
              </tbody>
            </table>

            {/* Gráfico de barras de volumen por semana */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
                gap: 12,
                marginTop: 8,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 8,
                    fontWeight: 800,
                    color: "#1a1a2e",
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                    marginBottom: 8,
                    borderBottom: "1px solid #e0e0e0",
                    paddingBottom: 4,
                  }}
                >
                  Volumen de Repeticiones por Semana
                </div>
                <BarChartSVG
                  data={meso.semanas.map((s, i) => ({
                    v: metricas[i].volReps,
                    l: `S${s.numero}`,
                  }))}
                  color="#b8860b"
                  width={240}
                  height={60}
                />
              </div>
              <div>
                <div
                  style={{
                    fontSize: 8,
                    fontWeight: 800,
                    color: "#1a1a2e",
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                    marginBottom: 8,
                    borderBottom: "1px solid #e0e0e0",
                    paddingBottom: 4,
                  }}
                >
                  Tonelaje (kg) por Semana
                </div>
                <BarChartSVG
                  data={meso.semanas.map((s, i) => ({
                    v: metricas[i].volKg,
                    l: `S${s.numero}`,
                  }))}
                  color="#1565c0"
                  width={240}
                  height={60}
                />
              </div>
            </div>

            <div className="pdf-footer" style={{ marginTop: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  dangerouslySetInnerHTML={{
                    __html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 380" width="20" height="19"><defs><linearGradient id="pfm-g" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#f8e47a"/><stop offset="100%" stop-color="#9a7010"/></linearGradient><linearGradient id="pfm-gh" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#604800"/><stop offset="50%" stop-color="#f5d96a"/><stop offset="100%" stop-color="#604800"/></linearGradient></defs><text x="200" y="100" font-family="Arial Black,sans-serif" font-size="32" letter-spacing="14" fill="url(#pfm-g)" text-anchor="middle">SISTEMA</text><rect x="100" y="112" width="200" height="1.5" fill="url(#pfm-gh)" opacity="0.5"/><text x="218" y="300" font-family="Arial Black,sans-serif" font-size="240" letter-spacing="-4" fill="url(#pfm-g)" text-anchor="middle">IL</text><text x="200" y="344" font-family="Arial Black,sans-serif" font-size="15" letter-spacing="9" fill="url(#pfm-g)" text-anchor="middle">IRONLIFTING</text></svg>`,
                  }}
                />
                <span style={{ fontSize: 9, color: "#888" }}>
                  Sistema IronLifting
                </span>{" "}
                <span style={{ color: "#aaa" }}>·</span> {atleta.nombre}
              </div>
              <div>
                {formatDateDisplay(new Date().toISOString().slice(0, 10))}
              </div>
            </div>
          </div>
        )}
      </div>

      {infoEj && (
        <NormativoInfoModal
          ejercicio={infoEj}
          onClose={() => setInfoEj(null)}
        />
      )}
    </div>
  );
}
