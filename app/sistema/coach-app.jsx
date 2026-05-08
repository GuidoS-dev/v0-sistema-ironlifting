import { useState, useEffect, useCallback } from "react";
import { sb } from "./lib/supabase-client";
import {
  loadSession,
  loadProfileLocal,
  saveProfileLocal,
  clearProfileLocal,
  clearSession,
} from "./lib/auth-storage";
import { LogoHorizontal } from "./components/common/Logos";
import { LoginScreen } from "./components/coach/LoginScreen";
import { CoachApp } from "./components/coach/CoachApp";
import { AtletaPanel } from "./components/coach/AtletaPanel";
import { APP_VERSION } from "./data/app-version";
import "./styles/coach-app.css";

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState("");

  const withTimeout = useCallback((promise, ms) => {
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error("AUTH_TIMEOUT")), ms);
      }),
    ]);
  }, []);

  // Check session on mount
  useEffect(() => {
    let mounted = true;
    const authWatchdog = setTimeout(() => {
      if (mounted && !session) {
        // Watchdog: si Supabase no respondió, intentar modo offline
        const cached = loadSession();
        if (cached?.user?.id) {
          console.warn(
            "Auth timeout — entrando en modo offline con sesión cacheada",
          );
          setSession(cached);
          const cachedProfile = loadProfileLocal(cached.user.id);
          if (cachedProfile) setProfile(cachedProfile);
        }
        setAuthLoading(false);
      }
    }, 8000);

    const init = async () => {
      try {
        // First, check if this is a callback from email confirmation/recovery
        const callbackSession = await sb._handleEmailCallback();
        if (callbackSession && mounted) {
          if (callbackSession._callbackType === "recovery") {
            if (callbackSession._verifyFailed) {
              // Recovery link expired or already used
              setConfirmMsg("");
              setAuthLoading(false);
              return;
            }
            // Password recovery — show reset form instead of logging in
            setRecoveryMode(true);
            setSession(callbackSession);
            setAuthLoading(false);
            return;
          }
          if (callbackSession._callbackType === "signup") {
            // Email confirmed — show login with success message
            setConfirmMsg("¡Cuenta confirmada! Ya podés iniciar sesión.");
            setAuthLoading(false);
            return;
          }
          // Other callback types (magiclink, etc.) — if verify failed, just show login
          if (callbackSession._verifyFailed) {
            setAuthLoading(false);
            return;
          }
          setSession(callbackSession);
          if (callbackSession.user?.id) {
            void loadProfile(callbackSession.user.id);
          } else setAuthLoading(false);
          return;
        }

        const sessionResult = await withTimeout(sb.auth.getSession(), 6000);
        const session = sessionResult?.data?.session || null;
        if (mounted) {
          setSession(session);
          if (session?.user?.id) {
            // Load profile without blocking initial auth UI transition.
            void loadProfile(session.user.id);
          } else setAuthLoading(false);
        }
      } catch (e) {
        if (e?.message === "SUPABASE_CONFIG_MISSING") {
          console.warn(
            "Supabase no configurado en deploy: faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY.",
          );
        }
        // Supabase no disponible — intentar modo offline
        if (mounted) {
          const cached = loadSession();
          if (cached?.user?.id) {
            console.warn(
              "Supabase no disponible — modo offline con sesión cacheada",
            );
            setSession(cached);
            const cachedProfile = loadProfileLocal(cached.user.id);
            if (cachedProfile) setProfile(cachedProfile);
          }
          setAuthLoading(false);
        }
      }
    };

    init();

    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        setSession(session);
        if (session?.user?.id) loadProfile(session.user.id);
        else {
          setProfile(null);
          setAuthLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      clearTimeout(authWatchdog);
      subscription?.unsubscribe();
    };
  }, [withTimeout]);

  const loadProfile = async (userId) => {
    try {
      const profileResult = await withTimeout(
        sb.from("profiles").select("*").eq("id", userId).single(),
        6000,
      );
      const { data } = profileResult || {};
      if (data) {
        setProfile(data);
        saveProfileLocal(data);
      } else {
        // DB no devolvió perfil — usar cache local
        const cached = loadProfileLocal(userId);
        if (cached) setProfile(cached);
      }
    } catch (e) {
      // Falló la carga de perfil — usar cache local
      const cached = loadProfileLocal(userId);
      if (cached) setProfile(cached);
    }
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    const userId = session?.user?.id;
    await sb.auth.signOut();
    clearSession();
    clearProfileLocal(userId);
    setSession(null);
    setProfile(null);
  };

  // Loading
  if (authLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <LogoHorizontal height={60} />
        <div
          style={{ fontSize: 12, color: "var(--muted)", letterSpacing: ".1em" }}
        >
          CARGANDO...
        </div>
        <div style={{ fontSize: 10, color: "var(--muted)", opacity: 0.5 }}>
          v{APP_VERSION}
        </div>
      </div>
    );
  }

  // Not logged in (or recovery mode — show password reset form)
  if (!session || recoveryMode) {
    return (
      <>
        <LoginScreen
          onAuth={(s) => {
            setRecoveryMode(false);
            setConfirmMsg("");
            setSession(s);
          }}
          recoveryMode={recoveryMode}
          initialMsg={confirmMsg}
        />
      </>
    );
  }

  // Logged in but profile not yet loaded — show loading
  if (!profile) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <LogoHorizontal height={60} />
        <div
          style={{ fontSize: 12, color: "var(--muted)", letterSpacing: ".1em" }}
        >
          CARGANDO...
        </div>
        <div style={{ fontSize: 10, color: "var(--muted)", opacity: 0.5 }}>
          v{APP_VERSION}
        </div>
      </div>
    );
  }

  // Logged in — check role before showing the appropriate panel
  if (profile.rol !== "coach") {
    return (
      <>
        <AtletaPanel
          session={session}
          profile={profile}
          onLogout={handleLogout}
        />
      </>
    );
  }

  return (
    <CoachApp session={session} profile={profile} onLogout={handleLogout} />
  );
}
