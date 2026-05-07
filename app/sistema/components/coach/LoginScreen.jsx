import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { sb, getCurrentSession } from "../../lib/supabase-client";
import { _authErrorMessage } from "../../lib/auth-storage";
import { toTitleCase } from "../../lib/sanitize";
import { LogoHorizontal } from "../common/Logos";

export function LoginScreen({
  onAuth,
  recoveryMode: initialRecovery = false,
  initialMsg = "",
}) {
  const [mode, setMode] = useState(initialRecovery ? "recovery" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState("atleta");
  const [codigoCoach, setCodigoCoach] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(initialMsg);
  const [logs, setLogs] = useState([]);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState(0);

  const log = (txt, type = "info") => {
    const ts = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev.slice(-15), { ts, txt, type }]);
  };

  const normalizeEmail = (e) => e.trim().toLowerCase();

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Completá email y contraseña");
      return;
    }
    // Client-side rate limit
    const now = Date.now();
    if (lockoutUntil > now) {
      const secs = Math.ceil((lockoutUntil - now) / 1000);
      setError(`Demasiados intentos. Esperá ${secs}s.`);
      return;
    }
    setLoading(true);
    setError("");
    const { data, error } = await sb.auth.signInWithPassword({
      email: normalizeEmail(email),
      password,
    });
    setLoading(false);
    if (error) {
      const attempts = loginAttempts + 1;
      setLoginAttempts(attempts);
      if (attempts >= 5) {
        setLockoutUntil(Date.now() + 30000);
        setLoginAttempts(0);
        setError("Demasiados intentos fallidos. Esperá 30 segundos.");
      } else {
        setError(error.message);
      }
      return;
    }
    setLoginAttempts(0);
    onAuth(data.session);
  };

  const handleRegister = async () => {
    if (!email || !password) {
      setError("Completá email y contraseña");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setLoading(true);
    setError("");

    // Si es coach, verificar código de autorización
    if (rol === "coach") {
      if (!codigoCoach.trim()) {
        setLoading(false);
        setError(
          "Ingresá el código de autorización para registrarte como coach.",
        );
        return;
      }
      try {
        const { data: valid, error: rpcErr } = await sb.rpc(
          "verify_coach_code",
          { input_code: codigoCoach.trim() },
        );
        if (rpcErr || !valid) {
          setLoading(false);
          setError(
            "Código de autorización inválido. Contactá al administrador.",
          );
          return;
        }
      } catch {
        setLoading(false);
        setError("No se pudo verificar el código. Intentá más tarde.");
        return;
      }
    }

    const normalizedEmail = normalizeEmail(email);
    const registeredNombre = toTitleCase(
      nombre || normalizedEmail.split("@")[0],
    );
    const { data, error } = await sb.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: { nombre: registeredNombre, rol },
        emailRedirectTo: `${window.location.origin}/sistema`,
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      setMsg("");
      return;
    }
    // Notify admin of new registration (fire-and-forget)
    fetch("/api/notify-registration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: normalizedEmail,
        nombre: registeredNombre,
        tipo: rol,
      }),
    }).catch(() => {});
    setError("");
    setMsg(
      rol === "coach"
        ? "Revisá tu email para confirmar tu cuenta de coach."
        : "Revisá tu email para confirmar tu cuenta.",
    );
  };

  const handleForgot = async () => {
    if (!email) {
      setError("Ingresá tu email primero");
      return;
    }
    if (loading) return;
    setLoading(true);
    setError("");
    const { error } = await sb.auth.resetPasswordForEmail(
      normalizeEmail(email),
    );
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setMsg("Se envió un link para restablecer tu contraseña.");
  };

  const handleRecovery = async () => {
    if (!newPassword) {
      setError("Ingresá tu nueva contraseña");
      return;
    }
    if (newPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const r = await _fetchWithTimeout(`${SUPA_URL}/auth/v1/user`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPA_ANON,
          Authorization: `bearer ${getCurrentSession()?.access_token}`,
        },
        body: JSON.stringify({ password: newPassword }),
      });
      const { data, raw } = await _readResponseSafe(r);
      setLoading(false);
      if (!r.ok) {
        setError(
          _authErrorMessage(
            r.status,
            data,
            raw,
            "No se pudo cambiar la contraseña.",
          ),
        );
        return;
      }
      setMsg("Contraseña actualizada. Ya podés ingresar.");
      setMode("login");
      setNewPassword("");
    } catch {
      setLoading(false);
      setError("No se pudo conectar con Supabase.");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Logo */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: 32,
          }}
        >
          <LogoHorizontal height={100} />
          <div
            style={{
              fontFamily: "'Bebas Neue'",
              fontSize: 13,
              color: "var(--muted)",
              letterSpacing: ".15em",
              marginTop: 8,
            }}
          >
            SISTEMA DE GESTIÓN
          </div>
        </div>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: 28,
          }}
        >
          {/* Tabs login/register — hide in recovery mode */}
          {mode !== "recovery" && (
            <div
              style={{
                display: "flex",
                gap: 0,
                marginBottom: 24,
                background: "var(--surface2)",
                borderRadius: 10,
                padding: 4,
              }}
            >
              {[
                ["login", "Ingresar"],
                ["register", "Registrarse"],
              ].map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => {
                    setMode(v);
                    setError("");
                    setMsg("");
                    setPassword("");
                    setShowPassword(false);
                    setRol("atleta");
                    setCodigoCoach("");
                  }}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    border: "none",
                    cursor: "pointer",
                    borderRadius: 8,
                    fontFamily: "'DM Sans'",
                    fontSize: 13,
                    fontWeight: 700,
                    transition: "all .2s",
                    background: mode === v ? "var(--surface)" : "transparent",
                    color: mode === v ? "var(--text)" : "var(--muted)",
                    boxShadow: mode === v ? "0 1px 4px rgba(0,0,0,.3)" : "none",
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (mode === "recovery") handleRecovery();
              else if (mode === "login") handleLogin();
              else handleRegister();
            }}
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            {mode === "register" && (
              <>
                {/* Selector de rol */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Tipo de cuenta</label>
                  <div
                    style={{
                      display: "flex",
                      gap: 0,
                      background: "var(--surface2)",
                      borderRadius: 10,
                      padding: 4,
                    }}
                  >
                    {[
                      ["atleta", "Atleta"],
                      ["coach", "Coach"],
                    ].map(([v, l]) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => {
                          setRol(v);
                          setError("");
                        }}
                        style={{
                          flex: 1,
                          padding: "8px 0",
                          border: "none",
                          cursor: "pointer",
                          borderRadius: 8,
                          fontFamily: "'DM Sans'",
                          fontSize: 13,
                          fontWeight: 700,
                          transition: "all .2s",
                          background:
                            rol === v ? "var(--surface)" : "transparent",
                          color:
                            rol === v
                              ? v === "coach"
                                ? "var(--gold)"
                                : "var(--green)"
                              : "var(--muted)",
                          boxShadow:
                            rol === v ? "0 1px 4px rgba(0,0,0,.3)" : "none",
                        }}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--muted)",
                      marginTop: 4,
                    }}
                  >
                    {rol === "coach"
                      ? "Requiere código de autorización del administrador"
                      : "Cuenta gratuita para atletas"}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Nombre completo</label>
                  <input
                    name="field_91"
                    className="form-input"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Tu nombre"
                  />
                </div>

                {/* Código de autorización para coaches */}
                {rol === "coach" && (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Código de autorización</label>
                    <input
                      name="field_94"
                      className="form-input"
                      value={codigoCoach}
                      onChange={(e) => setCodigoCoach(e.target.value)}
                      placeholder="Ingresá el código proporcionado"
                      style={{
                        letterSpacing: ".15em",
                        textTransform: "uppercase",
                      }}
                    />
                  </div>
                )}
              </>
            )}

            {mode === "recovery" ? (
              <>
                <div
                  style={{
                    fontSize: 14,
                    color: "var(--text)",
                    textAlign: "center",
                    marginBottom: 4,
                  }}
                >
                  Ingresá tu nueva contraseña
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Nueva contraseña</label>
                  <div style={{ position: "relative" }}>
                    <input
                      name="field_95"
                      className="form-input"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      style={{ paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      style={{
                        position: "absolute",
                        right: 8,
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: "var(--muted)",
                        cursor: "pointer",
                        fontSize: 16,
                        padding: 4,
                        lineHeight: 1,
                      }}
                      tabIndex={-1}
                      aria-label={
                        showPassword
                          ? "Ocultar contraseña"
                          : "Mostrar contraseña"
                      }
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Email</label>
                  <input
                    name="field_92"
                    className="form-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@ejemplo.com"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Contraseña</label>
                  <div style={{ position: "relative" }}>
                    <input
                      name="field_93"
                      className="form-input"
                      type={showPassword ? "text" : "password"}
                      autoComplete={
                        mode === "register"
                          ? "new-password"
                          : "current-password"
                      }
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={
                        mode === "register"
                          ? "Mínimo 6 caracteres"
                          : "Tu contraseña"
                      }
                      style={{ paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      style={{
                        position: "absolute",
                        right: 8,
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: "var(--muted)",
                        cursor: "pointer",
                        fontSize: 16,
                        padding: 4,
                        lineHeight: 1,
                      }}
                      tabIndex={-1}
                      aria-label={
                        showPassword
                          ? "Ocultar contraseña"
                          : "Mostrar contraseña"
                      }
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {error && (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--red)",
                  background: "rgba(229,57,53,.1)",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid rgba(229,57,53,.3)",
                }}
              >
                {error}
              </div>
            )}
            {msg && (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--green)",
                  background: "rgba(71,232,160,.1)",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid rgba(71,232,160,.3)",
                }}
              >
                {msg}
              </div>
            )}

            <button
              className="btn btn-gold"
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                justifyContent: "center",
                padding: "12px 0",
                fontSize: 14,
                opacity: loading ? 0.5 : 1,
                pointerEvents: loading ? "none" : "auto",
              }}
            >
              {loading
                ? "Procesando…"
                : mode === "recovery"
                  ? "Guardar nueva contraseña"
                  : mode === "login"
                    ? "Ingresar"
                    : rol === "coach"
                      ? "Crear cuenta Coach"
                      : "Crear cuenta Atleta"}
            </button>

            {mode === "login" && (
              <button
                type="button"
                onClick={handleForgot}
                disabled={loading}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--muted)",
                  fontSize: 12,
                  cursor: loading ? "default" : "pointer",
                  textAlign: "center",
                  padding: "4px",
                  opacity: loading ? 0.5 : 1,
                }}
              >
                Olvidé mi contraseña
              </button>
            )}
          </form>
        </div>

        <div
          style={{
            textAlign: "center",
            marginTop: 16,
            fontSize: 11,
            color: "var(--muted)",
          }}
        >
          Sistema IronLifting © 2026 · v{APP_VERSION}
        </div>
      </div>
    </div>
  );
}
