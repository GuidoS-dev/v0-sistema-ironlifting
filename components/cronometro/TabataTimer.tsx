"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ChevronLeft, Timer, Eye, EyeOff, List, X, HelpCircle, SkipForward, Hash, Volume2, Clock, Check, RotateCcw } from "lucide-react";
import type { TabataConfig, TabataExercise } from "./types";
import { DEFAULT_CONFIG, STORAGE_KEY, TUTORIAL_SEEN_KEY, PHASE_COLORS, CAT_COLORS } from "./constants";
import { useTabataTimer } from "./hooks/useTabataTimer";
import { useWakeLock } from "./hooks/useWakeLock";
import { useTabataSound } from "./hooks/useTabataSound";
import TabataDisplay from "./TabataDisplay";
import TabataControls from "./TabataControls";
import TabataConfigPanel from "./TabataConfig";
import TabataExerciseInfo from "./TabataExerciseInfo";

interface TurnoInfo {
  semana: number;
  turno: number;
  dia: string | null;
  momento: string | null;
}

export interface TabataTimerProps {
  exercises?: TabataExercise[];
  turnoInfo?: TurnoInfo | null;
  onBack: () => void;
}

function loadConfig(): TabataConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch {
    // corrupted — use defaults
  }
  return { ...DEFAULT_CONFIG };
}

function saveConfig(config: TabataConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // storage full — silent fail
  }
}

export function TabataTimer({
  exercises = [],
  turnoInfo = null,
  onBack,
}: TabataTimerProps) {
  const [config, setConfig] = useState<TabataConfig>(loadConfig);
  const [disabledIds, setDisabledIds] = useState<Set<string>>(new Set());
  const [showListModal, setShowListModal] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const hasExercises = exercises.length > 0;

  // ── Show tutorial on first open (from Entrenar, with exercises) ──
  useEffect(() => {
    if (!hasExercises) return;
    try {
      if (!localStorage.getItem(TUTORIAL_SEEN_KEY)) {
        setShowTutorial(true);
      }
    } catch {
      // storage unavailable
    }
  }, [hasExercises]);

  const closeTutorial = useCallback(() => {
    if (dontShowAgain) {
      try {
        localStorage.setItem(TUTORIAL_SEEN_KEY, "1");
      } catch { /* noop */ }
    }
    setShowTutorial(false);
  }, [dontShowAgain]);

  // ── Filtered exercises (excluding disabled) ──
  const activeExercises = useMemo(
    () => exercises.filter((ex) => !disabledIds.has(ex.id)),
    [exercises, disabledIds],
  );

  const toggleExercise = useCallback((id: string) => {
    setDisabledIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ── Timer hook (uses only active exercises) ──
  const timer = useTabataTimer(config, activeExercises);
  const {
    phase,
    timeLeft,
    totalPhaseTime,
    currentRound,
    totalRounds,
    isRunning,
    currentExerciseIndex,
    actions,
  } = timer;

  // ── Side effects ──
  useWakeLock(isRunning);
  const sound = useTabataSound(config.soundEnabled);

  // ── Sound on phase transitions ──
  const prevPhaseRef = useRef(phase);
  useEffect(() => {
    if (prevPhaseRef.current !== phase) {
      prevPhaseRef.current = phase;
      if (phase === "work") sound.workStart();
      if (phase === "rest") sound.restStart();
      if (phase === "finished" || phase === "exerciseComplete")
        sound.finished();
    }
  }, [phase, sound]);

  // ── Countdown ticks & last-seconds warning ──
  useEffect(() => {
    if (phase === "countdown" && timeLeft > 0) {
      if (timeLeft <= 3) sound.countdownLast();
      else sound.countdownTick();
    }
    if (
      (phase === "work" || phase === "rest") &&
      timeLeft <= 3 &&
      timeLeft > 0
    ) {
      sound.countdownTick();
    }
  }, [timeLeft, phase, sound]);

  // ── Persist config ──
  const handleConfigChange = useCallback((newConfig: TabataConfig) => {
    setConfig(newConfig);
    saveConfig(newConfig);
  }, []);

  // ── Back handler ──
  const [showExitModal, setShowExitModal] = useState(false);

  const handleBack = useCallback(() => {
    // If timer is active (not idle and not finished), show confirmation
    if (phase !== "idle" && phase !== "finished") {
      setShowExitModal(true);
      return;
    }
    actions.reset();
    onBack();
  }, [actions, onBack, phase]);

  const confirmExit = useCallback(() => {
    setShowExitModal(false);
    actions.reset();
    onBack();
  }, [actions, onBack]);

  // ── Current exercise ──
  const hasActiveExercises = activeExercises.length > 0;
  const currentExercise = hasActiveExercises ? activeExercises[currentExerciseIndex] : null;

  // ── Phase colors for background tint ──
  const colors = PHASE_COLORS[phase];
  const isTimerActive = phase !== "idle";

  // ── Overall progress (across all exercises + rounds) ──
  const overallProgress = (() => {
    if (!hasActiveExercises) {
      if (phase === "finished") return 1;
      if (phase === "idle") return 0;
      const totalWork = config.rounds;
      const done = currentRound - 1 + (phase === "rest" ? 1 : 0);
      return done / totalWork;
    }
    const totalSeries = activeExercises.reduce((sum, e) => sum + e.series, 0);
    let done = 0;
    for (let i = 0; i < currentExerciseIndex; i++) {
      done += activeExercises[i].series;
    }
    done += currentRound - 1 + (phase === "rest" ? 1 : 0);
    if (phase === "finished") return 1;
    if (phase === "exerciseComplete") done += 1;
    return Math.min(done / totalSeries, 1);
  })();

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: isTimerActive ? colors.bg : "var(--background)",
        transition: "background .5s ease",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-sans)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px 8px",
          flexShrink: 0,
        }}
      >
        <button
          className="timer-btn"
          onClick={handleBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            background: "none",
            border: "none",
            color: "var(--muted-foreground)",
            cursor: "pointer",
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            padding: "8px 4px",
          }}
          aria-label="Volver"
        >
          <ChevronLeft size={18} />
          Volver
        </button>

        {!isTimerActive && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: "var(--gold-dark)",
              }}
            >
              <Timer size={18} />
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 18,
                  letterSpacing: ".06em",
                }}
              >
                CRONÓMETRO
              </span>
            </div>
            {turnoInfo && (
              <div
                style={{
                  fontSize: 11,
                  color: "var(--muted-foreground)",
                  fontFamily: "var(--font-sans)",
                  textAlign: "center",
                }}
              >
                Semana {turnoInfo.semana} · Turno {turnoInfo.turno}
                {turnoInfo.dia ? ` · ${turnoInfo.dia}` : ""}
                {turnoInfo.momento ? ` ${turnoInfo.momento}` : ""}
              </div>
            )}
          </div>
        )}

        {/* Help button / spacer */}
        <div style={{ width: 70, display: "flex", justifyContent: "flex-end" }}>
          {!isTimerActive && hasExercises && (
            <button
              className="timer-btn"
              onClick={() => setShowTutorial(true)}
              style={{
                background: "none",
                border: "none",
                color: "var(--muted-foreground)",
                cursor: "pointer",
                padding: "8px 4px",
                display: "flex",
                alignItems: "center",
              }}
              aria-label="Ayuda"
            >
              <HelpCircle size={18} />
            </button>
          )}
        </div>
      </div>

      {/* ── Main content ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          padding: "0 16px",
        }}
      >
        {/* ── Exercise info (turno mode) ── */}
        {currentExercise && (
          <TabataExerciseInfo
            exercise={currentExercise}
            exerciseIndex={currentExerciseIndex}
            totalExercises={activeExercises.length}
            currentRound={isTimerActive ? currentRound : undefined}
            totalRounds={isTimerActive ? totalRounds : undefined}
          />
        )}

        {/* ── Config panel (idle state) ── */}
        {phase === "idle" && (
          <TabataConfigPanel
            config={config}
            onChange={handleConfigChange}
            showRounds={!hasActiveExercises}
          />
        )}

        {/* ── Timer display ── */}
        {isTimerActive && (
          <TabataDisplay
            phase={phase}
            timeLeft={timeLeft}
            totalPhaseTime={totalPhaseTime}
            currentRound={currentRound}
            totalRounds={totalRounds}
          />
        )}

        {/* ── Controls ── */}
        <TabataControls
          phase={phase}
          isRunning={isRunning}
          hasExercises={hasActiveExercises}
          canPrev={currentExerciseIndex > 0}
          canNext={currentRound < totalRounds || currentExerciseIndex < activeExercises.length - 1}
          onStart={actions.start}
          onPause={actions.pause}
          onResume={actions.resume}
          onReset={actions.reset}
          onNext={actions.skipForward}
          onPrev={actions.prevExercise}
          onSkipPhase={actions.skipPhase}
          onRestartPhase={actions.restartPhase}
        />

        {/* ── Listado button (visible during active timer) ── */}
        {isTimerActive && hasActiveExercises && (
          <button
            className="timer-btn"
            onClick={() => setShowListModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "10px 24px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "color-mix(in srgb, var(--card) 85%, transparent)",
              color: "var(--gold-dark)",
              cursor: "pointer",
              fontFamily: "var(--font-display)",
              fontSize: 14,
              letterSpacing: ".06em",
              marginTop: 4,
              transition: "all .2s",
            }}
            aria-label="Ver listado completo"
          >
            <List size={16} />
            VER LISTADO ({phase === "finished" ? activeExercises.length : currentExerciseIndex}/{activeExercises.length})
          </button>
        )}
      </div>

      {/* ── Progress bar ── */}
      {isTimerActive && (
        <div
          style={{
            height: 4,
            background: "var(--secondary)",
            flexShrink: 0,
            marginTop: "auto",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${overallProgress * 100}%`,
              background: colors.accent,
              transition: "width .5s ease, background .3s ease",
              borderRadius: 2,
            }}
          />
        </div>
      )}

      {/* ── Exercise list (turno mode, idle) ── */}
      {phase === "idle" && hasExercises && (
        <div
          style={{
            padding: "12px 16px 24px",
            borderTop: "1px solid var(--border)",
            flexShrink: 0,
            maxHeight: 280,
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "var(--muted-foreground)",
                letterSpacing: ".06em",
                textTransform: "uppercase",
              }}
            >
              Ejercicios del turno
            </div>
            <div
              style={{
                fontSize: 10,
                color: "var(--gold-dark)",
                fontWeight: 700,
              }}
            >
              {activeExercises.length}/{exercises.length}
            </div>
          </div>
          {exercises.map((ex, i) => {
            const gc = CAT_COLORS[ex.category] || "var(--muted-foreground)";
            const isDisabled = disabledIds.has(ex.id);
            return (
              <div
                key={ex.id}
                role="button"
                tabIndex={0}
                onClick={() => toggleExercise(ex.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleExercise(ex.id);
                  }
                }}
                style={{
                  background: isDisabled ? "var(--background)" : "var(--card)",
                  border: `1px solid ${isDisabled ? "var(--border)" : "var(--border)"}`,
                  borderRadius: 10,
                  marginBottom: 8,
                  overflow: "hidden",
                  boxShadow: isDisabled ? "none" : "0 2px 8px rgba(0,0,0,.2)",
                  display: "flex",
                  flexFlow: "row wrap",
                  opacity: isDisabled ? 0.4 : 1,
                  transition: "opacity .2s, box-shadow .2s",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                {/* Badge */}
                <div
                  style={{
                    width: 40,
                    minWidth: 40,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    alignSelf: "stretch",
                    borderBottom: `1px solid var(--border)`,
                    background: isDisabled ? "var(--background)" : "var(--card)",
                  }}
                >
                  {isDisabled ? (
                    <EyeOff size={12} color="var(--muted-foreground)" />
                  ) : (
                    <span
                      style={{
                        fontSize: 8,
                        fontWeight: 800,
                        padding: "2px 4px",
                        borderRadius: 3,
                        background: gc,
                        color: "var(--card)",
                        opacity: 0.85,
                      }}
                    >
                      {i + 1}
                    </span>
                  )}
                </div>
                {/* Name */}
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: "8px 10px 8px 6px",
                    borderBottom: `1px solid var(--border)`,
                    background: isDisabled ? "var(--background)" : "var(--card)",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 12,
                      fontWeight: 700,
                      color: isDisabled ? "var(--muted-foreground)" : "var(--foreground)",
                      letterSpacing: ".01em",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      textDecoration: isDisabled ? "line-through" : "none",
                    }}
                  >
                    {ex.name}
                  </span>
                </div>
                {/* Data row */}
                <div
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    minHeight: 34,
                    background: isDisabled ? "var(--background)" : "var(--surface-inset)",
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      minWidth: 40,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      alignSelf: "stretch",
                      background: isDisabled ? "var(--background)" : "var(--card)",
                      borderRight: `1px solid var(--border)`,
                      color: isDisabled ? "var(--muted-foreground)" : "var(--gold-dark)",
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    {ex.series}×
                  </div>
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      padding: "6px 10px",
                      gap: 0,
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    {ex.reps && (
                      <div
                        style={{ display: "flex", alignItems: "center" }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 800,
                            color: isDisabled ? "var(--muted-foreground)" : "var(--foreground)",
                            background: isDisabled ? "var(--background)" : "var(--badge-bg)",
                            padding: "3px 0 3px 8px",
                            borderRadius: "5px 0 0 5px",
                          }}
                        >
                          {ex.series}
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              color: isDisabled ? "var(--muted-foreground)" : "var(--gold-dark)",
                              margin: "0 2px",
                            }}
                          >
                            ×
                          </span>
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 800,
                            color: isDisabled ? "var(--muted-foreground)" : "var(--foreground)",
                            background: isDisabled ? "var(--background)" : "var(--badge-bg)",
                            padding: "3px 8px 3px 0",
                            borderRadius: "0 5px 5px 0",
                          }}
                        >
                          {ex.reps}
                        </span>
                      </div>
                    )}
                    {ex.kg != null && (
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          color: isDisabled ? "var(--muted-foreground)" : "var(--foreground)",
                          background: isDisabled ? "var(--background)" : "var(--badge-bg)",
                          padding: "3px 8px",
                          borderRadius: 5,
                          whiteSpace: "nowrap",
                          marginLeft: 4,
                        }}
                      >
                        {ex.kg}
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: isDisabled ? "var(--muted-foreground)" : "var(--gold-dark)",
                            marginLeft: 2,
                          }}
                        >
                          {" "}
                          kg
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Exercise list modal (during active timer) ── */}
      {showListModal && hasActiveExercises && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 30,
            background: "rgba(0,0,0,.7)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
          onClick={() => setShowListModal(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 480,
              maxHeight: "75dvh",
              background: "var(--card)",
              borderRadius: "16px 16px 0 0",
              border: "1px solid var(--border)",
              borderBottom: "none",
              boxShadow: "0 -4px 24px rgba(0,0,0,.5)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px 10px",
                borderBottom: "1px solid var(--border)",
                flexShrink: 0,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "var(--gold-dark)",
                    fontFamily: "var(--font-display)",
                    letterSpacing: ".06em",
                  }}
                >
                  LISTADO COMPLETO
                </div>
                {turnoInfo && (
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--muted-foreground)",
                      marginTop: 2,
                    }}
                  >
                    Semana {turnoInfo.semana} · Turno {turnoInfo.turno}
                    {turnoInfo.dia ? ` · ${turnoInfo.dia}` : ""}
                    {turnoInfo.momento ? ` ${turnoInfo.momento}` : ""}
                  </div>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--green)",
                    fontWeight: 700,
                  }}
                >
                  {phase === "finished"
                    ? activeExercises.length
                    : currentExerciseIndex}
                  /{activeExercises.length}
                </span>
                <button
                  onClick={() => setShowListModal(false)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--muted-foreground)",
                    cursor: "pointer",
                    padding: 4,
                    display: "flex",
                  }}
                  aria-label="Cerrar listado"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Exercise list */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                WebkitOverflowScrolling: "touch",
                padding: "8px 16px 20px",
              }}
            >
              {activeExercises.map((ex, i) => {
                const isDone =
                  phase === "finished" ||
                  i < currentExerciseIndex ||
                  (i === currentExerciseIndex &&
                    phase === "exerciseComplete");
                const isCurrent =
                  i === currentExerciseIndex &&
                  phase !== "finished" &&
                  phase !== "exerciseComplete";
                const gc = CAT_COLORS[ex.category] || "var(--muted-foreground)";

                return (
                  <div
                    key={ex.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 0",
                      borderBottom:
                        i < activeExercises.length - 1
                          ? "1px solid var(--border)"
                          : "none",
                    }}
                  >
                    {/* Status dot */}
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        flexShrink: 0,
                        background: isDone
                          ? "var(--green)"
                          : isCurrent
                            ? "var(--gold)"
                            : "var(--border)",
                        boxShadow: isCurrent
                          ? "0 0 6px color-mix(in srgb, var(--gold) 50%, transparent)"
                          : "none",
                        transition: "background .3s",
                      }}
                    />

                    {/* Exercise info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: isDone
                            ? "var(--green)"
                            : isCurrent
                              ? "var(--foreground)"
                              : "var(--muted-foreground)",
                          fontFamily: "var(--font-sans)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          textDecoration: isDone ? "line-through" : "none",
                          transition: "color .3s",
                        }}
                      >
                        {ex.name}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: isDone ? "color-mix(in srgb, var(--green) 60%, transparent)" : "var(--muted-foreground)",
                          marginTop: 2,
                        }}
                      >
                        {ex.series}×{ex.reps || "—"}
                        {ex.kg != null ? ` · ${ex.kg}kg` : ""}
                      </div>
                    </div>

                    {/* Category dot */}
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: gc,
                        opacity: isDone ? 0.4 : 0.7,
                        flexShrink: 0,
                      }}
                    />

                    {/* Current indicator */}
                    {isCurrent && (
                      <div
                        style={{
                          fontSize: 9,
                          fontWeight: 800,
                          color: "var(--gold)",
                          letterSpacing: ".05em",
                          flexShrink: 0,
                        }}
                      >
                        <span aria-hidden="true">▶</span>
                        <span className="sr-only">Ejercicio actual</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Exit confirmation modal ── */}
      {showExitModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 40,
            background: "rgba(0,0,0,.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setShowExitModal(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 340,
              background: "var(--card)",
              borderRadius: 14,
              border: "1px solid var(--border)",
              boxShadow: "0 8px 32px rgba(0,0,0,.6)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "20px 20px 12px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 20,
                  fontFamily: "var(--font-display)",
                  color: "var(--orange)",
                  letterSpacing: ".06em",
                }}
              >
                SALIR DEL ENTRENAMIENTO
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--muted-foreground)",
                  marginTop: 10,
                  lineHeight: 1.5,
                }}
              >
                Se perderá todo el progreso actual del cronómetro. ¿Estás seguro?
              </div>
            </div>
            <div
              style={{
                display: "flex",
                gap: 10,
                padding: "12px 20px 20px",
              }}
            >
              <button
                className="timer-btn"
                onClick={() => setShowExitModal(false)}
                style={{
                  flex: 1,
                  padding: "12px 0",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--foreground)",
                  fontFamily: "var(--font-display)",
                  fontSize: 15,
                  letterSpacing: ".06em",
                  cursor: "pointer",
                }}
              >
                CANCELAR
              </button>
              <button
                className="timer-btn"
                onClick={confirmExit}
                style={{
                  flex: 1,
                  padding: "12px 0",
                  borderRadius: 10,
                  border: "none",
                  background: "var(--orange)",
                  color: "var(--background)",
                  fontFamily: "var(--font-display)",
                  fontSize: 15,
                  letterSpacing: ".06em",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                SALIR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tutorial modal ── */}
      {showTutorial && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 40,
            background: "rgba(0,0,0,.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={closeTutorial}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 400,
              maxHeight: "85dvh",
              background: "var(--card)",
              borderRadius: 14,
              border: "1px solid var(--border)",
              boxShadow: "0 8px 32px rgba(0,0,0,.6)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: "18px 20px 14px",
                borderBottom: "1px solid var(--border)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 22,
                  fontFamily: "var(--font-display)",
                  color: "var(--gold-dark)",
                  letterSpacing: ".06em",
                }}
              >
                CÓMO USAR EL CRONÓMETRO
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--muted-foreground)",
                  marginTop: 4,
                }}
              >
                Tu herramienta de entrenamiento por series
              </div>
            </div>

            {/* Content */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                WebkitOverflowScrolling: "touch",
                padding: "16px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              {[
                {
                  icon: <Eye size={18} color="var(--gold-dark)" />,
                  title: "Activar / Desactivar ejercicios",
                  desc: "Tocá un ejercicio en la lista para excluirlo del entrenamiento. Los desactivados aparecen tachados.",
                },
                {
                  icon: <Clock size={18} color="var(--gold-dark)" />,
                  title: "Trabajo y Descanso",
                  desc: "Configurá los tiempos de trabajo y descanso antes de arrancar. Cada serie alterna entre trabajo y descanso.",
                },
                {
                  icon: <SkipForward size={18} color="var(--gold-dark)" />,
                  title: "Botón Adelantar (⏭)",
                  desc: "Avanza a la siguiente serie. Si estás en la última serie, pasa al próximo ejercicio automáticamente.",
                },
                {
                  icon: <Check size={18} color="var(--gold-dark)" />,
                  title: "Botón LISTO (✓)",
                  desc: "Terminaste antes? Tocá LISTO para saltar al descanso o la siguiente serie sin esperar que termine el timer.",
                },
                {
                  icon: <RotateCcw size={18} color="var(--gold-dark)" />,
                  title: "Reiniciar Fase (↺)",
                  desc: "Reinicia el timer de la fase actual. Si estás en trabajo, vuelve al inicio del trabajo. Ideal si tuviste un inconveniente.",
                },
                {
                  icon: <Hash size={18} color="var(--gold-dark)" />,
                  title: "Indicador de Serie",
                  desc: "En la tarjeta del ejercicio verás \"SERIE 2 / 4\" con puntos de progreso: verde = completada, dorado = actual.",
                },
                {
                  icon: <List size={18} color="var(--gold-dark)" />,
                  title: "Ver Listado",
                  desc: "Durante el entrenamiento, el botón \"VER LISTADO\" muestra el progreso general con todos los ejercicios.",
                },
                {
                  icon: <Volume2 size={18} color="var(--gold-dark)" />,
                  title: "Sonidos",
                  desc: "Beeps al cambiar de fase y cuenta regresiva en los últimos 3 segundos. Podés desactivar el sonido en la config.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{ flexShrink: 0, marginTop: 1 }}>
                    {item.icon}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "var(--foreground)",
                        marginBottom: 2,
                      }}
                    >
                      {item.title}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--muted-foreground)",
                        lineHeight: 1.45,
                      }}
                    >
                      {item.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "12px 20px 18px",
                borderTop: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                alignItems: "center",
              }}
            >
              {/* Don't show again checkbox */}
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  fontSize: 12,
                  color: "var(--muted-foreground)",
                  userSelect: "none",
                }}
              >
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={() => setDontShowAgain((p) => !p)}
                  style={{
                    width: 18,
                    height: 18,
                    accentColor: "var(--gold-dark)",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                />
                No volver a mostrar
              </label>

              {/* Close button */}
              <button
                className="timer-btn"
                onClick={closeTutorial}
                style={{
                  width: "100%",
                  padding: "12px 0",
                  borderRadius: 10,
                  border: "none",
                  background: "var(--gold-dark)",
                  color: "var(--background)",
                  fontFamily: "var(--font-display)",
                  fontSize: 16,
                  letterSpacing: ".06em",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                ENTENDIDO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TabataTimer;
