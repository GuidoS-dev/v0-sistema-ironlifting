import React, { useState, useEffect, useRef, useCallback } from "react";
import { Download, Send, FileText, MessageCircle, ChevronLeft, Plus, Pencil, Trash2, Library, Copy, Files, Clipboard, User, Briefcase, X, Undo2, Redo2, Droplets, Sprout, Zap, CloudMoon, LogOut, Shield } from "lucide-react";


// ═══════════════════════════════════════════════════════════════
// SUPABASE — Pure fetch client (no CDN needed)
// ═══════════════════════════════════════════════════════════════
const SUPA_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Storage keys for session persistence
const SESSION_KEY = "sb_session";

function saveSession(s) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch {}
}
function loadSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
}
function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch {}
}

// Auth listeners
const _authListeners = [];
function onAuthChange(fn) {
  _authListeners.push(fn);
  return { unsubscribe: () => { const i = _authListeners.indexOf(fn); if(i>-1)_authListeners.splice(i,1); } };
}
function _emitAuth(event, session) {
  _authListeners.forEach(fn => fn(event, session));
}

// Current session ref
let _session = loadSession();

// Token refresh helper
async function _refreshToken(refresh_token) {
  const r = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=refresh_token`, {
    method:"POST",
    headers:{"Content-Type":"application/json","apikey":SUPA_ANON},
    body: JSON.stringify({refresh_token})
  });
  if (!r.ok) return null;
  const data = await r.json();
  if (!data.access_token) return null;
  const s = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    user: data.user,
    expires_at: Date.now() + (data.expires_in||3600)*1000
  };
  _session = s; saveSession(s); _emitAuth("TOKEN_REFRESHED", s);
  return s;
}

async function _getValidSession() {
  if (!_session) return null;
  // Refresh if expiring in < 60s
  if (_session.expires_at && Date.now() > _session.expires_at - 60000) {
    return await _refreshToken(_session.refresh_token);
  }
  return _session;
}

// Pure fetch Supabase client
const sb = {
  auth: {
    getSession: async () => {
      const s = await _getValidSession();
      return { data: { session: s } };
    },
    onAuthStateChange: (fn) => {
      const sub = onAuthChange(fn);
      return { data: { subscription: sub } };
    },
    signInWithPassword: async ({email, password}) => {
      const r = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=password`, {
        method:"POST",
        headers:{"Content-Type":"application/json","apikey":SUPA_ANON},
        body: JSON.stringify({email, password})
      });
      const data = await r.json();
      if (!r.ok) return { data: null, error: { message: data.error_description || data.msg || "Error al ingresar" } };
      const session = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        user: data.user,
        expires_at: Date.now() + (data.expires_in||3600)*1000
      };
      _session = session; saveSession(session); _emitAuth("SIGNED_IN", session);
      return { data: { session }, error: null };
    },
    signUp: async ({email, password, options}) => {
      const r = await fetch(`${SUPA_URL}/auth/v1/signup`, {
        method:"POST",
        headers:{"Content-Type":"application/json","apikey":SUPA_ANON},
        body: JSON.stringify({email, password, data: options?.data || {}})
      });
      const data = await r.json();
      if (!r.ok) return { data: null, error: { message: data.error_description || data.msg || "Error al registrar" } };
      return { data, error: null };
    },
    signOut: async () => {
      const s = await _getValidSession();
      if (s) {
        await fetch(`${SUPA_URL}/auth/v1/logout`, {
          method:"POST",
          headers:{"apikey":SUPA_ANON,"Authorization":`Bearer ${s.access_token}`}
        }).catch(()=>{});
      }
      _session = null; clearSession(); _emitAuth("SIGNED_OUT", null);
      return { error: null };
    },
    resetPasswordForEmail: async (email) => {
      await fetch(`${SUPA_URL}/auth/v1/recover`, {
        method:"POST",
        headers:{"Content-Type":"application/json","apikey":SUPA_ANON},
        body: JSON.stringify({email})
      });
      return { error: null };
    },
  },

  // PostgREST query builder
  from: (table) => {
    const _q = { table, filters:[], select:"*", single_:false, limit_:null, order_:null };
    const _headers = async () => {
      const s = await _getValidSession();
      const h = {"Content-Type":"application/json","apikey":SUPA_ANON};
      if (s) h["Authorization"] = `Bearer ${s.access_token}`;
      return h;
    };
    const _url = (extra="") => `${SUPA_URL}/rest/v1/${_q.table}${extra}`;
    const _params = () => {
      const p = new URLSearchParams();
      p.set("select", _q.select);
      _q.filters.forEach(f => p.append(f.col, f.val));
      if (_q.limit_) p.set("limit", _q.limit_);
      if (_q.order_) p.set("order", _q.order_);
      return p.toString();
    };
    const builder = {
      select: (s="*") => { _q.select=s; return builder; },
      eq:     (col,val) => { _q.filters.push({col, val:`eq.${val}`}); return builder; },
      single: () => { _q.single_=true; return builder; },
      limit:  (n) => { _q.limit_=n; return builder; },
      order:  (col,{ascending:asc=true}={}) => { _q.order_=`${col}.${asc?"asc":"desc"}`; return builder; },
      exec: async () => {
        const h = await _headers();
        if (_q.single_) h["Accept"] = "application/vnd.pgrst.object+json";
        const r = await fetch(`${_url()}?${_params()}`, {headers:h});
        const data = await r.json();
        return r.ok ? { data, error:null } : { data:null, error:data };
      },
      then: function(resolve, reject) {
        return this.exec().then(resolve, reject);
      },
      insert: async (rows) => {
        const h = await _headers();
        h["Prefer"] = "return=representation";
        const r = await fetch(_url(), {method:"POST",headers:h,body:JSON.stringify(rows)});
        const data = await r.json();
        return r.ok ? {data,error:null} : {data:null,error:data};
      },
      upsert: async (rows, { onConflict } = {}) => {
        const h = await _headers();
        h["Prefer"] = "return=representation,resolution=merge-duplicates";
        const extra = onConflict ? `?on_conflict=${onConflict}` : '';
        const r = await fetch(`${_url()}${extra}`, {method:"POST",headers:h,body:JSON.stringify(rows)});
        const data = await r.json();
        return r.ok ? {data,error:null} : {data:null,error:data};
      },
      update: async (vals) => {
        const h = await _headers();
        h["Prefer"] = "return=representation";
        const p = new URLSearchParams();
        _q.filters.forEach(f => p.append(f.col, f.val));
        const r = await fetch(`${_url()}?${p}`, {method:"PATCH",headers:h,body:JSON.stringify(vals)});
        const data = await r.json();
        return r.ok ? {data,error:null} : {data:null,error:data};
      },
      delete: async () => {
        const h = await _headers();
        const p = new URLSearchParams();
        _q.filters.forEach(f => p.append(f.col, f.val));
        const r = await fetch(`${_url()}?${p}`, {method:"DELETE",headers:h});
        return r.ok ? {data:null,error:null} : {data:null,error:await r.json()};
      },
    };
    return builder;
  },
};

function getSupabase() { return sb; }

// ─── DB SYNC HELPERS ─────────────────────────────────────────────────────────
// Recolecta los overrides de celdas de un mesociclo desde localStorage
function collectMesoOverrides(mesoId) {
  const get = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
  return {
    repsEdit:   get(`liftplan_pt_${mesoId}_repsEdit`)   || {},
    manualEdit: get(`liftplan_pt_${mesoId}_manualEdit`) || [],
    cellEdit:   get(`liftplan_pt_${mesoId}_cellEdit`)   || {},
    cellManual: get(`liftplan_pt_${mesoId}_cellManual`) || [],
    nameEdit:   get(`liftplan_pt_${mesoId}_nameEdit`)   || {},
    noteEdit:   get(`liftplan_pt_${mesoId}_noteEdit`)   || {},
  };
}

// Restaura los overrides de un mesociclo en localStorage al cargar desde DB
function restoreMesoOverrides(mesoId, overrides) {
  if (!overrides) return;
  const set = (k, v) => { try { if (v != null) localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  set(`liftplan_pt_${mesoId}_repsEdit`,   overrides.repsEdit);
  set(`liftplan_pt_${mesoId}_manualEdit`, overrides.manualEdit);
  set(`liftplan_pt_${mesoId}_cellEdit`,   overrides.cellEdit);
  set(`liftplan_pt_${mesoId}_cellManual`, overrides.cellManual);
  set(`liftplan_pt_${mesoId}_nameEdit`,   overrides.nameEdit);
  set(`liftplan_pt_${mesoId}_noteEdit`,   overrides.noteEdit);
}

// Recolecta los overrides de porcentajes de un atleta desde localStorage
function collectAtletaPctOverrides(atletaId) {
  const get = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
  return {
    semOvr:   get(`liftplan_pct_${atletaId}_semOvr`)   || {},
    semMan:   get(`liftplan_pct_${atletaId}_semMan`)    || [],
    turnoOvr: get(`liftplan_pct_${atletaId}_turnoOvr`) || {},
    turnoMan: get(`liftplan_pct_${atletaId}_turnoMan`) || [],
  };
}

// Restaura los overrides de porcentajes de un atleta en localStorage
function restoreAtletaPctOverrides(atletaId, overrides) {
  if (!overrides) return;
  const set = (k, v) => { try { if (v != null) localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  set(`liftplan_pct_${atletaId}_semOvr`,   overrides.semOvr);
  set(`liftplan_pct_${atletaId}_semMan`,   overrides.semMan);
  set(`liftplan_pct_${atletaId}_turnoOvr`, overrides.turnoOvr);
  set(`liftplan_pct_${atletaId}_turnoMan`, overrides.turnoMan);
}

// ─── MAPEOS APP ↔ DB (usan el esquema real de las tablas existentes) ─────────
function atletaToDb(a, coachId) {
  return {
    coach_id:         coachId,
    app_id:           a.id,
    nombre:           a.nombre           || '',
    email:            a.email            || '',
    telefono:         a.telefono         || '',
    fecha_nacimiento: a.fecha_nacimiento || null,
    notas:            a.notas            || '',
    tipo:             a.tipo             || 'atleta',
    pct_overrides:    collectAtletaPctOverrides(a.id),
    updated_at:       new Date().toISOString(),
  };
}
function atletaFromDb(r) {
  return {
    id:               r.app_id,
    nombre:           r.nombre,
    email:            r.email,
    telefono:         r.telefono,
    fecha_nacimiento: r.fecha_nacimiento,
    notas:            r.notas,
    tipo:             r.tipo,
  };
}
function mesoToDb(m, coachId) {
  return {
    coach_id:       coachId,
    app_id:         m.id,
    app_atleta_id:  m.atleta_id      || null,
    nombre:         m.nombre         || '',
    fecha_inicio:   m.fecha_inicio   || new Date().toISOString().slice(0,10),
    modo:           m.modo           || 'Preparatorio',
    activo:         m.activo         ?? false,
    irm_arranque:   m.irm_arranque   || null,
    irm_envion:     m.irm_envion     || null,
    volumen_total:  m.volumen_total  || 0,
    descripcion:    m.descripcion    || '',
    duracion_ciclo: m.duracion_ciclo || null,
    duracion_mens:  m.duracion_mens  || null,
    ultimo_inicio:  m.ultimo_inicio  || null,
    semanas:        m.semanas        || [],
    overrides:      collectMesoOverrides(m.id),
    updated_at:     new Date().toISOString(),
  };
}
function mesoFromDb(r) {
  return {
    id:             r.app_id,
    atleta_id:      r.app_atleta_id,
    nombre:         r.nombre,
    fecha_inicio:   r.fecha_inicio,
    modo:           r.modo,
    activo:         r.activo,
    irm_arranque:   r.irm_arranque,
    irm_envion:     r.irm_envion,
    volumen_total:  r.volumen_total,
    descripcion:    r.descripcion,
    duracion_ciclo: r.duracion_ciclo,
    duracion_mens:  r.duracion_mens,
    ultimo_inicio:  r.ultimo_inicio,
    semanas:        r.semanas || [],
  };
}
function plantillaToDb(p, coachId) {
  return {
    coach_id:        coachId,
    app_id:          p.id,
    nombre:          p.nombre          || '',
    descripcion:     p.descripcion     || '',
    tipo:            p.tipo            || 'meso',
    periodo:         p.periodo         || 'general',
    objetivo:        p.objetivo        || 'mixto',
    nivel:           p.nivel           || 'intermedio',
    modo:            p.modo            || 'Preparatorio',
    volumen_total:   p.volumen_total   || null,
    semanas:         p.semanas         || null,
    duracion_semanas: p.duracion_semanas || null,
    irm_arranque:    p.irm_arranque    || null,
    irm_envion:      p.irm_envion      || null,
    overrides:       p.overrides       || {},
    updated_at:      new Date().toISOString(),
  };
}
function plantillaFromDb(r) {
  return {
    id:               r.app_id,
    nombre:           r.nombre,
    descripcion:      r.descripcion,
    tipo:             r.tipo,
    periodo:          r.periodo,
    objetivo:         r.objetivo,
    nivel:            r.nivel,
    modo:             r.modo,
    volumen_total:    r.volumen_total,
    semanas:          r.semanas,
    duracion_semanas: r.duracion_semanas,
    irm_arranque:     r.irm_arranque,
    irm_envion:       r.irm_envion,
    overrides:        r.overrides || {},
    creado:           r.created_at?.slice(0,10),
  };
}

// ─── DATA ─────────────────────��──────────────────────────────────────────────
const EJERCICIOS = [{"id": 1, "nombre": "Fza atrás de nuca en sentadilla Arran.", "categoria": "Arranque", "pct_base": 100, "base": "arranque"}, {"id": 2, "nombre": "Caminata en sentadilla Arran.", "categoria": "Arranque", "pct_base": 50, "base": "arranque"}, {"id": 3, "nombre": "Saltos en sentadilla Arran.", "categoria": "Arranque", "pct_base": 50, "base": "arranque"}, {"id": 4, "nombre": "Empuje atrás toma Arran.", "categoria": "Arranque", "pct_base": 70, "base": "arranque"}, {"id": 5, "nombre": "Empuje atrás toma Arran con flexión.", "categoria": "Arranque", "pct_base": 90, "base": "arranque"}, {"id": 6, "nombre": "Metidas Arran.", "categoria": "Arranque", "pct_base": 100, "base": "arranque"}, {"id": 7, "nombre": "Arran de pecho.", "categoria": "Arranque", "pct_base": 30, "base": "arranque"}, {"id": 8, "nombre": "Arran de ingle.", "categoria": "Arranque", "pct_base": 90, "base": "arranque"}, {"id": 9, "nombre": "Arran colgado sobre muslo.", "categoria": "Arranque", "pct_base": 100, "base": "arranque"}, {"id": 10, "nombre": "Arran colgado sobre rodilla.", "categoria": "Arranque", "pct_base": 100, "base": "arranque"}, {"id": 11, "nombre": "Arran colgado bajo rodilla.", "categoria": "Arranque", "pct_base": 100, "base": "arranque"}, {"id": 12, "nombre": "Arran suspendido.", "categoria": "Arranque", "pct_base": 100, "base": "arranque"}, {"id": 13, "nombre": "Arran hiper.", "categoria": "Arranque", "pct_base": 100, "base": "arranque"}, {"id": 14, "nombre": "Arran de tacos.", "categoria": "Arranque", "pct_base": 100, "base": "arranque"}, {"id": 15, "nombre": "Arran clásico.", "categoria": "Arranque", "pct_base": 100, "base": "arranque"}, {"id": 16, "nombre": "Arran sin deslizamiento.", "categoria": "Arranque", "pct_base": 90, "base": "arranque"}, {"id": 17, "nombre": "Arran Fza abajo.", "categoria": "Arranque", "pct_base": 80, "base": "arranque"}, {"id": 18, "nombre": "Adaptación de Arran.", "categoria": "Arranque", "pct_base": 68, "base": "arranque"}, {"id": 19, "nombre": "Arran estrecho.", "categoria": "Arranque", "pct_base": 85, "base": "arranque"}, {"id": 20, "nombre": "Carg a Fza parado.", "categoria": "Envion", "pct_base": 68, "base": "arranque"}, {"id": 21, "nombre": "Carg de Fza abajo.", "categoria": "Envion", "pct_base": 85, "base": "arranque"}, {"id": 22, "nombre": "Carg de potencia.", "categoria": "Envion", "pct_base": 90, "base": "arranque"}, {"id": 23, "nombre": "Carg clásica.", "categoria": "Envion", "pct_base": 100, "base": "arranque"}, {"id": 24, "nombre": "Carg sin deslizamiento.", "categoria": "Envion", "pct_base": 90, "base": "arranque"}, {"id": 25, "nombre": "Carg hiper.", "categoria": "Envion", "pct_base": 100, "base": "arranque"}, {"id": 27, "nombre": "Carg colgada sobre muslos.", "categoria": "Envion", "pct_base": 100, "base": "arranque"}, {"id": 28, "nombre": "Carg colgada sobre rodillas.", "categoria": "Envion", "pct_base": 100, "base": "arranque"}, {"id": 29, "nombre": "Carg colgada bajo rodilla.", "categoria": "Envion", "pct_base": 100, "base": "arranque"}, {"id": 30, "nombre": "Carg suspendida.", "categoria": "Envion", "pct_base": 90, "base": "arranque"}, {"id": 31, "nombre": "Carg de tacos.", "categoria": "Envion", "pct_base": 100, "base": "arranque"}, {"id": 32, "nombre": "Fza militar.", "categoria": "Envion", "pct_base": 55, "base": "arranque"}, {"id": 33, "nombre": "Fza militar sentado.", "categoria": "Envion", "pct_base": 55, "base": "arranque"}, {"id": 34, "nombre": "Fza c/impulso.", "categoria": "Envion", "pct_base": 100, "base": "arranque"}, {"id": 35, "nombre": "Fza c/impulso c/F.", "categoria": "Envion", "pct_base": 90, "base": "envion"}, {"id": 36, "nombre": "Segundo tiempo de potencia.", "categoria": "Envion", "pct_base": 100, "base": "envion"}, {"id": 37, "nombre": "Segundo tiempo desde tijera.", "categoria": "Envion", "pct_base": 60, "base": "envion"}, {"id": 38, "nombre": "Segundo tiempo c/tijera.", "categoria": "Envion", "pct_base": 100, "base": "envion"}, {"id": 39, "nombre": "Fza c/imp atrás nuca.", "categoria": "Envion", "pct_base": 100, "base": "arranque"}, {"id": 40, "nombre": "Fza c/imp c/F atrás nuca.", "categoria": "Envion", "pct_base": 90, "base": "envion"}, {"id": 41, "nombre": "Seg tiem de pot atrás nuca.", "categoria": "Envion", "pct_base": 100, "base": "envion"}, {"id": 42, "nombre": "Seg tiem desde tijr atrás nuca.", "categoria": "Envion", "pct_base": 60, "base": "envion"}, {"id": 43, "nombre": "Seg tiem de tijr atrás nuca.", "categoria": "Envion", "pct_base": 100, "base": "envion"}, {"id": 44, "nombre": "Envión de Fza / sentadillas.", "categoria": "Envion", "pct_base": 70, "base": "envion"}, {"id": 45, "nombre": "Envión clásico.", "categoria": "Envion", "pct_base": 100, "base": "envion"}, {"id": 46, "nombre": "Medio segudo tiempo (saque).", "categoria": "Envion", "pct_base": 100, "base": "envion"}, {"id": 47, "nombre": "Adaptación de segundo tiempo.", "categoria": "Envion", "pct_base": 50, "base": "envion"}, {"id": 48, "nombre": "Adaptación de seg tiem inicial.", "categoria": "Envion", "pct_base": 80, "base": "envion"}, {"id": 49, "nombre": "Trn Arrq Fza hombro.", "categoria": "Tirones", "pct_base": 120, "base": "arranque"}, {"id": 50, "nombre": "Trn Arrq completo (rt glúteo punta).", "categoria": "Tirones", "pct_base": 105, "base": "arranque"}, {"id": 500, "nombre": "Trn Arrq de tacos Fza brazos.", "categoria": "Complementarios", "pct_base": 110, "base": "arranque"}, {"id": 51, "nombre": "Trn Arrq colg S M.", "categoria": "Tirones", "pct_base": 110, "base": "arranque"}, {"id": 52, "nombre": "Trn colg S R.", "categoria": "Tirones", "pct_base": 110, "base": "arranque"}, {"id": 520, "nombre": "Trn Arrq colg bajo RD.", "categoria": "Complementarios", "pct_base": 110, "base": "arranque"}, {"id": 53, "nombre": "Trn Arrq suspendido.", "categoria": "Tirones", "pct_base": 105, "base": "arranque"}, {"id": 54, "nombre": "Trn Arrq 4/paradas.", "categoria": "Tirones", "pct_base": 110, "base": "arranque"}, {"id": 55, "nombre": "Trn hiper.", "categoria": "Tirones", "pct_base": 110, "base": "arranque"}, {"id": 56, "nombre": "Trn Arrq hasta las rodillas.", "categoria": "Tirones", "pct_base": 120, "base": "arranque"}, {"id": 57, "nombre": "Paradillas.", "categoria": "Tirones", "pct_base": 120, "base": "arranque"}, {"id": 58, "nombre": "Trn envión Fza hombros.", "categoria": "Tirones", "pct_base": 120, "base": "envion"}, {"id": 59, "nombre": "Trn envión completo (rt glúteo y puntas).", "categoria": "Tirones", "pct_base": 120, "base": "envion"}, {"id": 60, "nombre": "Trn envión de tacos.", "categoria": "Tirones", "pct_base": 120, "base": "envion"}, {"id": 61, "nombre": "Trn envión colg S M.", "categoria": "Tirones", "pct_base": 120, "base": "envion"}, {"id": 62, "nombre": "Trn envión colg S R.", "categoria": "Tirones", "pct_base": 120, "base": "envion"}, {"id": 63, "nombre": "Trn envión colg bajo RD.", "categoria": "Tirones", "pct_base": 120, "base": "envion"}, {"id": 64, "nombre": "Trn envión suspendido.", "categoria": "Tirones", "pct_base": 120, "base": "envion"}, {"id": 65, "nombre": "Trn envión 4/paradas.", "categoria": "Tirones", "pct_base": 120, "base": "envion"}, {"id": 66, "nombre": "Trn envión hasta rodillas.", "categoria": "Tirones", "pct_base": 120, "base": "envion"}, {"id": 67, "nombre": "Paradillas.", "categoria": "Tirones", "pct_base": 120, "base": "envion"}, {"id": 68, "nombre": "Trn envión hiper.", "categoria": "Tirones", "pct_base": 120, "base": "envion"}, {"id": 69, "nombre": "Sent atrás.", "categoria": "Piernas", "pct_base": 140, "base": "envion"}, {"id": 70, "nombre": "Sent adelante.", "categoria": "Piernas", "pct_base": 125, "base": "envion"}, {"id": 71, "nombre": "Sent atrás ritmo cediente.", "categoria": "Piernas", "pct_base": 100, "base": "envion"}, {"id": 72, "nombre": "Sent adelante ritmo cediente.", "categoria": "Piernas", "pct_base": 90, "base": "envion"}, {"id": 73, "nombre": "Sent en tijeras.", "categoria": "Piernas", "pct_base": 68, "base": "envion"}, {"id": 74, "nombre": "Sent de Arran.", "categoria": "Piernas", "pct_base": 100, "base": "arranque"}, {"id": 75, "nombre": "Sent de envión.", "categoria": "Piernas", "pct_base": 100, "base": "envion"}, {"id": 76, "nombre": "Sent a 1 pierna.", "categoria": "Piernas", "pct_base": 65, "base": "envion"}, {"id": 77, "nombre": "Sent c/mancuerna.", "categoria": "Piernas", "pct_base": null, "base": null}, {"id": 78, "nombre": "Subidas al banco.", "categoria": "Piernas", "pct_base": null, "base": null}, {"id": 79, "nombre": "Hombro atrás toma Arran.", "categoria": "Complementarios", "pct_base": 68, "base": "arranque"}, {"id": 80, "nombre": "Dominadas.", "categoria": "Complementarios", "pct_base": null, "base": null}, {"id": 81, "nombre": "Dorsales atrás.", "categoria": "Complementarios", "pct_base": 80, "base": "arranque"}, {"id": 82, "nombre": "Dorsales adelante.", "categoria": "Complementarios", "pct_base": 80, "base": "arranque"}, {"id": 83, "nombre": "Remo toma Arran con aducción de escápulas.", "categoria": "Complementarios", "pct_base": 80, "base": "arranque"}, {"id": 84, "nombre": "Remo toma envión codos puntas y.", "categoria": "Complementarios", "pct_base": 80, "base": "arranque"}, {"id": 85, "nombre": "Remo toma media codos atrás c/adcc.", "categoria": "Complementarios", "pct_base": 80, "base": "arranque"}, {"id": 86, "nombre": "Pecho c/abducción de escápulas.", "categoria": "Complementarios", "pct_base": 80, "base": "arranque"}, {"id": 87, "nombre": "Bíceps.", "categoria": "Complementarios", "pct_base": 40, "base": "arranque"}, {"id": 88, "nombre": "Tríceps.", "categoria": "Complementarios", "pct_base": 40, "base": "arranque"}, {"id": 89, "nombre": "Fondos de tríceps.", "categoria": "Complementarios", "pct_base": null, "base": null}, {"id": 90, "nombre": "Tríceps paralelas.", "categoria": "Complementarios", "pct_base": null, "base": null}, {"id": 91, "nombre": "Remo parado.", "categoria": "Complementarios", "pct_base": null, "base": null}, {"id": 92, "nombre": "Vuelos frontales/laterales/posteriores.", "categoria": "Complementarios", "pct_base": null, "base": null}, {"id": 93, "nombre": "Vuelos posteriores c/adcc escápulas.", "categoria": "Complementarios", "pct_base": null, "base": null}, {"id": 94, "nombre": "Acondicionamiento escápular boca abajo.", "categoria": "Complementarios", "pct_base": null, "base": null}, {"id": 95, "nombre": "Combinado de brazos con mancuerna.", "categoria": "Complementarios", "pct_base": null, "base": null}, {"id": 96, "nombre": "Combinado de antebrazos + Fza militar.", "categoria": "Complementarios", "pct_base": null, "base": null}, {"id": 97, "nombre": "Hombro atrás + elevación de escápulas.", "categoria": "Complementarios", "pct_base": null, "base": null}, {"id": 98, "nombre": "Abdominales piernas a 90 grados.", "categoria": "Complementarios", "pct_base": null, "base": null}, {"id": 99, "nombre": "Abdominales colg piernas estiradas.", "categoria": "Complementarios", "pct_base": null, "base": null}, {"id": 100, "nombre": "Abdominales estáticos.", "categoria": "Complementarios", "pct_base": null, "base": null}, {"id": 101, "nombre": "Hprext.", "categoria": "Complementarios", "pct_base": null, "base": null}, {"id": 102, "nombre": "Hprext a 1 pierna.", "categoria": "Complementarios", "pct_base": null, "base": null}, {"id": 103, "nombre": "Hprext estáticas.", "categoria": "Complementarios", "pct_base": null, "base": null}, {"id": 104, "nombre": "Hprext de piernas.", "categoria": "Complementarios", "pct_base": null, "base": null}, {"id": 105, "nombre": "Espinales.", "categoria": "Complementarios", "pct_base": null, "base": null}, {"id": 106, "nombre": "Buenos días parado.", "categoria": "Complementarios", "pct_base": 70, "base": "arranque"}, {"id": 107, "nombre": "Buenos días sentado.", "categoria": "Complementarios", "pct_base": 60, "base": "arranque"}, {"id": 108, "nombre": "Buenos días parado piernas estiradas.", "categoria": "Complementarios", "pct_base": 60, "base": "arranque"}, {"id": 109, "nombre": "Buenos días c/barra.", "categoria": "Complementarios", "pct_base": 100, "base": "arranque"}, {"id": 110, "nombre": "Buenos días c/barra hiper.", "categoria": "Complementarios", "pct_base": 100, "base": "arranque"}, {"id": 111, "nombre": "Buenos días a 1 pierna.", "categoria": "Complementarios", "pct_base": 60, "base": "arranque"}, {"id": 112, "nombre": "Mantenimiento parado.", "categoria": "Complementarios", "pct_base": 130, "base": "envion"}, {"id": 113, "nombre": "Mantenimiento acostado.", "categoria": "Complementarios", "pct_base": 130, "base": "envion"}, {"id": 114, "nombre": "Combinado bolita/barra.", "categoria": "Complementarios", "pct_base": null, "base": null}, {"id": 115, "nombre": "Combinado Arran.", "categoria": "Complementarios", "pct_base": null, "base": null}, {"id": 116, "nombre": "Combinado envión.", "categoria": "Complementarios", "pct_base": null, "base": null}, {"id": 117, "nombre": "Combinado de tiempo.", "categoria": "Complementarios", "pct_base": null, "base": null}, {"id": 118, "nombre": "Combinado de estabilizadores.", "categoria": "Complementarios", "pct_base": null, "base": null}, {"id": 119, "nombre": "Subo bajo al banco.", "categoria": "Complementarios", "pct_base": null, "base": null}, {"id": 120, "nombre": "Caminata paso largo c/barra arriba.", "categoria": "Complementarios", "pct_base": null, "base": null}, {"id": 121, "nombre": "Saltos c/discos laterales.", "categoria": "Complementarios", "pct_base": null, "base": null}, {"id": 122, "nombre": "Saltos al plinton.", "categoria": "Complementarios", "pct_base": null, "base": null}, {"id": 123, "nombre": "Saltos en la goma.", "categoria": "Complementarios", "pct_base": null, "base": null}, {"id": 124, "nombre": "Saltos rana.", "categoria": "Complementarios", "pct_base": null, "base": null}, {"id": 125, "nombre": "Escaleras.", "categoria": "Complementarios", "pct_base": null, "base": null}, {"id": 126, "nombre": "Caminata patito.", "categoria": "Complementarios", "pct_base": null, "base": null}, {"id": 127, "nombre": "Caminata en sentadilla Arran atrás + adelante.", "categoria": "Complementarios", "pct_base": null, "base": null}, {"id": 128, "nombre": "Carrera perrito.", "categoria": "Complementarios", "pct_base": null, "base": null}, {"id": 129, "nombre": "Caminata del oso.", "categoria": "Complementarios", "pct_base": null, "base": null}, {"id": 130, "nombre": "Caminata cangrejo.", "categoria": "Complementarios", "pct_base": null, "base": null}, {"id": 131, "nombre": "Foca.", "categoria": "Complementarios", "pct_base": null, "base": null}, {"id": 132, "nombre": "Media lunas.", "categoria": "Complementarios", "pct_base": null, "base": null}, {"id": 133, "nombre": "Verticales.", "categoria": "Complementarios", "pct_base": null, "base": null}, {"id": 134, "nombre": "Combinado saltos pie derecho.", "categoria": "Complementarios", "pct_base": null, "base": null}, {"id": 135, "nombre": "Lanzamientos disco atrás + adelante.", "categoria": "Complementarios", "pct_base": null, "base": null}, {"id": 136, "nombre": "Saltos seguidos con bayas.", "categoria": "Complementarios", "pct_base": null, "base": null}, {"id": 137, "nombre": "Saltos varios.", "categoria": "Complementarios", "pct_base": null, "base": null}, {"id": 138, "nombre": "Saltos rana.", "categoria": "Complementarios", "pct_base": null, "base": null}, {"id": 139, "nombre": "Carrera 30 metros.", "categoria": "Complementarios", "pct_base": null, "base": null}, {"id": 140, "nombre": "Carrera media 800 metros.", "categoria": "Complementarios", "pct_base": null, "base": null}, {"id": 141, "nombre": "Lagartijas.", "categoria": "Complementarios", "pct_base": null, "base": null}, {"id": 142, "nombre": "Lanzamiento de pelota acostado.", "categoria": "Complementarios", "pct_base": null, "base": null}, {"id": 143, "nombre": "Combinado de tiempo.", "categoria": "Complementarios", "pct_base": null, "base": null}, {"id": 144, "nombre": "Juegos varios.", "categoria": "Complementarios", "pct_base": null, "base": null}];

const DIAS = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];
const MOMENTOS = ["Mañana","Tarde","Noche"];
const CATEGORIAS = ["Arranque","Envion","Tirones","Piernas","Complementarios"];
const CAT_COLOR = {
  Arranque:"#e8c547", Envion:"#47b4e8", Tirones:"#e87447", Piernas:"#47e8a0", Complementarios:"#9b87e8"
};

const mkId = () => Math.random().toString(36).slice(2,9);
const mkTurnos = () => Array.from({length:9},(_,i)=>({
  id:mkId(), numero:i+1, dia:"", momento:"",
  ejercicios:Array.from({length:3},()=>({id:mkId(),ejercicio_id:null,intensidad:75,tabla:1,reps_asignadas:0})),
  complementarios_before:Array.from({length:0}),
  complementarios_after:Array.from({length:0})
}));
const mkSemanas = () => Array.from({length:4},(_,i)=>({
  id:mkId(), numero:i+1, pct_volumen:25,
  reps_calculadas:0, reps_ajustadas:0,
  pct_grupos:{Arranque:25,Envion:35,Tirones:20,Piernas:20},
  turnos: mkTurnos()
}));

// ── Escuela Básica helpers ──────────────────────────────────────────────────
const mkBloqueBasica = () => ({ pct: null, series: null, reps: null, kg: null });
const mkEjBasica = (n = 3) => ({ id: mkId(), ejercicio_id: null, nombre_custom: "", bloques: Array.from({length: n}, mkBloqueBasica) });
const mkTurnosBasica = (n = 3) => Array.from({length:3},(_,i)=>({
  id:mkId(), numero:i+1, dia:"", momento:"", ejercicios: Array.from({length:6}, () => mkEjBasica(n))
}));
const mkSemanasBasica = (numSem = 4, numBloques = 3) => Array.from({length:numSem},(_,i)=>({
  id:mkId(), numero:i+1, turnos: mkTurnosBasica(numBloques)
}));

// ─── STYLES ──────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  :root{
    --bg:#0a0c10; --surface:#12151c; --surface2:#1a1f2a; --surface3:#222836;
    --border:#2a3040; --gold:#e8c547; --blue:#47b4e8; --red:#e84747; --green:#47e8a0;
    --text:#e8eaf0; --muted:#6b7590; --accent:#e8c547;
  }
  :root{--nav-h:64px}
  @media(max-width:480px){:root{--nav-h:48px}}
  body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;font-size:14px;min-height:100vh}
  
  /* ── Scrollbars ── */
  *{scrollbar-width:thin;scrollbar-color:rgba(232,197,71,.25) transparent}
  *::-webkit-scrollbar{width:6px;height:6px}
  *::-webkit-scrollbar-track{background:transparent}
  *::-webkit-scrollbar-thumb{background:rgba(232,197,71,.22);border-radius:99px;transition:background .2s}
  *::-webkit-scrollbar-thumb:hover{background:rgba(232,197,71,.5)}
  *::-webkit-scrollbar-corner{background:transparent}
  h1,h2,h3{font-family:'Bebas Neue',sans-serif;letter-spacing:.05em}
  
  .app{display:flex;flex-direction:column;min-height:100vh;height:100vh;overflow:hidden}
  
  /* NAV */
  .nav{background:var(--surface);border-bottom:1px solid var(--border);padding:0 24px;display:flex;align-items:center;gap:0;height:64px;position:sticky;top:0;z-index:100;overflow-x:hidden}
  .nav-logo{display:flex;align-items:center;margin-right:24px;flex-shrink:0}
  .nav-tabs{display:flex;height:100%;gap:0;overflow-x:auto;scrollbar-width:none;flex:1;min-width:0}
  .nav-tab{padding:0 14px;border:none;background:none;color:var(--muted);font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;cursor:pointer;border-bottom:2px solid transparent;height:100%;transition:all .2s;white-space:nowrap;flex-shrink:0}
  .nav-tab:hover{color:var(--text)}
  .nav-tab.active{color:var(--gold);border-bottom-color:var(--gold)}

  /* LAYOUT */
  .main{flex:1;padding:28px 28px;max-width:1400px;margin:0 auto;width:100%;box-sizing:border-box;overflow-y:auto}
  .page-title{font-size:32px;color:var(--gold);margin-bottom:4px}
  .page-sub{color:var(--muted);font-size:13px;margin-bottom:28px}

  /* CARDS */
  .card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px}
  .card-title{font-family:'Bebas Neue',sans-serif;font-size:18px;color:var(--text);letter-spacing:.05em;margin-bottom:16px;display:flex;align-items:center;gap:8px}
  .card-title span{font-size:11px;font-family:'DM Sans',sans-serif;font-weight:500;padding:2px 8px;border-radius:20px;letter-spacing:.05em}

  /* GRID */
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px}
  .grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}

  /* FORM */
  .form-group{display:flex;flex-direction:column;gap:6px;margin-bottom:14px;min-width:0;width:100%;max-width:100%}
  .form-label{font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}
  .form-input{background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:13px;padding:9px 12px;outline:none;transition:border .2s;width:100%;box-sizing:border-box;min-width:0;max-width:100%}
  .form-input:focus{border-color:var(--gold)}
  input[type=number]::-webkit-outer-spin-button,input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
  input[type=number]{-moz-appearance:textfield}
  .form-select{background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:13px;padding:9px 12px;outline:none;cursor:pointer;width:100%;box-sizing:border-box;min-width:0;max-width:100%}
  .form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}
  .form-row .form-group{flex:none;min-width:0;margin-bottom:0;width:100%}

  /* BUTTONS */
  .btn{border:none;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;padding:9px 18px;transition:all .2s;display:inline-flex;align-items:center;gap:6px}
  .btn-gold{background:var(--gold);color:#0a0c10}
  .btn-gold:hover{background:#f0d050}
  .btn-ghost{background:transparent;border:1px solid var(--border);color:var(--text)}
  .btn-ghost:hover{border-color:var(--gold);color:var(--gold)}
  .btn-danger{background:transparent;border:1px solid var(--red);color:var(--red)}
  .btn-danger:hover{background:var(--red);color:#fff}
  .btn-sm{padding:5px 12px;font-size:12px}
  .btn-xs{padding:3px 8px;font-size:11px}

  /* BADGE */
  .badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em}
  .badge-gold{background:rgba(232,197,71,.15);color:var(--gold)}
  .badge-blue{background:rgba(71,180,232,.15);color:var(--blue)}
  .badge-green{background:rgba(71,232,160,.15);color:var(--green)}
  .badge-red{background:rgba(232,71,71,.15);color:var(--red)}

  /* ATLETAS LIST */
  .atleta-card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:16px 20px;display:flex;align-items:center;gap:16px;cursor:pointer;transition:all .2s}
  .atleta-card:hover{border-color:var(--gold);background:var(--surface2)}
  .atleta-avatar{width:44px;height:44px;border-radius:50%;background:var(--surface3);display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue',sans-serif;font-size:20px;color:var(--gold);flex-shrink:0}
  .atleta-info{flex:1;min-width:0}
  .atleta-name{font-weight:600;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .atleta-meta{font-size:12px;color:var(--muted);margin-top:2px}
  .atleta-marks{display:flex;gap:12px;margin-left:auto;flex-shrink:0}
  .mark-item{text-align:center}
  .mark-val{font-family:'Bebas Neue',sans-serif;font-size:20px;color:var(--gold);line-height:1}
  .mark-lbl{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}

  /* SEMANAS */
  .semana-header{display:flex;align-items:center;gap:12px;margin-bottom:16px}
  .semana-num{font-family:'Bebas Neue',sans-serif;font-size:36px;color:var(--gold);line-height:1}
  .semana-tabs{display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap;overflow-x:auto;scrollbar-width:none}
  .semana-tab{padding:6px 14px;border-radius:20px;border:1px solid var(--border);background:var(--surface2);color:var(--muted);font-size:12px;font-weight:600;cursor:pointer;transition:all .2s}
  .semana-tab.active{background:var(--gold);color:#0a0c10;border-color:var(--gold)}

  /* VOLUMEN CARD */
  .vol-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}
  .vol-item{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:12px;text-align:center}
  .vol-label{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px}
  .vol-val{font-family:'Bebas Neue',sans-serif;font-size:28px;color:var(--gold);line-height:1}
  .vol-sub{font-size:11px;color:var(--muted);margin-top:2px}

  /* GRUPOS */
  .grupos-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px}
  .grupo-item{background:var(--surface2);border-radius:8px;padding:12px;border-left:3px solid}
  .grupo-label{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px}
  .grupo-pct{display:flex;align-items:center;gap:6px}
  .grupo-pct input{background:var(--surface3);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:14px;font-weight:600;padding:4px 8px;width:60px;text-align:center;outline:none}
  .grupo-reps{font-size:11px;color:var(--muted);margin-top:4px}

  /* TURNOS */
  .turno-card{background:var(--surface2);border:1px solid var(--border);border-radius:10px;margin-bottom:12px;overflow:hidden}
  .turno-header{padding:12px 16px;display:flex;align-items:center;gap:12px;cursor:pointer;user-select:none;transition:background .2s}
  .turno-header:hover{background:var(--surface3)}
  .turno-num{font-family:'Bebas Neue',sans-serif;font-size:22px;color:var(--gold);min-width:36px}
  .turno-dia{flex:1;display:flex;gap:8px;align-items:center}
  .turno-dia select{background:var(--surface3);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;padding:4px 8px;outline:none;cursor:pointer}
  .turno-stats{display:flex;gap:12px;margin-left:auto}
  .turno-stat{text-align:center}
  .turno-stat-val{font-family:'Bebas Neue',sans-serif;font-size:16px}
  .turno-stat-lbl{font-size:10px;color:var(--muted)}
  .turno-chevron{color:var(--muted);transition:transform .2s;font-size:16px}
  .turno-chevron.open{transform:rotate(180deg)}
  .turno-body{padding:0 10px 12px}

  /* EJERCICIO ROW */
  .ej-row{display:grid;grid-template-columns:28px 1fr 80px 70px 70px 80px auto;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid var(--border)}
  .ej-row:last-child{border-bottom:none}
  /* COMPLEMENTARIO ROW */
  .comp-row{display:grid;grid-template-columns:28px 1fr 80px 70px 70px 80px 150px 20px auto;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid var(--border)}
  .comp-row:last-child{border-bottom:none}
  .ej-num{font-size:11px;color:var(--muted);text-align:center}
  .ej-select{background:var(--surface3);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;padding:5px 8px;outline:none;width:100%}
  .ej-input{background:var(--surface3);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;padding:5px 8px;outline:none;text-align:center;width:100%}
  .ej-cat{font-size:10px;font-weight:600;padding:2px 6px;border-radius:4px;text-transform:uppercase;letter-spacing:.04em}
  .ej-kg{font-family:'Bebas Neue',sans-serif;font-size:16px;color:var(--gold);text-align:center}

  /* HISTORIAL */
  .historial-row{display:flex;align-items:center;gap:12px;padding:12px 16px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;margin-bottom:8px}
  .historial-fecha{font-size:12px;color:var(--muted);min-width:90px}
  .historial-info{flex:1}
  .historial-name{font-weight:600;font-size:14px}
  .historial-marks{font-size:12px;color:var(--muted)}

  /* NORMATIVOS */
  .norm-table{width:100%;border-collapse:collapse}
  .norm-table th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);padding:6px 8px;border-bottom:1px solid var(--border);white-space:nowrap}
  .norm-table td{padding:8px 12px;border-bottom:1px solid var(--border);font-size:13px}
  .norm-table tr:last-child td{border-bottom:none}
  .norm-table tr:hover td{background:var(--surface2)}

  /* MODAL */
  .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:200;display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow-y:auto;-webkit-overflow-scrolling:touch}
  .modal{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:28px;width:100%;max-width:520px;margin:auto;box-sizing:border-box}
  .modal-title{font-family:'Bebas Neue',sans-serif;font-size:24px;color:var(--gold);margin-bottom:20px}
  .modal-footer{display:flex;justify-content:flex-end;gap:10px;margin-top:20px}

  /* STATS ROW */
  .stats-row{display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap}
  .stat-box{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:14px 18px;flex:1;min-width:120px}
  .stat-box-val{font-family:'Bebas Neue',sans-serif;font-size:32px;color:var(--gold);line-height:1}
  .stat-box-lbl{font-size:11px;color:var(--muted);margin-top:2px;text-transform:uppercase;letter-spacing:.06em}

  /* PROGRESS BAR */
  .prog-bar{height:6px;background:var(--surface3);border-radius:3px;overflow:hidden;margin-top:6px}
  .prog-fill{height:100%;border-radius:3px;transition:width .4s}

  .divider{height:1px;background:var(--border);margin:20px 0}
  .flex{display:flex;align-items:center}
  .flex-between{display:flex;align-items:center;justify-content:space-between}
  .gap4{gap:4px} .gap8{gap:8px} .gap12{gap:12px} .gap16{gap:16px}
  .mt8{margin-top:8px} .mt12{margin-top:12px} .mt16{margin-top:16px} .mt20{margin-top:20px}
  .mb8{margin-bottom:8px} .mb12{margin-bottom:12px} .mb16{margin-bottom:16px}
  .text-gold{color:var(--gold)} .text-muted{color:var(--muted)} .text-sm{font-size:12px}
  .w100{width:100%} .text-center{text-align:center}
  .scroll-x{overflow-x:auto}
  
  input[type=number].no-spin::-webkit-outer-spin-button,
  input[type=number].no-spin::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
  input[type=number].no-spin{-moz-appearance:textfield;appearance:textfield}

  /* ── TABLET (≤768px) ─────────────────────────────────────── */
  @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  @media(max-width:768px){
    .main{padding:12px}
    .grid2,.grid3,.grid4{grid-template-columns:1fr}
    .vol-grid{grid-template-columns:1fr 1fr}
    .grupos-grid{grid-template-columns:1fr 1fr}
    .ej-row{grid-template-columns:20px 1fr 60px 55px;gap:6px}
    .ej-row > *:nth-child(5),.ej-row > *:nth-child(6),.ej-row > *:nth-child(7){display:none}
    .nav{padding:0 12px}
    .nav-logo{font-size:18px;margin-right:12px}
    .nav-tab{padding:0 10px;font-size:12px}
    .nav-tabs{overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch}
    .nav-tabs::-webkit-scrollbar{display:none}
    .stats-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .atleta-marks{display:none}
    .atleta-card{padding:12px 14px}
    .modal{padding:20px;margin:0}
    .card{padding:14px}
  }
  /* ── MOBILE (≤480px) ─────────────────────────────────────── */
  @media(max-width:480px){
    .main{padding:8px}
    .nav{height:48px;padding:0 8px}
    .nav-logo{display:none}
    .nav-tab{padding:0 8px;font-size:11px}
    .semana-tabs{gap:4px;padding-bottom:2px}
    .semana-tab{padding:5px 10px;font-size:11px;border-radius:16px}
    .vol-grid{grid-template-columns:1fr 1fr}
    .grupos-grid{grid-template-columns:1fr 1fr}
    .stats-row{grid-template-columns:1fr 1fr}
    .stat-box{padding:10px 12px}
    .stat-box-val{font-size:26px}
    .card-title{font-size:15px}
    .btn{padding:8px 14px;font-size:12px}
    .btn-sm{padding:5px 10px;font-size:11px}
    .atleta-card{padding:10px 12px;gap:10px}
    .atleta-avatar{width:36px;height:36px;font-size:16px}
    .atleta-name{font-size:13px}
    .atleta-meta{font-size:11px}
    .modal{padding:14px;margin:0}
    .form-row{grid-template-columns:1fr}
    .modal-overlay{padding:12px}
    .modal-title{font-size:20px}
    .form-input,.form-select{padding:8px 10px;font-size:13px}
    .page-title{font-size:26px}
    .turno-card{border-radius:8px}
    .turno-num{font-size:18px;min-width:28px}
    .card{padding:10px}
    .turno-header{padding:8px 10px}
    .turno-num{font-size:16px;min-width:24px}
    .turno-stat-val{font-size:14px}
    .grupo-item{padding:8px 10px}
    .vol-item{padding:8px 10px}
    .vol-val{font-size:22px}
    .scroll-x{-webkit-overflow-scrolling:touch}
    .planilla-tabla td,.planilla-tabla th{padding:2px 2px !important;font-size:9px !important}
  }
`;

// ─── HELPERS ─────────────────────────────────────────────────────────────────
// Kg base del ejercicio = IRM_atleta × pct_normativo / 100
// Ej: Arranque=100kg, ejercicio pct_base=90% → base = 90kg
// Luego los kg a cada intensidad = base × intensidad% / 100
function calcKg(ej, irm_arr, irm_env) {
  if (!ej || !ej.pct_base) return null;
  const irm = ej.base === "arranque" ? irm_arr : irm_env;
  if (!irm) return null;
  return Math.round(irm * ej.pct_base / 100 * 10) / 10;
}

function calcVolumenSemana(volTotal, pct) {
  return Math.round(volTotal * pct / 100);
}

function calcRepsPorGrupo(reps, pctGrupos) {
  const res = {};
  Object.entries(pctGrupos).forEach(([g, p]) => { res[g] = Math.round(reps * p / 100); });
  return res;
}

function getEjercicioById(id) {
  try {
    const stored = JSON.parse(localStorage.getItem('liftplan_normativos') || 'null');
    if (stored) return stored.find(e => e.id === id) || null;
  } catch {}
  return EJERCICIOS.find(e => e.id === id) || null;
}

function getSembradoStats(turnos) {
  const counts = {Arranque:0,Envion:0,Tirones:0,Piernas:0,Complementarios:0};
  let total = 0;
  turnos.forEach(t => t.ejercicios.forEach(e => {
    if (e.ejercicio_id) {
      const ej = getEjercicioById(e.ejercicio_id);
      if (ej) { counts[ej.categoria]++; total++; }
    }
  }));
  const pcts = {};
  Object.entries(counts).forEach(([k,v]) => { pcts[k] = total ? Math.round(v/total*100) : 0; });
  return { counts, pcts, total };
}

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
  const mdTarget = useRef(null);
  useEffect(() => {
    const scrollY = window.scrollY;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollY);
    };
  }, []);
  return (
    <div
      className="modal-overlay"
      onMouseDown={e => { mdTarget.current = e.target; }}
      onMouseUp={e => {
        if (mdTarget.current === e.currentTarget && e.target === e.currentTarget) onClose();
        mdTarget.current = null;
      }}
    >
      <div
        className="modal"
        onMouseDown={e => e.stopPropagation()}
        onMouseUp={e => e.stopPropagation()}
      >
        <div className="flex-between mb16">
          <div className="modal-title">{title}</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Ciclo menstrual — fases y cálculo ────────────────────────────────────────
const FASES_CICLO = {
  menstruacion: { label: "Menstruación", color: "#e53935", bg: "rgba(229,57,53,.15)", Icon: Droplets },
  folicular:    { label: "Folicular",    color: "#43a047", bg: "rgba(67,160,71,.15)",  Icon: Sprout },
  ovulacion:    { label: "Ovulación",    color: "#fb8c00", bg: "rgba(251,140,0,.15)",  Icon: Zap },
  lutea:        { label: "Lútea",        color: "#8e24aa", bg: "rgba(142,36,170,.15)", Icon: CloudMoon },
};

// Dado el último ciclo y la fecha de inicio de semana, devuelve la fase
function getFaseCiclo(ciclo, fechaSemana) {
  if (!ciclo?.ultimo_inicio || !fechaSemana) return null;
  const durCiclo  = Number(ciclo.duracion_ciclo)  || 28;
  const durMens   = Number(ciclo.duracion_mens)    || 5;
  const inicio    = new Date(ciclo.ultimo_inicio);
  const semana    = new Date(fechaSemana);
  const diffDias  = Math.floor((semana - inicio) / (1000 * 60 * 60 * 24));
  // Normalizar al ciclo actual
  const diaEnCiclo = ((diffDias % durCiclo) + durCiclo) % durCiclo + 1;
  if (diaEnCiclo <= durMens)        return "menstruacion";
  if (diaEnCiclo <= durCiclo * 0.5) return "folicular";
  if (diaEnCiclo <= durCiclo * 0.5 + 2) return "ovulacion";
  return "lutea";
}

// Para una semana del meso (por número), calcular fecha aproximada
function getFechaSemana(mesoFechaInicio, semanaNum) {
  if (!mesoFechaInicio) return null;
  const d = new Date(mesoFechaInicio);
  d.setDate(d.getDate() + (semanaNum - 1) * 7);
  return d.toISOString().slice(0, 10);
}


function AtletaForm({ atleta, tipoInicial="atleta", onSave, onClose }) {
  const [form, setForm] = useState(atleta || {
    id: mkId(), nombre:"", email:"", telefono:"", fecha_nacimiento:"", notas:"", tipo:tipoInicial, genero:"m", ciclo:null
  });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  return (
    <Modal title={atleta ? "Editar Atleta" : "Nuevo Atleta"} onClose={onClose}>
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        {[["atleta","Atleta"],["asesoria","Asesoría"]].map(([v,l])=>(
          <button key={v} onClick={()=>set("tipo",v)}
            style={{flex:1,padding:"8px 0",borderRadius:8,border:"none",cursor:"pointer",
              fontFamily:"'DM Sans'",fontSize:13,fontWeight:700,transition:"all .2s",
              background: form.tipo===v ? (v==="atleta"?"var(--gold)":"var(--blue)") : "var(--surface2)",
              color: form.tipo===v ? (v==="atleta"?"#0a0c10":"#fff") : "var(--muted)"}}>
            {l}
          </button>
        ))}
      </div>
      <div className="form-group"><label className="form-label">Nombre completo</label>
        <input className="form-input" value={form.nombre} onChange={e=>set("nombre",e.target.value)} placeholder="Ej: Juan Pérez"/></div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Email</label>
          <input className="form-input" value={form.email} onChange={e=>set("email",e.target.value)} type="email" placeholder="atleta@email.com"/></div>
        <div className="form-group"><label className="form-label">Teléfono</label>
          <input className="form-input" value={form.telefono} onChange={e=>set("telefono",e.target.value)} placeholder="+54 341..."/></div>
      </div>
      <div className="form-group"><label className="form-label">Fecha de nacimiento</label>
        <input className="form-input" value={form.fecha_nacimiento} onChange={e=>set("fecha_nacimiento",e.target.value)} type="text" placeholder="DD/MM/AAAA" pattern="\d{2}/\d{2}/\d{4}"/></div>
      {/* Género */}
      <div className="form-group">
        <label className="form-label">Género</label>
        <div style={{display:"flex",gap:8}}>
          {[["m","Masculino"],["f","Femenino"]].map(([v,l])=>(
            <button key={v} onClick={()=>set("genero",v)}
              style={{flex:1,padding:"7px 0",borderRadius:8,border:"none",cursor:"pointer",
                fontFamily:"'DM Sans'",fontSize:13,fontWeight:700,transition:"all .2s",
                background:form.genero===v?"var(--gold)":"var(--surface2)",
                color:form.genero===v?"#0a0c10":"var(--muted)"}}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Ciclo menstrual — solo si género femenino */}
      {form.genero === "f" && (
        <div style={{background:"var(--surface2)",border:"1px solid var(--border)",
          borderRadius:10,padding:"12px 14px",marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:700,color:"var(--text)",marginBottom:10,
            display:"flex",alignItems:"center",gap:6}}>
            🌙 Ciclo menstrual
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div className="form-group" style={{marginBottom:0}}>
              <label className="form-label">Último inicio</label>
              <input className="form-input" type="date"
                value={form.ciclo?.ultimo_inicio||""}
                onChange={e=>set("ciclo",{...form.ciclo,ultimo_inicio:e.target.value})}/>
            </div>
            <div className="form-group" style={{marginBottom:0}}>
              <label className="form-label">Duración ciclo (días)</label>
              <input className="form-input" type="number" min={21} max={40}
                value={form.ciclo?.duracion_ciclo||28}
                onChange={e=>set("ciclo",{...form.ciclo,duracion_ciclo:Number(e.target.value)})}/>
            </div>
            <div className="form-group" style={{marginBottom:0}}>
              <label className="form-label">Duración menstruación (días)</label>
              <input className="form-input" type="number" min={2} max={10}
                value={form.ciclo?.duracion_mens||5}
                onChange={e=>set("ciclo",{...form.ciclo,duracion_mens:Number(e.target.value)})}/>
            </div>
          </div>
        </div>
      )}

      <div className="form-group"><label className="form-label">Notas</label>
        <textarea className="form-input" value={form.notas} onChange={e=>set("notas",e.target.value)}
          placeholder="Observaciones, lesiones, objetivos..." rows={3} style={{resize:"vertical"}}/></div>
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-gold" onClick={()=>{if(form.nombre)onSave(form)}}>Guardar</button>
      </div>
    </Modal>
  );
}

function MesocicloForm({ atleta, meso, onSave, onClose }) {
  const [form, setForm] = useState(meso || {
    id: mkId(), atleta_id: atleta.id, fecha_inicio: new Date().toISOString().slice(0,10),
    nombre: "", descripcion: "",
    volumen_total: 1200, modo: "Preparatorio",
    irm_arranque: "", irm_envion: "",
    semanas: mkSemanas()
  });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const totalPct = form.semanas.reduce((s,sem)=>s+Number(sem.pct_volumen),0);
  const [showPicker, setShowPicker] = useState(false);
  const [pendingOverrides, setPendingOverrides] = useState(null);
  const [pendingGrupos, setPendingGrupos] = useState(null);

  const plantillas = (() => {
    try { return JSON.parse(localStorage.getItem('liftplan_plantillas')||'[]'); }
    catch { return []; }
  })();

  const [pendingPlantilla, setPendingPlantilla] = useState(null);
  const [importOpts, setImportOpts] = useState({
    irm: true, volumen: true, reps: true, celdas: true, grupos: true
  });

  const confirmApply = (plt, opts) => {
    if (plt.tipo==="meso" && plt.semanas) {
      const newSemanas = plt.semanas.map((s,i)=>({
        ...mkSemanas()[Math.min(i, mkSemanas().length-1)],
        id: mkId(),
        numero: s.numero,
        pct_volumen: opts.volumen ? s.pct_volumen : mkSemanas()[Math.min(i, mkSemanas().length-1)].pct_volumen,
        reps_ajustadas: opts.reps ? s.reps_ajustadas : undefined,
        turnos: s.turnos.map(t=>({
          id: mkId(), dia:t.dia, momento:t.momento,
          ejercicios: t.ejercicios.map(e=>({
            id:mkId(), ejercicio_id:e.ejercicio_id,
            intensidad:e.intensidad, tabla:e.tabla,
            reps_asignadas: opts.reps ? (e.reps_asignadas||0) : 0
          }))
        }))
      }));
      setForm(f=>({
        ...f,
        nombre: f.nombre || plt.nombre,
        modo: plt.modo || f.modo,
        ...(opts.volumen ? {volumen_total: plt.volumen_total} : {}),
        ...(opts.irm ? {irm_arranque: plt.irm_arranque||"", irm_envion: plt.irm_envion||""} : {}),
        semanas: newSemanas
      }));
      // Guardar overrides en un ref para aplicar al mesociclo nuevo tras creación
      if (opts.celdas && plt.overrides) setPendingOverrides({opts, overrides: plt.overrides});
      if (opts.grupos && plt.overrides) setPendingGrupos({opts, overrides: plt.overrides});
    }
    setPendingPlantilla(null);
  };

  return (
    <Modal title={meso ? "Editar Mesociclo" : "Nuevo Mesociclo"} onClose={onClose}>
      {!meso && plantillas.filter(p=>p.tipo==="meso").length>0 && (
        <div style={{marginBottom:16,padding:"10px 14px",
          background:"var(--surface2)",borderRadius:8,
          display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
          <div style={{fontSize:12,color:"var(--muted)"}}>
            ¿Partir desde una plantilla?
          </div>
          <button className="btn btn-ghost btn-sm" onClick={()=>setShowPicker(true)}>
            <Library size={13}/> Importar plantilla
          </button>
        </div>
      )}
      {showPicker && (
        <PlantillaPicker plantillas={plantillas} tipo="meso"
          onSelect={(plt, opts)=>confirmApply(plt, opts||{irm:true,volumen:true,reps:true,celdas:true,grupos:true})} onClose={()=>setShowPicker(false)}/>
      )}
      <div className="form-group">
        <label className="form-label">Nombre del mesociclo</label>
        <input className="form-input" value={form.nombre}
          onChange={e=>set("nombre",e.target.value)}
          placeholder="Ej: Pretemporada 2025, Base Fuerza, etc."/>
      </div>
      <div className="form-group">
        <label className="form-label">Descripción / Objetivos</label>
        <textarea className="form-input" value={form.descripcion}
          onChange={e=>set("descripcion",e.target.value)}
          placeholder="Objetivos del ciclo, observaciones..."
          rows={2} style={{resize:"vertical"}}/>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Fecha inicio</label>
          <input className="form-input" type="text" value={form.fecha_inicio} onChange={e=>set("fecha_inicio",e.target.value)} placeholder="AAAA-MM-DD"/></div>
        <div className="form-group"><label className="form-label">Modo</label>
          <select className="form-select" value={form.modo} onChange={e=>set("modo",e.target.value)}>
            <option>Preparatorio</option><option>Competitivo</option>
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">IRM Arranque (kg)</label>
          <input className="form-input" type="number" min={65} max={95}
            list="irm-values" value={form.irm_arranque}
            onChange={e=>set("irm_arranque",Number(e.target.value))} placeholder="ej: 80"/>
        </div>
        <div className="form-group">
          <label className="form-label">IRM Envión (kg)</label>
          <input className="form-input" type="number" min={65} max={95}
            list="irm-values" value={form.irm_envion}
            onChange={e=>set("irm_envion",Number(e.target.value))} placeholder="ej: 80"/>
        </div>
      </div>
      <datalist id="irm-values">{IRM_VALUES.map(v=><option key={v} value={v}/>)}</datalist>
      <div className="form-group"><label className="form-label">Volumen total de repeticiones</label>
        <input className="form-input" type="number" value={form.volumen_total} onChange={e=>set("volumen_total",Number(e.target.value))}/></div>
      <div className="divider"/>
      <div className="form-label mb8">Distribución semanal</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10}}>
        {form.semanas.map((sem,i)=>(
          <div key={sem.id} style={{background:"var(--surface2)",borderRadius:8,padding:12,border:"1px solid var(--border)"}}>
            <div className="text-sm text-muted mb8">Semana {sem.numero}</div>
            <div className="flex gap8" style={{alignItems:"center"}}>
              <input className="form-input" type="number" min={0} max={100} value={sem.pct_volumen}
                onChange={e=>{const s=[...form.semanas];s[i]={...s[i],pct_volumen:Number(e.target.value)};set("semanas",s)}}
                style={{width:70}}/>
              <span className="text-muted">%</span>
              <span className="text-gold" style={{fontFamily:"'Bebas Neue'",fontSize:18}}>
                {calcVolumenSemana(form.volumen_total,sem.pct_volumen)}
              </span>
              <span className="text-sm text-muted">reps</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt12 text-sm" style={{color: totalPct===100?"var(--green)":"var(--red)"}}>
        Total: {totalPct}% {totalPct!==100&&"(debe sumar 100%)"}
      </div>
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-gold" onClick={()=>onSave({...form,semanas:form.semanas.map(s=>({...s,reps_calculadas:calcVolumenSemana(form.volumen_total,s.pct_volumen),reps_ajustadas:calcVolumenSemana(form.volumen_total,s.pct_volumen)}))})}>
          Crear Mesociclo
        </button>
      </div>
    </Modal>
  );
}

// ── Buscador de ejercicios con input de texto ────────────────────────────────
function EjBuscador({ value, onChange }) {
  const ejData = value ? getEjercicioById(Number(value)) : null;
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  const normativos = (() => {
    try { return JSON.parse(localStorage.getItem('liftplan_normativos') || 'null') || EJERCICIOS; }
    catch { return EJERCICIOS; }
  })();

  const results = (() => {
    const q = query.trim().toLowerCase();
    if (!q) return normativos;
    const byId   = normativos.filter(e => String(e.id).startsWith(q));
    const byName = normativos.filter(e => !String(e.id).startsWith(q)
      && e.nombre.toLowerCase().includes(q));
    return [...byId, ...byName];
  })();

  const select = (ej) => { onChange(ej ? ej.id : null); setQuery(""); setOpen(false); };

  // Block body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
      setTimeout(() => inputRef.current?.focus(), 80);
    } else {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, [open]);

  const listRef = useRef(null);

  const GRUPOS_EJ = ["Arranque","Envion","Tirones","Piernas","Complementarios"];

  const jumpToGroup = (g) => {
    const el = listRef.current?.querySelector(`[data-firstgroup="${g}"]`);
    if (el) el.scrollIntoView({ block:"start", behavior:"smooth" });
  };

  const displayName = ejData ? `${ejData.id}. ${ejData.nombre}` : "";

  return (
    <>
      <div className="ej-select" onClick={()=>setOpen(true)}
        style={{cursor:"pointer", userSelect:"none", overflow:"hidden",
          textOverflow:"ellipsis", whiteSpace:"nowrap",
          color: ejData ? "var(--text)" : "var(--muted)", flex:1, minWidth:0}}>
        {displayName || "— ejercicio —"}
      </div>

      {open && (
        <div style={{
          position:"fixed", inset:0, zIndex:2000,
          background:"rgba(0,0,0,.6)", display:"flex",
          alignItems:"center", justifyContent:"center", padding:"20px"
        }} onClick={e=>{ if(e.target===e.currentTarget) setOpen(false); }}>
          <div style={{
            background:"var(--surface)", borderRadius:14,
            width:"100%", maxWidth:520, maxHeight:"75vh",
            display:"flex", flexDirection:"column", overflow:"hidden",
            boxShadow:"0 8px 40px rgba(0,0,0,.6)"
          }}>
            {/* Header */}
            <div style={{padding:"12px 16px 8px", borderBottom:"1px solid var(--border)",
              display:"flex", alignItems:"center", gap:10}}>
              <input ref={inputRef}
                value={query} onChange={e=>setQuery(e.target.value)}
                placeholder="Número o nombre del ejercicio..."
                style={{flex:1, background:"var(--surface2)",
                  border:"1px solid var(--border)", borderRadius:8,
                  color:"var(--text)", fontSize:14, padding:"8px 12px",
                  outline:"none", fontFamily:"'DM Sans'"}}
              />
              <button onClick={()=>setOpen(false)}
                style={{background:"none",border:"none",color:"var(--muted)",
                  cursor:"pointer",fontSize:22,lineHeight:1,padding:"0 4px"}}>×</button>
            </div>
            {/* Salto rápido por grupo */}
            <div style={{display:"flex",gap:4,padding:"6px 16px",borderBottom:"1px solid var(--border)",flexWrap:"wrap"}}>
              {GRUPOS_EJ.map(g => (
                <button key={g} onClick={()=>jumpToGroup(g)}
                  style={{padding:"2px 9px",borderRadius:12,border:`1px solid ${CAT_COLOR[g]||"var(--border)"}`,
                    background:`${CAT_COLOR[g]||"var(--muted)"}18`,color:CAT_COLOR[g]||"var(--muted)",
                    fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Bebas Neue'",letterSpacing:".04em"}}>
                  {g.slice(0,3).toUpperCase()}
                </button>
              ))}
            </div>
            {/* Lista */}
            <div ref={listRef} style={{overflowY:"auto", flex:1}}>
              {ejData && (
                <div onClick={()=>select(null)}
                  style={{padding:"12px 16px", display:"flex", alignItems:"center", gap:10,
                    borderBottom:"1px solid var(--border)", cursor:"pointer",
                    color:"var(--red)", fontSize:13}}>
                  ✕ Quitar ejercicio
                </div>
              )}
              {(() => {
                const seen = new Set();
                return results.map(e => {
                  const col = CAT_COLOR[e.categoria] || "var(--muted)";
                  const sel = e.id === Number(value);
                  const isFirst = !seen.has(e.categoria) && seen.add(e.categoria);
                  return (
                    <div key={e.id} onClick={()=>select(e)}
                      {...(isFirst ? {"data-firstgroup": e.categoria} : {})}
                      style={{padding:"10px 16px", display:"flex", alignItems:"center", gap:10,
                        borderBottom:"1px solid var(--border)", cursor:"pointer",
                        background: sel ? `${col}18` : "transparent"}}>
                      <span style={{fontFamily:"'Bebas Neue'",fontSize:15,
                        color:col, minWidth:28, textAlign:"right"}}>{e.id}</span>
                      <span style={{flex:1, fontSize:13, color:"var(--text)"}}>{e.nombre}</span>
                      <span style={{fontSize:10, fontWeight:700, padding:"2px 7px",
                        borderRadius:10, background:`${col}20`, color:col, flexShrink:0}}>
                        {e.categoria.slice(0,3)}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ComplementarioRow({ comp, idx, irm_arr, irm_env, onChange, onDelete }) {
  const ejData = comp.ejercicio_id ? getEjercicioById(comp.ejercicio_id) : null;
  const kg = ejData ? calcKg(ejData, irm_arr, irm_env) : null;
  const kgIntens = kg ? Math.round(kg * comp.intensidad / 100) : null;

  return (
    <div className="comp-row">
      <div className="ej-num">{idx+1}</div>
      <EjBuscador value={comp.ejercicio_id} onChange={id=>onChange({...comp,ejercicio_id:id})}/>
      <input className="ej-input" type="number" min={40} max={110} value={comp.intensidad}
        onChange={e=>onChange({...comp,intensidad:Number(e.target.value)})} title="Intensidad %"/>
      <select className="ej-input" value={comp.tabla} onChange={e=>onChange({...comp,tabla:Number(e.target.value)})}>
        <option value={1}>T1</option><option value={2}>T2</option><option value={3}>T3</option>
      </select>
      <input className="ej-input" type="number" min={0} value={comp.reps_asignadas}
        onChange={e=>onChange({...comp,reps_asignadas:Number(e.target.value)})} title="Reps asignadas"/>
      <div className="ej-kg">{kgIntens ? `${kgIntens}kg` : ejData ? <span className="text-muted">—</span> : ""}</div>
      <input className="ej-input" type="text" value={comp.aclaracion||""} placeholder="Aclaración"
        onChange={e=>onChange({...comp,aclaracion:e.target.value})} title="Aclaración"/>
      <button onClick={onDelete} style={{background:"none",border:"none",cursor:"pointer",color:"var(--red)",fontSize:14,padding:"0 4px",lineHeight:1,justifySelf:"center"}}>✕</button>
      {ejData && <span className="ej-cat" style={{background:`${CAT_COLOR[ejData.categoria]}20`,color:CAT_COLOR[ejData.categoria]}}>{ejData.categoria.slice(0,3)}</span>}
    </div>
  );
}

function EjercicioRow({ ej, idx, irm_arr, irm_env, onChange }) {
  const ejData = ej.ejercicio_id ? getEjercicioById(ej.ejercicio_id) : null;
  const kg = ejData ? calcKg(ejData, irm_arr, irm_env) : null;
  const kgIntens = kg ? Math.round(kg * ej.intensidad / 100) : null;

  return (
    <div className="ej-row">
      <div className="ej-num">{idx+1}</div>
      <EjBuscador value={ej.ejercicio_id} onChange={id=>onChange({...ej,ejercicio_id:id})}/>
      <input className="ej-input" type="number" min={40} max={110} value={ej.intensidad}
        onChange={e=>onChange({...ej,intensidad:Number(e.target.value)})} title="Intensidad %"/>
      <select className="ej-input" value={ej.tabla} onChange={e=>onChange({...ej,tabla:Number(e.target.value)})}>
        <option value={1}>Tabla 1</option><option value={2}>Tabla 2</option><option value={3}>Tabla 3</option>
      </select>
      <input className="ej-input" type="number" min={0} value={ej.reps_asignadas}
        onChange={e=>onChange({...ej,reps_asignadas:Number(e.target.value)})} title="Reps asignadas"/>
      <div className="ej-kg">{kgIntens ? `${kgIntens}kg` : ejData ? <span className="text-muted">—</span> : ""}</div>
      {ejData && <span className="ej-cat" style={{background:`${CAT_COLOR[ejData.categoria]}20`,color:CAT_COLOR[ejData.categoria]}}>{ejData.categoria.slice(0,3)}</span>}
    </div>
  );
}

function TurnoCard({ turno, semana_idx, irm_arr, irm_env, onChange, clipboardTurno, setClipboardTurno, onPaste }) {
  const [open, setOpen] = useState(semana_idx===0 && turno.numero<=2);
  const stats = getSembradoStats([turno]);
  const totalReps = turno.ejercicios.reduce((s,e)=>s+Number(e.reps_asignadas),0);

  // ── Reordenar ejercicios con flechas ──
  const normalizeEjs = (arr) => {
    const filled = arr.filter(e => e?.ejercicio_id);
    const empty  = arr.filter(e => !e?.ejercicio_id);
    return [...filled, ...empty];
  };

  const moveEjTurno = (i, dir) => {
    const ejs = turno.ejercicios;
    if (!ejs[i]?.ejercicio_id) return;
    const j = i + dir;
    if (j < 0 || j >= ejs.length) return;
    if (!ejs[j]?.ejercicio_id) return;
    const arr = [...ejs];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    onChange({...turno, ejercicios: arr});
  };

  const updateEjTurno = (ejIdx, newEj) => {
    const ejs = [...turno.ejercicios];
    ejs[ejIdx] = newEj;
    onChange({...turno, ejercicios: normalizeEjs(ejs)});
  };

  const updateEj = (ejIdx, newEj) => {
    const ejs = [...turno.ejercicios];
    ejs[ejIdx] = newEj;
    onChange({...turno, ejercicios: ejs});
  };

  // ── Complementarios antes/después ──
  const normalizeComplementarios = (arr) => {
    const filled = arr.filter(c => c?.ejercicio_id);
    const empty  = arr.filter(c => !c?.ejercicio_id);
    return [...filled, ...empty];
  };

  const addComplementario = (position) => {
    const newComp = {id:mkId(),ejercicio_id:null,intensidad:75,tabla:1,reps_asignadas:0,aclaracion:""};
    const arr = position === 'before'
      ? [...turno.complementarios_before, newComp]
      : [...turno.complementarios_after, newComp];
    const key = position === 'before' ? 'complementarios_before' : 'complementarios_after';
    onChange({...turno, [key]: arr});
  };

  const updateComplementario = (position, idx, newComp) => {
    const arr = position === 'before' ? [...turno.complementarios_before] : [...turno.complementarios_after];
    arr[idx] = newComp;
    const key = position === 'before' ? 'complementarios_before' : 'complementarios_after';
    onChange({...turno, [key]: normalizeComplementarios(arr)});
  };

  const deleteComplementario = (position, idx) => {
    const arr = position === 'before' ? [...turno.complementarios_before] : [...turno.complementarios_after];
    arr.splice(idx, 1);
    const key = position === 'before' ? 'complementarios_before' : 'complementarios_after';
    onChange({...turno, [key]: arr});
  };

  return (
    <div className="turno-card">
      <div className="turno-header" onClick={()=>setOpen(o=>!o)}>
        <div className="turno-num">T{turno.numero}</div>
        <div className="turno-dia">
          <select value={turno.dia} onClick={e=>e.stopPropagation()}
            onChange={e=>{e.stopPropagation();onChange({...turno,dia:e.target.value})}}>
            <option value="">Día</option>
            {DIAS.map(d=><option key={d}>{d}</option>)}
          </select>
          <select value={turno.momento} onClick={e=>e.stopPropagation()}
            onChange={e=>{e.stopPropagation();onChange({...turno,momento:e.target.value})}}>
            <option value="">Momento</option>
            {MOMENTOS.map(m=><option key={m}>{m}</option>)}
          </select>
          {turno.dia && <span className="badge badge-blue">{turno.dia} {turno.momento}</span>}
        </div>
        <div className="turno-stats">
          {Object.entries(stats.pcts).filter(([,v])=>v>0).map(([k,v])=>(
            <div key={k} className="turno-stat">
              <div className="turno-stat-val" style={{color:CAT_COLOR[k]}}>{v}%</div>
              <div className="turno-stat-lbl">{k.slice(0,3)}</div>
            </div>
          ))}
          {totalReps > 0 && <div className="turno-stat"><div className="turno-stat-val text-gold">{totalReps}</div><div className="turno-stat-lbl">reps</div></div>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          {setClipboardTurno && (
            <button
              onClick={e=>{e.stopPropagation();setClipboardTurno(turno);}}
              title="Copiar turno"
              style={{background:"none",border:"none",cursor:"pointer",
                color:"var(--muted)",padding:"3px 5px",borderRadius:5,lineHeight:1,fontSize:11}}
              onMouseEnter={e=>e.currentTarget.style.color="var(--gold)"}
              onMouseLeave={e=>e.currentTarget.style.color="var(--muted)"}>
              <Copy size={12}/>
            </button>
          )}
          {onPaste && clipboardTurno && clipboardTurno.id !== turno.id && (
            <button
              onClick={e=>{e.stopPropagation();onPaste(clipboardTurno);}}
              title={`Pegar ejercicios de T${clipboardTurno.numero||"?"}`}
              style={{background:"rgba(232,197,71,.15)",border:"1px solid rgba(232,197,71,.3)",
                cursor:"pointer",color:"var(--gold)",padding:"3px 6px",borderRadius:5,
                lineHeight:1,fontSize:10,fontWeight:600,fontFamily:"'DM Sans'"}}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(232,197,71,.3)"}
              onMouseLeave={e=>e.currentTarget.style.background="rgba(232,197,71,.15)"}>
              <Clipboard size={12}/>
            </button>
          )}
          <div className={`turno-chevron${open?" open":""}`}>▾</div>
        </div>
      </div>
      {open && (
        <div className="turno-body">
          <div style={{display:"grid",gridTemplateColumns:"28px 1fr 80px 70px 70px 80px 150px 20px auto",gap:8,padding:"4px 0 8px",borderBottom:"1px solid var(--border)",marginBottom:4}}>
            <div/><div className="text-sm text-muted">Ejercicio</div>
            <div className="text-sm text-muted text-center">Int %</div>
            <div className="text-sm text-muted text-center">Tabla</div>
            <div className="text-sm text-muted text-center">Reps</div>
            <div className="text-sm text-muted text-center">Kg</div>
            <div className="text-sm text-muted text-center">Aclaración</div>
            <div/>
            <div/>
          </div>

          {/* COMPLEMENTARIOS ANTES */}
          {(turno.complementarios_before?.length > 0 || true) && (
            <div style={{marginBottom:12}}>
              <div className="text-sm text-muted" style={{fontWeight:600,marginBottom:6,color:"var(--blue)"}}>ANTES DEL TURNO</div>
              {turno.complementarios_before?.filter(Boolean).map((comp,i)=>(
                <ComplementarioRow key={comp.id} comp={comp} idx={i} irm_arr={irm_arr} irm_env={irm_env}
                  onChange={newComp=>updateComplementario('before',i,newComp)}
                  onDelete={()=>deleteComplementario('before',i)}/>
              ))}
              <button onClick={()=>addComplementario('before')}
                style={{background:"none",border:"none",cursor:"pointer",color:"var(--blue)",fontSize:12,padding:"4px 0",marginTop:4,fontWeight:500}}>
                + Agregar complementario
              </button>
            </div>
          )}

          {/* EJERCICIOS PRINCIPALES */}
          <div style={{marginBottom:12}}>
            <div className="text-sm text-muted" style={{fontWeight:600,marginBottom:6,color:"var(--gold)"}}>TRABAJO PRINCIPAL</div>
            {turno.ejercicios.filter(Boolean).map((ej,i)=>{
              const canUp   = i>0 && !!ej.ejercicio_id && !!turno.ejercicios[i-1]?.ejercicio_id;
              const canDown = i<turno.ejercicios.length-1 && !!ej.ejercicio_id && !!turno.ejercicios[i+1]?.ejercicio_id;
              return (
                <div key={ej.id} style={{display:"flex", alignItems:"center", gap:4}}>
                  <div style={{display:"flex", flexDirection:"column", gap:1, flexShrink:0}}>
                    <button onClick={()=>moveEjTurno(i,-1)} disabled={!canUp}
                      style={{background:"none",border:"none",cursor:canUp?"pointer":"default",
                        color:canUp?"var(--gold)":"var(--surface3)",fontSize:10,lineHeight:1,padding:"1px 3px"}}>▲</button>
                    <button onClick={()=>moveEjTurno(i,1)} disabled={!canDown}
                      style={{background:"none",border:"none",cursor:canDown?"pointer":"default",
                        color:canDown?"var(--gold)":"var(--surface3)",fontSize:10,lineHeight:1,padding:"1px 3px"}}>▼</button>
                  </div>
                  <EjercicioRow ej={ej} idx={i} irm_arr={irm_arr} irm_env={irm_env}
                    onChange={newEj=>updateEjTurno(i,newEj)}/>
                </div>
              );
            })}
          </div>

          {/* COMPLEMENTARIOS DESPUÉS */}
          {(turno.complementarios_after?.length > 0 || true) && (
            <div>
              <div className="text-sm text-muted" style={{fontWeight:600,marginBottom:6,color:"var(--green)"}}>DESPUÉS DEL TURNO</div>
              {turno.complementarios_after?.filter(Boolean).map((comp,i)=>(
                <ComplementarioRow key={comp.id} comp={comp} idx={i} irm_arr={irm_arr} irm_env={irm_env}
                  onChange={newComp=>updateComplementario('after',i,newComp)}
                  onDelete={()=>deleteComplementario('after',i)}/>
              ))}
              <button onClick={()=>addComplementario('after')}
                style={{background:"none",border:"none",cursor:"pointer",color:"var(--green)",fontSize:12,padding:"4px 0",marginTop:4,fontWeight:500}}>
                + Agregar complementario
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── DISTRIBUCIÓN POR TURNOS ─────────────────────────────────────────────────
// Replica C94:AB106: por semana, por grupo → qué % de ese grupo va en cada turno

// ─── PLANILLA DE TURNO ───────────────────────────────────────────────────────
// Replica A112:AM134 — por semana y turno: ejercicios con series/reps/kg
// por cada columna de intensidad (50,60,70,75,80,85,90,95)

// ─── CÁLCULO SERIES / REPS / KG ──────────────────────────────────────────────
// Lógica replicada del Excel (MESO 1):
//
// 1) KG por columna de intensidad:
//    kg = Normativos[ej].Kgs × intensidad% / 100
//    donde Normativos[ej].Kgs = IRM_atleta × pct_base / 100
//    Ej: Arranque=100kg, pct_base=90 → base=90kg, al 75% → 67.5kg → 68kg
//
// 2) Reps intermedias por columna de intensidad (fórmula IM del Excel):
//    repsInter = ROUND( tabla[ej.intensidad][intens%] / 100 × reps_asignadas , 0 )
//    donde tabla = T1/T2/T3 según ej.tabla, indexada por ej.intensidad (IRM del sembrado)
//
// 3) Series y reps/serie (fórmula G/H del Excel):
//    - Si repsInter = 0  → vacío
//    - Si repsInter > 8  → series=1, reps_serie=repsInter
//    - Si no → XLOOKUP en lookup_tirones (id 49-68) o lookup_general
//              usando (intens%, modo Comp/Prep, repsInter)

function calcSeriesRepsKg(tablas, ej, ejData, irm_arr, irm_env, modo, reps_asignadas) {
  if (!ejData || !ej.ejercicio_id) return null;

  const id      = Number(ej.ejercicio_id);
  const isTiron = id >= 49 && id <= 68;
  const modoKey = modo === "Competitivo" ? "Comp" : "Prep";

  // Kg base del ejercicio = IRM_atleta × pct_base / 100
  // Este valor representa el 100% de la carga — los % de intensidad se aplican sobre él
  const irmAtleta = ejData.base === "arranque" ? Number(irm_arr) : Number(irm_env);
  const kgBase    = (ejData.pct_base && irmAtleta) ? irmAtleta * ejData.pct_base / 100 : null;

  // Tabla de distribución de intensidades (T1, T2 o T3)
  // El índice de fila es la intensidad del ejercicio en el sembrado (ej.intensidad: 65-95)
  const tablaKey  = ej.tabla === 2 ? "tabla2" : ej.tabla === 3 ? "tabla3" : "tabla1";
  const tablaData = tablas[tablaKey];
  const tablaRow  = tablaData?.find(r => r.irm === Number(ej.intensidad));

  return INTENSIDADES.map(intens => {
    // KG = kgBase × intens% / 100  (redondeado a entero)
    const kg = kgBase ? Math.round(kgBase * intens / 100 * 2) / 2 : null;

    // Reps intermedias = pct_tabla × reps_asignadas / 100  (redondeado)
    const tablaVal  = tablaRow ? (tablaRow[String(intens)] || 0) : 0;
    const repsInter = Math.round(tablaVal * (reps_asignadas || 0) / 100);

    if (repsInter === 0) return { intens, series: null, reps_serie: null, kg };

    // Series / Reps por serie
    let series, reps_serie;
    if (repsInter > 8) {
      series     = 1;
      reps_serie = repsInter;
    } else {
      const lookup = isTiron ? tablas.lookup_tirones : tablas.lookup_general;
      const row = lookup?.find(r =>
        r.intens === intens &&
        r.modo   === modoKey &&
        r.reps   === repsInter
      );
      series     = row?.series     ?? null;
      reps_serie = row?.reps_serie ?? null;
    }

    return { intens, series, reps_serie, kg };
  });
}

// Kg de un ejercicio a una intensidad dada (para mostrar en el sembrado)
// kg = IRM_atleta × pct_base / 100 × intensidad / 100
function calcKgEj(ejercicio_id, intensidad, irm_arr, irm_env, tablas_normativos) {
  const ej = (tablas_normativos || EJERCICIOS).find(e => e.id === Number(ejercicio_id));
  if (!ej || !ej.pct_base) return null;
  const irm = ej.base === "arranque" ? Number(irm_arr) : Number(irm_env);
  if (!irm) return null;
  return Math.round(irm * ej.pct_base / 100 * intensidad / 100 * 2) / 2;
}

function PlanillaTurno({ semanas, irm_arr, irm_env, meso, semPctOverrides, semPctManual, turnoPctOverrides, turnoPctManual, onRequestReset, onBeforeChange, repsEdit, setRepsEdit: setRepsEditProp, manualEdit, setManualEdit: setManualEditProp, cellEdit, setCellEdit: setCellEditProp, cellManual, setCellManual: setCellManualProp, nameEdit, setNameEdit: setNameEditProp, noteEdit, setNoteEdit: setNoteEditProp }) {
  const [semActiva,   setSemActiva]   = useState(0);
  const [turnoActivo, setTurnoActivo] = useState(0);
  const [tipSem,      setTipSem]      = useState(null);
  const [tipTurno,    setTipTurno]    = useState(null);

  // Clave única por mesociclo para persistencia
  const _k = (type) => `liftplan_pt_${meso.id}_${type}`;

  // Estados elevados — recibidos como props desde PageAtleta/PagePlantilla
  // para que el historial pueda restaurarlos directamente
  const setRepsEditRaw   = setRepsEditProp;
  const setManualEditRaw = setManualEditProp;
  const setCellEditRaw   = setCellEditProp;
  const setCellManualRaw = setCellManualProp;
  const setNameEditRaw   = setNameEditProp;

  const _lastPushTime = useRef(0);
  // Debounced — para onFocus (evita push múltiple si el mismo campo pierde y recupera foco rápido)
  const _beforeChange = () => {
    try {
      if (onBeforeChange) {
        const now = Date.now();
        if (now - _lastPushTime.current > 300) {
          _lastPushTime.current = now;
          onBeforeChange();
        }
      }
    } catch {}
  };
  // Forzado — para doble click (siempre pushea, es una acción distinta)
  const _beforeChangeForced = () => {
    try {
      if (onBeforeChange) {
        _lastPushTime.current = 0; // reset debounce
        onBeforeChange(true); // forced=true
      }
    } catch {}
  };
  // Setters que persisten en localStorage
  const setRepsEdit = (val) => {
    setRepsEditRaw(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      try { localStorage.setItem(_k('repsEdit'), JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const setManualEdit = (val) => {
    setManualEditRaw(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      try { localStorage.setItem(_k('manualEdit'), JSON.stringify([...next])); } catch {}
      return next;
    });
  };
  const setCellEdit = (val) => {
    setCellEditRaw(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      try { localStorage.setItem(_k('cellEdit'), JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const setCellManual = (val) => {
    setCellManualRaw(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      try { localStorage.setItem(_k('cellManual'), JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  // nameEdit: "sem-turno-ejId" → nombre personalizado (solo en esta planilla)
  const setNameEdit = (val) => {
    setNameEditRaw(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      try { localStorage.setItem(_k('nameEdit'), JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const [nameEditing, setNameEditing] = useState(null);

  // noteEdit: "sem-turno-ejId-intens" → aclaración de combinado — elevado a prop
  const setNoteEditRaw = setNoteEditProp;
  const setNoteEdit = (val) => setNoteEditRaw(prev => {
    const next = typeof val === 'function' ? val(prev) : val;
    try { localStorage.setItem(_k('noteEdit'), JSON.stringify(next)); } catch {}
    return next;
  });

  // Helper: get effective % of a group in a semana (respects ResumenGrupos override)
  const getSemPct = (g, semIdx) => {
    const k = `${g}-${semIdx}`;
    if (semPctManual?.has(k)) return Number(semPctOverrides?.[k]) || 0;
    // fallback: calculated from sembrado
    const { porGrupo, totalSem } = calcSembradoSemana(semanas[semIdx]);
    return totalSem > 0 ? porGrupo[g].total / totalSem * 100 : 0;
  };

  // Helper: get effective % of a group in a turno (respects DistribucionTurnos override)
  const getTurnoPct = (g, semIdx, tIdx) => {
    const k = `${g}-${semIdx}-${tIdx}`;
    if (turnoPctManual?.has(k)) return Number(turnoPctOverrides?.[k]) || 0;
    // fallback: calculated from sembrado
    const { porGrupo } = calcSembradoSemana(semanas[semIdx]);
    const total = porGrupo[g].total;
    return total > 0 ? porGrupo[g].porTurno[tIdx] / total * 100 : 0;
  };

  // Calcular tentativa usando los % efectivos (con overrides)
  const calcTentativa = (semIdx, tIdx) => {
    const s = semanas[semIdx];
    const t = s?.turnos[tIdx];
    if (!s || !t) return {};

    const reps_sem = meso.volumen_total * (s.pct_volumen / 100);
    const result = {};

    GRUPOS_KEYS.forEach(g => {
      const pctGSem   = getSemPct(g, semIdx) / 100;
      const pctGTurno = getTurnoPct(g, semIdx, tIdx) / 100;
      if (pctGSem === 0 || pctGTurno === 0) return;

      const repsBloque = Math.round(reps_sem * pctGSem * pctGTurno);

      const ejsG = t.ejercicios.filter(e => e.ejercicio_id && getGrupo(e.ejercicio_id) === g);
      if (ejsG.length === 0) return;

      const editados = ejsG.filter(e => manualEdit.has(`${semIdx}-${tIdx}-${e.id}`));
      const libres   = ejsG.filter(e => !manualEdit.has(`${semIdx}-${tIdx}-${e.id}`));

      const repsReservadas = editados.reduce((s, e) => {
        const v = repsEdit[`${semIdx}-${tIdx}-${e.id}`];
        return s + (v !== undefined ? Number(v) : 0);
      }, 0);

      const repsLibres = Math.max(0, repsBloque - repsReservadas);
      if (libres.length === 0) return;

      const base  = Math.floor(repsLibres / libres.length);
      const extra = repsLibres - base * libres.length;
      libres.forEach((e, i) => {
        result[`${semIdx}-${tIdx}-${e.id}`] = base + (i < extra ? 1 : 0);
      });
    });
    return result;
  };

  // Tentativa calculada inline para el turno activo actual
  const tentativaActual = calcTentativa(semActiva, turnoActivo);

  // Al cambiar semana o turno, pre-cargar tentativa si la casilla está vacía
  const setTurnoConTentativa = (semIdx, tIdx) => {
    const tentativa = calcTentativa(semIdx, tIdx);
    setRepsEdit(prev => {
      const next = {...prev};
      Object.entries(tentativa).forEach(([k, v]) => {
        if (next[k] === undefined) next[k] = v;
      });
      return next;
    });
  };
  const turnoRef        = useRef(null);
  const turnoContentRef = useRef(null);

  const tablas = (() => {
    try { return JSON.parse(localStorage.getItem('liftplan_tablas') || 'null') || TABLA_DEFAULT; }
    catch { return TABLA_DEFAULT; }
  })();
  const normativos = (() => {
    try { return JSON.parse(localStorage.getItem('liftplan_normativos') || 'null') || EJERCICIOS; }
    catch { return EJERCICIOS; }
  })();

  const sem   = semanas[semActiva];
  const turno = sem?.turnos[turnoActivo];
  const ejs   = turno?.ejercicios.filter(e => e.ejercicio_id) || [];
  const modo  = meso.modo;

  // Reps disponibles por grupo en este turno (usa % efectivos con overrides)
  const calcRepsBloque = () => {
    if (!sem || !turno) return {};
    const reps_sem = meso.volumen_total * (sem.pct_volumen / 100);
    const result = {};
    GRUPOS_KEYS.forEach(g => {
      const pctGSem   = getSemPct(g, semActiva) / 100;
      const pctGTurno = getTurnoPct(g, semActiva, turnoActivo) / 100;
      if (pctGSem === 0 || pctGTurno === 0) return;
      result[g] = Math.round(reps_sem * pctGSem * pctGTurno);
    });
    return result;
  };
  const repsBloque = calcRepsBloque();

  // Reps ya asignadas a los ejercicios de cada grupo en este turno
  const repsUsadas = (g) => {
    const [lo, hi] = GRUPO_RANGES[g];
    return ejs
      .filter(e => { const id=Number(e.ejercicio_id); return id>=lo && id<=hi; })
      .reduce((s, e) => {
        const k = `${semActiva}-${turnoActivo}-${e.id}`;
        // If manually edited → use that value
        // Otherwise → use current tentativa (recalculated with current ejs)
        const v = manualEdit.has(k) ? repsEdit[k]
                : (e.reps_asignadas > 0 ? e.reps_asignadas
                : (tentativaActual[k] ?? 0));
        return s + Number(v);
      }, 0);
  };

  const cambiarSem = (i) => {
    setSemActiva(i); setTurnoActivo(0);
    setTimeout(() => {
      turnoRef.current?.scrollIntoView({ behavior:"smooth", block:"start" });
      setTurnoConTentativa(i, 0);
    }, 30);
  };

  if (semanas.every(s => s.turnos.every(t => !t.ejercicios.some(e => e.ejercicio_id)))) return null;

  return (
    <div ref={turnoRef} style={{marginTop:16}}>
      {/* Semana tabs */}
      <div className="semana-tabs" style={{marginBottom:8, position:"relative"}}>
        {semanas.map((s,i) => {
          const [semTip, setSemTip] = [tipSem, setTipSem];
          return (
            <div key={s.id} style={{position:"relative",display:"inline-block"}}>
              <button className={`semana-tab${semActiva===i?" active":""}`}
                onClick={()=>cambiarSem(i)}
                onMouseEnter={e=>{
                  if (semActiva===i) return;
                  const rect=e.currentTarget.getBoundingClientRect();
                  setTipSem({idx:i, x:rect.left, y:rect.top});
                }}
                onMouseLeave={()=>setTipSem(null)}>
                Semana {s.numero}
              </button>
              {tipSem?.idx===i && (()=>{
                // Collect all ejs in this semana with their tentative reps
                const rows=[];
                s.turnos.forEach((t,tIdx)=>{
                  const ejsT=t.ejercicios.filter(e=>e.ejercicio_id);
                  if(!ejsT.length) return;
                  ejsT.forEach(e=>{
                    const ejData=EJERCICIOS.find(x=>x.id===Number(e.ejercicio_id));
                    const k=`${i}-${tIdx}-${e.id}`;
                    const tent=calcTentativa(i,tIdx);
                    const reps=repsEdit[k]!==undefined?repsEdit[k]
                              :(e.reps_asignadas>0?e.reps_asignadas:(tent[k]??0));
                    rows.push({tIdx,ejId:e.ejercicio_id,int:e.intensidad,
                      col:ejData?CAT_COLOR[ejData.categoria]:"var(--muted)",reps});
                  });
                });
                return (
                  <div style={{
                    position:"fixed",left:tipSem.x,
                    bottom:`calc(100vh - ${tipSem.y}px + 6px)`,top:"auto",
                    zIndex:200,minWidth:"fit-content",maxWidth:"80vw",
                    background:"var(--surface)",border:"1px solid var(--border)",
                    borderRadius:10,boxShadow:"0 8px 32px rgba(0,0,0,.5)",
                    padding:"10px 12px",pointerEvents:"none",textAlign:"left"
                  }}>
                    <div style={{fontFamily:"'Bebas Neue'",fontSize:15,color:"var(--gold)",
                      marginBottom:6,lineHeight:1}}>Semana {s.numero}</div>
                    {rows.length===0
                      ? <div style={{fontSize:11,color:"var(--muted)"}}>Sin ejercicios</div>
                      : (()=>{
                          // Group by turno
                          const byTurno={};
                          rows.forEach(r=>{
                            if(!byTurno[r.tIdx]) byTurno[r.tIdx]=[];
                            byTurno[r.tIdx].push(r);
                          });
                          return Object.entries(byTurno).map(([tIdx,ejs])=>(
                            <div key={tIdx} style={{display:"flex",alignItems:"center",
                              gap:8,padding:"6px 0",borderTop:"1px solid var(--border)",
                              flexWrap:"wrap"}}>
                              <span style={{fontFamily:"'Bebas Neue'",fontSize:16,
                                color:"var(--muted)",minWidth:24,flexShrink:0}}>
                                T{Number(tIdx)+1}
                              </span>
                              {ejs.map((r,k)=>(
                                <span key={k} style={{display:"flex",alignItems:"baseline",
                                  gap:4,background:`${r.col}15`,borderRadius:5,
                                  padding:"3px 8px",flexShrink:0}}>
                                  <span style={{fontFamily:"'Bebas Neue'",color:r.col,fontSize:18,lineHeight:1}}>{r.ejId}</span>
                                  <span style={{color:"var(--muted)",fontSize:10,alignSelf:"center"}}>{r.int}%</span>
                                  <span style={{fontFamily:"'Bebas Neue'",fontSize:20,lineHeight:1,
                                    color:"var(--gold)"}}>{r.reps||"—"}</span>
                                </span>
                              ))}
                            </div>
                          ));
                        })()
                    }
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>

      {/* Turno tabs */}
      <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:12,minWidth:0}}>
        {sem.turnos.map((t,i) => {
          const hasEjs = t.ejercicios.some(e => e.ejercicio_id);
          return (
            <div key={t.id} style={{position:"relative",display:"inline-block"}}>
              <button
                onClick={()=>{
                  setTurnoActivo(i);
                  setTurnoConTentativa(semActiva, i);
                  setTimeout(() => {
                    turnoContentRef.current?.scrollIntoView({ behavior:"smooth", block:"start" });
                  }, 30);
                }}
                onMouseEnter={e=>{
                  if (turnoActivo===i) return;
                  const rect=e.currentTarget.getBoundingClientRect();
                  setTipTurno({idx:i, x:rect.left, y:rect.top});
                }}
                onMouseLeave={()=>setTipTurno(null)}
                style={{
                  padding:"4px 10px", borderRadius:6, border:"none",
                  background: turnoActivo===i ? "var(--gold)" : hasEjs ? "var(--surface3)" : "var(--surface2)",
                  color: turnoActivo===i ? "#000" : hasEjs ? "var(--text)" : "var(--muted)",
                  fontFamily:"'Bebas Neue'", fontSize:14, cursor:"pointer", letterSpacing:".04em"
                }}>
                T{i+1}{t.dia ? ` · ${t.dia.slice(0,3)}` : ""}
              </button>
              {tipTurno?.idx===i && hasEjs && (()=>{
                const ejsT = t.ejercicios.filter(e=>e.ejercicio_id);
                const tent = calcTentativa(semActiva, i);
                return (
                  <div style={{
                    position:"fixed", left:tipTurno.x,
                    bottom:`calc(100vh - ${tipTurno.y}px + 6px)`, top:"auto",
                    zIndex:200, minWidth:"fit-content", maxWidth:"80vw",
                    background:"var(--surface)", border:"1px solid var(--border)",
                    borderRadius:10, boxShadow:"0 8px 32px rgba(0,0,0,.5)",
                    padding:"10px 12px", pointerEvents:"none"
                  }}>
                    <div style={{fontFamily:"'Bebas Neue'",fontSize:14,color:"var(--gold)",
                      marginBottom:6,lineHeight:1}}>
                      Turno {i+1}{t.dia ? ` · ${t.dia} ${t.momento||""}` : ""}
                    </div>
                    {ejsT.map((e,k)=>{
                      const ejData=EJERCICIOS.find(x=>x.id===Number(e.ejercicio_id));
                      const col=ejData?CAT_COLOR[ejData.categoria]:"var(--muted)";
                      const key=`${semActiva}-${i}-${e.id}`;
                      const reps=repsEdit[key]!==undefined?repsEdit[key]
                               :(e.reps_asignadas>0?e.reps_asignadas:(tent[key]??"—"));
                      return (
                        <div key={k} style={{
                          display:"flex", alignItems:"baseline", gap:4,
                          padding:"4px 0", borderTop:"1px solid var(--border)"
                        }}>
                          {/* ID */}
                          <span style={{
                            fontFamily:"'Bebas Neue'", fontSize:18, color:col,
                            background:`${col}18`, padding:"0 7px",
                            borderRadius:4, flexShrink:0, lineHeight:"1.4"
                          }}>{e.ejercicio_id}</span>
                          {/* INT — pequeño y gris */}
                          <span style={{
                            fontSize:10, color:"var(--muted)", flexShrink:0,
                            alignSelf:"center"
                          }}>{e.intensidad}%</span>
                          {/* Reps — grande dorado */}
                          <span style={{
                            fontFamily:"'Bebas Neue'", fontSize:20, color:"var(--gold)",
                            flexShrink:0, lineHeight:1, marginLeft:4
                          }}>{reps}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>

      {turno && (
        <div ref={turnoContentRef}>
          {/* Header turno */}
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,flexWrap:"wrap"}}>
            <div style={{fontFamily:"'Bebas Neue'",fontSize:20,color:"var(--gold)"}}>
              Turno {turnoActivo+1}
            </div>
            {turno.dia && <span className="badge badge-blue">{turno.dia} {turno.momento}</span>}
            <span className={`badge ${modo==="Competitivo"?"badge-gold":"badge-blue"}`}>{modo}</span>
          </div>

          {/* Bloques con reps disponibles — solo si quedan reps */}
          {Object.keys(repsBloque).length > 0 && (
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
              {GRUPOS_KEYS.filter(g => repsBloque[g]).map(g => {
                const disponibles = repsBloque[g];
                const usadas      = repsUsadas(g);
                const restantes   = disponibles - usadas;
                const col         = CAT_COLOR[g];
                if (restantes === 0) return null;
                return (
                  <div key={g} style={{
                    background:`${col}10`, border:`1px solid ${col}40`,
                    borderRadius:8, padding:"8px 14px", textAlign:"center", minWidth:70
                  }}>
                    <div style={{fontFamily:"'Bebas Neue'",fontSize:12,color:col,
                      letterSpacing:".05em",marginBottom:4}}>{g}</div>
                    <div style={{display:"flex",alignItems:"baseline",gap:6,justifyContent:"center"}}>
                      <span style={{fontFamily:"'Bebas Neue'",fontSize:26,
                        color: restantes < 0 ? "var(--red)" : restantes === 0 ? "var(--green)" : col,
                        lineHeight:1}}>
                        {restantes}
                      </span>
                      <span style={{fontSize:10,color:"var(--muted)"}}>/ {disponibles}</span>
                    </div>
                    <div style={{fontSize:9,color:"var(--muted)",marginTop:2}}>reps restantes</div>
                    {/* Barra de progreso */}
                    <div style={{height:3,background:"var(--surface3)",borderRadius:2,marginTop:6}}>
                      <div style={{
                        height:"100%", borderRadius:2,
                        width:`${Math.min(usadas/disponibles*100,100)}%`,
                        background: restantes < 0 ? "var(--red)" : restantes === 0 ? "var(--green)" : col,
                        transition:"width .3s"
                      }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tabla de ejercicios */}
          {ejs.length === 0 ? (
            <div style={{padding:"20px",textAlign:"center",color:"var(--muted)",fontSize:12}}>
              Sin ejercicios sembrados en este turno
            </div>
          ) : (
            <div>
              {/* Hint + reset */}
              {cellManual.size > 0 && (
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,
                  padding:"4px 10px",background:"transparent",border:"none"}}>
                  <span style={{fontSize:11,color:"var(--muted)"}}>
                    ✏ {cellManual.size} {cellManual.size === 1 ? "celda modificada" : "celdas modificadas"}
                  </span>
                  <button
                    onClick={() => onRequestReset("todas las celdas de series, reps y kg", () => {
                      setCellEdit({}); setCellManual(new Set());
                    })}
                    style={{marginLeft:"auto",background:"none",border:"none",
                      color:"var(--muted)",fontSize:10,padding:"2px 4px",cursor:"pointer",
                      textDecoration:"underline"}}
                    onMouseEnter={e=>e.target.style.color="var(--text)"}
                    onMouseLeave={e=>e.target.style.color="var(--muted)"}>
                    resetear todo
                  </button>
                </div>
              )}
            <div style={{overflowX:"auto"}}>
              <table className="planilla-tabla" style={{borderCollapse:"separate",borderSpacing:"2px 2px",width:"100%"}}>
                <thead>
                  <tr>
                    <th style={{padding:"5px 6px",background:"var(--surface2)",border:"1px solid var(--border)",
                      borderRadius:5,textAlign:"center",fontSize:10,color:"var(--muted)",fontWeight:700,
                      textTransform:"uppercase",width:36}}>ID</th>
                    <th style={{padding:"5px 6px",background:"var(--surface2)",border:"1px solid var(--border)",
                      borderRadius:5,fontSize:10,color:"var(--muted)",fontWeight:700,
                      textTransform:"uppercase",minWidth:90}}>Ejercicio</th>
                    <th style={{padding:"5px 6px",background:"var(--surface2)",border:"1px solid var(--border)",
                      borderRadius:5,textAlign:"center",fontSize:10,color:"var(--muted)",fontWeight:700,
                      textTransform:"uppercase",width:44}}>INT</th>
                    <th style={{padding:"5px 6px",background:"var(--surface2)",border:"1px solid var(--border)",
                      borderRadius:5,textAlign:"center",fontSize:10,color:"var(--muted)",fontWeight:700,
                      textTransform:"uppercase",width:36}}>TBL</th>
                    <th style={{padding:"5px 6px",background:"rgba(232,197,71,.08)",
                      border:"1px solid rgba(232,197,71,.3)",
                      borderRadius:5,textAlign:"center",fontSize:10,color:"var(--gold)",fontWeight:700,
                      textTransform:"uppercase",width:52}}>Reps</th>
                    {INTENSIDADES.map(v => (
                      <th key={v} style={{padding:"3px 2px",background:"var(--surface2)",
                        border:"1px solid var(--border)",borderRadius:5,textAlign:"center",
                        fontSize:9,color:"var(--muted)",fontWeight:700,minWidth:44}}>
                        <div style={{color:"var(--gold)",fontSize:10,marginBottom:2}}>{v}%</div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:0}}>
                          {["S","R","K"].map(l=>(
                            <div key={l} style={{fontSize:7,color:"var(--muted)",
                              textAlign:"center",fontWeight:700}}>{l}</div>
                          ))}
                        </div>
                      </th>
                    ))}
                    <th style={{padding:"4px 6px",background:"var(--surface2)",
                      border:"1px solid rgba(232,197,71,.3)",borderRadius:5,textAlign:"center",
                      fontSize:9,color:"var(--gold)",fontWeight:700,minWidth:36}}>
                      VOL<br/>REPs
                    </th>
                    <th style={{padding:"4px 6px",background:"var(--surface2)",
                      border:"1px solid rgba(71,180,232,.3)",borderRadius:5,textAlign:"center",
                      fontSize:9,color:"var(--blue)",fontWeight:700,minWidth:36}}>
                      VOL<br/>Kg
                    </th>
                    <th style={{padding:"4px 6px",background:"var(--surface2)",
                      border:"1px solid rgba(71,232,160,.3)",borderRadius:5,textAlign:"center",
                      fontSize:9,color:"var(--green)",fontWeight:700,minWidth:40}}>
                      PESO<br/>MEDIO
                    </th>
                    <th style={{padding:"4px 6px",background:"var(--surface2)",
                      border:"1px solid rgba(155,135,232,.35)",borderRadius:5,textAlign:"center",
                      fontSize:9,color:"#9b87e8",fontWeight:700,minWidth:36}}>
                      INT<br/>MEDIA
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ejs.map((ej, eIdx) => {
                    const ejData = normativos.find(e => e.id === Number(ej.ejercicio_id));
                    const col    = ejData ? CAT_COLOR[ejData.categoria] : "var(--muted)";
                    const irm    = ejData?.base === "arranque" ? Number(irm_arr) : Number(irm_env);
                    const baseKg = ejData?.pct_base ? Math.round(irm * ejData.pct_base / 100) : null;
                    const k      = `${semActiva}-${turnoActivo}-${ej.id}`;
                    const reps   = manualEdit.has(k) ? repsEdit[k]
                                 : (ej.reps_asignadas > 0 ? ej.reps_asignadas
                                 : (tentativaActual[k] ?? ""));

                    return (
                      <tr key={ej.id} style={{background: eIdx%2===0?"var(--surface2)":"transparent"}}>
                        <td style={{padding:"5px 6px",textAlign:"center",fontFamily:"'Bebas Neue'",
                          fontSize:16,color:col,border:`1px solid ${col}30`,borderRadius:5,
                          background:`${col}0a`}}>{ej.ejercicio_id}</td>
                        {(() => {
                          const nk = `${semActiva}-${turnoActivo}-${ej.ejercicio_id}`;
                          const customName = nameEdit[nk];
                          return (
                            <td style={{padding:"3px 6px",
                              border:"1px solid var(--border)",
                              borderRadius:5, position:"relative",
                              background: customName ? "rgba(232,197,71,.04)" : "transparent"}}>
                              {customName && (
                                <span style={{position:"absolute",top:2,right:3,width:4,height:4,
                                  borderRadius:"50%",background:"var(--muted)"}}/>
                              )}
                              {nameEditing === nk ? (
                                <input
                                  autoFocus
                                  type="text"
                                  defaultValue={customName || ejData?.nombre || ""}
                                  onBlur={e => {
                                    const v = e.target.value.trim();
                                    if (v && v !== ejData?.nombre) {
                                      setNameEdit(prev => ({...prev, [nk]: v}));
                                    } else {
                                      setNameEdit(prev => { const n={...prev}; delete n[nk]; return n; });
                                    }
                                    setNameEditing(null);
                                  }}
                                  onKeyDown={e => { if(e.key==="Enter"||e.key==="Escape") e.target.blur(); }}
                                  style={{
                                    width:"100%", background:"transparent", border:"none",
                                    color:"var(--text)", fontSize:11, outline:"none",
                                    padding:"2px 0", fontFamily:"'DM Sans'"
                                  }}
                                />
                              ) : (
                                <div
                                  onClick={() => setNameEditing(nk)}
                                  title="Click para editar nombre (solo en este turno)"
                                  style={{
                                    fontSize:11, color:"var(--text)", cursor:"text", padding:"2px 0",
                                    maxWidth:120, overflow:"hidden",
                                    textOverflow:"ellipsis", whiteSpace:"nowrap"
                                  }}>
                                  {customName || ejData?.nombre || "—"}
                                </div>
                              )}
                            </td>
                          );
                        })()}
                        <td style={{padding:"5px 6px",textAlign:"center",fontFamily:"'Bebas Neue'",
                          fontSize:15,color:"var(--text)",border:"1px solid var(--border)",borderRadius:5}}>
                          {ej.intensidad}%
                        </td>
                        <td style={{padding:"5px 6px",textAlign:"center",fontSize:11,
                          color:"var(--muted)",border:"1px solid var(--border)",borderRadius:5}}>
                          T{ej.tabla}
                        </td>
                        {/* Reps — casilla editable, resaltada si fue modificada a mano */}
                        {(() => {
                          const isManual = manualEdit.has(k);
                          return (
                            <td style={{padding:"3px 4px",textAlign:"center",
                              background: isManual ? "rgba(71,180,232,.12)" : "rgba(232,197,71,.06)",
                              border: isManual ? "1px solid var(--blue)" : "1px solid rgba(232,197,71,.3)",
                              borderRadius:5, position:"relative"}}>
                              {isManual && (
                                <span style={{
                                  position:"absolute", top:2, right:3,
                                  width:5, height:5, borderRadius:"50%",
                                  background:"var(--muted)", display:"block"
                                }}/>
                              )}
                              <input type="number" min={0} className="no-spin"
                                value={reps}
                                placeholder="—"
                                onFocus={_beforeChange}
                                onChange={e => {
                                  const v = Number(e.target.value);
                                  setRepsEditRaw(r => {
                                    const next = {...r, [k]: v};
                                    try { localStorage.setItem(_k('repsEdit'), JSON.stringify(next)); } catch {}
                                    return next;
                                  });
                                  setManualEditRaw(m => {
                                    const next = new Set([...m, k]);
                                    try { localStorage.setItem(_k('manualEdit'), JSON.stringify([...next])); } catch {}
                                    return next;
                                  });
                                }}
                                onDoubleClick={() => {
                                  _beforeChangeForced(); // push estado A (antes del reset)
                                  setRepsEditRaw(r => {
                                    const next = {...r}; delete next[k];
                                    try { localStorage.setItem(_k('repsEdit'), JSON.stringify(next)); } catch {}
                                    return next;
                                  });
                                  setManualEditRaw(m => {
                                    const next = new Set(m); next.delete(k);
                                    try { localStorage.setItem(_k('manualEdit'), JSON.stringify([...next])); } catch {}
                                    return next;
                                  });
                                  // push estado B (después del reset) para que redo funcione
                                  setTimeout(() => { try { if(onBeforeChange){_lastPushTime.current=0;onBeforeChange(true);} } catch{} }, 0);
                                }}
                                title={isManual ? "Modificado manualmente — doble click para resetear al sugerido" : "Valor sugerido automáticamente"}
                                style={{width:44,background:"transparent",border:"none",
                                  color: isManual ? "var(--blue)" : "var(--gold)",
                                  fontFamily:"'Bebas Neue'",
                                  fontSize:17,textAlign:"center",outline:"none",padding:"0 2px",
                                  MozAppearance:"textfield",appearance:"textfield"}}
                              />
                            </td>
                          );
                        })()}
                        {/* Columnas de intensidad */}
                        {(() => {
                          const repsVal = repsEdit[k] !== undefined ? repsEdit[k]
                                        : (ej.reps_asignadas > 0 ? ej.reps_asignadas
                                        : (tentativaActual[k] ?? 0));
                          const calcs = calcSeriesRepsKg(tablas, ej, ejData, irm_arr, irm_env, modo, repsVal);
                          return INTENSIDADES.map((intens, iIdx) => {
                            const c       = calcs ? calcs[iIdx] : null;
                            const hasData = c?.series != null;

                            // Helper: get value for a field (series/reps/kg), checking manual override first
                            const ck = (field) => `${k}-${intens}-${field}`;
                            const getVal = (field, calcVal) => cellManual.has(ck(field))
                              ? cellEdit[ck(field)]
                              : calcVal;
                            const isManual = (field) => cellManual.has(ck(field));

                            const inputCellStyle = (field, calcVal) => ({
                              width: "100%", background: "transparent", border: "none",
                              fontFamily: "'Bebas Neue'", fontSize: 13, textAlign: "center",
                              lineHeight: 1.2, outline: "none", padding: 0,
                              color: isManual(field) && field !== "kg"
                                ? "var(--text)"
                                : (field === "kg" ? "var(--muted)" : "var(--text)"),
                              MozAppearance: "textfield", appearance: "textfield",
                              cursor: "text",
                              fontWeight: isManual(field) ? 700 : 400,
                            });

                            const handleFocus = _beforeChange;

                            const handleChange = (field, val) => {
                              const key = ck(field);
                              // Escribe directo sin _beforeChange (ya se capturó en onFocus)
                              setCellEditRaw(prev => {
                                const next = {...prev, [key]: val === "" ? "" : Number(val)};
                                try { localStorage.setItem(_k('cellEdit'), JSON.stringify(next)); } catch {}
                                return next;
                              });
                              setCellManualRaw(prev => {
                                const next = new Set([...prev, key]);
                                try { localStorage.setItem(_k('cellManual'), JSON.stringify([...next])); } catch {}
                                return next;
                              });
                            };

                            const handleReset = (field, e) => {
                              if (e.detail === 2) { // double-click resets to calculated
                                _beforeChangeForced(); // push estado A
                                const key = ck(field);
                                setCellManualRaw(prev => {
                                  const next = new Set(prev); next.delete(key);
                                  try { localStorage.setItem(_k('cellManual'), JSON.stringify([...next])); } catch {}
                                  return next;
                                });
                                // push estado B para redo
                                setTimeout(() => { try { if(onBeforeChange){_lastPushTime.current=0;onBeforeChange(true);} } catch{} }, 0);
                              }
                            };

                            const anyManual = ["series","reps","kg"].some(f => isManual(f));
                            const noteKey  = `${k}-${intens}-note`;
                            const noteVal  = noteEdit[noteKey] || "";
                            const hasNote  = noteVal.trim() !== "";

                            const fields3 = hasData || anyManual
                              ? [{field:"series",calc:c?.series},{field:"reps",calc:c?.reps_serie},{field:"kg",calc:c?.kg}]
                              : [{field:"series",calc:null},{field:"reps",calc:null},{field:"kg",calc:null}];

                            return (
                              <td key={intens} style={{padding:"4px 5px",textAlign:"center",
                                background: "transparent",
                                border: `1px solid ${anyManual || hasNote ? "var(--muted)" : "var(--border)"}`,
                                borderRadius:5, position:"relative"}}>
                                {(anyManual || hasNote) && (
                                  <span style={{
                                    position:"absolute", top:2, right:3,
                                    width:4, height:4, borderRadius:"50%",
                                    background:"var(--muted)", display:"block"
                                  }}/>
                                )}
                                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:0}}>
                                  {fields3.map(({field, calc}) => (
                                    <input
                                      key={field}
                                      type="number"
                                      className="no-spin"
                                      value={getVal(field, calc) ?? ""}
                                      placeholder="—"
                                      title={isManual(field) ? "Modificado · doble click para resetear" : field}
                                      onFocus={handleFocus}
                                      onChange={e => handleChange(field, e.target.value)}
                                      onClick={e => handleReset(field, e)}
                                      style={inputCellStyle(field, calc)}
                                    />
                                  ))}
                                </div>
                                {/* Campo nota combinado — aparece si tiene contenido o al hacer click */}
                                <input
                                  type="text"
                                  value={noteVal}
                                  placeholder={hasData || anyManual ? "…" : ""}
                                  onChange={e => {
                                    const v = e.target.value;
                                    setNoteEdit(prev => {
                                      const n = {...prev};
                                      if (v.trim()) n[noteKey] = v;
                                      else delete n[noteKey];
                                      return n;
                                    });
                                  }}
                                  title="Aclaración (ej: 2+2+2 para combinados)"
                                  style={{
                                    display: (hasData || anyManual || hasNote) ? "block" : "none",
                                    width:"100%", background:"transparent", border:"none",
                                    borderTop: hasNote ? "1px solid var(--border)" : "none",
                                    color:"var(--muted)", fontSize:9, textAlign:"center",
                                    outline:"none", padding:"2px 0 0",
                                    fontFamily:"'DM Sans'", marginTop:2
                                  }}
                                />
                              </td>
                            );
                          });
                        })()}
                        {/* VOL REPs y VOL Kg — al final de cada fila */}
                        {(() => {
                          const repsVal = repsEdit[k] !== undefined ? repsEdit[k]
                                        : (ej.reps_asignadas > 0 ? ej.reps_asignadas
                                        : (tentativaActual[k] ?? 0));
                          const calcs = calcSeriesRepsKg(tablas, ej, ejData, irm_arr, irm_env, modo, repsVal);
                          let volReps = 0, volKg = 0;
                          INTENSIDADES.forEach((intens, iIdx) => {
                            const c = calcs ? calcs[iIdx] : null;
                            if (!c) return;
                            const ckf = (f) => `${k}-${intens}-${f}`;
                            const getV = (f, def) => cellManual.has(ckf(f)) ? (Number(cellEdit[ckf(f)]) || 0) : (def || 0);
                            const s  = getV('series',   c.series);
                            const r  = getV('reps',     c.reps_serie);
                            const kg = getV('kg',       c.kg);
                            // Si series=0 o null → usar 1 (igual que Excel)
                            const sEff = (s && s > 0) ? s : (r > 0 ? 1 : 0);
                            volReps += Math.round(sEff) * Math.round(r);
                            volKg   += Math.round(sEff) * Math.round(r) * (kg || 0);
                          });
                          return (
                            <>
                              <td style={{padding:"5px 6px",textAlign:"center",
                                background:"rgba(232,197,71,.06)",
                                border:"1px solid rgba(232,197,71,.2)",borderRadius:5}}>
                                <div style={{fontFamily:"'Bebas Neue'",fontSize:16,
                                  color:"var(--gold)",lineHeight:1}}>
                                  {volReps > 0 ? volReps : "—"}
                                </div>
                              </td>
                              <td style={{padding:"5px 6px",textAlign:"center",
                                background:"rgba(71,180,232,.06)",
                                border:"1px solid rgba(71,180,232,.2)",borderRadius:5}}>
                                <div style={{fontFamily:"'Bebas Neue'",fontSize:16,
                                  color:"var(--blue)",lineHeight:1}}>
                                  {volKg > 0 ? (Number.isInteger(volKg) ? volKg : volKg.toFixed(1)) : "—"}
                                </div>
                              </td>
                              <td style={{padding:"5px 6px",textAlign:"center",
                                background:"rgba(71,232,160,.05)",
                                border:"1px solid rgba(71,232,160,.2)",borderRadius:5}}>
                                <div style={{fontFamily:"'Bebas Neue'",fontSize:16,
                                  color:"var(--green)",lineHeight:1}}>
                                  {volReps > 0 && volKg > 0
                                    ? (() => { const pm = volKg/volReps; return Number.isInteger(pm*2) && pm%1===0 ? pm : (Math.round(pm*2)/2).toFixed(1); })()
                                    : "—"}
                                </div>
                              </td>
                              {/* Intensidad Media % = Peso Medio / IRM × 100 */}
                              <td style={{padding:"5px 6px",textAlign:"center",
                                background:"rgba(155,135,232,.05)",
                                border:"1px solid rgba(155,135,232,.2)",borderRadius:5}}>
                                <div style={{fontFamily:"'Bebas Neue'",fontSize:16,
                                  color:"#9b87e8",lineHeight:1}}>
                                  {(() => {
                                    if (volReps === 0 || volKg === 0 || !ejData) return "—";
                                    const irm = ejData.base === "arranque" ? Number(irm_arr) : Number(irm_env);
                                    if (!irm) return "—";
                                    const kgBase = irm * (ejData.pct_base||100) / 100;
                                    const intMedia = (volKg / volReps) / kgBase * 100;
                                    return Math.round(intMedia) + "%";
                                  })()}
                                </div>
                              </td>

                            </>
                          );
                        })()}

                      </tr>
                    );
                  })}
                  {/* Fila de totales del turno */}
                  {(() => {
                    let totalReps = 0, totalKg = 0, totalSumIntReps = 0;
                    ejs.forEach(ej => {
                      const ejData2 = normativos.find(e => e.id === Number(ej.ejercicio_id));
                      const k2 = `${semActiva}-${turnoActivo}-${ej.id}`;
                      const repsVal2 = repsEdit[k2] !== undefined ? repsEdit[k2]
                                     : (ej.reps_asignadas > 0 ? ej.reps_asignadas
                                     : (tentativaActual[k2] ?? 0));
                      const calcs2 = calcSeriesRepsKg(tablas, ej, ejData2, irm_arr, irm_env, modo, repsVal2);
                      if (!calcs2) return;
                      INTENSIDADES.forEach((intens, iIdx) => {
                        const c2 = calcs2[iIdx];
                        if (!c2) return;
                        const ckf2 = (f) => `${k2}-${intens}-${f}`;
                        const getV2 = (f, def) => cellManual.has(ckf2(f)) ? (Number(cellEdit[ckf2(f)]) || 0) : (def || 0);
                        const s2  = getV2('series', c2.series);
                        const r2  = getV2('reps',   c2.reps_serie);
                        const kg2 = getV2('kg',     c2.kg);
                        if (r2 === 0) return;
                        const sEff2 = (s2 && s2 > 0) ? s2 : 1;
                        const rT2 = Math.round(sEff2) * Math.round(r2);
                        totalReps += rT2;
                        totalKg   += rT2 * (kg2 || 0);
                        totalSumIntReps += intens * rT2;
                      });
                    });
                    // Intensidad Media total = Peso Medio total / kgBase promedio ponderado
                    // = Σ(pesoMedio_ej × reps_ej) / totalReps  donde pesoMedio_ej = volKg_ej/volReps_ej
                    // Equivalente: totalKg / totalReps / kgBase_ponderado
                    // Calculamos como Σ(intMedia_ej × volReps_ej) / totalReps
                    let sumIntMediaPond = 0, totalRepsConIRM = 0;
                    ejs.forEach(ej => {
                      const ejD = normativos.find(e => e.id === Number(ej.ejercicio_id));
                      if (!ejD) return;
                      const irm2 = ejD.base === "arranque" ? Number(irm_arr) : Number(irm_env);
                      const kgB = irm2 && ejD.pct_base ? irm2 * ejD.pct_base / 100 : null;
                      if (!kgB) return;
                      const k3 = `${semActiva}-${turnoActivo}-${ej.id}`;
                      const rv3 = repsEdit[k3] !== undefined ? repsEdit[k3] : (ej.reps_asignadas > 0 ? ej.reps_asignadas : (tentativaActual[k3] ?? 0));
                      const c3 = calcSeriesRepsKg(tablas, ej, ejD, irm_arr, irm_env, modo, rv3);
                      if (!c3) return;
                      let vR3=0, vK3=0;
                      INTENSIDADES.forEach((intens,iIdx) => {
                        const cx=c3[iIdx]; if(!cx) return;
                        const ckx=(f)=>`${k3}-${intens}-${f}`;
                        const gx=(f,d)=>cellManual.has(ckx(f))?(Number(cellEdit[ckx(f)])||0):(d||0);
                        const s3=gx('series',cx.series); const r3=gx('reps',cx.reps_serie); const kg3=gx('kg',cx.kg);
                        if(r3===0) return;
                        const se3=(s3&&s3>0)?s3:1;
                        const rt3=Math.round(se3)*Math.round(r3);
                        vR3+=rt3; vK3+=rt3*(kg3||0);
                      });
                      if(vR3>0 && vK3>0) {
                        const im3 = (vK3/vR3)/kgB*100;
                        sumIntMediaPond += im3 * vR3;
                        totalRepsConIRM += vR3;
                      }
                    });
                    const intMediaTotal = totalRepsConIRM > 0 ? Math.round(sumIntMediaPond/totalRepsConIRM) : null;
                    const colSpan = 4 + INTENSIDADES.length; // ID + Ejercicio + INT + TBL + Reps + intensidades
                    if (totalReps === 0) return null;
                    return (
                      <tr>
                        <td colSpan={colSpan + 1} style={{padding:"6px 8px",textAlign:"right",
                          fontSize:10,color:"var(--muted)",fontWeight:700,
                          textTransform:"uppercase",letterSpacing:".06em",
                          borderTop:"1px solid var(--border)"}}>
                          Total turno
                        </td>
                        <td style={{padding:"5px 6px",textAlign:"center",
                          background:"rgba(232,197,71,.12)",
                          border:"1px solid rgba(232,197,71,.4)",borderRadius:5,
                          borderTop:"1px solid var(--border)"}}>
                          <div style={{fontFamily:"'Bebas Neue'",fontSize:18,
                            color:"var(--gold)",lineHeight:1,fontWeight:700}}>
                            {totalReps}
                          </div>
                        </td>
                        <td style={{padding:"5px 6px",textAlign:"center",
                          background:"rgba(71,180,232,.12)",
                          border:"1px solid rgba(71,180,232,.4)",borderRadius:5,
                          borderTop:"1px solid var(--border)"}}>
                          <div style={{fontFamily:"'Bebas Neue'",fontSize:18,
                            color:"var(--blue)",lineHeight:1,fontWeight:700}}>
                            {Number.isInteger(totalKg) ? totalKg : totalKg.toFixed(1)}
                          </div>
                        </td>
                        <td style={{padding:"5px 6px",textAlign:"center",
                          background:"rgba(71,232,160,.12)",
                          border:"1px solid rgba(71,232,160,.4)",borderRadius:5,
                          borderTop:"1px solid var(--border)"}}>
                          <div style={{fontFamily:"'Bebas Neue'",fontSize:18,
                            color:"var(--green)",lineHeight:1,fontWeight:700}}>
                            {totalReps > 0 && totalKg > 0
                              ? (() => { const pm = totalKg/totalReps; return (Math.round(pm*2)/2 % 1 === 0) ? Math.round(pm*2)/2 : (Math.round(pm*2)/2).toFixed(1); })()
                              : "—"}
                          </div>
                        </td>
                        {/* Intensidad Media total */}
                        <td style={{padding:"5px 6px",textAlign:"center",
                          background:"rgba(155,135,232,.12)",
                          border:"1px solid rgba(155,135,232,.4)",borderRadius:5,
                          borderTop:"1px solid var(--border)"}}>
                          <div style={{fontFamily:"'Bebas Neue'",fontSize:18,
                            color:"#9b87e8",lineHeight:1,fontWeight:700}}>
                            {intMediaTotal != null ? `${intMediaTotal}%` : "—"}
                          </div>
                        </td>

                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
            {/* Leyenda */}
            <div style={{marginTop:8, display:"flex", alignItems:"center", gap:16, flexWrap:"wrap"}}>
              <div style={{display:"flex", alignItems:"center", gap:5, fontSize:11, color:"var(--muted)"}}>
                <span style={{display:"inline-block", width:6, height:6, borderRadius:"50%", background:"var(--muted)"}}/>
                Modificado manualmente
              </div>
              <div style={{fontSize:11, color:"var(--muted)"}}>
                Doble click en cualquier celda azul para volver al valor sugerido
              </div>
            </div>

            {/* Gráfico de barras por grupo del turno */}
            {(() => {
              const grupoTotales = {};
              GRUPOS_KEYS.forEach(g => { grupoTotales[g] = { reps: 0, kg: 0 }; });
              ejs.forEach(ej => {
                const ejData2 = normativos.find(e => e.id === Number(ej.ejercicio_id));
                if (!ejData2) return;
                const g = getGrupo(ej.ejercicio_id);
                if (!g) return;
                const k2 = `${semActiva}-${turnoActivo}-${ej.id}`;
                const repsVal2 = repsEdit[k2] !== undefined ? repsEdit[k2]
                               : (ej.reps_asignadas > 0 ? ej.reps_asignadas : (tentativaActual[k2] ?? 0));
                const calcs2 = calcSeriesRepsKg(tablas, ej, ejData2, irm_arr, irm_env, modo, repsVal2);
                if (!calcs2) return;
                INTENSIDADES.forEach((intens, iIdx) => {
                  const c2 = calcs2[iIdx]; if (!c2) return;
                  const ckf2 = (f) => `${k2}-${intens}-${f}`;
                  const getV2 = (f, def) => cellManual.has(ckf2(f)) ? (Number(cellEdit[ckf2(f)])||0) : (def||0);
                  const s2 = getV2('series', c2.series);
                  const r2 = getV2('reps', c2.reps_serie);
                  const kg2 = getV2('kg', c2.kg);
                  if (r2 === 0) return;
                  const sEff2 = (s2 && s2 > 0) ? s2 : 1;
                  const rT2 = Math.round(sEff2) * Math.round(r2);
                  grupoTotales[g].reps += rT2;
                  grupoTotales[g].kg   += rT2 * (kg2 || 0);
                });
              });
              const barData = GRUPOS_KEYS
                .filter(g => grupoTotales[g].reps > 0)
                .map(g => ({
                  grupo: g.slice(0,3).toUpperCase(),
                  fullName: g,
                  reps: grupoTotales[g].reps,
                  kg: Math.round(grupoTotales[g].kg),
                  color: CAT_COLOR[g]
                }));
              if (barData.length === 0) return null;
              return (
                <div style={{marginTop:16, display:"flex", gap:8, flexWrap:"wrap", alignItems:"flex-end"}}>
                  {barData.map(d => {
                    const maxReps = Math.max(...barData.map(x => x.reps));
                    const pct = maxReps > 0 ? d.reps / maxReps : 0;
                    return (
                      <div key={d.grupo} style={{
                        display:"flex", flexDirection:"column", alignItems:"center",
                        gap:4, minWidth:60, flex:1
                      }}>
                        <div style={{fontSize:10,color:"var(--muted)",fontFamily:"'Bebas Neue'",
                          letterSpacing:".05em"}}>{d.reps} reps</div>
                        <div style={{
                          width:"100%", height:Math.max(8, Math.round(80 * pct)),
                          background:d.color, borderRadius:"4px 4px 0 0",
                          transition:"height .3s", opacity:.85
                        }}/>
                        <div style={{fontSize:10,color:"var(--muted)",marginTop:2}}>{d.kg} kg</div>
                        <div style={{fontFamily:"'Bebas Neue'",fontSize:13,color:d.color,
                          letterSpacing:".04em"}}>{d.grupo}</div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ── Planilla Básica (Escuela Básica) ─────────────────────────────────────────
// Planilla simplificada sin sembrado, sin IRM, sin % semanal, sin distribución.
// El "sembrado" se hace directamente en la planilla.
// Cada ejercicio tiene N bloques con %, series, reps, kg editables.
function PlanillaBasica({ semanas, onChange, numBloques = 3, onBeforeChange, irm_arr = 100, irm_env = 200 }) {
  const [semActiva, setSemActiva] = useState(0);
  const [turnoActivo, setTurnoActivo] = useState(0);
  const [ejPickerOpen, setEjPickerOpen] = useState(null); // ejIdx or null

  const normativos = (() => {
    try { return JSON.parse(localStorage.getItem('liftplan_normativos') || 'null') || EJERCICIOS; }
    catch { return EJERCICIOS; }
  })();

  const sem = semanas[semActiva];
  const turno = sem?.turnos[turnoActivo];
  const ejs = turno?.ejercicios || [];

  const _bc = () => { try { if (onBeforeChange) onBeforeChange(); } catch {} };

  // Calcular kg automático: IRM × pct_base / 100 × pct_bloque / 100
  const calcKgBasica = (ejercicio_id, pct) => {
    if (!ejercicio_id || !pct) return null;
    const ejData = normativos.find(e => e.id === Number(ejercicio_id));
    if (!ejData || !ejData.pct_base) return null;
    const irm = ejData.base === "arranque" ? Number(irm_arr) : Number(irm_env);
    if (!irm) return null;
    return Math.round(irm * ejData.pct_base / 100 * pct / 100 * 2) / 2;
  };

  // Deep-clone update — acepta updates extra para el form padre (ej: num_bloques_basica)
  const updateSemanas = (updater, extraFormUpdates) => {
    _bc();
    const next = typeof updater === 'function' ? updater(JSON.parse(JSON.stringify(semanas))) : updater;
    onChange(next, extraFormUpdates);
  };

  const updateBloque = (ejIdx, bIdx, field, value) => {
    updateSemanas(ss => {
      const ej = ss[semActiva].turnos[turnoActivo].ejercicios[ejIdx];
      if (!ej.bloques) ej.bloques = Array.from({length: numBloques}, mkBloqueBasica);
      if (field === "pct") {
        // Al cambiar %, auto-calcular kg
        const newPct = value === "" ? null : Number(value);
        const autoKg = calcKgBasica(ej.ejercicio_id, newPct);
        ej.bloques[bIdx] = { ...ej.bloques[bIdx], pct: newPct, kg: autoKg };
      } else {
        ej.bloques[bIdx] = { ...ej.bloques[bIdx], [field]: value === "" ? null : Number(value) };
      }
      return ss;
    });
  };

  const setEjercicioId = (ejIdx, newId) => {
    updateSemanas(ss => {
      const ej = ss[semActiva].turnos[turnoActivo].ejercicios[ejIdx];
      ej.ejercicio_id = newId ? Number(newId) : null;
      ej.nombre_custom = "";
      // Recalcular kg de todos los bloques con el nuevo ejercicio
      if (ej.bloques) {
        ej.bloques.forEach(b => {
          if (b.pct) b.kg = calcKgBasica(ej.ejercicio_id, b.pct);
        });
      }
      return ss;
    });
  };

  const setNombreCustom = (ejIdx, nombre) => {
    updateSemanas(ss => {
      ss[semActiva].turnos[turnoActivo].ejercicios[ejIdx].nombre_custom = nombre;
      return ss;
    });
  };

  const addEjercicio = () => {
    updateSemanas(ss => {
      ss[semActiva].turnos[turnoActivo].ejercicios.push(mkEjBasica(numBloques));
      return ss;
    });
  };

  const removeEjercicio = (ejIdx) => {
    if (ejs.length <= 1) return;
    updateSemanas(ss => {
      ss[semActiva].turnos[turnoActivo].ejercicios.splice(ejIdx, 1);
      return ss;
    });
  };

  const addTurno = () => {
    updateSemanas(ss => {
      const s = ss[semActiva];
      s.turnos.push({
        id: mkId(), numero: s.turnos.length + 1, dia: "", momento: "",
        ejercicios: Array.from({length: 6}, () => mkEjBasica(numBloques))
      });
      return ss;
    });
  };

  const removeTurno = () => {
    if (!sem || sem.turnos.length <= 1) return;
    updateSemanas(ss => {
      ss[semActiva].turnos.splice(turnoActivo, 1);
      ss[semActiva].turnos.forEach((t, i) => { t.numero = i + 1; });
      return ss;
    });
    setTurnoActivo(v => Math.max(0, Math.min(v, (sem?.turnos.length || 2) - 2)));
  };

  const addSemana = () => {
    updateSemanas(ss => {
      ss.push({ id: mkId(), numero: ss.length + 1, turnos: mkTurnosBasica(numBloques) });
      return ss;
    });
  };

  const removeSemana = () => {
    if (semanas.length <= 1) return;
    updateSemanas(ss => {
      ss.splice(semActiva, 1);
      ss.forEach((s, i) => { s.numero = i + 1; });
      return ss;
    });
    setSemActiva(v => Math.max(0, Math.min(v, semanas.length - 2)));
    setTurnoActivo(0);
  };

  const addBloqueCol = () => {
    const newNum = numBloques + 1;
    updateSemanas(ss => {
      ss.forEach(s => s.turnos.forEach(t => t.ejercicios.forEach(e => {
        if (!e.bloques) e.bloques = Array.from({length: numBloques}, mkBloqueBasica);
        e.bloques.push(mkBloqueBasica());
      })));
      return ss;
    }, { num_bloques_basica: newNum });
  };

  const removeBloqueCol = (bIdx) => {
    if (numBloques <= 1) return;
    updateSemanas(ss => {
      ss.forEach(s => s.turnos.forEach(t => t.ejercicios.forEach(e => {
        if (e.bloques && e.bloques.length > bIdx) e.bloques.splice(bIdx, 1);
      })));
      return ss;
    }, { num_bloques_basica: numBloques - 1 });
  };

  // Move exercise up/down
  const moveEj = (ejIdx, dir) => {
    const tgt = ejIdx + dir;
    if (tgt < 0 || tgt >= ejs.length) return;
    updateSemanas(ss => {
      const arr = ss[semActiva].turnos[turnoActivo].ejercicios;
      [arr[ejIdx], arr[tgt]] = [arr[tgt], arr[ejIdx]];
      return ss;
    });
  };

  // Copy turno to all weeks
  const copiarTurnoATodasSemanas = () => {
    if (!turno) return;
    updateSemanas(ss => {
      const turnoBase = JSON.parse(JSON.stringify(turno));
      ss.forEach((s, sIdx) => {
        if (sIdx === semActiva) return;
        // Ensure turno index exists
        while (s.turnos.length <= turnoActivo) {
          s.turnos.push({
            id: mkId(), numero: s.turnos.length + 1, dia: "", momento: "",
            ejercicios: Array.from({length: 6}, () => mkEjBasica(numBloques))
          });
        }
        const copy = JSON.parse(JSON.stringify(turnoBase));
        copy.id = s.turnos[turnoActivo].id; // keep original id
        copy.numero = turnoActivo + 1;
        s.turnos[turnoActivo] = copy;
      });
      return ss;
    });
  };

  // Compact input style
  const cellInput = (extra = {}) => ({
    width: "100%", background: "transparent", border: "none",
    fontFamily: "'Bebas Neue'", fontSize: 14, textAlign: "center",
    lineHeight: 1.2, outline: "none", padding: "3px 2px",
    color: "var(--text)", MozAppearance: "textfield", appearance: "textfield",
    ...extra
  });

  if (!sem) return null;

  return (
    <div>
      {/* ── Semana tabs ── */}
      <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8,alignItems:"center"}}>
        {semanas.map((s,i) => (
          <button key={s.id}
            className={`semana-tab${semActiva===i?" active":""}`}
            onClick={() => { setSemActiva(i); setTurnoActivo(0); }}>
            Semana {s.numero}
          </button>
        ))}
        <button onClick={addSemana}
          style={{width:28,height:28,borderRadius:"50%",border:"1px dashed var(--border)",
            background:"transparent",color:"var(--gold)",cursor:"pointer",fontSize:16,
            display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>+</button>
        {semanas.length > 1 && (
          <button onClick={removeSemana}
            title="Eliminar semana actual"
            style={{width:28,height:28,borderRadius:"50%",border:"1px dashed var(--border)",
              background:"transparent",color:"var(--red)",cursor:"pointer",fontSize:16,
              display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>−</button>
        )}
      </div>

      {/* ── Turno tabs ── */}
      <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:12,alignItems:"center"}}>
        {sem.turnos.map((t,i) => (
          <button key={t.id}
            onClick={() => setTurnoActivo(i)}
            style={{
              padding:"4px 12px", borderRadius:6, border:"none",
              background: turnoActivo===i ? "var(--gold)" : "var(--surface3)",
              color: turnoActivo===i ? "#000" : "var(--text)",
              fontFamily:"'Bebas Neue'", fontSize:14, cursor:"pointer", letterSpacing:".04em"
            }}>
            T{i+1}{t.dia ? ` · ${t.dia.slice(0,3)}` : ""}
          </button>
        ))}
        <button onClick={addTurno}
          style={{width:24,height:24,borderRadius:"50%",border:"1px dashed var(--border)",
            background:"transparent",color:"var(--gold)",cursor:"pointer",fontSize:14,
            display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>+</button>
        {sem.turnos.length > 1 && (
          <button onClick={removeTurno}
            title="Eliminar turno actual"
            style={{width:24,height:24,borderRadius:"50%",border:"1px dashed var(--border)",
              background:"transparent",color:"var(--red)",cursor:"pointer",fontSize:14,
              display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>−</button>
        )}
        <button onClick={copiarTurnoATodasSemanas}
          title="Copiar este turno a todas las semanas"
          style={{marginLeft:8,padding:"3px 10px",borderRadius:6,border:"1px solid var(--border)",
            background:"var(--surface2)",color:"var(--muted)",cursor:"pointer",fontSize:10,
            fontFamily:"'DM Sans'",fontWeight:600}}>
          Copiar a todas las semanas
        </button>
      </div>

      {/* ── Header del turno ── */}
      {turno && (
        <div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,flexWrap:"wrap"}}>
            <div style={{fontFamily:"'Bebas Neue'",fontSize:20,color:"var(--gold)"}}>
              Semana {sem.numero} — Turno {turnoActivo+1}
            </div>
            {/* Day/Moment inline selectors */}
            <select value={turno.dia || ""} onChange={e => {
              updateSemanas(ss => { ss[semActiva].turnos[turnoActivo].dia = e.target.value; return ss; });
            }} style={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:6,
              padding:"3px 6px",color:"var(--text)",fontSize:11,fontFamily:"'DM Sans'"}}>
              <option value="">Día</option>
              {["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"].map(d=>(
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <select value={turno.momento || ""} onChange={e => {
              updateSemanas(ss => { ss[semActiva].turnos[turnoActivo].momento = e.target.value; return ss; });
            }} style={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:6,
              padding:"3px 6px",color:"var(--text)",fontSize:11,fontFamily:"'DM Sans'"}}>
              <option value="">Momento</option>
              {["Mañana","Tarde","Noche"].map(m=>(
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* ── Tabla de ejercicios ── */}
          <div style={{overflowX:"auto"}}>
            <table className="planilla-tabla" style={{borderCollapse:"separate",borderSpacing:"2px 2px",width:"100%"}}>
              <thead>
                <tr>
                  <th style={{padding:"5px 6px",background:"var(--surface2)",border:"1px solid var(--border)",
                    borderRadius:5,textAlign:"center",fontSize:10,color:"var(--muted)",fontWeight:700,
                    textTransform:"uppercase",width:40}}>REF</th>
                  <th style={{padding:"5px 6px",background:"var(--surface2)",border:"1px solid var(--border)",
                    borderRadius:5,fontSize:10,color:"var(--muted)",fontWeight:700,
                    textTransform:"uppercase",minWidth:100}}>EJERCICIO</th>
                  {Array.from({length: numBloques}).map((_, bIdx) => (
                    <th key={bIdx} colSpan={4} style={{padding:"3px 4px",
                      background:"rgba(232,197,71,.08)",
                      border:"1px solid rgba(232,197,71,.3)",
                      borderRadius:5,textAlign:"center",fontSize:9,color:"var(--gold)",fontWeight:700}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:2}}>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:0,flex:1}}>
                          {["%","S","R","Kg"].map(l=>(
                            <div key={l} style={{fontSize:8,color:"var(--muted)",textAlign:"center",fontWeight:700}}>{l}</div>
                          ))}
                        </div>
                        {numBloques > 1 && (
                          <button onClick={() => removeBloqueCol(bIdx)}
                            style={{width:14,height:14,borderRadius:"50%",border:"none",
                              background:"transparent",color:"var(--muted)",cursor:"pointer",
                              fontSize:11,lineHeight:1,padding:0,flexShrink:0}}
                            title="Eliminar esta columna de %">×</button>
                        )}
                      </div>
                    </th>
                  ))}
                  <th style={{padding:"3px 4px",background:"var(--surface2)",border:"1px dashed var(--border)",
                    borderRadius:5,width:30}}>
                    <button onClick={addBloqueCol}
                      title="Agregar columna de %"
                      style={{width:"100%",background:"transparent",border:"none",
                        color:"var(--gold)",cursor:"pointer",fontSize:13,fontWeight:700,padding:0}}>+ %</button>
                  </th>
                  <th style={{width:26}}/>
                </tr>
              </thead>
              <tbody>
                {ejs.map((ej, eIdx) => {
                  const ejData = ej.ejercicio_id ? normativos.find(e => e.id === Number(ej.ejercicio_id)) : null;
                  const col = ejData ? CAT_COLOR[ejData.categoria] : "var(--border)";
                  const bloques = ej.bloques || Array.from({length: numBloques}, mkBloqueBasica);
                  const displayName = ej.nombre_custom || ejData?.nombre || "";

                  return (
                    <tr key={ej.id} style={{background: eIdx%2===0 ? "var(--surface2)" : "transparent"}}>
                      {/* REF — input numérico */}
                      <td style={{padding:"3px 4px",textAlign:"center",
                        border:`1px solid ${col}40`,borderRadius:5,
                        background:`${col}0a`}}>
                        <input type="number" min={1} max={200} className="no-spin"
                          value={ej.ejercicio_id || ""}
                          placeholder="—"
                          onChange={e => setEjercicioId(eIdx, e.target.value)}
                          style={cellInput({width:36,fontFamily:"'Bebas Neue'",fontSize:16,color:col})}
                        />
                      </td>
                      {/* Ejercicio nombre — click to edit */}
                      <td style={{padding:"3px 6px",border:"1px solid var(--border)",borderRadius:5,
                        position:"relative",minWidth:100}}>
                        <input type="text"
                          value={displayName}
                          placeholder="Nombre del ejercicio"
                          onChange={e => {
                            if (ejData && e.target.value === ejData.nombre) {
                              setNombreCustom(eIdx, "");
                            } else {
                              setNombreCustom(eIdx, e.target.value);
                            }
                          }}
                          style={{width:"100%",background:"transparent",border:"none",
                            color:"var(--text)",fontSize:11,outline:"none",padding:"2px 0",
                            fontFamily:"'DM Sans'"}}
                        />
                      </td>
                      {/* Bloques: % | S | R | Kg */}
                      {bloques.slice(0, numBloques).map((b, bIdx) => (
                        <React.Fragment key={bIdx}>
                          <td style={{padding:"2px 1px",textAlign:"center",
                            background:"rgba(232,197,71,.04)",
                            border:"1px solid rgba(232,197,71,.15)",
                            borderRadius:"5px 0 0 5px",width:36}}>
                            <input type="number" className="no-spin"
                              value={b.pct ?? ""}
                              placeholder="%"
                              onChange={e => updateBloque(eIdx, bIdx, "pct", e.target.value)}
                              style={cellInput({fontSize:13,color:"var(--gold)",width:34})}
                            />
                          </td>
                          <td style={{padding:"2px 1px",textAlign:"center",
                            border:"1px solid var(--border)",width:30}}>
                            <input type="text" className="no-spin"
                              value={b.series ?? ""}
                              placeholder="—"
                              onChange={e => {
                                const raw = e.target.value;
                                // Allow formats like "2+2" or plain numbers
                                updateSemanas(ss => {
                                  const ej2 = ss[semActiva].turnos[turnoActivo].ejercicios[eIdx];
                                  if (!ej2.bloques) ej2.bloques = Array.from({length: numBloques}, mkBloqueBasica);
                                  ej2.bloques[bIdx] = { ...ej2.bloques[bIdx], series: raw === "" ? null : (isNaN(Number(raw)) ? raw : Number(raw)) };
                                  return ss;
                                });
                              }}
                              style={cellInput({width:28})}
                            />
                          </td>
                          <td style={{padding:"2px 1px",textAlign:"center",
                            border:"1px solid var(--border)",width:30}}>
                            <input type="number" className="no-spin"
                              value={b.reps ?? ""}
                              placeholder="—"
                              onChange={e => updateBloque(eIdx, bIdx, "reps", e.target.value)}
                              style={cellInput({width:28})}
                            />
                          </td>
                          <td style={{padding:"2px 1px",textAlign:"center",
                            border:"1px solid var(--border)",
                            borderRadius:"0 5px 5px 0",width:40}}>
                            <input type="number" step="0.5" className="no-spin"
                              value={calcKgBasica(ej.ejercicio_id, b.pct) ?? b.kg ?? ""}
                              readOnly
                              style={cellInput({width:38,color:"var(--muted)",fontSize:12})}
                            />
                          </td>
                        </React.Fragment>
                      ))}
                      {/* Spacer for the "+" column */}
                      <td style={{border:"none"}}/>
                      {/* Actions */}
                      <td style={{padding:0,textAlign:"center",border:"none"}}>
                        <div style={{display:"flex",gap:1,justifyContent:"center"}}>
                          {eIdx > 0 && (
                            <button onClick={() => moveEj(eIdx, -1)} title="Mover arriba"
                              style={{background:"none",border:"none",color:"var(--muted)",
                                cursor:"pointer",fontSize:10,padding:"2px"}}>▲</button>
                          )}
                          {eIdx < ejs.length - 1 && (
                            <button onClick={() => moveEj(eIdx, 1)} title="Mover abajo"
                              style={{background:"none",border:"none",color:"var(--muted)",
                                cursor:"pointer",fontSize:10,padding:"2px"}}>▼</button>
                          )}
                          <button onClick={() => removeEjercicio(eIdx)} title="Eliminar ejercicio"
                            style={{background:"none",border:"none",color:"var(--red)",
                              cursor:"pointer",fontSize:12,padding:"2px",opacity:.6}}>×</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Agregar ejercicio */}
          <button onClick={addEjercicio}
            style={{marginTop:8,padding:"6px 16px",borderRadius:8,
              border:"1px dashed var(--border)",background:"transparent",
              color:"var(--gold)",cursor:"pointer",fontSize:12,
              fontFamily:"'DM Sans'",fontWeight:600,width:"100%"}}>
            + Agregar ejercicio
          </button>

          {/* Selector rápido de ejercicios */}
          {ejPickerOpen !== null && (
            <Modal title="Seleccionar ejercicio" onClose={() => setEjPickerOpen(null)}>
              <div style={{maxHeight:400,overflowY:"auto",display:"flex",flexDirection:"column",gap:2}}>
                {normativos.map(e => (
                  <button key={e.id} onClick={() => {
                    setEjercicioId(ejPickerOpen, e.id);
                    setEjPickerOpen(null);
                  }} style={{
                    display:"flex",gap:8,alignItems:"center",padding:"6px 10px",
                    background:"var(--surface2)",border:"1px solid var(--border)",
                    borderRadius:6,cursor:"pointer",textAlign:"left",width:"100%"
                  }}>
                    <span style={{fontFamily:"'Bebas Neue'",fontSize:16,
                      color:CAT_COLOR[e.categoria],minWidth:28,textAlign:"center"}}>{e.id}</span>
                    <span style={{fontSize:12,color:"var(--text)",flex:1}}>{e.nombre}</span>
                    <span style={{fontSize:10,color:CAT_COLOR[e.categoria]}}>{e.categoria}</span>
                  </button>
                ))}
              </div>
            </Modal>
          )}

          {/* Info resumen del turno */}
          {(() => {
            const ejsConDatos = ejs.filter(e => e.ejercicio_id);
            if (ejsConDatos.length === 0) return null;
            let totalReps = 0;
            ejsConDatos.forEach(e => {
              (e.bloques || []).forEach(b => {
                if (b.reps && b.series) {
                  const s = typeof b.series === 'string' && b.series.includes('+')
                    ? b.series.split('+').reduce((a, v) => a + Number(v), 0)
                    : Number(b.series) || 0;
                  totalReps += s * (Number(b.reps) || 0);
                }
              });
            });
            return (
              <div style={{marginTop:12,display:"flex",gap:16,flexWrap:"wrap",
                padding:"8px 12px",background:"var(--surface2)",borderRadius:8}}>
                <div style={{fontSize:11,color:"var(--muted)"}}>
                  Ejercicios: <span style={{color:"var(--gold)",fontWeight:700}}>{ejsConDatos.length}</span>
                </div>
                {totalReps > 0 && (
                  <div style={{fontSize:11,color:"var(--muted)"}}>
                    Total reps turno: <span style={{color:"var(--gold)",fontWeight:700}}>{totalReps}</span>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}


function ResumenGrupos({ semanas, meso, semPctOverrides, semPctManual, setSemPctOverrides, setSemPctManual, onRequestReset, onGuardarDistribucion, onBeforeChange }) {
  const grupos = ["Arranque", "Envion", "Tirones", "Piernas"];
  const [tooltip, setTooltip] = useState(null);
  const _rgLastPush = useRef(0);
  const _rgBefore = () => { try { if (onBeforeChange) { const n=Date.now(); if(n-_rgLastPush.current>300){_rgLastPush.current=n;onBeforeChange();} } } catch {} };
  const _rgBeforeForced = () => { try { if (onBeforeChange) { _rgLastPush.current=0; onBeforeChange(true); } } catch {} };

  const RANGES = { Arranque:[1,19], Envion:[20,48], Tirones:[49,68], Piernas:[69,78] };

  const bySemana = semanas.map(sem => {
    const { porGrupo, totalSem: total } = calcSembradoSemana(sem);
    const conteo = {};
    grupos.forEach(g => { conteo[g] = porGrupo[g].total; });
    // Largest-remainder para que la suma sea exactamente 100
    const exact  = grupos.map(g => total > 0 ? porGrupo[g].total / total * 100 : 0);
    const floors = exact.map(Math.floor);
    const rem    = 100 - floors.reduce((a,b)=>a+b,0);
    exact.map((v,i) => [v - Math.floor(v), i])
         .sort((a,b) => b[0]-a[0])
         .slice(0, rem)
         .forEach(([,i]) => floors[i]++);
    const pcts = {};
    grupos.forEach((g,i) => { pcts[g] = conteo[g] > 0 ? floors[i] : 0; });
    return { conteo, total, pcts };
  });

  const totalConteo = { Arranque:0, Envion:0, Tirones:0, Piernas:0 };
  let grandTotal = 0;
  bySemana.forEach(s => { grupos.forEach(g => { totalConteo[g] += s.conteo[g]; }); grandTotal += s.total; });
  // Largest-remainder para totalPcts también
  const totalPcts = {};
  {
    const exact  = grupos.map(g => grandTotal > 0 ? totalConteo[g] / grandTotal * 100 : 0);
    const floors = exact.map(Math.floor);
    const rem    = 100 - floors.reduce((a,b)=>a+b,0);
    exact.map((v,i)=>[v-Math.floor(v),i]).sort((a,b)=>b[0]-a[0])
         .slice(0,rem).forEach(([,i])=>floors[i]++);
    grupos.forEach((g,i) => { totalPcts[g] = totalConteo[g]>0 ? floors[i] : 0; });
  }

  if (grandTotal === 0) return null;

  const getVal = (g, sIdx) => {
    const k = `${g}-${sIdx}`;
    const raw = semPctManual.has(k) ? semPctOverrides[k] : bySemana[sIdx].pcts[g];
    return raw !== undefined && raw !== "" ? Math.round(Number(raw)) : raw;
  };
  const isManual = (g, sIdx) => semPctManual.has(`${g}-${sIdx}`);
  const setVal = (g, sIdx, val) => {
    const k = `${g}-${sIdx}`;
    setSemPctOverrides(prev => ({...prev, [k]: val === "" ? "" : Number(val)}));
    setSemPctManual(prev => new Set([...prev, k]));
  };
  const resetSingleVal = (g, sIdx, e) => {
    if (e.detail === 2) {
      _rgBeforeForced(); // push A
      const k = `${g}-${sIdx}`;
      setSemPctManual(prev => { const s = new Set(prev); s.delete(k); return s; });
      setTimeout(() => { try { if(onBeforeChange){_rgLastPush.current=0;onBeforeChange(true);} } catch{} }, 0); // push B
    }
  };

  // Suma de % por columna de semana (solo validar si hay ejercicios sembrados)
  const sumBySem = semanas.map((_, sIdx) => {
    if (bySemana[sIdx]?.total === 0) return 100; // sin sembrado → no validar
    const raw = grupos.reduce((acc, g) => acc + (Number(getVal(g, sIdx)) || 0), 0);
    return Math.round(raw);
  });

  const buildDetalle = (g, semIdx) => {
    const [lo, hi] = RANGES[g];
    const sem = semanas[semIdx];
    const rows = [];
    sem.turnos.forEach((t, tIdx) => {
      const ids = t.ejercicios
        .filter(e => e.ejercicio_id && Number(e.ejercicio_id) >= lo && Number(e.ejercicio_id) <= hi)
        .map(e => Number(e.ejercicio_id));
      if (ids.length > 0) rows.push({ turno: tIdx+1, dia: t.dia, momento: t.momento, ids });
    });
    return rows;
  };

  const thBase = { padding:"6px 8px", background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:6, textAlign:"center" };
  const manualCount = semPctManual.size;

  return (
    <div style={{marginTop:16, overflowX:"auto"}}>
      {manualCount > 0 && (
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,
          padding:"4px 10px",background:"transparent",border:"none",borderRadius:7}}>
          <span style={{fontSize:11,color:"var(--muted)"}}>
            ✏ {manualCount} {manualCount===1?"valor modificado":"valores modificados"}
          </span>
          {onGuardarDistribucion && (
            <button
              onClick={()=>{
                const dist = { semPcts:{}, turnoPcts:{} };
                semanas.forEach((s,sIdx)=>{
                  ["Arranque","Envion","Tirones","Piernas"].forEach(g=>{
                    const k=`${g}-${sIdx}`;
                    if(semPctOverrides[k]!==undefined) dist.semPcts[k]=semPctOverrides[k];
                  });
                });
                onGuardarDistribucion(dist);
              }}
              style={{background:"none",border:"none",color:"var(--muted)",
                fontSize:10,padding:"2px 6px",cursor:"pointer",textDecoration:"underline"}}
              onMouseEnter={e=>e.target.style.color="var(--text)"}
              onMouseLeave={e=>e.target.style.color="var(--muted)"}>
              <Library size={10}/> guardar distribución
            </button>
          )}
          <button
            onClick={() => onRequestReset("todos los % de grupos por semana", () => {
              setSemPctOverrides({}); setSemPctManual(new Set());
            })}
            style={{marginLeft:"auto",background:"none",border:"none",
              color:"var(--muted)",fontSize:10,padding:"2px 4px",cursor:"pointer",
              textDecoration:"underline"}}
            onMouseEnter={e=>e.target.style.color="var(--text)"}
            onMouseLeave={e=>e.target.style.color="var(--muted)"}>
            resetear todo
          </button>
        </div>
      )}
      <div style={{overflowX:"auto"}}>
      <table style={{borderCollapse:"separate", borderSpacing:4, minWidth:400, width:"100%"}}>
        <thead>
          <tr>
            <th style={{...thBase, textAlign:"left", width:120, fontSize:10, color:"var(--muted)", fontWeight:700, textTransform:"uppercase", letterSpacing:".07em"}}/>
            {semanas.map((s, sIdx) => {
              const sum = sumBySem[sIdx];
              const ok  = Math.abs(sum - 100) < 0.01;
              const hasAnySembrado = bySemana[sIdx]?.total > 0;
              return (
                <th key={s.id} style={{...thBase, border:`1px solid ${ok ? "var(--border)" : "rgba(232,71,71,.5)"}`}}>
                  <div style={{fontFamily:"'Bebas Neue'",fontSize:15,color:"var(--gold)",lineHeight:1}}>Sem {s.numero}</div>
                  {!ok
                    ? <div style={{fontSize:9,marginTop:1,color:"var(--red)",fontWeight:700}}>Σ={sum}% ≠ 100</div>
                    : hasAnySembrado
                      ? <div style={{fontSize:9,marginTop:1,color:"var(--muted)"}}>{bySemana[sIdx].total} ejs</div>
                      : null
                  }
                </th>
              );
            })}
            <th style={{...thBase, border:"1px solid rgba(232,197,71,.3)"}}>
              <div style={{fontFamily:"'Bebas Neue'",fontSize:15,color:"var(--gold)",lineHeight:1}}>Total</div>
              <div style={{fontSize:9,color:"var(--muted)",marginTop:1}}>{grandTotal} ejs</div>
            </th>
          </tr>
        </thead>
        <tbody>
          {grupos.map(g => {
            if (!bySemana.some(s => s.conteo[g] > 0)) return null;
            const col = CAT_COLOR[g];
            return (
              <tr key={g}>
                <td style={{padding:"6px 10px", fontFamily:"'Bebas Neue'", fontSize:15, color:col, letterSpacing:".04em"}}>{g}</td>
                {bySemana.map((s, sIdx) => {
                  const manual = isManual(g, sIdx);
                  const val = getVal(g, sIdx);
                  const semOk = Math.abs(sumBySem[sIdx] - 100) < 0.01;
                  return (
                    <td key={sIdx}
                      style={{
                        padding:"6px 8px", textAlign:"center",
                        background: s.conteo[g] > 0 ? `${col}0d` : "transparent",
                        border:`1px solid ${manual ? `${col}70` : s.conteo[g] > 0 ? `${col}30` : "var(--border)"}`,
                        borderRadius:6, position:"relative"
                      }}
                      onMouseEnter={e => {
                        if (s.conteo[g] === 0 && !manual) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltip({ g, semIdx: sIdx, x: rect.left, y: rect.top });
                      }}
                      onMouseLeave={() => setTooltip(null)}>
                      {manual && (
                        <span style={{position:"absolute",top:2,right:3,
                          width:4,height:4,borderRadius:"50%",background:"var(--blue)"}}/>
                      )}
                      {(s.conteo[g] > 0 || manual) ? (
                        <>
                          <div style={{display:"flex",alignItems:"baseline",justifyContent:"center",gap:1}}>
                            <input
                              type="number"
                              className="no-spin"
                              value={val ?? ""}
                              placeholder="0"
                              title={manual ? "Modificado · doble click para resetear" : "% del grupo en esta semana"}
                              onFocus={_rgBefore}
                              onChange={e => setVal(g, sIdx, e.target.value)}
                              onClick={e => resetSingleVal(g, sIdx, e)}
                              style={{
                                width:44, background:"transparent", border:"none",
                                fontFamily:"'Bebas Neue'", fontSize:20, textAlign:"right",
                                color: col, lineHeight:1,
                                outline:"none", padding:0,
                                MozAppearance:"textfield", appearance:"textfield", cursor:"text"
                              }}
                            />
                            <span style={{fontFamily:"'Bebas Neue'",fontSize:13,color:col,lineHeight:1}}>%</span>
                          </div>
                          <div style={{fontSize:11,color:col,fontFamily:"'Bebas Neue'",lineHeight:1,marginTop:2}}>
                            {meso ? Math.round(meso.volumen_total * (semanas[sIdx].pct_volumen/100) * ((Number(getVal(g,sIdx))||0)/100)) : ""}
                            <span style={{fontSize:9,color:"var(--muted)",fontFamily:"'DM Sans'",marginLeft:2}}>reps</span>
                          </div>
                          {tooltip?.g===g && tooltip?.semIdx===sIdx && (()=>{
                            const rows = buildDetalle(g, sIdx);
                            return (
                              <div style={{
                                position:"fixed", left:tooltip.x, bottom:`calc(100vh - ${tooltip.y}px + 6px)`, top:"auto",
                                zIndex:200, minWidth:"fit-content", maxWidth:"80vw",
                                background:"var(--surface)", border:`1px solid ${col}50`,
                                borderRadius:10, boxShadow:"0 8px 32px rgba(0,0,0,.5)",
                                padding:"10px 12px", pointerEvents:"none", textAlign:"left"
                              }}>
                                <div style={{fontFamily:"'Bebas Neue'",fontSize:15,color:col,letterSpacing:".05em",marginBottom:6,lineHeight:1}}>{g} — Sem {sIdx+1}</div>
                                {rows.map(t => (
                                  <div key={t.turno} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 0",borderTop:"1px solid var(--border)"}}>
                                    <span style={{fontFamily:"'Bebas Neue'",fontSize:16,color:"var(--gold)",minWidth:24,flexShrink:0}}>T{t.turno}</span>
                                    {t.dia && <span style={{fontSize:10,color:"var(--blue)",fontWeight:600,minWidth:44,flexShrink:0}}>{t.dia.slice(0,3)}{t.momento?` ${t.momento.slice(0,1)}`:""}</span>}
                                    <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                                      {t.ids.map((id,k) => <span key={k} style={{fontFamily:"'Bebas Neue'",background:`${col}20`,color:col,fontSize:18,lineHeight:1,padding:"2px 8px",borderRadius:5}}>{id}</span>)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </>
                      ) : <span style={{color:"var(--muted)",fontSize:12}}>—</span>}
                    </td>
                  );
                })}
                <td style={{padding:"6px 8px", textAlign:"center", background:`${col}14`, border:`1px solid ${col}40`, borderRadius:6,
                    position:"relative", cursor:"default"}}
                  onMouseEnter={e => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTooltip({ g, type:"total", x: rect.left, y: rect.top });
                  }}
                  onMouseLeave={() => setTooltip(null)}>
                  <div style={{fontFamily:"'Bebas Neue'",fontSize:20,color:col,lineHeight:1}}>{totalPcts[g]}%</div>
                  <div style={{fontSize:10,color:"var(--muted)",marginTop:2}}>{totalConteo[g]} ejs</div>
                  {tooltip?.g===g && tooltip?.type==="total" && (()=>{
                    // Desglose por semana
                    return (
                      <div style={{
                        position:"fixed", left:tooltip.x, bottom:`calc(100vh - ${tooltip.y}px + 6px)`, top:"auto",
                        zIndex:200, minWidth:"fit-content", maxWidth:"80vw",
                        background:"var(--surface)", border:`1px solid ${col}50`,
                        borderRadius:10, boxShadow:"0 8px 32px rgba(0,0,0,.5)",
                        padding:"10px 12px", pointerEvents:"none", textAlign:"left"
                      }}>
                        <div style={{fontFamily:"'Bebas Neue'",fontSize:15,color:col,letterSpacing:".05em",marginBottom:6,lineHeight:1}}>
                          {g} — Total mesociclo
                        </div>
                        {bySemana.map((s, sIdx) => {
                          if (s.conteo[g] === 0) return null;
                          const rows = buildDetalle(g, sIdx);
                          return (
                            <div key={sIdx} style={{padding:"6px 0",borderTop:"1px solid var(--border)"}}>
                              <div style={{fontFamily:"'Bebas Neue'",fontSize:13,color:"var(--gold)",marginBottom:3}}>Sem {sIdx+1}</div>
                              {rows.map(t => (
                                <div key={t.turno} style={{display:"flex",alignItems:"center",gap:6,padding:"3px 0"}}>
                                  <span style={{fontFamily:"'Bebas Neue'",fontSize:14,color:"var(--gold)",minWidth:24,flexShrink:0}}>T{t.turno}</span>
                                  {t.dia && <span style={{fontSize:10,color:"var(--blue)",fontWeight:600,minWidth:44,flexShrink:0}}>{t.dia.slice(0,3)}{t.momento?` ${t.momento.slice(0,1)}`:""}</span>}
                                  <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                                    {t.ids.map((id,k) => <span key={k} style={{fontFamily:"'Bebas Neue'",background:`${col}20`,color:col,fontSize:16,lineHeight:1,padding:"2px 6px",borderRadius:4}}>{id}</span>)}
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

function DistribucionTurnos({ semanas, meso, turnoPctOverrides, turnoPctManual, setTurnoPctOverrides, setTurnoPctManual, onRequestReset, onBeforeChange, semPctOverrides, semPctManual }) {
  const [semActiva, setSemActiva] = useState(0);
  const containerRef = useRef(null);
  const _dtLastPush = useRef(0);
  const _dtBefore = () => { try { if (onBeforeChange) { const n=Date.now(); if(n-_dtLastPush.current>300){_dtLastPush.current=n;onBeforeChange();} } } catch {} };
  const _dtBeforeForced = () => { try { if (onBeforeChange) { _dtLastPush.current=0; onBeforeChange(true); } } catch {} };

  const cambiarSemana = (i) => {
    setSemActiva(i);
    setTimeout(() => {
      containerRef.current?.scrollIntoView({ behavior:"smooth", block:"start" });
    }, 30);
  };
  const grupos = ["Arranque", "Envion", "Tirones", "Piernas"];
  const RANGES = { Arranque:[1,19], Envion:[20,48], Tirones:[49,68], Piernas:[69,78] };

  const calcSemana = (sem) => {
    const result = {};
    grupos.forEach(g => {
      const [lo, hi] = RANGES[g];
      const countPorTurno = sem.turnos.map(turno =>
        turno.ejercicios.filter(ej => {
          const id = Number(ej.ejercicio_id);
          return ej.ejercicio_id && id >= lo && id <= hi;
        }).length
      );
      const totalGrupo = countPorTurno.reduce((s,v) => s+v, 0);
      // Largest-remainder: garantiza suma exactamente 100
      const pctPorTurno = (() => {
        if (totalGrupo === 0) return countPorTurno.map(() => 0);
        const exact  = countPorTurno.map(c => c / totalGrupo * 100);
        const floors = exact.map(Math.floor);
        const rem    = 100 - floors.reduce((s,v) => s+v, 0);
        const order  = exact.map((v,i) => [v - Math.floor(v), i]).sort((a,b) => b[0]-a[0]);
        order.slice(0, rem).forEach(([,i]) => floors[i]++);
        return floors;
      })();
      const idsPorTurno = sem.turnos.map(turno =>
        turno.ejercicios
          .filter(ej => { const id = Number(ej.ejercicio_id); return ej.ejercicio_id && id >= lo && id <= hi; })
          .map(ej => Number(ej.ejercicio_id))
      );
      result[g] = { countPorTurno, totalGrupo, pctPorTurno, idsPorTurno };
    });
    return result;
  };

  const sem     = semanas[semActiva];
  const data    = calcSemana(sem);
  const turnos  = sem.turnos;
  const hasData = grupos.some(g => data[g].totalGrupo > 0);

  // Helper: % efectivo de un grupo en una semana (respeta overrides de ResumenGrupos)
  const _getSemPct = (g, sIdx) => {
    const k = `${g}-${sIdx}`;
    if (semPctManual?.has(k)) return Number(semPctOverrides?.[k]) || 0;
    const { porGrupo, totalSem } = calcSembradoSemana(semanas[sIdx]);
    return totalSem > 0 ? porGrupo[g].total / totalSem * 100 : 0;
  };

  const getVal = (g, tIdx) => {
    const k = `${g}-${semActiva}-${tIdx}`;
    const raw = turnoPctManual.has(k) ? turnoPctOverrides[k] : data[g].pctPorTurno[tIdx];
    return raw !== undefined && raw !== "" ? Math.round(Number(raw)) : raw;
  };
  const isManual = (g, tIdx) => turnoPctManual.has(`${g}-${semActiva}-${tIdx}`);
  const setVal = (g, tIdx, val) => {
    const k = `${g}-${semActiva}-${tIdx}`;
    setTurnoPctOverrides(prev => ({...prev, [k]: val === "" ? "" : Number(val)}));
    setTurnoPctManual(prev => new Set([...prev, k]));
  };
  const resetSingleVal = (g, tIdx, e) => {
    if (e.detail === 2) {
      _dtBeforeForced(); // push A
      const k = `${g}-${semActiva}-${tIdx}`;
      setTurnoPctManual(prev => { const s = new Set(prev); s.delete(k); return s; });
      setTimeout(() => { try { if(onBeforeChange){_dtLastPush.current=0;onBeforeChange(true);} } catch{} }, 0); // push B
    }
  };

  // Suma de % por fila de grupo (debe ser 100 por grupo en la semana activa)
  const sumByGrupo = {};
  grupos.forEach(g => {
    const raw = data[g].pctPorTurno.reduce((acc, _, tIdx) =>
      acc + (Number(getVal(g, tIdx)) || 0), 0
    );
    sumByGrupo[g] = Math.round(raw);
  });

  const thBase = {
    padding:"5px 6px", background:"var(--surface2)",
    border:"1px solid var(--border)", borderRadius:5,
    textAlign:"center", fontSize:11
  };

  const [tooltip, setTooltip] = useState(null);
  const [cellTip, setCellTip] = useState(null);

  const buildTooltip = (s) => {
    const resumen = [];
    s.turnos.forEach((t, tIdx) => {
      const ids = t.ejercicios.filter(e => e.ejercicio_id).map(e => Number(e.ejercicio_id));
      if (ids.length === 0) return;
      resumen.push({ turno: tIdx+1, dia: t.dia, momento: t.momento, ids });
    });
    return resumen;
  };

  const manualInSem = [...turnoPctManual].filter(k => k.includes(`-${semActiva}-`)).length;

  return (
    <div ref={containerRef} style={{marginTop:16}}>
      {/* Tabs de semanas */}
      <div className="semana-tabs" style={{marginBottom:10, position:"relative"}}>
        {semanas.map((s,i) => (
          <div key={s.id} style={{position:"relative", display:"inline-block"}}>
            <button
              className={`semana-tab${semActiva===i?" active":""}`}
              onClick={()=>cambiarSemana(i)}
              onMouseEnter={e => {
                const rect = e.currentTarget.getBoundingClientRect();
                setTooltip({semIdx:i, x:rect.left, y:rect.top});
              }}
              onMouseLeave={()=>setTooltip(null)}>
              Semana {s.numero}
            </button>
            {tooltip?.semIdx===i && (()=>{
              const resumen = buildTooltip(s);
              const totalEjs = resumen.reduce((a,t)=>a+t.ids.length,0);
              return (
                <div style={{
                  position:"fixed", left:tooltip.x, bottom:`calc(100vh - ${tooltip.y}px + 6px)`, top:"auto",
                  zIndex:200, minWidth:"fit-content", maxWidth:"80vw",
                  background:"var(--surface)", border:"1px solid var(--border)",
                  borderRadius:10, boxShadow:"0 8px 32px rgba(0,0,0,.5)",
                  padding:"12px 14px", pointerEvents:"none"
                }}>
                  <div style={{fontFamily:"'Bebas Neue'",fontSize:17,color:"var(--gold)",
                    letterSpacing:".05em",marginBottom:8,lineHeight:1}}>
                    Semana {s.numero}
                    <span style={{fontFamily:"'DM Sans'",fontSize:11,color:"var(--muted)",fontWeight:400,marginLeft:8}}>
                      {totalEjs} ejs · {resumen.length} turnos
                    </span>
                  </div>
                  {resumen.length === 0
                    ? <div style={{fontSize:11,color:"var(--muted)"}}>Sin ejercicios sembrados</div>
                    : resumen.map(t => (
                        <div key={t.turno} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0",borderTop:"1px solid var(--border)"}}>
                          <span style={{fontFamily:"'Bebas Neue'",fontSize:14,color:"var(--gold)",minWidth:22,flexShrink:0}}>T{t.turno}</span>
                          {t.dia && <span style={{fontSize:10,color:"var(--blue)",fontWeight:600,minWidth:46,flexShrink:0}}>{t.dia.slice(0,3)}{t.momento?` ${t.momento.slice(0,1)}`:""}</span>}
                          <div style={{display:"flex",gap:4,flex:1,flexWrap:"wrap"}}>
                            {t.ids.map((id,k) => {
                              const ej = EJERCICIOS.find(e=>e.id===id);
                              const col = ej ? CAT_COLOR[ej.categoria] : "var(--muted)";
                              return <span key={k} style={{background:`${col}20`,color:col,fontSize:10,fontWeight:700,padding:"1px 5px",borderRadius:4}}>{id}</span>;
                            })}
                          </div>
                        </div>
                      ))
                  }
                </div>
              );
            })()}
          </div>
        ))}
      </div>

      {manualInSem > 0 && (
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,
          padding:"4px 10px",background:"transparent",border:"none",borderRadius:7}}>
          <span style={{fontSize:11,color:"var(--muted)"}}>
            ✏ {manualInSem} {manualInSem===1?"valor modificado":"valores modificados"}
          </span>
          <button onClick={() => onRequestReset(`distribución de turnos — Semana ${semActiva+1}`, () => {
            const toRemove = [...turnoPctManual].filter(k=>k.includes(`-${semActiva}-`));
            setTurnoPctManual(prev => { const s=new Set(prev); toRemove.forEach(k=>s.delete(k)); return s; });
          })}
            style={{marginLeft:"auto",background:"none",border:"none",
              color:"var(--muted)",fontSize:10,padding:"2px 4px",cursor:"pointer",
              textDecoration:"underline"}}
            onMouseEnter={e=>e.target.style.color="var(--text)"}
            onMouseLeave={e=>e.target.style.color="var(--muted)"}>
            resetear semana
          </button>
        </div>
      )}

      {!hasData ? (
        <div style={{padding:"16px 12px", textAlign:"center", color:"var(--muted)", fontSize:12}}>
          Sin ejercicios sembrados en esta semana
        </div>
      ) : (
      <div style={{overflowX:"auto"}}>
        <table style={{borderCollapse:"separate", borderSpacing:3, minWidth:600}}>
          <thead>
            <tr>
              <th style={{...thBase, textAlign:"left", width:110, fontSize:10, color:"var(--muted)", fontWeight:700, textTransform:"uppercase", letterSpacing:".07em"}}>Grupo</th>
              {turnos.map((t,i) => (
                <th key={i} style={thBase}>
                  <div style={{fontFamily:"'Bebas Neue'",fontSize:13,color:"var(--gold)",lineHeight:1}}>T{i+1}</div>
                  {t.dia && <div style={{fontSize:8,color:"var(--muted)",marginTop:1,lineHeight:1}}>{t.dia.slice(0,3)}{t.momento?` ${t.momento.slice(0,1)}`:""}</div>}
                </th>
              ))}
              <th style={{...thBase, border:"1px solid rgba(232,197,71,.3)"}}>
                <div style={{fontFamily:"'Bebas Neue'",fontSize:13,color:"var(--gold)",lineHeight:1}}>Total</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {grupos.map(g => {
              const d = data[g];
              if (d.totalGrupo === 0) return null;
              const col = CAT_COLOR[g];
              const rowSum = sumByGrupo[g];
              const rowOk  = Math.abs(rowSum - 100) < 0.01;
              return (
                <tr key={g}>
                  <td style={{padding:"5px 8px",fontFamily:"'Bebas Neue'",fontSize:14,
                    color:col, letterSpacing:".03em"}}>
                    {g}
                  </td>
                  {d.pctPorTurno.map((calcPct, tIdx) => {
                    const manual = isManual(g, tIdx);
                    const val = getVal(g, tIdx);
                    const hasEjs = d.countPorTurno[tIdx] > 0;
                    return (
                      <td key={tIdx}
                        style={{
                          padding:"4px 5px", textAlign:"center",
                          background: hasEjs ? `${col}0d` : "transparent",
                          border:`1px solid ${manual ? `${col}80` : hasEjs ? `${col}30` : "var(--border)"}`,
                          borderRadius:5, position:"relative"
                        }}
                        onMouseEnter={e => {
                          if (!hasEjs && !manual) return;
                          const rect = e.currentTarget.getBoundingClientRect();
                          setCellTip({ g, tIdx, x: rect.left, y: rect.top });
                        }}
                        onMouseLeave={() => setCellTip(null)}>
                        {manual && <span style={{position:"absolute",top:2,right:3,width:4,height:4,borderRadius:"50%",background:"var(--blue)"}}/>}
                        {(hasEjs || manual) ? (
                          <>
                            <div style={{display:"flex",alignItems:"baseline",justifyContent:"center",gap:1}}>
                              <input
                                type="number"
                                className="no-spin"
                                value={val ?? ""}
                                placeholder="0"
                                title={manual ? "Modificado · doble click para resetear" : "% en este turno"}
                                onFocus={_dtBefore}
                                onChange={e => setVal(g, tIdx, e.target.value)}
                                onClick={e => resetSingleVal(g, tIdx, e)}
                                style={{
                                  width:38, background:"transparent", border:"none",
                                  fontFamily:"'Bebas Neue'", fontSize:16, textAlign:"right",
                                  color: col, lineHeight:1,
                                  outline:"none", padding:0,
                                  MozAppearance:"textfield", appearance:"textfield", cursor:"text"
                                }}
                              />
                              <span style={{fontFamily:"'Bebas Neue'",fontSize:11,color:col,lineHeight:1}}>%</span>
                            </div>
                            {(() => {
                              // Fix % Semanal: usa meso.semanas directo (siempre actualizado)
                              const volSem = meso ? meso.volumen_total * (meso.semanas[semActiva].pct_volumen/100) : 0;
                              // Fix % Bloques: usa _getSemPct (respeta overrides de ResumenGrupos)
                              const pctGSem = _getSemPct(g, semActiva) / 100;
                              const reps = Math.round(volSem * pctGSem * (Number(getVal(g,tIdx))||0) / 100);
                              return reps > 0 ? (
                                <div style={{fontSize:11,color:col,fontFamily:"'Bebas Neue'",lineHeight:1,marginTop:2}}>
                                  {reps}<span style={{fontSize:9,color:"var(--muted)",fontFamily:"'DM Sans'",marginLeft:2}}>reps</span>
                                </div>
                              ) : null;
                            })()}
                            {cellTip?.g===g && cellTip?.tIdx===tIdx && (
                              <div style={{
                                position:"fixed", left:cellTip.x,
                                bottom:`calc(100vh - ${cellTip.y}px + 6px)`, top:"auto",
                                zIndex:200, minWidth:"fit-content", maxWidth:"80vw",
                                background:"var(--surface)", border:`1px solid ${col}50`,
                                borderRadius:10, boxShadow:"0 8px 32px rgba(0,0,0,.5)",
                                padding:"8px 12px", pointerEvents:"none", textAlign:"left"
                              }}>
                                <div style={{fontFamily:"'Bebas Neue'",fontSize:16,color:col,marginBottom:8,lineHeight:1}}>
                                  {g} — T{tIdx+1}
                                  {turnos[tIdx]?.dia && <span style={{fontFamily:"'DM Sans'",fontSize:10,color:"var(--blue)",fontWeight:600,marginLeft:8}}>{turnos[tIdx].dia.slice(0,3)}{turnos[tIdx].momento?` ${turnos[tIdx].momento.slice(0,1)}`:""}</span>}
                                </div>
                                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                                  {d.idsPorTurno[tIdx].map((id,k) => (
                                    <span key={k} style={{fontFamily:"'Bebas Neue'",background:`${col}20`,color:col,fontSize:20,lineHeight:1,padding:"3px 10px",borderRadius:5}}>{id}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        ) : <span style={{color:"var(--muted)",fontSize:11}}>—</span>}
                      </td>
                    );
                  })}
                  <td style={{
                    padding:"4px 5px",textAlign:"center",
                    background: rowOk ? `${col}14` : "rgba(232,71,71,.08)",
                    border:`1px solid ${rowOk ? `${col}40` : "rgba(232,71,71,.4)"}`,
                    borderRadius:5, position:"relative", cursor:"default"
                  }}
                  onMouseEnter={e => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTooltip({type:"dtTotal", g, x:rect.left, y:rect.top});
                  }}
                  onMouseLeave={() => setTooltip(null)}>
                    <div style={{fontFamily:"'Bebas Neue'",fontSize:16,color: rowOk ? col : "var(--red)",lineHeight:1}}>
                      {rowOk ? "100%" : `${rowSum}%`}
                    </div>
                    <div style={{fontSize:9,color: rowOk ? "var(--muted)" : "var(--red)",marginTop:1,fontWeight: rowOk ? 400 : 700}}>
                      {rowOk ? `${d.totalGrupo} ejs` : "≠ 100"}
                    </div>
                    {tooltip?.type==="dtTotal" && tooltip?.g===g && (()=>{
                      return (
                        <div style={{
                          position:"fixed", left:tooltip.x, bottom:`calc(100vh - ${tooltip.y}px + 6px)`, top:"auto",
                          zIndex:200, minWidth:"fit-content", maxWidth:"80vw",
                          background:"var(--surface)", border:`1px solid ${col}50`,
                          borderRadius:10, boxShadow:"0 8px 32px rgba(0,0,0,.5)",
                          padding:"10px 12px", pointerEvents:"none", textAlign:"left"
                        }}>
                          <div style={{fontFamily:"'Bebas Neue'",fontSize:15,color:col,letterSpacing:".05em",marginBottom:6,lineHeight:1}}>
                            {g} — Sem {semActiva+1}
                          </div>
                          {d.idsPorTurno.map((ids, tIdx) => {
                            if (!ids.length) return null;
                            return (
                              <div key={tIdx} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 0",borderTop:"1px solid var(--border)"}}>
                                <span style={{fontFamily:"'Bebas Neue'",fontSize:16,color:"var(--gold)",minWidth:24,flexShrink:0}}>T{tIdx+1}</span>
                                {turnos[tIdx]?.dia && <span style={{fontSize:10,color:"var(--blue)",fontWeight:600,minWidth:44,flexShrink:0}}>{turnos[tIdx].dia.slice(0,3)}{turnos[tIdx].momento?` ${turnos[tIdx].momento.slice(0,1)}`:""}</span>}
                                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                                  {ids.map((id,k) => <span key={k} style={{fontFamily:"'Bebas Neue'",background:`${col}20`,color:col,fontSize:18,lineHeight:1,padding:"2px 8px",borderRadius:4}}>{id}</span>)}
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


// ─── HELPERS DE CÁLCULO COMPARTIDOS ─────────────────────────────────────────
// Usados por ResumenGrupos, DistribucionTurnos y PlanillaTurno

const GRUPO_RANGES = { Arranque:[1,19], Envion:[20,48], Tirones:[49,68], Piernas:[69,78] };
const GRUPOS_KEYS  = ["Arranque","Envion","Tirones","Piernas"];

function getGrupo(ejercicio_id) {
  const id = Number(ejercicio_id);
  for (const [g,[lo,hi]] of Object.entries(GRUPO_RANGES)) {
    if (id >= lo && id <= hi) return g;
  }
  return null;
}

// Cuenta ejercicios sembrados por grupo en UNA semana, por turno
// Returns: { porGrupo: {Arranque:{total, porTurno:[n,n,...]}, ...}, totalSem }
function calcSembradoSemana(sem) {
  const porGrupo = {};
  GRUPOS_KEYS.forEach(g => { porGrupo[g] = { total: 0, porTurno: sem.turnos.map(()=>0) }; });
  let totalSem = 0;

  sem.turnos.forEach((t, tIdx) => {
    t.ejercicios.forEach(e => {
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
function calcRepsEjercicio(sem, turnoIdx, meso) {
  const reps_sem  = meso.volumen_total * (sem.pct_volumen / 100);
  const { porGrupo, totalSem } = calcSembradoSemana(sem);
  const turno = sem.turnos[turnoIdx];
  const repsPorEjId = {};

  GRUPOS_KEYS.forEach(g => {
    const totalGrupoSem = porGrupo[g].total;   // n ejs del grupo en toda la semana
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
    const ejsDelGrupo = turno.ejercicios.filter(e => e.ejercicio_id && getGrupo(e.ejercicio_id) === g);
    if (ejsDelGrupo.length === 0) return;

    // Distribuir equitativamente con rounding correcto
    const base  = Math.floor(repsGrupoTurno / ejsDelGrupo.length);
    const extra = Math.round(repsGrupoTurno) - base * ejsDelGrupo.length;
    ejsDelGrupo.forEach((e, i) => {
      // Key by ejercicio_id so it works even if ej.id (UUID) changes across renders
      repsPorEjId[String(e.ejercicio_id)] = base + (i < extra ? 1 : 0);
    });
  });

  return repsPorEjId;
}

// ─── RESUMEN DE GRUPOS ───────────────────────────────────────────────────────
// ─── SEMBRADO MENSUAL ─────────────────────────────────────────────────────────
const INTENSIDADES = [50,60,70,75,80,85,90,95]; // columnas reales de las tablas IRM
const IRM_VALUES = Array.from({length:31}, (_,i) => 65 + i); // 65..95

// ─── TABLAS DE CALCULADORA ─────────────────────────────────────────────────
const INTENS_COLS = [50,60,70,75,80,85,90,95];
const TABLA_DEFAULT = {
  tabla1: [{"irm": 65, "50": 19, "60": 27, "70": 38, "75": 11, "80": 5, "85": 0, "90": 0, "95": 0}, {"irm": 66, "50": 18, "60": 24, "70": 35, "75": 15, "80": 8, "85": 0, "90": 0, "95": 0}, {"irm": 67, "50": 16, "60": 21, "70": 34, "75": 16.5, "80": 12.5, "85": 0, "90": 0, "95": 0}, {"irm": 68, "50": 15, "60": 19, "70": 31, "75": 17.5, "80": 17.5, "85": 0, "90": 0, "95": 0}, {"irm": 69, "50": 14, "60": 16, "70": 27, "75": 25, "80": 18, "85": 0, "90": 0, "95": 0}, {"irm": 70, "50": 0, "60": 24, "70": 37, "75": 24.4, "80": 10.6, "85": 4, "90": 0, "95": 0}, {"irm": 71, "50": 0, "60": 20, "70": 36, "75": 26, "80": 12, "85": 6, "90": 0, "95": 0}, {"irm": 72, "50": 0, "60": 20, "70": 32, "75": 28, "80": 14, "85": 6, "90": 0, "95": 0}, {"irm": 73, "50": 0, "60": 16, "70": 27, "75": 28, "80": 19, "85": 7, "90": 3, "95": 0}, {"irm": 74, "50": 0, "60": 12, "70": 26, "75": 27, "80": 23, "85": 8, "90": 4, "95": 0}, {"irm": 75, "50": 0, "60": 13, "70": 19, "75": 24, "80": 26, "85": 13, "90": 5, "95": 0}, {"irm": 76, "50": 0, "60": 11, "70": 20, "75": 22.2, "80": 20.8, "85": 20, "90": 6, "95": 0}, {"irm": 77, "50": 0, "60": 8, "70": 17, "75": 22, "80": 25, "85": 21, "90": 7, "95": 0}, {"irm": 78, "50": 0, "60": 8, "70": 19, "75": 18, "80": 23, "85": 22, "90": 8, "95": 2}, {"irm": 79, "50": 0, "60": 0, "70": 19, "75": 21, "80": 26, "85": 24, "90": 10, "95": 0}, {"irm": 80, "50": 0, "60": 0, "70": 18, "75": 18, "80": 25, "85": 24, "90": 15, "95": 0}, {"irm": 81, "50": 0, "60": 0, "70": 10, "75": 20, "80": 28, "85": 22, "90": 15, "95": 5}, {"irm": 82, "50": 0, "60": 0, "70": 0, "75": 0, "80": 70, "85": 20, "90": 10, "95": 0}, {"irm": 83, "50": 0, "60": 0, "70": 0, "75": 0, "80": 50, "85": 40, "90": 10, "95": 0}, {"irm": 84, "50": 0, "60": 0, "70": 0, "75": 0, "80": 40, "85": 40, "90": 20, "95": 0}, {"irm": 85, "50": 0, "60": 0, "70": 0, "75": 0, "80": 30, "85": 40, "90": 30, "95": 0}, {"irm": 86, "50": 0, "60": 0, "70": 0, "75": 0, "80": 25, "85": 40, "90": 25, "95": 10}, {"irm": 87, "50": 0, "60": 0, "70": 0, "75": 0, "80": 10, "85": 50, "90": 30, "95": 10}, {"irm": 88, "50": 0, "60": 0, "70": 0, "75": 0, "80": 10, "85": 40, "90": 30, "95": 20}, {"irm": 89, "50": 0, "60": 0, "70": 0, "75": 0, "80": 10, "85": 20, "90": 50, "95": 20}, {"irm": 90, "50": 0, "60": 0, "70": 10, "75": 20, "80": 28, "85": 22, "90": 15, "95": 5}, {"irm": 91, "50": 0, "60": 0, "70": 0, "75": 0, "80": 0, "85": 10, "90": 70, "95": 20}, {"irm": 92, "50": 0, "60": 0, "70": 0, "75": 0, "80": 0, "85": 10, "90": 50, "95": 40}, {"irm": 93, "50": 0, "60": 0, "70": 0, "75": 0, "80": 0, "85": 10, "90": 30, "95": 60}, {"irm": 94, "50": 0, "60": 0, "70": 0, "75": 0, "80": 0, "85": 10, "90": 10, "95": 80}, {"irm": 95, "50": 0, "60": 0, "70": 0, "75": 0, "80": 0, "85": 0, "90": 0, "95": 100}],
  tabla2: [{"irm": 65, "50": 19, "60": 27, "70": 38, "75": 11, "80": 5, "85": 0, "90": 0, "95": 0}, {"irm": 66, "50": 18, "60": 24, "70": 35, "75": 15, "80": 8, "85": 0, "90": 0, "95": 0}, {"irm": 67, "50": 16, "60": 21, "70": 34, "75": 16.5, "80": 12.5, "85": 0, "90": 0, "95": 0}, {"irm": 68, "50": 15, "60": 19, "70": 31, "75": 17.5, "80": 17.5, "85": 0, "90": 0, "95": 0}, {"irm": 69, "50": 14, "60": 16, "70": 27, "75": 25, "80": 18, "85": 0, "90": 0, "95": 0}, {"irm": 70, "50": 0, "60": 24, "70": 37, "75": 24.4, "80": 10.6, "85": 4, "90": 0, "95": 0}, {"irm": 71, "50": 10, "60": 10, "70": 20, "75": 34, "80": 26, "85": 0, "90": 0, "95": 0}, {"irm": 72, "50": 0, "60": 20, "70": 32, "75": 28, "80": 14, "85": 6, "90": 0, "95": 0}, {"irm": 73, "50": 13, "60": 13, "70": 13, "75": 15, "80": 20, "85": 26, "90": 0, "95": 0}, {"irm": 74, "50": 15, "60": 12, "70": 13, "75": 11, "80": 12, "85": 14, "90": 23, "95": 0}, {"irm": 75, "50": 0, "60": 13, "70": 19, "75": 24, "80": 26, "85": 13, "90": 5, "95": 0}, {"irm": 76, "50": 0, "60": 11, "70": 20, "75": 22.2, "80": 20.8, "85": 20, "90": 6, "95": 0}, {"irm": 77, "50": 0, "60": 8, "70": 17, "75": 22, "80": 25, "85": 21, "90": 7, "95": 0}, {"irm": 78, "50": 0, "60": 8, "70": 19, "75": 18, "80": 23, "85": 22, "90": 8, "95": 2}, {"irm": 79, "50": 0, "60": 0, "70": 19, "75": 21, "80": 26, "85": 24, "90": 10, "95": 0}, {"irm": 80, "50": 0, "60": 0, "70": 18, "75": 18, "80": 25, "85": 24, "90": 15, "95": 0}, {"irm": 81, "50": 0, "60": 0, "70": 10, "75": 20, "80": 28, "85": 22, "90": 15, "95": 5}, {"irm": 82, "50": 0, "60": 0, "70": 0, "75": 0, "80": 70, "85": 20, "90": 10, "95": 0}, {"irm": 83, "50": 0, "60": 0, "70": 0, "75": 0, "80": 50, "85": 40, "90": 10, "95": 0}, {"irm": 84, "50": 0, "60": 0, "70": 0, "75": 0, "80": 40, "85": 40, "90": 20, "95": 0}, {"irm": 85, "50": 0, "60": 0, "70": 0, "75": 0, "80": 30, "85": 40, "90": 30, "95": 0}, {"irm": 86, "50": 0, "60": 0, "70": 0, "75": 0, "80": 25, "85": 40, "90": 25, "95": 10}, {"irm": 87, "50": 0, "60": 0, "70": 0, "75": 0, "80": 10, "85": 50, "90": 30, "95": 10}, {"irm": 88, "50": 0, "60": 0, "70": 0, "75": 0, "80": 10, "85": 40, "90": 30, "95": 20}, {"irm": 89, "50": 0, "60": 0, "70": 0, "75": 0, "80": 10, "85": 20, "90": 50, "95": 20}, {"irm": 90, "50": 0, "60": 0, "70": 10, "75": 20, "80": 28, "85": 22, "90": 15, "95": 5}, {"irm": 91, "50": 0, "60": 0, "70": 0, "75": 0, "80": 0, "85": 10, "90": 70, "95": 20}, {"irm": 92, "50": 0, "60": 0, "70": 0, "75": 0, "80": 0, "85": 10, "90": 50, "95": 40}, {"irm": 93, "50": 0, "60": 0, "70": 0, "75": 0, "80": 0, "85": 10, "90": 30, "95": 60}, {"irm": 94, "50": 0, "60": 0, "70": 0, "75": 0, "80": 0, "85": 10, "90": 10, "95": 80}, {"irm": 95, "50": 0, "60": 0, "70": 0, "75": 0, "80": 0, "85": 0, "90": 0, "95": 100}],
  tabla3: [{"irm": 65, "50": 19, "60": 27, "70": 38, "75": 11, "80": 5, "85": 0, "90": 0, "95": 0}, {"irm": 66, "50": 18, "60": 24, "70": 35, "75": 15, "80": 8, "85": 0, "90": 0, "95": 0}, {"irm": 67, "50": 16, "60": 21, "70": 34, "75": 16.5, "80": 12.5, "85": 0, "90": 0, "95": 0}, {"irm": 68, "50": 15, "60": 19, "70": 31, "75": 17.5, "80": 17.5, "85": 0, "90": 0, "95": 0}, {"irm": 69, "50": 14, "60": 16, "70": 27, "75": 25, "80": 18, "85": 0, "90": 0, "95": 0}, {"irm": 70, "50": 0, "60": 24, "70": 37, "75": 24.4, "80": 10.6, "85": 4, "90": 0, "95": 0}, {"irm": 71, "50": 0, "60": 20, "70": 36, "75": 26, "80": 12, "85": 6, "90": 0, "95": 0}, {"irm": 72, "50": 0, "60": 20, "70": 32, "75": 28, "80": 14, "85": 6, "90": 0, "95": 0}, {"irm": 73, "50": 0, "60": 16, "70": 27, "75": 28, "80": 19, "85": 7, "90": 3, "95": 0}, {"irm": 74, "50": 0, "60": 12, "70": 26, "75": 27, "80": 23, "85": 8, "90": 4, "95": 0}, {"irm": 75, "50": 0, "60": 13, "70": 19, "75": 24, "80": 26, "85": 13, "90": 5, "95": 0}, {"irm": 76, "50": 0, "60": 11, "70": 20, "75": 22.2, "80": 20.8, "85": 20, "90": 6, "95": 0}, {"irm": 77, "50": 0, "60": 8, "70": 17, "75": 22, "80": 25, "85": 21, "90": 7, "95": 0}, {"irm": 78, "50": 0, "60": 8, "70": 19, "75": 18, "80": 23, "85": 22, "90": 8, "95": 2}, {"irm": 79, "50": 0, "60": 0, "70": 19, "75": 21, "80": 26, "85": 24, "90": 10, "95": 0}, {"irm": 80, "50": 0, "60": 0, "70": 18, "75": 18, "80": 25, "85": 24, "90": 15, "95": 0}, {"irm": 81, "50": 0, "60": 0, "70": 10, "75": 20, "80": 28, "85": 22, "90": 15, "95": 5}, {"irm": 82, "50": 0, "60": 0, "70": 0, "75": 0, "80": 70, "85": 20, "90": 10, "95": 0}, {"irm": 83, "50": 0, "60": 0, "70": 0, "75": 0, "80": 50, "85": 40, "90": 10, "95": 0}, {"irm": 84, "50": 0, "60": 0, "70": 0, "75": 0, "80": 40, "85": 40, "90": 20, "95": 0}, {"irm": 85, "50": 0, "60": 0, "70": 0, "75": 0, "80": 30, "85": 40, "90": 30, "95": 0}, {"irm": 86, "50": 0, "60": 0, "70": 0, "75": 0, "80": 25, "85": 40, "90": 25, "95": 10}, {"irm": 87, "50": 0, "60": 0, "70": 0, "75": 0, "80": 10, "85": 50, "90": 30, "95": 10}, {"irm": 88, "50": 0, "60": 0, "70": 0, "75": 0, "80": 10, "85": 40, "90": 30, "95": 20}, {"irm": 89, "50": 0, "60": 0, "70": 0, "75": 0, "80": 10, "85": 20, "90": 50, "95": 20}, {"irm": 90, "50": 0, "60": 0, "70": 10, "75": 20, "80": 28, "85": 22, "90": 15, "95": 5}, {"irm": 91, "50": 0, "60": 0, "70": 0, "75": 0, "80": 0, "85": 10, "90": 70, "95": 20}, {"irm": 92, "50": 0, "60": 0, "70": 0, "75": 0, "80": 0, "85": 10, "90": 50, "95": 40}, {"irm": 93, "50": 0, "60": 0, "70": 0, "75": 0, "80": 0, "85": 10, "90": 30, "95": 60}, {"irm": 94, "50": 0, "60": 0, "70": 0, "75": 0, "80": 0, "85": 10, "90": 10, "95": 80}, {"irm": 95, "50": 0, "60": 0, "70": 0, "75": 0, "80": 0, "85": 0, "90": 0, "95": 100}],
  lookup_general: [{"intens": 50, "modo": "Prep", "reps": 1, "series": 1, "reps_serie": 1}, {"intens": 50, "modo": "Prep", "reps": 2, "series": 1, "reps_serie": 2}, {"intens": 50, "modo": "Prep", "reps": 3, "series": 1, "reps_serie": 3}, {"intens": 50, "modo": "Prep", "reps": 4, "series": 1, "reps_serie": 4}, {"intens": 50, "modo": "Prep", "reps": 5, "series": 1, "reps_serie": 5}, {"intens": 50, "modo": "Prep", "reps": 6, "series": 1, "reps_serie": 6}, {"intens": 50, "modo": "Prep", "reps": 7, "series": 2, "reps_serie": 4}, {"intens": 50, "modo": "Prep", "reps": 8, "series": 2, "reps_serie": 4}, {"intens": 50, "modo": "Comp", "reps": 1, "series": 1, "reps_serie": 1}, {"intens": 50, "modo": "Comp", "reps": 2, "series": 1, "reps_serie": 2}, {"intens": 50, "modo": "Comp", "reps": 3, "series": 1, "reps_serie": 3}, {"intens": 50, "modo": "Comp", "reps": 4, "series": 1, "reps_serie": 4}, {"intens": 50, "modo": "Comp", "reps": 5, "series": 2, "reps_serie": 3}, {"intens": 50, "modo": "Comp", "reps": 6, "series": 2, "reps_serie": 3}, {"intens": 50, "modo": "Comp", "reps": 7, "series": 2, "reps_serie": 4}, {"intens": 50, "modo": "Comp", "reps": 8, "series": 2, "reps_serie": 4}, {"intens": 60, "modo": "Prep", "reps": 1, "series": 1, "reps_serie": 1}, {"intens": 60, "modo": "Prep", "reps": 2, "series": 1, "reps_serie": 2}, {"intens": 60, "modo": "Prep", "reps": 3, "series": 1, "reps_serie": 3}, {"intens": 60, "modo": "Prep", "reps": 4, "series": 1, "reps_serie": 4}, {"intens": 60, "modo": "Prep", "reps": 5, "series": 1, "reps_serie": 5}, {"intens": 60, "modo": "Prep", "reps": 6, "series": 1, "reps_serie": 6}, {"intens": 60, "modo": "Prep", "reps": 7, "series": 2, "reps_serie": 4}, {"intens": 60, "modo": "Prep", "reps": 8, "series": 2, "reps_serie": 4}, {"intens": 60, "modo": "Comp", "reps": 1, "series": 1, "reps_serie": 1}, {"intens": 60, "modo": "Comp", "reps": 2, "series": 1, "reps_serie": 2}, {"intens": 60, "modo": "Comp", "reps": 3, "series": 1, "reps_serie": 3}, {"intens": 60, "modo": "Comp", "reps": 4, "series": 1, "reps_serie": 4}, {"intens": 60, "modo": "Comp", "reps": 5, "series": 2, "reps_serie": 3}, {"intens": 60, "modo": "Comp", "reps": 6, "series": 2, "reps_serie": 3}, {"intens": 60, "modo": "Comp", "reps": 7, "series": 2, "reps_serie": 4}, {"intens": 60, "modo": "Comp", "reps": 8, "series": 2, "reps_serie": 4}, {"intens": 70, "modo": "Prep", "reps": 1, "series": 1, "reps_serie": 1}, {"intens": 70, "modo": "Prep", "reps": 2, "series": 1, "reps_serie": 2}, {"intens": 70, "modo": "Prep", "reps": 3, "series": 1, "reps_serie": 3}, {"intens": 70, "modo": "Prep", "reps": 4, "series": 1, "reps_serie": 4}, {"intens": 70, "modo": "Prep", "reps": 5, "series": 1, "reps_serie": 5}, {"intens": 70, "modo": "Prep", "reps": 6, "series": 1, "reps_serie": 6}, {"intens": 70, "modo": "Prep", "reps": 7, "series": 2, "reps_serie": 4}, {"intens": 70, "modo": "Prep", "reps": 8, "series": 2, "reps_serie": 4}, {"intens": 70, "modo": "Comp", "reps": 1, "series": 1, "reps_serie": 1}, {"intens": 70, "modo": "Comp", "reps": 2, "series": 1, "reps_serie": 2}, {"intens": 70, "modo": "Comp", "reps": 3, "series": 1, "reps_serie": 3}, {"intens": 70, "modo": "Comp", "reps": 4, "series": 1, "reps_serie": 4}, {"intens": 70, "modo": "Comp", "reps": 5, "series": 2, "reps_serie": 3}, {"intens": 70, "modo": "Comp", "reps": 6, "series": 2, "reps_serie": 3}, {"intens": 70, "modo": "Comp", "reps": 7, "series": 2, "reps_serie": 3}, {"intens": 70, "modo": "Comp", "reps": 8, "series": 2, "reps_serie": 4}, {"intens": 75, "modo": "Prep", "reps": 1, "series": 1, "reps_serie": 1}, {"intens": 75, "modo": "Prep", "reps": 2, "series": 1, "reps_serie": 2}, {"intens": 75, "modo": "Prep", "reps": 3, "series": 1, "reps_serie": 3}, {"intens": 75, "modo": "Prep", "reps": 4, "series": 1, "reps_serie": 4}, {"intens": 75, "modo": "Prep", "reps": 5, "series": 3, "reps_serie": 2}, {"intens": 75, "modo": "Prep", "reps": 6, "series": 2, "reps_serie": 3}, {"intens": 75, "modo": "Prep", "reps": 7, "series": 2, "reps_serie": 3}, {"intens": 75, "modo": "Prep", "reps": 8, "series": 2, "reps_serie": 4}, {"intens": 75, "modo": "Comp", "reps": 1, "series": 1, "reps_serie": 1}, {"intens": 75, "modo": "Comp", "reps": 2, "series": 1, "reps_serie": 3}, {"intens": 75, "modo": "Comp", "reps": 3, "series": 1, "reps_serie": 3}, {"intens": 75, "modo": "Comp", "reps": 4, "series": 2, "reps_serie": 2}, {"intens": 75, "modo": "Comp", "reps": 5, "series": 2, "reps_serie": 2}, {"intens": 75, "modo": "Comp", "reps": 6, "series": 2, "reps_serie": 3}, {"intens": 75, "modo": "Comp", "reps": 7, "series": 3, "reps_serie": 2}, {"intens": 75, "modo": "Comp", "reps": 8, "series": 4, "reps_serie": 2}, {"intens": 80, "modo": "Prep", "reps": 1, "series": 1, "reps_serie": 1}, {"intens": 80, "modo": "Prep", "reps": 2, "series": 1, "reps_serie": 2}, {"intens": 80, "modo": "Prep", "reps": 3, "series": 1, "reps_serie": 3}, {"intens": 80, "modo": "Prep", "reps": 4, "series": 1, "reps_serie": 4}, {"intens": 80, "modo": "Prep", "reps": 5, "series": 2, "reps_serie": 3}, {"intens": 80, "modo": "Prep", "reps": 6, "series": 2, "reps_serie": 3}, {"intens": 80, "modo": "Prep", "reps": 7, "series": 2, "reps_serie": 3}, {"intens": 80, "modo": "Prep", "reps": 8, "series": 2, "reps_serie": 4}, {"intens": 80, "modo": "Comp", "reps": 1, "series": 1, "reps_serie": 1}, {"intens": 80, "modo": "Comp", "reps": 2, "series": 1, "reps_serie": 2}, {"intens": 80, "modo": "Comp", "reps": 3, "series": 1, "reps_serie": 3}, {"intens": 80, "modo": "Comp", "reps": 4, "series": 2, "reps_serie": 2}, {"intens": 80, "modo": "Comp", "reps": 5, "series": 2, "reps_serie": 3}, {"intens": 80, "modo": "Comp", "reps": 6, "series": 3, "reps_serie": 2}, {"intens": 80, "modo": "Comp", "reps": 7, "series": 3, "reps_serie": 2}, {"intens": 80, "modo": "Comp", "reps": 8, "series": 4, "reps_serie": 2}, {"intens": 85, "modo": "Prep", "reps": 1, "series": 1, "reps_serie": 1}, {"intens": 85, "modo": "Prep", "reps": 2, "series": 1, "reps_serie": 2}, {"intens": 85, "modo": "Prep", "reps": 3, "series": 1, "reps_serie": 3}, {"intens": 85, "modo": "Prep", "reps": 4, "series": 2, "reps_serie": 2}, {"intens": 85, "modo": "Prep", "reps": 5, "series": 2, "reps_serie": 2}, {"intens": 85, "modo": "Prep", "reps": 6, "series": 3, "reps_serie": 2}, {"intens": 85, "modo": "Prep", "reps": 7, "series": 3, "reps_serie": 2}, {"intens": 85, "modo": "Prep", "reps": 8, "series": 4, "reps_serie": 2}, {"intens": 85, "modo": "Comp", "reps": 1, "series": 1, "reps_serie": 1}, {"intens": 85, "modo": "Comp", "reps": 2, "series": 2, "reps_serie": 1}, {"intens": 85, "modo": "Comp", "reps": 3, "series": 2, "reps_serie": 2}, {"intens": 85, "modo": "Comp", "reps": 4, "series": 2, "reps_serie": 2}, {"intens": 85, "modo": "Comp", "reps": 5, "series": 5, "reps_serie": 1}, {"intens": 85, "modo": "Comp", "reps": 6, "series": 6, "reps_serie": 1}, {"intens": 85, "modo": "Comp", "reps": 7, "series": 7, "reps_serie": 1}, {"intens": 85, "modo": "Comp", "reps": 8, "series": 8, "reps_serie": 1}, {"intens": 90, "modo": "Prep", "reps": 1, "series": 1, "reps_serie": 1}, {"intens": 90, "modo": "Prep", "reps": 2, "series": 1, "reps_serie": 2}, {"intens": 90, "modo": "Prep", "reps": 3, "series": 2, "reps_serie": 2}, {"intens": 90, "modo": "Prep", "reps": 4, "series": 2, "reps_serie": 2}, {"intens": 90, "modo": "Prep", "reps": 5, "series": 2, "reps_serie": 2}, {"intens": 90, "modo": "Prep", "reps": 6, "series": 3, "reps_serie": 2}, {"intens": 90, "modo": "Prep", "reps": 7, "series": 3, "reps_serie": 2}, {"intens": 90, "modo": "Prep", "reps": 8, "series": 4, "reps_serie": 2}, {"intens": 90, "modo": "Comp", "reps": 1, "series": 1, "reps_serie": 1}, {"intens": 90, "modo": "Comp", "reps": 2, "series": 2, "reps_serie": 1}, {"intens": 90, "modo": "Comp", "reps": 3, "series": 3, "reps_serie": 1}, {"intens": 90, "modo": "Comp", "reps": 4, "series": 4, "reps_serie": 1}, {"intens": 90, "modo": "Comp", "reps": 5, "series": 5, "reps_serie": 1}, {"intens": 90, "modo": "Comp", "reps": 6, "series": 6, "reps_serie": 1}, {"intens": 90, "modo": "Comp", "reps": 7, "series": 7, "reps_serie": 1}, {"intens": 90, "modo": "Comp", "reps": 8, "series": 8, "reps_serie": 1}, {"intens": 95, "modo": "Prep", "reps": 1, "series": 1, "reps_serie": 1}, {"intens": 95, "modo": "Prep", "reps": 2, "series": 2, "reps_serie": 1}, {"intens": 95, "modo": "Prep", "reps": 3, "series": 3, "reps_serie": 1}, {"intens": 95, "modo": "Prep", "reps": 4, "series": 4, "reps_serie": 1}, {"intens": 95, "modo": "Prep", "reps": 5, "series": 5, "reps_serie": 1}, {"intens": 95, "modo": "Prep", "reps": 6, "series": 6, "reps_serie": 1}, {"intens": 95, "modo": "Prep", "reps": 7, "series": 7, "reps_serie": 1}, {"intens": 95, "modo": "Prep", "reps": 8, "series": 8, "reps_serie": 1}, {"intens": 95, "modo": "Comp", "reps": 1, "series": 1, "reps_serie": 1}, {"intens": 95, "modo": "Comp", "reps": 2, "series": 2, "reps_serie": 1}, {"intens": 95, "modo": "Comp", "reps": 3, "series": 3, "reps_serie": 1}, {"intens": 95, "modo": "Comp", "reps": 4, "series": 4, "reps_serie": 1}, {"intens": 95, "modo": "Comp", "reps": 5, "series": 5, "reps_serie": 1}, {"intens": 95, "modo": "Comp", "reps": 6, "series": 6, "reps_serie": 1}, {"intens": 95, "modo": "Comp", "reps": 7, "series": 7, "reps_serie": 1}, {"intens": 95, "modo": "Comp", "reps": 8, "series": 8, "reps_serie": 1}],
  lookup_tirones: [{"intens": 50, "modo": "Prep", "reps": 1, "series": 1, "reps_serie": 1}, {"intens": 50, "modo": "Prep", "reps": 2, "series": 1, "reps_serie": 2}, {"intens": 50, "modo": "Prep", "reps": 3, "series": 1, "reps_serie": 3}, {"intens": 50, "modo": "Prep", "reps": 4, "series": 1, "reps_serie": 4}, {"intens": 50, "modo": "Prep", "reps": 5, "series": 1, "reps_serie": 5}, {"intens": 50, "modo": "Prep", "reps": 6, "series": 1, "reps_serie": 6}, {"intens": 50, "modo": "Prep", "reps": 7, "series": 2, "reps_serie": 4}, {"intens": 50, "modo": "Prep", "reps": 8, "series": 2, "reps_serie": 4}, {"intens": 50, "modo": "Comp", "reps": 1, "series": 1, "reps_serie": 1}, {"intens": 50, "modo": "Comp", "reps": 2, "series": 1, "reps_serie": 2}, {"intens": 50, "modo": "Comp", "reps": 3, "series": 1, "reps_serie": 3}, {"intens": 50, "modo": "Comp", "reps": 4, "series": 1, "reps_serie": 4}, {"intens": 50, "modo": "Comp", "reps": 5, "series": 2, "reps_serie": 3}, {"intens": 50, "modo": "Comp", "reps": 6, "series": 2, "reps_serie": 3}, {"intens": 50, "modo": "Comp", "reps": 7, "series": 2, "reps_serie": 4}, {"intens": 50, "modo": "Comp", "reps": 8, "series": 2, "reps_serie": 4}, {"intens": 60, "modo": "Prep", "reps": 1, "series": 1, "reps_serie": 1}, {"intens": 60, "modo": "Prep", "reps": 2, "series": 1, "reps_serie": 2}, {"intens": 60, "modo": "Prep", "reps": 3, "series": 1, "reps_serie": 3}, {"intens": 60, "modo": "Prep", "reps": 4, "series": 1, "reps_serie": 4}, {"intens": 60, "modo": "Prep", "reps": 5, "series": 1, "reps_serie": 5}, {"intens": 60, "modo": "Prep", "reps": 6, "series": 1, "reps_serie": 6}, {"intens": 60, "modo": "Prep", "reps": 7, "series": 2, "reps_serie": 4}, {"intens": 60, "modo": "Prep", "reps": 8, "series": 2, "reps_serie": 4}, {"intens": 60, "modo": "Comp", "reps": 1, "series": 1, "reps_serie": 1}, {"intens": 60, "modo": "Comp", "reps": 2, "series": 1, "reps_serie": 2}, {"intens": 60, "modo": "Comp", "reps": 3, "series": 1, "reps_serie": 3}, {"intens": 60, "modo": "Comp", "reps": 4, "series": 1, "reps_serie": 4}, {"intens": 60, "modo": "Comp", "reps": 5, "series": 2, "reps_serie": 3}, {"intens": 60, "modo": "Comp", "reps": 6, "series": 2, "reps_serie": 3}, {"intens": 60, "modo": "Comp", "reps": 7, "series": 2, "reps_serie": 4}, {"intens": 60, "modo": "Comp", "reps": 8, "series": 2, "reps_serie": 4}, {"intens": 70, "modo": "Prep", "reps": 1, "series": 1, "reps_serie": 1}, {"intens": 70, "modo": "Prep", "reps": 2, "series": 1, "reps_serie": 2}, {"intens": 70, "modo": "Prep", "reps": 3, "series": 1, "reps_serie": 3}, {"intens": 70, "modo": "Prep", "reps": 4, "series": 1, "reps_serie": 4}, {"intens": 70, "modo": "Prep", "reps": 5, "series": 1, "reps_serie": 5}, {"intens": 70, "modo": "Prep", "reps": 6, "series": 1, "reps_serie": 6}, {"intens": 70, "modo": "Prep", "reps": 7, "series": 2, "reps_serie": 4}, {"intens": 70, "modo": "Prep", "reps": 8, "series": 2, "reps_serie": 4}, {"intens": 70, "modo": "Comp", "reps": 1, "series": 1, "reps_serie": 1}, {"intens": 70, "modo": "Comp", "reps": 2, "series": 1, "reps_serie": 2}, {"intens": 70, "modo": "Comp", "reps": 3, "series": 1, "reps_serie": 3}, {"intens": 70, "modo": "Comp", "reps": 4, "series": 1, "reps_serie": 4}, {"intens": 70, "modo": "Comp", "reps": 5, "series": 2, "reps_serie": 3}, {"intens": 70, "modo": "Comp", "reps": 6, "series": 2, "reps_serie": 3}, {"intens": 70, "modo": "Comp", "reps": 7, "series": 2, "reps_serie": 3}, {"intens": 70, "modo": "Comp", "reps": 8, "series": 2, "reps_serie": 4}, {"intens": 75, "modo": "Prep", "reps": 1, "series": 1, "reps_serie": 1}, {"intens": 75, "modo": "Prep", "reps": 2, "series": 1, "reps_serie": 2}, {"intens": 75, "modo": "Prep", "reps": 3, "series": 1, "reps_serie": 3}, {"intens": 75, "modo": "Prep", "reps": 4, "series": 1, "reps_serie": 4}, {"intens": 75, "modo": "Prep", "reps": 5, "series": 3, "reps_serie": 2}, {"intens": 75, "modo": "Prep", "reps": 6, "series": 2, "reps_serie": 3}, {"intens": 75, "modo": "Prep", "reps": 7, "series": 2, "reps_serie": 3}, {"intens": 75, "modo": "Prep", "reps": 8, "series": 2, "reps_serie": 4}, {"intens": 75, "modo": "Comp", "reps": 1, "series": 1, "reps_serie": 1}, {"intens": 75, "modo": "Comp", "reps": 2, "series": 2, "reps_serie": 1}, {"intens": 75, "modo": "Comp", "reps": 3, "series": 1, "reps_serie": 3}, {"intens": 75, "modo": "Comp", "reps": 4, "series": 1, "reps_serie": 4}, {"intens": 75, "modo": "Comp", "reps": 5, "series": 2, "reps_serie": 3}, {"intens": 75, "modo": "Comp", "reps": 6, "series": 2, "reps_serie": 3}, {"intens": 75, "modo": "Comp", "reps": 7, "series": 3, "reps_serie": 2}, {"intens": 75, "modo": "Comp", "reps": 8, "series": 4, "reps_serie": 2}, {"intens": 80, "modo": "Prep", "reps": 1, "series": 1, "reps_serie": 1}, {"intens": 80, "modo": "Prep", "reps": 2, "series": 1, "reps_serie": 2}, {"intens": 80, "modo": "Prep", "reps": 3, "series": 1, "reps_serie": 3}, {"intens": 80, "modo": "Prep", "reps": 4, "series": 1, "reps_serie": 4}, {"intens": 80, "modo": "Prep", "reps": 5, "series": 1, "reps_serie": 5}, {"intens": 80, "modo": "Prep", "reps": 6, "series": 2, "reps_serie": 3}, {"intens": 80, "modo": "Prep", "reps": 7, "series": 2, "reps_serie": 3}, {"intens": 80, "modo": "Prep", "reps": 8, "series": 2, "reps_serie": 4}, {"intens": 80, "modo": "Comp", "reps": 1, "series": 1, "reps_serie": 1}, {"intens": 80, "modo": "Comp", "reps": 2, "series": 1, "reps_serie": 2}, {"intens": 80, "modo": "Comp", "reps": 3, "series": 1, "reps_serie": 3}, {"intens": 80, "modo": "Comp", "reps": 4, "series": 1, "reps_serie": 4}, {"intens": 80, "modo": "Comp", "reps": 5, "series": 2, "reps_serie": 3}, {"intens": 80, "modo": "Comp", "reps": 6, "series": 2, "reps_serie": 3}, {"intens": 80, "modo": "Comp", "reps": 7, "series": 2, "reps_serie": 3}, {"intens": 80, "modo": "Comp", "reps": 8, "series": 3, "reps_serie": 3}, {"intens": 85, "modo": "Prep", "reps": 1, "series": 1, "reps_serie": 1}, {"intens": 85, "modo": "Prep", "reps": 2, "series": 1, "reps_serie": 2}, {"intens": 85, "modo": "Prep", "reps": 3, "series": 1, "reps_serie": 3}, {"intens": 85, "modo": "Prep", "reps": 4, "series": 1, "reps_serie": 4}, {"intens": 85, "modo": "Prep", "reps": 5, "series": 1, "reps_serie": 5}, {"intens": 85, "modo": "Prep", "reps": 6, "series": 2, "reps_serie": 3}, {"intens": 85, "modo": "Prep", "reps": 7, "series": 2, "reps_serie": 4}, {"intens": 85, "modo": "Prep", "reps": 8, "series": 2, "reps_serie": 4}, {"intens": 85, "modo": "Comp", "reps": 1, "series": 1, "reps_serie": 1}, {"intens": 85, "modo": "Comp", "reps": 2, "series": 1, "reps_serie": 2}, {"intens": 85, "modo": "Comp", "reps": 3, "series": 1, "reps_serie": 3}, {"intens": 85, "modo": "Comp", "reps": 4, "series": 2, "reps_serie": 2}, {"intens": 85, "modo": "Comp", "reps": 5, "series": 2, "reps_serie": 2}, {"intens": 85, "modo": "Comp", "reps": 6, "series": 2, "reps_serie": 3}, {"intens": 85, "modo": "Comp", "reps": 7, "series": 2, "reps_serie": 3}, {"intens": 85, "modo": "Comp", "reps": 8, "series": 4, "reps_serie": 2}, {"intens": 90, "modo": "Prep", "reps": 1, "series": 1, "reps_serie": 1}, {"intens": 90, "modo": "Prep", "reps": 2, "series": 1, "reps_serie": 2}, {"intens": 90, "modo": "Prep", "reps": 3, "series": 1, "reps_serie": 3}, {"intens": 90, "modo": "Prep", "reps": 4, "series": 1, "reps_serie": 4}, {"intens": 90, "modo": "Prep", "reps": 5, "series": 2, "reps_serie": 2}, {"intens": 90, "modo": "Prep", "reps": 6, "series": 2, "reps_serie": 3}, {"intens": 90, "modo": "Prep", "reps": 7, "series": 2, "reps_serie": 3}, {"intens": 90, "modo": "Prep", "reps": 8, "series": 3, "reps_serie": 3}, {"intens": 90, "modo": "Comp", "reps": 1, "series": 1, "reps_serie": 1}, {"intens": 90, "modo": "Comp", "reps": 2, "series": 1, "reps_serie": 2}, {"intens": 90, "modo": "Comp", "reps": 3, "series": 1, "reps_serie": 3}, {"intens": 90, "modo": "Comp", "reps": 4, "series": 2, "reps_serie": 2}, {"intens": 90, "modo": "Comp", "reps": 5, "series": 2, "reps_serie": 2}, {"intens": 90, "modo": "Comp", "reps": 6, "series": 3, "reps_serie": 2}, {"intens": 90, "modo": "Comp", "reps": 7, "series": 3, "reps_serie": 2}, {"intens": 90, "modo": "Comp", "reps": 8, "series": 4, "reps_serie": 2}, {"intens": 95, "modo": "Prep", "reps": 1, "series": 1, "reps_serie": 1}, {"intens": 95, "modo": "Prep", "reps": 2, "series": 2, "reps_serie": 1}, {"intens": 95, "modo": "Prep", "reps": 3, "series": 3, "reps_serie": 1}, {"intens": 95, "modo": "Prep", "reps": 4, "series": 4, "reps_serie": 1}, {"intens": 95, "modo": "Prep", "reps": 5, "series": 5, "reps_serie": 1}, {"intens": 95, "modo": "Prep", "reps": 6, "series": 6, "reps_serie": 1}, {"intens": 95, "modo": "Prep", "reps": 7, "series": 7, "reps_serie": 1}, {"intens": 95, "modo": "Prep", "reps": 8, "series": 8, "reps_serie": 1}, {"intens": 95, "modo": "Comp", "reps": 1, "series": 1, "reps_serie": 1}, {"intens": 95, "modo": "Comp", "reps": 2, "series": 2, "reps_serie": 1}, {"intens": 95, "modo": "Comp", "reps": 3, "series": 3, "reps_serie": 1}, {"intens": 95, "modo": "Comp", "reps": 4, "series": 4, "reps_serie": 1}, {"intens": 95, "modo": "Comp", "reps": 5, "series": 5, "reps_serie": 1}, {"intens": 95, "modo": "Comp", "reps": 6, "series": 6, "reps_serie": 1}, {"intens": 95, "modo": "Comp", "reps": 7, "series": 7, "reps_serie": 1}, {"intens": 95, "modo": "Comp", "reps": 8, "series": 8, "reps_serie": 1}]
};
const DEFAULT_EJS  = 3;
// ── Buscador compacto para EjCelda (muestra ID, abre popover al hacer click) ──
function EjBuscadorCompacto({ value, onChange, color, title }) {
  const ejData = value ? getEjercicioById(Number(value)) : null;
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  const normativos = (() => {
    try { return JSON.parse(localStorage.getItem('liftplan_normativos') || 'null') || EJERCICIOS; }
    catch { return EJERCICIOS; }
  })();

  const results = (() => {
    const q = query.trim().toLowerCase();
    if (!q) return normativos;
    const byId   = normativos.filter(e => String(e.id).startsWith(q));
    const byName = normativos.filter(e => !String(e.id).startsWith(q)
      && e.nombre.toLowerCase().includes(q));
    return [...byId, ...byName];
  })();

  const select = (ej) => { onChange(ej ? ej.id : null); setQuery(""); setOpen(false); };

  // Refs para acceso fresco en event listeners
  const resultsRef = useRef(results);
  resultsRef.current = results;
  const selectRef = useRef(select);
  selectRef.current = select;

  // Enter key para seleccionar primer resultado
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Enter" && resultsRef.current.length > 0) {
        e.preventDefault();
        selectRef.current(resultsRef.current[0]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Block body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
      setTimeout(() => inputRef.current?.focus(), 80);
    } else {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, [open]);

  const listRef2 = useRef(null);
  const GRUPOS_EJ2 = ["Arranque","Envion","Tirones","Piernas","Complementarios"];
  const jumpToGroup2 = (g) => {
    const el = listRef2.current?.querySelector(`[data-firstgroup="${g}"]`);
    if (el) el.scrollIntoView({ block:"start", behavior:"smooth" });
  };

  return (
    <>
      <div onClick={()=>setOpen(true)} title={title}
        style={{
          background:"var(--surface3)", borderRadius:3,
          cursor:"pointer", userSelect:"none", width:"100%",
          padding:"2px 4px", display:"flex", alignItems:"center", gap:4,
          overflow:"hidden",
        }}>
        <span style={{fontSize:11, fontWeight:700, color:color, flexShrink:0}}>{ejData ? ejData.id : "—"}</span>
        {ejData && <span style={{fontSize:11, color:"var(--text)", overflow:"hidden",
          textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1}}>{ejData.nombre}</span>}
      </div>

      {open && (
        <div style={{
          position:"fixed", inset:0, zIndex:2000,
          background:"rgba(0,0,0,.6)", display:"flex",
          alignItems:"center", justifyContent:"center", padding:"20px"
        }} onClick={e=>{ if(e.target===e.currentTarget) setOpen(false); }}>
          <div style={{
            background:"var(--surface)", borderRadius:14,
            width:"100%", maxWidth:520, maxHeight:"75vh",
            display:"flex", flexDirection:"column", overflow:"hidden",
            boxShadow:"0 8px 40px rgba(0,0,0,.6)"
          }}>
            <div style={{padding:"12px 16px 8px", borderBottom:"1px solid var(--border)",
              display:"flex", alignItems:"center", gap:10}}>
              <input ref={inputRef}
                value={query} onChange={e=>setQuery(e.target.value)}
                placeholder="Número o nombre..."
                style={{flex:1, background:"var(--surface2)",
                  border:"1px solid var(--border)", borderRadius:8,
                  color:"var(--text)", fontSize:14, padding:"8px 12px",
                  outline:"none", fontFamily:"'DM Sans'"}}
              />
              <button onClick={()=>setOpen(false)}
                style={{background:"none",border:"none",color:"var(--muted)",
                  cursor:"pointer",fontSize:22,lineHeight:1,padding:"0 4px"}}>×</button>
            </div>
            {/* Salto rápido por grupo */}
            <div style={{display:"flex",gap:4,padding:"6px 16px",borderBottom:"1px solid var(--border)",flexWrap:"wrap"}}>
              {GRUPOS_EJ2.map(g=>(
                <button key={g} onClick={()=>jumpToGroup2(g)}
                  style={{padding:"2px 9px",borderRadius:12,border:`1px solid ${CAT_COLOR[g]||"var(--border)"}`,
                    background:`${CAT_COLOR[g]||"var(--muted)"}18`,color:CAT_COLOR[g]||"var(--muted)",
                    fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Bebas Neue'",letterSpacing:".04em"}}>
                  {g.slice(0,3).toUpperCase()}
                </button>
              ))}
            </div>
            <div ref={listRef2} style={{overflowY:"auto", flex:1}}>
              {ejData && (
                <div onClick={()=>select(null)}
                  style={{padding:"12px 16px", display:"flex", alignItems:"center", gap:10,
                    borderBottom:"1px solid var(--border)", cursor:"pointer",
                    color:"var(--red)", fontSize:13}}>
                  ✕ Quitar ejercicio
                </div>
              )}
              {(() => {
                const seen2 = new Set();
                return results.map(e => {
                  const col = CAT_COLOR[e.categoria] || "var(--muted)";
                  const sel = e.id === Number(value);
                  const isFirst = !seen2.has(e.categoria) && seen2.add(e.categoria);
                  return (
                    <div key={e.id} onClick={()=>select(e)}
                      {...(isFirst ? {"data-firstgroup": e.categoria} : {})}
                      style={{padding:"10px 16px", display:"flex", alignItems:"center", gap:10,
                        borderBottom:"1px solid var(--border)", cursor:"pointer",
                        background: sel ? `${col}18` : "transparent"}}>
                      <span style={{fontFamily:"'Bebas Neue'",fontSize:15,
                        color:col, minWidth:28, textAlign:"right"}}>{e.id}</span>
                      <span style={{flex:1, fontSize:13, color:"var(--text)"}}>{e.nombre}</span>
                      <span style={{fontSize:10, fontWeight:700, padding:"2px 7px",
                        borderRadius:10, background:`${col}20`, color:col, flexShrink:0}}>
                        {e.categoria.slice(0,3)}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}


const mkEj = () => ({id:mkId(), ejercicio_id:null, intensidad:75, tabla:1, reps_asignadas:0});

// Una fila de ejercicio dentro de una celda turno×semana — ultra compacta
function EjCelda({ ej, num, onChange, onRemove, canRemove }) {
  const ejData = ej.ejercicio_id ? getEjercicioById(ej.ejercicio_id) : null;
  const col    = ejData ? CAT_COLOR[ejData.categoria] : "var(--border)";

  // Columnas: # | EJ(fijo) | INT | TBL | KG | ✕
  return (
    <div style={{
      display:"grid",
      gridTemplateColumns:"14px 1fr 38px 40px 14px",
      gap:2, alignItems:"center",
      background: ejData ? `${col}12` : "transparent",
      border:`1px solid ${ejData ? `${col}40` : "var(--border)"}`,
      borderRadius:4, padding:"2px 3px",
      width:"100%", boxSizing:"border-box",
    }}>
      <span style={{fontSize:9,color:"var(--muted)",textAlign:"center",fontWeight:700,lineHeight:1}}>{num}</span>

      {/* ID del ejercicio — buscador compacto */}
      <EjBuscadorCompacto
        value={ej.ejercicio_id}
        color={col}
        onChange={id=>onChange({...ej, ejercicio_id: id})}
        title={ejData ? `${ejData.id} — ${ejData.nombre}` : "Seleccionar ejercicio"}
      />

      {/* INT */}
      <select
        value={ej.intensidad}
        onChange={e=>onChange({...ej, intensidad: Number(e.target.value)})}
        style={{
          background:"var(--surface3)", border:"none",
          borderRadius:3, color:"var(--text)", fontSize:11,
          padding:"1px 0", outline:"none", cursor:"pointer", width:"100%"
        }}>
        {IRM_VALUES.map(v=><option key={v} value={v}>{v}%</option>)}
      </select>

      {/* TBL */}
      <select
        value={ej.tabla}
        onChange={e=>onChange({...ej, tabla: Number(e.target.value)})}
        style={{
          background:"var(--surface3)", border:"none",
          borderRadius:3, color:"var(--muted)", fontSize:11,
          padding:"1px 0", outline:"none", cursor:"pointer", width:"100%"
        }}>
        <option value={1}>T1</option>
        <option value={2}>T2</option>
        <option value={3}>T3</option>
      </select>

      {/* Borrar */}
      {canRemove
        ? <button onClick={onRemove}
            style={{background:"none",border:"none",color:"var(--muted)",cursor:"pointer",
              fontSize:9,padding:0,lineHeight:1,textAlign:"center"}}
            title="Quitar">✕</button>
        : <span/>
      }
    </div>
  );
}


// Una celda completa: N ejercicios apilados + botón agregar
// ── Hook de ordenamiento por drag (mouse + touch) ────────────────────────────
// El drag se inicia SOLO desde el handle. Funciona en desktop y móvil.

function CeldaSembrado({ ejercicios, irm_arr, irm_env, onChange }) {
  const addEj    = () => onChange([...ejercicios, mkEj()]);
  const removeEj = (i) => onChange(ejercicios.filter((_,idx)=>idx!==i));

  // After any update, keep filled exercises before empty ones
  const normalize = (arr) => {
    const filled = arr.filter(e => e?.ejercicio_id);
    const empty  = arr.filter(e => !e?.ejercicio_id);
    return [...filled, ...empty];
  };

  const updateEj = (i, newEj) => {
    const arr = [...ejercicios]; arr[i] = newEj;
    onChange(normalize(arr));
  };

  const moveEj = (i, dir) => {
    if (!ejercicios[i]?.ejercicio_id) return; // can't move empty
    const j = i + dir;
    if (j < 0 || j >= ejercicios.length) return;
    if (!ejercicios[j]?.ejercicio_id) return; // can't swap with empty
    const arr = [...ejercicios];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    onChange(arr);
  };

  return (
    <div style={{display:"flex", flexDirection:"column", gap:2, width:"100%"}}>
      {ejercicios.filter(Boolean).map((ej,i)=>(
        <div key={ej.id} style={{display:"flex", alignItems:"center", gap:2, width:"100%", minWidth:0}}>
          <div style={{display:"flex", flexDirection:"column", gap:1, flexShrink:0}}>
            <button onClick={()=>moveEj(i,-1)}
              disabled={i===0 || !ej.ejercicio_id || !ejercicios[i-1]?.ejercicio_id}
              style={{background:"none",border:"none",
                cursor:(i===0||!ej.ejercicio_id||!ejercicios[i-1]?.ejercicio_id)?"default":"pointer",
                color:(i===0||!ej.ejercicio_id||!ejercicios[i-1]?.ejercicio_id)?"var(--surface3)":"var(--gold)",
                fontSize:8,lineHeight:1,padding:"1px 2px"}}>▲</button>
            <button onClick={()=>moveEj(i,1)}
              disabled={i>=ejercicios.length-1 || !ej.ejercicio_id || !ejercicios[i+1]?.ejercicio_id}
              style={{background:"none",border:"none",
                cursor:(i>=ejercicios.length-1||!ej.ejercicio_id||!ejercicios[i+1]?.ejercicio_id)?"default":"pointer",
                color:(i>=ejercicios.length-1||!ej.ejercicio_id||!ejercicios[i+1]?.ejercicio_id)?"var(--surface3)":"var(--gold)",
                fontSize:8,lineHeight:1,padding:"1px 2px"}}>▼</button>
          </div>
          <div style={{flex:1, minWidth:0}}>
            <EjCelda
              ej={ej} num={i+1}
              onChange={newEj=>updateEj(i,newEj)}
              onRemove={()=>removeEj(i)}
              canRemove={ejercicios.length > 1}
            />
          </div>
        </div>
      ))}
      <button
        onClick={addEj}
        style={{
          background:"none", border:"1px dashed var(--border)",
          borderRadius:3, color:"var(--muted)", fontSize:9, fontWeight:700,
          padding:"2px 0", cursor:"pointer", transition:"all .15s",
          letterSpacing:".06em", width:"100%"
        }}
        onMouseEnter={e=>{e.target.style.borderColor="var(--gold)";e.target.style.color="var(--gold)"}}
        onMouseLeave={e=>{e.target.style.borderColor="var(--border)";e.target.style.color="var(--muted)"}}>
        + EJ
      </button>
    </div>
  );
}

function SembradoMensual({ semanas, irm_arr, irm_env, onChangeSemana, onChangeTodasSemanas, meso }) {

  const numTurnos = semanas[0].turnos.length;

  const getEjs = (semIdx, tIdx) => {
    const ejs = (semanas[semIdx]?.turnos[tIdx]?.ejercicios || []).filter(Boolean);
    if (ejs.length < DEFAULT_EJS) {
      return [...ejs, ...Array.from({length: DEFAULT_EJS - ejs.length}, mkEj)];
    }
    return ejs;
  };

  const updateEjs = (semIdx, tIdx, newEjs) => {
    const semana = {...semanas[semIdx]};
    const turnos = [...semana.turnos];
    turnos[tIdx] = {...turnos[tIdx], ejercicios: newEjs};
    semana.turnos = turnos;
    onChangeSemana(semIdx, semana);
  };

  // Día y momento son INDEPENDIENTES por semana — se actualiza solo esa semana
  const updateDiaSemana = (semIdx, tIdx, dia, momento) => {
    const semana = {...semanas[semIdx]};
    const turnos = [...semana.turnos];
    turnos[tIdx] = {...turnos[tIdx], dia, momento};
    semana.turnos = turnos;
    onChangeSemana(semIdx, semana);
  };

  // Agregar turno a todas las semanas de una sola vez
  const addTurno = () => {
    const newSemanas = semanas.map(s => ({
      ...s,
      turnos: [...s.turnos, {
        id: mkId(), numero: s.turnos.length + 1,
        dia: "", momento: "",
        ejercicios: Array.from({length: DEFAULT_EJS}, mkEj)
      }]
    }));
    onChangeTodasSemanas(newSemanas);
  };

  // Quitar último turno — mínimo 1, confirma si tiene datos
  const removeTurno = () => {
    if (numTurnos <= 1) return;
    const lastIdx = numTurnos - 1;
    // Verificar si alguna semana tiene ejercicios cargados en el último turno
    const tieneDatos = semanas.some(s => {
      const t = s.turnos[lastIdx];
      return t && (t.dia || t.momento || t.ejercicios.some(e => e.ejercicio_id));
    });
    if (tieneDatos && !confirm(`El Turno ${lastIdx + 1} tiene datos cargados. ¿Eliminar de todas formas?`)) return;
    const newSemanas = semanas.map(s => ({
      ...s,
      turnos: s.turnos.slice(0, -1)
    }));
    onChangeTodasSemanas(newSemanas);
  };

  return (
    <div>
      {/* Controles de turnos */}
      <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:10, flexWrap:"wrap"}}>
        <span style={{fontSize:12, color:"var(--muted)"}}>
          <span style={{color:"var(--gold)", fontFamily:"'Bebas Neue'", fontSize:16}}>{numTurnos}</span> turnos
        </span>
        <button className="btn btn-ghost btn-xs" onClick={addTurno}>+ Turno</button>
        {numTurnos > 1 && (
          <button className="btn btn-danger btn-xs" onClick={removeTurno}>− Turno</button>
        )}
      </div>

      <div style={{overflowX:"auto"}}>
        <table style={{borderCollapse:"separate", borderSpacing:4, minWidth:600, width:"100%"}}>
          <thead>
            <tr>
              <th style={{
                width:40, padding:"6px 4px",
                background:"var(--surface2)", border:"1px solid var(--border)",
                borderRadius:6, fontSize:10, color:"var(--muted)",
                textTransform:"uppercase", letterSpacing:".08em", fontWeight:600,
                verticalAlign:"middle", textAlign:"center"
              }}>#</th>
              {semanas.map(s=>(
                <th key={s.id} style={{
                  padding:"6px 8px", minWidth:0, maxWidth:200, width:200,
                  background:"var(--surface2)", border:"1px solid var(--border)",
                  borderRadius:6, textAlign:"center"
                }}>
                  <div style={{fontFamily:"'Bebas Neue'",fontSize:16,color:"var(--gold)",lineHeight:1}}>
                    Semana {s.numero}
                  </div>
                  <div style={{fontSize:10,color:"var(--muted)",marginTop:2}}>
                    {s.pct_volumen}% · {s.reps_ajustadas||s.reps_calculadas||0} reps
                  </div>
                  <div style={{
                    display:"grid", gridTemplateColumns:"14px 1fr 38px 40px 14px",
                    gap:2, marginTop:6, padding:"2px 3px", width:"100%", boxSizing:"border-box"
                  }}>
                    {["#","EJ","INT","TBL",""].map((h,i)=>(
                      <div key={i} style={{fontSize:8,color:"var(--muted)",textAlign:"center",
                        fontWeight:700,textTransform:"uppercase",letterSpacing:".06em"}}>{h}</div>
                    ))}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({length:numTurnos},(_,tIdx)=>(
              <tr key={tIdx}>
                {/* Columna turno — número solamente */}
                <td style={{
                  padding:"4px 2px", verticalAlign:"top", textAlign:"center",
                  background:"var(--surface2)", border:"1px solid var(--border)",
                  borderRadius:6
                }}>
                  <div style={{
                    fontFamily:"'Bebas Neue'",fontSize:16,color:"var(--gold)",lineHeight:1
                  }}>T{tIdx+1}</div>
                </td>
                {/* Celdas por semana — cada una con su propio día/momento */}
                {semanas.map((s,sIdx)=>(
                  <td key={s.id} style={{padding:4, verticalAlign:"top", maxWidth:200, width:200, overflow:"hidden"}}>
                    {/* Día y momento por semana */}
                    <div style={{display:"flex", gap:3, marginBottom:4}}>
                      <select
                        value={s.turnos[tIdx]?.dia || ""}
                        onChange={e=>updateDiaSemana(sIdx,tIdx,e.target.value,s.turnos[tIdx]?.momento||"")}
                        style={{
                          flex:1, background:"var(--surface3)",border:"1px solid var(--border)",
                          borderRadius:4, color: s.turnos[tIdx]?.dia ? "var(--text)" : "var(--muted)",
                          fontSize:10, padding:"2px 3px", outline:"none", cursor:"pointer"
                        }}>
                        <option value="">Día</option>
                        {DIAS.map(d=><option key={d}>{d}</option>)}
                      </select>
                      <select
                        value={s.turnos[tIdx]?.momento || ""}
                        onChange={e=>updateDiaSemana(sIdx,tIdx,s.turnos[tIdx]?.dia||"",e.target.value)}
                        style={{
                          flex:1, background:"var(--surface3)",border:"1px solid var(--border)",
                          borderRadius:4, color: s.turnos[tIdx]?.momento ? "var(--text)" : "var(--muted)",
                          fontSize:10, padding:"2px 3px", outline:"none", cursor:"pointer"
                        }}>
                        <option value="">Turno</option>
                        {MOMENTOS.map(m=><option key={m}>{m}</option>)}
                      </select>
                    </div>
                    {/* Ejercicios */}
                    <CeldaSembrado
                      ejercicios={getEjs(sIdx,tIdx)}
                      irm_arr={irm_arr} irm_env={irm_env}
                      onChange={newEjs=>updateEjs(sIdx,tIdx,newEjs)}
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


function SemanaView({ semana, irm_arr, irm_env, meso, onChange }) {
  const [clipboardTurno, setClipboardTurno] = useState(null);
  const repsCalc = calcVolumenSemana(meso.volumen_total, semana.pct_volumen);
  const repsAjust = semana.reps_ajustadas || repsCalc;
  const repsPorGrupo = calcRepsPorGrupo(repsAjust, semana.pct_grupos);
  const sembStats = getSembradoStats(semana.turnos);

  const updateTurno = (tIdx, newT) => {
    const ts = [...semana.turnos]; ts[tIdx]=newT;
    onChange({...semana, turnos:ts});
  };

  const updateGrupo = (g, val) => {
    const otros = Object.keys(semana.pct_grupos).filter(k=>k!==g);
    const restante = 100 - Number(val);
    const totalOtros = otros.reduce((s,k)=>s+semana.pct_grupos[k],0);
    const newGrupos = {...semana.pct_grupos, [g]:Number(val)};
    if (totalOtros > 0) {
      otros.forEach(k=>{ newGrupos[k] = Math.round(semana.pct_grupos[k]/totalOtros*restante); });
    }
    onChange({...semana, pct_grupos:newGrupos});
  };

  return (
    <div>
      {/* Volumen */}
      <div className="card mb16">
        <div className="card-title">Volumen Semanal</div>
        <div className="vol-grid">
          <div className="vol-item">
            <div className="vol-label">% del Ciclo</div>
            <div className="vol-val">{semana.pct_volumen}%</div>
          </div>
          <div className="vol-item">
            <div className="vol-label">Reps calculadas</div>
            <div className="vol-val">{repsCalc}</div>
          </div>
          <div className="vol-item">
            <div className="vol-label">Reps ajustadas</div>
            <input className="form-input" type="number" value={repsAjust}
              onChange={e=>onChange({...semana,reps_ajustadas:Number(e.target.value)})}
              style={{fontSize:20,fontFamily:"'Bebas Neue'",textAlign:"center",color:"var(--gold)",padding:"4px 8px"}}/>
          </div>
          <div className="vol-item">
            <div className="vol-label">Ejercicios sembrados</div>
            <div className="vol-val">{sembStats.total}</div>
            <div className="vol-sub">de {semana.turnos.length*10} posibles</div>
          </div>
        </div>
      </div>

      {/* Grupos */}
      <div className="card mb16">
        <div className="flex-between mb12">
          <div className="card-title" style={{marginBottom:0}}>Distribución por Grupo</div>
          <span className="text-sm text-muted">Desde sembrado → ajustable</span>
        </div>
        <div className="grupos-grid">
          {CATEGORIAS.slice(0,4).map(g=>(
            <div key={g} className="grupo-item" style={{borderLeftColor:CAT_COLOR[g]}}>
              <div className="grupo-label" style={{color:CAT_COLOR[g]}}>{g}</div>
              <div className="grupo-pct">
                <input type="number" min={0} max={100} value={semana.pct_grupos[g]}
                  onChange={e=>updateGrupo(g,e.target.value)}
                  style={{background:"var(--surface3)",border:"1px solid var(--border)",borderRadius:6,color:"var(--text)",fontSize:14,fontWeight:600,padding:"4px 8px",width:60,textAlign:"center",outline:"none"}}/>
                <span className="text-muted">%</span>
                <span style={{color:CAT_COLOR[g],fontFamily:"'Bebas Neue'",fontSize:18,marginLeft:4}}>{sembStats.pcts[g]||0}%</span>
                <span className="text-sm text-muted">sembrado</span>
              </div>
              <div className="grupo-reps">{repsPorGrupo[g]} reps asignadas</div>
              <div className="prog-bar mt8">
                <div className="prog-fill" style={{width:`${semana.pct_grupos[g]}%`,background:CAT_COLOR[g]}}/>
              </div>
            </div>
          ))}
        </div>
        <div className="text-sm text-muted">
          Total: <span style={{color:Object.values(semana.pct_grupos).reduce((s,v)=>s+v,0)===100?"var(--green)":"var(--red)"}}>
            {Object.values(semana.pct_grupos).reduce((s,v)=>s+v,0)}%
          </span>
        </div>
      </div>

      {/* Turnos */}
      <div className="card">
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
          <div className="card-title" style={{margin:0}}>Sembrado — {semana.turnos.length} Turnos</div>
          <button className="btn btn-ghost btn-sm"
            style={{fontSize:11,color:"var(--muted)"}}
            onClick={()=>{
              try {
                const stored = JSON.parse(localStorage.getItem('liftplan_plantillas')||'[]');
                const nuevo = {
                  id:mkId(), tipo:"semana",
                  creado:new Date().toISOString().slice(0,10),
                  nombre:`Semana ${semana.numero}`,
                  descripcion:`${semana.turnos.filter(t=>t.ejercicios.some(e=>e.ejercicio_id)).length} turnos con ejercicios`,
                  periodo:"general", objetivo:"mixto", nivel:"intermedio",
                  duracion_semanas:1,
                  semana:{
                    pct_volumen: semana.pct_volumen,
                    turnos: semana.turnos.map(t=>({
                      dia:t.dia, momento:t.momento,
                      ejercicios: t.ejercicios.filter(e=>e.ejercicio_id).map(e=>({
                        ejercicio_id:e.ejercicio_id, intensidad:e.intensidad, tabla:e.tabla
                      }))
                    }))
                  }
                };
                localStorage.setItem('liftplan_plantillas', JSON.stringify([...stored, nuevo]));
                alert(`Semana ${semana.numero} guardada como plantilla ✓`);
              } catch(e){ alert('Error al guardar'); }
            }}>
            <Library size={12}/> Guardar semana
          </button>
        </div>
        {semana.turnos.map((t,i)=>(
          <TurnoCard key={t.id} turno={t} semana_idx={semana.numero-1}
            irm_arr={irm_arr} irm_env={irm_env}
            onChange={newT=>updateTurno(i,newT)}
            clipboardTurno={clipboardTurno}
            setClipboardTurno={setClipboardTurno}
            onPaste={copied => {
              const newT = {
                ...t,
                ejercicios: copied.ejercicios.map(e=>({...e, id:mkId(), reps_asignadas:0}))
              };
              updateTurno(i, newT);
            }}/>
        ))}
      </div>
    </div>
  );
}

// ─── PAGES ───────────────────────────────────────────────────────────────────


function AtletaCardItem({a, mesociclos, onSelect, onEdit, onDelete}) {
  const mesoAtleta = mesociclos.filter(m=>m.atleta_id===a.id).sort((x,y)=>y.fecha_inicio.localeCompare(x.fecha_inicio));
  const mesoActivo = mesoAtleta.find(m=>m.activo) || mesoAtleta[0];
  const edad = a.fecha_nacimiento ? Math.floor((Date.now()-new Date(a.fecha_nacimiento))/(1000*60*60*24*365)) : null;
  return (
    <div className="atleta-card" onClick={()=>onSelect(a)}>
      <div className="atleta-avatar" style={{
        background: a.tipo==="asesoria" ? "rgba(71,180,232,.15)" : "var(--surface3)",
        color: a.tipo==="asesoria" ? "var(--blue)" : "var(--gold)"}}>
        {a.nombre.charAt(0).toUpperCase()}
      </div>
      <div className="atleta-info">
        <div className="atleta-name">{a.nombre}</div>
        <div className="atleta-meta">
          {a.email}{a.telefono&&` · ${a.telefono}`}{edad&&` · ${edad} años`}
        </div>
        {mesoActivo ? (
          <div className="flex gap8 mt8" style={{flexWrap:"wrap"}}>
            <span className={"badge " + (mesoActivo.modo==="Competitivo"?"badge-gold":"badge-blue")}>{mesoActivo.modo}</span>
            <span className="badge badge-green">Activo</span>
            {mesoActivo.nombre && <span style={{fontSize:12,fontWeight:600,color:"var(--text)"}}>{mesoActivo.nombre}</span>}
            <span className="text-sm text-muted">{mesoActivo.fecha_inicio}</span>
            {(mesoActivo.irm_arranque || mesoActivo.irm_envion) && (
              <span style={{display:"flex",gap:8,flexWrap:"nowrap",alignItems:"center"}}>
                {mesoActivo.irm_arranque && <span className="text-sm text-muted">ARR: <strong style={{color:"var(--gold)"}}>{mesoActivo.irm_arranque}</strong>kg</span>}
                {mesoActivo.irm_envion && <span className="text-sm text-muted">ENV: <strong style={{color:"var(--blue)"}}>{mesoActivo.irm_envion}</strong>kg</span>}
              </span>
            )}
            {/* Fase del ciclo actual */}
            {a.genero==="f" && a.ciclo?.ultimo_inicio && (()=>{
              const fase = getFaseCiclo(a.ciclo, new Date().toISOString().slice(0,10));
              const fi   = fase ? FASES_CICLO[fase] : null;
              return fi ? (
                <span style={{fontSize:11,fontWeight:700,color:fi.color,
                  background:fi.bg,padding:"2px 8px",borderRadius:20,border:`1px solid ${fi.color}50`}}>
                  <fi.Icon size={11}/> {fi.label}
                </span>
              ) : null;
            })()}
          </div>
        ) : (
          <div className="mt8"><span className="badge" style={{background:"var(--surface3)",color:"var(--muted)"}}>Sin mesociclo</span></div>
        )}
      </div>
      <div className="flex gap8">
        <button className="btn btn-ghost btn-sm" onClick={e=>{e.stopPropagation();onEdit(a);}}>Editar</button>
        <button className="btn btn-danger btn-sm" onClick={e=>{e.stopPropagation();onDelete(a.id,e);}}>x</button>
      </div>
    </div>
  );
}

function AlumnoSectionHeader({title, count, color, onAdd}) {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
      marginBottom:10,paddingBottom:8,borderBottom:"2px solid " + (color||"var(--gold)") + "30"}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{fontFamily:"'Bebas Neue'",fontSize:22,color:color||"var(--gold)",letterSpacing:".04em"}}>{title}</div>
        <span style={{fontSize:11,color:"var(--muted)",fontWeight:600,
          background:"var(--surface2)",padding:"2px 8px",borderRadius:20}}>
          {count}
        </span>
      </div>
      <button className="btn btn-ghost btn-sm" onClick={onAdd}
        style={{borderColor:color||"var(--gold)",color:color||"var(--gold)"}}>
        <Plus size={13}/> Nuevo
      </button>
    </div>
  );
}

function PageAtletas({ atletas, setAtletas, mesociclos, onSelect }) {
  const [showForm, setShowForm] = useState(false);
  const [tipoInicial, setTipoInicial] = useState("atleta");
  const [editAtleta, setEditAtleta] = useState(null);
  const [expandedAtletas, setExpandedAtletas] = useState(false);
  const [expandedAsesorias, setExpandedAsesorias] = useState(false);
  const MAX_VISIBLE = 4;

  const saveAtleta = (a) => {
    setAtletas(prev => {
      const idx = prev.findIndex(x=>x.id===a.id);
      return idx>=0 ? prev.map(x=>x.id===a.id?a:x) : [...prev,a];
    });
    setShowForm(false); setEditAtleta(null);
  };

  const [confirmDeleteAtleta, setConfirmDeleteAtleta] = useState(null);
  const deleteAtleta = (id, e) => {
    e.stopPropagation();
    const atleta = atletas.find(a => a.id === id);
    setConfirmDeleteAtleta(atleta);
  };

  const atletasGrupo  = atletas.filter(a => a.tipo !== "asesoria");
  const asesorias      = atletas.filter(a => a.tipo === "asesoria");

  const renderCard = (a) => (
    <AtletaCardItem key={a.id} a={a} mesociclos={mesociclos}
      onSelect={onSelect} onEdit={setEditAtleta} onDelete={deleteAtleta}/>
  );


  return (
    <div>
      <div className="flex-between mb20">
        <div>
          <div className="page-title">Alumnos</div>
          <div className="page-sub">{atletas.length} registrados · {atletasGrupo.length} atletas · {asesorias.length} asesorías</div>
        </div>
      </div>

      {atletas.length === 0 ? (
        <div className="card text-center" style={{padding:48}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:16}}><LogoIL size={80}/></div>
          <div style={{fontSize:18,fontFamily:"'Bebas Neue'",color:"var(--muted)"}}>No hay alumnos todavía</div>
          <div className="text-sm text-muted mt8 mb16">Creá tu primer atleta o asesoría</div>
          <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
            <button className="btn btn-gold" onClick={()=>{setShowForm(true);}}><Plus size={14}/> Atleta</button>
            <button className="btn" style={{background:"var(--blue)",color:"#fff"}} onClick={()=>{setShowForm(true);}}><Plus size={14}/> Asesoría</button>
          </div>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:24}}>

          {/* ── Atletas ─────────────────────────────────────── */}
          <div>
            <AlumnoSectionHeader title="Atletas" count={atletasGrupo.length}
              color="var(--gold)" onAdd={()=>{setTipoInicial("atleta");setShowForm(true);}}/>
            {atletasGrupo.length === 0 ? (
              <div style={{padding:"20px",textAlign:"center",color:"var(--muted)",
                fontSize:12,background:"var(--surface2)",borderRadius:8}}>
                No hay atletas. <button onClick={()=>setShowForm(true)}
                  style={{background:"none",border:"none",color:"var(--gold)",
                    cursor:"pointer",textDecoration:"underline",fontSize:12}} onClick={()=>{setTipoInicial("atleta");setShowForm(true);}}>Crear uno</button>
              </div>
            ) : (
              (() => {
                const visible = expandedAtletas ? atletasGrupo : atletasGrupo.slice(0, MAX_VISIBLE);
                const hasMore = atletasGrupo.length > MAX_VISIBLE;
                return (
                  <>
                    <div style={{
                      display:"flex", flexDirection:"column", gap:8,
                      maxHeight: expandedAtletas ? "none" : `${MAX_VISIBLE * 90}px`,
                      overflowY: expandedAtletas ? "visible" : "hidden",
                      position:"relative"
                    }}>
                      {visible.map(a=>renderCard(a))}
                      {!expandedAtletas && hasMore && (
                        <div style={{
                          position:"absolute", bottom:0, left:0, right:0, height:60,
                          background:"linear-gradient(transparent, var(--background))",
                          pointerEvents:"none"
                        }}/>
                      )}
                    </div>
                    {hasMore && (
                      <button onClick={()=>setExpandedAtletas(e=>!e)}
                        style={{
                          width:"100%", marginTop:8, padding:"8px",
                          background:"var(--surface2)", border:"1px solid var(--border)",
                          borderRadius:8, color:"var(--gold)", cursor:"pointer",
                          fontSize:12, fontWeight:600, fontFamily:"'DM Sans'",
                          display:"flex", alignItems:"center", justifyContent:"center", gap:6
                        }}>
                        {expandedAtletas
                          ? <><ChevronLeft size={14} style={{transform:"rotate(90deg)"}}/> Ver menos</>
                          : <><ChevronLeft size={14} style={{transform:"rotate(-90deg)"}}/> Ver {atletasGrupo.length - MAX_VISIBLE} más</>
                        }
                      </button>
                    )}
                  </>
                );
              })()
            )}
          </div>

          {/* ── Asesorías ────────────────────────────────────── */}
          <div>
            <AlumnoSectionHeader title="Asesorías" count={asesorias.length}
              color="var(--blue)" onAdd={()=>{setTipoInicial("asesoria");setShowForm(true);}}/>
            {asesorias.length === 0 ? (
              <div style={{padding:"20px",textAlign:"center",color:"var(--muted)",
                fontSize:12,background:"var(--surface2)",borderRadius:8}}>
                No hay asesorías. <button onClick={()=>setShowForm(true)}
                  style={{background:"none",border:"none",color:"var(--blue)",
                    cursor:"pointer",textDecoration:"underline",fontSize:12}} onClick={()=>{setTipoInicial("asesoria");setShowForm(true);}}>Crear una</button>
              </div>
            ) : (
              (() => {
                const visible = expandedAsesorias ? asesorias : asesorias.slice(0, MAX_VISIBLE);
                const hasMore = asesorias.length > MAX_VISIBLE;
                return (
                  <>
                    <div style={{
                      display:"flex", flexDirection:"column", gap:8,
                      maxHeight: expandedAsesorias ? "none" : `${MAX_VISIBLE * 90}px`,
                      overflowY: expandedAsesorias ? "visible" : "hidden",
                      position:"relative"
                    }}>
                      {visible.map(a=>renderCard(a))}
                      {!expandedAsesorias && hasMore && (
                        <div style={{
                          position:"absolute", bottom:0, left:0, right:0, height:60,
                          background:"linear-gradient(transparent, var(--background))",
                          pointerEvents:"none"
                        }}/>
                      )}
                    </div>
                    {hasMore && (
                      <button onClick={()=>setExpandedAsesorias(e=>!e)}
                        style={{
                          width:"100%", marginTop:8, padding:"8px",
                          background:"var(--surface2)", border:"1px solid var(--border)",
                          borderRadius:8, color:"var(--blue)", cursor:"pointer",
                          fontSize:12, fontWeight:600, fontFamily:"'DM Sans'",
                          display:"flex", alignItems:"center", justifyContent:"center", gap:6
                        }}>
                        {expandedAsesorias
                          ? <><ChevronLeft size={14} style={{transform:"rotate(90deg)"}}/> Ver menos</>
                          : <><ChevronLeft size={14} style={{transform:"rotate(-90deg)"}}/> Ver {asesorias.length - MAX_VISIBLE} más</>
                        }
                      </button>
                    )}
                  </>
                );
              })()
            )}
          </div>
        </div>
      )}
      {(showForm||editAtleta) && <AtletaForm atleta={editAtleta} tipoInicial={tipoInicial} onSave={saveAtleta} onClose={()=>{setShowForm(false);setEditAtleta(null)}}/>}

      {confirmDeleteAtleta && (
        <Modal title="Eliminar atleta" onClose={()=>setConfirmDeleteAtleta(null)}>
          <p style={{fontSize:13,color:"var(--text)",marginBottom:8}}>
            ¿Eliminar a <strong>{confirmDeleteAtleta.nombre}</strong>?
          </p>
          <p style={{fontSize:12,color:"var(--muted)",marginBottom:20}}>
            Se eliminarán también todos sus mesociclos. Esta acción no se puede deshacer.
          </p>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button className="btn btn-ghost" onClick={()=>setConfirmDeleteAtleta(null)}>Cancelar</button>
            <button className="btn" style={{background:"var(--red)",color:"#fff"}}
              onClick={()=>{
                setAtletas(prev=>prev.filter(a=>a.id!==confirmDeleteAtleta.id));
                setConfirmDeleteAtleta(null);
              }}>
              <Trash2 size={14}/> Eliminar atleta
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Modal editar datos básicos del mesociclo ───────────────────────────────
function EditMesoModal({ meso, onSave, onClose }) {
  const [form, setForm] = useState({
    nombre:       meso.nombre      || "",
    descripcion:  meso.descripcion || "",
    fecha_inicio: meso.fecha_inicio,
    modo:         meso.modo,
    irm_arranque: meso.irm_arranque || "",
    irm_envion:   meso.irm_envion  || "",
  });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  return (
    <Modal title="Editar Mesociclo" onClose={onClose}>
      <div className="form-group">
        <label className="form-label">Nombre</label>
        <input className="form-input" value={form.nombre}
          onChange={e=>set("nombre",e.target.value)} placeholder="Ej: Pretemporada 2025"/>
      </div>
      <div className="form-group">
        <label className="form-label">Descripción / Objetivos</label>
        <textarea className="form-input" value={form.descripcion}
          onChange={e=>set("descripcion",e.target.value)}
          placeholder="Objetivos del ciclo..." rows={2} style={{resize:"vertical"}}/>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Fecha inicio</label>
          <input className="form-input" type="text" value={form.fecha_inicio} placeholder="AAAA-MM-DD"
            onChange={e=>set("fecha_inicio",e.target.value)}/>
        </div>
        <div className="form-group">
          <label className="form-label">Modo</label>
          <select className="form-select" value={form.modo} onChange={e=>set("modo",e.target.value)}>
            <option>Preparatorio</option><option>Competitivo</option>
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">IRM Arranque (kg)</label>
          <input className="form-input" type="number" min={65} max={95}
            list="irm-values" value={form.irm_arranque}
            onChange={e=>set("irm_arranque",Number(e.target.value))} placeholder="ej: 80"/>
        </div>
        <div className="form-group">
          <label className="form-label">IRM Envión (kg)</label>
          <input className="form-input" type="number" min={65} max={95}
            list="irm-values" value={form.irm_envion}
            onChange={e=>set("irm_envion",Number(e.target.value))} placeholder="ej: 80"/>
        </div>
      </div>
      <datalist id="irm-values">{IRM_VALUES.map(v=><option key={v} value={v}/>)}</datalist>
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-gold" onClick={()=>onSave(form)}>Guardar cambios</button>
      </div>
    </Modal>
  );
}

// ── Modal editar volumen total y distribución semanal ─────────────────────
function EditVolModal({ meso, onSave, onClose }) {
  const [volTotal, setVolTotal] = useState(meso.volumen_total);
  const [semanas, setSemanas] = useState(meso.semanas.map(s=>({...s})));

  const totalPct = semanas.reduce((s,sem)=>s+Number(sem.pct_volumen),0);

  const updatePct = (idx, val) => {
    const s = [...semanas];
    s[idx] = {...s[idx], pct_volumen: Number(val)};
    setSemanas(s);
  };

  return (
    <Modal title="Editar Volumen y Semanas" onClose={onClose}>
      <div className="form-group">
        <label className="form-label">Repeticiones totales del mesociclo</label>
        <input className="form-input" type="number" value={volTotal}
          onChange={e=>setVolTotal(Number(e.target.value))}/>
      </div>
      <div className="divider"/>
      <div className="form-label mb8">Distribución semanal</div>
      {semanas.map((s,i)=>{
        const repsCalc = Math.round(volTotal * s.pct_volumen / 100);
        return (
          <div key={s.id} style={{
            background:"var(--surface2)", border:"1px solid var(--border)",
            borderRadius:10, padding:"14px 16px", marginBottom:10
          }}>
            <div style={{fontFamily:"'Bebas Neue'",fontSize:16,color:"var(--gold)",marginBottom:10,letterSpacing:".05em"}}>
              SEMANA {s.numero}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <input className="form-input" type="number" min={0} max={100}
                value={s.pct_volumen} onChange={e=>updatePct(i,e.target.value)}
                style={{width:80}}/>
              <span style={{fontFamily:"'Bebas Neue'",fontSize:20,
                color:totalPct===100?"var(--green)":"var(--muted)"}}>%</span>
              <span style={{fontSize:13,color:"var(--muted)"}}>
                → <span style={{color:"var(--gold)",fontFamily:"'Bebas Neue'",fontSize:20}}>{repsCalc}</span> reps
              </span>
            </div>
            <div style={{height:4,background:"var(--surface3)",borderRadius:2,marginTop:10}}>
              <div style={{height:"100%",borderRadius:2,
                width:`${Math.min(s.pct_volumen,100)}%`,
                background:totalPct===100?"var(--green)":"var(--gold)",transition:"width .3s"}}/>
            </div>
          </div>
        );
      })}
      <div style={{
        padding:"10px 14px",borderRadius:8,marginBottom:4,
        background:totalPct===100?"rgba(71,232,160,.08)":"rgba(232,71,71,.08)",
        border:`1px solid ${totalPct===100?"rgba(71,232,160,.3)":"rgba(232,71,71,.3)"}`,
        display:"flex",alignItems:"center",justifyContent:"space-between"
      }}>
        <span style={{fontSize:13,fontWeight:600,color:totalPct===100?"var(--green)":"var(--red)"}}>
          Total: {totalPct}%
        </span>
        <span style={{fontSize:12,color:totalPct===100?"var(--green)":"var(--red)"}}>
          {totalPct===100 ? "✓ Distribución válida" : "Debe sumar exactamente 100%"}
        </span>
      </div>
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-gold"
          style={{opacity:totalPct===100?1:.4,cursor:totalPct===100?"pointer":"not-allowed"}}
          onClick={()=>{ if(totalPct===100) onSave(volTotal,semanas) }}>
          Guardar cambios
        </button>
      </div>
    </Modal>
  );
}

function PageAtleta({ atleta, mesociclos, setMesociclos, onBack, addPlantilla, onLiveMesoData }) {
  const latestMesoRef = useRef(null); // always-current meso for cleanup save
  const [showMeso, setShowMeso] = useState(false);
  const [showEditMeso, setShowEditMeso] = useState(false);
  const [showGuardarPlantilla, setShowGuardarPlantilla] = useState(null); // null | "meso" | "semana"
  const [showEditVol, setShowEditVol] = useState(false);
  const [mesoSelId, setMesoSelId] = useState(null);
  const [vistaActual, setVistaActual] = useState("meso");

  // ── Overrides de porcentajes — persisten en localStorage por atleta ──────────
  const _pctKey = (type) => `liftplan_pct_${atleta.id}_${type}`;

  const [semPctOverrides, setSemPctOverridesRaw] = useState(() => {
    try { return JSON.parse(localStorage.getItem(_pctKey('semOvr')) || 'null') || {}; } catch { return {}; }
  });
  const [semPctManual, setSemPctManualRaw] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(_pctKey('semMan')) || '[]')); } catch { return new Set(); }
  });
  const [turnoPctOverrides, setTurnoPctOverridesRaw] = useState(() => {
    try { return JSON.parse(localStorage.getItem(_pctKey('turnoOvr')) || 'null') || {}; } catch { return {}; }
  });
  const [turnoPctManual, setTurnoPctManualRaw] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(_pctKey('turnoMan')) || '[]')); } catch { return new Set(); }
  });
  const [confirmReset, setConfirmReset] = useState(null);

  // Wrappers que persisten automáticamente
  const setSemPctOverrides = (val) => setSemPctOverridesRaw(prev => {
    const next = typeof val === 'function' ? val(prev) : val;
    try { localStorage.setItem(_pctKey('semOvr'), JSON.stringify(next)); } catch {}
    return next;
  });
  const setSemPctManual = (val) => setSemPctManualRaw(prev => {
    const next = typeof val === 'function' ? val(prev) : val;
    try { localStorage.setItem(_pctKey('semMan'), JSON.stringify([...next])); } catch {}
    return next;
  });
  const setTurnoPctOverrides = (val) => setTurnoPctOverridesRaw(prev => {
    const next = typeof val === 'function' ? val(prev) : val;
    try { localStorage.setItem(_pctKey('turnoOvr'), JSON.stringify(next)); } catch {}
    return next;
  });
  const setTurnoPctManual = (val) => setTurnoPctManualRaw(prev => {
    const next = typeof val === 'function' ? val(prev) : val;
    try { localStorage.setItem(_pctKey('turnoMan'), JSON.stringify([...next])); } catch {}
    return next;
  });

  const resetAllPcts = () => {
    setSemPctOverrides({}); setSemPctManual(new Set());
    setTurnoPctOverrides({}); setTurnoPctManual(new Set());
  };

  const mesoAtleta = mesociclos
    .filter(m => m.atleta_id === atleta.id)
    .sort((a,b) => b.fecha_inicio.localeCompare(a.fecha_inicio));

  const mesoActivoReal = mesoAtleta.find(m => m.activo);

  const mesoVisto = mesoAtleta.find(m => m.id === mesoSelId)
    || mesoActivoReal
    || mesoAtleta[0]
    || null;

  const saveMeso = (m) => {
    const updated = mesociclos.map(x => x.atleta_id === atleta.id ? {...x, activo: false} : x);
    setMesociclos([...updated, {...m, activo: true}]);
    setMesoSelId(m.id);
        setShowMeso(false);
    setVistaActual("meso");
  };

  // Editar solo nombre, fecha, modo, IRM del meso actual
  const saveEditMeso = (changes) => {
    setMesociclos(prev => prev.map(m =>
      m.id === mesoVisto.id ? {...m, ...changes} : m
    ));
    setShowEditMeso(false);
  };

  // Editar volumen total y % semanales
  const saveEditVol = (volTotal, semanas) => {
    setMesociclos(prev => prev.map(m =>
      m.id === mesoVisto.id
        ? {...m, volumen_total: volTotal, semanas: semanas.map(s=>({
            ...s,
            reps_calculadas: Math.round(volTotal * s.pct_volumen / 100),
            reps_ajustadas:  Math.round(volTotal * s.pct_volumen / 100),
          }))}
        : m
    ));
    setShowEditVol(false);
  };

  const setActivo = (m) => {
    setMesociclos(prev => prev.map(x =>
      x.atleta_id === atleta.id ? {...x, activo: x.id === m.id} : x
    ));
  };

  const [confirmDeleteMeso, setConfirmDeleteMeso] = useState(null);
  const deleteMeso = (id) => {
    const meso = mesoAtleta.find(m => m.id === id);
    setConfirmDeleteMeso(meso);
  };

  const updateSemana = (sIdx, newSem) => {
    if (!mesoVisto) return;
    const sems = [...mesoVisto.semanas];
    sems[sIdx] = newSem;
    const updated = {...mesoVisto, semanas: sems};
    setMesociclos(prev => prev.map(m => m.id === updated.id ? updated : m));
  };

  const irm_arr = mesoVisto ? Number(mesoVisto.irm_arranque) : 0;
  const irm_env = mesoVisto ? Number(mesoVisto.irm_envion) : 0;

  // Guardar en cleanup al desmontar (cambio de pestaña)
  useEffect(() => {
    return () => {
      const m = latestMesoRef.current;
      if (!m) return;
      try {
        setMesociclos(prev => prev.map(x => x.id === m.id ? m : x));
        localStorage.setItem('liftplan_mesociclos',
          JSON.stringify((() => { try { return JSON.parse(localStorage.getItem('liftplan_mesociclos')||'[]').map(x=>x.id===m.id?m:x); } catch { return [m]; } })())
        );
      } catch {}
    };
  }, []);

  // ── Estados elevados de PlanillaTurno (para historial completo) ──────────────
  const _ptk = (type) => mesoVisto ? `liftplan_pt_${mesoVisto.id}_${type}` : null;
  const _loadPt = (type, dflt) => {
    try { const k = _ptk(type); return k ? (JSON.parse(localStorage.getItem(k)||'null') ?? dflt) : dflt; } catch { return dflt; }
  };

  const [repsEdit,   setRepsEditRaw]   = useState(() => _loadPt('repsEdit', {}));
  const [manualEdit, setManualEditRaw] = useState(() => new Set(_loadPt('manualEdit', [])));
  const [cellEdit,   setCellEditRaw]   = useState(() => _loadPt('cellEdit', {}));
  const [cellManual, setCellManualRaw] = useState(() => new Set(_loadPt('cellManual', [])));
  const [nameEdit,   setNameEditRaw]   = useState(() => _loadPt('nameEdit', {}));
  const [noteEdit,   setNoteEditRaw]   = useState(() => _loadPt('noteEdit', {}));

  // Reload when meso changes
  const prevPtMesoId = useRef(null);
  useEffect(() => {
    if (!mesoVisto || mesoVisto.id === prevPtMesoId.current) return;
    prevPtMesoId.current = mesoVisto.id;
    const id = mesoVisto.id;
    const get = (t, d) => { try { return JSON.parse(localStorage.getItem(`liftplan_pt_${id}_${t}`)||'null') ?? d; } catch { return d; } };
    setRepsEditRaw(get('repsEdit', {}));
    setManualEditRaw(new Set(get('manualEdit', [])));
    setCellEditRaw(get('cellEdit', {}));
    setCellManualRaw(new Set(get('cellManual', [])));
    setNameEditRaw(get('nameEdit', {}));
    setNoteEditRaw(get('noteEdit', {}));
  }, [mesoVisto?.id]);

  // Emit live data — always keep a ref current, debounce the actual emit
  const liveDataRef = useRef(null);
  liveDataRef.current = {
    atletaId: atleta.id,
    meso: mesoVisto,
    repsEdit, manualEdit,
    cellEdit, cellManual,
    semPctOverrides, semPctManual,
    turnoPctOverrides, turnoPctManual,
  };
  useEffect(() => {
    if (!onLiveMesoData) return;
    const t = setTimeout(() => {
      if (liveDataRef.current?.meso) onLiveMesoData(liveDataRef.current);
    }, 100);
    return () => clearTimeout(t);
  });

  // ── Historial de modificaciones ─────────────────────────────────────────────
  // Stack de snapshots en ref (no causa re-renders), persistido en localStorage
  const histStackRef = useRef(null);
  const histIdxRef   = useRef(0);
  const prevMesoIdRef = useRef(null);

  const histStorageKey = mesoVisto ? `liftplan_hist_meso_${mesoVisto.id}` : null;

  // Carga el stack del meso activo cuando cambia
  useEffect(() => {
    if (!mesoVisto || mesoVisto.id === prevMesoIdRef.current) return;
    prevMesoIdRef.current = mesoVisto.id;
    try {
      const saved = JSON.parse(localStorage.getItem(`liftplan_hist_meso_${mesoVisto.id}`) || 'null');
      if (saved && Array.isArray(saved.stack)) {
        histStackRef.current = saved.stack;
        histIdxRef.current   = saved.idx;
      } else {
        histStackRef.current = [];
        histIdxRef.current   = -1;
      }
    } catch {
      histStackRef.current = [];
      histIdxRef.current   = -1;
    }
  }, [mesoVisto?.id]);

  const [histState, setHistState] = useState({canUndo:false, canRedo:false});

  const persistHistStack = () => {
    if (!histStorageKey) return;
    try { localStorage.setItem(histStorageKey, JSON.stringify({
      stack: histStackRef.current, idx: histIdxRef.current
    })); } catch {}
  };

  // Captura snapshot desde React state (no localStorage — siempre consistente)
  const captureSnapshot = () => {
    if (!mesoVisto) return null;
    return {
      semanas:           JSON.parse(JSON.stringify(mesoVisto.semanas)),
      volumen_total:     mesoVisto.volumen_total,
      irm_arranque:      mesoVisto.irm_arranque,
      irm_envion:        mesoVisto.irm_envion,
      semPctOverrides:   JSON.parse(JSON.stringify(semPctOverrides)),
      turnoPctOverrides: JSON.parse(JSON.stringify(turnoPctOverrides)),
      semPctManual:      [...semPctManual],
      turnoPctManual:    [...turnoPctManual],
      repsEdit:   {...repsEdit},
      manualEdit: [...manualEdit],
      cellEdit:   {...cellEdit},
      cellManual: [...cellManual],
      nameEdit:   {...nameEdit},
      noteEdit:   {...noteEdit},
    };
  };

  // Llamar ANTES de cualquier cambio — guarda el estado actual en el stack
  const _lastPushSnapTime = useRef(0);
  const pushSnap = (forced = false) => {
    if (!mesoVisto) return;
    const now = Date.now();
    if (!forced && now - _lastPushSnapTime.current < 300) return;
    _lastPushSnapTime.current = now;
    if (!histStackRef.current) { histStackRef.current = []; histIdxRef.current = -1; }
    const snap = captureSnapshot();
    const base = histStackRef.current.slice(0, histIdxRef.current + 1);
    const next = [...base, snap].slice(-30);
    histStackRef.current = next;
    histIdxRef.current   = next.length - 1;
    persistHistStack();
    setHistState({ canUndo: histIdxRef.current > 0, canRedo: false });
  };

  const applySnapshot = (snap) => {
    if (!snap || !mesoVisto) return;
    const id = mesoVisto.id;
    const ls = (k,v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
    // 1. Mesociclo
    setMesociclos(prev => prev.map(m => m.id === id
      ? {...m, semanas: snap.semanas, volumen_total: snap.volumen_total,
               irm_arranque: snap.irm_arranque, irm_envion: snap.irm_envion}
      : m
    ));
    // 2. Pct overrides
    setSemPctOverridesRaw(snap.semPctOverrides   || {});
    setTurnoPctOverridesRaw(snap.turnoPctOverrides || {});
    setSemPctManualRaw(new Set(snap.semPctManual   || []));
    setTurnoPctManualRaw(new Set(snap.turnoPctManual || []));
    // 3. PlanillaTurno state — React state + localStorage
    const re = snap.repsEdit   || {};
    const me = snap.manualEdit || [];
    const ce = snap.cellEdit   || {};
    const cm = snap.cellManual || [];
    const ne = snap.nameEdit   || {};
    const no = snap.noteEdit   || {};
    setRepsEditRaw(re);   ls(`liftplan_pt_${id}_repsEdit`,   re);
    setManualEditRaw(new Set(me)); ls(`liftplan_pt_${id}_manualEdit`, me);
    setCellEditRaw(ce);   ls(`liftplan_pt_${id}_cellEdit`,   ce);
    setCellManualRaw(new Set(cm)); ls(`liftplan_pt_${id}_cellManual`, cm);
    setNameEditRaw(ne);   ls(`liftplan_pt_${id}_nameEdit`,   ne);
    setNoteEditRaw(no);   ls(`liftplan_pt_${id}_noteEdit`,   no);
  };

  const canUndoHist = histState.canUndo;
  const canRedoHist = histState.canRedo;

  const undoHist = () => {
    if (!histStackRef.current || histIdxRef.current <= 0) return;
    // Antes de deshacer, guarda el estado actual como siguiente en el stack si no existe
    // (por si el usuario modifica sin haber pusheado el estado actual)
    histIdxRef.current -= 1;
    persistHistStack();
    setHistState({
      canUndo: histIdxRef.current > 0,
      canRedo: histIdxRef.current < histStackRef.current.length - 1
    });
    applySnapshot(histStackRef.current[histIdxRef.current]);
  };

  const redoHist = () => {
    if (!histStackRef.current || histIdxRef.current >= histStackRef.current.length - 1) return;
    histIdxRef.current += 1;
    persistHistStack();
    setHistState({
      canUndo: histIdxRef.current > 0,
      canRedo: histIdxRef.current < histStackRef.current.length - 1
    });
    applySnapshot(histStackRef.current[histIdxRef.current]);
  };

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey||e.metaKey) && e.key==='z' && !e.shiftKey) { e.preventDefault(); undoHist(); }
      if ((e.ctrlKey||e.metaKey) && (e.key==='y'||(e.key==='z'&&e.shiftKey))) { e.preventDefault(); redoHist(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [mesoVisto?.id, histState]);

  // updateMeso: push BEFORE applying
  const updateMeso = (updatedMeso) => {
    latestMesoRef.current = updatedMeso;
    pushSnap();
    setMesociclos(prev => prev.map(m => m.id === updatedMeso.id ? updatedMeso : m));
  };
  const updateSemanaH = (sIdx, newSem) => {
    if (!mesoVisto) return;
    const sems = [...mesoVisto.semanas]; sems[sIdx] = newSem;
    updateMeso({...mesoVisto, semanas: sems});
  };
  const setSemPctOverridesH = (val) => { setSemPctOverrides(val); };
  const setSemPctManualH    = (val) => { setSemPctManual(val); };
  const setTurnoPctOverridesH = (val) => { setTurnoPctOverrides(val); };
  const setTurnoPctManualH    = (val) => { setTurnoPctManual(val); };

  return (
    <div>

      {/* ══════════════════════════════════════════
          BANDA SUPERIOR — Atleta + navegación
      ══════════════════════════════════════════ */}
      <div style={{
        background:"var(--surface)", border:"1px solid var(--border)",
        borderRadius:"14px 14px 0 0", marginBottom:0, marginTop:-28
      }}>
        {/* Fila 1 — identidad + IRM + botones */}
        <div style={{padding:"12px 16px", borderBottom:"1px solid var(--border)"}}>
          {/* Línea superior: back + avatar + nombre + nuevo */}
          <div style={{display:"flex", alignItems:"center", gap:10}}>
            <button className="btn btn-ghost btn-sm" onClick={onBack}
              style={{padding:"5px 10px",fontSize:12,flexShrink:0}}><ChevronLeft size={14}/> Atletas</button>

            <div style={{
              width:36,height:36,borderRadius:"50%",background:"var(--surface3)",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontFamily:"'Bebas Neue'",fontSize:18,color:"var(--gold)",flexShrink:0
            }}>{atleta.nombre.charAt(0)}</div>

            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:"'Bebas Neue'",fontSize:18,color:"var(--text)",
                lineHeight:1.1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {atleta.nombre}
              </div>
              <div style={{fontSize:11,color:"var(--muted)",marginTop:1,
                overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {atleta.email}{atleta.telefono && ` · ${atleta.telefono}`}
              </div>
            </div>

            <button className="btn btn-gold btn-sm" onClick={()=>setShowMeso(true)}
              style={{flexShrink:0,fontSize:11,padding:"5px 10px",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:5}}>
              <Plus size={13}/> Nuevo
            </button>
          </div>

          {/* Línea inferior: IRM + modo + editar */}
          {mesoVisto && (
            <div style={{display:"flex",alignItems:"center",gap:10,marginTop:10,flexWrap:"wrap"}}>
              {mesoVisto.nombre && (
                <div style={{fontFamily:"'Bebas Neue'",fontSize:13,color:"var(--muted)",
                  letterSpacing:".05em",paddingRight:10,borderRight:"1px solid var(--border)"}}>
                  {mesoVisto.nombre}
                </div>
              )}
              {mesoVisto.irm_arranque && (
                <div style={{textAlign:"center"}}>
                  <div style={{fontFamily:"'Bebas Neue'",fontSize:18,color:"var(--gold)",lineHeight:1}}>
                    {mesoVisto.irm_arranque}
                  </div>
                  <div style={{fontSize:9,color:"var(--muted)",textTransform:"uppercase",letterSpacing:".07em"}}>Arr kg</div>
                </div>
              )}
              {mesoVisto.irm_envion && (
                <div style={{textAlign:"center"}}>
                  <div style={{fontFamily:"'Bebas Neue'",fontSize:18,color:"var(--blue)",lineHeight:1}}>
                    {mesoVisto.irm_envion}
                  </div>
                  <div style={{fontSize:9,color:"var(--muted)",textTransform:"uppercase",letterSpacing:".07em"}}>Env kg</div>
                </div>
              )}
              <span className={`badge ${mesoVisto.modo==="Competitivo"?"badge-gold":"badge-blue"}`}
                style={{fontSize:10}}>
                {mesoVisto.modo}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={()=>setShowEditMeso(true)}
                style={{padding:"4px 8px",fontSize:11,marginLeft:"auto"}}>
                <Pencil size={12}/> Editar
              </button>
            </div>
          )}
        </div>

      </div>
      {/* Fila 2 — tabs (fila propia, nunca se solapa) */}
      <div style={{
        display:"flex", alignItems:"stretch",
        position:"sticky", top: typeof window!=="undefined" && window.innerWidth<=480 ? -8 : -28, zIndex:90,
        background:"var(--surface)",
        border:"1px solid var(--border)", borderTop:"none",
        borderRadius:"0 0 14px 14px", marginBottom:20,
        boxShadow:"0 6px 16px rgba(0,0,0,.5)",
        flexDirection:"column"
      }}>
        {/* Fila de tabs + undo/redo — una sola línea sin wrap */}
        <div style={{display:"flex", alignItems:"center", minHeight:44, padding:"0 20px", gap:0, flexWrap:"nowrap", overflow:"hidden"}}>
          <div style={{display:"flex", height:44, flexShrink:0}}>
            {[
              {id:"meso", label:"Planilla"},
              {id:"resumen", label:"Resumen"},
              {id:"pdf", label:"PDF"},
              {id:"historial", label:`Historial${mesoAtleta.length>0?` (${mesoAtleta.length})`:""}`}
            ].map(t=>(
              <button key={t.id} onClick={()=>{ console.log("[CLICK TAB]", t.id); setVistaActual(t.id); }}
                style={{
                  height:44, padding:"0 16px", border:"none", background:"none",
                  color: vistaActual===t.id ? "var(--gold)" : "var(--muted)",
                  fontFamily:"'DM Sans'",fontSize:13,fontWeight:600,
                  cursor:"pointer", borderBottom: vistaActual===t.id ? "2px solid var(--gold)" : "2px solid transparent",
                  transition:"all .2s", whiteSpace:"nowrap", flexShrink:0
                }}>{t.label}</button>
            ))}
          </div>
          <div style={{flex:1}}/>
          {mesoVisto && (
            <div style={{display:"flex",gap:4,flexShrink:0}}>
              <button className="btn btn-ghost btn-sm" onClick={undoHist}
                disabled={!canUndoHist}
                title="Deshacer (Ctrl+Z)"
                style={{opacity:canUndoHist?1:.35,padding:"0 10px",height:44,fontSize:12,
                  display:"flex",alignItems:"center",gap:4}}>
                <Undo2 size={14}/> Deshacer
              </button>
              <button className="btn btn-ghost btn-sm" onClick={redoHist}
                disabled={!canRedoHist}
                title="Rehacer (Ctrl+Y)"
                style={{opacity:canRedoHist?1:.35,padding:"0 10px",height:44,fontSize:12,
                  display:"flex",alignItems:"center",gap:4}}>
                Rehacer <Redo2 size={14}/>
              </button>
            </div>
          )}
        </div>
        {/* Fila selector de ciclo — debajo, solo cuando hay varios mesos */}
        {mesoAtleta.length > 1 && vistaActual==="meso" && mesoVisto && (
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"6px 20px 8px",flexWrap:"wrap",borderTop:"1px solid var(--border)"}}>
            <span style={{fontSize:11,color:"var(--muted)",fontWeight:600,textTransform:"uppercase",
              letterSpacing:".07em",whiteSpace:"nowrap"}}>Ciclo:</span>
            <select className="form-select"
              style={{maxWidth:"min(320px,100%)",padding:"4px 10px",fontSize:12}}
              value={mesoVisto.id}
              onChange={e=>setMesoSelId(e.target.value)}>
              {mesoAtleta.map(m=>(
                <option key={m.id} value={m.id}>
                  {m.nombre ? `${m.nombre} — ` : ""}{m.fecha_inicio} · {m.modo}{m.activo?" ✓":""}
                </option>
              ))}
            </select>
            {mesoVisto.activo
              ? <span className="badge badge-green">Activo</span>
              : <button className="btn btn-xs"
                  style={{background:"rgba(71,232,160,.1)",color:"var(--green)",
                    border:"1px solid rgba(71,232,160,.4)",borderRadius:6,
                    cursor:"pointer",fontWeight:600,fontSize:11,padding:"4px 10px"}}
                  onClick={()=>setActivo(mesoVisto)}>
                  Marcar activo
                </button>
            }
          </div>
        )}
        {mesoAtleta.length === 0 && (
          <div style={{padding:"0 20px 8px",fontSize:12,color:"var(--muted)"}}>
            Sin mesociclos — creá uno para empezar
          </div>
        )}
      </div>

      {/* Sin mesociclos */}
      {mesoAtleta.length === 0 && (
        <div className="card text-center" style={{padding:48}}>
          <div style={{fontSize:40,marginBottom:12}}>📋</div>
          <div style={{fontFamily:"'Bebas Neue'",fontSize:22,color:"var(--muted)"}}>Sin mesociclos</div>
          <div className="text-sm text-muted mt8 mb16">Creá el primer mesociclo para {atleta.nombre}</div>
          <button className="btn btn-gold" onClick={()=>setShowMeso(true)}><Plus size={14}/> Nuevo mesociclo</button>
        </div>
      )}

      {/* ════════════ HISTORIAL ════════════ */}
      {vistaActual==="historial" && mesoAtleta.length > 0 && (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {mesoAtleta.map(m=>(
            <div key={m.id} style={{
              background:"var(--surface)",
              border:`1px solid ${m.activo?"var(--green)":m.id===mesoVisto?.id?"var(--gold)":"var(--border)"}`,
              borderRadius:12, overflow:"hidden", transition:"border .2s"
            }}>
              <div style={{
                padding:"14px 18px", display:"flex", alignItems:"center",
                gap:12, flexWrap:"wrap",
                background: m.activo?"rgba(71,232,160,.05)": m.id===mesoVisto?.id?"rgba(232,197,71,.04)":"transparent"
              }}>
                <div style={{
                  fontFamily:"'Bebas Neue'",fontSize:22,lineHeight:1,
                  color:m.activo?"var(--green)":m.id===mesoVisto?.id?"var(--gold)":"var(--text)",
                  minWidth:110
                }}>{m.fecha_inicio}</div>

                <div style={{display:"flex",flexDirection:"column",gap:3,flex:1}}>
                  {m.nombre && (
                    <div style={{fontWeight:600,fontSize:14,color:"var(--text)"}}>{m.nombre}</div>
                  )}
                  {m.descripcion && (
                    <div style={{fontSize:12,color:"var(--muted)"}}>{m.descripcion}</div>
                  )}
                  <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                    {m.activo && <span className="badge badge-green">● Activo</span>}
                    <span className={`badge ${m.modo==="Competitivo"?"badge-gold":"badge-blue"}`}>{m.modo}</span>
                    <span style={{fontSize:12,color:"var(--muted)"}}>{m.volumen_total} reps</span>
                    {m.irm_arranque&&<span style={{fontSize:12,color:"var(--muted)"}}>ARR <span style={{color:"var(--gold)",fontWeight:700}}>{m.irm_arranque}</span> kg</span>}
                    {m.irm_envion&&<span style={{fontSize:12,color:"var(--muted)"}}>ENV <span style={{color:"var(--blue)",fontWeight:700}}>{m.irm_envion}</span> kg</span>}
                  </div>
                </div>

                <div style={{display:"flex",gap:8,flexShrink:0}}>
                  <button className="btn btn-ghost btn-xs"
                    onClick={()=>{setMesoSelId(m.id);setVistaActual("meso")}}>
                    Ver planilla
                  </button>
                  {!m.activo && (
                    <button className="btn btn-xs"
                      style={{background:"rgba(71,232,160,.1)",color:"var(--green)",
                        border:"1px solid rgba(71,232,160,.4)",borderRadius:6,
                        cursor:"pointer",fontWeight:600,fontSize:11,padding:"3px 10px"}}
                      onClick={()=>setActivo(m)}>
                      Marcar activo
                    </button>
                  )}
                  <button className="btn btn-danger btn-xs" onClick={()=>deleteMeso(m.id)}>✕</button>
                </div>
              </div>

              <div style={{
                padding:"10px 18px 14px", borderTop:"1px solid var(--border)",
                display:"flex",gap:8,flexWrap:"wrap"
              }}>
                {m.semanas.map(s=>(
                  <div key={s.id} style={{
                    background:"var(--surface2)",border:"1px solid var(--border)",
                    borderRadius:8,padding:"8px 14px",textAlign:"center",flex:1,minWidth:60
                  }}>
                    <div style={{fontFamily:"'Bebas Neue'",fontSize:20,color:"var(--gold)",lineHeight:1}}>
                      {s.reps_ajustadas||s.reps_calculadas||0}
                    </div>
                    <div style={{fontSize:10,color:"var(--muted)",textTransform:"uppercase",
                      letterSpacing:".06em",marginTop:3}}>
                      Sem {s.numero} · {s.pct_volumen}%
                    </div>
                    <div style={{height:3,background:"var(--surface3)",borderRadius:2,marginTop:6}}>
                      <div style={{height:"100%",borderRadius:2,width:`${s.pct_volumen}%`,background:"var(--gold)"}}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ════════════ PDF ════════════ */}
      {vistaActual==="pdf" && (
        <PanelTabBoundary tab="PDF principal">
          {mesoVisto
            ? <PagePDF meso={mesoVisto} atleta={atleta} irm_arr={irm_arr} irm_env={irm_env}/>
            : <div style={{padding:40,textAlign:"center",color:"var(--muted)"}}>Sin mesociclo seleccionado</div>
          }
        </PanelTabBoundary>
      )}

      {/* ════════════ RESUMEN ════════════ */}
      {vistaActual==="resumen" && (
        <PanelTabBoundary tab="Resumen principal">
          {mesoVisto
            ? <PageResumen meso={mesoVisto} atleta={atleta} irm_arr={irm_arr} irm_env={irm_env}/>
            : <div style={{padding:40,textAlign:"center",color:"var(--muted)"}}>Sin mesociclo seleccionado</div>
          }
        </PanelTabBoundary>
      )}

      {/* ════════════ PLANILLA ════════════ */}
      {vistaActual==="meso" && mesoVisto && (
        <>
          {/* Stats semanas + botón editar volumen */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8,flexWrap:"wrap",gap:8,minWidth:0}}>
            <div style={{fontSize:12,color:"var(--muted)"}}>
              Total: <span style={{color:"var(--gold)",fontWeight:700}}>{mesoVisto.volumen_total}</span> reps
            </div>
            <button className="btn btn-ghost btn-sm" onClick={()=>setShowEditVol(true)}>
              <Pencil size={12}/> Editar volumen y semanas
            </button>
            <button className="btn btn-ghost btn-sm" onClick={()=>setShowGuardarPlantilla("meso")}
              style={{color:"var(--muted)"}}>
              <Library size={12}/> Guardar como plantilla
            </button>
          </div>

          <div className="stats-row mb16">
            {mesoVisto.semanas.map((s,i)=>{
              const fase = atleta.genero==="f" && atleta.ciclo?.ultimo_inicio
                ? getFaseCiclo(atleta.ciclo, getFechaSemana(mesoVisto.fecha_inicio, s.numero))
                : null;
              const faseInfo = fase ? FASES_CICLO[fase] : null;
              return (
                <div key={s.id} className="stat-box"
                  style={faseInfo ? {border:`1px solid ${faseInfo.color}60`,background:faseInfo.bg} : {}}>
                  <div className="stat-box-val">{s.reps_ajustadas||s.reps_calculadas||0}</div>
                  <div className="stat-box-lbl">Semana {s.numero} · {s.pct_volumen}%</div>
                  {faseInfo && (
                    <div style={{fontSize:10,fontWeight:700,color:faseInfo.color,
                      marginTop:4,display:"flex",alignItems:"center",gap:3}}>
                      <faseInfo.Icon size={11}/> {faseInfo.label}
                    </div>
                  )}
                  <div className="prog-bar">
                    <div className="prog-fill" style={{width:`${s.pct_volumen}%`,
                      background:faseInfo?faseInfo.color:"var(--gold)"}}/>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sembrado mensual completo */}
          <div className="card">
            <div className="flex-between mb16">
              <div className="card-title" style={{marginBottom:0}}>
                Sembrado Mensual

              </div>
            </div>
            <SembradoMensual
              semanas={mesoVisto.semanas}
              irm_arr={irm_arr}
              irm_env={irm_env}
              meso={mesoVisto}
              onChangeSemana={updateSemanaH}
              onChangeTodasSemanas={(newSemanas) => {
                updateMeso({...mesoVisto, semanas: newSemanas});
              }}
            />
            <ResumenGrupos semanas={mesoVisto.semanas} meso={mesoVisto}
              onGuardarDistribucion={(dist)=>{
                try {
                  const stored = JSON.parse(localStorage.getItem('liftplan_plantillas')||'[]');
                  const nuevo = {
                    id:mkId(), tipo:"distribucion", creado:new Date().toISOString().slice(0,10),
                    nombre:`Distribución ${mesoVisto.nombre||'Mesociclo'}`,
                    descripcion:`${mesoVisto.semanas.length} semanas`,
                    periodo:"general", objetivo:"mixto", nivel:"intermedio",
                    distribucion: dist
                  };
                  localStorage.setItem('liftplan_plantillas', JSON.stringify([...stored, nuevo]));
                  alert('Distribución guardada como plantilla');
                } catch(e){}
              }}
              semPctOverrides={semPctOverrides} semPctManual={semPctManual}
              setSemPctOverrides={setSemPctOverridesH} setSemPctManual={setSemPctManualH}
              onRequestReset={(label, fn) => setConfirmReset({label, onConfirm: fn})}
              onBeforeChange={(forced)=>{ if(!forced && histIdxRef.current!=null) pushSnap(); else pushSnap(true); }}
            />
            <DistribucionTurnos semanas={mesoVisto.semanas} meso={mesoVisto}
              turnoPctOverrides={turnoPctOverrides} turnoPctManual={turnoPctManual}
              setTurnoPctOverrides={setTurnoPctOverridesH} setTurnoPctManual={setTurnoPctManualH}
              semPctOverrides={semPctOverrides} semPctManual={semPctManual}
              onRequestReset={(label, fn) => setConfirmReset({label, onConfirm: fn})}
              onBeforeChange={(forced)=>pushSnap(forced)}
            />
            <PlanillaTurno
              semanas={mesoVisto.semanas}
              irm_arr={irm_arr}
              irm_env={irm_env}
              meso={mesoVisto}
              semPctOverrides={semPctOverrides} semPctManual={semPctManual}
              turnoPctOverrides={turnoPctOverrides} turnoPctManual={turnoPctManual}
              onRequestReset={(label, fn) => setConfirmReset({label, onConfirm: fn})}
              onBeforeChange={(forced)=>{ pushSnap(forced); }}
              repsEdit={repsEdit}   setRepsEdit={setRepsEditRaw}
              manualEdit={manualEdit} setManualEdit={setManualEditRaw}
              cellEdit={cellEdit}   setCellEdit={setCellEditRaw}
              cellManual={cellManual} setCellManual={setCellManualRaw}
              nameEdit={nameEdit}   setNameEdit={setNameEditRaw}
              noteEdit={noteEdit}   setNoteEdit={setNoteEditRaw}
            />
          </div>
        </>
      )}

      {/* ════ MODAL confirmar reset ════ */}
      {confirmReset && (
        <Modal title="Confirmar reseteo" onClose={() => setConfirmReset(null)}>
          <p style={{color:"var(--text)",fontSize:14,marginBottom:20}}>
            ¿Resetear <strong style={{color:"var(--gold)"}}>{confirmReset.label}</strong> a los valores calculados automáticamente? Esta acción no se puede deshacer.
          </p>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirmReset(null)}>Cancelar</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { confirmReset.onConfirm(); setConfirmReset(null); }}>
              Resetear
            </button>
          </div>
        </Modal>
      )}
      {showMeso && <MesocicloForm atleta={atleta} onSave={saveMeso} onClose={()=>setShowMeso(false)}/>}

      {/* ════ MODAL editar datos del meso ════ */}
      {showEditMeso && mesoVisto && (
        <EditMesoModal meso={mesoVisto} onSave={saveEditMeso} onClose={()=>setShowEditMeso(false)}/>
      )}

      {/* ════ MODAL editar volumen y semanas ════ */}
      {showEditVol && mesoVisto && (
        <EditVolModal meso={mesoVisto} onSave={saveEditVol} onClose={()=>setShowEditVol(false)}/>
      )}

      {confirmDeleteMeso && (
        <Modal title="Eliminar mesociclo" onClose={()=>setConfirmDeleteMeso(null)}>
          <p style={{fontSize:13,color:"var(--text)",marginBottom:8}}>
            ¿Eliminar <strong>{confirmDeleteMeso.nombre || "este mesociclo"}</strong>?
          </p>
          <p style={{fontSize:12,color:"var(--muted)",marginBottom:20}}>
            Se perderán todos los datos del ciclo. Esta acción no se puede deshacer.
          </p>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button className="btn btn-ghost" onClick={()=>setConfirmDeleteMeso(null)}>Cancelar</button>
            <button className="btn" style={{background:"var(--red)",color:"#fff"}}
              onClick={()=>{
                setMesociclos(prev => prev.filter(m => m.id !== confirmDeleteMeso.id));
                if (mesoSelId === confirmDeleteMeso.id) setMesoSelId(null);
                setConfirmDeleteMeso(null);
              }}>
              <Trash2 size={14}/> Eliminar mesociclo
            </button>
          </div>
        </Modal>
      )}

      {showGuardarPlantilla && mesoVisto && (
        <GuardarPlantillaModal
          tipo={showGuardarPlantilla}
          dataMeso={showGuardarPlantilla==="meso" ? mesoVisto : null}
          onSave={p => addPlantilla && addPlantilla(p)}
          onClose={()=>setShowGuardarPlantilla(null)}/>
      )}
    </div>
  );
}


function PageResumen({ meso, atleta, irm_arr, irm_env }) {
  const [semActiva, setSemActiva] = useState(null);
  const [turnoActivo, setTurnoActivo] = useState(null);

  // Recharts via import (disponible en el entorno React)
  const [RC, setRC] = useState({});
  useEffect(() => {
    import('recharts').then(m => setRC(m)).catch(() => {
      // fallback: intentar desde window si ya fue cargado
      if (window.Recharts) setRC(window.Recharts);
    });
  }, []);
  const { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, Cell } = RC;
  const hasRecharts = !!BarChart;

  const normativos = (() => {
    try { return JSON.parse(localStorage.getItem('liftplan_normativos') || 'null') || EJERCICIOS; }
    catch { return EJERCICIOS; }
  })();
  const tablas = (() => {
    try { return JSON.parse(localStorage.getItem('liftplan_tablas') || 'null') || TABLA_DEFAULT; }
    catch { return TABLA_DEFAULT; }
  })();

  // ── Leer repsEdit y cellEdit del localStorage del mesociclo ─────────────────
  const repsEditSaved = (() => {
    try { return JSON.parse(localStorage.getItem(`liftplan_pt_${meso.id}_repsEdit`) || 'null') || {}; }
    catch { return {}; }
  })();
  const manualEditSaved = (() => {
    try { return new Set(JSON.parse(localStorage.getItem(`liftplan_pt_${meso.id}_manualEdit`) || '[]')); }
    catch { return new Set(); }
  })();
  const cellEditSaved = (() => {
    try { return JSON.parse(localStorage.getItem(`liftplan_pt_${meso.id}_cellEdit`) || 'null') || {}; }
    catch { return {}; }
  })();
  const cellManualSaved = (() => {
    try { return new Set(JSON.parse(localStorage.getItem(`liftplan_pt_${meso.id}_cellManual`) || '[]')); }
    catch { return new Set(); }
  })();

  // Obtener reps efectivas para un ejercicio (con overrides de repsEdit)
  const getRepsVal = (ej, semIdx, tIdx) => {
    const k = `${semIdx}-${tIdx}-${ej.id}`;
    if (manualEditSaved.has(k) && repsEditSaved[k] !== undefined) return Number(repsEditSaved[k]);
    if (ej.reps_asignadas > 0) return ej.reps_asignadas;
    // Calcular tentativa igual que PlanillaTurno
    const sem = meso.semanas[semIdx];
    if (!sem) return 0;
    const reps_sem = meso.volumen_total * (sem.pct_volumen / 100);
    const { porGrupo, totalSem } = calcSembradoSemana(sem);
    const ejData2 = normativos.find(e => e.id === Number(ej.ejercicio_id));
    if (!ejData2) return 0;
    const g = getGrupo(ej.ejercicio_id);
    if (!g || totalSem === 0) return 0;
    const pctGSem = porGrupo[g].total / totalSem;
    const pctGTurno = porGrupo[g].porTurno[tIdx] / (porGrupo[g].total || 1);
    const repsBloque = Math.round(reps_sem * pctGSem * pctGTurno);
    // Distribuir entre ejercicios del grupo en el turno
    const ejsG = sem.turnos[tIdx].ejercicios.filter(e => e.ejercicio_id && getGrupo(e.ejercicio_id) === g);
    if (ejsG.length === 0) return 0;
    const base = Math.floor(repsBloque / ejsG.length);
    const extra = repsBloque - base * ejsG.length;
    const idx = ejsG.findIndex(e => e.id === ej.id);
    return base + (idx < extra ? 1 : 0);
  };

  // ── Función core: calcular métricas de un array de {ej, semIdx, tIdx} ────
  const calcMetricas = (pairs) => {
    let volReps=0, volKg=0, sumIntReps=0;
    let levGrupo={Arranque:0,Envion:0,Tirones:0,Piernas:0,Complementarios:0};
    let tonGrupo={Arranque:0,Envion:0,Tirones:0,Piernas:0,Complementarios:0};
    let sumIntMed=0, repsConIRM=0;

    pairs.forEach(({ej, semIdx, tIdx}) => {
      const ejData = normativos.find(e => e.id === Number(ej.ejercicio_id));
      if (!ejData) return;
      const repsVal = getRepsVal(ej, semIdx, tIdx);
      const calcs = calcSeriesRepsKg(tablas, ej, ejData, irm_arr, irm_env, meso.modo, repsVal);
      if (!calcs) return;

      let vR=0, vK=0;
      INTENSIDADES.forEach((intens, iIdx) => {
        const c = calcs[iIdx];
        if (!c) return;
        const ckf = (f) => `${semIdx}-${tIdx}-${ej.id}-${intens}-${f}`;
        const getV = (f, def) => cellManualSaved.has(ckf(f)) ? (Number(cellEditSaved[ckf(f)])||0) : (def||0);
        const s = getV('series', c.series);
        const r = getV('reps',   c.reps_serie);
        const kg= getV('kg',     c.kg);
        if (r === 0) return;
        const sEff = (s && s > 0) ? s : 1;
        const rT = Math.round(sEff) * Math.round(r);
        if (rT === 0) return;
        vR += rT; vK += rT * (kg || 0);
        sumIntReps += intens * rT;
      });

      volReps += vR; volKg += vK;
      const cat = ejData.categoria || "Complementarios";
      levGrupo[cat] = (levGrupo[cat]||0) + vR;
      tonGrupo[cat] = (tonGrupo[cat]||0) + vK;

      const irm2 = ejData.base==="arranque" ? Number(irm_arr) : Number(irm_env);
      const kgB = irm2 && ejData.pct_base ? irm2*ejData.pct_base/100 : null;
      if (kgB && vR>0 && vK>0) {
        sumIntMed += (vK/vR)/kgB*100 * vR;
        repsConIRM += vR;
      }
    });

    const pesoMedio = volReps>0 ? Math.round(volKg/volReps*2)/2 : 0;
    const coefInt   = volReps>0 ? Math.round(sumIntReps/volReps*10)/10 : 0;
    const intMedia  = repsConIRM>0 ? Math.round(sumIntMed/repsConIRM) : 0;
    const totalLev  = Object.values(levGrupo).reduce((a,b)=>a+b,0);
    const grupoData = Object.entries(levGrupo).filter(([,v])=>v>0).map(([g,v])=>({
      name:g, lev:v, ton:Math.round(tonGrupo[g]),
      pct: totalLev>0 ? Math.round(v/totalLev*100) : 0,
      color: CAT_COLOR[g]
    }));
    return { volReps, volKg:Math.round(volKg), pesoMedio, coefInt, intMedia, grupoData };
  };

  // ── Métricas por semana ───────────────────────────────────────────────────
  const metSemanas = meso.semanas.map((sem, semIdx) => {
    const pairs = sem.turnos.flatMap((t, tIdx) =>
      t.ejercicios.filter(e=>e.ejercicio_id).map(ej=>({ej, semIdx, tIdx}))
    );
    return { label:`Sem ${sem.numero}`, pct:sem.pct_volumen,
      plan:Math.round(meso.volumen_total*sem.pct_volumen/100),
      ...calcMetricas(pairs) };
  });

  // ── Métricas por turno de la semana activa ────────────────────────────────
  const semVista = semActiva !== null ? meso.semanas[semActiva] : null;
  const metTurnos = semVista ? semVista.turnos.map((t, tIdx) => {
    const pairs = t.ejercicios.filter(e=>e.ejercicio_id).map(ej=>({ej, semIdx:semActiva, tIdx}));
    return { label: t.dia ? `T${tIdx+1} ${t.dia.slice(0,3)}` : `T${tIdx+1}`,
      ...calcMetricas(pairs) };
  }).filter(t=>t.volReps>0) : [];

  // ── Métricas globales del mesociclo ───────────────────────────────────────
  const totMeso = calcMetricas(
    meso.semanas.flatMap((sem,semIdx) =>
      sem.turnos.flatMap((t,tIdx) =>
        t.ejercicios.filter(e=>e.ejercicio_id).map(ej=>({ej,semIdx,tIdx}))
      )
    )
  );

  // ── UI helpers ────────────────────────────────────────────────────────────
  const CustomTooltip = ({active,payload,label}) => {
    if (!active||!payload?.length) return null;
    return (
      <div style={{background:"var(--surface)",border:"1px solid var(--border)",
        borderRadius:8,padding:"8px 12px",fontSize:11}}>
        <div style={{color:"var(--gold)",fontFamily:"'Bebas Neue'",fontSize:13,marginBottom:4}}>{label}</div>
        {payload.map((p,i)=>(
          <div key={i} style={{color:p.color,display:"flex",gap:8,justifyContent:"space-between"}}>
            <span>{p.name}:</span><span style={{fontWeight:700}}>{p.value}</span>
          </div>
        ))}
      </div>
    );
  };

  const cardStyle = {background:"var(--surface)",border:"1px solid var(--border)",borderRadius:12,padding:"16px 20px"};

  const MetricBox = ({label,value,sub,color="var(--gold)"}) => (
    <div style={{background:"var(--surface2)",border:"1px solid var(--border)",
      borderRadius:10,padding:"10px 12px",textAlign:"center",flex:1,minWidth:80}}>
      <div style={{fontFamily:"'Bebas Neue'",fontSize:24,color,lineHeight:1}}>{value}</div>
      <div style={{fontSize:9,color:"var(--muted)",textTransform:"uppercase",letterSpacing:".06em",marginTop:3}}>{label}</div>
      {sub && <div style={{fontSize:10,color:"var(--muted)",marginTop:1}}>{sub}</div>}
    </div>
  );

  // Datos activos según navegación
  const chartDataSem = metSemanas.map(s=>({
    name:s.label, "Vol. Real":s.volReps, "Planificado":s.plan,
    "Tonelaje":s.volKg, "Int. Media":s.intMedia, "Coef. Int.":s.coefInt,
    "Peso Medio":s.pesoMedio
  }));

  const chartDataTurno = metTurnos.map(t=>({
    name:t.label, "Vol. Reps":t.volReps, "Tonelaje":t.volKg,
    "Int. Media":t.intMedia, "Coef. Int.":t.coefInt, "Peso Medio":t.pesoMedio
  }));

  const vistaMetricas = semActiva!==null && turnoActivo!==null
    ? calcMetricas(semVista.turnos[turnoActivo]?.ejercicios.filter(e=>e.ejercicio_id).map(ej=>({ej,semIdx:semActiva,tIdx:turnoActivo}))||[])
    : semActiva!==null ? calcMetricas(semVista.turnos.flatMap((t,tIdx)=>t.ejercicios.filter(e=>e.ejercicio_id).map(ej=>({ej,semIdx:semActiva,tIdx}))))
    : totMeso;

  const vistaLabel = turnoActivo!==null && semVista
    ? `T${turnoActivo+1}${semVista.turnos[turnoActivo]?.dia ? " · "+semVista.turnos[turnoActivo].dia : ""}`
    : semActiva!==null ? `Semana ${semActiva+1}` : "Mesociclo completo";

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>

      {/* ── Navegación semana / turno ─────────────────────────────────── */}
      <div style={cardStyle}>
        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",minWidth:0,overflowX:"auto"}}>
          <button onClick={()=>{setSemActiva(null);setTurnoActivo(null);}}
            style={{padding:"4px 12px",borderRadius:6,border:"none",cursor:"pointer",
              background:semActiva===null?"var(--gold)":"var(--surface3)",
              color:semActiva===null?"#000":"var(--muted)",fontFamily:"'DM Sans'",
              fontSize:12,fontWeight:600}}>
            Mesociclo
          </button>
          {meso.semanas.map((s,i)=>(
            <button key={i} onClick={()=>{setSemActiva(i);setTurnoActivo(null);}}
              style={{padding:"4px 12px",borderRadius:6,border:"none",cursor:"pointer",
                background:semActiva===i && turnoActivo===null?"var(--gold)":"var(--surface3)",
                color:semActiva===i && turnoActivo===null?"#000":"var(--muted)",
                fontFamily:"'DM Sans'",fontSize:12,fontWeight:600}}>
              Sem {s.numero}
            </button>
          ))}
        </div>
        {semActiva!==null && metTurnos.length>0 && (
          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:8,flexWrap:"wrap"}}>
            <span style={{fontSize:10,color:"var(--muted)",fontWeight:600,textTransform:"uppercase",letterSpacing:".06em"}}>Turno:</span>
            {semVista.turnos.map((t,i)=>{
              const hasEjs = t.ejercicios.some(e=>e.ejercicio_id);
              if (!hasEjs) return null;
              return (
                <button key={i} onClick={()=>setTurnoActivo(turnoActivo===i?null:i)}
                  style={{padding:"3px 10px",borderRadius:5,border:"none",cursor:"pointer",
                    background:turnoActivo===i?"var(--blue)":"var(--surface3)",
                    color:turnoActivo===i?"#fff":"var(--muted)",
                    fontFamily:"'DM Sans'",fontSize:11,fontWeight:600}}>
                  T{i+1}{t.dia?` · ${t.dia.slice(0,3)}`:""}
                </button>
              );
            })}
          </div>
        )}
        <div style={{marginTop:8,fontSize:11,color:"var(--muted)"}}>
          Viendo: <span style={{color:"var(--gold)",fontWeight:700}}>{vistaLabel}</span>
        </div>
      </div>

      {/* ── KPIs de la vista activa ───────────────────────────────────── */}
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        <MetricBox label="VOL REPs"    value={vistaMetricas.volReps||"—"} color="var(--gold)"/>
        <MetricBox label="VOL Kg"      value={vistaMetricas.volKg||"—"}   color="var(--blue)"/>
        <MetricBox label="Peso Medio"  value={vistaMetricas.pesoMedio ? `${vistaMetricas.pesoMedio} kg` : "—"} color="var(--green)"/>
        <MetricBox label="Int. Media"  value={vistaMetricas.intMedia ? `${vistaMetricas.intMedia}%` : "—"} color="#9b87e8"/>
        {semActiva===null && <MetricBox label="IRM Arranque" value={irm_arr ? `${irm_arr} kg`:"—"} color="var(--gold)"/>}
        {semActiva===null && <MetricBox label="IRM Envión"   value={irm_env ? `${irm_env} kg`:"—"} color="var(--blue)"/>}
      </div>

      {/* ── Gráficos (solo cuando hay datos suficientes) ──────────────── */}
      {!hasRecharts && (
        <div style={{...cardStyle,textAlign:"center",color:"var(--muted)",padding:32,fontSize:12}}>
          Los gráficos requieren conexión para cargar la librería de visualización.<br/>
          Las tablas y métricas están disponibles igualmente.
        </div>
      )}

      {hasRecharts && semActiva===null && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))",gap:16}}>

          {/* Volumen por semana */}
          <div style={cardStyle}>
            <div style={{fontFamily:"'Bebas Neue'",fontSize:15,color:"var(--text)",marginBottom:10}}>
              Volumen por semana
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartDataSem} barGap={3}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                <XAxis dataKey="name" tick={{fill:"var(--muted)",fontSize:10}}/>
                <YAxis tick={{fill:"var(--muted)",fontSize:9}}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Legend wrapperStyle={{fontSize:10}}/>
                <Bar dataKey="Planificado" fill="rgba(232,197,71,.2)" radius={[3,3,0,0]}/>
                <Bar dataKey="Vol. Real"   fill="var(--gold)"          radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Intensidad media por semana */}
          <div style={cardStyle}>
            <div style={{fontFamily:"'Bebas Neue'",fontSize:15,color:"var(--text)",marginBottom:10}}>
              Intensidad media por semana
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartDataSem}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                <XAxis dataKey="name" tick={{fill:"var(--muted)",fontSize:10}}/>
                <YAxis tick={{fill:"var(--muted)",fontSize:9}}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Legend wrapperStyle={{fontSize:10}}/>
                <Line type="monotone" dataKey="Int. Media" stroke="#9b87e8" strokeWidth={2} dot={{r:4,fill:"#9b87e8"}}/>
                <Line type="monotone" dataKey="Coef. Int." stroke="var(--green)" strokeWidth={2} dot={{r:4,fill:"var(--green)"}}/>
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={cardStyle}>
            <div style={{fontFamily:"'Bebas Neue'",fontSize:15,color:"var(--text)",marginBottom:10}}>
              Peso Medio por semana
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartDataSem}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                <XAxis dataKey="name" tick={{fill:"var(--muted)",fontSize:10}}/>
                <YAxis tick={{fill:"var(--muted)",fontSize:9}}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Line type="monotone" dataKey="Peso Medio" name="Peso Medio (kg)" stroke="var(--blue)" strokeWidth={2} dot={{r:4,fill:"var(--blue)"}}/>
              </LineChart>
            </ResponsiveContainer>
          </div>


          {/* Distribución por grupo */}
          <div style={cardStyle}>
            <div style={{fontFamily:"'Bebas Neue'",fontSize:15,color:"var(--text)",marginBottom:10}}>
              Distribución por grupo
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={totMeso.grupoData} layout="vertical" barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                <XAxis type="number" tick={{fill:"var(--muted)",fontSize:9}}/>
                <YAxis dataKey="name" type="category" tick={{fill:"var(--muted)",fontSize:9}} width={88}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Bar dataKey="lev" name="Levant." radius={[0,3,3,0]}>
                  {totMeso.grupoData.map((g,i)=><Cell key={i} fill={g.color}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Gráficos por semana — turnos */}
      {hasRecharts && semActiva!==null && turnoActivo===null && metTurnos.length>0 && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))",gap:16}}>
          <div style={cardStyle}>
            <div style={{fontFamily:"'Bebas Neue'",fontSize:15,color:"var(--text)",marginBottom:10}}>
              Vol. Reps por turno — Semana {semActiva+1}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartDataTurno}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                <XAxis dataKey="name" tick={{fill:"var(--muted)",fontSize:10}}/>
                <YAxis tick={{fill:"var(--muted)",fontSize:9}}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Bar dataKey="Vol. Reps" fill="var(--gold)" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={cardStyle}>
            <div style={{fontFamily:"'Bebas Neue'",fontSize:15,color:"var(--text)",marginBottom:10}}>
              Tonelaje por turno — Semana {semActiva+1}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartDataTurno}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                <XAxis dataKey="name" tick={{fill:"var(--muted)",fontSize:10}}/>
                <YAxis tick={{fill:"var(--muted)",fontSize:9}}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Bar dataKey="Tonelaje" fill="var(--blue)" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={cardStyle}>
            <div style={{fontFamily:"'Bebas Neue'",fontSize:15,color:"var(--text)",marginBottom:10}}>
              Int. Media por turno — Sem {semActiva+1}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartDataTurno}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                <XAxis dataKey="name" tick={{fill:"var(--muted)",fontSize:10}}/>
                <YAxis tick={{fill:"var(--muted)",fontSize:9}}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Line type="monotone" dataKey="Int. Media" name="Int. Media (%)" stroke="#9b87e8" strokeWidth={2} dot={{r:4,fill:"#9b87e8"}}/>
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={{...cardStyle, gridColumn:"1 / -1"}}>
            <div style={{fontFamily:"'Bebas Neue'",fontSize:15,color:"var(--text)",marginBottom:10}}>
              Peso Medio por turno — Sem {semActiva+1}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartDataTurno}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                <XAxis dataKey="name" tick={{fill:"var(--muted)",fontSize:10}}/>
                <YAxis tick={{fill:"var(--muted)",fontSize:9}}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Line type="monotone" dataKey="Peso Medio" name="Peso Medio (kg)" stroke="var(--blue)" strokeWidth={2} dot={{r:4,fill:"var(--blue)"}}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Tabla resumen ─────────────────────────────────────────────── */}
      {semActiva===null && (
        <div style={cardStyle}>
          <div style={{fontFamily:"'Bebas Neue'",fontSize:15,color:"var(--text)",marginBottom:10}}>
            Tabla por semana
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{borderCollapse:"separate",borderSpacing:"3px 2px",width:"100%"}}>
              <thead>
                <tr>
                  {["Semana","% Vol","Planif.","VOL REPs","VOL Kg","Peso Medio","Int. Media"].map(h=>(
                    <th key={h} style={{padding:"5px 8px",background:"var(--surface2)",
                      border:"1px solid var(--border)",borderRadius:5,
                      fontSize:9,color:"var(--muted)",fontWeight:700,
                      textTransform:"uppercase",letterSpacing:".05em",textAlign:"center",
                      whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metSemanas.map((s,i)=>(
                  <tr key={i} style={{cursor:"pointer"}} onClick={()=>setSemActiva(i)}>
                    <td style={{padding:"6px 8px",fontFamily:"'Bebas Neue'",fontSize:16,color:"var(--gold)",textAlign:"center",border:"1px solid var(--border)",borderRadius:5}}>{s.label}</td>
                    <td style={{padding:"5px 8px",textAlign:"center",border:"1px solid var(--border)",borderRadius:5,color:"var(--muted)"}}>{s.pct}%</td>
                    <td style={{padding:"5px 8px",textAlign:"center",border:"1px solid var(--border)",borderRadius:5}}>{s.plan}</td>
                    <td style={{padding:"5px 8px",textAlign:"center",background:"rgba(232,197,71,.06)",border:"1px solid rgba(232,197,71,.2)",borderRadius:5,fontFamily:"'Bebas Neue'",fontSize:16,color:"var(--gold)"}}>{s.volReps||"—"}</td>
                    <td style={{padding:"5px 8px",textAlign:"center",background:"rgba(71,180,232,.06)",border:"1px solid rgba(71,180,232,.2)",borderRadius:5,fontFamily:"'Bebas Neue'",fontSize:16,color:"var(--blue)"}}>{s.volKg||"—"}</td>
                    <td style={{padding:"5px 8px",textAlign:"center",background:"rgba(71,232,160,.06)",border:"1px solid rgba(71,232,160,.2)",borderRadius:5,fontFamily:"'Bebas Neue'",fontSize:16,color:"var(--green)"}}>{s.pesoMedio||"—"}</td>
                    <td style={{padding:"5px 8px",textAlign:"center",background:"rgba(155,135,232,.06)",border:"1px solid rgba(155,135,232,.2)",borderRadius:5,fontFamily:"'Bebas Neue'",fontSize:16,color:"#9b87e8"}}>{s.intMedia?`${s.intMedia}%`:"—"}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={3} style={{padding:"5px 8px",textAlign:"right",fontSize:9,color:"var(--muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",borderTop:"2px solid var(--border)"}}>Total</td>
                  <td style={{padding:"5px 8px",textAlign:"center",background:"rgba(232,197,71,.12)",border:"1px solid rgba(232,197,71,.4)",borderRadius:5,fontFamily:"'Bebas Neue'",fontSize:18,color:"var(--gold)",fontWeight:700}}>{totMeso.volReps||"—"}</td>
                  <td style={{padding:"5px 8px",textAlign:"center",background:"rgba(71,180,232,.12)",border:"1px solid rgba(71,180,232,.4)",borderRadius:5,fontFamily:"'Bebas Neue'",fontSize:18,color:"var(--blue)",fontWeight:700}}>{totMeso.volKg||"—"}</td>
                  <td style={{padding:"5px 8px",textAlign:"center",background:"rgba(71,232,160,.12)",border:"1px solid rgba(71,232,160,.4)",borderRadius:5,fontFamily:"'Bebas Neue'",fontSize:18,color:"var(--green)",fontWeight:700}}>{totMeso.pesoMedio?`${totMeso.pesoMedio} kg`:"—"}</td>
                  <td style={{padding:"5px 8px",textAlign:"center",background:"rgba(155,135,232,.12)",border:"1px solid rgba(155,135,232,.4)",borderRadius:5,fontFamily:"'Bebas Neue'",fontSize:18,color:"#9b87e8",fontWeight:700}}>{totMeso.intMedia?`${totMeso.intMedia}%`:"—"}</td>
                </tr>
              </tbody>
            </table>
            <div style={{fontSize:10,color:"var(--muted)",marginTop:6}}>
              💡 Click en una fila para ver el detalle por turnos de esa semana
            </div>
          </div>
        </div>
      )}

      {/* Tabla por turno cuando hay semana seleccionada */}
      {semActiva!==null && turnoActivo===null && metTurnos.length>0 && (
        <div style={cardStyle}>
          <div style={{fontFamily:"'Bebas Neue'",fontSize:15,color:"var(--text)",marginBottom:10}}>
            Detalle por turno — Semana {semActiva+1}
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{borderCollapse:"separate",borderSpacing:"3px 2px",width:"100%"}}>
              <thead>
                <tr>
                  {["Turno","Día","VOL REPs","VOL Kg","Peso Medio","Int. Media"].map(h=>(
                    <th key={h} style={{padding:"5px 8px",background:"var(--surface2)",
                      border:"1px solid var(--border)",borderRadius:5,
                      fontSize:9,color:"var(--muted)",fontWeight:700,
                      textTransform:"uppercase",letterSpacing:".05em",textAlign:"center"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {semVista.turnos.map((t,tIdx)=>{
                  const mt = metTurnos.find(x=>x.label.startsWith(`T${tIdx+1}`));
                  if (!mt) return null;
                  return (
                    <tr key={tIdx} style={{cursor:"pointer"}} onClick={()=>setTurnoActivo(tIdx)}>
                      <td style={{padding:"6px 8px",fontFamily:"'Bebas Neue'",fontSize:16,color:"var(--gold)",textAlign:"center",border:"1px solid var(--border)",borderRadius:5}}>T{tIdx+1}</td>
                      <td style={{padding:"5px 8px",textAlign:"center",border:"1px solid var(--border)",borderRadius:5,color:"var(--muted)",fontSize:11}}>{t.dia||"—"}{t.momento?` ${t.momento.slice(0,1)}`:""}</td>
                      <td style={{padding:"5px 8px",textAlign:"center",background:"rgba(232,197,71,.06)",border:"1px solid rgba(232,197,71,.2)",borderRadius:5,fontFamily:"'Bebas Neue'",fontSize:16,color:"var(--gold)"}}>{mt.volReps||"—"}</td>
                      <td style={{padding:"5px 8px",textAlign:"center",background:"rgba(71,180,232,.06)",border:"1px solid rgba(71,180,232,.2)",borderRadius:5,fontFamily:"'Bebas Neue'",fontSize:16,color:"var(--blue)"}}>{mt.volKg||"—"}</td>
                      <td style={{padding:"5px 8px",textAlign:"center",background:"rgba(71,232,160,.06)",border:"1px solid rgba(71,232,160,.2)",borderRadius:5,fontFamily:"'Bebas Neue'",fontSize:16,color:"var(--green)"}}>{mt.pesoMedio||"—"}</td>
                      <td style={{padding:"5px 8px",textAlign:"center",background:"rgba(155,135,232,.06)",border:"1px solid rgba(155,135,232,.2)",borderRadius:5,fontFamily:"'Bebas Neue'",fontSize:16,color:"#9b87e8"}}>{mt.intMedia?`${mt.intMedia}%`:"—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{fontSize:10,color:"var(--muted)",marginTop:6}}>
              💡 Click en un turno para ver sus métricas individuales
            </div>
          </div>
        </div>
      )}

      {/* Desglose por grupo */}
      {vistaMetricas.grupoData.length>0 && (
        <div style={cardStyle}>
          <div style={{fontFamily:"'Bebas Neue'",fontSize:15,color:"var(--text)",marginBottom:14}}>
            Distribución por grupo — {vistaLabel}
          </div>
          <div style={{display:"flex", gap:8, flexWrap:"wrap", alignItems:"flex-end"}}>
            {vistaMetricas.grupoData.map(g => {
              const maxLev = Math.max(...vistaMetricas.grupoData.map(x => x.lev));
              const pctH = maxLev > 0 ? g.lev / maxLev : 0;
              return (
                <div key={g.name} style={{
                  display:"flex", flexDirection:"column", alignItems:"center",
                  gap:4, minWidth:70, flex:1
                }}>
                  <div style={{fontSize:11,color:"var(--muted)",fontFamily:"'Bebas Neue'",
                    letterSpacing:".05em"}}>{g.lev} reps</div>
                  <div style={{
                    width:"100%", height:Math.max(8, Math.round(100 * pctH)),
                    background:g.color, borderRadius:"4px 4px 0 0",
                    transition:"height .3s", opacity:.85
                  }}/>
                  <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>{g.ton} kg</div>
                  <div style={{fontFamily:"'Bebas Neue'",fontSize:13,color:g.color,
                    letterSpacing:".04em"}}>{g.name.slice(0,3).toUpperCase()}</div>
                  <div style={{fontSize:10,color:"var(--muted)"}}>{g.pct}%</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}


function PagePDF({ meso, atleta, irm_arr, irm_env }) {
  const normativos = (() => {
    try { return JSON.parse(localStorage.getItem('liftplan_normativos') || 'null') || EJERCICIOS; }
    catch { return EJERCICIOS; }
  })();
  const tablas = (() => {
    try { return JSON.parse(localStorage.getItem('liftplan_tablas') || 'null') || TABLA_DEFAULT; }
    catch { return TABLA_DEFAULT; }
  })();
  const repsEditSaved = (() => {
    try { return JSON.parse(localStorage.getItem(`liftplan_pt_${meso.id}_repsEdit`) || 'null') || {}; }
    catch { return {}; }
  })();
  const manualEditSaved = (() => {
    try { return new Set(JSON.parse(localStorage.getItem(`liftplan_pt_${meso.id}_manualEdit`) || '[]')); }
    catch { return new Set(); }
  })();
  const cellEditSaved = (() => {
    try { return JSON.parse(localStorage.getItem(`liftplan_pt_${meso.id}_cellEdit`) || 'null') || {}; }
    catch { return {}; }
  })();
  const cellManualSaved = (() => {
    try { return new Set(JSON.parse(localStorage.getItem(`liftplan_pt_${meso.id}_cellManual`) || '[]')); }
    catch { return new Set(); }
  })();
  const nameEditSaved = (() => {
    try { return JSON.parse(localStorage.getItem(`liftplan_pt_${meso.id}_nameEdit`) || 'null') || {}; }
    catch { return {}; }
  })();
  const noteEditSaved = (() => {
    try { return JSON.parse(localStorage.getItem(`liftplan_pt_${meso.id}_noteEdit`) || 'null') || {}; }
    catch { return {}; }
  })();

  const getRepsVal = (ej, semIdx, tIdx) => {
    const k = `${semIdx}-${tIdx}-${ej.id}`;
    if (manualEditSaved.has(k)) return Number(repsEditSaved[k]) || 0;
    if (ej.reps_asignadas > 0) return ej.reps_asignadas;
    const sem = meso.semanas[semIdx];
    if (!sem) return 0;
    const { porGrupo, totalSem } = calcSembradoSemana(sem);
    const g = getGrupo(ej.ejercicio_id);
    if (!g || totalSem === 0) return 0;
    const pctGSem = porGrupo[g].total / totalSem;
    const pctGTurno = porGrupo[g].porTurno[tIdx] / (porGrupo[g].total || 1);
    const repsBloque = Math.round(meso.volumen_total * (sem.pct_volumen/100) * pctGSem * pctGTurno);
    const ejsG = sem.turnos[tIdx].ejercicios.filter(e => e.ejercicio_id && getGrupo(e.ejercicio_id) === g);
    if (!ejsG.length) return 0;
    const base = Math.floor(repsBloque / ejsG.length);
    const extra = repsBloque - base * ejsG.length;
    const idx = ejsG.findIndex(e => e.id === ej.id);
    return base + (idx < extra ? 1 : 0);
  };

  const getCell = (k, intens, field, calc) =>
    cellManualSaved.has(`${k}-${intens}-${field}`) ? cellEditSaved[`${k}-${intens}-${field}`] : calc;

  const GC = {
    Arranque:"#b8860b", Envion:"#1565c0", Tirones:"#b71c1c",
    Piernas:"#1b5e20", Complementarios:"#4a148c"
  };
  const GB = {
    Arranque:"#fff8e1", Envion:"#e3f2fd", Tirones:"#ffebee",
    Piernas:"#e8f5e9", Complementarios:"#f3e5f5"
  };

  // Calcular métricas resumen por semana
  const metricas = meso.semanas.map((sem, semIdx) => {
    let volReps=0, volKg=0, sumIntReps=0, sumIntMed=0, repsConIRM=0;
    const levGrupo = {Arranque:0,Envion:0,Tirones:0,Piernas:0,Complementarios:0};
    sem.turnos.forEach((t, tIdx) => {
      t.ejercicios.filter(e=>e.ejercicio_id).forEach(ej => {
        const ejData = normativos.find(e=>e.id===Number(ej.ejercicio_id));
        if (!ejData) return;
        const repsVal = getRepsVal(ej, semIdx, tIdx);
        const calcs = calcSeriesRepsKg(tablas, ej, ejData, irm_arr, irm_env, meso.modo, repsVal);
        if (!calcs) return;
        let vR=0, vK=0;
        INTENSIDADES.forEach((intens, iIdx) => {
          const c = calcs[iIdx]; if (!c) return;
          const k2 = `${semIdx}-${tIdx}-${ej.id}`;
          const s = getCell(k2,intens,'series',c.series);
          const r = getCell(k2,intens,'reps',c.reps_serie);
          const kg = getCell(k2,intens,'kg',c.kg);
          if (!r) return;
          const sEff = (s&&s>0)?s:1;
          const rT = Math.round(sEff)*Math.round(r);
          vR+=rT; vK+=rT*(kg||0); sumIntReps+=intens*rT;
        });
        volReps+=vR; volKg+=vK;
        const cat = ejData.categoria||"Complementarios";
        levGrupo[cat]=(levGrupo[cat]||0)+vR;
        const irm2 = ejData.base==="arranque"?Number(irm_arr):Number(irm_env);
        const kgB = irm2&&ejData.pct_base?irm2*ejData.pct_base/100:null;
        if (kgB&&vR>0&&vK>0) { sumIntMed+=(vK/vR)/kgB*100*vR; repsConIRM+=vR; }
      });
    });
    return {
      volReps, volKg:Math.round(volKg),
      pesoMedio: volReps>0?Math.round(volKg/volReps*2)/2:0,
      coefInt: volReps>0?Math.round(sumIntReps/volReps*10)/10:0,
      intMedia: repsConIRM>0?Math.round(sumIntMed/repsConIRM):0,
      levGrupo
    };
  });

  const totalVolReps = metricas.reduce((a,m)=>a+m.volReps,0);
  const totalVolKg   = metricas.reduce((a,m)=>a+m.volKg,0);
  const pesoMedioTotal = totalVolReps>0?Math.round(totalVolKg/totalVolReps*2)/2:0;

  // Bar chart SVG inline para el resumen
  const BarChartSVG = ({data, color, width=200, height=50}) => {
    const max = Math.max(...data.map(d=>d.v), 1);
    const bw = (width-data.length*2)/data.length;
    return (
      <svg viewBox={`0 0 ${width} ${height+20}`} width="100%" style={{overflow:"visible",maxWidth:width}}>
        {data.map((d,i) => {
          const h = Math.max(2, Math.round(d.v/max*(height-4)));
          const x = i*(bw+2);
          return (
            <g key={i}>
              <rect x={x} y={height-h} width={bw} height={h}
                fill={color} opacity={0.85} rx={2}/>
              <text x={x+bw/2} y={height+14} textAnchor="middle"
                fontSize={7} fill="#666">{d.l}</text>
              {d.v>0 && <text x={x+bw/2} y={height-h-3} textAnchor="middle"
                fontSize={7} fontWeight="700" fill={color}>{d.v}</text>}
            </g>
          );
        })}
      </svg>
    );
  };

  // Grupos donut-like horizontal bar
  const GrupoBar = ({levGrupo}) => {
    const total = Object.values(levGrupo).reduce((a,b)=>a+b,0);
    if (!total) return null;
    const grupos = Object.entries(levGrupo).filter(([,v])=>v>0);
    return (
      <div style={{marginTop:6}}>
        <div style={{display:"flex",height:10,borderRadius:4,overflow:"hidden",gap:1}}>
          {grupos.map(([g,v])=>(
            <div key={g} style={{
              flex:v, background:GC[g],
              title:`${g}: ${v}`,
              minWidth:2
            }}/>
          ))}
        </div>
        <div style={{display:"flex",gap:8,marginTop:4,flexWrap:"wrap"}}>
          {grupos.map(([g,v])=>(
            <div key={g} style={{display:"flex",alignItems:"center",gap:3,fontSize:7}}>
              <span style={{width:6,height:6,borderRadius:1,background:GC[g],display:"inline-block"}}/>
              <span style={{color:"#555"}}>{g.slice(0,3).toUpperCase()}</span>
              <span style={{fontWeight:700,color:"#1a1a2e"}}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Helper para convertir ejercicio a row
  const buildEjercicioRow = (ej, semIdx, tIdx, isComplementario = false) => {
    const ejData = normativos.find(e => e.id === Number(ej.ejercicio_id));
    if (!ejData) return null;
    const k = `${semIdx}-${tIdx}-${ej.id}`;
    const nameKey = `${semIdx}-${tIdx}-${ej.ejercicio_id}`;
    const repsVal = getRepsVal(ej, semIdx, tIdx);
    const calcs = calcSeriesRepsKg(tablas, ej, ejData, irm_arr, irm_env, meso.modo, repsVal);
    const cols = INTENSIDADES.map((intens, iIdx) => {
      const c = calcs ? calcs[iIdx] : null;
      const s = getCell(k, intens, 'series', c?.series);
      const r = getCell(k, intens, 'reps', c?.reps_serie);
      const kg = getCell(k, intens, 'kg', c?.kg);
      const noteKey = `${semIdx}-${tIdx}-${ej.id}-${intens}-note`;
      const note = noteEditSaved[noteKey] || "";
      return { intens, s, r, kg, note };
    }).filter(c => c.s || c.r);
    const nombre = nameEditSaved[nameKey] || ejData.nombre;
    const aclaracion = ej.aclaracion ? ` (${ej.aclaracion})` : '';
    return {
      id: ej.ejercicio_id,
      nombre: nombre + aclaracion,
      categoria: ejData.categoria,
      cols,
      isComplementario
    };
  };

  const semTurnos = meso.semanas.map((sem, semIdx) => {
    const turnos = sem.turnos.map((t, tIdx) => {
      const rows = [];

      // Complementarios ANTES
      if (t.complementarios_before?.length > 0) {
        const compBefore = t.complementarios_before.filter(c => c.ejercicio_id);
        compBefore.forEach(comp => {
          const row = buildEjercicioRow(comp, semIdx, tIdx, true);
          if (row) rows.push({ ...row, isComplementarioBefore: true });
        });
      }

      // Ejercicios principales
      const ejs = t.ejercicios.filter(e => e.ejercicio_id);
      ejs.forEach(ej => {
        const row = buildEjercicioRow(ej, semIdx, tIdx, false);
        if (row) rows.push(row);
      });

      // Complementarios DESPUÉS
      if (t.complementarios_after?.length > 0) {
        const compAfter = t.complementarios_after.filter(c => c.ejercicio_id);
        compAfter.forEach(comp => {
          const row = buildEjercicioRow(comp, semIdx, tIdx, true);
          if (row) rows.push({ ...row, isComplementarioAfter: true });
        });
      }

      if (!rows.length) return null;
      return { tIdx, dia: t.dia, momento: t.momento, rows };
    }).filter(Boolean);
    return { sem, semIdx, turnos, met: metricas[semIdx] };
  });

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
      margin-bottom: 16px;
    }

    /* ── Semana header ── */
    .pdf-sem-header {
      display: flex; align-items: stretch; margin-bottom: 10px;
      border: 1px solid #e0e0e0; border-radius: 6px; overflow: hidden;
    }
    .pdf-sem-num {
      background: #0d1117; color: #f0b429;
      font-size: 18px; font-weight: 900; padding: 6px 10px;
      display: flex; align-items: center; justify-content: center;
      min-width: 40px; letter-spacing: -.5px;
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
      background: #1a1a2e; color: #fff;
      padding: 3px 8px; margin: 6px 0 2px;
      display: flex; align-items: center; gap: 6px;
      border-radius: 3px;
    }
    .pdf-turno-num {
      font-size: 9px; font-weight: 900; color: #f0b429;
      text-transform: uppercase; letter-spacing: .04em;
    }
    .pdf-turno-dia { font-size: 8px; color: #aaa; }

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
      font-size: 7px; color: #aaa;
    }
    .pdf-footer strong { color: #1a1a2e; }
  `;

  const [sharing, setSharing] = useState(false);

  const [shareStatus, setShareStatus] = useState('');
  const [downloading, setDownloading] = useState(false);

  const handleShareWhatsApp = () => {
    const phone = atleta.telefono ? atleta.telefono.replace(/\D/g,'') : '';
    const nombre = atleta.nombre;
    const msoNombre = meso.nombre || "Mesociclo";
    const msg = encodeURIComponent(`Hola ${nombre}! Te envío tu planilla: *${msoNombre}* 💪`);
    const waUrl = phone ? `https://wa.me/${phone}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(waUrl, '_blank');
  };

  const handleDownload = () => {
    setDownloading(true);
    try {
      const previewEl = document.getElementById('pdf-preview');
      if (!previewEl) return;
      // Construir HTML con estilos completos
      const style = Array.from(document.querySelectorAll('style'))
        .map(s=>s.innerHTML).join('\n');
      const html = `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${atleta.nombre} — ${meso.nombre||'Mesociclo'}</title>
<style>
body{margin:0;padding:16px;background:#fff;font-family:Helvetica,Arial,sans-serif;}
@media print{@page{size:A4 landscape;margin:8mm}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
${pdfStyle}
</style>
</head>
<body>
${previewEl.outerHTML}
<script>window.onload=function(){window.print()}<\/script>
</body></html>`;
      // Crear blob y link de descarga — funciona en la mayoría de browsers modernos
      const blob = new Blob([html], {type:'text/html;charset=utf-8'});
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${atleta.nombre.replace(/\s+/g,'_')}_${(meso.nombre||'Meso').replace(/\s+/g,'_')}.html`;
      link.click();
      setTimeout(()=>URL.revokeObjectURL(url), 2000);
    } catch(e) {
      alert('Para guardar el PDF: usá el botón del browser "Compartir → Imprimir → Guardar como PDF"');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      <style>{pdfStyle}</style>

      {/* Barra de acciones */}
      <div className="no-print" style={{
        display:"flex",alignItems:"center",justifyContent:"space-between",
        marginBottom:16,padding:"14px 20px",flexWrap:"wrap",gap:10,
        background:"var(--surface)",border:"1px solid var(--border)",borderRadius:12
      }}>
        <div>
          <div style={{fontFamily:"'Bebas Neue'",fontSize:18,color:"var(--gold)",letterSpacing:".05em"}}>
            Vista previa — Planilla del atleta
          </div>
          <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>
            Usá "Guardar como PDF" en el diálogo de impresión · Orientación horizontal A4
          </div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button onClick={handleShareWhatsApp} disabled={sharing}
            style={{
              display:"flex",alignItems:"center",gap:8,padding:"10px 18px",
              background: shareStatus==='error' ? '#e53935' : shareStatus==='done' ? '#43a047' : sharing ? "var(--surface3)" : "#25D366",
              color:"#fff",border:"none",borderRadius:8,cursor: sharing ? "default" : "pointer",
              fontFamily:"'DM Sans'",fontSize:13,fontWeight:600,
              opacity: sharing ? .85 : 1, transition:"all .3s", minWidth:200, justifyContent:"center"
            }}>
            {sharing
              ? <><Download size={15} style={{animation:"spin 1s linear infinite"}}/> Generando PDF...</>
              : shareStatus==='done' ? <><Send size={15}/> Enviado</>
              : shareStatus==='error' ? "Error — reintentando..."
              : <><MessageCircle size={15}/> Enviar por WhatsApp</>}
          </button>
          <button onClick={handleDownload} disabled={downloading} className="btn btn-gold"
            style={{gap:8,padding:"10px 18px",fontSize:13,display:"flex",alignItems:"center",
              opacity:downloading?.7:1,transition:"all .2s"}}>
            <Download size={15} style={downloading?{animation:"spin 1s linear infinite"}:{}}/> 
            {downloading ? "Generando..." : "Descargar PDF"}
          </button>
        </div>
      </div>

      {/* Preview */}
      <div id="pdf-preview" style={{
        background:"#fff",borderRadius:12,overflowX:"auto",
        border:"1px solid var(--border)",boxShadow:"0 8px 40px rgba(0,0,0,.4)",
        WebkitOverflowScrolling:"touch"
      }}>

        {/* ── PORTADA / HEADER ── */}
        <div className="pdf-cover">
          <div>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:4}}>
              <div dangerouslySetInnerHTML={{__html:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 220" width="200" height="73"><defs><linearGradient id="pc-g" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#f5d96a"/><stop offset="40%" stop-color="#e8c547"/><stop offset="100%" stop-color="#b8941e"/></linearGradient><linearGradient id="pc-gh" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#604800"/><stop offset="50%" stop-color="#f5d96a"/><stop offset="100%" stop-color="#604800"/></linearGradient><filter id="pc-glow"><feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#e8c547" flood-opacity="0.4"/></filter></defs><rect x="40" y="20" width="520" height="1.5" rx="1" fill="url(#pc-gh)" opacity="0.7"/><rect x="40" y="200" width="520" height="1.5" rx="1" fill="url(#pc-gh)" opacity="0.7"/><rect x="40" y="20" width="22" height="2" fill="#e8c547"/><rect x="40" y="20" width="2" height="22" fill="#e8c547"/><rect x="538" y="20" width="22" height="2" fill="#e8c547"/><rect x="558" y="20" width="2" height="22" fill="#e8c547"/><rect x="40" y="198" width="22" height="2" fill="#e8c547"/><rect x="40" y="176" width="2" height="24" fill="#e8c547"/><rect x="538" y="198" width="22" height="2" fill="#e8c547"/><rect x="558" y="176" width="2" height="24" fill="#e8c547"/><text x="300" y="78" font-family="Bebas Neue,Impact,Arial Black,sans-serif" font-size="26" letter-spacing="16" fill="url(#pc-g)" text-anchor="middle" filter="url(#pc-glow)">SISTEMA</text><rect x="190" y="88" width="220" height="1" rx="1" fill="#e8c547" opacity="0.4"/><text x="300" y="178" font-family="Bebas Neue,Impact,Arial Black,sans-serif" font-size="100" letter-spacing="2" fill="url(#pc-g)" text-anchor="middle" filter="url(#pc-glow)">IRONLIFTING</text></svg>`}}/>
              <div>
                <div className="pdf-cover-name">{atleta.nombre.toUpperCase()}</div>
              </div>
            </div>
            <div className="pdf-cover-meso">{meso.nombre || "Mesociclo de Entrenamiento"}</div>
            <div className="pdf-cover-sub">
              {meso.fecha_inicio} &nbsp;·&nbsp; {meso.modo}
              &nbsp;·&nbsp; {meso.volumen_total.toLocaleString()} reps totales
            </div>
          </div>
          <div className="pdf-cover-right">
            <div style={{fontSize:8,color:"#888",textTransform:"uppercase",letterSpacing:".08em",marginBottom:6}}>
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
                  <div className="pdf-irm-val" style={{color:"#3090e0"}}>{irm_env}</div>
                  <div className="pdf-irm-lbl">Envión kg</div>
                </div>
              )}
            </div>
            <div style={{fontSize:7,color:"#555",marginTop:10}}>
              {new Date().toLocaleDateString('es-AR',{day:'2-digit',month:'long',year:'numeric'})}
            </div>
          </div>
        </div>
        <div className="pdf-accent-bar"/>

        {/* ── SEMANAS ── */}
        {semTurnos.map(({ sem, semIdx, turnos, met }) => {
          if (!turnos.length) return null;
          return (
            <div key={sem.id} className="pdf-page" style={{padding:"0 12px 16px"}}>

              {/* Sem header */}
              <div className="pdf-sem-header">
                <div className="pdf-sem-num">S{sem.numero}</div>
                <div className="pdf-sem-info">
                  <div className="pdf-sem-title">SEMANA {sem.numero}</div>
                  <div className="pdf-sem-details">
                    {sem.pct_volumen}% del volumen total &nbsp;·&nbsp;
                    {sem.reps_ajustadas || sem.reps_calculadas ||
                      Math.round(meso.volumen_total * sem.pct_volumen / 100)} reps planificadas
                  </div>
                  {met && <GrupoBar levGrupo={met.levGrupo}/>}
                </div>
                <div className="pdf-sem-metrics">
                  {met?.volReps>0 && (
                    <>
                      <div className="pdf-sem-metric">
                        <div className="pdf-sem-metric-val">{met.volReps}</div>
                        <div className="pdf-sem-metric-lbl">Vol. Reps</div>
                      </div>
                      <div className="pdf-sem-metric">
                        <div className="pdf-sem-metric-val">{met.volKg}</div>
                        <div className="pdf-sem-metric-lbl">Vol. Kg</div>
                      </div>
                      <div className="pdf-sem-metric">
                        <div className="pdf-sem-metric-val">{met.pesoMedio}</div>
                        <div className="pdf-sem-metric-lbl">Peso Medio</div>
                      </div>
                      {met.intMedia>0 && (
                        <div className="pdf-sem-metric">
                          <div className="pdf-sem-metric-val">{met.intMedia}%</div>
                          <div className="pdf-sem-metric-lbl">Int. Media</div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Turnos */}
              {turnos.map(({ tIdx, dia, momento, rows }) => (
                <div key={tIdx}>
                  <div className="pdf-turno-header">
                    <span className="pdf-turno-num">Turno {tIdx+1}</span>
                    {dia && (
                      <span className="pdf-turno-dia">
                        {dia}{momento ? ` · ${momento}` : ""}
                      </span>
                    )}
                  </div>

                  <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
                  <table className="pdf-table">
                    <thead>
                      <tr>
                        <th style={{width:20}} className="left"/>
                        <th className="left" style={{minWidth:130}}>Ejercicio</th>
                        {INTENSIDADES.map(v => (
                          <th key={v} className="intens-header" style={{width:58}}>
                            {v}%
                          </th>
                        ))}
                      </tr>
                      <tr>
                        <th/><th/>
                        {INTENSIDADES.map(v => (
                          <th key={v} className="sub-header">
                            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:0,fontSize:6.5}}>
                              <span>Ser</span><span>Rep</span><span>Kg</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        let section = null;
                        return rows.map((row, rIdx) => {
                          const rowArr = [];

                          // Detectar cambios de sección
                          let newSection = null;
                          if (row.isComplementarioBefore) newSection = 'ANTES';
                          else if (row.isComplementarioAfter) newSection = 'DESPUÉS';
                          else newSection = 'PRINCIPAL';

                          if (newSection !== section && rIdx > 0) {
                            section = newSection;
                            const sectionColors = {
                              'ANTES': { bg: '#e3f2fd', text: '#1565c0' },
                              'PRINCIPAL': { bg: '#fff8e1', text: '#b8860b' },
                              'DESPUÉS': { bg: '#e8f5e9', text: '#1b5e20' }
                            };
                            const colors = sectionColors[newSection];
                            rowArr.push(
                              <tr key={`sep-${rIdx}`} style={{height:2, background:'#ddd'}}>
                                <td colSpan={2+INTENSIDADES.length}></td>
                              </tr>
                            );
                          } else if (rIdx === 0) {
                            section = newSection;
                          }

                          const gc = GC[row.categoria] || "#555";
                          const gb = GB[row.categoria] || "#fafafa";
                          const isLast = rIdx === rows.length - 1;

                          rowArr.push(
                            <tr key={rIdx} className={isLast ? "last-ej" : ""} style={{opacity: row.isComplementario ? 0.85 : 1}}>
                              <td style={{padding:"3px 4px"}}>
                                <span style={{
                                  background:gc,color:"#fff",fontSize:8,fontWeight:800,
                                  padding:"1px 4px",borderRadius:2,whiteSpace:"nowrap"
                                }}>{row.id}</span>
                              </td>
                              <td className="left">
                                <span className="ej-nombre" style={{fontStyle: row.isComplementario ? 'italic' : 'normal'}}>{row.nombre}</span>
                              </td>
                              {INTENSIDADES.map(intens => {
                                const col = row.cols.find(c => c.intens === intens);
                                if (!col || !col.s) {
                                  return (
                                    <td key={intens}>
                                      <span className="cell-empty">–</span>
                                    </td>
                                  );
                                }
                                return (
                                  <td key={intens} style={{background:gb}}>
                                    <div className="cell-data">
                                      <span className="cell-series">{col.s}</span>
                                      <span className="cell-reps">{col.r}</span>
                                      <span className="cell-kg">{col.kg}</span>
                                      {col.note && (
                                        <span className="cell-note">{col.note}</span>
                                      )}
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          );

                          return rowArr;
                        }).flat();
                      })()}
                    </tbody>
                  </table>
                  </div>
                </div>
              ))}

              <div className="pdf-footer"><div style={{display:"flex",alignItems:"center",gap:5}}><span dangerouslySetInnerHTML={{__html:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 380" width="14" height="13.3"><defs><linearGradient id="pfs-g" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#f8e47a"/><stop offset="100%" stop-color="#9a7010"/></linearGradient><linearGradient id="pfs-gh" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#604800"/><stop offset="50%" stop-color="#f5d96a"/><stop offset="100%" stop-color="#604800"/></linearGradient></defs><text x="200" y="100" font-family="Arial Black,sans-serif" font-size="32" letter-spacing="14" fill="url(#pfs-g)" text-anchor="middle">SISTEMA</text><rect x="100" y="112" width="200" height="1.5" fill="url(#pfs-gh)" opacity="0.5"/><text x="218" y="300" font-family="Arial Black,sans-serif" font-size="240" letter-spacing="-4" fill="url(#pfs-g)" text-anchor="middle">IL</text><text x="200" y="344" font-family="Arial Black,sans-serif" font-size="15" letter-spacing="9" fill="url(#pfs-g)" text-anchor="middle">IRONLIFTING</text></svg>`}}/><strong>{atleta.nombre}</strong></div><div>Semana {sem.numero} de {meso.semanas.length}</div></div>
            </div>
          );
        })}

        {/* ── PÁGINA DE RESUMEN FINAL ── */}
        <div className="pdf-page pdf-resumen-page" style={{padding:"14px 12px 16px"}}>
          <div className="pdf-resumen-title">Resumen del Mesociclo</div>

          {/* KPIs */}
          <div className="pdf-resumen-grid">
            <div className="pdf-kpi">
              <div className="pdf-kpi-val">{totalVolReps.toLocaleString()}</div>
              <div className="pdf-kpi-lbl">Volumen Total (reps)</div>
            </div>
            <div className="pdf-kpi">
              <div className="pdf-kpi-val" style={{color:"#3090e0"}}>
                {totalVolKg.toLocaleString()}
              </div>
              <div className="pdf-kpi-lbl">Tonelaje Total (kg)</div>
            </div>
            <div className="pdf-kpi">
              <div className="pdf-kpi-val" style={{color:"#30c080"}}>
                {pesoMedioTotal ? `${pesoMedioTotal} kg` : "—"}
              </div>
              <div className="pdf-kpi-lbl">Peso Medio</div>
            </div>
            <div className="pdf-kpi">
              <div className="pdf-kpi-val" style={{color:"#c080f0"}}>
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
                <th style={{textAlign:"left"}}>Semana</th>
                <th>% Vol</th>
                <th>Planificado</th>
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
                    <td style={{textAlign:"left",fontWeight:700}}>Semana {sem.numero}</td>
                    <td>{sem.pct_volumen}%</td>
                    <td>{Math.round(meso.volumen_total*sem.pct_volumen/100)}</td>
                    <td style={{fontWeight:700,color:"#b8860b"}}>{m.volReps||"—"}</td>
                    <td style={{fontWeight:700,color:"#1565c0"}}>{m.volKg||"—"}</td>
                    <td style={{color:"#1b5e20"}}>{m.pesoMedio||"—"}</td>
                    <td style={{color:"#4a148c"}}>{m.intMedia?`${m.intMedia}%`:"—"}</td>
                  </tr>
                );
              })}
              <tr>
                <td style={{textAlign:"left"}}>TOTAL</td>
                <td>100%</td>
                <td>{meso.volumen_total}</td>
                <td style={{color:"#b8860b"}}>{totalVolReps||"—"}</td>
                <td style={{color:"#1565c0"}}>{totalVolKg||"—"}</td>
                <td style={{color:"#1b5e20"}}>{pesoMedioTotal?`${pesoMedioTotal} kg`:"—"}</td>
                <td>—</td>
              </tr>
            </tbody>
          </table>

          {/* Gráfico de barras de volumen por semana */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginTop:8}}>
            <div>
              <div style={{fontSize:8,fontWeight:800,color:"#1a1a2e",textTransform:"uppercase",
                letterSpacing:".08em",marginBottom:8,borderBottom:"1px solid #e0e0e0",paddingBottom:4}}>
                Volumen de Repeticiones por Semana
              </div>
              <BarChartSVG
                data={meso.semanas.map((s,i)=>({v:metricas[i].volReps, l:`S${s.numero}`}))}
                color="#b8860b" width={240} height={60}
              />
            </div>
            <div>
              <div style={{fontSize:8,fontWeight:800,color:"#1a1a2e",textTransform:"uppercase",
                letterSpacing:".08em",marginBottom:8,borderBottom:"1px solid #e0e0e0",paddingBottom:4}}>
                Tonelaje (kg) por Semana
              </div>
              <BarChartSVG
                data={meso.semanas.map((s,i)=>({v:metricas[i].volKg, l:`S${s.numero}`}))}
                color="#1565c0" width={240} height={60}
              />
            </div>
          </div>

          <div className="pdf-footer" style={{marginTop:16}}><div style={{display:"flex",alignItems:"center",gap:6}}><span dangerouslySetInnerHTML={{__html:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 380" width="20" height="19"><defs><linearGradient id="pfm-g" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#f8e47a"/><stop offset="100%" stop-color="#9a7010"/></linearGradient><linearGradient id="pfm-gh" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#604800"/><stop offset="50%" stop-color="#f5d96a"/><stop offset="100%" stop-color="#604800"/></linearGradient></defs><text x="200" y="100" font-family="Arial Black,sans-serif" font-size="32" letter-spacing="14" fill="url(#pfm-g)" text-anchor="middle">SISTEMA</text><rect x="100" y="112" width="200" height="1.5" fill="url(#pfm-gh)" opacity="0.5"/><text x="218" y="300" font-family="Arial Black,sans-serif" font-size="240" letter-spacing="-4" fill="url(#pfm-g)" text-anchor="middle">IL</text><text x="200" y="344" font-family="Arial Black,sans-serif" font-size="15" letter-spacing="9" fill="url(#pfm-g)" text-anchor="middle">IRONLIFTING</text></svg>`}}/><span style={{fontSize:9,color:"#888"}}>Sistema IronLifting</span> <span style={{color:"#aaa"}}>·</span> {atleta.nombre}</div><div>{new Date().toLocaleDateString('es-AR',{day:'2-digit',month:'long',year:'numeric'})}</div></div>
        </div>

      </div>
    </div>
  );
}



// ═══════════════════════════════════════════════════════════════
// SISTEMA DE PLANTILLAS — helpers, PagePlantillas, hooks
// ═══════════════════════════════════════════════════════════════

const PERIODOS   = ["pretemporada","competitivo","transicion","general"];
const OBJETIVOS  = ["fuerza","tecnica","volumen","pico","mixto"];
const NIVELES    = ["principiante","intermedio","elite"];
const PERIODO_LABEL  = {pretemporada:"Pretemporada",competitivo:"Competitivo",transicion:"Transición",general:"General"};
const OBJETIVO_LABEL = {fuerza:"Fuerza",tecnica:"Técnica",volumen:"Volumen",pico:"Pico",mixto:"Mixto"};
const NIVEL_LABEL    = {principiante:"Principiante",intermedio:"Intermedio",elite:"Élite"};

// Escuela Inicial
const ESCUELA_NIVELES = ["1","2","3","4","5"];
const ESCUELA_NIVEL_LABEL = {"1":"Nivel 1","2":"Nivel 2","3":"Nivel 3","4":"Nivel 4","5":"Nivel 5"};
const ESCUELA_NIVEL_COLOR = {"1":"#4db6ac","2":"#81c784","3":"#64b5f6","4":"#ba68c8","5":"#ff8a65"};

const PERIODO_COLOR = {pretemporada:"var(--green)",competitivo:"var(--gold)",transicion:"var(--blue)",general:"var(--muted)"};
const OBJETIVO_COLOR= {fuerza:"#e05050",tecnica:"#9b87e8",volumen:"var(--gold)",pico:"var(--green)",mixto:"var(--blue)"};

const LogoHorizontal = ({height=44}) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 220" height={height} style={{display:"block",flexShrink:0,width:"auto"}}>
    <defs>
      <linearGradient id="lh-g" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style={{stopColor:"#f5d96a"}}/><stop offset="40%" style={{stopColor:"#e8c547"}}/><stop offset="100%" style={{stopColor:"#b8941e"}}/>
      </linearGradient>
      <linearGradient id="lh-gh" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style={{stopColor:"#604800"}}/><stop offset="50%" style={{stopColor:"#f5d96a"}}/><stop offset="100%" style={{stopColor:"#604800"}}/>
      </linearGradient>
      <filter id="lh-glow"><feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#e8c547" floodOpacity="0.5"/></filter>
    </defs>
    <rect x="40" y="20" width="520" height="1.5" rx="1" fill="url(#lh-gh)" opacity="0.7"/>
    <rect x="40" y="200" width="520" height="1.5" rx="1" fill="url(#lh-gh)" opacity="0.7"/>
    <rect x="40" y="20" width="22" height="2" fill="#e8c547"/><rect x="40" y="20" width="2" height="22" fill="#e8c547"/>
    <rect x="538" y="20" width="22" height="2" fill="#e8c547"/><rect x="558" y="20" width="2" height="22" fill="#e8c547"/>
    <rect x="40" y="198" width="22" height="2" fill="#e8c547"/><rect x="40" y="176" width="2" height="24" fill="#e8c547"/>
    <rect x="538" y="198" width="22" height="2" fill="#e8c547"/><rect x="558" y="176" width="2" height="24" fill="#e8c547"/>
    <text x="300" y="78" fontFamily="'Bebas Neue',Impact,'Arial Black',sans-serif" fontSize="26" letterSpacing="16" fill="url(#lh-g)" textAnchor="middle" filter="url(#lh-glow)">SISTEMA</text>
    <rect x="190" y="88" width="220" height="1" rx="1" fill="#e8c547" opacity="0.4"/>
    <text x="300" y="178" fontFamily="'Bebas Neue',Impact,'Arial Black',sans-serif" fontSize="100" letterSpacing="2" fill="url(#lh-g)" textAnchor="middle" filter="url(#lh-glow)">IRONLIFTING</text>
  </svg>
);

const LogoIL = ({size=32}) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 420" width={size} height={size*420/400} style={{display:"block",flexShrink:0}}>
    <defs>
      <linearGradient id="le-g" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style={{stopColor:"#f8e47a"}}/><stop offset="45%" style={{stopColor:"#e8c547"}}/><stop offset="100%" style={{stopColor:"#9a7010"}}/>
      </linearGradient>
      <linearGradient id="le-gh" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style={{stopColor:"#604800"}}/><stop offset="50%" style={{stopColor:"#f5d96a"}}/><stop offset="100%" style={{stopColor:"#604800"}}/>
      </linearGradient>
      <linearGradient id="le-sf" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style={{stopColor:"#161a24"}}/><stop offset="100%" style={{stopColor:"#0a0c12"}}/>
      </linearGradient>
      <linearGradient id="le-ss" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style={{stopColor:"#f5d96a"}}/><stop offset="50%" style={{stopColor:"#e8c547"}}/><stop offset="100%" style={{stopColor:"#9a7010"}}/>
      </linearGradient>
      <filter id="le-glow"><feGaussianBlur stdDeviation="10" result="b"/><feColorMatrix in="b" type="matrix" values="1.2 0.8 0 0 0 0.8 0.6 0 0 0 0 0 0 0 0 0 0 0 0.55 0" result="c"/><feMerge><feMergeNode in="c"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <filter id="le-glowSm"><feGaussianBlur stdDeviation="4" result="b"/><feColorMatrix in="b" type="matrix" values="1.2 0.8 0 0 0 0.8 0.6 0 0 0 0 0 0 0 0 0 0 0 0.4 0" result="c"/><feMerge><feMergeNode in="c"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <clipPath id="le-clip"><path d="M200,44 L358,96 L358,248 Q358,346 200,404 Q42,346 42,248 L42,96 Z"/></clipPath>
    </defs>
    <path d="M200,44 L358,96 L358,248 Q358,346 200,404 Q42,346 42,248 L42,96 Z" fill="url(#le-sf)" stroke="url(#le-ss)" strokeWidth="3.5"/>
    <path d="M200,60 L344,108 L344,246 Q344,334 200,386 Q56,334 56,246 L56,108 Z" fill="none" stroke="#e8c547" strokeWidth="1" opacity="0.3"/>
    <text x="200" y="136" fontFamily="'Bebas Neue',Impact,'Arial Black',sans-serif" fontSize="36" letterSpacing="12" fill="url(#le-g)" textAnchor="middle" filter="url(#le-glowSm)">SISTEMA</text>
    <text x="218" y="305" fontFamily="'Bebas Neue',Impact,'Arial Black',sans-serif" fontSize="210" letterSpacing="-4" fill="url(#le-g)" textAnchor="middle" filter="url(#le-glow)" clipPath="url(#le-clip)">IL</text>
    <rect x="108" y="316" width="184" height="2" rx="1" fill="url(#le-gh)" opacity="0.7"/>
    <text x="200" y="342" fontFamily="'Bebas Neue',Impact,'Arial Black',sans-serif" fontSize="14" letterSpacing="8" fill="url(#le-g)" textAnchor="middle" filter="url(#le-glowSm)">IRONLIFTING</text>
    <circle cx="122" cy="337" r="2" fill="#e8c547" opacity="0.45"/>
    <circle cx="278" cy="337" r="2" fill="#e8c547" opacity="0.45"/>
    <rect x="20" y="20" width="22" height="2" fill="#e8c547" opacity="0.5"/><rect x="20" y="20" width="2" height="22" fill="#e8c547" opacity="0.5"/>
    <rect x="358" y="20" width="22" height="2" fill="#e8c547" opacity="0.5"/><rect x="378" y="20" width="2" height="22" fill="#e8c547" opacity="0.5"/>
    <rect x="20" y="398" width="22" height="2" fill="#e8c547" opacity="0.5"/><rect x="20" y="376" width="2" height="24" fill="#e8c547" opacity="0.5"/>
    <rect x="358" y="398" width="22" height="2" fill="#e8c547" opacity="0.5"/><rect x="378" y="376" width="2" height="24" fill="#e8c547" opacity="0.5"/>
  </svg>
);

const LogoILSolo = ({size=28}) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 380" width={size} height={size*380/400} style={{display:"block",flexShrink:0}}>
    <defs>
      <linearGradient id="ls-g" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style={{stopColor:"#f8e47a"}}/><stop offset="45%" style={{stopColor:"#e8c547"}}/><stop offset="100%" style={{stopColor:"#9a7010"}}/>
      </linearGradient>
      <linearGradient id="ls-gh" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style={{stopColor:"#604800"}}/><stop offset="50%" style={{stopColor:"#f5d96a"}}/><stop offset="100%" style={{stopColor:"#604800"}}/>
      </linearGradient>
      <filter id="ls-glow"><feGaussianBlur stdDeviation="10" result="b"/><feColorMatrix in="b" type="matrix" values="1.2 0.8 0 0 0 0.8 0.6 0 0 0 0 0 0 0 0 0 0 0 0.5 0" result="c"/><feMerge><feMergeNode in="c"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <filter id="ls-glowSm"><feGaussianBlur stdDeviation="3" result="b"/><feColorMatrix in="b" type="matrix" values="1.2 0.8 0 0 0 0.8 0.6 0 0 0 0 0 0 0 0 0 0 0 0.4 0" result="c"/><feMerge><feMergeNode in="c"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <rect x="22" y="22" width="22" height="2" fill="#e8c547" opacity="0.6"/><rect x="22" y="22" width="2" height="22" fill="#e8c547" opacity="0.6"/>
    <rect x="356" y="22" width="22" height="2" fill="#e8c547" opacity="0.6"/><rect x="376" y="22" width="2" height="22" fill="#e8c547" opacity="0.6"/>
    <rect x="22" y="356" width="22" height="2" fill="#e8c547" opacity="0.6"/><rect x="22" y="334" width="2" height="24" fill="#e8c547" opacity="0.6"/>
    <rect x="356" y="356" width="22" height="2" fill="#e8c547" opacity="0.6"/><rect x="376" y="334" width="2" height="24" fill="#e8c547" opacity="0.6"/>
    <text x="200" y="100" fontFamily="'Bebas Neue',Impact,'Arial Black',sans-serif" fontSize="32" letterSpacing="14" fill="url(#ls-g)" textAnchor="middle" filter="url(#ls-glowSm)">SISTEMA</text>
    <rect x="100" y="112" width="200" height="1.5" rx="1" fill="url(#ls-gh)" opacity="0.5"/>
    <text x="218" y="300" fontFamily="'Bebas Neue',Impact,'Arial Black',sans-serif" fontSize="240" letterSpacing="-4" fill="url(#ls-g)" textAnchor="middle" filter="url(#ls-glow)">IL</text>
    <rect x="80" y="318" width="240" height="2" rx="1" fill="url(#ls-gh)" opacity="0.65"/>
    <text x="200" y="344" fontFamily="'Bebas Neue',Impact,'Arial Black',sans-serif" fontSize="15" letterSpacing="9" fill="url(#ls-g)" textAnchor="middle" filter="url(#ls-glowSm)">IRONLIFTING</text>
    <circle cx="112" cy="339" r="2" fill="#e8c547" opacity="0.45"/>
    <circle cx="288" cy="339" r="2" fill="#e8c547" opacity="0.45"/>
  </svg>
);

// ── Hook de historial de modificaciones (persiste en localStorage) ───────────
function useHistory(key, initial, maxLen=30) {
  // stack: array de snapshots, idx apunta al estado actual
  const storageKey = `liftplan_hist_${key}`;

  const [stack, setStack] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (saved && Array.isArray(saved.stack) && saved.stack.length > 0)
        return saved;
    } catch {}
    return { stack: [initial], idx: 0 };
  });

  const persist = (s) => {
    try { localStorage.setItem(storageKey, JSON.stringify(s)); } catch {}
  };

  // Push nuevo estado — descarta el "futuro" si estábamos en medio del historial
  const push = (newState) => {
    setStack(prev => {
      const base   = prev.stack.slice(0, prev.idx + 1);
      const next   = [...base, newState].slice(-maxLen);
      const result = { stack: next, idx: next.length - 1 };
      persist(result);
      return result;
    });
  };

  const undo = () => {
    setStack(prev => {
      if (prev.idx <= 0) return prev;
      const result = { ...prev, idx: prev.idx - 1 };
      persist(result);
      return result;
    });
  };

  const redo = () => {
    setStack(prev => {
      if (prev.idx >= prev.stack.length - 1) return prev;
      const result = { ...prev, idx: prev.idx + 1 };
      persist(result);
      return result;
    });
  };

  const clearHistory = (newInitial) => {
    const result = { stack: [newInitial], idx: 0 };
    setStack(result);
    persist(result);
  };

  const canUndo = stack.idx > 0;
  const canRedo = stack.idx < stack.stack.length - 1;
  const current = stack.stack[stack.idx];

  return { current, push, undo, redo, canUndo, canRedo, clearHistory };
}


function usePlantillas(coachId) {
  const [plantillas, setPlantillas] = useState(() => {
    try {
      const list = JSON.parse(localStorage.getItem('liftplan_plantillas') || '[]');
      // Recuperar borradores más nuevos que el array guardado
      return list.map(p => {
        try {
          const draft = JSON.parse(localStorage.getItem(`liftplan_plt_draft_${p.id}`) || 'null');
          // Usar el borrador si existe (siempre es más reciente)
          return draft || p;
        } catch { return p; }
      });
    }
    catch { return []; }
  });

  // Cargar plantillas desde Supabase al montar
  useEffect(() => {
    if (!coachId) return;
    sb.from('plantillas').select('*').eq('coach_id', coachId).exec().then(({ data, error }) => {
      if (error) return;
      if (data) {
        const appPlantillas = data.filter(r => r.app_id);
        if (appPlantillas.length > 0) {
          const loaded = appPlantillas.map(plantillaFromDb);
          setPlantillas(loaded);
          try { localStorage.setItem('liftplan_plantillas', JSON.stringify(loaded)); } catch {}
        } else {
          // DB vacía — migrar localStorage → DB
          const local = (() => {
            try { return JSON.parse(localStorage.getItem('liftplan_plantillas') || '[]'); } catch { return []; }
          })();
          if (local.length > 0) {
            sb.from('plantillas').upsert(local.map(p => plantillaToDb(p, coachId)), { onConflict: 'app_id' }).catch(() => {});
          }
        }
      }
    }).catch(() => {});
  }, [coachId]);

  const _saveLocal = (ps) => {
    setPlantillas(ps);
    try { localStorage.setItem('liftplan_plantillas', JSON.stringify(ps)); } catch(e) { console.warn('localStorage save failed:', e); }
  };
  const add = (p) => {
    const item = { id: mkId(), creado: new Date().toISOString().slice(0,10), ...p };
    _saveLocal([...plantillas, item]);
    if (coachId) {
      sb.from('plantillas').upsert([plantillaToDb(item, coachId)], { onConflict: 'app_id' }).catch(() => {});
    }
    return item;
  };
  const update = (p) => {
    const next = plantillas.map(x => x.id===p.id ? p : x);
    setPlantillas(next);
    try { localStorage.setItem(`liftplan_plt_draft_${p.id}`, JSON.stringify(p)); } catch {}
    try { localStorage.setItem('liftplan_plantillas', JSON.stringify(next)); } catch(e) { console.warn('localStorage save failed:', e); }
    if (coachId) {
      sb.from('plantillas').upsert([plantillaToDb(p, coachId)], { onConflict: 'app_id' }).catch(() => {});
    }
  };
  const remove = (id) => {
    _saveLocal(plantillas.filter(x => x.id !== id));
    try { localStorage.removeItem(`liftplan_plt_draft_${id}`); } catch {}
    if (coachId) {
      sb.from('plantillas').eq('app_id', id).delete().catch(() => {});
    }
  };
  return { plantillas, add, update, remove };
}

// ── Modal para guardar plantilla desde un mesociclo/semana/distribución ──────
function GuardarPlantillaModal({ tipo, dataMeso, dataSemana, dataDistribucion, onSave, onClose }) {
  const [form, setForm] = useState({
    nombre: dataMeso?.nombre || dataSemana?.nombre || "",
    descripcion: dataMeso?.descripcion || "",
    periodo: "general",
    objetivo: "mixto",
    nivel: "intermedio",
    modo: dataMeso?.modo || "Preparatorio",
  });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const tipoLabel = tipo==="meso" ? "Mesociclo completo" : tipo==="semana" ? "Bloque semanal" : "Distribución de grupos";

  const handleSave = () => {
    if (!form.nombre.trim()) {
      alert('El nombre de la plantilla es obligatorio');
      return;
    }
    const base = {
      ...form,
      tipo,
      duracion_semanas: tipo==="meso" ? (dataMeso?.semanas?.length||4) : tipo==="semana" ? 1 : null,
    };
    if (tipo==="meso" && dataMeso) {
      // Guardar estructura completa con todo
      base.semanas = dataMeso.semanas.map(s=>({
        numero: s.numero, pct_volumen: s.pct_volumen,
        reps_ajustadas: s.reps_ajustadas,
        turnos: s.turnos.map(t=>({
          dia: t.dia, momento: t.momento,
          ejercicios: t.ejercicios.filter(e=>e.ejercicio_id).map(e=>({
            ejercicio_id: e.ejercicio_id, intensidad: e.intensidad,
            tabla: e.tabla, reps_asignadas: e.reps_asignadas || 0
          }))
        }))
      }));
      base.volumen_total = dataMeso.volumen_total;
      base.irm_arranque = dataMeso.irm_arranque;
      base.irm_envion = dataMeso.irm_envion;
      // Guardar overrides de celdas y distribución
      try {
        const id = dataMeso.id;
        base.overrides = {
          repsEdit:    JSON.parse(localStorage.getItem(`liftplan_pt_${id}_repsEdit`)||'{}'),
          manualEdit:  JSON.parse(localStorage.getItem(`liftplan_pt_${id}_manualEdit`)||'[]'),
          cellEdit:    JSON.parse(localStorage.getItem(`liftplan_pt_${id}_cellEdit`)||'{}'),
          cellManual:  JSON.parse(localStorage.getItem(`liftplan_pt_${id}_cellManual`)||'[]'),
          nameEdit:    JSON.parse(localStorage.getItem(`liftplan_pt_${id}_nameEdit`)||'{}'),
          semPcts:     JSON.parse(localStorage.getItem(`liftplan_pct_${id}_semOvr`)||'{}'),
          semPctsMan:  JSON.parse(localStorage.getItem(`liftplan_pct_${id}_semMan`)||'[]'),
          turnoPcts:   JSON.parse(localStorage.getItem(`liftplan_pct_${id}_turnoOvr`)||'{}'),
          turnoPctsMan:JSON.parse(localStorage.getItem(`liftplan_pct_${id}_turnoMan`)||'[]'),
        };
      } catch(e) {}
    }
    if (tipo==="semana" && dataSemana) {
      base.semana = {
        pct_volumen: dataSemana.pct_volumen,
        turnos: dataSemana.turnos.map(t=>({
          dia: t.dia, momento: t.momento,
          ejercicios: t.ejercicios.filter(e=>e.ejercicio_id).map(e=>({
            ejercicio_id: e.ejercicio_id, intensidad: e.intensidad, tabla: e.tabla
          }))
        }))
      };
    }
    if (tipo==="distribucion" && dataDistribucion) {
      base.distribucion = dataDistribucion;
    }
    onSave(base);
    onClose();
  };

  return (
    <Modal title={`Guardar como plantilla — ${tipoLabel}`} onClose={onClose}>
      <div className="form-group">
        <label className="form-label">Nombre de la plantilla *</label>
        <input className="form-input" value={form.nombre} onChange={e=>set("nombre",e.target.value)}
          placeholder="Ej: Pretemporada 4 semanas fuerza"
          style={!form.nombre.trim() ? {borderColor:"var(--red)"} : {}}/>
        {!form.nombre.trim() && <span style={{fontSize:10,color:"var(--red)"}}>Requerido</span>}
      </div>
      <div className="form-group">
        <label className="form-label">Descripción</label>
        <textarea className="form-input" value={form.descripcion} onChange={e=>set("descripcion",e.target.value)}
          placeholder="Características, contexto de uso..." rows={2} style={{resize:"vertical"}}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <div className="form-group">
          <label className="form-label">Período</label>
          <select className="form-select" value={form.periodo} onChange={e=>set("periodo",e.target.value)}>
            {PERIODOS.map(p=><option key={p} value={p}>{PERIODO_LABEL[p]}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Objetivo</label>
          <select className="form-select" value={form.objetivo} onChange={e=>set("objetivo",e.target.value)}>
            {OBJETIVOS.map(o=><option key={o} value={o}>{OBJETIVO_LABEL[o]}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Nivel atleta</label>
          <select className="form-select" value={form.nivel} onChange={e=>set("nivel",e.target.value)}>
            {NIVELES.map(n=><option key={n} value={n}>{NIVEL_LABEL[n]}</option>)}
          </select>
        </div>
        {tipo==="meso" && (
          <div className="form-group">
            <label className="form-label">Modo</label>
            <select className="form-select" value={form.modo} onChange={e=>set("modo",e.target.value)}>
              <option>Preparatorio</option><option>Competitivo</option>
            </select>
          </div>
        )}
      </div>
      {tipo==="meso" && dataMeso && (() => {
        const ejCount = dataMeso.semanas.reduce((a,s)=>a+s.turnos.reduce((b,t)=>b+t.ejercicios.filter(e=>e.ejercicio_id).length,0),0);
        const hasIrm  = dataMeso.irm_arranque || dataMeso.irm_envion;
        const hasReps = dataMeso.semanas.some(s=>s.turnos.some(t=>t.ejercicios.some(e=>e.reps_asignadas>0)));
        return (
          <div style={{marginTop:8,padding:"8px 12px",background:"var(--surface2)",
            borderRadius:8,fontSize:11,color:"var(--muted)",lineHeight:1.6}}>
            Se guardarán:{" "}
            <span style={{color:"var(--text)"}}>{dataMeso.semanas.length} semanas</span>
            {" · "}
            <span style={{color:"var(--text)"}}>{ejCount} ejercicio{ejCount!==1?"s":""}</span>
            {hasIrm && <>{" · "}<span style={{color:"var(--gold)"}}>IRM arr/env</span></>}
            {hasReps && <>{" · "}<span style={{color:"var(--blue)"}}>reps asignadas</span></>}
            {" · "}
            <span style={{color:"var(--green)"}}>distribución y porcentajes</span>
          </div>
        );
      })()}
      <div className="flex gap8 mt16" style={{justifyContent:"flex-end"}}>
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-gold" onClick={handleSave}>
          <FileText size={14}/> Guardar plantilla
        </button>
      </div>
    </Modal>
  );
}

// ── Card de plantilla ─────────────────────────────────────────────────────────
function PlantillaCard({ plt, onUse, onOpen, onEdit, onDelete, onDuplicate, compact=false }) {
  const normativos = (() => {
    try { return JSON.parse(localStorage.getItem('liftplan_normativos')||'null')||EJERCICIOS; }
    catch { return EJERCICIOS; }
  })();

  const ejCount = plt.tipo==="meso"
    ? (plt.semanas||[]).reduce((a,s)=>a+s.turnos.reduce((b,t)=>b+t.ejercicios.filter(e=>e.ejercicio_id).length,0),0)
    : plt.tipo==="semana" ? (plt.semana?.turnos||[]).reduce((a,t)=>a+t.ejercicios.filter(e=>e.ejercicio_id).length,0) : null;

  return (
    <div style={{
      background:"var(--surface)",border:"1px solid var(--border)",
      borderRadius:12,padding:compact?"12px 14px":"16px",
      borderLeft:`3px solid ${PERIODO_COLOR[plt.periodo]||"var(--border)"}`,
      display:"flex",flexDirection:"column",gap:8,
      transition:"border-color .2s",cursor:"default"
    }}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:"'Bebas Neue'",fontSize:compact?15:18,color:"var(--text)",
            letterSpacing:".03em",lineHeight:1.1,overflow:"hidden",
            textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            {plt.nombre}
          </div>
          {plt.descripcion && !compact && (
            <div style={{fontSize:11,color:"var(--muted)",marginTop:3,
              overflow:"hidden",textOverflow:"ellipsis",
              display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>
              {plt.descripcion}
            </div>
          )}
        </div>
        <div style={{display:"flex",gap:4,flexShrink:0}}>
          {onOpen && (
            <button onClick={onOpen} title="Abrir"
              style={{background:"none",border:"none",cursor:"pointer",
                color:"var(--muted)",padding:"2px 5px",borderRadius:5,
                fontSize:12,lineHeight:1}}>
              <FileText size={13}/>
            </button>
          )}
          {onDuplicate && (
            <button onClick={onDuplicate} title="Duplicar como nueva plantilla"
              style={{background:"none",border:"none",cursor:"pointer",
                color:"var(--muted)",padding:"2px 5px",borderRadius:5,
                fontSize:12,lineHeight:1}}
              onMouseEnter={e=>e.currentTarget.style.color="var(--gold)"}
              onMouseLeave={e=>e.currentTarget.style.color="var(--muted)"}>
              <Files size={13}/>
            </button>
          )}
          {onEdit && (
            <button onClick={onEdit} title="Editar metadatos"
              style={{background:"none",border:"none",cursor:"pointer",
                color:"var(--muted)",padding:"2px 5px",borderRadius:5,
                fontSize:12,lineHeight:1}}>
              <Pencil size={13}/>
            </button>
          )}
          {onDelete && (
            <button onClick={onDelete} title="Eliminar"
              style={{background:"none",border:"none",cursor:"pointer",
                color:"var(--muted)",padding:"2px 5px",borderRadius:5,
                fontSize:12,lineHeight:1}}
              onMouseEnter={e=>e.currentTarget.style.color="var(--red)"}
              onMouseLeave={e=>e.currentTarget.style.color="var(--muted)"}>
              <Trash2 size={13}/>
            </button>
          )}
        </div>
      </div>

      {/* Tags */}
      <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
        <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,
          background:`${PERIODO_COLOR[plt.periodo]}20`,
          color:PERIODO_COLOR[plt.periodo],textTransform:"uppercase",letterSpacing:".05em"}}>
          {PERIODO_LABEL[plt.periodo]}
        </span>
        <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,
          background:`${OBJETIVO_COLOR[plt.objetivo]}20`,
          color:OBJETIVO_COLOR[plt.objetivo],textTransform:"uppercase",letterSpacing:".05em"}}>
          {OBJETIVO_LABEL[plt.objetivo]}
        </span>
        <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,
          background:"var(--surface2)",color:"var(--muted)",
          textTransform:"uppercase",letterSpacing:".05em"}}>
          {NIVEL_LABEL[plt.nivel]}
        </span>
        {plt.escuela && (
          <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,
            background:`${ESCUELA_NIVEL_COLOR[plt.escuela_nivel]||"#4db6ac"}25`,
            color:ESCUELA_NIVEL_COLOR[plt.escuela_nivel]||"#4db6ac",
            textTransform:"uppercase",letterSpacing:".05em"}}>
            EI · {ESCUELA_NIVEL_LABEL[plt.escuela_nivel]||"Escuela"}
          </span>
        )}
        {plt.duracion_semanas && (
          <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,
            background:"var(--surface2)",color:"var(--muted)",
            textTransform:"uppercase",letterSpacing:".05em"}}>
            {plt.duracion_semanas}sem
          </span>
        )}
        <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,
          background:"var(--surface2)",color:"var(--muted)",
          textTransform:"uppercase",letterSpacing:".05em"}}>
          {plt.tipo==="meso"?"Mesociclo":plt.tipo==="semana"?"Semana":"Distribución"}
        </span>
      </div>

      {/* Stats */}
      {!compact && ejCount !== null && (
        <div style={{display:"flex",gap:12,fontSize:11,color:"var(--muted)"}}>
          {plt.tipo==="meso" && plt.semanas && (
            <span><span style={{color:"var(--gold)",fontFamily:"'Bebas Neue'",fontSize:14}}>
              {plt.semanas.length}</span> semanas</span>
          )}
          <span><span style={{color:"var(--gold)",fontFamily:"'Bebas Neue'",fontSize:14}}>
            {ejCount}</span> ejercicios</span>
          {plt.creado && <span style={{marginLeft:"auto"}}>Creada {plt.creado}</span>}
        </div>
      )}

      {/* Botón usar */}
      {onUse && (
        <button onClick={onUse}
          className="btn btn-gold btn-sm"
          style={{width:"100%",justifyContent:"center",marginTop:4}}>
          Usar esta plantilla
        </button>
      )}
    </div>
  );
}

// ── Página principal de Plantillas ───────────────────────────────────────────


// ── Página de edición de plantilla (abre en pestaña, como PageAtleta) ────────
function PagePlantilla({ plt, onUpdate, onClose }) {
  const irm_arr = 100;
  const irm_env = 200;
  const [vistaActual,       setVistaActual]       = useState("planilla");
  // Ref to always-current form for cleanup save
  const latestFormRef = useRef(null);
  const [semPctOverrides,   setSemPctOverrides]   = useState({});
  const [semPctManual,      setSemPctManual]       = useState(new Set());
  const [turnoPctOverrides, setTurnoPctOverrides]  = useState({});
  const [turnoPctManual,    setTurnoPctManual]     = useState(new Set());
  const [confirmReset,      setConfirmReset]       = useState(null);

  // Estados elevados de PlanillaTurno para historial
  const _ptk = (type) => `liftplan_pt_${plt.id}_${type}`;
  const _lpg = (t, d) => { try { return JSON.parse(localStorage.getItem(_ptk(t))||'null') ?? d; } catch { return d; } };
  const [repsEdit,   setRepsEditRaw]   = useState(() => _lpg('repsEdit', {}));
  const [manualEdit, setManualEditRaw] = useState(() => new Set(_lpg('manualEdit', [])));
  const [cellEdit,   setCellEditRaw]   = useState(() => _lpg('cellEdit', {}));
  const [cellManual, setCellManualRaw] = useState(() => new Set(_lpg('cellManual', [])));
  const [nameEdit,   setNameEditRaw]   = useState(() => _lpg('nameEdit', {}));
  const [noteEdit,   setNoteEditRaw]   = useState(() => _lpg('noteEdit', {}));

  const initialForm = {
    ...plt,
    semanas: plt.semanas || mkSemanas(),
    volumen_total: plt.volumen_total || 600,
  };

  // ── Historial completo (form + estados PlanillaTurno) ─────────────────────
  const pHistRef    = useRef(null);
  const pIdxRef     = useRef(0);
  const pStorageKey = `liftplan_hist_plt_${plt.id}`;

  const pCaptureSnap = (currentForm) => ({
    form:       JSON.parse(JSON.stringify(currentForm)),
    semPctOverrides:   JSON.parse(JSON.stringify(semPctOverrides)),
    turnoPctOverrides: JSON.parse(JSON.stringify(turnoPctOverrides)),
    semPctManual:      [...semPctManual],
    turnoPctManual:    [...turnoPctManual],
    repsEdit:   {...repsEdit},
    manualEdit: [...manualEdit],
    cellEdit:   {...cellEdit},
    cellManual: [...cellManual],
    nameEdit:   {...nameEdit},
    noteEdit:   {...noteEdit},
  });

  const pApplySnap = (snap) => {
    if (!snap) return;
    const id = plt.id;
    const ls = (k,v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
    // Handle both new {form:{...}} and old {semanas:...} formats
    const f = snap.form || (snap.semanas ? snap : null) || initialForm;
    latestFormRef.current = f;
    setFormState(f);
    try { localStorage.setItem(`liftplan_plt_draft_${plt.id}`, JSON.stringify(f)); } catch {}
    try { onUpdate(f); } catch {}
    setSemPctOverrides(snap.semPctOverrides   || {});
    setTurnoPctOverrides(snap.turnoPctOverrides || {});
    setSemPctManual(new Set(snap.semPctManual   || []));
    setTurnoPctManual(new Set(snap.turnoPctManual || []));
    const re = snap.repsEdit   || {};
    const me = snap.manualEdit || [];
    const ce = snap.cellEdit   || {};
    const cm = snap.cellManual || [];
    const ne = snap.nameEdit   || {};
    const no = snap.noteEdit   || {};
    setRepsEditRaw(re);             ls(`liftplan_pt_${id}_repsEdit`,   re);
    setManualEditRaw(new Set(me));  ls(`liftplan_pt_${id}_manualEdit`, me);
    setCellEditRaw(ce);             ls(`liftplan_pt_${id}_cellEdit`,   ce);
    setCellManualRaw(new Set(cm));  ls(`liftplan_pt_${id}_cellManual`, cm);
    setNameEditRaw(ne);             ls(`liftplan_pt_${id}_nameEdit`,   ne);
    setNoteEditRaw(no);             ls(`liftplan_pt_${id}_noteEdit`,   no);
  };

  if (pHistRef.current === null) {
    try {
      const saved = JSON.parse(localStorage.getItem(pStorageKey) || 'null');
      if (saved && Array.isArray(saved.stack) && saved.stack.length > 0) {
        pHistRef.current = saved.stack;
        pIdxRef.current  = saved.idx;
      } else {
        pHistRef.current = [];
        pIdxRef.current  = -1;
      }
    } catch {
      pHistRef.current = [];
      pIdxRef.current  = -1;
    }
  }

  const [form, setFormState] = useState(() => {
    const snap = pHistRef.current[pIdxRef.current];
    // Handle both new format {form:{...}, repsEdit:...} and old format {semanas:..., volumen_total:...}
    if (!snap) return initialForm;
    if (snap.form) return snap.form;
    // Old format: snapshot IS the form directly
    if (snap.semanas) return snap;
    return initialForm;
  });
  const [pHistState, setPHistState] = useState({
    canUndo: pIdxRef.current > 0,
    canRedo: pIdxRef.current < (pHistRef.current?.length||0) - 1
  });

  const canUndo = pHistState.canUndo;
  const canRedo = pHistState.canRedo;

  const pPersist = () => {
    try { localStorage.setItem(pStorageKey, JSON.stringify({
      stack: pHistRef.current, idx: pIdxRef.current
    })); } catch {}
  };

  const _pLastPush = useRef(0);
  const pushSnap = (forced = false) => {
    const now = Date.now();
    if (!forced && now - _pLastPush.current < 300) return;
    _pLastPush.current = now;
    const snap = pCaptureSnap(form);
    const base = pHistRef.current.slice(0, pIdxRef.current + 1);
    const next = [...base, snap].slice(-30);
    pHistRef.current = next;
    pIdxRef.current  = next.length - 1;
    pPersist();
    setPHistState({ canUndo: pIdxRef.current > 0, canRedo: false });
  };

  // setForm: actualiza sin pushear (pushSnap ya se llamó antes)
  const pendingSaveRef = useRef(false);

  const setForm = (updater) => {
    const next = typeof updater === 'function' ? updater(form) : updater;
    latestFormRef.current = next;
    setFormState(next);
    pendingSaveRef.current = true;
    // Guardar borrador directo siempre
    try { localStorage.setItem(`liftplan_plt_draft_${plt.id}`, JSON.stringify(next)); } catch {}
    // Intentar guardar en el store
    try { onUpdate(next); pendingSaveRef.current = false; } catch {}
  };

  // Auto-guardado: cada 1s si hay cambios pendientes
  useEffect(() => {
    const interval = setInterval(() => {
      if (!pendingSaveRef.current || !latestFormRef.current) return;
      try { onUpdate(latestFormRef.current); pendingSaveRef.current = false; } catch {}
    }, 1000);
    // Guardar al cambiar visibilidad (cambio de pestaña del browser)
    const onVisibility = () => {
      if (document.hidden && latestFormRef.current) {
        try { localStorage.setItem(`liftplan_plt_draft_${plt.id}`, JSON.stringify(latestFormRef.current)); } catch {}
        try { onUpdate(latestFormRef.current); } catch {}
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      // Cleanup al desmontar
      if (latestFormRef.current) {
        try { localStorage.setItem(`liftplan_plt_draft_${plt.id}`, JSON.stringify(latestFormRef.current)); } catch {}
        try { onUpdate(latestFormRef.current); } catch {}
      }
    };
  }, []);

  const undo = () => {
    if (pIdxRef.current <= 0) return;
    pIdxRef.current -= 1;
    pPersist();
    pApplySnap(pHistRef.current[pIdxRef.current]);
    setPHistState({ canUndo: pIdxRef.current > 0, canRedo: pIdxRef.current < pHistRef.current.length - 1 });
  };

  const redo = () => {
    if (pIdxRef.current >= pHistRef.current.length - 1) return;
    pIdxRef.current += 1;
    pPersist();
    pApplySnap(pHistRef.current[pIdxRef.current]);
    setPHistState({ canUndo: pIdxRef.current > 0, canRedo: pIdxRef.current < pHistRef.current.length - 1 });
  };

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey||e.metaKey) && e.key==='z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey||e.metaKey) && (e.key==='y'||(e.key==='z'&&e.shiftKey))) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [pHistState]);

  // setForm: pushea snapshot ANTES de cambiar, luego actualiza
  const setFormWithHist = (updater) => {
    pushSnap();
    const next = typeof updater === 'function' ? updater(form) : updater;
    setForm(next);
  };
  const set = (k,v) => setFormWithHist(f=>({...f,[k]:v}));

  const updateSemana = (sIdx, newSem) => {
    pushSnap();
    const ss = [...form.semanas]; ss[sIdx] = newSem;
    setForm(f => ({...f, semanas: ss}));
  };

  const mesoFake = {
    id: plt.id,
    modo: form?.modo || plt?.modo || "Preparatorio",
    volumen_total: form?.volumen_total || plt?.volumen_total || 600,
    semanas: form?.semanas || plt?.semanas || mkSemanas(),
  };

  const esSemanal = plt.tipo === "semana";
  const esBasica  = form.escuela === true || form.escuela === "true";

  return (
    <div>
      {/* Banda superior */}
      <div style={{
        background:"var(--surface)", border:"1px solid var(--border)",
        borderRadius:"14px 14px 0 0", marginBottom:0, marginTop:-28
      }}>
        <div style={{padding:"12px 16px", borderBottom:"1px solid var(--border)"}}>
          <div style={{display:"flex", alignItems:"center", gap:10}}>
            <button className="btn btn-ghost btn-sm" onClick={onClose}
              style={{padding:"5px 10px",fontSize:12,flexShrink:0}}>
              <ChevronLeft size={14}/> Plantillas
            </button>
            <div style={{
              width:36,height:36,borderRadius:"50%",background: esBasica ? "rgba(232,197,71,.15)" : "var(--surface3)",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontFamily:"'Bebas Neue'",fontSize:18,color:"var(--gold)",flexShrink:0
            }}>{esBasica ? "EB" : "P"}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:"'Bebas Neue'",fontSize:18,color:"var(--text)",
                lineHeight:1.1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {form.nombre}
              </div>
              <div style={{fontSize:11,color:"var(--muted)",marginTop:1}}>
                {esBasica ? (
                  <>{form.semanas?.length} semanas · {form.num_bloques_basica || 3} columnas de % · Escuela Inicial</>
                ) : (
                  <>{form.semanas?.length} semanas · {form.volumen_total} reps{" · "}IRM prueba: {irm_arr}/{irm_env} kg</>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs — sticky */}
      <div className="sticky-tabs-bar" style={{padding:"0 20px",display:"flex",alignItems:"center",gap:0,minHeight:44,
        position:"sticky", top:-28, zIndex:90,
        background:"var(--surface)",
        border:"1px solid var(--border)",borderTop:"none",
        borderRadius:"0 0 14px 14px",marginBottom:20,
        boxShadow:"0 6px 16px rgba(0,0,0,.5)"}}>
          {(esBasica
            ? [{id:"planilla", label:"Planilla"}]
            : [{id:"planilla", label:"Planilla"},{id:"resumen", label:"Resumen"}]
          ).map(t=>(
            <button key={t.id} onClick={()=>setVistaActual(t.id)}
              style={{
                padding:"0 16px", border:"none", background:"none",
                color: vistaActual===t.id ? "var(--gold)" : "var(--muted)",
                fontFamily:"'DM Sans'", fontSize:13, fontWeight:600,
                cursor:"pointer", height:44,
                borderBottom: vistaActual===t.id ? "2px solid var(--gold)" : "2px solid transparent",
                transition:"all .2s"
              }}>{t.label}</button>
          ))}
          <div style={{display:"flex",gap:4,marginLeft:"auto",flexShrink:0}}>
            <button className="btn btn-ghost btn-sm" onClick={undo}
              disabled={!canUndo}
              title="Deshacer (Ctrl+Z)"
              style={{opacity:canUndo?1:.35,padding:"0 10px",height:44,fontSize:12,
                display:"flex",alignItems:"center",gap:4}}>
              <Undo2 size={14}/> Deshacer
            </button>
            <button className="btn btn-ghost btn-sm" onClick={redo}
              disabled={!canRedo}
              title="Rehacer (Ctrl+Y)"
              style={{opacity:canRedo?1:.35,padding:"0 10px",height:44,fontSize:12,
                display:"flex",alignItems:"center",gap:4}}>
              Rehacer <Redo2 size={14}/>
            </button>
          </div>
      </div>

      {/* ── Planilla ── */}
      {vistaActual === "planilla" && esBasica && (
        <div className="card">
          <div className="flex-between mb16" style={{flexWrap:"wrap",gap:10}}>
            <div className="card-title" style={{marginBottom:0}}>Planilla Escuela Inicial</div>
            {/* IRM Arranque / Envión */}
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <label style={{fontSize:10,color:"var(--gold)",fontWeight:700,textTransform:"uppercase",letterSpacing:".05em"}}>IRM Arr</label>
                <input type="number" min={0} max={300} className="no-spin"
                  value={form.irm_arranque ?? ""}
                  placeholder="kg"
                  onChange={e => set("irm_arranque", e.target.value === "" ? null : Number(e.target.value))}
                  style={{width:52,background:"var(--surface2)",border:"1px solid var(--border)",
                    borderRadius:6,padding:"4px 6px",color:"var(--gold)",fontSize:14,
                    fontFamily:"'Bebas Neue'",textAlign:"center",outline:"none",
                    MozAppearance:"textfield",appearance:"textfield"}}
                />
              </div>
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <label style={{fontSize:10,color:"var(--blue)",fontWeight:700,textTransform:"uppercase",letterSpacing:".05em"}}>IRM Env</label>
                <input type="number" min={0} max={400} className="no-spin"
                  value={form.irm_envion ?? ""}
                  placeholder="kg"
                  onChange={e => set("irm_envion", e.target.value === "" ? null : Number(e.target.value))}
                  style={{width:52,background:"var(--surface2)",border:"1px solid var(--border)",
                    borderRadius:6,padding:"4px 6px",color:"var(--blue)",fontSize:14,
                    fontFamily:"'Bebas Neue'",textAlign:"center",outline:"none",
                    MozAppearance:"textfield",appearance:"textfield"}}
                />
              </div>
              <span style={{fontSize:9,color:"var(--muted)"}}>kg</span>
            </div>
          </div>
          <PlanillaBasica
            semanas={form.semanas}
            onChange={(ss, extraUpdates) => setFormWithHist(f => ({...f, semanas: ss, ...(extraUpdates || {})}))}
            numBloques={form.num_bloques_basica || 3}
            onBeforeChange={(forced) => pushSnap(forced)}
            irm_arr={form.irm_arranque ?? 100}
            irm_env={form.irm_envion ?? 200}
          />
        </div>
      )}

      {vistaActual === "planilla" && !esBasica && (
        <>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
            marginBottom:8,flexWrap:"wrap",gap:8}}>
            <div style={{fontSize:12,color:"var(--muted)"}}>
              Total: <span style={{color:"var(--gold)",fontWeight:700}}>{form.volumen_total}</span> reps
            </div>
          </div>
          <div className="stats-row mb16">
            {form.semanas?.map(s=>(
              <div key={s.id} className="stat-box">
                <div className="stat-box-val">
                  {s.reps_ajustadas||Math.round(form.volumen_total*s.pct_volumen/100)}
                </div>
                <div className="stat-box-lbl">Semana {s.numero} · {s.pct_volumen}%</div>
                <div className="prog-bar">
                  <div className="prog-fill" style={{width:`${s.pct_volumen}%`,background:"var(--gold)"}}/>
                </div>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="flex-between mb16">
              <div className="card-title" style={{marginBottom:0}}>Sembrado Mensual</div>
            </div>
            {esSemanal ? (
              <SemanaView
                semana={form.semanas[0]}
                irm_arr={irm_arr} irm_env={irm_env}
                meso={mesoFake}
                onChange={s=>updateSemana(0,s)}
              />
            ) : (
              <>
                <SembradoMensual
                  semanas={form.semanas} irm_arr={irm_arr} irm_env={irm_env}
                  meso={mesoFake}
                  onChangeSemana={updateSemana}
                  onChangeTodasSemanas={ss=>set("semanas",ss)}
                />
                <ResumenGrupos
                  semanas={form.semanas} meso={mesoFake}
                  semPctOverrides={semPctOverrides} semPctManual={semPctManual}
                  setSemPctOverrides={setSemPctOverrides} setSemPctManual={setSemPctManual}
                  onGuardarDistribucion={()=>{}}
                  onRequestReset={(label,fn)=>setConfirmReset({label,onConfirm:fn})}
                  onBeforeChange={(forced)=>pushSnap(forced)}
                />
                <DistribucionTurnos
                  semanas={form.semanas} meso={mesoFake}
                  turnoPctOverrides={turnoPctOverrides} turnoPctManual={turnoPctManual}
                  setTurnoPctOverrides={setTurnoPctOverrides} setTurnoPctManual={setTurnoPctManual}
                  onRequestReset={(label,fn)=>setConfirmReset({label,onConfirm:fn})}
                  onBeforeChange={(forced)=>pushSnap(forced)}
                />
                <PlanillaTurno
                  semanas={form.semanas} irm_arr={irm_arr} irm_env={irm_env}
                  meso={mesoFake}
                  semPctOverrides={semPctOverrides} semPctManual={semPctManual}
                  turnoPctOverrides={turnoPctOverrides} turnoPctManual={turnoPctManual}
                  onRequestReset={(label,fn)=>setConfirmReset({label,onConfirm:fn})}
                  onBeforeChange={(forced)=>pushSnap(forced)}
                  repsEdit={repsEdit}   setRepsEdit={setRepsEditRaw}
                  manualEdit={manualEdit} setManualEdit={setManualEditRaw}
                  cellEdit={cellEdit}   setCellEdit={setCellEditRaw}
                  cellManual={cellManual} setCellManual={setCellManualRaw}
                  nameEdit={nameEdit}   setNameEdit={setNameEditRaw}
                  noteEdit={noteEdit}   setNoteEdit={setNoteEditRaw}
                />
              </>
            )}
          </div>
        </>
      )}

      {/* ── Resumen ── */}
      {vistaActual === "resumen" && (
        <PageResumen
          meso={mesoFake}
          atleta={{nombre: form.nombre, id: plt.id}}
          irm_arr={irm_arr}
          irm_env={irm_env}
        />
      )}

      {confirmReset && (
        <Modal title="Confirmar reseteo" onClose={()=>setConfirmReset(null)}>
          <p style={{color:"var(--text)",fontSize:14,marginBottom:20}}>
            ¿Resetear <strong style={{color:"var(--gold)"}}>{confirmReset.label}</strong>?
          </p>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <button className="btn btn-ghost btn-sm" onClick={()=>setConfirmReset(null)}>Cancelar</button>
            <button className="btn btn-ghost btn-sm"
              onClick={()=>{confirmReset.onConfirm();setConfirmReset(null);}}>Resetear</button>
          </div>
        </Modal>
      )}
    </div>
  );
}


// ── Modal para crear plantilla desde cero ────────────────────────────────────
function CrearPlantillaModal({ onSave, onClose }) {
  const [form, setForm] = useState({
    nombre: "", descripcion: "",
    tipo: "meso",
    periodo: "general", objetivo: "mixto", nivel: "intermedio", modo: "Preparatorio",
    volumen_total: 600,
    semanas: mkSemanas(),
    escuela: false,
    escuela_nivel: "1",
    num_bloques_basica: 3,
    irm_arranque: 0,
    irm_envion: 0,
  });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const modoOpts = ["Preparatorio","Competitivo","General"];

  const handleSave = () => {
    if (!form.nombre.trim()) { alert("El nombre es obligatorio"); return; }
    onSave({ ...form, duracion_semanas: form.semanas?.length || 4 });
    onClose();
  };

  return (
    <Modal title="Nueva plantilla" onClose={onClose}>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {/* Tipo selector — oculto si es escuela */}
        {!form.escuela && (
          <div style={{display:"flex",gap:8}}>
            {[["meso","Mesociclo"],["semana","Semana"]].map(([v,l])=>(
              <button key={v} onClick={()=>{
                if (v==="semana") setForm(f=>({...f,tipo:v,semanas:[{...mkSemanas()[0],id:mkId(),numero:1,pct_volumen:100}]}));
                else setForm(f=>({...f,tipo:v,semanas:mkSemanas()}));
              }}
                style={{flex:1,padding:"8px 0",borderRadius:8,border:"none",cursor:"pointer",
                  fontFamily:"'DM Sans'",fontSize:13,fontWeight:700,transition:"all .2s",
                  background: form.tipo===v ? "var(--gold)" : "var(--surface2)",
                  color: form.tipo===v ? "#0a0c10" : "var(--muted)"}}>
                {l}
              </button>
            ))}
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Nombre *</label>
          <input className="form-input" value={form.nombre}
            onChange={e=>set("nombre",e.target.value)}
            placeholder="Ej: Pretemporada 4 semanas — Fuerza"/>
        </div>
        <div className="form-group">
          <label className="form-label">Descripción</label>
          <textarea className="form-input" value={form.descripcion}
            onChange={e=>set("descripcion",e.target.value)}
            rows={2} style={{resize:"vertical"}}
            placeholder="Notas, contexto, para quién es..."/>
        </div>
        {/* Toggle Escuela Inicial */}
        <div style={{
          background: form.escuela ? "rgba(77,182,172,.1)" : "var(--surface2)",
          border: form.escuela ? "1px solid #4db6ac" : "1px solid var(--border)",
          borderRadius:10, padding:"10px 14px",
          display:"flex", alignItems:"center", gap:10, cursor:"pointer",
          transition:"all .2s"
        }} onClick={()=>{
          const newVal = !form.escuela;
          setForm(f=>({
            ...f,
            escuela: newVal,
            tipo: "meso",
            semanas: newVal ? mkSemanasBasica(4, f.num_bloques_basica || 3) : mkSemanas(),
          }));
        }}>
          <div style={{
            width:36, height:20, borderRadius:10, position:"relative",
            background: form.escuela ? "#4db6ac" : "var(--surface3)",
            transition:"background .2s", flexShrink:0
          }}>
            <div style={{
              position:"absolute", top:2, left: form.escuela ? 18 : 2,
              width:16, height:16, borderRadius:"50%", background:"#fff",
              transition:"left .2s", boxShadow:"0 1px 3px rgba(0,0,0,.3)"
            }}/>
          </div>
          <div>
            <div style={{fontSize:13,fontWeight:700,color: form.escuela ? "#4db6ac" : "var(--text)"}}>
              Escuela Inicial
            </div>
            <div style={{fontSize:11,color:"var(--muted)"}}>
              Esta plantilla pertenece al programa de Escuela Inicial
            </div>
          </div>
        </div>

        {form.escuela && (
          <div className="form-group">
            <label className="form-label">Nivel de Escuela</label>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {ESCUELA_NIVELES.map(n=>(
                <button key={n} onClick={()=>set("escuela_nivel",n)}
                  style={{
                    padding:"5px 14px", borderRadius:20, border:"none", cursor:"pointer",
                    fontSize:12, fontWeight:700, transition:"all .15s",
                    background: form.escuela_nivel===n ? ESCUELA_NIVEL_COLOR[n] : "var(--surface2)",
                    color: form.escuela_nivel===n ? "#fff" : "var(--muted)"
                  }}>
                  {ESCUELA_NIVEL_LABEL[n]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Campos estándar — ocultos si es escuela (Escuela Inicial usa planilla básica) */}
        {!form.escuela && (
          <>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[
                ["periodo","Período",PERIODOS.map(p=>[p,PERIODO_LABEL[p]])],
                ["objetivo","Objetivo",OBJETIVOS.map(o=>[o,OBJETIVO_LABEL[o]])],
                ["nivel","Nivel",NIVELES.map(n=>[n,NIVEL_LABEL[n]])],
              ].map(([k,lbl,opts])=>(
                <div key={k} className="form-group">
                  <label className="form-label">{lbl}</label>
                  <select className="form-select" value={form[k]}
                    onChange={e=>set(k,e.target.value)}>
                    {opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              ))}
              <div className="form-group">
                <label className="form-label">Modo</label>
                <select className="form-select" value={form.modo}
                  onChange={e=>set("modo",e.target.value)}>
                  {modoOpts.map(m=><option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            {form.tipo === "meso" && (
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div className="form-group">
                  <label className="form-label">Semanas</label>
                  <select className="form-select" value={form.semanas.length}
                    onChange={e=>{
                      const n = Number(e.target.value);
                      const base = mkSemanas();
                      set("semanas", Array.from({length:n},(_,i)=>({
                        ...base[Math.min(i,3)], id:mkId(), numero:i+1,
                        pct_volumen: n===4?[26,35,23,16][i]??20:Math.round(100/n)
                      })));
                    }}>
                    {[2,3,4,5,6].map(n=><option key={n} value={n}>{n} semanas</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Volumen total (reps)</label>
                  <input className="form-input" type="number" min={100} max={3000} step={50}
                    value={form.volumen_total}
                    onChange={e=>set("volumen_total",Number(e.target.value))}/>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-gold" onClick={handleSave}>Crear plantilla</button>
      </div>
    </Modal>
  );
}


// ── Modal para duplicar plantilla existente ──────────────────────────────────
function DuplicarPlantillaModal({ plantillas, base, onSave, onClose }) {
  const [selectedId, setSelectedId] = useState(base?.id || plantillas[0]?.id || null);
  const [nombre,     setNombre]     = useState(() => {
    const b = base || plantillas[0];
    return b ? `Copia de ${b.nombre}` : "";
  });
  const [descripcion, setDescripcion] = useState(base?.descripcion || "");
  const [busq,        setBusq]        = useState("");

  const selected = plantillas.find(p => p.id === selectedId) || plantillas[0] || null;

  // When selected changes update name suggestion (only if user hasn't typed yet)
  const [nameTouched, setNameTouched] = useState(false);
  useEffect(() => {
    if (!nameTouched && selected) setNombre(`Copia de ${selected.nombre}`);
  }, [selectedId]);

  const filtradas = plantillas.filter(p =>
    !busq || p.nombre.toLowerCase().includes(busq.toLowerCase())
  );

  const handleSave = () => {
    if (!nombre.trim()) { alert("El nombre es obligatorio"); return; }
    if (!selected) { alert("Seleccioná una plantilla base"); return; }
    onSave(selected, nombre.trim(), descripcion.trim());
  };

  return (
    <Modal title="Duplicar plantilla" onClose={onClose}>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {/* Nombre */}
        <div className="form-group">
          <label className="form-label">Nombre de la nueva plantilla *</label>
          <input className="form-input" value={nombre}
            onChange={e=>{ setNombre(e.target.value); setNameTouched(true); }}
            placeholder="Nombre de la copia..."/>
        </div>

        <div className="form-group">
          <label className="form-label">Descripción</label>
          <textarea className="form-input" value={descripcion} rows={2}
            onChange={e=>setDescripcion(e.target.value)}
            style={{resize:"vertical"}} placeholder="Contexto, diferencias respecto a la base..."/>
        </div>

        {/* Selector de base — solo si no viene preseleccionada */}
        {!base && (
          <div className="form-group">
            <label className="form-label">Plantilla base</label>
            <input className="form-input" value={busq} onChange={e=>setBusq(e.target.value)}
              placeholder="Buscar plantilla..." style={{marginBottom:8}}/>
            <div style={{maxHeight:220,overflowY:"auto",border:"1px solid var(--border)",
              borderRadius:8,background:"var(--surface2)"}}>
              {filtradas.length === 0 ? (
                <div style={{padding:16,textAlign:"center",color:"var(--muted)",fontSize:12}}>Sin resultados</div>
              ) : filtradas.map(p => (
                <div key={p.id} onClick={()=>setSelectedId(p.id)}
                  style={{
                    padding:"10px 14px", cursor:"pointer",
                    borderBottom:"1px solid var(--border)",
                    background: selectedId===p.id ? "rgba(232,197,71,.12)" : "transparent",
                    borderLeft: selectedId===p.id ? "3px solid var(--gold)" : "3px solid transparent",
                  }}>
                  <div style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{p.nombre}</div>
                  <div style={{fontSize:10,color:"var(--muted)",marginTop:2}}>
                    {p.semanas?.length||0} sem · {(p.semanas||[]).reduce((a,s)=>a+s.turnos.reduce((b,t)=>b+t.ejercicios.filter(e=>e.ejercicio_id).length,0),0)} ejs
                    {p.escuela && ` · EI N${p.escuela_nivel}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preview de la base si está preseleccionada */}
        {base && (
          <div style={{padding:"10px 14px",background:"var(--surface2)",borderRadius:8,
            border:"1px solid var(--border)",borderLeft:"3px solid var(--gold)"}}>
            <div style={{fontSize:11,color:"var(--muted)",marginBottom:2}}>Base:</div>
            <div style={{fontSize:13,fontWeight:700,color:"var(--text)"}}>{base.nombre}</div>
            <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>
              {base.semanas?.length||0} semanas · {(base.semanas||[]).reduce((a,s)=>a+s.turnos.reduce((b,t)=>b+t.ejercicios.filter(e=>e.ejercicio_id).length,0),0)} ejercicios
            </div>
          </div>
        )}
      </div>
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-gold" onClick={handleSave}>
          <Files size={14}/> Crear copia
        </button>
      </div>
    </Modal>
  );
}


function PagePlantillas({ plantillas, onAdd, onUpdate, onDelete, onOpen }) {
  const [busqueda,      setBusqueda]      = useState("");
  const [editando,      setEditando]      = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showCrear,     setShowCrear]     = useState(false);
  const [showNueva,     setShowNueva]     = useState(false); // modal selector crear/importar
  const [duplicando,    setDuplicando]    = useState(null);  // plantilla base para duplicar
  const [showImportar,  setShowImportar]  = useState(false);
  // Colapso por sección y nivel
  const [colapsadoEscuela, setColapsadoEscuela] = useState({});
  const [colapsadoEscuelaMain, setColapsadoEscuelaMain] = useState(false);
  const [colapsadoMias,    setColapsadoMias]    = useState(false);

  const escuela = plantillas.filter(p => p.escuela === true || p.escuela === "true");
  const mias    = plantillas.filter(p => !p.escuela || p.escuela === false || p.escuela === "false");

  const matchBusqueda = (p) => !busqueda
    || p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    || p.descripcion?.toLowerCase().includes(busqueda.toLowerCase());

  const duplicar = (plt) => { setDuplicando(plt); };

  const CardGrid = ({lista}) => (
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
      {lista.map(plt=>(
        <PlantillaCard key={plt.id} plt={plt}
          onOpen={onOpen ? ()=>onOpen(plt) : undefined}
          onDuplicate={()=>duplicar(plt)}
          onEdit={()=>setEditando(plt)}
          onDelete={()=>setConfirmDelete(plt)}/>
      ))}
    </div>
  );

  const SectionHeader = ({title, count, color="#4db6ac", badge, collapsed, onToggle, children}) => (
    <div style={{marginBottom:collapsed?8:20}}>
      <div style={{
        display:"flex",alignItems:"center",gap:10,
        padding:"10px 16px",borderRadius:collapsed?"10px":"10px 10px 0 0",
        background:`${color}18`,border:`1px solid ${color}40`,
        cursor:"pointer",userSelect:"none"
      }} onClick={onToggle}>
        <div style={{flex:1,display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontFamily:"'Bebas Neue'",fontSize:18,color,letterSpacing:".05em"}}>{title}</span>
          {badge && <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,
            background:`${color}30`,color}}>{badge}</span>}
          <span style={{fontSize:11,color:"var(--muted)",marginLeft:4}}>{count} plantilla{count!==1?"s":""}</span>
        </div>
        <span style={{color,fontSize:16,transition:"transform .2s",
          transform:collapsed?"rotate(-90deg)":"rotate(0deg)"}}>▾</span>
      </div>
      {!collapsed && (
        <div style={{border:`1px solid ${color}40`,borderTop:"none",
          borderRadius:"0 0 10px 10px",padding:16}}>
          {children}
        </div>
      )}
    </div>
  );

  const NivelSection = ({nivel, pltList}) => {
    const filtradas = pltList.filter(matchBusqueda);
    if (filtradas.length === 0) return null;
    const col = colapsadoEscuela[nivel];
    return (
      <div style={{marginBottom:12}}>
        <div style={{
          display:"flex",alignItems:"center",gap:8,
          padding:"6px 12px",borderRadius:col?"8px":"8px 8px 0 0",
          background:"var(--surface2)",border:"1px solid var(--border)",
          cursor:"pointer",userSelect:"none"
        }} onClick={()=>setColapsadoEscuela(p=>({...p,[nivel]:!col}))}>
          <div style={{
            width:10,height:10,borderRadius:"50%",flexShrink:0,
            background:ESCUELA_NIVEL_COLOR[nivel]
          }}/>
          <span style={{fontFamily:"'Bebas Neue'",fontSize:15,
            color:ESCUELA_NIVEL_COLOR[nivel],letterSpacing:".04em"}}>
            {ESCUELA_NIVEL_LABEL[nivel]}
          </span>
          <span style={{fontSize:11,color:"var(--muted)",marginLeft:2}}>
            {filtradas.length} plantilla{filtradas.length!==1?"s":""}
          </span>
          <span style={{marginLeft:"auto",color:"var(--muted)",fontSize:13,
            transform:col?"rotate(-90deg)":"rotate(0deg)",transition:"transform .2s"}}>▾</span>
        </div>
        {!col && (
          <div style={{border:"1px solid var(--border)",borderTop:"none",
            borderRadius:"0 0 8px 8px",padding:12}}>
            <CardGrid lista={filtradas}/>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
        marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <div className="page-title">Biblioteca de Plantillas</div>
          <div className="page-sub">
            {plantillas.length} plantilla{plantillas.length!==1?"s":""} guardada{plantillas.length!==1?"s":""}
            {escuela.length > 0 && ` · ${escuela.length} Escuela Inicial`}
          </div>
        </div>
        <button className="btn btn-gold" onClick={()=>setShowNueva(true)}>
          <Plus size={14}/> Nueva plantilla
        </button>
      </div>

      {/* Modal selector: crear desde cero o importar */}
      {showNueva && (
        <Modal title="Nueva plantilla" onClose={()=>setShowNueva(false)}>
          <div style={{display:"flex",flexDirection:"column",gap:12,padding:"8px 0"}}>
            <button className="btn btn-gold"
              onClick={()=>{ setShowNueva(false); setShowCrear(true); }}
              style={{padding:"14px 20px",fontSize:14,display:"flex",alignItems:"center",gap:10,justifyContent:"flex-start"}}>
              <Plus size={18}/>
              <div style={{textAlign:"left"}}>
                <div style={{fontWeight:700}}>Crear desde cero</div>
                <div style={{fontSize:11,opacity:.8,fontWeight:400}}>Plantilla nueva con estructura vacía</div>
              </div>
            </button>
            <button className="btn btn-ghost"
              onClick={()=>{ setShowNueva(false); setShowImportar(true); }}
              style={{padding:"14px 20px",fontSize:14,display:"flex",alignItems:"center",gap:10,justifyContent:"flex-start",border:"1px solid var(--border)"}}>
              <Files size={18}/>
              <div style={{textAlign:"left"}}>
                <div style={{fontWeight:700}}>Duplicar plantilla existente</div>
                <div style={{fontSize:11,opacity:.7,fontWeight:400}}>Copiá una plantilla como base y modificala</div>
              </div>
            </button>
          </div>
        </Modal>
      )}

      {showCrear && (
        <CrearPlantillaModal
          onSave={p=>{ onAdd(p); setShowCrear(false); }}
          onClose={()=>setShowCrear(false)}/>
      )}

      {/* Modal importar/duplicar desde plantilla existente */}
      {showImportar && (
        <DuplicarPlantillaModal
          plantillas={plantillas}
          onSave={(base, nombre, desc) => {
            const copia = {
              ...JSON.parse(JSON.stringify(base)),
              id: mkId(),
              nombre,
              descripcion: desc,
              creado: new Date().toISOString().slice(0,10),
            };
            onAdd(copia);
            setShowImportar(false);
          }}
          onClose={()=>setShowImportar(false)}/>
      )}

      {/* Modal duplicar desde card */}
      {duplicando && (
        <DuplicarPlantillaModal
          plantillas={plantillas}
          base={duplicando}
          onSave={(base, nombre, desc) => {
            const copia = {
              ...JSON.parse(JSON.stringify(base)),
              id: mkId(),
              nombre,
              descripcion: desc,
              creado: new Date().toISOString().slice(0,10),
            };
            onAdd(copia);
            setDuplicando(null);
          }}
          onClose={()=>setDuplicando(null)}/>
      )}

      {/* Buscador global */}
      {plantillas.length > 0 && (
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:20}}>
          <input
            style={{flex:1,background:"var(--surface2)",border:"1px solid var(--border)",
              borderRadius:8,padding:"8px 14px",color:"var(--text)",
              fontSize:13,outline:"none",fontFamily:"'DM Sans'"}}
            placeholder="Buscar plantilla..."
            value={busqueda} onChange={e=>setBusqueda(e.target.value)}/>
          {busqueda && (
            <button onClick={()=>setBusqueda("")}
              style={{background:"none",border:"none",color:"var(--muted)",
                cursor:"pointer",fontSize:18,lineHeight:1}}>×</button>
          )}
        </div>
      )}

      {plantillas.length === 0 ? (
        <div style={{textAlign:"center",padding:"60px 20px",
          background:"var(--surface)",borderRadius:14,border:"1px solid var(--border)"}}>
          <div style={{fontSize:48,marginBottom:12}}>📋</div>
          <div style={{fontFamily:"'Bebas Neue'",fontSize:24,color:"var(--muted)",
            letterSpacing:".05em",marginBottom:8}}>Sin plantillas aún</div>
          <div style={{fontSize:13,color:"var(--muted)",maxWidth:360,margin:"0 auto"}}>
            Creá una plantilla nueva con el botón <strong style={{color:"var(--text)"}}>Nueva plantilla</strong>,
            o guardá mesociclos desde la pestaña de cada atleta
          </div>
        </div>
      ) : (
        <>
          {/* ── SECCIÓN ESCUELA INICIAL ── */}
          {escuela.length > 0 && (
            <SectionHeader
              title="Escuela Inicial"
              count={escuela.filter(matchBusqueda).length}
              color="#4db6ac"
              badge={`${ESCUELA_NIVELES.filter(n=>escuela.some(p=>p.escuela_nivel===n)).length} niveles`}
              collapsed={colapsadoEscuelaMain}
              onToggle={()=>setColapsadoEscuelaMain(v=>!v)}>
              {ESCUELA_NIVELES.map(n => (
                <NivelSection key={n} nivel={n}
                  pltList={escuela.filter(p => p.escuela_nivel === n)}/>
              ))}
              {/* Plantillas de escuela sin nivel asignado */}
              {(() => {
                const sinNivel = escuela.filter(p => !p.escuela_nivel || !ESCUELA_NIVELES.includes(p.escuela_nivel)).filter(matchBusqueda);
                return sinNivel.length > 0 ? (
                  <div style={{marginTop:8}}>
                    <div style={{fontSize:11,color:"var(--muted)",marginBottom:8,
                      fontWeight:600,textTransform:"uppercase",letterSpacing:".06em"}}>
                      Sin nivel asignado
                    </div>
                    <CardGrid lista={sinNivel}/>
                  </div>
                ) : null;
              })()}
            </SectionHeader>
          )}

          {/* ── SECCIÓN MIS PLANTILLAS ── */}
          {mias.filter(matchBusqueda).length > 0 && (
            <SectionHeader
              title="Mis Plantillas"
              count={mias.filter(matchBusqueda).length}
              color="var(--gold)"
              collapsed={colapsadoMias}
              onToggle={()=>setColapsadoMias(v=>!v)}>
              <CardGrid lista={mias.filter(matchBusqueda)}/>
            </SectionHeader>
          )}

          {busqueda && escuela.filter(matchBusqueda).length === 0 && mias.filter(matchBusqueda).length === 0 && (
            <div style={{textAlign:"center",padding:40,color:"var(--muted)",fontSize:13}}>
              No hay plantillas con ese nombre
            </div>
          )}
        </>
      )}

      {/* Modal editar metadatos */}
      {editando && (
        <Modal title="Editar plantilla" onClose={()=>setEditando(null)}>
          <div className="form-group">
            <label className="form-label">Nombre</label>
            <input className="form-input" value={editando.nombre}
              onChange={e=>setEditando(p=>({...p,nombre:e.target.value}))}/>
          </div>
          <div className="form-group">
            <label className="form-label">Descripción</label>
            <textarea className="form-input" value={editando.descripcion||""}
              onChange={e=>setEditando(p=>({...p,descripcion:e.target.value}))}
              rows={2} style={{resize:"vertical"}}/>
          </div>

          {/* Toggle escuela en edición */}
          <div style={{
            background: editando.escuela ? "rgba(77,182,172,.1)" : "var(--surface2)",
            border: editando.escuela ? "1px solid #4db6ac" : "1px solid var(--border)",
            borderRadius:10,padding:"10px 14px",marginBottom:14,
            display:"flex",alignItems:"center",gap:10,cursor:"pointer"
          }} onClick={()=>setEditando(p=>({...p,escuela:!p.escuela}))}>
            <div style={{width:36,height:20,borderRadius:10,position:"relative",
              background:editando.escuela?"#4db6ac":"var(--surface3)",flexShrink:0}}>
              <div style={{position:"absolute",top:2,left:editando.escuela?18:2,
                width:16,height:16,borderRadius:"50%",background:"#fff",
                transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.3)"}}/>
            </div>
            <span style={{fontSize:13,fontWeight:700,
              color:editando.escuela?"#4db6ac":"var(--text)"}}>Escuela Inicial</span>
          </div>

          {editando.escuela && (
            <>
              <div className="form-group">
                <label className="form-label">Nivel de Escuela</label>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {ESCUELA_NIVELES.map(n=>(
                    <button key={n} onClick={()=>setEditando(p=>({...p,escuela_nivel:n}))}
                      style={{padding:"5px 14px",borderRadius:20,border:"none",cursor:"pointer",
                        fontSize:12,fontWeight:700,transition:"all .15s",
                        background:editando.escuela_nivel===n?ESCUELA_NIVEL_COLOR[n]:"var(--surface2)",
                        color:editando.escuela_nivel===n?"#fff":"var(--muted)"}}>
                      {ESCUELA_NIVEL_LABEL[n]}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {!editando.escuela && (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[
                ["periodo","Período",PERIODOS.map(p=>[p,PERIODO_LABEL[p]])],
                ["objetivo","Objetivo",OBJETIVOS.map(o=>[o,OBJETIVO_LABEL[o]])],
                ["nivel","Nivel",NIVELES.map(n=>[n,NIVEL_LABEL[n]])],
              ].map(([k,lbl,opts])=>(
                <div key={k} className="form-group">
                  <label className="form-label">{lbl}</label>
                  <select className="form-select" value={editando[k]}
                    onChange={e=>setEditando(p=>({...p,[k]:e.target.value}))}>
                    {opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap8 mt16" style={{justifyContent:"flex-end"}}>
            <button className="btn btn-ghost" onClick={()=>setEditando(null)}>Cancelar</button>
            <button className="btn btn-gold" onClick={()=>{onUpdate(editando);setEditando(null);}}>
              Guardar cambios
            </button>
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Eliminar plantilla" onClose={()=>setConfirmDelete(null)}>
          <p style={{fontSize:13,color:"var(--text)",marginBottom:16}}>
            ¿Eliminar <strong>{confirmDelete.nombre}</strong>? Esta acción no se puede deshacer.
          </p>
          <div className="flex gap8" style={{justifyContent:"flex-end"}}>
            <button className="btn btn-ghost" onClick={()=>setConfirmDelete(null)}>Cancelar</button>
            <button className="btn" style={{background:"var(--red)",color:"#fff"}}
              onClick={()=>{onDelete(confirmDelete.id);setConfirmDelete(null);}}>
              <Trash2 size={14}/> Eliminar
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Selector de plantilla para usar al crear mesociclo ───────────────────────
function PlantillaPicker({ plantillas, tipo="meso", onSelect, onClose }) {
  const [filtro, setFiltro] = useState("");
  const filtradas = plantillas
    .filter(p=>p.tipo===tipo)
    .filter(p=>!filtro || p.nombre.toLowerCase().includes(filtro.toLowerCase()));

  const [selected, setSelected] = useState(null);
  const [opts, setOpts] = useState({
    irm:true, volumen:true, reps:true, celdas:true, grupos:true
  });
  const toggleOpt = (k) => setOpts(o=>({...o,[k]:!o[k]}));

  const hasIrm     = selected?.irm_arranque || selected?.irm_envion;
  const hasReps    = selected?.semanas?.some(s=>s.turnos.some(t=>t.ejercicios.some(e=>e.reps_asignadas>0)));
  const hasCeldas  = selected?.overrides && Object.keys(selected.overrides.cellEdit||{}).length > 0;
  const hasGrupos  = selected?.overrides && Object.keys(selected.overrides.semPcts||{}).length > 0;

  if (selected) {
    return (
      <Modal title="Opciones de importación" onClose={()=>setSelected(null)}>
        <div style={{marginBottom:14,padding:"10px 14px",background:"var(--surface2)",
          borderRadius:8,fontSize:12,color:"var(--muted)"}}>
          Importando: <strong style={{color:"var(--gold)"}}>{selected.nombre}</strong>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
          {[
            {k:"estructura", label:"Estructura", desc:"Semanas, turnos y ejercicios", always:true},
            {k:"volumen",    label:"Volumen total y % semanal", desc:`${selected.volumen_total||"?"} reps`, show:!!selected.volumen_total},
            {k:"irm",        label:"IRM del atleta", desc:`Arr: ${selected.irm_arranque||"—"} / Env: ${selected.irm_envion||"—"}`, show:!!hasIrm},
            {k:"reps",       label:"Reps asignadas", desc:"Reps concretas de cada ejercicio", show:!!hasReps},
            {k:"celdas",     label:"Overrides de celdas", desc:"Series/Reps/Kg editados manualmente", show:!!hasCeldas},
            {k:"grupos",     label:"Distribución de grupos", desc:"% por semana y turno", show:!!hasGrupos},
          ].map(({k,label,desc,always,show=true})=>(
            show || always ? (
              <label key={k} style={{display:"flex",alignItems:"flex-start",gap:10,cursor:always?"default":"pointer",
                padding:"8px 12px",background:"var(--surface2)",borderRadius:8,
                border:`1px solid ${(always||opts[k])?"var(--gold)":"var(--border)"}`,
                opacity:always?0.7:1}}>
                <input type="checkbox" checked={always||opts[k]}
                  disabled={always}
                  onChange={()=>!always&&toggleOpt(k)}
                  style={{marginTop:2,accentColor:"var(--gold)",width:16,height:16,flexShrink:0}}/>
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:"var(--text)"}}>{label}</div>
                  <div style={{fontSize:11,color:"var(--muted)",marginTop:1}}>{desc}</div>
                </div>
              </label>
            ) : null
          ))}
        </div>

        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button className="btn btn-ghost" onClick={()=>setSelected(null)}>Volver</button>
          <button className="btn btn-gold"
            onClick={()=>{ onSelect(selected, opts); onClose(); }}>
            Importar plantilla
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Importar plantilla" onClose={onClose}>
      <input
        style={{width:"100%",background:"var(--surface2)",border:"1px solid var(--border)",
          borderRadius:8,padding:"7px 12px",color:"var(--text)",fontSize:13,
          outline:"none",fontFamily:"'DM Sans'",marginBottom:12,boxSizing:"border-box"}}
        placeholder="Buscar plantilla..."
        value={filtro} onChange={e=>setFiltro(e.target.value)}/>
      {filtradas.length===0 ? (
        <div style={{textAlign:"center",padding:"24px 0",color:"var(--muted)",fontSize:12}}>
          {plantillas.filter(p=>p.tipo===tipo).length===0
            ? "No hay plantillas de este tipo guardadas"
            : "Sin resultados"}
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:8,
          maxHeight:320,overflowY:"auto"}}>
          {filtradas.map(plt=>(
            <PlantillaCard key={plt.id} plt={plt} compact
              onUse={()=>setSelected(plt)}/>
          ))}
        </div>
      )}
    </Modal>
  );
}


function PageNormativos() {
  const [ejercicios, setEjercicios] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('liftplan_normativos') || 'null');
      // Si la lista guardada tiene menos ejercicios que la base, usar la base
      if (!stored || stored.length < EJERCICIOS.length) {
        localStorage.removeItem('liftplan_normativos');
        return EJERCICIOS;
      }
      return stored;
    } catch { return EJERCICIOS; }
  });
  const [filtro,    setFiltro]    = useState("");
  const [catFiltro, setCatFiltro] = useState("");
  const [editId,    setEditId]    = useState(null);   // id original del ej en edición
  const [editForm,  setEditForm]  = useState(null);   // copia local mientras se edita
  const [showAdd,   setShowAdd]   = useState(false);
  const [newEj,     setNewEj]     = useState({id:"",nombre:"",categoria:"Arranque",pct_base:"",base:"arranque"});
  const [confirmDel,setConfirmDel]= useState(null);
  const [error,     setError]     = useState("");

  const save = (list) => {
    setEjercicios(list);
    try { localStorage.setItem('liftplan_normativos', JSON.stringify(list)); } catch {}
  };

  // Abrir edición: crea copia local del ejercicio
  const startEdit = (e) => {
    setEditId(e.id);
    setEditForm({...e, pct_base: e.pct_base ?? ""});
    setError("");
  };

  // Cancelar edición sin guardar
  const cancelEdit = () => { setEditId(null); setEditForm(null); setError(""); };

  // Confirmar edición con validaciones
  const confirmEdit = () => {
    if (!editForm.nombre.trim()) { setError("El nombre no puede estar vacío"); return; }
    const newId = editForm.id !== "" && editForm.id !== null ? Number(editForm.id) : editId;
    if (isNaN(newId) || newId === 0) { setError("El ID debe ser un número válido"); return; }
    if (newId !== editId && ejercicios.some(e => Number(e.id) === newId)) {
      setError(`El ID ${newId} ya está en uso`); return;
    }
    save(ejercicios.map(e =>
      e.id === editId
        ? {...editForm, id: newId, pct_base: editForm.pct_base !== "" ? Number(editForm.pct_base) : null}
        : e
    ));
    setEditId(null); setEditForm(null); setError("");
  };

  const deleteEj = (id) => {
    save(ejercicios.filter(e => e.id !== id));
    setConfirmDel(null);
    if (editId === id) cancelEdit();
  };

  const addEj = () => {
    if (!newEj.nombre.trim()) { setError("El nombre no puede estar vacío"); return; }
    const id = newEj.id !== "" ? Number(newEj.id) : Math.max(...ejercicios.map(e=>Number(e.id)||0)) + 1;
    if (isNaN(id)) { setError("El ID debe ser un número"); return; }
    if (ejercicios.some(e => Number(e.id) === id)) { setError(`El ID ${id} ya existe`); return; }
    setError("");
    save([...ejercicios, {...newEj, id, pct_base: newEj.pct_base !== "" ? Number(newEj.pct_base) : null}]);
    setNewEj({id:"",nombre:"",categoria:"Arranque",pct_base:"",base:"arranque"});
    setShowAdd(false);
  };

  const filtered = ejercicios
    .filter(e =>
      (!catFiltro || e.categoria === catFiltro) &&
      (!filtro || e.nombre.toLowerCase().includes(filtro.toLowerCase()) || String(e.id).includes(filtro))
    )
    .sort((a,b) => Number(a.id) - Number(b.id));

  const setF = (field, val) => setEditForm(f => ({...f, [field]: val}));

  const inputStyle = {
    background:"var(--surface3)", border:"1px solid var(--gold)",
    borderRadius:5, color:"var(--text)", fontSize:12,
    padding:"3px 6px", outline:"none", width:"100%"
  };

  return (
    <div>
      <div className="flex-between mb16">
        <div>
          <div className="page-title">Normativos</div>
          <div className="page-sub">Ejercicios y porcentajes de referencia — editables globalmente</div>
        </div>
        <button className="btn btn-gold btn-sm" onClick={()=>{setShowAdd(s=>!s);setError("");}}>
          {showAdd ? "Cancelar" : "+ Nuevo ejercicio"}
        </button>
      </div>

      {/* Formulario nuevo ejercicio */}
      {showAdd && (
        <div className="card mb16" style={{background:"rgba(232,197,71,.05)",border:"1px solid rgba(232,197,71,.25)"}}>
          <div className="card-title" style={{fontSize:15}}>Nuevo ejercicio</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))",gap:10,alignItems:"end"}}>
            <div className="form-group" style={{marginBottom:0}}>
              <label className="form-label">ID</label>
              <input className="form-input" type="number" placeholder="auto"
                value={newEj.id} onChange={e=>setNewEj(n=>({...n,id:e.target.value}))}/>
            </div>
            <div className="form-group" style={{marginBottom:0}}>
              <label className="form-label">Nombre</label>
              <input className="form-input" placeholder="Nombre del ejercicio"
                value={newEj.nombre} onChange={e=>setNewEj(n=>({...n,nombre:e.target.value}))}/>
            </div>
            <div className="form-group" style={{marginBottom:0}}>
              <label className="form-label">Categoría</label>
              <select className="form-select" value={newEj.categoria}
                onChange={e=>setNewEj(n=>({...n,categoria:e.target.value}))}>
                {CATEGORIAS.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group" style={{marginBottom:0}}>
              <label className="form-label">% Base</label>
              <input className="form-input" type="number" min={0} max={200} placeholder="100"
                value={newEj.pct_base} onChange={e=>setNewEj(n=>({...n,pct_base:e.target.value}))}/>
            </div>
            <div className="form-group" style={{marginBottom:0}}>
              <label className="form-label">Referencia</label>
              <select className="form-select" value={newEj.base}
                onChange={e=>setNewEj(n=>({...n,base:e.target.value}))}>
                <option value="arranque">Arranque</option>
                <option value="envion">Envión</option>
                <option value="">Ninguna</option>
              </select>
            </div>
          </div>
          {error && <div style={{color:"var(--red)",fontSize:12,fontWeight:600,marginTop:8}}>⚠ {error}</div>}
          <div style={{marginTop:12,display:"flex",justifyContent:"flex-end",gap:8}}>
            <button className="btn btn-ghost btn-sm" onClick={()=>{setShowAdd(false);setError("");}}>Cancelar</button>
            <button className="btn btn-gold btn-sm" onClick={addEj}>Agregar ejercicio</button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="card">
        <div className="flex gap12 mb14" style={{flexWrap:"wrap"}}>
          <input className="form-input" style={{maxWidth:240}} placeholder="Buscar por nombre o ID..."
            value={filtro} onChange={e=>setFiltro(e.target.value)}/>
          <select className="form-select" style={{maxWidth:200}} value={catFiltro}
            onChange={e=>setCatFiltro(e.target.value)}>
            <option value="">Todas las categorías</option>
            {CATEGORIAS.map(c=><option key={c}>{c}</option>)}
          </select>
          <span className="text-sm text-muted" style={{alignSelf:"center"}}>{filtered.length} ejercicios</span>
        </div>

        {/* Error en edición */}
        {error && editId && (
          <div style={{
            marginBottom:12, padding:"8px 14px", borderRadius:8,
            background:"rgba(232,71,71,.1)", border:"1px solid rgba(232,71,71,.3)",
            fontSize:12, color:"var(--red)", fontWeight:600
          }}>⚠ {error}</div>
        )}

        <div className="scroll-x">
          <table className="norm-table">
            <thead>
              <tr>
                <th style={{width:50}}>ID</th>
                <th>Ejercicio</th>
                <th style={{width:150}}>Categoría</th>
                <th style={{width:80,textAlign:"center"}}>% Base</th>
                <th style={{width:100}}>Referencia</th>
                <th style={{width:80,textAlign:"right"}}/>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => {
                const isEditing = editId === e.id;
                const row = isEditing ? editForm : e;
                return (
                  <tr key={e.id}
                    style={{
                      background: isEditing ? "rgba(232,197,71,.06)" : "transparent",
                      cursor: isEditing ? "default" : "pointer"
                    }}
                    onClick={() => !isEditing && startEdit(e)}>

                    {/* ID */}
                    <td onClick={ev => isEditing && ev.stopPropagation()}>
                      {isEditing
                        ? <input
                            style={{...inputStyle, width:60, textAlign:"center"}}
                            value={row.id ?? ""}
                            onChange={ev => setF("id", ev.target.value === "" ? "" : Number(ev.target.value))}
                            onKeyDown={ev => {
                              // Only allow digits, backspace, delete, arrows, tab
                              if (!/[\d]/.test(ev.key) && !["Backspace","Delete","ArrowLeft","ArrowRight","Tab","Enter"].includes(ev.key)) {
                                ev.preventDefault();
                              }
                            }}
                            placeholder={String(e.id)}
                          />
                        : <span style={{fontFamily:"'Bebas Neue'",fontSize:16,color:"var(--muted)"}}>{e.id}</span>
                      }
                    </td>

                    {/* Nombre */}
                    <td onClick={ev => isEditing && ev.stopPropagation()}>
                      {isEditing
                        ? <input style={{...inputStyle,minWidth:250}} value={row.nombre}
                            onChange={ev=>setF("nombre",ev.target.value)}/>
                        : <span style={{fontWeight:500}}>{e.nombre}</span>
                      }
                    </td>

                    {/* Categoría */}
                    <td onClick={ev => isEditing && ev.stopPropagation()}>
                      {isEditing
                        ? <select style={inputStyle} value={row.categoria}
                            onChange={ev=>setF("categoria",ev.target.value)}>
                            {CATEGORIAS.map(c=><option key={c}>{c}</option>)}
                          </select>
                        : <span className="badge" style={{background:`${CAT_COLOR[e.categoria]}20`,
                            color:CAT_COLOR[e.categoria]}}>{e.categoria}</span>
                      }
                    </td>

                    {/* % Base */}
                    <td style={{textAlign:"center"}} onClick={ev => isEditing && ev.stopPropagation()}>
                      {isEditing
                        ? <input type="number" min={0} max={200}
                            style={{...inputStyle,width:70,textAlign:"center"}}
                            value={row.pct_base}
                            onChange={ev=>setF("pct_base",ev.target.value)}/>
                        : <span style={{fontFamily:"'Bebas Neue'",fontSize:16,color:"var(--gold)"}}>
                            {e.pct_base||"—"}
                          </span>
                      }
                    </td>

                    {/* Referencia */}
                    <td onClick={ev => isEditing && ev.stopPropagation()}>
                      {isEditing
                        ? <select style={inputStyle} value={row.base||""}
                            onChange={ev=>setF("base",ev.target.value)}>
                            <option value="arranque">Arranque</option>
                            <option value="envion">Envión</option>
                            <option value="">Ninguna</option>
                          </select>
                        : <span className="text-sm text-muted">{e.base||"—"}</span>
                      }
                    </td>

                    {/* Acciones */}
                    <td style={{textAlign:"right"}} onClick={ev=>ev.stopPropagation()}>
                      {isEditing ? (
                        <div className="flex gap4" style={{justifyContent:"flex-end"}}>
                          <button className="btn btn-ghost btn-xs" onClick={cancelEdit}>✕</button>
                          <button className="btn btn-gold btn-xs" onClick={confirmEdit}>✓</button>
                        </div>
                      ) : (
                        <button className="btn btn-danger btn-xs"
                          onClick={()=>setConfirmDel(e.id)}>✕</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm delete modal */}
      {confirmDel !== null && (()=>{
        const ej = ejercicios.find(e=>e.id===confirmDel);
        return (
          <Modal title="Eliminar ejercicio" onClose={()=>setConfirmDel(null)}>
            <div style={{marginBottom:20}}>
              <div style={{fontSize:14,color:"var(--text)",marginBottom:8}}>
                ¿Estás seguro que querés eliminar este ejercicio?
              </div>
              <div style={{
                background:"var(--surface2)",border:"1px solid var(--border)",
                borderRadius:8,padding:"12px 16px"
              }}>
                <div style={{fontFamily:"'Bebas Neue'",fontSize:18,color:"var(--gold)"}}>
                  {ej?.id} — {ej?.nombre}
                </div>
                <div style={{fontSize:12,color:"var(--muted)",marginTop:4,display:"flex",gap:8,alignItems:"center"}}>
                  <span className="badge" style={{background:`${CAT_COLOR[ej?.categoria]}20`,
                    color:CAT_COLOR[ej?.categoria]}}>{ej?.categoria}</span>
                  {ej?.pct_base && <span>{ej.pct_base}% ({ej.base})</span>}
                </div>
              </div>
              <div style={{fontSize:12,color:"var(--red)",marginTop:10}}>
                Esta acción no se puede deshacer.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setConfirmDel(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={()=>deleteEj(confirmDel)}>Eliminar</button>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}

// ─── PAGE CALCULADORA ────────────────────────────────────────────────────────
function PageCalculadora() {
  const [tablas, setTablas] = useState(() => {
    try { return JSON.parse(localStorage.getItem('liftplan_tablas') || 'null') || TABLA_DEFAULT; }
    catch { return TABLA_DEFAULT; }
  });

  // Top tabs: IRM | Series/Reps
  const [seccion, setSeccion] = useState("irm");
  // Sub-tabs within each section
  const [tabIRM, setTabIRM]   = useState("tabla1");
  const [tabSR,  setTabSR]    = useState("lookup_general");
  const [editCell, setEditCell] = useState(null);

  const saveTablas = (newTablas) => {
    setTablas(newTablas);
    try { localStorage.setItem('liftplan_tablas', JSON.stringify(newTablas)); } catch {}
  };

  const updateCell = (tablaKey, irmIdx, col, val) => {
    const newVal = val === "" ? 0 : Number(val);
    const newTablas = {...tablas};
    newTablas[tablaKey] = tablas[tablaKey].map((row, i) =>
      i === irmIdx ? {...row, [col]: newVal} : row
    );
    saveTablas(newTablas);
  };

  const updateLookup = (tablaKey, rowIdx, field, val) => {
    const newTablas = {...tablas};
    newTablas[tablaKey] = tablas[tablaKey].map((row, i) =>
      i === rowIdx ? {...row, [field]: val === "" ? 0 : Number(val)} : row
    );
    saveTablas(newTablas);
  };

  const resetTabla = (tablaKey) => {
    if (!confirm("¿Restaurar esta tabla a los valores originales?")) return;
    saveTablas({...tablas, [tablaKey]: TABLA_DEFAULT[tablaKey]});
  };

  const rowSum = (row) => INTENS_COLS.reduce((s, c) => s + (row[c] || 0), 0);

  // IRM resultante: media ponderada = (pct50*50 + pct60*60 + ... + pct95*95) / 100
  const calcIRMresultante = (row) =>
    Math.round(INTENS_COLS.reduce((s, c) => s + (row[c] || 0) * c, 0)) / 100;

  // Suggestion state: { tablaKey, rIdx, pivotCol, pivotVal, suggested }
  const [suggestion, setSuggestion] = useState(null);

  // Auto-balance: fix pivot col, distribute remaining so IRM_calc = irm_nominal exactly
  // Uses two-col interpolation: finds two bracketing cols and splits weight between them
  const computeBalance = (row, pivotCol, pivotVal) => {
    const pVal     = Math.min(100, Math.max(0, Number(pivotVal)));
    const remaining = 100 - pVal;
    const irmNominal = row.irm;

    // Active cols = those with value > 0, plus pivot (always active)
    let activeCols = INTENS_COLS.filter(c => c === pivotCol || (row[String(c)] || 0) > 0);
    // Fallback: if no other active cols, use all adjacent to pivot
    const otherActive = activeCols.filter(c => c !== pivotCol);
    const resolvedOther = otherActive.length > 0
      ? otherActive
      : INTENS_COLS.filter(c => c !== pivotCol);

    // Build result zeroing non-active cols
    const suggested = {};
    INTENS_COLS.forEach(c => { suggested[String(c)] = 0; });
    suggested[String(pivotCol)] = pVal;

    if (remaining <= 0) return {...row, ...suggested};

    // Target: IRM_calc = irmNominal
    // pivot contrib: pVal * pivotCol / 100
    // other contrib needed: irmNominal - pVal * pivotCol / 100
    // other contrib = sum(w_i * c_i) / 100, sum(w_i) = remaining
    // → target avg intensity of other = (irmNominal - pVal*pivotCol/100) * 100 / remaining
    const pivotContrib  = pVal * pivotCol / 100;
    const otherContrib  = irmNominal - pivotContrib;
    const targetAvg     = otherContrib * 100 / remaining;

    const sortedOther   = [...resolvedOther].sort((a,b) => a - b);
    const minI          = sortedOther[0];
    const maxI          = sortedOther[sortedOther.length - 1];
    const clampedTarget = Math.max(minI, Math.min(maxI, targetAvg));

    if (sortedOther.length === 1) {
      suggested[String(sortedOther[0])] = remaining;
      return {...row, ...suggested};
    }

    // Find two bracketing cols
    let lowCol = sortedOther[0], highCol = sortedOther[sortedOther.length - 1];
    for (let i = 0; i < sortedOther.length - 1; i++) {
      if (sortedOther[i] <= clampedTarget && clampedTarget <= sortedOther[i+1]) {
        lowCol = sortedOther[i]; highCol = sortedOther[i+1]; break;
      }
    }

    const alpha     = lowCol === highCol ? 0 : (clampedTarget - lowCol) / (highCol - lowCol);
    const highW     = Math.round(alpha * remaining * 10) / 10;
    const lowW      = Math.round((remaining - highW) * 10) / 10;

    suggested[String(lowCol)]  = lowW;
    suggested[String(highCol)] = highW;

    return {...row, ...suggested};
  };

  const applySuggestion = () => {
    if (!suggestion) return;
    const { tablaKey, rIdx, suggested } = suggestion;
    const newTablas = {...tablas};
    newTablas[tablaKey] = tablas[tablaKey].map((row, i) =>
      i === rIdx ? suggested : row
    );
    saveTablas(newTablas);
    setSuggestion(null);
  };

  // ── IRM distribution tables ─────────────────────────────────────────────
  const renderTablaIRM = (tablaKey) => {
    const rows = tablas[tablaKey];
    return (
      <div style={{overflowX:"auto"}}>
        <table className="norm-table" style={{fontSize:12, minWidth:620}}>
          <thead>
            <tr>
              <th style={{width:48}}>IRM</th>
              {INTENS_COLS.map(c=>(
                <th key={c} style={{textAlign:"center", width:56}}>{c}%</th>
              ))}
              <th style={{textAlign:"center", width:56}}>Total</th>
              <th style={{textAlign:"center", width:64}}>IRM calc.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rIdx) => {
              const total = rowSum(row);
              const ok    = Math.round(total * 10) === 1000; // handles floats
              return (
                <tr key={row.irm}>
                  <td style={{fontFamily:"'Bebas Neue'", fontSize:16, color:"var(--gold)"}}>{row.irm}</td>
                  {INTENS_COLS.map(col => {
                    const key = String(col);
                    const isEditing = editCell?.tabla===tablaKey && editCell?.rIdx===rIdx && editCell?.col===key;
                    return (
                      <td key={col} style={{textAlign:"center", padding:"3px 4px"}}>
                        {isEditing ? (
                          <input
                            autoFocus type="number" min={0} max={100} step={0.5}
                            defaultValue={row[key]||0}
                            style={{
                              width:50, background:"var(--surface3)",
                              border:"1px solid var(--gold)", borderRadius:4,
                              color:"var(--text)", textAlign:"center",
                              fontSize:12, padding:"2px 4px", outline:"none"
                            }}
                            onBlur={e => {
                              const newVal = e.target.value;
                              updateCell(tablaKey, rIdx, key, newVal);
                              setEditCell(null);
                              // Compute balance suggestion
                              const suggested = computeBalance(tablas[tablaKey][rIdx], Number(key), newVal);
                              const sugTotal = Math.round(INTENS_COLS.reduce((s,c) => s+(suggested[String(c)]||0),0)*10)/10;
                              if (sugTotal === 100) {
                                setSuggestion({tablaKey, rIdx, pivotCol:Number(key), pivotVal:Number(newVal), suggested});
                              }
                            }}
                            onKeyDown={e => { if(e.key==="Enter"||e.key==="Escape") e.target.blur(); }}
                          />
                        ) : (
                          <div
                            onClick={() => setEditCell({tabla:tablaKey, rIdx, col:key})}
                            style={{
                              cursor:"pointer", padding:"3px 6px", borderRadius:4,
                              color: row[key] ? "var(--text)" : "var(--muted)",
                              background: row[key] ? "var(--surface2)" : "transparent",
                              minWidth:36, display:"inline-block",
                              border:"1px solid transparent", transition:"border .1s"
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderColor="var(--border)"}
                            onMouseLeave={e => e.currentTarget.style.borderColor="transparent"}>
                            {row[key]||"—"}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  {/* Total con semáforo */}
                  <td style={{textAlign:"center"}}>
                    <span style={{
                      fontFamily:"'Bebas Neue'", fontSize:15,
                      color: ok ? "var(--green)" : "var(--red)",
                      fontWeight:700
                    }}>
                      {total % 1 === 0 ? total : total.toFixed(1)}
                    </span>
                  </td>
                  {/* IRM resultante */}
                  <td style={{textAlign:"center"}}>
                    {(() => {
                      const irm_calc = calcIRMresultante(row);
                      const diff = Math.round((irm_calc - row.irm) * 10) / 10;
                      const color = diff === 0 ? "var(--green)" : Math.abs(diff) <= 1 ? "var(--gold)" : "var(--red)";
                      return (
                        <div style={{lineHeight:1.2}}>
                          <span style={{fontFamily:"'Bebas Neue'",fontSize:15,color}}>{irm_calc}</span>
                          {diff !== 0 && (
                            <div style={{fontSize:10,color,marginTop:1}}>
                              {diff > 0 ? "+" : ""}{diff}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{marginTop:10, fontSize:12, color:"var(--muted)"}}>
          💡 Cada fila debe sumar exactamente <span style={{color:"var(--gold)",fontWeight:700}}>100</span>. Click en cualquier celda para editar.
        </div>

        {/* Suggestion banner */}
        {suggestion && suggestion.tablaKey === tablaKey && (
          <div style={{
            marginTop:12, padding:"12px 16px",
            background:"rgba(232,197,71,.08)", border:"1px solid rgba(232,197,71,.3)",
            borderRadius:10, display:"flex", alignItems:"center",
            gap:12, flexWrap:"wrap"
          }}>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600,color:"var(--gold)",marginBottom:4}}>
                ⚡ Balance exacto — IRM {tablas[tablaKey][suggestion.rIdx]?.irm}
              </div>
              <div style={{fontSize:12,color:"var(--muted)"}}>
                Priorizando <span style={{color:"var(--gold)",fontWeight:700}}>{suggestion.pivotCol}% = {suggestion.pivotVal}</span>,
                el resto se distribuye en dos zonas para que el IRM calculado sea exactamente{" "}
                <span style={{color:"var(--green)",fontWeight:700}}>{tablas[tablaKey][suggestion.rIdx]?.irm}</span>:
              </div>
              <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
                {INTENS_COLS.map(c => {
                  const orig = tablas[tablaKey][suggestion.rIdx]?.[String(c)] || 0;
                  const sug  = suggestion.suggested[String(c)] || 0;
                  const changed = orig !== sug;
                  const isPivot = c === suggestion.pivotCol;
                  return (
                    <div key={c} style={{
                      background: isPivot ? "rgba(232,197,71,.2)" : changed ? "rgba(71,180,232,.1)" : "var(--surface2)",
                      border:`1px solid ${isPivot?"var(--gold)":changed?"var(--blue)":"var(--border)"}`,
                      borderRadius:6, padding:"4px 8px", textAlign:"center", minWidth:52
                    }}>
                      <div style={{fontSize:9,color:"var(--muted)",textTransform:"uppercase"}}>{c}%</div>
                      <div style={{fontFamily:"'Bebas Neue'",fontSize:15,
                        color:isPivot?"var(--gold)":changed?"var(--blue)":"var(--text)"}}>
                        {sug % 1 === 0 ? sug : sug.toFixed(1)}
                      </div>
                      {changed && !isPivot && (
                        <div style={{fontSize:9,color:"var(--muted)"}}>
                          era {orig%1===0?orig:orig.toFixed(1)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6,flexShrink:0}}>
              <button className="btn btn-gold btn-sm" onClick={applySuggestion}>
                Aplicar
              </button>
              <button className="btn btn-ghost btn-sm" onClick={()=>setSuggestion(null)}>
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
      <div style={{overflowX:"auto"}}>
        <table className="norm-table" style={{fontSize:12}}>
          <thead>
            <tr>
              <th>Intensidad</th>
              <th>Modo</th>
              <th>Reps totales</th>
              <th style={{textAlign:"center"}}>Series</th>
              <th style={{textAlign:"center"}}>Reps / serie</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rIdx) => (
              <tr key={rIdx}>
                <td style={{fontFamily:"'Bebas Neue'", fontSize:15, color:"var(--gold)"}}>
                  {row.intens}%
                </td>
                <td>
                  <span className={`badge ${row.modo==="Comp"?"badge-gold":"badge-blue"}`}>
                    {row.modo}
                  </span>
                </td>
                <td style={{color:"var(--muted)", fontWeight:600}}>{row.reps}</td>
                <td style={{textAlign:"center"}}>
                  <input type="number" min={1} value={row.series||1}
                    onChange={e => updateLookup(tablaKey, rIdx, "series", e.target.value)}
                    style={{
                      width:52, background:"var(--surface2)",
                      border:"1px solid var(--border)", borderRadius:4,
                      color:"var(--text)", textAlign:"center",
                      fontSize:12, padding:"3px 4px", outline:"none"
                    }}/>
                </td>
                <td style={{textAlign:"center"}}>
                  <input type="number" min={1} value={row.reps_serie||1}
                    onChange={e => updateLookup(tablaKey, rIdx, "reps_serie", e.target.value)}
                    style={{
                      width:52, background:"var(--surface2)",
                      border:"1px solid var(--border)", borderRadius:4,
                      color:"var(--text)", textAlign:"center",
                      fontSize:12, padding:"3px 4px", outline:"none"
                    }}/>
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
      <div style={{
        background:"var(--surface)", border:"1px solid var(--border)",
        borderRadius:12, marginBottom:16, overflow:"hidden"
      }}>
        {/* Fila 1 — IRM | Series/Reps */}
        <div style={{display:"flex", borderBottom:"1px solid var(--border)"}}>
          {[{id:"irm",label:"Tablas IRM"},{id:"sr",label:"Series / Reps"}].map(s=>(
            <button key={s.id}
              onClick={()=>setSeccion(s.id)}
              style={{
                flex:1, padding:"12px 0", border:"none", background:"none",
                color: seccion===s.id ? "var(--gold)" : "var(--muted)",
                fontFamily:"'Bebas Neue'", fontSize:18, letterSpacing:".05em",
                cursor:"pointer",
                borderBottom: seccion===s.id ? "2px solid var(--gold)" : "2px solid transparent",
                transition:"all .2s"
              }}>{s.label}</button>
          ))}
        </div>

        {/* Fila 2 — sub-tabs */}
        <div style={{padding:"0 16px", display:"flex", gap:0, height:40}}>
          {seccion === "irm"
            ? [{id:"tabla1",label:"Tabla 1"},{id:"tabla2",label:"Tabla 2"},{id:"tabla3",label:"Tabla 3"}].map(t=>(
                <button key={t.id}
                  onClick={()=>setTabIRM(t.id)}
                  style={{
                    padding:"0 16px", border:"none", background:"none",
                    color: tabIRM===t.id ? "var(--gold)" : "var(--muted)",
                    fontFamily:"'DM Sans'", fontSize:13, fontWeight:600,
                    cursor:"pointer",
                    borderBottom: tabIRM===t.id ? "2px solid var(--gold)" : "2px solid transparent",
                    transition:"all .2s"
                  }}>{t.label}</button>
              ))
            : [{id:"lookup_general",label:"General"},{id:"lookup_tirones",label:"Tirones"}].map(t=>(
                <button key={t.id}
                  onClick={()=>setTabSR(t.id)}
                  style={{
                    padding:"0 16px", border:"none", background:"none",
                    color: tabSR===t.id ? "var(--gold)" : "var(--muted)",
                    fontFamily:"'DM Sans'", fontSize:13, fontWeight:600,
                    cursor:"pointer",
                    borderBottom: tabSR===t.id ? "2px solid var(--gold)" : "2px solid transparent",
                    transition:"all .2s"
                  }}>{t.label}</button>
              ))
          }
        </div>
      </div>

      {/* Contenido */}
      <div className="card">
        {seccion === "irm"
          ? renderTablaIRM(tabIRM)
          : renderLookup(tabSR)
        }
      </div>
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
// Helpers de persistencia
const load = (key, fallback) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
};
const save = (key, val) => {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
};

// ═══════════════════════════════════════════════════════════════
// PANEL DE REFERENCIA — vista lateral de solo lectura
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// PANEL DE REFERENCIA

class PanelTabBoundary extends React.Component {
  constructor(p) { super(p); this.state = {err:null}; }
  static getDerivedStateFromError(e) { return {err:e}; }
  componentDidCatch(e, i) { console.error("[BOUNDARY]", this.props.tab, e?.message, i?.componentStack?.slice(0,200)); }
  render() {
    if (this.state.err) return (
      <div style={{padding:24,color:"#e85047",fontSize:12,fontFamily:"monospace",wordBreak:"break-all",background:"#1a0000",borderRadius:8,margin:8}}>
        <strong>💥 Error en {this.props.tab}:</strong><br/>
        {String(this.state.err?.message || this.state.err)}
      </div>
    );
    return this.props.children;
  }
}

function PanelReferencia({ atletas, mesociclos, plantillas, liveMesoData={}, onClose, onWidthChange, isMobile }) {
  const [modo,     setModo]     = useState("atleta");
  const [atletaId, setAtletaId] = useState(atletas[0]?.id || null);
  const [mesoId,   setMesoId]   = useState(null);
  const [pltId,    setPltId]    = useState(plantillas[0]?.id || null);
  const [semIdx,   setSemIdx]   = useState(0);
  const [turnoIdx, setTurnoIdx] = useState(0);
  const [vista,    setVista]    = useState("planilla");
  const [vistaKey, setVistaKey] = useState({planilla:0, resumen:0, pdf:0});
  const cambiarVista = (v) => {
    setVista(v);
    setVistaKey(prev => ({...prev, [v]: Date.now()}));
  };

  const misMesos = mesociclos.filter(m => m.atleta_id === atletaId)
    .sort((a,b) => (b.fecha_inicio||"").localeCompare(a.fecha_inicio||""));
  const atleta = atletas.find(a => a.id === atletaId) || null;
  const mesoBase = misMesos.find(m => m.id === mesoId) || misMesos[0] || null;

  // Use live meso from emit if available, otherwise use stored
  // live.meso has the latest semanas/pct_grupos structure from PageAtleta state
  const live = liveMesoData?.[atletaId];
  const meso = live?.meso?.id === mesoBase?.id ? live?.meso : (live?.meso || mesoBase || null);

  // Read overrides from localStorage — same approach as PageResumen/PagePDF
  // This always stays in sync because PageAtleta writes to localStorage on every change
  const mid = meso?.id;
  const aid = atletaId; // pct keys use atleta.id
  const lsGet    = (key, dflt) => { try { return JSON.parse(localStorage.getItem(`liftplan_pt_${mid}_${key}`)    || 'null') ?? dflt; } catch { return dflt; } };
  const lsPctGet = (key, dflt) => { try { return JSON.parse(localStorage.getItem(`liftplan_pct_${aid}_${key}`)  || 'null') ?? dflt; } catch { return dflt; } };

  const liveRepsEdit   = live?.repsEdit   ?? lsGet('repsEdit', {});
  const liveManualEdit = new Set(live?.manualEdit ?? lsGet('manualEdit', []));
  const liveSemPctOvr  = live?.semPctOverrides  ?? lsPctGet('semOvr', {});
  const liveSemPctMan  = new Set(live?.semPctManual  ?? lsPctGet('semMan', []));
  const liveTurnoPctOvr = live?.turnoPctOverrides ?? lsPctGet('turnoOvr', {});
  const liveTurnoPctMan = new Set(live?.turnoPctManual ?? lsPctGet('turnoMan', []));

  // Force re-read on render tick using a ticker
  const [tick, setTick] = useState(0);
  useEffect(() => {
    // Poll every 300ms for localStorage changes (catches % bloques/turnos updates)
    const id = setInterval(() => setTick(t => t+1), 300);
    // Also listen to storage events (cross-tab)
    const onStorage = () => setTick(t => t+1);
    window.addEventListener('storage', onStorage);
    return () => { clearInterval(id); window.removeEventListener('storage', onStorage); };
  }, [mid]);

  // Use tick to force re-read (tick is referenced so React includes it in render)
  void tick;

  // Mirrors PlanillaTurno getSemPct/getTurnoPct/calcTentativa exactly
  const _getSemPct = (g, sIdx) => {
    const k = `${g}-${sIdx}`;
    if (liveSemPctMan.has(k)) return Number(liveSemPctOvr[k]) || 0;
    if (!meso?.semanas?.[sIdx]) return 0;
    const { porGrupo, totalSem } = calcSembradoSemana(meso.semanas[sIdx]);
    return totalSem > 0 ? (porGrupo[g]?.total || 0) / totalSem * 100 : 0;
  };
  const _getTurnoPct = (g, sIdx, tIdx) => {
    const k = `${g}-${sIdx}-${tIdx}`;
    if (liveTurnoPctMan.has(k)) return Number(liveTurnoPctOvr[k]) || 0;
    if (!meso?.semanas?.[sIdx]) return 0;
    const { porGrupo } = calcSembradoSemana(meso.semanas[sIdx]);
    const total = porGrupo[g]?.total || 0;
    return total > 0 ? (porGrupo[g]?.porTurno?.[tIdx] || 0) / total * 100 : 0;
  };

  const getRepsVal = (ej, sIdx, tIdx) => {
    const k = `${sIdx}-${tIdx}-${ej.id}`;
    // Manual override wins
    if (liveManualEdit.has(k)) return Number(liveRepsEdit[k]) || 0;
    // Direct assignment
    if (ej.reps_asignadas > 0) return ej.reps_asignadas;
    // Calculate tentativa with overrides — same as PlanillaTurno
    const sem = meso?.semanas?.[sIdx];
    if (!sem || !meso?.volumen_total) return 0;
    const reps_sem = meso.volumen_total * (sem.pct_volumen / 100);
    const g = getGrupo(ej.ejercicio_id);
    if (!g) return 0;
    const pctGSem   = _getSemPct(g, sIdx) / 100;
    const pctGTurno = _getTurnoPct(g, sIdx, tIdx) / 100;
    if (!pctGSem || !pctGTurno) return 0;
    const repsBloque = Math.round(reps_sem * pctGSem * pctGTurno);
    const turno = sem.turnos[tIdx];
    if (!turno) return 0;
    const ejsG   = turno.ejercicios.filter(e => e.ejercicio_id && getGrupo(e.ejercicio_id) === g);
    const editados = ejsG.filter(e => liveManualEdit.has(`${sIdx}-${tIdx}-${e.id}`));
    const libres   = ejsG.filter(e => !liveManualEdit.has(`${sIdx}-${tIdx}-${e.id}`));
    const repsReservadas = editados.reduce((s, e) => s + (Number(liveRepsEdit[`${sIdx}-${tIdx}-${e.id}`]) || 0), 0);
    const repsLibres = Math.max(0, repsBloque - repsReservadas);
    if (!libres.length) return 0;
    const base  = Math.floor(repsLibres / libres.length);
    const extra = repsLibres - base * libres.length;
    const idx   = libres.findIndex(e => e.id === ej.id);
    return idx >= 0 ? base + (idx < extra ? 1 : 0) : 0;
  };

  const plt    = plantillas.find(p => p.id === pltId) || null;
  const fuente = modo === "atleta" ? meso : (plt?.semanas ? plt : null);
  const semanas = fuente?.semanas || [];
  const sem    = semanas[semIdx] || semanas[0] || null;
  const turno  = sem?.turnos?.[turnoIdx] || sem?.turnos?.[0] || null;

  useEffect(() => { setMesoId(null); setSemIdx(0); setTurnoIdx(0); }, [atletaId]);
  useEffect(() => { setSemIdx(0); setTurnoIdx(0); }, [mesoId, pltId, modo]);
  useEffect(() => { setTurnoIdx(0); }, [semIdx]);

  const irm_arr = modo==="atleta" ? Number(meso?.irm_arranque||0) : 100;
  const irm_env = modo==="atleta" ? Number(meso?.irm_envion||0)   : 200;

  const TabBtn = ({id, label}) => (
    <button onClick={()=>cambiarVista(id)} style={{
      flex:1, padding:"6px 0", border:"none", cursor:"pointer",
      fontSize:12, fontWeight:700, borderRadius:8,
      background: vista===id ? "var(--gold)" : "var(--surface2)",
      color: vista===id ? "#000" : "var(--muted)", transition:"all .15s"
    }}>{label}</button>
  );

  const SemBtn = ({s, i}) => (
    <button onClick={()=>setSemIdx(i)} style={{
      padding:"4px 10px", borderRadius:20, border:"none", cursor:"pointer",
      fontSize:11, fontWeight:700, whiteSpace:"nowrap",
      background: semIdx===i ? "var(--gold)" : "var(--surface2)",
      color: semIdx===i ? "#000" : "var(--muted)", transition:"all .15s"
    }}>Sem {s.numero}</button>
  );

  const TurnoBtn = ({t, i}) => (
    <button onClick={()=>setTurnoIdx(i)} style={{
      padding:"4px 10px", borderRadius:20, border:"none", cursor:"pointer",
      fontSize:11, fontWeight:700, whiteSpace:"nowrap",
      background: turnoIdx===i ? "rgba(100,180,255,.85)" : "var(--surface2)",
      color: turnoIdx===i ? "#000" : "var(--muted)", transition:"all .15s"
    }}>T{t.numero||i+1}{t.dia?` · ${t.dia}`:""}</button>
  );

  // ── Vista PLANILLA (resumen + planilla de turnos) ────────────────
  const VistaPlanilla = () => {
    if (!fuente) return <div style={{padding:32,textAlign:"center",color:"var(--muted)",fontSize:13}}>Sin datos</div>;
    const volTotal = fuente.volumen_total || 0;
    const tablas   = TABLA_DEFAULT;
    const modo_    = fuente.modo || "Preparatorio";

    // % bloques y turnos — usar _getSemPct/_getTurnoPct (respetan overrides en tiempo real)
    const GRUPOS_PANEL = ["Arranque","Envion","Tirones","Piernas"];
    const turnosRef = sem?.turnos || [];
    const gruposPct = GRUPOS_PANEL.map(g => ({
      g,
      col: CAT_COLOR[g] || "var(--muted)",
      pctSem: Math.round(_getSemPct(g, semIdx)),
      pctTurnos: turnosRef.map((t, tIdx) => ({
        tIdx, label: `T${t.numero||tIdx+1}${t.dia ? ` ${t.dia.slice(0,3)}` : ""}`,
        pct: Math.round(_getTurnoPct(g, semIdx, tIdx))
      })).filter(x => x.pct > 0)
    })).filter(x => x.pctSem > 0);

    return (
      <div style={{display:"flex",flexDirection:"column",gap:18}}>
        {/* IRM + vol */}
        {modo==="atleta" && meso && (
          <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
            {[
              {v:meso.irm_arranque,l:"Arr kg",c:"var(--gold)"},
              {v:meso.irm_envion,  l:"Env kg",c:"var(--blue)"},
              {v:volTotal,         l:"Vol reps",c:"var(--text)"},
            ].map(({v,l,c})=>(
              <div key={l} style={{textAlign:"center"}}>
                <div style={{fontFamily:"'Bebas Neue'",fontSize:22,color:c,lineHeight:1}}>{v||"—"}</div>
                <div style={{fontSize:9,color:"var(--muted)",textTransform:"uppercase",letterSpacing:".06em",marginTop:2}}>{l}</div>
              </div>
            ))}
          </div>
        )}

        {/* % Semanal — usa s.pct_volumen directo de live.meso (siempre actualizado) */}
        <div>
          <div style={{fontSize:10,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:".07em",marginBottom:8}}>% Semanal · Reps</div>
          {semanas.map((s,i)=>{
            const pct = s.pct_volumen;
            const reps = Math.round(volTotal * pct / 100);
            return (
              <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                <div style={{fontSize:11,color:"var(--muted)",width:52,flexShrink:0}}>Sem {s.numero}</div>
                <div style={{flex:1,height:6,background:"var(--surface3)",borderRadius:3,overflow:"hidden"}}>
                  <div style={{height:"100%",borderRadius:3,width:`${pct}%`,background:"var(--gold)"}}/>
                </div>
                <div style={{fontSize:11,fontWeight:700,color:"var(--gold)",width:30,textAlign:"right",flexShrink:0}}>{pct}%</div>
                <div style={{fontSize:11,color:"var(--muted)",width:44,textAlign:"right",flexShrink:0}}>{reps}r</div>
              </div>
            );
          })}
        </div>

        {/* % Bloques — usa _getSemPct (respeta overrides) + desglose por turno */}
        {gruposPct.length > 0 && (
          <div>
            <div style={{fontSize:10,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:".07em",marginBottom:8}}>% Bloques · Sem {sem?.numero}</div>
            {gruposPct.map(({g, col, pctSem, pctTurnos}) => (
              <div key={g} style={{marginBottom:8}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                  <div style={{fontSize:11,color:col,width:70,flexShrink:0,fontWeight:600}}>{g}</div>
                  <div style={{flex:1,height:6,background:"var(--surface3)",borderRadius:3,overflow:"hidden"}}>
                    <div style={{height:"100%",borderRadius:3,width:`${pctSem}%`,background:col}}/>
                  </div>
                  <div style={{fontSize:11,fontWeight:700,color:col,width:34,textAlign:"right",flexShrink:0}}>{pctSem}%</div>
                </div>

              </div>
            ))}
          </div>
        )}

        {/* % Bloques por turno — mismo formato, datos de _getTurnoPct del turno activo */}
        {gruposPct.length > 0 && (
          <div>
            <div style={{fontSize:10,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:".07em",marginBottom:8}}>
              % Bloques · T{turno?.numero||turnoIdx+1}{turno?.dia ? ` · ${turno.dia.slice(0,3)}` : ""}
            </div>
            {gruposPct.map(({g, col, pctSem}) => {
              const pct = Math.round(_getTurnoPct(g, semIdx, turnoIdx));
              if (!pct) return null;
              return (
                <div key={g} style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                  <div style={{fontSize:11,color:col,width:70,flexShrink:0,fontWeight:600}}>{g}</div>
                  <div style={{flex:1,height:6,background:"var(--surface3)",borderRadius:3,overflow:"hidden"}}>
                    <div style={{height:"100%",borderRadius:3,width:`${pct}%`,background:col}}/>
                  </div>
                  <div style={{fontSize:11,fontWeight:700,color:col,width:34,textAlign:"right",flexShrink:0}}>{pct}%</div>
                </div>
              );
            })}
          </div>
        )}

        {/* % Turnos — mismo formato que % Semanal, usando _getTurnoPct por bloque */}
        {turnosRef.length > 0 && gruposPct.length > 0 && (
          <div>
            <div style={{fontSize:10,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:".07em",marginBottom:8}}>% Turnos · Sem {sem?.numero}</div>
            {turnosRef.map((t, tIdx) => {
              const pct = Math.round(
                gruposPct.reduce((sum, {g, pctSem}) =>
                  sum + pctSem * _getTurnoPct(g, semIdx, tIdx) / 100, 0)
              );
              if (!pct) return null;
              const label = `T${t.numero||tIdx+1}${t.dia ? ` · ${t.dia.slice(0,3)}` : ""}`;
              return (
                <div key={tIdx} style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                  <div style={{fontSize:11,color:"var(--muted)",width:52,flexShrink:0}}>{label}</div>
                  <div style={{flex:1,height:6,background:"var(--surface3)",borderRadius:3,overflow:"hidden"}}>
                    <div style={{height:"100%",borderRadius:3,width:`${pct}%`,background:"var(--blue)"}}/>
                  </div>
                  <div style={{fontSize:11,fontWeight:700,color:"var(--blue)",width:30,textAlign:"right",flexShrink:0}}>{pct}%</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Divisor */}
        {turno && turno.ejercicios?.filter(e=>e.ejercicio_id).length>0 && (
          <div style={{borderTop:"1px solid var(--border)",paddingTop:16}}>
            <div style={{fontSize:10,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",
              letterSpacing:".07em",marginBottom:12}}>
              Planilla · Sem {sem?.numero} · T{turno?.numero||turnoIdx+1}
              {turno?.dia ? ` · ${turno.dia}` : ""}
            </div>
            {turno.ejercicios.filter(e=>e.ejercicio_id).map((ej,i) => {
              const data   = getEjercicioById(ej.ejercicio_id);
              const col    = CAT_COLOR[data?.categoria]||"var(--muted)";
              const k = `${semIdx}-${turnoIdx}-${ej.id}`;
              const repsVal = getRepsVal(ej, semIdx, turnoIdx);
              const liveCellEdit   = live?.cellEdit   || {};
              const liveCellManual = live?.cellManual || new Set();
              const getC = (intens, field, def) => {
                const k2 = `${semIdx}-${turnoIdx}-${ej.id}-${intens}-${field}`;
                return liveCellManual.has(k2) ? (Number(liveCellEdit[k2])||0) : def;
              };
              const calcs  = repsVal>0 ? calcSeriesRepsKg(tablas,ej,data,irm_arr,irm_env,modo_,repsVal) : null;
              return (
                <div key={i} style={{border:`1px solid ${col}40`,borderRadius:10,overflow:"hidden",
                  background:`${col}08`,marginBottom:8}}>
                  <div style={{padding:"6px 10px",borderBottom:`1px solid ${col}25`,
                    display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontFamily:"'Bebas Neue'",fontSize:14,color:col,minWidth:20}}>{ej.ejercicio_id}</span>
                    <span style={{flex:1,fontSize:12,color:"var(--text)",fontWeight:600,
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{data?.nombre||"?"}</span>
                    <span style={{fontSize:10,color:"var(--muted)",flexShrink:0}}>T{ej.tabla} · {ej.intensidad}%</span>
                  </div>
                  <div style={{padding:"6px 10px"}}>
                    {repsVal>0 ? (
                      <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
                        <span style={{color:"var(--gold)",fontWeight:700,fontFamily:"'Bebas Neue'",fontSize:16}}>{repsVal}r</span>
                        {calcs && INTENSIDADES.map((intens,ii)=>{
                          const c=calcs[ii];
                          if(!c||c.series==null) return null;
                          const s  = getC(intens, 'series', c.series);
                          const r  = getC(intens, 'reps',   c.reps_serie);
                          const kg = getC(intens, 'kg',     c.kg);
                          return (
                            <span key={intens} style={{padding:"2px 7px",borderRadius:6,
                              background:"var(--surface2)",fontSize:11}}>
                              <span style={{color:"var(--muted)"}}>{intens}% </span>
                              <span style={{color:"var(--text)",fontWeight:600}}>{s}×{r}</span>
                              {kg&&<span style={{color:"var(--muted)"}}> {kg}kg</span>}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span style={{fontSize:11,color:"var(--muted)"}}>Sin reps asignadas</span>
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
  const _mesoRef = fuente ? (modo==="atleta" ? meso : {
    ...fuente, id: fuente.id, modo: fuente.modo||"Preparatorio",
    irm_arranque: irm_arr, irm_envion: irm_env,
  }) : null;
  // atleta puede ser null si el ID no matchea — usar fallback para no bloquear Resumen/PDF
  const _atletaBase = atleta || { id: atletaId||"?", nombre: "Atleta", telefono: "" };
  const _atletaRef = fuente ? (modo==="atleta" ? _atletaBase : {nombre: fuente.nombre||"Atleta", id: fuente.id, telefono:""}) : null;
  const _hasDatos = !!(_mesoRef?.semanas?.length);

  const [panelWidth, setPanelWidth] = useState(420);
  const resizing = useRef(false);
  const [isMobileState, setIsMobileState] = useState(
    typeof window !== "undefined" && window.innerWidth <= 768
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
    <div style={{
      position: isM ? "fixed" : "relative",
      right: isM ? 0 : undefined,
      top: isM ? 0 : undefined,
      bottom: isM ? 0 : undefined,
      zIndex: isM ? 300 : 1,
      width: panelWidth,
      minWidth: 260,
      flexShrink: 0,
      background:"var(--surface)",
      borderLeft:"1px solid var(--border)",
      display:"flex", flexDirection:"column",
      boxShadow: isM ? "-8px 0 32px rgba(0,0,0,.5)" : "-2px 0 12px rgba(0,0,0,.2)",
      height: isM ? undefined : "100%",
      overflowY: "hidden",
    }}>
      {/* Resize handle */}
      <div
        onMouseDown={onResizeStart}
        onTouchStart={onResizeStart}
        style={{
          position:"absolute", left:0, top:0, bottom:0, width:6,
          cursor:"ew-resize", zIndex:10,
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
        <div style={{
          width:3, height:40, borderRadius:3,
          background:"var(--border)", opacity:.6,
          pointerEvents:"none"
        }}/>
      </div>
      {/* Header */}
      <div style={{padding:"10px 14px",borderBottom:"1px solid var(--border)",
        display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
        <div style={{fontFamily:"'Bebas Neue'",fontSize:17,color:"var(--gold)",letterSpacing:".04em",flex:1}}>
          Panel de Referencia
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",
          color:"var(--muted)",cursor:"pointer",fontSize:22,lineHeight:1}}>×</button>
      </div>

      {/* Modo */}
      <div style={{padding:"8px 14px",borderBottom:"1px solid var(--border)",
        display:"flex",gap:6,flexShrink:0}}>
        {[["atleta","Atleta/Meso"],["plantilla","Plantilla"]].map(([v,l])=>(
          <button key={v} onClick={()=>setModo(v)} style={{
            flex:1,padding:"5px 0",borderRadius:7,border:"none",cursor:"pointer",
            fontSize:12,fontWeight:700,
            background:modo===v?"var(--gold)":"var(--surface2)",
            color:modo===v?"#000":"var(--muted)"
          }}>{l}</button>
        ))}
      </div>

      {/* Selectores */}
      <div style={{padding:"8px 14px",borderBottom:"1px solid var(--border)",
        display:"flex",flexDirection:"column",gap:6,flexShrink:0}}>
        {modo==="atleta" ? (<>
          <select className="form-select" value={atletaId||""} onChange={e=>setAtletaId(e.target.value)}
            style={{fontSize:12,padding:"5px 10px"}}>
            {atletas.map(a=><option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
          <select className="form-select" value={mesoId||misMesos[0]?.id||""} onChange={e=>setMesoId(e.target.value)}
            style={{fontSize:12,padding:"5px 10px"}}>
            {misMesos.length===0
              ? <option value="">Sin mesociclos</option>
              : misMesos.map(m=><option key={m.id} value={m.id}>
                  {m.nombre||"Sin nombre"} · {m.fecha_inicio} · {m.modo}
                </option>)}
          </select>
        </>) : (
          <select className="form-select" value={pltId||""} onChange={e=>setPltId(e.target.value)}
            style={{fontSize:12,padding:"5px 10px"}}>
            {plantillas.length===0
              ? <option value="">Sin plantillas</option>
              : plantillas.map(p=><option key={p.id} value={p.id}>
                  {p.nombre}{p.escuela?` · EI N${p.escuela_nivel}`:""}
                </option>)}
          </select>
        )}
      </div>

      {/* Vista tabs — botones inline directos, sin componente interno */}
      <div style={{padding:"8px 14px",borderBottom:"1px solid var(--border)",
        display:"flex",gap:6,flexShrink:0}}>
        {["planilla","resumen","pdf"].map(id=>(
          <button key={id} onClick={()=>{ setVista(id); setVistaKey(prev=>({...prev,[id]:Date.now()})); }}
            style={{flex:1,padding:"6px 0",border:"none",cursor:"pointer",
              fontSize:12,fontWeight:700,borderRadius:8,
              background:vista===id?"var(--gold)":"var(--surface2)",
              color:vista===id?"#000":"var(--muted)",transition:"all .15s"}}>
            {id==="planilla"?"Planilla":id==="resumen"?"Resumen":"PDF"}
          </button>
        ))}
      </div>

      {/* Semanas */}
      {vista==="planilla" && semanas.length>0 && (
        <div style={{padding:"6px 14px",borderBottom:"1px solid var(--border)",
          display:"flex",gap:5,overflowX:"auto",flexShrink:0,scrollbarWidth:"none"}}>
          {semanas.map((s,i)=>(
            <button key={i} onClick={()=>setSemIdx(i)}
              style={{padding:"4px 10px",borderRadius:20,border:"none",cursor:"pointer",
                fontSize:11,fontWeight:700,whiteSpace:"nowrap",
                background:semIdx===i?"var(--gold)":"var(--surface2)",
                color:semIdx===i?"#000":"var(--muted)"}}>
              Sem {s.numero}
            </button>
          ))}
        </div>
      )}

      {/* Turnos */}
      {vista==="planilla" && sem?.turnos?.length>0 && (
        <div style={{padding:"6px 14px",borderBottom:"1px solid var(--border)",
          display:"flex",gap:5,overflowX:"auto",flexShrink:0,scrollbarWidth:"none"}}>
          {sem.turnos.map((t,i)=>(
            <button key={i} onClick={()=>setTurnoIdx(i)}
              style={{padding:"4px 10px",borderRadius:20,border:"none",cursor:"pointer",
                fontSize:11,fontWeight:700,whiteSpace:"nowrap",
                background:turnoIdx===i?"rgba(100,180,255,.85)":"var(--surface2)",
                color:turnoIdx===i?"#000":"var(--muted)"}}>
              T{t.numero||i+1}{t.dia?` · ${t.dia}`:""}
            </button>
          ))}
        </div>
      )}

      {/* Contenido scrolleable */}
      <div style={{flex:1,overflowY:"auto",padding:"12px 14px"}}>
        {vista==="planilla" && <VistaPlanilla/>}

        {vista==="resumen" && (
          <div>
            <div style={{fontSize:10,color:"var(--muted)",padding:"4px 0 8px",fontFamily:"monospace"}}>
              debug: hasDatos={String(_hasDatos)} mesoId={_mesoRef?.id||"null"} sems={_mesoRef?.semanas?.length||0}
            </div>
            {_hasDatos
              ? <PanelTabBoundary tab="Resumen"><PageResumen key={vistaKey.resumen} meso={_mesoRef} atleta={_atletaRef} irm_arr={irm_arr} irm_env={irm_env}/></PanelTabBoundary>
              : <div style={{padding:32,textAlign:"center",color:"var(--muted)",fontSize:13}}>Sin datos — seleccioná un atleta con mesociclo</div>
            }
          </div>
        )}

        {vista==="pdf" && (_hasDatos
          ? <PanelTabBoundary tab="PDF"><PagePDF key={vistaKey.pdf} meso={_mesoRef} atleta={_atletaRef} irm_arr={irm_arr} irm_env={irm_env}/></PanelTabBoundary>
          : <div style={{padding:32,textAlign:"center",color:"var(--muted)",fontSize:13}}>Sin datos — seleccioná un atleta con mesociclo</div>
        )}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
// AUTH — Login / Register screens
// ═══════════════════════════════════════════════════════════════

function LoginScreen({ onAuth }) {
  const [mode,     setMode]     = useState("login");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [nombre,   setNombre]   = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [msg,      setMsg]      = useState("");
  const [logs,     setLogs]     = useState([]);

  const log = (txt, type="info") => {
    const ts = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-15), { ts, txt, type }]);
  };

  const handleLogin = async () => {
    if (!email || !password) { setError("Completá email y contraseña"); return; }
    setLoading(true); setError("");
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    onAuth(data.session);
  };

  const handleRegister = async () => {
    if (!email || !password) { setError("Completá email y contraseña"); return; }
    setLoading(true); setError("");
    const { data, error } = await sb.auth.signUp({
      email, password,
      options: { data: { nombre: nombre || email.split("@")[0], tipo: "coach" } }
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setMsg("Revisá tu email para confirmar tu cuenta.");
  };

  const handleForgot = async () => {
    if (!email) { setError("Ingresá tu email primero"); return; }
    setLoading(true);
    await sb.auth.resetPasswordForEmail(email);
    setLoading(false);
    setMsg("Se envió un link para restablecer tu contraseña.");
  };

  return (
    <div style={{
      minHeight:"100vh", background:"var(--bg)",
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:20
    }}>
      <div style={{width:"100%", maxWidth:400}}>
        {/* Logo */}
        <div style={{display:"flex",flexDirection:"column",alignItems:"center", marginBottom:32}}>
          <LogoHorizontal height={100}/>
          <div style={{fontFamily:"'Bebas Neue'",fontSize:13,color:"var(--muted)",
            letterSpacing:".15em",marginTop:8}}>
            SISTEMA DE GESTIÓN
          </div>
        </div>

        <div style={{
          background:"var(--surface)", border:"1px solid var(--border)",
          borderRadius:16, padding:28
        }}>
          {/* Tabs login/register */}
          <div style={{display:"flex",gap:0,marginBottom:24,
            background:"var(--surface2)",borderRadius:10,padding:4}}>
            {[["login","Ingresar"],["register","Registrarse"]].map(([v,l])=>(
              <button key={v} onClick={()=>{ setMode(v); setError(""); setMsg(""); }}
                style={{flex:1,padding:"8px 0",border:"none",cursor:"pointer",borderRadius:8,
                  fontFamily:"'DM Sans'",fontSize:13,fontWeight:700,transition:"all .2s",
                  background:mode===v?"var(--surface)":"transparent",
                  color:mode===v?"var(--text)":"var(--muted)",
                  boxShadow:mode===v?"0 1px 4px rgba(0,0,0,.3)":"none"}}>
                {l}
              </button>
            ))}
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {mode==="register" && (
              <div className="form-group" style={{marginBottom:0}}>
                <label className="form-label">Nombre completo</label>
                <input className="form-input" value={nombre}
                  onChange={e=>setNombre(e.target.value)}
                  placeholder="Tu nombre"/>
              </div>
            )}

            <div className="form-group" style={{marginBottom:0}}>
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={email}
                onChange={e=>setEmail(e.target.value)}
                placeholder="email@ejemplo.com"
                onKeyDown={e=>e.key==="Enter"&&(mode==="login"?handleLogin():handleRegister())}/>
            </div>

            <div className="form-group" style={{marginBottom:0}}>
              <label className="form-label">Contraseña</label>
              <input className="form-input" type="password" value={password}
                onChange={e=>setPassword(e.target.value)}
                placeholder={mode==="register"?"Mínimo 6 caracteres":"Tu contraseña"}
                onKeyDown={e=>e.key==="Enter"&&(mode==="login"?handleLogin():handleRegister())}/>
            </div>

            {error && (
              <div style={{fontSize:12,color:"var(--red)",background:"rgba(229,57,53,.1)",
                padding:"8px 12px",borderRadius:8,border:"1px solid rgba(229,57,53,.3)"}}>
                {error}
              </div>
            )}
            {msg && (
              <div style={{fontSize:12,color:"var(--green)",background:"rgba(71,232,160,.1)",
                padding:"8px 12px",borderRadius:8,border:"1px solid rgba(71,232,160,.3)"}}>
                {msg}
              </div>
            )}

            <button className="btn btn-gold" onClick={mode==="login"?handleLogin:handleRegister}
              style={{width:"100%",justifyContent:"center",padding:"12px 0",fontSize:14}}>
              {mode==="login" ? "Ingresar" : "Crear cuenta"}
            </button>

            {mode==="login" && (
              <button onClick={handleForgot}
                style={{background:"none",border:"none",color:"var(--muted)",
                  fontSize:12,cursor:"pointer",textAlign:"center",padding:"4px"}}>
                Olvidé mi contraseña
              </button>
            )}
          </div>
        </div>

        <div style={{textAlign:"center",marginTop:16,fontSize:11,color:"var(--muted)"}}>
          Sistema IronLifting © 2026
        </div>


      </div>
    </div>
  );
}

// ── Auth wrapper — carga Supabase JS y maneja sesión ────────────────────────

function CoachApp({ session, profile, onLogout }) {
  // tab puede ser: "atletas" | "normativos" | "calculadora" | "atleta:ID"
  const [tab, setTab] = useState("atletas");
  const [refPanel, setRefPanel] = useState(false);
  const [refPanelWidth, setRefPanelWidth] = useState(420);
  const [liveMesoData, setLiveMesoData] = useState({});
  const onLiveMesoDataCb = useCallback((d) => setLiveMesoData(prev => ({...prev, [d.atletaId]: d})), []);

  const [atletas, setAtletasRaw] = useState(() => load('liftplan_atletas', [
    {id:"demo1",nombre:"Joana Palacios",email:"joana@halterofilia.com",telefono:"5493413666737",fecha_nacimiento:"1998-05-12",notas:"",tipo:"atleta"}
  ]));
  const [mesociclos, setMesociclosRaw] = useState(() => {
    const raw = load('liftplan_mesociclos', []);
    // Strip any nulls left by old drag code
    return raw.map(m => m ? ({
      ...m,
      semanas: (m.semanas||[]).map(s => s ? ({
        ...s,
        turnos: (s.turnos||[]).map(t => t ? ({
          ...t,
          ejercicios: (t.ejercicios||[]).filter(Boolean),
          // Migración: inicializar complementarios si no existen
          complementarios_before: t.complementarios_before || [],
          complementarios_after: t.complementarios_after || []
        }) : t)
      }) : s)
    }) : m);
  });
  const [atletasTabs,    setAtletasTabsRaw]    = useState(() => load('liftplan_atletas_tabs', []));
  const [plantillasTabs, setPlantillasTabsRaw] = useState(() => load('liftplan_plantillas_tabs', []));
  const coachId = session?.user?.id || null;
  const { plantillas, add: addPlantillaRaw, update: updatePlantilla, remove: removePlantilla } = usePlantillas(coachId);

  // ── Refs para sincronización con DB ────────────────────────────────────────
  const prevAtletasRef    = useRef(null); // null = DB aún no inicializada
  const prevMesociclosRef = useRef(null);
  const atletasRef        = useRef(atletas);
  const mesociclosRef     = useRef(mesociclos);
  useEffect(() => { atletasRef.current    = atletas;    }, [atletas]);
  useEffect(() => { mesociclosRef.current = mesociclos; }, [mesociclos]);

  // ── Carga inicial desde Supabase ───────────────────────────────────────────
  useEffect(() => {
    if (!coachId) return;
    (async () => {
      try {
        // Atletas — filtra solo los que tienen app_id (creados por esta app)
        const { data: dbAtletas, error: e1 } = await sb.from('atletas').select('*').eq('coach_id', coachId).exec();
        if (!e1 && dbAtletas) {
          const appAtletas = dbAtletas.filter(r => r.app_id);
          if (appAtletas.length > 0) {
            appAtletas.forEach(r => restoreAtletaPctOverrides(r.app_id, r.pct_overrides));
            const loaded = appAtletas.map(atletaFromDb);
            setAtletasRaw(loaded);
            save('liftplan_atletas', loaded);
            prevAtletasRef.current = loaded;
          } else {
            // DB vacía — migrar localStorage → DB
            const local = load('liftplan_atletas', []);
            if (local.length > 0) {
              await sb.from('atletas').upsert(local.map(a => atletaToDb(a, coachId)), { onConflict: 'app_id' });
            }
            prevAtletasRef.current = atletasRef.current;
          }
        }

        // Mesociclos — filtra solo los que tienen app_id
        const { data: dbMesos, error: e2 } = await sb.from('mesociclos').select('*').eq('coach_id', coachId).exec();
        if (!e2 && dbMesos) {
          const appMesos = dbMesos.filter(r => r.app_id);
          if (appMesos.length > 0) {
            appMesos.forEach(r => restoreMesoOverrides(r.app_id, r.overrides));
            const loaded = appMesos.map(mesoFromDb);
            const cleaned = loaded.map(m => m ? ({
              ...m,
              semanas: (m.semanas||[]).map(s => s ? ({
                ...s,
                turnos: (s.turnos||[]).map(t => t ? ({
                  ...t,
                  ejercicios: (t.ejercicios||[]).filter(Boolean)
                }) : t)
              }) : s)
            }) : m);
            setMesociclosRaw(cleaned);
            save('liftplan_mesociclos', cleaned);
            prevMesociclosRef.current = cleaned;
          } else {
            const local = load('liftplan_mesociclos', []);
            if (local.length > 0) {
              await sb.from('mesociclos').upsert(local.map(m => mesoToDb(m, coachId)), { onConflict: 'app_id' });
            }
            prevMesociclosRef.current = mesociclosRef.current;
          }
        }
      } catch (e) {
        console.warn('DB load failed, usando localStorage:', e);
      } finally {
        if (prevAtletasRef.current    === null) prevAtletasRef.current    = atletasRef.current;
        if (prevMesociclosRef.current === null) prevMesociclosRef.current = mesociclosRef.current;
      }
    })();
  }, [coachId]);

  // ── Sincronizar atletas con DB cuando cambian ──────────────────────────────
  useEffect(() => {
    if (!coachId || prevAtletasRef.current === null) return;
    const prev = prevAtletasRef.current;
    const curr = atletas;
    prevAtletasRef.current = curr;

    const deletedIds = prev.filter(p => !curr.find(a => a.id === p.id)).map(p => p.id);
    const toUpsert   = curr.filter(a => {
      const old = prev.find(p => p.id === a.id);
      return !old || JSON.stringify(old) !== JSON.stringify(a);
    });
    if (deletedIds.length === 0 && toUpsert.length === 0) return;

    (async () => {
      for (const id of deletedIds) {
        await sb.from('atletas').eq('app_id', id).delete().catch(() => {});
      }
      if (toUpsert.length > 0) {
        await sb.from('atletas').upsert(toUpsert.map(a => atletaToDb(a, coachId)), { onConflict: 'app_id' })
          .catch(e => console.warn('DB sync atletas failed:', e));
      }
    })();
  }, [atletas]);

  // ── Sincronizar mesociclos con DB cuando cambian ───────────────────────────
  useEffect(() => {
    if (!coachId || prevMesociclosRef.current === null) return;
    const prev = prevMesociclosRef.current;
    const curr = mesociclos;
    prevMesociclosRef.current = curr;

    const deletedIds = prev.filter(p => !curr.find(m => m.id === p.id)).map(p => p.id);
    const toUpsert   = curr.filter(m => {
      const old = prev.find(p => p.id === m.id);
      return !old || JSON.stringify(old) !== JSON.stringify(m);
    });
    if (deletedIds.length === 0 && toUpsert.length === 0) return;

    (async () => {
      for (const id of deletedIds) {
        await sb.from('mesociclos').eq('app_id', id).delete().catch(() => {});
      }
      if (toUpsert.length > 0) {
        await sb.from('mesociclos').upsert(toUpsert.map(m => mesoToDb(m, coachId)), { onConflict: 'app_id' })
          .catch(e => console.warn('DB sync mesociclos failed:', e));
      }
    })();
  }, [mesociclos]);

  // ── Sincronizar overrides de celdas periódicamente (cada 60s) ─────────────
  useEffect(() => {
    if (!coachId) return;
    const syncOverrides = () => {
      if (prevMesociclosRef.current === null) return;
      const curr = mesociclosRef.current;
      if (curr.length > 0) {
        sb.from('mesociclos').upsert(curr.map(m => mesoToDb(m, coachId)), { onConflict: 'app_id' }).catch(() => {});
      }
      const currAtletas = atletasRef.current;
      if (currAtletas.length > 0) {
        sb.from('atletas').upsert(currAtletas.map(a => atletaToDb(a, coachId)), { onConflict: 'app_id' }).catch(() => {});
      }
    };
    const interval = setInterval(syncOverrides, 60000);
    const onHide = () => { if (document.visibilityState === 'hidden') syncOverrides(); };
    document.addEventListener('visibilitychange', onHide);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onHide); };
  }, [coachId]);

  // Wrappers que persisten automáticamente
  const setAtletas = (val) => {
    setAtletasRaw(val);
    save('liftplan_atletas', typeof val === 'function' ? val([]) : val);
  };
  const setMesociclos = (val) => {
    setMesociclosRaw(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      save('liftplan_mesociclos', next);
      return next;
    });
  };
  const setAtletasTabs = (val) => {
    setAtletasTabsRaw(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      save('liftplan_atletas_tabs', next);
      return next;
    });
  };
  const setPlantillasTabs = (val) => {
    setPlantillasTabsRaw(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      save('liftplan_plantillas_tabs', next);
      return next;
    });
  };
  // addPlantilla: saves + opens tab
  const addPlantilla = (p) => {
    const saved = addPlantillaRaw(p);
    abrirPlantilla(saved || p);
  };

  // setAtletas con soporte de función (para los casos que usan prev =>)
  const setAtletasFn = (val) => {
    setAtletasRaw(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      save('liftplan_atletas', next);
      return next;
    });
  };

  const abrirAtleta = (a) => {
    if (!atletasTabs.includes(a.id)) {
      setAtletasTabs(prev => [...prev, a.id]);
    }
    setTab(`atleta:${a.id}`);
  };

  const cerrarAtleta = (id, e) => {
    e.stopPropagation();
    setAtletasTabs(prev => prev.filter(x => x !== id));
    if (tab === `atleta:${id}`) setTab("atletas");
  };

  const abrirPlantilla = (p) => {
    if (!plantillasTabs.includes(p.id)) {
      setPlantillasTabs(prev => [...prev, p.id]);
    }
    setTab(`plantilla:${p.id}`);
  };
  const cerrarPlantilla = (id, e) => {
    e && e.stopPropagation && e.stopPropagation();
    setPlantillasTabs(prev => prev.filter(x => x !== id));
    if (tab === `plantilla:${id}`) setTab("plantillas");
  };

  const fixedTabs = [
    {id:"atletas",    label:"Atletas"},
    {id:"plantillas", label:"Plantillas"},
    {id:"normativos", label:"Normativos"},
    {id:"calculadora",label:"Tablas"},
  ];

  return (
    <>
      <style>{css}</style>

      <div className="app">
        <nav className="nav">
          <div className="nav-logo"><LogoHorizontal height={44}/></div>
          <div className="nav-tabs">
            {/* Pestañas fijas */}
            {fixedTabs.map(t=>(
              <button key={t.id} className={`nav-tab${tab===t.id?" active":""}`}
                onClick={()=>setTab(t.id)}>
                {t.label}
              </button>
            ))}

            {/* Separador si hay atletas abiertos */}
            {atletasTabs.length > 0 && (
              <div style={{width:1, background:"var(--border)", margin:"12px 6px", flexShrink:0}}/>
            )}

            {/* Una pestaña por cada atleta abierto */}
            {atletasTabs.map(aid => {
              const a = atletas.find(x => x.id === aid);
              if (!a) return null;
              const isActive = tab === `atleta:${aid}`;
              return (
                <div key={aid} style={{display:"flex", alignItems:"center", height:"100%"}}>
                  <button
                    className={`nav-tab${isActive ? " active" : ""}`}
                    style={{paddingRight:6, display:"flex", alignItems:"center", gap:5}}
                    onClick={()=>setTab(`atleta:${aid}`)}>
                    {a.tipo==="asesoria"
                      ? <Briefcase size={13} style={{flexShrink:0, opacity:.8}}/>
                      : <User size={13} style={{flexShrink:0, opacity:.8}}/>}
                    {a.nombre.split(" ")[0]}
                  </button>
                  <button onClick={e=>cerrarAtleta(aid, e)}
                    style={{background:"none",border:"none",cursor:"pointer",
                      color:"var(--muted)",lineHeight:1,padding:"0 6px 0 0",
                      marginLeft:-4,display:"flex",alignItems:"center"}}
                    title="Cerrar pestaña"><X size={11}/></button>
                </div>
              );
            })}

            {/* Separador plantillas */}
            {plantillasTabs.length > 0 && (
              <div style={{width:1,background:"var(--border)",margin:"12px 6px",flexShrink:0}}/>
            )}

            {/* Una pestaña por cada plantilla abierta */}
            {plantillasTabs.map(pid => {
              const p = plantillas.find(x => x.id === pid);
              if (!p) return null;
              const isActive = tab === `plantilla:${pid}`;
              return (
                <div key={pid} style={{display:"flex",alignItems:"center",height:"100%"}}>
                  <button
                    className={`nav-tab${isActive ? " active" : ""}`}
                    style={{paddingRight:6,display:"flex",alignItems:"center",gap:5}}
                    onClick={()=>setTab(`plantilla:${pid}`)}>
                    <Library size={13} style={{flexShrink:0,opacity:.8}}/>
                    {p.nombre.split(" ")[0]}
                  </button>
                  <button onClick={e=>cerrarPlantilla(pid, e)}
                    style={{background:"none",border:"none",cursor:"pointer",
                      color:"var(--muted)",lineHeight:1,padding:"0 6px 0 0",
                      marginLeft:-4,display:"flex",alignItems:"center"}}
                    title="Cerrar pestaña"><X size={11}/></button>
                </div>
              );
            })}
          </div>
          {/* Botón panel referencia */}
          <button onClick={()=>setRefPanel(v=>!v)}
            title="Panel de referencia"
            style={{
              flexShrink:0, marginLeft:8, padding:"0 12px",
              height:36, borderRadius:8, border:"1px solid var(--border)",
              background: refPanel ? "rgba(232,197,71,.15)" : "var(--surface2)",
              color: refPanel ? "var(--gold)" : "var(--muted)",
              cursor:"pointer", fontSize:12, fontWeight:600,
              display:"flex", alignItems:"center", gap:6,
              transition:"all .2s", whiteSpace:"nowrap"
            }}>
            <Copy size={13}/> Ref
          </button>

          {/* Usuario logueado */}
          <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0,marginLeft:8}}>
            <div style={{fontSize:11,color:"var(--muted)",display:"flex",alignItems:"center",
              gap:4,padding:"0 8px",display:"none"}}
              className="nav-user-info">
              {profile?.rol==="superadmin" && <Shield size={11} style={{color:"var(--gold)"}}/>}
              <span style={{maxWidth:100,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {profile?.nombre || session?.user?.email?.split("@")[0]}
              </span>
            </div>
            <button onClick={onLogout} title="Cerrar sesión"
              style={{
                flexShrink:0, padding:"0 10px", height:36,
                borderRadius:8, border:"1px solid var(--border)",
                background:"var(--surface2)", color:"var(--muted)",
                cursor:"pointer", fontSize:12, fontWeight:600,
                display:"flex", alignItems:"center", gap:5,
                transition:"all .2s"
              }}
              onMouseEnter={e=>{e.currentTarget.style.color="var(--red)";e.currentTarget.style.borderColor="var(--red)"}}
              onMouseLeave={e=>{e.currentTarget.style.color="var(--muted)";e.currentTarget.style.borderColor="var(--border)"}}>
              <LogOut size={13}/>
            </button>
          </div>
        </nav>

        {/* Content area — flex row with panel as sidebar on desktop */}
        <div style={{display:"flex", flex:1, minHeight:0, overflow:"hidden"}}>
          <main className="main" style={{flex:1, minWidth:0, overflowY:"auto"}}>
          {/* Pestañas estáticas — siempre montadas */}
          <div style={{display: tab==="atletas" ? "block" : "none"}}>
            <PageAtletas atletas={atletas} setAtletas={setAtletasFn} mesociclos={mesociclos}
              onSelect={abrirAtleta}/>
          </div>
          <div style={{display: tab==="plantillas" ? "block" : "none"}}>
            <PagePlantillas plantillas={plantillas} onAdd={addPlantilla} onUpdate={updatePlantilla} onDelete={removePlantilla} onOpen={abrirPlantilla}/>
          </div>
          <div style={{display: tab==="calculadora" ? "block" : "none"}}>
            <PageCalculadora/>
          </div>
          <div style={{display: tab==="normativos" ? "block" : "none"}}>
            <PageNormativos/>
          </div>

          {/* Pestañas de atletas — montadas mientras estén abiertas */}
          {atletasTabs.map(aid => {
            const a = atletas.find(x => x.id === aid);
            if (!a) return null;
            return (
              <div key={aid} style={{display: tab===`atleta:${aid}` ? "block" : "none"}}>
                <PageAtleta atleta={a} mesociclos={mesociclos} setMesociclos={setMesociclos}
                  addPlantilla={addPlantilla}
                  onLiveMesoData={onLiveMesoDataCb}
                  onBack={()=>{ cerrarAtleta(aid, {stopPropagation:()=>{}}); }}/>
              </div>
            );
          })}

          {/* Pestañas de plantillas — montadas mientras estén abiertas */}
          {plantillasTabs.map(pid => {
            const p = plantillas.find(x => x.id === pid);
            if (!p) return null;
            return (
              <div key={pid} style={{display: tab===`plantilla:${pid}` ? "block" : "none"}}>
                <PagePlantilla plt={p}
                  onUpdate={updated=>updatePlantilla(updated)}
                  onClose={()=>cerrarPlantilla(pid, null)}/>
              </div>
            );
          })}
          </main>

          {refPanel && (
            <PanelReferencia
              atletas={atletas}
              mesociclos={mesociclos}
              plantillas={plantillas}
              liveMesoData={liveMesoData}
              onClose={()=>setRefPanel(false)}
              onWidthChange={setRefPanelWidth}
              isMobile={typeof window!=="undefined" && window.innerWidth<=768}
            />
          )}
        </div>
      </div>

    </>
  );
}

export default function App() {
  const [session,    setSession]    = useState(null);
  const [profile,    setProfile]    = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Check session on mount
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { data: { session } } = await sb.auth.getSession();
        if (mounted) {
          setSession(session);
          if (session?.user?.id) await loadProfile(session.user.id);
          else setAuthLoading(false);
        }
      } catch(e) {
        console.error("Auth init error:", e);
        if (mounted) setAuthLoading(false);
      }
    };

    init();

    const { data: { subscription } } = sb.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        setSession(session);
        if (session?.user?.id) loadProfile(session.user.id);
        else { setProfile(null); setAuthLoading(false); }
      }
    });

    return () => { mounted = false; subscription?.unsubscribe(); };
  }, []);

  const loadProfile = async (userId) => {
    try {
      const { data } = await sb.from("profiles").select("*").eq("id", userId).single();
      setProfile(data);
    } catch(e) {}
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    await sb.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  // Loading
  if (authLoading) {
    return (
      <div style={{minHeight:"100vh",background:"var(--bg)",display:"flex",
        alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
        <style>{`
          :root{--bg:#0a0c10;--surface:#12151c;--surface2:#1a1e27;--surface3:#222732;
          --border:#2a303c;--text:#e8eaf0;--muted:#6b7280;--gold:#e8c547;
          --blue:#64b4e8;--green:#47e8a0;--red:#e85047}
          body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;margin:0}
        `}</style>
        <LogoHorizontal height={60}/>
        <div style={{fontSize:12,color:"var(--muted)",letterSpacing:".1em"}}>CARGANDO...</div>
      </div>
    );
  }

  // Not logged in
  if (!session) {
    return (
      <>
        <style>{`
          :root{--bg:#0a0c10;--surface:#12151c;--surface2:#1a1e27;--surface3:#22273c;
          --border:#2a303c;--text:#e8eaf0;--muted:#6b7280;--gold:#e8c547;
          --blue:#64b4e8;--green:#47e8a0;--red:#e85047}
          body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;margin:0}
          .form-group{display:flex;flex-direction:column;gap:6px;margin-bottom:14px}
          .form-label{font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.07em}
          .form-input{background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:'DM Sans';font-size:13px;padding:9px 12px;outline:none;transition:border .2s;width:100%;box-sizing:border-box}
          .form-input:focus{border-color:var(--gold)}
          .btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;border:none;cursor:pointer;font-family:'DM Sans';font-size:13px;font-weight:600;transition:all .2s}
          .btn-gold{background:var(--gold);color:#0a0c10}
          .btn-ghost{background:var(--surface2);color:var(--text);border:1px solid var(--border)}
          @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;600;700&display=swap');
        `}</style>
        <LoginScreen onAuth={setSession}/>
      </>
    );
  }

  // Logged in — show coach app (for now, all roles see CoachApp; atleta view coming next)
  return <CoachApp session={session} profile={profile} onLogout={handleLogout}/>;
}
