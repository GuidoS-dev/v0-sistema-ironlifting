import { sanitizeRequestBody } from "./sanitize";
import {
  loadSession,
  saveSession,
  clearSession,
  _emitAuth,
  onAuthChange,
  _authErrorMessage,
  _runtimeErrorMessage,
} from "./auth-storage";

// ═══════════════════════════════════════════════════════════════
// SUPABASE — Pure fetch client (no CDN needed)
// ═══════════════════════════════════════════════════════════════

export const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const SUPA_CONFIG_OK = Boolean(SUPA_URL && SUPA_ANON);
export const SUPA_TIMEOUT_MS = 10000;

// Current session ref (mutable module state)
let _session = loadSession();
export function getCurrentSession() {
  return _session;
}

export async function _readResponseSafe(r) {
  const raw = await r.text();
  if (!raw) return { data: null, raw: "" };
  try {
    return { data: JSON.parse(raw), raw };
  } catch {
    return { data: null, raw };
  }
}

export async function _fetchWithTimeout(
  url,
  options = {},
  timeoutMs = SUPA_TIMEOUT_MS,
) {
  if (!SUPA_CONFIG_OK) {
    throw new Error("SUPABASE_CONFIG_MISSING");
  }

  // Call Supabase directly — avoids doubling bandwidth through the proxy
  const requestUrl = url;

  // keepalive mode: skip abort controller, let browser finish request after page unload
  if (options.keepalive) {
    const nextOptions = { ...options };
    const headers = new Headers(options?.headers || {});
    const contentType = headers.get("content-type") || "";
    if (typeof nextOptions.body === "string") {
      nextOptions.body = sanitizeRequestBody(nextOptions.body, contentType);
    }
    return await fetch(requestUrl, nextOptions);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const nextOptions = { ...options, signal: controller.signal };
    const headers = new Headers(options?.headers || {});
    const contentType = headers.get("content-type") || "";

    if (typeof nextOptions.body === "string") {
      nextOptions.body = sanitizeRequestBody(nextOptions.body, contentType);
    }

    return await fetch(requestUrl, nextOptions);
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("SUPABASE_TIMEOUT");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Token refresh helper — with dedup and cooldown to avoid POST loops
let _refreshPromise = null;
let _refreshCooldownUntil = 0;

async function _refreshToken(refresh_token) {
  try {
    const r = await _fetchWithTimeout(
      `${SUPA_URL}/auth/v1/token?grant_type=refresh_token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPA_ANON },
        body: JSON.stringify({ refresh_token }),
      },
    );
    if (!r.ok) {
      // Don't retry for 30s after a failed refresh
      _refreshCooldownUntil = Date.now() + 30000;
      _session = null;
      clearSession();
      _emitAuth("SIGNED_OUT", null);
      return null;
    }
    const { data } = await _readResponseSafe(r);
    if (!data?.access_token) {
      _refreshCooldownUntil = Date.now() + 30000;
      _session = null;
      clearSession();
      _emitAuth("SIGNED_OUT", null);
      return null;
    }
    const s = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      user: data.user,
      expires_at: Date.now() + (data.expires_in || 3600) * 1000,
    };
    _session = s;
    saveSession(s);
    _emitAuth("TOKEN_REFRESHED", s);
    return s;
  } catch {
    _refreshCooldownUntil = Date.now() + 30000;
    _session = null;
    clearSession();
    _emitAuth("SIGNED_OUT", null);
    return null;
  }
}

export async function _getValidSession() {
  if (!_session) return null;
  // Refresh if expiring in < 60s
  if (_session.expires_at && Date.now() > _session.expires_at - 60000) {
    // Cooldown: skip refresh if we recently failed
    if (Date.now() < _refreshCooldownUntil) return null;
    // Dedup: reuse in-flight refresh promise
    if (!_refreshPromise) {
      _refreshPromise = _refreshToken(_session.refresh_token).finally(() => {
        _refreshPromise = null;
      });
    }
    return await _refreshPromise;
  }
  return _session;
}

// Pure fetch Supabase client
export const sb = {
  auth: {
    getSession: async () => {
      const s = await _getValidSession();
      return { data: { session: s } };
    },
    onAuthStateChange: (fn) => {
      const sub = onAuthChange(fn);
      return { data: { subscription: sub } };
    },
    signInWithPassword: async ({ email, password }) => {
      try {
        const r = await _fetchWithTimeout(
          `${SUPA_URL}/auth/v1/token?grant_type=password`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", apikey: SUPA_ANON },
            body: JSON.stringify({ email, password }),
          },
        );
        const { data, raw } = await _readResponseSafe(r);
        if (!r.ok)
          return {
            data: null,
            error: {
              message: _authErrorMessage(
                r.status,
                data,
                raw,
                "Error al ingresar",
              ),
            },
          };
        if (!data?.access_token) {
          return {
            data: null,
            error: { message: "Respuesta inválida de autenticación." },
          };
        }
        const session = {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          user: data.user,
          expires_at: Date.now() + (data.expires_in || 3600) * 1000,
        };
        _session = session;
        saveSession(session);
        _emitAuth("SIGNED_IN", session);
        return { data: { session }, error: null };
      } catch (error) {
        return {
          data: null,
          error: {
            message: _runtimeErrorMessage(
              error,
              "No se pudo conectar con Supabase.",
            ),
          },
        };
      }
    },
    signUp: async ({ email, password, options }) => {
      try {
        const _signupUrl = options?.emailRedirectTo
          ? `${SUPA_URL}/auth/v1/signup?redirect_to=${encodeURIComponent(options.emailRedirectTo)}`
          : `${SUPA_URL}/auth/v1/signup`;
        const r = await _fetchWithTimeout(_signupUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: SUPA_ANON },
          body: JSON.stringify({ email, password, data: options?.data || {} }),
        });
        const { data, raw } = await _readResponseSafe(r);
        if (!r.ok)
          return {
            data: null,
            error: {
              message: _authErrorMessage(
                r.status,
                data,
                raw,
                "Error al registrar",
              ),
            },
          };
        return { data, error: null };
      } catch (error) {
        return {
          data: null,
          error: {
            message: _runtimeErrorMessage(
              error,
              "No se pudo conectar con Supabase.",
            ),
          },
        };
      }
    },
    signOut: async () => {
      const s = await _getValidSession();
      if (s) {
        await _fetchWithTimeout(`${SUPA_URL}/auth/v1/logout`, {
          method: "POST",
          headers: {
            apikey: SUPA_ANON,
            Authorization: `Bearer ${s.access_token}`,
          },
        }).catch(() => {});
      }
      _session = null;
      clearSession();
      _emitAuth("SIGNED_OUT", null);
      return { error: null };
    },
    resetPasswordForEmail: async (email) => {
      try {
        const r = await _fetchWithTimeout(`${SUPA_URL}/auth/v1/recover`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: SUPA_ANON },
          body: JSON.stringify({ email }),
        });
        const { data, raw } = await _readResponseSafe(r);
        if (!r.ok) {
          return {
            error: {
              message: _authErrorMessage(
                r.status,
                data,
                raw,
                "No se pudo enviar el email de recuperación.",
              ),
            },
          };
        }
        return { error: null };
      } catch (error) {
        return {
          error: {
            message: _runtimeErrorMessage(
              error,
              "No se pudo conectar con Supabase.",
            ),
          },
        };
      }
    },
  },

  // Handle email confirmation / password-recovery callback from URL hash or PKCE query params
  _handleEmailCallback: async () => {
    if (typeof window === "undefined") return null;

    // --- PKCE flow: Supabase redirects with ?token_hash=...&type=signup ---
    const searchParams = new URLSearchParams(window.location.search);
    const tokenHash = searchParams.get("token_hash");
    const pkceType = searchParams.get("type"); // "signup", "recovery", "magiclink"
    if (tokenHash && pkceType) {
      try {
        const r = await _fetchWithTimeout(`${SUPA_URL}/auth/v1/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: SUPA_ANON },
          body: JSON.stringify({ token_hash: tokenHash, type: pkceType }),
        });
        const { data } = await _readResponseSafe(r);
        // Clean URL
        window.history.replaceState(null, "", window.location.pathname);
        if (!r.ok || !data?.access_token) {
          // Verification failed but we still know the type — return marker so caller can show message
          return { _callbackType: pkceType, _verifyFailed: true };
        }
        const session = {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          token_type: data.token_type || "bearer",
          user: data.user,
          _callbackType: pkceType,
        };
        _session = session;
        saveSession(session);
        _emitAuth("SIGNED_IN", session);
        return session;
      } catch {
        window.history.replaceState(null, "", window.location.pathname);
        return { _callbackType: pkceType, _verifyFailed: true };
      }
    }

    // --- Implicit flow: hash fragment with access_token ---
    const hash = window.location.hash;
    if (!hash || !hash.includes("access_token")) return null;
    try {
      const params = new URLSearchParams(hash.substring(1));
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      const token_type = params.get("token_type");
      const type = params.get("type"); // "signup", "recovery", "magiclink"
      if (!access_token) return null;
      // Fetch user info with the token
      const r = await _fetchWithTimeout(`${SUPA_URL}/auth/v1/user`, {
        method: "GET",
        headers: {
          apikey: SUPA_ANON,
          Authorization: `${token_type || "bearer"} ${access_token}`,
        },
      });
      const { data } = await _readResponseSafe(r);
      if (!r.ok || !data?.id) return null;
      const session = {
        access_token,
        refresh_token,
        token_type: token_type || "bearer",
        user: data,
        _callbackType: type || null,
      };
      _session = session;
      saveSession(session);
      // Clear hash from URL without reload
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
      _emitAuth("SIGNED_IN", session);
      return session;
    } catch {
      return null;
    }
  },

  // PostgREST query builder
  from: (table) => {
    const _q = {
      table,
      filters: [],
      select: "*",
      single_: false,
      limit_: null,
      order_: null,
    };
    const _headers = async () => {
      const s = await _getValidSession();
      const h = { "Content-Type": "application/json", apikey: SUPA_ANON };
      if (s) h["Authorization"] = `Bearer ${s.access_token}`;
      return h;
    };
    const _url = (extra = "") => `${SUPA_URL}/rest/v1/${_q.table}${extra}`;
    const _params = () => {
      const p = new URLSearchParams();
      p.set("select", _q.select);
      _q.filters.forEach((f) => p.append(f.col, f.val));
      if (_q.limit_) p.set("limit", _q.limit_);
      if (_q.order_) p.set("order", _q.order_);
      return p.toString();
    };
    const builder = {
      select: (s = "*") => {
        _q.select = s;
        return builder;
      },
      eq: (col, val) => {
        _q.filters.push({ col, val: `eq.${val}` });
        return builder;
      },
      gt: (col, val) => {
        _q.filters.push({ col, val: `gt.${val}` });
        return builder;
      },
      single: () => {
        _q.single_ = true;
        return builder;
      },
      limit: (n) => {
        _q.limit_ = n;
        return builder;
      },
      order: (col, { ascending: asc = true } = {}) => {
        _q.order_ = `${col}.${asc ? "asc" : "desc"}`;
        return builder;
      },
      exec: async () => {
        const h = await _headers();
        if (_q.single_) h["Accept"] = "application/vnd.pgrst.object+json";
        const r = await _fetchWithTimeout(`${_url()}?${_params()}`, {
          headers: h,
        });
        const data = await r.json();
        return r.ok ? { data, error: null } : { data: null, error: data };
      },
      then: function (resolve, reject) {
        return this.exec().then(resolve, reject);
      },
      insert: async (rows) => {
        const h = await _headers();
        h["Prefer"] = "return=representation";
        const r = await _fetchWithTimeout(_url(), {
          method: "POST",
          headers: h,
          body: JSON.stringify(rows),
        });
        const data = await r.json();
        return r.ok ? { data, error: null } : { data: null, error: data };
      },
      upsert: async (rows, { onConflict } = {}) => {
        const h = await _headers();
        h["Prefer"] = "return=representation,resolution=merge-duplicates";
        const extra = onConflict ? `?on_conflict=${onConflict}` : "";
        const r = await _fetchWithTimeout(`${_url()}${extra}`, {
          method: "POST",
          headers: h,
          body: JSON.stringify(rows),
        });
        const data = await r.json();
        return r.ok ? { data, error: null } : { data: null, error: data };
      },
      update: async (vals) => {
        const h = await _headers();
        h["Prefer"] = "return=representation";
        const p = new URLSearchParams();
        _q.filters.forEach((f) => p.append(f.col, f.val));
        const r = await _fetchWithTimeout(`${_url()}?${p}`, {
          method: "PATCH",
          headers: h,
          body: JSON.stringify(vals),
        });
        const data = await r.json();
        return r.ok ? { data, error: null } : { data: null, error: data };
      },
      delete: async () => {
        const h = await _headers();
        delete h["Content-Type"];
        h["Prefer"] = "return=minimal";
        const p = new URLSearchParams();
        _q.filters.forEach((f) => p.append(f.col, f.val));
        const r = await _fetchWithTimeout(`${_url()}?${p}`, {
          method: "DELETE",
          headers: h,
        });
        if (r.ok) return { data: null, error: null };
        const errBody = await r.json().catch(() => ({}));
        console.warn(`DELETE ${_q.table} failed (${r.status}):`, errBody);
        return { data: null, error: errBody };
      },
    };
    return builder;
  },

  // RPC call (PostgREST function invocation)
  rpc: async (fnName, params = {}) => {
    try {
      const s = await _getValidSession();
      const h = { "Content-Type": "application/json", apikey: SUPA_ANON };
      if (s) h["Authorization"] = `Bearer ${s.access_token}`;
      const r = await _fetchWithTimeout(`${SUPA_URL}/rest/v1/rpc/${fnName}`, {
        method: "POST",
        headers: h,
        body: JSON.stringify(params),
      });
      const data = await r.json().catch(() => null);
      return r.ok ? { data, error: null } : { data: null, error: data };
    } catch (error) {
      return { data: null, error: { message: error?.message || "RPC failed" } };
    }
  },
};

export function getSupabase() {
  return sb;
}
