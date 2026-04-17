"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Play, Pause, SkipForward, SkipBack, RotateCcw, Check } from "lucide-react";
import type { TimerPhase } from "./types";
import { PHASE_COLORS } from "./constants";

// ── Confirmation hook: first tap arms, second tap fires ──
function useConfirmAction(action: () => void, timeout = 2000) {
  const [armed, setArmed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleClick = useCallback(() => {
    if (armed) {
      clear();
      setArmed(false);
      action();
    } else {
      setArmed(true);
      clear();
      timerRef.current = setTimeout(() => setArmed(false), timeout);
    }
  }, [armed, action, timeout, clear]);

  // Cleanup on unmount
  useEffect(() => clear, [clear]);

  // Reset armed state when phase changes (action ref changes)
  useEffect(() => {
    setArmed(false);
    clear();
  }, [action, clear]);

  return { armed, handleClick };
}

const CONFIRM_RING = "0 0 0 3px var(--gold-dark)";


export interface TabataControlsProps {
  phase: TimerPhase;
  isRunning: boolean;
  hasExercises: boolean;
  canPrev: boolean;
  canNext: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSkipPhase: () => void;
  onRestartPhase: () => void;
}

const NAV_BTN: React.CSSProperties = {
  width: 52,
  height: 52,
  borderRadius: "50%",
  border: "none",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all .2s",
  background: "var(--secondary)",
  color: "var(--foreground)",
};

const RESET_BTN: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: "50%",
  border: "none",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all .2s",
  background: "var(--secondary)",
  color: "var(--muted-foreground)",
};

export function TabataControls({
  phase,
  isRunning,
  hasExercises,
  canPrev,
  canNext,
  onStart,
  onPause,
  onResume,
  onReset,
  onNext,
  onPrev,
  onSkipPhase,
  onRestartPhase,
}: TabataControlsProps) {
  const colors = PHASE_COLORS[phase];

  // Hooks must be called before any early returns
  const confirmPrev = useConfirmAction(onPrev);
  const confirmNext = useConfirmAction(onNext);
  const confirmRestart = useConfirmAction(onRestartPhase);
  const confirmSkipPhase = useConfirmAction(onSkipPhase);

  const mainBtn: React.CSSProperties = {
    width: 72,
    height: 72,
    borderRadius: "50%",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all .2s",
    background: colors.accent,
    color: "var(--background)",
  };

  // ── Idle ──
  if (phase === "idle") {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 20,
        }}
      >
        <button className="timer-btn" style={mainBtn} onClick={onStart} aria-label="Iniciar">
          <Play size={28} fill="currentColor" />
        </button>
      </div>
    );
  }

  // ── Finished ──
  if (phase === "finished") {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 20,
        }}
      >
        <button
          className="timer-btn"
          style={{ ...mainBtn, background: "var(--gold-dark)" }}
          onClick={onReset}
          aria-label="Reiniciar"
        >
          <RotateCcw size={28} />
        </button>
      </div>
    );
  }

  // ── Exercise complete — advance to next ──
  if (phase === "exerciseComplete") {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 16,
        }}
      >
        {canPrev && (
          <button
            className="timer-btn"
            style={NAV_BTN}
            onClick={onPrev}
            aria-label="Ejercicio anterior"
          >
            <SkipBack size={22} />
          </button>
        )}
        <button
          className="timer-btn"
          style={{ ...mainBtn, background: "var(--green)" }}
          onClick={onNext}
          aria-label="Siguiente ejercicio"
        >
          <SkipForward size={28} fill="currentColor" />
        </button>
        <button className="timer-btn" style={RESET_BTN} onClick={onReset} aria-label="Reiniciar">
          <RotateCcw size={18} />
        </button>
      </div>
    );
  }

  // ── Running / Paused ──
  const canSkipPhase = phase === "work" || phase === "rest" || phase === "countdown";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}
    >
      {/* Main row: nav + play/pause + nav + restart */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 16,
        }}
      >
        {hasExercises && (
          <button
            className="timer-btn"
            style={{
              ...NAV_BTN,
              opacity: canPrev ? 1 : 0.3,
              boxShadow: confirmPrev.armed ? CONFIRM_RING : "none",
              background: confirmPrev.armed ? "var(--confirm-bg)" : "var(--secondary)",
              color: confirmPrev.armed ? "var(--gold-dark)" : "var(--foreground)",
            }}
            onClick={confirmPrev.handleClick}
            disabled={!canPrev}
            aria-label={confirmPrev.armed ? "Confirmar: ejercicio anterior" : "Ejercicio anterior"}
          >
            <SkipBack size={22} />
          </button>
        )}

        <button
          className="timer-btn"
          style={mainBtn}
          onClick={isRunning ? onPause : onResume}
          aria-label={isRunning ? "Pausar" : "Reanudar"}
        >
          {isRunning ? (
            <Pause size={28} fill="currentColor" />
          ) : (
            <Play size={28} fill="currentColor" />
          )}
        </button>

        {hasExercises && (
          <button
            className="timer-btn"
            style={{
              ...NAV_BTN,
              opacity: canNext ? 1 : 0.3,
              boxShadow: confirmNext.armed ? CONFIRM_RING : "none",
              background: confirmNext.armed ? "var(--confirm-bg)" : "var(--secondary)",
              color: confirmNext.armed ? "var(--gold-dark)" : "var(--foreground)",
            }}
            onClick={confirmNext.handleClick}
            disabled={!canNext}
            aria-label={confirmNext.armed ? "Confirmar: siguiente serie" : "Siguiente serie"}
          >
            <SkipForward size={22} />
          </button>
        )}

        <button
          className="timer-btn"
          style={{
            ...RESET_BTN,
            boxShadow: confirmRestart.armed ? CONFIRM_RING : "none",
            background: confirmRestart.armed ? "var(--confirm-bg)" : "var(--secondary)",
            color: confirmRestart.armed ? "var(--gold-dark)" : "var(--muted-foreground)",
          }}
          onClick={confirmRestart.handleClick}
          aria-label={confirmRestart.armed ? "Confirmar: reiniciar fase" : "Reiniciar fase actual"}
        >
          <RotateCcw size={18} />
        </button>
      </div>

      {/* LISTO button — skip current phase */}
      {canSkipPhase && (
        <button
          className="timer-btn"
          onClick={confirmSkipPhase.handleClick}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "8px 28px",
            borderRadius: 10,
            border: confirmSkipPhase.armed ? "1px solid var(--gold-dark)" : "1px solid var(--border)",
            background: confirmSkipPhase.armed
              ? "color-mix(in srgb, var(--confirm-bg) 90%, transparent)"
              : "color-mix(in srgb, var(--card) 85%, transparent)",
            color: confirmSkipPhase.armed ? "var(--gold-dark)" : "var(--green)",
            cursor: "pointer",
            fontFamily: "var(--font-display)",
            fontSize: 14,
            letterSpacing: ".06em",
            transition: "all .2s",
          }}
          aria-label={confirmSkipPhase.armed ? "Confirmar: saltar fase" : "Listo — saltar fase"}
        >
          <Check size={16} />
          {confirmSkipPhase.armed ? "CONFIRMAR" : "LISTO"}
        </button>
      )}
    </div>
  );
}

export default TabataControls;
