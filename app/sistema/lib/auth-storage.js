// Storage keys for session persistence
export const SESSION_KEY = "sb_session";
export const PROFILE_KEY_PREFIX = "sb_profile_";

export function saveSession(s) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {}
}
export function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}
export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {}
}
export function saveProfileLocal(p) {
  try {
    if (p?.id)
      localStorage.setItem(PROFILE_KEY_PREFIX + p.id, JSON.stringify(p));
  } catch {}
}
export function loadProfileLocal(userId) {
  try {
    if (!userId) return null;
    return JSON.parse(localStorage.getItem(PROFILE_KEY_PREFIX + userId));
  } catch {
    return null;
  }
}
export function clearProfileLocal(userId) {
  try {
    if (userId) localStorage.removeItem(PROFILE_KEY_PREFIX + userId);
  } catch {}
}
// Auth listeners
export const _authListeners = [];
export function onAuthChange(fn) {
  _authListeners.push(fn);
  return {
    unsubscribe: () => {
      const i = _authListeners.indexOf(fn);
      if (i > -1) _authListeners.splice(i, 1);
    },
  };
}
export function _emitAuth(event, session) {
  _authListeners.forEach((fn) => fn(event, session));
}
// Map common Supabase GoTrue messages → user-friendly Spanish
export const _authMessageMap = {
  "invalid login credentials":
    "Email o contraseña incorrectos. Revisá los datos e intentá de nuevo.",
  "email not confirmed":
    "Tu cuenta aún no fue confirmada. Revisá tu casilla de email (incluyendo spam).",
  "user not found": "No existe una cuenta con ese email.",
  "user already registered":
    "Ya existe una cuenta con ese email. Intentá iniciar sesión.",
  "signup is disabled": "El registro de nuevos usuarios está deshabilitado.",
  "email rate limit exceeded":
    "Demasiados intentos. Esperá unos minutos antes de volver a intentar.",
  over_email_send_rate_limit:
    "Demasiados emails enviados. Esperá unos minutos.",
};

export function _authErrorMessage(status, data, raw, fallback) {
  if (status == null) {
    return fallback;
  }
  if (status === 504 || /upstream\s+request\s+timeout/i.test(raw || "")) {
    return "Supabase no responde (504). Intentá de nuevo en 1-2 minutos.";
  }
  // Try to match a known Supabase message to a friendly Spanish translation
  const supaMsg = (
    data?.error_description ||
    data?.msg ||
    data?.message ||
    ""
  ).toLowerCase();
  const errorCode = (data?.error_code || data?.code || "").toLowerCase();
  const friendly = _authMessageMap[supaMsg] || _authMessageMap[errorCode];
  if (friendly) return friendly;
  // If the message is in English and not mapped, return the fallback instead
  if (supaMsg && /^[a-z0-9\s_.,!-]+$/i.test(supaMsg)) return fallback;
  return supaMsg || fallback;
}

export function _runtimeErrorMessage(error, fallback) {
  if (error?.message === "SUPABASE_CONFIG_MISSING") {
    return "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en el deploy.";
  }
  if (error?.message === "SUPABASE_TIMEOUT") {
    return "Supabase tardó demasiado en responder. Intentá nuevamente.";
  }
  return fallback;
}
