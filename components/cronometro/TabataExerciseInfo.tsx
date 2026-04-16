"use client";

import React from "react";
import type { TabataExercise } from "./types";
import { CAT_COLORS } from "./constants";

interface TabataExerciseInfoProps {
  exercise: TabataExercise;
  exerciseIndex: number;
  totalExercises: number;
  currentRound?: number;
  totalRounds?: number;
}

export default function TabataExerciseInfo({
  exercise,
  exerciseIndex,
  totalExercises,
  currentRound,
  totalRounds,
}: TabataExerciseInfoProps) {
  const catColor = CAT_COLORS[exercise.category] || "#888";

  return (
    <div style={{ width: "100%", padding: "0 16px" }}>
      {/* Exercise counter */}
      <div
        style={{
          fontSize: 10,
          color: "#888",
          textTransform: "uppercase",
          letterSpacing: ".06em",
          textAlign: "center",
          marginBottom: 8,
        }}
      >
        Ejercicio {exerciseIndex + 1} de {totalExercises}
      </div>

      {/* PDF-style dark card */}
      <div
        style={{
          background: "#0d1117",
          border: "1px solid #1e2733",
          borderRadius: 10,
          overflow: "hidden",
          boxShadow: "0 3px 12px rgba(0,0,0,.28)",
        }}
      >
        {/* Header: badge + name */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            borderBottom: "1px solid #1e2733",
            background: "#0d1117",
          }}
        >
          {/* Category badge */}
          <div
            style={{
              width: 48,
              minWidth: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              alignSelf: "stretch",
            }}
          >
            <span
              style={{
                fontSize: 9,
                fontWeight: 800,
                padding: "2px 5px",
                borderRadius: 3,
                background: catColor,
                color: "#0d1117",
                opacity: 0.9,
              }}
            >
              {exerciseIndex + 1}
            </span>
          </div>
          {/* Name */}
          <div
            style={{
              flex: 1,
              padding: "12px 12px 12px 8px",
              fontFamily:
                "'Helvetica Neue', Helvetica, Arial, sans-serif",
              fontSize: 14,
              fontWeight: 700,
              color: "#e8e8e8",
              letterSpacing: ".01em",
              lineHeight: 1.2,
            }}
          >
            {exercise.name}
          </div>
        </div>

        {/* Series progress indicator */}
        {currentRound != null && totalRounds != null && totalRounds > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              background: "#0a0c10",
              borderBottom: "1px solid #1e2733",
            }}
          >
            <span
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 12,
                color: "#8a95a8",
                letterSpacing: ".04em",
              }}
            >
              SERIE
            </span>
            <span
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 14,
                color: "#e8eaf0",
                letterSpacing: ".04em",
              }}
            >
              {currentRound}
              <span style={{ color: "#6b7590" }}> / </span>
              {totalRounds}
            </span>
            {/* Mini dots */}
            <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
              {Array.from({ length: totalRounds }, (_, i) => (
                <div
                  key={i}
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background:
                      i < currentRound - 1
                        ? "#47e8a0"
                        : i === currentRound - 1
                          ? "#d4a832"
                          : "#1e2733",
                    transition: "background .3s",
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Data row: series × reps | kg */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: 0,
            borderBottom: exercise.notes
              ? "1px solid #1a2030"
              : "none",
            minHeight: 42,
            background: "#0f1520",
          }}
        >
          {/* Series label */}
          <div
            style={{
              width: 48,
              minWidth: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              alignSelf: "stretch",
              background: "#0d1117",
              borderRight: "1px solid #1e2733",
              color: "#d4a832",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {exercise.series}×
          </div>

          {/* Series × Reps + Kg badges */}
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: 0,
              padding: "10px 14px",
              fontFamily:
                "'Helvetica Neue', Helvetica, Arial, sans-serif",
            }}
          >
            {/* S×R mini-card */}
            {exercise.reps && (
              <div style={{ display: "flex", alignItems: "center" }}>
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: "#fff",
                    background: "#1a1a2e",
                    padding: "5px 0 5px 10px",
                    borderRadius: "6px 0 0 6px",
                    letterSpacing: "-.3px",
                  }}
                >
                  {exercise.series}
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#d4a832",
                      margin: "0 2px",
                    }}
                  >
                    ×
                  </span>
                </span>
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: "#fff",
                    background: "#1a1a2e",
                    padding: "5px 10px 5px 0",
                    borderRadius: "0 6px 6px 0",
                    letterSpacing: "-.3px",
                  }}
                >
                  {exercise.reps}
                </span>
              </div>
            )}

            {/* Kg mini-card */}
            {exercise.kg != null && (
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: "#fff",
                  background: "#1a1a2e",
                  padding: "5px 10px",
                  borderRadius: 6,
                  whiteSpace: "nowrap",
                  marginLeft: 6,
                }}
              >
                {exercise.kg}
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#d4a832",
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

        {/* Notes */}
        {exercise.notes && (
          <div
            style={{
              padding: "6px 14px 8px 62px",
              fontSize: 10,
              color: "#8a95a8",
              fontStyle: "italic",
              background: "#0f1520",
            }}
          >
            {exercise.notes}
          </div>
        )}
      </div>
    </div>
  );
}
