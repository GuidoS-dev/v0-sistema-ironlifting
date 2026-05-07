import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ChevronLeft, FileText, Library, LogOut, Search, Timer, User } from "lucide-react";
import { TabataTimer } from "../../../../components/cronometro";
import { EJERCICIOS } from "../../data/ejercicios";
import { CAT_COLOR } from "../../data/constantes";
import { sb } from "../../lib/supabase-client";
import { loadSession, clearSession, saveProfileLocal, loadProfileLocal, clearProfileLocal } from "../../lib/auth-storage";
import { writeLocalJson } from "../../lib/storage";
import { toTitleCase } from "../../lib/sanitize";
import { mesoFromDb } from "../../lib/mappers";
import { restoreMesoOverrides, restoreAtletaPctOverrides, restoreAtletaNormOverrides } from "../../lib/overrides";
import { getEjercicioById } from "../../lib/calc";
import { LogoHorizontal } from "../common/Logos";
import { PageResumen } from "../resumen/PageResumen";
import { PagePDF } from "../pdf/PagePDF";
import { CoachApp } from "./CoachApp";
import { LoginScreen } from "./LoginScreen";

export function AtletaPanel({ session, profile, onLogout }) {
  const [loading, setLoading] = useState(true);
  const [atletaInfo, setAtletaInfo] = useState(null);
  const [mesociclos, setMesociclos] = useState([]);
  const [selectedMeso, setSelectedMeso] = useState(null);
  const [coachNormativos, setCoachNormativos] = useState(null);
  const [coachTablas, setCoachTablas] = useState(null);
  const [atletaView, setAtletaView] = useState(null); // "resumen" | "normativos" | "cronometro" | null
  const [normSearch, setNormSearch] = useState("");
  const [atletaNormOvr, setAtletaNormOvr] = useState({});
  const [cronometroExercises, setCronometroExercises] = useState(null);
  const [cronometroTurnoInfo, setCronometroTurnoInfo] = useState(null);
  const mesoScrollRef = useRef(0);
  const mesoIdRef = useRef(null);

  useEffect(() => {
    if (!SUPA_CONFIG_OK || !session?.user?.id) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        // Load the atleta record linked to this profile
        const { data: atletaData } = await sb
          .from("atletas")
          .select("*")
          .eq("profile_id", session.user.id)
          .limit(1);
        const atleta = atletaData?.[0] || null;
        setAtletaInfo(atleta);

        if (atleta?.app_id) {
          // Load all mesociclos for this athlete (active + completed)
          const { data: mesosData } = await sb
            .from("mesociclos")
            .select("*")
            .eq("app_atleta_id", atleta.app_id)
            .order("updated_at", { ascending: false });
          if (mesosData) {
            // Restore overrides (repsEdit, cellEdit, etc.) into localStorage
            // so PagePDF can read them — same as CoachApp does on pull
            mesosData.forEach((r) => {
              if (r.app_id && r.overrides)
                restoreMesoOverrides(r.app_id, r.overrides);
            });
            setMesociclos(mesosData.map(mesoFromDb));
          }

          // Restore athlete-specific overrides into localStorage
          if (atleta.pct_overrides) {
            restoreAtletaPctOverrides(atleta.app_id, atleta.pct_overrides);
          }
          if (atleta.normativos_overrides) {
            restoreAtletaNormOverrides(
              atleta.app_id,
              atleta.normativos_overrides,
            );
            // Also store in state directly — avoids localStorage timing issues
            const ovr =
              typeof atleta.normativos_overrides === "string"
                ? JSON.parse(atleta.normativos_overrides)
                : atleta.normativos_overrides;
            setAtletaNormOvr(ovr || {});
          }

          // Load coach settings (normativos and tablas) for PDF rendering
          if (atleta.coach_id) {
            const { data: settingsData } = await sb
              .from("coach_settings")
              .select("setting_key, setting_value")
              .eq("coach_id", atleta.coach_id);
            if (settingsData) {
              settingsData.forEach((s) => {
                if (
                  s.setting_key === "normativos_globales" &&
                  s.setting_value
                ) {
                  try {
                    const parsed =
                      typeof s.setting_value === "string"
                        ? JSON.parse(s.setting_value)
                        : s.setting_value;
                    setCoachNormativos(parsed);
                    // Write to localStorage so getEjercicioById/getGrupo
                    // can find custom exercises (IDs > 144)
                    if (parsed) writeLocalJson("liftplan_normativos", parsed);
                  } catch {}
                }
                if (s.setting_key === "tablas_calculadora" && s.setting_value) {
                  try {
                    const parsed =
                      typeof s.setting_value === "string"
                        ? JSON.parse(s.setting_value)
                        : s.setting_value;
                    setCoachTablas(parsed);
                    if (parsed) writeLocalJson("liftplan_tablas", parsed);
                  } catch {}
                }
              });
            }
          }
        }
      } catch (e) {
        console.warn("Error loading athlete data:", e);
      }
      setLoading(false);
    })();
  }, [session?.user?.id]);

  // Build atletaNormativos: merge coach normativos with athlete-specific overrides
  // Uses state (atletaNormOvr) directly — no localStorage dependency
  const atletaNormativos = useMemo(() => {
    const base = coachNormativos || EJERCICIOS;
    if (!Object.keys(atletaNormOvr).length) return base;
    return base.map((ej) => {
      const ovr = atletaNormOvr[ej.id];
      if (!ovr) return ej;
      return {
        ...ej,
        ...(ovr.pct_base !== undefined ? { pct_base: ovr.pct_base } : {}),
        ...(ovr.base !== undefined ? { base: ovr.base } : {}),
      };
    });
  }, [coachNormativos, atletaNormOvr]);

  if (loading) {
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
          CARGANDO TUS DATOS...
        </div>
        <div style={{ fontSize: 10, color: "var(--muted)", opacity: 0.5 }}>
          v{APP_VERSION}
        </div>
      </div>
    );
  }

  // Not linked to any coach athlete record
  if (!atletaInfo) {
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
        <div
          style={{
            width: "100%",
            maxWidth: 440,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: 32,
            textAlign: "center",
          }}
        >
          <div style={{ display: "flex", justifyContent: "center" }}>
            <LogoHorizontal height={60} />
          </div>
          <div
            style={{
              fontFamily: "'Bebas Neue'",
              fontSize: 13,
              color: "var(--muted)",
              letterSpacing: ".15em",
              marginTop: 8,
              marginBottom: 28,
            }}
          >
            PANEL DE ATLETA
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              marginBottom: 20,
              padding: "12px 16px",
              background: "var(--surface2)",
              borderRadius: 10,
              border: "1px solid var(--border)",
            }}
          >
            <User size={18} style={{ color: "var(--gold)" }} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>
              {toTitleCase(profile.nombre) || session?.user?.email}
            </span>
          </div>
          <p
            style={{
              fontSize: 14,
              color: "var(--muted)",
              lineHeight: 1.6,
              marginBottom: 24,
            }}
          >
            Tu cuenta aún no fue vinculada por tu coach.
            <br />
            <br />
            Pedile a tu coach que vincule tu usuario desde el panel de gestión
            para poder ver tus mesociclos acá.
          </p>
          <button
            className="btn btn-ghost"
            onClick={onLogout}
            style={{ width: "100%", justifyContent: "center" }}
          >
            <LogOut size={14} /> Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  // Show selected mesociclo detail — render the PDF-style view
  if (selectedMeso) {
    const meso = selectedMeso;
    // Reset scroll if different meso
    if (mesoIdRef.current !== meso.id) {
      mesoScrollRef.current = 0;
      mesoIdRef.current = meso.id;
    }
    const savedScroll = mesoScrollRef.current;
    if (savedScroll > 0) {
      setTimeout(() => window.scrollTo(0, savedScroll), 0);
    }
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg)",
          padding: "12px",
          paddingTop: 0,
        }}
      >
        {/* Navigation header */}
        <div
          style={{
            background: "var(--bg)",
            padding: "12px 0",
            marginBottom: 4,
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              maxWidth: 1000,
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <button
              className="btn btn-ghost"
              onClick={() => {
                mesoScrollRef.current = window.scrollY;
                setSelectedMeso(null);
              }}
              style={{ gap: 6 }}
            >
              <ChevronLeft size={14} /> Volver
            </button>
            <button className="btn btn-ghost" onClick={onLogout}>
              <LogOut size={14} /> Salir
            </button>
          </div>
        </div>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <PagePDF
            meso={meso}
            atleta={atletaInfo}
            irm_arr={meso.irm_arranque}
            irm_env={meso.irm_envion}
            normativos={atletaNormativos}
            tablas={coachTablas || TABLA_DEFAULT}
            hideActions
            onStartTimer={(exercises, turnoInfo) => {
              setCronometroExercises(exercises);
              setCronometroTurnoInfo(turnoInfo || null);
            }}
          />
        </div>
        {/* Cronómetro overlay */}
        {cronometroExercises && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: "var(--bg)",
              overflow: "auto",
              WebkitOverflowScrolling: "touch",
              paddingTop: "env(safe-area-inset-top, 0px)",
            }}
            ref={(el) => {
              if (el) {
                document.body.style.overflow = "hidden";
              } else {
                document.body.style.overflow = "";
              }
            }}
          >
            <TabataTimer
              exercises={cronometroExercises}
              turnoInfo={cronometroTurnoInfo}
              onBack={() => {
                setCronometroExercises(null);
                setCronometroTurnoInfo(null);
              }}
            />
          </div>
        )}
      </div>
    );
  }

  // Show Cronómetro standalone (from home button)
  if (atletaView === "cronometro") {
    return (
      <TabataTimer
        exercises={[]}
        onBack={() => {
          setAtletaView(null);
        }}
      />
    );
  }

  // Show Resumen full-page view
  if (atletaView === "resumen") {
    const activeMesos = mesociclos.filter((m) => m.activo);
    const primaryMeso = activeMesos[0] || null;
    if (!primaryMeso) {
      setAtletaView(null);
    } else {
      return (
        <div
          style={{
            minHeight: "100vh",
            background: "var(--bg)",
            padding: "12px",
            paddingTop: 0,
          }}
        >
          {/* Navigation header */}
          <div
            style={{
              background: "var(--bg)",
              padding: "12px 0",
              marginBottom: 4,
            }}
          >
            <div
              style={{
                maxWidth: 1000,
                margin: "0 auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <button
                className="btn btn-ghost"
                onClick={() => setAtletaView(null)}
                style={{ gap: 6 }}
              >
                <ChevronLeft size={14} /> Volver
              </button>
              <button className="btn btn-ghost" onClick={onLogout}>
                <LogOut size={14} /> Salir
              </button>
            </div>
          </div>
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            <div
              style={{
                fontFamily: "'Bebas Neue'",
                fontSize: 22,
                color: "var(--blue)",
                letterSpacing: ".04em",
                marginBottom: 16,
                paddingBottom: 10,
                borderBottom: "2px solid var(--blue)",
              }}
            >
              RESUMEN — {primaryMeso.nombre || "Mesociclo"}
            </div>
            <PageResumen
              meso={primaryMeso}
              atleta={atletaInfo}
              irm_arr={primaryMeso.irm_arranque}
              irm_env={primaryMeso.irm_envion}
              normativos={atletaNormativos}
            />
          </div>
        </div>
      );
    }
  }

  // Show Normativos full-page view
  if (atletaView === "normativos") {
    const norms = atletaNormativos;
    const categories = [
      "Arranque",
      "Envion",
      "Tirones",
      "Piernas",
      "Complementarios",
    ];
    const searchLower = normSearch.trim().toLowerCase();
    const filteredNorms = searchLower
      ? norms.filter(
          (ej) =>
            ej.nombre.toLowerCase().includes(searchLower) ||
            String(ej.id).includes(searchLower) ||
            (ej.categoria || "").toLowerCase().includes(searchLower),
        )
      : norms;
    const grouped = {};
    categories.forEach((c) => {
      grouped[c] = [];
    });
    filteredNorms.forEach((ej) => {
      const cat = ej.categoria || "Complementarios";
      if (grouped[cat]) grouped[cat].push(ej);
      else grouped["Complementarios"].push(ej);
    });
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg)",
          padding: "12px",
          paddingTop: 0,
        }}
      >
        {/* Navigation header */}
        <div
          style={{
            background: "var(--bg)",
            padding: "12px 0",
            marginBottom: 4,
          }}
        >
          <div
            style={{
              maxWidth: 1000,
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <button
              className="btn btn-ghost"
              onClick={() => {
                setAtletaView(null);
                setNormSearch("");
              }}
              style={{ gap: 6 }}
            >
              <ChevronLeft size={14} /> Volver
            </button>
            <button className="btn btn-ghost" onClick={onLogout}>
              <LogOut size={14} /> Salir
            </button>
          </div>
        </div>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div
            style={{
              fontFamily: "'Bebas Neue'",
              fontSize: 22,
              color: "#9b87e8",
              letterSpacing: ".04em",
              marginBottom: 16,
              paddingBottom: 10,
              borderBottom: "2px solid #9b87e8",
            }}
          >
            NORMATIVOS
          </div>
          {/* Search/filter */}
          <div style={{ position: "relative", marginBottom: 12 }}>
            <Search
              size={14}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--muted)",
                pointerEvents: "none",
              }}
            />
            <input
              type="text"
              name="norm_search"
              placeholder="Buscar ejercicio..."
              value={normSearch}
              onChange={(e) => setNormSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: 34 }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {categories.map((cat) => {
              const items = grouped[cat];
              if (!items || items.length === 0) return null;
              const catColor = CAT_COLOR[cat] || "#9b87e8";
              return (
                <div
                  key={cat}
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "10px 16px",
                      background: "var(--surface2)",
                      borderBottom: "1px solid var(--border)",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        width: 4,
                        height: 16,
                        borderRadius: 2,
                        background: catColor,
                        flexShrink: 0,
                      }}
                    />
                    <div
                      style={{
                        fontFamily: "'Bebas Neue'",
                        fontSize: 16,
                        color: catColor,
                        letterSpacing: ".04em",
                      }}
                    >
                      {cat.toUpperCase()}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--muted)",
                        marginLeft: "auto",
                      }}
                    >
                      {items.length} ejercicio{items.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <div style={{ padding: "4px 0" }}>
                    {items.map((ej, idx) => (
                      <div
                        key={ej.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "8px 16px",
                          borderBottom:
                            idx < items.length - 1
                              ? "1px solid var(--border)"
                              : "none",
                        }}
                      >
                        <div
                          style={{
                            fontFamily: "'Bebas Neue'",
                            fontSize: 16,
                            color: "var(--muted)",
                            minWidth: 28,
                            textAlign: "right",
                          }}
                        >
                          {ej.id}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 500,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {ej.nombre}
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: catColor,
                            minWidth: 40,
                            textAlign: "center",
                          }}
                        >
                          {ej.pct_base}%
                        </div>
                        {ej.base && (
                          <div
                            style={{
                              fontSize: 10,
                              color:
                                ej.base === "arranque"
                                  ? "var(--gold)"
                                  : "var(--blue)",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: ".04em",
                              minWidth: 30,
                            }}
                          >
                            {ej.base === "arranque" ? "ARR" : "ENV"}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {filteredNorms.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: 24,
                color: "var(--muted)",
                fontSize: 13,
              }}
            >
              No se encontraron ejercicios para "{normSearch}"
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main athlete dashboard — only show active mesociclos
  const activeMesos = mesociclos.filter((m) => m.activo);

  // Calculate current week number based on fecha_inicio
  const getCurrentWeek = (meso) => {
    if (!meso.fecha_inicio || !meso.semanas?.length) return null;
    const start = new Date(meso.fecha_inicio + "T00:00:00");
    if (isNaN(start.getTime())) return null;
    const now = new Date();
    const diffMs = now - start;
    if (diffMs < 0) return 0; // hasn't started
    const weekNum = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
    return Math.min(weekNum, meso.semanas.length - 1);
  };

  // Helper to get the exercise name from normativos
  const getEjercicioNombre = (ejId) => {
    const norms = atletaNormativos;
    const found = norms.find((e) => e.id === ejId);
    return found?.nombre || `Ejercicio #${ejId}`;
  };

  // Calculate athlete age from fecha_nacimiento
  const calcAge = (dateStr) => {
    if (!dateStr) return null;
    const birth = new Date(dateStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const atletaAge = calcAge(atletaInfo?.fecha_nacimiento);
  const atletaGenero =
    atletaInfo?.genero === "f"
      ? "Femenino"
      : atletaInfo?.genero === "m"
        ? "Masculino"
        : null;

  const MesoCard = ({ m, isActive }) => {
    const currentWeek = getCurrentWeek(m);
    const currentSemana = currentWeek != null ? m.semanas?.[currentWeek] : null;
    return (
      <button
        className="atleta-card-btn"
        onClick={() => setSelectedMeso(m)}
        style={{
          width: "100%",
          textAlign: "left",
          cursor: "pointer",
          background: "var(--surface)",
          border: isActive
            ? "2px solid var(--gold)"
            : "1px solid var(--border)",
          borderRadius: 12,
          padding: 0,
          marginBottom: 10,
          fontFamily: "'DM Sans'",
          color: "var(--text)",
          transition: "all .2s",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "14px 18px",
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: isActive ? "rgba(232,197,71,.15)" : "var(--surface3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "'Bebas Neue',sans-serif",
              fontSize: 18,
              color: isActive ? "var(--gold)" : "var(--muted)",
              flexShrink: 0,
            }}
          >
            {(m.nombre || "M").charAt(0).toUpperCase()}
          </div>
          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {m.nombre || "Mesociclo"}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--muted)",
                marginTop: 4,
              }}
            >
              {m.semanas?.length || 0} semana{(m.semanas?.length || 0) !== 1 ? "s" : ""}
            </div>
          </div>
          {/* Arrow */}
          <ChevronLeft
            size={16}
            style={{
              color: "var(--muted)",
              transform: "rotate(180deg)",
              flexShrink: 0,
            }}
          />
        </div>
      </button>
    );
  };

  // Get the primary active meso for the IRM cards
  const primaryMeso = activeMesos[0] || null;

  return (
    <div
      style={{ minHeight: "100vh", background: "var(--bg)", padding: "20px" }}
    >
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        {/* Header — name left, logo center, logout right */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 28,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}
            >
              {toTitleCase(profile.nombre) || session?.user?.email}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--gold)",
                fontWeight: 600,
                letterSpacing: ".04em",
              }}
            >
              ATLETA
            </div>
          </div>
          <div style={{ flex: "0 0 auto" }}>
            <LogoHorizontal height={48} />
          </div>
          <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
            <button
              className="btn btn-ghost"
              onClick={onLogout}
              style={{ padding: "6px 10px" }}
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>

        {/* IRM Summary Card */}
        {primaryMeso &&
          (primaryMeso.irm_arranque || primaryMeso.irm_envion) && (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 14,
                  paddingBottom: 8,
                  borderBottom: "2px solid var(--gold)",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Bebas Neue'",
                    fontSize: 20,
                    color: "var(--gold)",
                    letterSpacing: ".04em",
                  }}
                >
                  MARCAS HISTÓRICAS
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                {primaryMeso.irm_arranque && (
                  <div
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      padding: "16px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--muted)",
                        marginBottom: 4,
                        fontWeight: 600,
                      }}
                    >
                      ARRANQUE
                    </div>
                    <div
                      style={{
                        fontSize: 24,
                        fontWeight: 700,
                        color: "var(--gold)",
                        fontFamily: "'Bebas Neue'",
                        display: "flex",
                        alignItems: "baseline",
                        justifyContent: "center",
                        gap: 4,
                      }}
                    >
                      {primaryMeso.irm_arranque}
                      <span
                        style={{
                          fontSize: 12,
                          color: "var(--muted)",
                          fontWeight: 500,
                          fontFamily: "'DM Sans'",
                        }}
                      >
                        kg
                      </span>
                    </div>
                  </div>
                )}
                {primaryMeso.irm_envion && (
                  <div
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      padding: "16px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--muted)",
                        marginBottom: 4,
                        fontWeight: 600,
                      }}
                    >
                      ENVIÓN
                    </div>
                    <div
                      style={{
                        fontSize: 24,
                        fontWeight: 700,
                        color: "var(--blue)",
                        fontFamily: "'Bebas Neue'",
                        display: "flex",
                        alignItems: "baseline",
                        justifyContent: "center",
                        gap: 4,
                      }}
                    >
                      {primaryMeso.irm_envion}
                      <span
                        style={{
                          fontSize: 12,
                          color: "var(--muted)",
                          fontWeight: 500,
                          fontFamily: "'DM Sans'",
                        }}
                      >
                        kg
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

        {/* Active mesociclos */}
        {activeMesos.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 14,
                paddingBottom: 8,
                borderBottom: "2px solid var(--gold)",
              }}
            >
              <div
                style={{
                  fontFamily: "'Bebas Neue'",
                  fontSize: 20,
                  color: "var(--gold)",
                  letterSpacing: ".04em",
                }}
              >
                {activeMesos.length === 1
                  ? "MESOCICLO ACTIVO"
                  : "MESOCICLOS ACTIVOS"}
              </div>
            </div>
            {activeMesos.map((m) => (
              <MesoCard key={m.id} m={m} isActive />
            ))}
          </div>
        )}

        {/* Resumen — navigation card */}
        {primaryMeso && primaryMeso.semanas?.length > 0 && (
          <button
            className="atleta-nav-btn"
            onClick={() => setAtletaView("resumen")}
            style={{
              width: "100%",
              textAlign: "left",
              cursor: "pointer",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "16px 20px",
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              gap: 12,
              transition: "all .2s",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "var(--blue)22",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <FileText size={20} style={{ color: "var(--blue)" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "'Bebas Neue'",
                  fontSize: 18,
                  color: "var(--blue)",
                  letterSpacing: ".04em",
                }}
              >
                RESUMEN
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>
                {primaryMeso.nombre || "Mesociclo"}
              </div>
            </div>
            <ChevronLeft
              size={16}
              style={{ color: "var(--blue)", transform: "rotate(180deg)" }}
            />
          </button>
        )}

        {/* Normativos — navigation card */}
        {(() => {
          const norms = atletaNormativos;
          if (!norms || norms.length === 0) return null;
          return (
            <button
              className="atleta-nav-btn"
              onClick={() => setAtletaView("normativos")}
              style={{
                width: "100%",
                textAlign: "left",
                cursor: "pointer",
                background: "var(--surface)",
                border: "1px solid #9b87e8",
                borderRadius: 12,
                padding: "16px 20px",
                marginBottom: 20,
                display: "flex",
                alignItems: "center",
                gap: 12,
                transition: "all .2s",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "#9b87e822",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Library size={20} style={{ color: "#9b87e8" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "'Bebas Neue'",
                    fontSize: 18,
                    color: "#9b87e8",
                    letterSpacing: ".04em",
                  }}
                >
                  NORMATIVOS
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>
                  {norms.length} ejercicio{norms.length !== 1 ? "s" : ""}
                </div>
              </div>
              <ChevronLeft
                size={16}
                style={{ color: "#9b87e8", transform: "rotate(180deg)" }}
              />
            </button>
          );
        })()}

        {/* Cronómetro — navigation card */}
        <button
          className="atleta-nav-btn"
          onClick={() => {
            setCronometroExercises(null);
            setAtletaView("cronometro");
          }}
          style={{
            width: "100%",
            textAlign: "left",
            cursor: "pointer",
            background: "var(--surface)",
            border: "1px solid var(--green)",
            borderRadius: 12,
            padding: "16px 20px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 12,
            transition: "all .2s",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "rgba(71,232,160,.13)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Timer size={20} style={{ color: "var(--green)" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: "'Bebas Neue'",
                fontSize: 18,
                color: "var(--green)",
                letterSpacing: ".04em",
              }}
            >
              CRONÓMETRO
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>
              Timer de entrenamiento
            </div>
          </div>
          <ChevronLeft
            size={16}
            style={{ color: "var(--green)", transform: "rotate(180deg)" }}
          />
        </button>

        {/* No active mesociclos */}
        {activeMesos.length === 0 && (
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: 32,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: "'Bebas Neue'",
                fontSize: 18,
                color: "var(--muted)",
                marginBottom: 8,
              }}
            >
              SIN MESOCICLO ACTIVO
            </div>
            <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
              Tu coach aún no activó ningún mesociclo para vos. Contactalo para
              más información.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

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
        <style>{`
          :root{--bg:#0a0c10;--surface:#12151c;--surface2:#1a1e27;--surface3:#222732;
          --border:#2a303c;--text:#e8eaf0;--muted:#6b7280;--gold:#e8c547;
          --blue:#64b4e8;--green:#47e8a0;--red:#e85047}
          body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;margin:0}
        `}</style>
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
        <style>{`
          :root{--bg:#0a0c10;--surface:#12151c;--surface2:#1a1e27;--surface3:#22273c;
          --border:#2a303c;--text:#e8eaf0;--muted:#6b7280;--gold:#e8c547;
          --blue:#64b4e8;--green:#47e8a0;--red:#e85047}
          body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;margin:0}
          .form-group{display:flex;flex-direction:column;gap:6px;margin-bottom:14px}
          .form-label{font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.07em}
          .form-input{background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:'DM Sans';font-size:16px;padding:9px 12px;outline:none;transition:border .2s;width:100%;box-sizing:border-box}
          .form-input:focus{border-color:var(--gold)}
          .btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;border:none;cursor:pointer;font-family:'DM Sans';font-size:13px;font-weight:600;transition:all .2s}
          .btn-gold{background:var(--gold);color:#0a0c10}
          .btn-ghost{background:var(--surface2);color:var(--text);border:1px solid var(--border)}
          @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;600;700&display=swap');
        `}</style>
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
        <style>{`
          :root{--bg:#0a0c10;--surface:#12151c;--surface2:#1a1e27;--surface3:#222732;
          --border:#2a303c;--text:#e8eaf0;--muted:#6b7280;--gold:#e8c547;
          --blue:#64b4e8;--green:#47e8a0;--red:#e85047}
          body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;margin:0}
        `}</style>
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
        <style>{`
          :root{--bg:#0a0c10;--surface:#12151c;--surface2:#1a1e27;--surface3:#222732;
          --border:#2a303c;--text:#e8eaf0;--muted:#6b7280;--gold:#e8c547;
          --blue:#64b4e8;--green:#47e8a0;--red:#e85047}
          body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;margin:0}
          .btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;border:none;cursor:pointer;font-family:'DM Sans';font-size:13px;font-weight:600;transition:all .2s}
          .btn-ghost{background:var(--surface2);color:var(--text);border:1px solid var(--border)}
          @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;600;700&display=swap');
        `}</style>
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
