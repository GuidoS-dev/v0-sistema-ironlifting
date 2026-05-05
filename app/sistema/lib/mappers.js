import { toTitleCase } from "./sanitize";
import {
  collectAtletaPctOverrides,
  collectAtletaNormOverrides,
  buildMesoOverridesPayload,
} from "./overrides";


// ─── MAPEOS APP ↔ DB (usan el esquema real de las tablas existentes) ─────────
export function atletaToDb(a, coachId, options = {}) {
  return {
    coach_id: coachId,
    app_id: a.id,
    nombre: toTitleCase(a.nombre) || "",
    email: a.email || "",
    telefono: a.telefono || "",
    fecha_nacimiento: a.fecha_nacimiento || null,
    notas: a.notas || "",
    tipo: a.tipo || "atleta",
    genero: a.genero || "m",
    ciclo: a.ciclo ? JSON.stringify(a.ciclo) : null,
    profile_id: a.profile_id || null,
    pct_overrides: options.pctOverrides ?? collectAtletaPctOverrides(a.id),
    normativos_overrides:
      options.normativosOverrides ?? collectAtletaNormOverrides(a.id),
    updated_at: new Date().toISOString(),
  };
}
export function atletaFromDb(r) {
  let ciclo = null;
  if (r.ciclo) {
    try {
      ciclo = typeof r.ciclo === "string" ? JSON.parse(r.ciclo) : r.ciclo;
    } catch {
      ciclo = null;
    }
  }
  return {
    id: r.app_id,
    nombre: toTitleCase(r.nombre) || r.nombre,
    email: r.email,
    telefono: r.telefono,
    fecha_nacimiento: r.fecha_nacimiento,
    notas: r.notas,
    tipo: r.tipo,
    genero: r.genero || "m",
    ciclo,
    profile_id: r.profile_id || null,
    _updated_at: r.updated_at || null,
  };
}
export function mesoToDb(m, coachId, options = {}) {
  return {
    coach_id: coachId,
    app_id: m.id,
    app_atleta_id: m.atleta_id || null,
    nombre: m.nombre || "",
    fecha_inicio: m.fecha_inicio || new Date().toISOString().slice(0, 10),
    modo: m.modo || "Preparatorio",
    activo: m.activo ?? false,
    irm_arranque: m.irm_arranque || null,
    irm_envion: m.irm_envion || null,
    volumen_total: m.volumen_total || 0,
    descripcion: m.descripcion || "",
    duracion_ciclo: m.duracion_ciclo || null,
    duracion_mens: m.duracion_mens || null,
    ultimo_inicio: m.ultimo_inicio || null,
    semanas: m.semanas || [],
    overrides: options.overrides ?? buildMesoOverridesPayload(m),
    updated_at: m._updated_at || new Date().toISOString(),
  };
}
export function mesoFromDb(r) {
  const meta = r.overrides?._meta || {};
  return {
    id: r.app_id,
    atleta_id: r.app_atleta_id,
    nombre: r.nombre,
    fecha_inicio: r.fecha_inicio,
    modo: r.modo,
    activo: r.activo,
    irm_arranque: r.irm_arranque,
    irm_envion: r.irm_envion,
    volumen_total: r.volumen_total,
    descripcion: r.descripcion,
    duracion_ciclo: r.duracion_ciclo,
    duracion_mens: r.duracion_mens,
    ultimo_inicio: r.ultimo_inicio,
    semanas: r.semanas || [],
    escuela: meta.escuela ?? false,
    escuela_nivel: meta.escuela_nivel ?? "1",
    num_bloques_basica: meta.num_bloques_basica ?? 3,
    distribucion: meta.distribucion ?? null,
    pretemporada: meta.pretemporada ?? false,
    _updated_at: r.updated_at || null,
  };
}
export function plantillaToDb(p, coachId) {
  const ovr = { ...(p.overrides || {}) };
  ovr._meta = {
    ...(ovr._meta || {}),
    escuela: p.escuela ?? false,
    escuela_nivel: p.escuela_nivel ?? "1",
    num_bloques_basica: p.num_bloques_basica ?? 3,
    pretemporada: p.pretemporada ?? false,
  };
  return {
    coach_id: coachId,
    app_id: p.id,
    nombre: p.nombre || "",
    descripcion: p.descripcion || "",
    tipo: p.tipo || "meso",
    periodo: p.periodo || "general",
    objetivo: p.objetivo || "mixto",
    nivel: p.nivel || "intermedio",
    modo: p.modo || "Preparatorio",
    volumen_total: p.volumen_total || null,
    semanas: p.semanas || null,
    duracion_semanas: p.duracion_semanas || null,
    irm_arranque: p.irm_arranque || null,
    irm_envion: p.irm_envion || null,
    overrides: ovr,
    updated_at: new Date().toISOString(),
  };
}
export function plantillaFromDb(r) {
  const meta = (r.overrides || {})._meta || {};
  return {
    id: r.app_id,
    nombre: r.nombre,
    descripcion: r.descripcion,
    tipo: r.tipo,
    periodo: r.periodo,
    objetivo: r.objetivo,
    nivel: r.nivel,
    modo: r.modo,
    volumen_total: r.volumen_total,
    semanas: r.semanas,
    duracion_semanas: r.duracion_semanas,
    irm_arranque: r.irm_arranque,
    irm_envion: r.irm_envion,
    overrides: r.overrides || {},
    escuela: meta.escuela ?? r.escuela ?? false,
    escuela_nivel: meta.escuela_nivel ?? r.escuela_nivel ?? "1",
    num_bloques_basica: meta.num_bloques_basica ?? r.num_bloques_basica ?? 3,
    pretemporada: meta.pretemporada ?? r.pretemporada ?? false,
    creado: r.created_at?.slice(0, 10),
    _updated_at: r.updated_at || null,
  };
}
