import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  SESSION_KEY,
  PROFILE_KEY_PREFIX,
  saveSession,
  loadSession,
  clearSession,
  saveProfileLocal,
  loadProfileLocal,
  clearProfileLocal,
  _authListeners,
  onAuthChange,
  _emitAuth,
  _authErrorMessage,
  _runtimeErrorMessage,
} from "@/app/sistema/lib/auth-storage";

beforeEach(() => {
  localStorage.clear();
  // _authListeners is module-shared; clear between tests
  _authListeners.length = 0;
});

describe("session storage", () => {
  it("usa la key sb_session", () => {
    expect(SESSION_KEY).toBe("sb_session");
  });

  it("save/load round-trip", () => {
    const s = { access_token: "abc", refresh_token: "xyz", expires_at: 1234 };
    saveSession(s);
    expect(loadSession()).toEqual(s);
  });

  it("loadSession retorna null si no hay sesión", () => {
    expect(loadSession()).toBeNull();
  });

  it("loadSession retorna null si la key tiene JSON inválido", () => {
    localStorage.setItem(SESSION_KEY, "{not-json");
    expect(loadSession()).toBeNull();
  });

  it("clearSession remueve la key", () => {
    saveSession({ access_token: "a" });
    clearSession();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });
});

describe("profile storage", () => {
  it("usa el prefijo sb_profile_", () => {
    expect(PROFILE_KEY_PREFIX).toBe("sb_profile_");
  });

  it("guarda y lee perfil por id", () => {
    const p = { id: "u1", email: "a@b.com", role: "coach" };
    saveProfileLocal(p);
    expect(loadProfileLocal("u1")).toEqual(p);
  });

  it("saveProfileLocal ignora perfiles sin id", () => {
    saveProfileLocal({ email: "x@y.com" });
    expect(localStorage.length).toBe(0);
  });

  it("loadProfileLocal retorna null sin userId", () => {
    expect(loadProfileLocal(null)).toBeNull();
    expect(loadProfileLocal(undefined)).toBeNull();
  });

  it("clearProfileLocal remueve la key del usuario", () => {
    saveProfileLocal({ id: "u1", email: "a@b.com" });
    clearProfileLocal("u1");
    expect(loadProfileLocal("u1")).toBeNull();
  });
});

describe("onAuthChange / _emitAuth", () => {
  it("llama a los listeners con event y session", () => {
    const fn = vi.fn();
    onAuthChange(fn);
    _emitAuth("SIGNED_IN", { access_token: "a" });
    expect(fn).toHaveBeenCalledWith("SIGNED_IN", { access_token: "a" });
  });

  it("unsubscribe deja de recibir eventos", () => {
    const fn = vi.fn();
    const sub = onAuthChange(fn);
    sub.unsubscribe();
    _emitAuth("SIGNED_OUT", null);
    expect(fn).not.toHaveBeenCalled();
  });

  it("soporta múltiples listeners", () => {
    const a = vi.fn();
    const b = vi.fn();
    onAuthChange(a);
    onAuthChange(b);
    _emitAuth("REFRESH", null);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });
});

describe("_authErrorMessage", () => {
  it("retorna fallback cuando status es null", () => {
    expect(_authErrorMessage(null, null, "", "fb")).toBe("fb");
  });

  it("usa mensaje específico para 504", () => {
    expect(_authErrorMessage(504, null, "", "fb")).toMatch(/504/);
  });

  it("usa mensaje específico ante upstream timeout en raw", () => {
    expect(
      _authErrorMessage(500, null, "upstream request timeout", "fb"),
    ).toMatch(/504/);
  });

  it("traduce 'invalid login credentials'", () => {
    const msg = _authErrorMessage(
      400,
      { msg: "Invalid login credentials" },
      "",
      "fb",
    );
    expect(msg).toMatch(/incorrectos/i);
  });

  it("traduce 'email not confirmed'", () => {
    const msg = _authErrorMessage(
      400,
      { error_description: "Email not confirmed" },
      "",
      "fb",
    );
    expect(msg).toMatch(/confirmada/i);
  });

  it("retorna fallback si el mensaje en inglés no está mapeado", () => {
    const msg = _authErrorMessage(
      400,
      { message: "something went wrong" },
      "",
      "FB",
    );
    expect(msg).toBe("FB");
  });
});

describe("_runtimeErrorMessage", () => {
  it("traduce SUPABASE_CONFIG_MISSING", () => {
    expect(
      _runtimeErrorMessage(new Error("SUPABASE_CONFIG_MISSING"), "fb"),
    ).toMatch(/NEXT_PUBLIC_SUPABASE/);
  });

  it("traduce SUPABASE_TIMEOUT", () => {
    expect(_runtimeErrorMessage(new Error("SUPABASE_TIMEOUT"), "fb")).toMatch(
      /tardó/i,
    );
  });

  it("retorna fallback para otros errores", () => {
    expect(_runtimeErrorMessage(new Error("other"), "fb")).toBe("fb");
    expect(_runtimeErrorMessage(null, "fb")).toBe("fb");
  });
});
