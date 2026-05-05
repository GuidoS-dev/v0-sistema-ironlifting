import { EJERCICIOS } from "../data/ejercicios";
import { INTENSIDADES } from "../data/tablas-default";

// ─── HELPERS DE CÁLCULO ──────────────────────────────────────────────────────
export function calcKg(ej, irm_arr, irm_env) {
  if (!ej || !ej.pct_base) return null;
  const irm = ej.base === "arranque" ? irm_arr : irm_env;
  if (!irm) return null;
  return Math.round(((irm * ej.pct_base) / 100) * 10) / 10;
}

export function calcVolumenSemana(volTotal, pct) {
  return Math.round((volTotal * pct) / 100);
}

export function calcRepsPorGrupo(reps, pctGrupos) {
  const res = {};
  Object.entries(pctGrupos).forEach(([g, p]) => {
    res[g] = Math.round((reps * p) / 100);
  });
  return res;
}

export const remapSemanaIdx = (idx, aIdx, bIdx) => {
  if (idx === aIdx) return bIdx;
  if (idx === bIdx) return aIdx;
  return idx;
};

export const remapSemPctKeyForSwap = (key, aIdx, bIdx) => {
  const match = /^(.*)-(\d+)$/.exec(String(key));
  if (!match) return String(key);
  const grupo = match[1];
  const semIdx = Number(match[2]);
  if (!Number.isInteger(semIdx)) return String(key);
  return `${grupo}-${remapSemanaIdx(semIdx, aIdx, bIdx)}`;
};

export const remapTurnoPctKeyForSwap = (key, aIdx, bIdx) => {
  const match = /^(.*)-(\d+)-(\d+)$/.exec(String(key));
  if (!match) return String(key);
  const grupo = match[1];
  const semIdx = Number(match[2]);
  const turnoIdx = Number(match[3]);
  if (!Number.isInteger(semIdx) || !Number.isInteger(turnoIdx)) {
    return String(key);
  }
  return `${grupo}-${remapSemanaIdx(semIdx, aIdx, bIdx)}-${turnoIdx}`;
};

export const remapOverrideObjectKeys = (obj, keyMapper) => {
  const source = obj && typeof obj === "object" ? obj : {};
  const next = {};
  Object.entries(source).forEach(([k, v]) => {
    next[keyMapper(k)] = v;
  });
  return next;
};

export const remapOverrideSetKeys = (setLike, keyMapper) => {
  const source = setLike instanceof Set ? setLike : new Set(setLike || []);
  return new Set([...source].map((k) => keyMapper(k)));
};

export function getEjercicioById(id, normativos = null) {
  if (normativos) return normativos.find((e) => e.id === id) || null;
  try {
    const stored = JSON.parse(
      localStorage.getItem("liftplan_normativos") || "null",
    );
    if (stored) return stored.find((e) => e.id === id) || null;
  } catch {}
  return EJERCICIOS.find((e) => e.id === id) || null;
}

export function getSembradoStats(turnos, normativos = null) {
  const counts = {
    Arranque: 0,
    Envion: 0,
    Tirones: 0,
    Piernas: 0,
    Complementarios: 0,
  };
  let total = 0;
  turnos.forEach((t) =>
    t.ejercicios.forEach((e) => {
      if (e.ejercicio_id) {
        const ej = getEjercicioById(e.ejercicio_id, normativos);
        if (ej) {
          counts[ej.categoria]++;
          total++;
        }
      }
    }),
  );
  const pcts = {};
  Object.entries(counts).forEach(([k, v]) => {
    pcts[k] = total ? Math.round((v / total) * 100) : 0;
  });
  return { counts, pcts, total };
}

// ─── Series/Reps/Kg para sembrado ────────────────────────────────────────────
export function calcSeriesRepsKg(
  tablas,
  ej,
  ejData,
  irm_arr,
  irm_env,
  modo,
  reps_asignadas,
) {
  if (!ejData || !ej.ejercicio_id) return null;

  const isTiron = String(ejData?.categoria || "").trim() === "Tirones";
  const modoKey = modo === "Competitivo" ? "Comp" : "Prep";

  // Kg base del ejercicio = IRM_atleta × pct_base / 100
  // Este valor representa el 100% de la carga — los % de intensidad se aplican sobre él
  const irmAtleta =
    ejData.base === "arranque" ? Number(irm_arr) : Number(irm_env);
  const kgBase =
    ejData.pct_base && irmAtleta ? (irmAtleta * ejData.pct_base) / 100 : null;

  // Tabla de distribución de intensidades (T1..T5)
  // El índice de fila es la intensidad del ejercicio en el sembrado (ej.intensidad: 65-95)
  const tablaKey = `tabla${Math.min(5, Math.max(1, Number(ej.tabla) || 1))}`;
  const tablaData = tablas[tablaKey];
  const tablaRow = tablaData?.find((r) => r.irm === Number(ej.intensidad));

  return INTENSIDADES.map((intens) => {
    // KG = kgBase × intens% / 100  (redondeado a entero)
    const kg = kgBase ? Math.round(((kgBase * intens) / 100) * 2) / 2 : null;

    // Reps intermedias = pct_tabla × reps_asignadas / 100  (redondeado)
    const tablaVal = tablaRow ? tablaRow[String(intens)] || 0 : 0;
    const repsInter = Math.round((tablaVal * (reps_asignadas || 0)) / 100);

    if (repsInter === 0) return { intens, series: null, reps_serie: null, kg };

    // Series / Reps por serie
    let series, reps_serie;
    if (repsInter > 8) {
      series = 1;
      reps_serie = repsInter;
    } else {
      const lookup = isTiron ? tablas.lookup_tirones : tablas.lookup_general;
      const row = lookup?.find(
        (r) =>
          r.intens === intens && r.modo === modoKey && r.reps === repsInter,
      );
      series = row?.series ?? null;
      reps_serie = row?.reps_serie ?? null;
    }

    return { intens, series, reps_serie, kg };
  });
}

// Kg de un ejercicio a una intensidad dada (para mostrar en el sembrado)
// kg = IRM_atleta × pct_base / 100 × intensidad / 100
export function calcKgEj(
  ejercicio_id,
  intensidad,
  irm_arr,
  irm_env,
  tablas_normativos,
) {
  const ej = (tablas_normativos || EJERCICIOS).find(
    (e) => e.id === Number(ejercicio_id),
  );
  if (!ej || !ej.pct_base) return null;
  const irm = ej.base === "arranque" ? Number(irm_arr) : Number(irm_env);
  if (!irm) return null;
  return Math.round(((((irm * ej.pct_base) / 100) * intensidad) / 100) * 2) / 2;
}

// ─── HELPERS DE CÁLCULO COMPARTIDOS ─────────────────────────────────────────
export const GRUPO_RANGES = {
  Arranque: [1, 19],
  Envion: [20, 48],
  Tirones: [49, 68],
  Piernas: [69, 78],
};
export const GRUPOS_KEYS = ["Arranque", "Envion", "Tirones", "Piernas"];

export function getGrupo(ejercicio_id) {
  // Prioriza categoria del normativo para permitir IDs fuera de los rangos legacy.
  const ej = getEjercicioById(ejercicio_id);
  const categoria = String(ej?.categoria || "").trim();
  if (GRUPOS_KEYS.includes(categoria)) return categoria;

  // Fallback legacy por rango para datos antiguos sin categoria consistente.
  const id = Number(ejercicio_id);
  for (const [g, [lo, hi]] of Object.entries(GRUPO_RANGES)) {
    if (id >= lo && id <= hi) return g;
  }
  return null;
}

// Cuenta ejercicios sembrados por grupo en UNA semana, por turno
// Returns: { porGrupo: {Arranque:{total, porTurno:[n,n,...]}, ...}, totalSem }
export function calcSembradoSemana(sem) {
  const porGrupo = {};
  GRUPOS_KEYS.forEach((g) => {
    porGrupo[g] = { total: 0, porTurno: sem.turnos.map(() => 0) };
  });
  let totalSem = 0;

  sem.turnos.forEach((t, tIdx) => {
    t.ejercicios.forEach((e) => {
      if (!e.ejercicio_id) return;
      const g = getGrupo(e.ejercicio_id);
      if (!g) return;
      totalSem++;
      porGrupo[g].total++;
      porGrupo[g].porTurno[tIdx]++;
    });
  });

  return { porGrupo, totalSem };
}

// Calcula reps tentativas por ejercicio en un turno dado
// Fórmula: vol_total × pct_semana × pct_grupo_en_semana × pct_grupo_en_turno / n_ejs_grupo_en_turno
// Returns: { [ej.id]: reps }
export function calcRepsEjercicio(sem, turnoIdx, meso) {
  const reps_sem = meso.volumen_total * (sem.pct_volumen / 100);
  const { porGrupo, totalSem } = calcSembradoSemana(sem);
  const turno = sem.turnos[turnoIdx];
  const repsPorEjId = {};

  GRUPOS_KEYS.forEach((g) => {
    const totalGrupoSem = porGrupo[g].total; // n ejs del grupo en toda la semana
    if (totalGrupoSem === 0) return;

    const nEnTurno = porGrupo[g].porTurno[turnoIdx]; // n ejs del grupo en este turno
    if (nEnTurno === 0) return;

    // pct_grupo_en_semana = totalGrupoSem / totalSem
    const pctGrupoSem = totalSem > 0 ? totalGrupoSem / totalSem : 0;

    // pct_grupo_en_turno = nEnTurno / totalGrupoSem
    const pctGrupoTurno = nEnTurno / totalGrupoSem;

    // Reps totales del bloque para este turno
    const repsGrupoTurno = reps_sem * pctGrupoSem * pctGrupoTurno;

    // Ejercicios de este grupo en este turno (del estado real)
    const ejsDelGrupo = turno.ejercicios.filter(
      (e) => e.ejercicio_id && getGrupo(e.ejercicio_id) === g,
    );
    if (ejsDelGrupo.length === 0) return;

    // Distribuir equitativamente con rounding correcto
    const base = Math.floor(repsGrupoTurno / ejsDelGrupo.length);
    const extra = Math.round(repsGrupoTurno) - base * ejsDelGrupo.length;
    ejsDelGrupo.forEach((e, i) => {
      // Key by ejercicio_id so it works even if ej.id (UUID) changes across renders
      repsPorEjId[String(e.ejercicio_id)] = base + (i < extra ? 1 : 0);
    });
  });

  return repsPorEjId;
}
