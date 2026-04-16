"use client";

import React from "react";
import type { TimerPhase } from "./types";
import { PHASE_COLORS, PHASE_LABELS } from "./constants";

interface TabataDisplayProps {
  phase: TimerPhase;
  timeLeft: number;
  totalPhaseTime: number;
  currentRound: number;
  totalRounds: number;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function TabataDisplay({
  phase,
  timeLeft,
  totalPhaseTime,
  currentRound,
  totalRounds,
}: TabataDisplayProps) {
  const colors = PHASE_COLORS[phase];
  const label = PHASE_LABELS[phase];

  const radius = 120;
  const strokeWidth = 8;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = 2 * Math.PI * normalizedRadius;

  const isActive =
    phase === "work" || phase === "rest" || phase === "countdown";
  const progress = isActive ? (totalPhaseTime - timeLeft) / totalPhaseTime : 0;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}
    >
      {/* Phase label */}
      <div
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 28,
          letterSpacing: ".08em",
          color: colors.accent,
          textAlign: "center",
          minHeight: 36,
          transition: "color .3s ease",
        }}
      >
        {label}
      </div>

      {/* Circular progress */}
      <div
        style={{
          position: "relative",
          width: radius * 2,
          height: radius * 2,
        }}
      >
        <svg
          width={radius * 2}
          height={radius * 2}
          style={{ transform: "rotate(-90deg)" }}
        >
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            fill="none"
            stroke="#1e2733"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            fill="none"
            stroke={colors.accent}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: "stroke-dashoffset .95s linear, stroke .3s ease",
            }}
          />
        </svg>

        {/* Time centered */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: phase === "countdown" ? 80 : 56,
              color: colors.accent,
              letterSpacing: ".02em",
              lineHeight: 1,
              transition: "font-size .3s ease, color .3s ease",
            }}
          >
            {phase === "idle"
              ? "—"
              : phase === "finished" || phase === "exerciseComplete"
                ? "✓"
                : phase === "countdown"
                  ? timeLeft
                  : formatTime(timeLeft)}
          </div>
        </div>
      </div>

      {/* Round info */}
      {(phase === "work" || phase === "rest") && (
        <div
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
            color: "#8a95a8",
            textAlign: "center",
          }}
        >
          Serie {currentRound} de {totalRounds}
        </div>
      )}
    </div>
  );
}
