"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ChevronLeft, Timer, Eye, EyeOff, List, X, HelpCircle, SkipForward, Hash, Volume2, Clock, Check, RotateCcw, ArrowDown } from "lucide-react";
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

  const disabledExercises = useMemo(
    () => exercises.filter((ex) => disabledIds.has(ex.id)),
    [exercises, disabledIds],
  );

  const restoreAll = useCallback(() => {
    setDisabledIds(new Set());
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
      if (phase === "rest" || phase === "intensityRest") sound.restStart();
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
      (phase === "work" || phase === "rest" || phase === "intensityRest") &&
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

  // ── Group info for multi-intensity exercises ──
  const groupInfo = useMemo(() => {
    if (!hasActiveExercises || !currentExercise) return null;

    // Compute unique groups: exercises with the same baseId are one group
    const seenBases = new Set<string>();
    let totalGroups = 0;
    let groupIndex = 0;
    let foundCurrent = false;
    for (const ex of activeExercises) {
      const key = ex.baseId || ex.id;
      if (!seenBases.has(key)) {
        if (!foundCurrent) groupIndex = totalGroups;
        seenBases.add(key);
        totalGroups++;
      }
      if (ex.id === currentExercise.id) foundCurrent = true;
    }

    // Find prev/next in same group
    let prevGroupExercise: TabataExercise | null = null;
    let nextGroupExercise: TabataExercise | null = null;
    if (currentExercise.baseId) {
      const idx = currentExerciseIndex;
      if (idx > 0) {
        const prev = activeExercises[idx - 1];
        if (prev.baseId === currentExercise.baseId) prevGroupExercise = prev;
      }
      if (idx < activeExercises.length - 1) {
        const next = activeExercises[idx + 1];
        if (next.baseId === currentExercise.baseId) nextGroupExercise = next;
      }
    }

    return { prevGroupExercise, nextGroupExercise, groupIndex, totalGroups };
  }, [activeExercises, currentExercise, currentExerciseIndex, hasActiveExercises]);

  // ── Grouped exercises for idle list ──
  const exerciseGroups = useMemo(() => {
    type Group = { baseId: string; baseName: string; exercises: { ex: TabataExercise; originalIndex: number }[] };
    const groups: Group[] = [];
    const map = new Map<string, Group>();
    exercises.forEach((ex, i) => {
      const key = ex.baseId || ex.id;
      let g = map.get(key);
      if (!g) {
        g = { baseId: key, baseName: ex.baseName || ex.name, exercises: [] };
        map.set(key, g);
        groups.push(g);
      }
      g.exercises.push({ ex, originalIndex: i });
    });
    return groups;
  }, [exercises]);

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
    done += currentRound - 1 + (phase === "rest" || phase === "intensityRest" ? 1 : 0);
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

        {/* Right-side buttons */}
        <div style={{ width: 70, display: "flex", justifyContent: "flex-end", gap: 4 }}>
          {isTimerActive && hasActiveExercises && (
            <button
              className="timer-btn"
              onClick={() => setShowListModal(true)}
              style={{
                background: "none",
                border: "none",
                color: "var(--gold-dark)",
                cursor: "pointer",
                padding: "8px 4px",
                display: "flex",
                alignItems: "center",
              }}
              aria-label="Ver listado completo"
            >
              <List size={18} />
            </button>
          )}
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
          justifyContent: isTimerActive ? "center" : "flex-start",
          gap: isTimerActive ? 24 : 0,
          padding: isTimerActive ? "0 16px" : "0",
          overflow: isTimerActive ? "visible" : "hidden",
        }}
      >
        {/* ── Exercise info (turno mode, only during active timer) ── */}
        {currentExercise && isTimerActive && (
          <TabataExerciseInfo
            exercise={currentExercise}
            exerciseIndex={currentExerciseIndex}
            totalExercises={activeExercises.length}
            currentRound={isTimerActive ? currentRound : undefined}
            totalRounds={isTimerActive ? totalRounds : undefined}
            prevGroupExercise={groupInfo?.prevGroupExercise}
            nextGroupExercise={groupInfo?.nextGroupExercise}
            groupIndex={groupInfo?.groupIndex}
            totalGroups={groupInfo?.totalGroups}
            phase={phase}
          />
        )}

        {/* ── Next exercise preview (visible during exerciseComplete) ── */}
        {phase === "exerciseComplete" &&
          currentExerciseIndex < activeExercises.length - 1 && (() => {
            const next = activeExercises[currentExerciseIndex + 1];
            const nc = CAT_COLORS[next.category] || "var(--muted-foreground)";
            return (
              <div
                style={{
                  width: "100%",
                  maxWidth: 340,
                  display: "flex",
                  flexDirection: "column",
                  gap: 0,
                  marginTop: -8,
                }}
              >
                {/* Arrow + label */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    marginBottom: 6,
                  }}
                >
                  <ArrowDown size={14} style={{ color: "var(--gold-dark)" }} />
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: ".06em",
                      textTransform: "uppercase",
                      color: "var(--gold-dark)",
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    SIGUIENTE
                  </span>
                  <ArrowDown size={14} style={{ color: "var(--gold-dark)" }} />
                </div>
                {/* Preview card */}
                <div
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--gold-dark)",
                    borderRadius: 12,
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    boxShadow: "0 0 12px color-mix(in srgb, var(--gold-dark) 20%, transparent)",
                  }}
                >
                  {/* Badge */}
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      padding: "3px 7px",
                      borderRadius: 5,
                      background: nc,
                      color: "var(--card)",
                      flexShrink: 0,
                    }}
                  >
                    {currentExerciseIndex + 2}
                  </span>
                  {/* Name */}
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: "var(--foreground)",
                      fontFamily: "var(--font-sans)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      flex: 1,
                    }}
                  >
                    {next.name}
                  </span>
                  {/* Kg */}
                  {next.kg != null && (
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 800,
                        color: "var(--gold)",
                        fontFamily: "var(--font-sans)",
                        flexShrink: 0,
                      }}
                    >
                      {next.kg}
                      <span style={{ fontSize: 11, fontWeight: 600, marginLeft: 2 }}>kg</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })()}

        {/* ── Exercise list (turno mode, idle — primary content) ── */}
        {phase === "idle" && hasExercises && (
          <div
            style={{
              flex: 1,
              width: "100%",
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
              padding: "8px 16px 0",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
                position: "sticky",
                top: 0,
                background: "var(--background)",
                padding: "4px 0 6px",
                zIndex: 1,
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
            {exerciseGroups.map((group, gIdx) => {
              const isMulti = group.exercises.length > 1;
              return (
                <div
                  key={group.baseId}
                  style={{
                    marginBottom: 8,
                    ...(isMulti
                      ? {
                          border: "1px solid color-mix(in srgb, var(--gold-dark) 30%, var(--border))",
                          borderRadius: 12,
                          overflow: "hidden",
                        }
                      : {}),
                  }}
                >
                  {/* Group header for multi-intensity */}
                  {isMulti && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 10px",
                        background: "color-mix(in srgb, var(--gold-dark) 8%, var(--card))",
                        borderBottom: "1px solid var(--border)",
                        fontSize: 10,
                        fontWeight: 700,
                        color: "var(--gold-dark)",
                        letterSpacing: ".04em",
                        textTransform: "uppercase",
                        fontFamily: "var(--font-display)",
                      }}
                    >
                      <Hash size={10} />
                      {group.baseName}
                      <span style={{ marginLeft: "auto", fontSize: 9, opacity: 0.7 }}>
                        {group.exercises.length} intensidades
                      </span>
                    </div>
                  )}
                  {group.exercises.map(({ ex, originalIndex }, subIdx) => {
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
                          border: isMulti ? "none" : `1px solid var(--border)`,
                          borderRadius: isMulti ? 0 : 10,
                          borderBottom: isMulti && subIdx < group.exercises.length - 1 ? "1px solid var(--border)" : "none",
                          overflow: "hidden",
                          boxShadow: isDisabled || isMulti ? "none" : "0 2px 8px rgba(0,0,0,.2)",
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
                              {isMulti ? `${gIdx + 1}.${subIdx + 1}` : gIdx + 1}
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
                            {isMulti ? (ex.intensityLabel || ex.name) : ex.name}
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
              );
            })}
          </div>
        )}

        {/* ── Config panel (idle state) ── */}
        {phase === "idle" && (
          <div style={{ padding: "0 16px", flexShrink: 0, width: "100%", display: "flex", justifyContent: "center" }}>
            <TabataConfigPanel
              config={config}
              onChange={handleConfigChange}
              showRounds={!hasActiveExercises}
            />
          </div>
        )}

        {/* ── Disabled exercises banner (above controls, idle only) ── */}
        {phase === "idle" && disabledExercises.length > 0 && (
          <div
            role="status"
            style={{
              margin: "0 16px",
              padding: "6px 12px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "color-mix(in srgb, var(--orange) 10%, var(--card))",
              border: "1px solid color-mix(in srgb, var(--orange) 30%, var(--border))",
              borderRadius: 8,
              flexShrink: 0,
            }}
          >
            <EyeOff size={14} style={{ color: "var(--orange)", flexShrink: 0 }} />
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--orange)",
                fontFamily: "var(--font-sans)",
              }}
            >
              {disabledExercises.length} ejercicio{disabledExercises.length > 1 ? "s" : ""} oculto{disabledExercises.length > 1 ? "s" : ""}
            </span>
          </div>
        )}

        {/* ── Controls ── */}
        <div style={{ padding: phase === "idle" ? "8px 16px 0" : "0", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 24, width: "100%" }}>
          {isTimerActive && (
            <TabataDisplay
              phase={phase}
              timeLeft={timeLeft}
              totalPhaseTime={totalPhaseTime}
              currentRound={currentRound}
              totalRounds={totalRounds}
            />
          )}

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
        </div>

        {/* ── Disabled exercises list + restore (below controls, idle only) ── */}
        {phase === "idle" && disabledExercises.length > 0 && (
          <div
            style={{
              margin: "0 16px",
              padding: "0 0 16px",
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "var(--muted-foreground)",
                letterSpacing: ".06em",
                textTransform: "uppercase",
                marginBottom: 2,
              }}
            >
              Ejercicios ocultos
            </div>
            {disabledExercises.map((ex) => {
              const gc = CAT_COLORS[ex.category] || "var(--muted-foreground)";
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
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 10px",
                    background: "var(--background)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    cursor: "pointer",
                    userSelect: "none",
                    opacity: 0.6,
                    transition: "opacity .15s",
                  }}
                  onPointerEnter={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = "0.85"; }}
                  onPointerLeave={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = "0.6"; }}
                >
                  <EyeOff size={12} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--muted-foreground)",
                      textDecoration: "line-through",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {ex.name}
                  </span>
                  <Eye size={12} style={{ color: gc, flexShrink: 0 }} />
                </div>
              );
            })}
            <button
              onClick={restoreAll}
              style={{
                marginTop: 4,
                padding: "6px 16px",
                background: "none",
                border: "1px solid color-mix(in srgb, var(--orange) 40%, var(--border))",
                borderRadius: 8,
                color: "var(--orange)",
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "var(--font-sans)",
                cursor: "pointer",
                letterSpacing: ".02em",
                transition: "background .15s, border-color .15s",
                alignSelf: "center",
              }}
              onPointerEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "color-mix(in srgb, var(--orange) 10%, var(--card))";
              }}
              onPointerLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "none";
              }}
            >
              Restaurar todos
            </button>
          </div>
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

            {/* Exercise list — grouped by baseId */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                WebkitOverflowScrolling: "touch",
                padding: "8px 12px 20px",
              }}
            >
              {(() => {
                // Build groups from activeExercises
                type ModalGroup = { baseId: string; baseName: string; items: { ex: TabataExercise; flatIndex: number }[] };
                const groups: ModalGroup[] = [];
                const gMap = new Map<string, ModalGroup>();
                activeExercises.forEach((ex, i) => {
                  const key = ex.baseId || ex.id;
                  let g = gMap.get(key);
                  if (!g) {
                    g = { baseId: key, baseName: ex.baseName || ex.name, items: [] };
                    gMap.set(key, g);
                    groups.push(g);
                  }
                  g.items.push({ ex, flatIndex: i });
                });

                return groups.map((group, gIdx) => {
                  const isMulti = group.items.length > 1;
                  return (
                    <div
                      key={group.baseId}
                      style={{
                        marginBottom: 8,
                        ...(isMulti
                          ? {
                              border: "1px solid color-mix(in srgb, var(--gold-dark) 30%, var(--border))",
                              borderRadius: 10,
                              overflow: "hidden",
                            }
                          : {}),
                      }}
                    >
                      {/* Group header for multi-intensity */}
                      {isMulti && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "5px 10px",
                            background: "color-mix(in srgb, var(--gold-dark) 8%, var(--card))",
                            borderBottom: "1px solid var(--border)",
                            fontSize: 10,
                            fontWeight: 700,
                            color: "var(--gold-dark)",
                            letterSpacing: ".04em",
                            textTransform: "uppercase",
                            fontFamily: "var(--font-display)",
                          }}
                        >
                          <Hash size={10} />
                          {group.baseName}
                          <span style={{ marginLeft: "auto", fontSize: 9, opacity: 0.7 }}>
                            {group.items.length} int.
                          </span>
                        </div>
                      )}
                      {group.items.map(({ ex, flatIndex }, subIdx) => {
                        const isDone =
                          phase === "finished" ||
                          flatIndex < currentExerciseIndex ||
                          (flatIndex === currentExerciseIndex && phase === "exerciseComplete");
                        const isCurrent =
                          flatIndex === currentExerciseIndex &&
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
                              padding: "8px 10px",
                              background: isCurrent
                                ? "color-mix(in srgb, var(--gold) 6%, var(--card))"
                                : "transparent",
                              borderBottom:
                                isMulti && subIdx < group.items.length - 1
                                  ? "1px solid var(--border)"
                                  : !isMulti && gIdx < groups.length - 1
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
                                {isMulti ? (ex.intensityLabel || ex.name) : ex.name}
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
                  );
                });
              })()}
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
