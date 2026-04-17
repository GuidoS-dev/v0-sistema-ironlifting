"use client";

import React from "react";
import type { TabataExercise, TimerPhase } from "./types";
import { CAT_COLORS } from "./constants";
import { Check, ArrowDown } from "lucide-react";

export interface TabataExerciseInfoProps {
  exercise: TabataExercise;
  exerciseIndex: number;
  totalExercises: number;
  currentRound?: number;
  totalRounds?: number;
  /** Previous exercise in the same intensity group (already done) */
  prevGroupExercise?: TabataExercise | null;
  /** Next exercise in the same intensity group (upcoming) */
  nextGroupExercise?: TabataExercise | null;
  /** Grouped exercise counter (1-based) */
  groupIndex?: number;
  /** Total groups */
  totalGroups?: number;
  /** Current timer phase */
  phase?: TimerPhase;
}

/* ── Mini card for prev/next intensity in the wheel ── */
function IntensityMiniCard({
  exercise,
  variant,
}: {
  exercise: TabataExercise;
  variant: "done" | "upcoming";
}) {
  const isDone = variant === "done";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 12px",
        borderRadius: 8,
        background: "var(--surface-inset)",
        border: "1px solid var(--border)",
        opacity: isDone ? 0.55 : 0.7,
        transition: "opacity .3s",
      }}
    >
      {isDone ? (
        <Check size={13} color="var(--green)" strokeWidth={3} />
      ) : (
        <ArrowDown size={13} color="var(--gold-dark)" strokeWidth={2} />
      )}
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: isDone ? "var(--green)" : "var(--foreground)",
          fontFamily: "var(--font-sans)",
          textDecoration: isDone ? "line-through" : "none",
          flex: 1,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {exercise.intensityLabel || exercise.name}
      </span>
      {exercise.kg != null && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: isDone ? "var(--muted-foreground)" : "var(--gold-dark)",
            fontFamily: "var(--font-sans)",
            whiteSpace: "nowrap",
          }}
        >
          {exercise.kg} kg
        </span>
      )}
      {exercise.reps && (
        <span
          style={{
            fontSize: 10,
            color: "var(--muted-foreground)",
            fontFamily: "var(--font-sans)",
          }}
        >
          {exercise.series}×{exercise.reps}
        </span>
      )}
    </div>
  );
}

/* ── Intensity step dots ── */
function IntensitySteps({
  currentIndex,
  total,
  isDuringRest,
}: {
  currentIndex: number;
  total: number;
  isDuringRest: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {Array.from({ length: total }, (_, i) => {
        const isDone = isDuringRest ? i <= currentIndex : i < currentIndex;
        const isCurrent = isDuringRest ? i === currentIndex + 1 : i === currentIndex;
        return (
          <div
            key={i}
            style={{
              width: isCurrent ? 20 : 8,
              height: 8,
              borderRadius: 4,
              background: isDone
                ? "var(--green)"
                : isCurrent
                  ? "var(--gold-dark)"
                  : "var(--border)",
              transition: "all .3s",
            }}
          />
        );
      })}
    </div>
  );
}

export function TabataExerciseInfo({
  exercise,
  exerciseIndex,
  totalExercises,
  currentRound,
  totalRounds,
  prevGroupExercise,
  nextGroupExercise,
  groupIndex,
  totalGroups,
  phase,
}: TabataExerciseInfoProps) {
  const catColor = CAT_COLORS[exercise.category] || "var(--muted-foreground)";
  const isGrouped = exercise.totalIntensities != null && exercise.totalIntensities > 1;
  const isIntensityRest = phase === "intensityRest";

  // Counter text: use grouped count if available
  const counterLabel =
    groupIndex != null && totalGroups != null
      ? `Ejercicio ${groupIndex + 1} de ${totalGroups}`
      : `Ejercicio ${exerciseIndex + 1} de ${totalExercises}`;

  return (
    <div style={{ width: "100%", padding: "0 16px" }}>
      {/* Exercise counter */}
      <div
        style={{
          fontSize: 10,
          color: "var(--muted-foreground)",
          textTransform: "uppercase",
          letterSpacing: ".06em",
          textAlign: "center",
          marginBottom: 8,
        }}
      >
        {counterLabel}
      </div>

      {/* ── Wheel layout for grouped intensities ── */}
      {isGrouped ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            alignItems: "stretch",
          }}
        >
          {/* Previous intensity mini card */}
          {prevGroupExercise && (
            <IntensityMiniCard exercise={prevGroupExercise} variant="done" />
          )}

          {/* Main card */}
          <div
            style={{
              background: "var(--card)",
              border: isIntensityRest
                ? "1.5px solid var(--gold-dark)"
                : "1px solid var(--border)",
              borderRadius: 10,
              overflow: "hidden",
              boxShadow: isIntensityRest
                ? "0 0 16px rgba(232,197,71,.15)"
                : "0 3px 12px rgba(0,0,0,.28)",
              transition: "border .3s, box-shadow .3s",
            }}
          >
            {/* Header: base name + intensity label */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                borderBottom: "1px solid var(--border)",
                background: "var(--card)",
              }}
            >
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
                    color: "var(--card)",
                    opacity: 0.9,
                  }}
                >
                  {(groupIndex ?? exerciseIndex) + 1}
                </span>
              </div>
              <div style={{ flex: 1, padding: "10px 12px 10px 8px" }}>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 14,
                    fontWeight: 700,
                    color: "var(--foreground)",
                    letterSpacing: ".01em",
                    lineHeight: 1.2,
                  }}
                >
                  {exercise.baseName || exercise.name}
                </div>
                {/* Intensity label + step dots */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 6,
                  }}
                >
                  {exercise.intensityLabel && (
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 800,
                        color: isIntensityRest ? "var(--gold)" : "var(--gold-dark)",
                        fontFamily: "var(--font-display)",
                        letterSpacing: ".02em",
                      }}
                    >
                      {exercise.intensityLabel}
                    </span>
                  )}
                  {exercise.intensityIndex != null && exercise.totalIntensities != null && (
                    <IntensitySteps
                      currentIndex={exercise.intensityIndex}
                      total={exercise.totalIntensities}
                      isDuringRest={isIntensityRest}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* "CARGÁ LA BARRA" banner during intensity rest */}
            {isIntensityRest && nextGroupExercise && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "10px 14px",
                  background: "color-mix(in srgb, var(--gold-dark) 12%, var(--background))",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <ArrowDown size={14} color="var(--gold)" />
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 12,
                    letterSpacing: ".06em",
                    color: "var(--gold)",
                    fontWeight: 700,
                  }}
                >
                  CARGÁ LA BARRA
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 16,
                    fontWeight: 800,
                    color: "var(--foreground)",
                    letterSpacing: "-.02em",
                  }}
                >
                  {nextGroupExercise.kg != null ? `${nextGroupExercise.kg} kg` : "—"}
                </span>
              </div>
            )}

            {/* Series progress indicator */}
            {currentRound != null && totalRounds != null && totalRounds > 0 && !isIntensityRest && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  background: "var(--background)",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 12,
                    color: "var(--muted-foreground)",
                    letterSpacing: ".04em",
                  }}
                >
                  SERIE
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 14,
                    color: "var(--foreground)",
                    letterSpacing: ".04em",
                  }}
                >
                  {currentRound}
                  <span style={{ color: "var(--muted-foreground)" }}> / </span>
                  {totalRounds}
                </span>
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
                            ? "var(--green)"
                            : i === currentRound - 1
                              ? "var(--gold-dark)"
                              : "var(--border)",
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
                borderBottom: exercise.notes ? "1px solid var(--secondary)" : "none",
                minHeight: 42,
                background: "var(--surface-inset)",
              }}
            >
              <div
                style={{
                  width: 48,
                  minWidth: 48,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  alignSelf: "stretch",
                  background: "var(--card)",
                  borderRight: "1px solid var(--border)",
                  color: "var(--gold-dark)",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {exercise.series}×
              </div>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 0,
                  padding: "10px 14px",
                  fontFamily: "var(--font-sans)",
                }}
              >
                {exercise.reps && (
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 800,
                        color: "var(--foreground)",
                        background: "var(--badge-bg)",
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
                          color: "var(--gold-dark)",
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
                        color: "var(--foreground)",
                        background: "var(--badge-bg)",
                        padding: "5px 10px 5px 0",
                        borderRadius: "0 6px 6px 0",
                        letterSpacing: "-.3px",
                      }}
                    >
                      {exercise.reps}
                    </span>
                  </div>
                )}
                {exercise.kg != null && (
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 800,
                      color: "var(--foreground)",
                      background: "var(--badge-bg)",
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
                        color: "var(--gold-dark)",
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
                  color: "var(--muted-foreground)",
                  fontStyle: "italic",
                  background: "var(--surface-inset)",
                }}
              >
                {exercise.notes}
              </div>
            )}
          </div>

          {/* Next intensity mini card */}
          {nextGroupExercise && !isIntensityRest && (
            <IntensityMiniCard exercise={nextGroupExercise} variant="upcoming" />
          )}
        </div>
      ) : (
        /* ── Single exercise card (unchanged original layout) ── */
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
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
              borderBottom: "1px solid var(--border)",
              background: "var(--card)",
            }}
          >
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
                  color: "var(--card)",
                  opacity: 0.9,
                }}
              >
                {exerciseIndex + 1}
              </span>
            </div>
            <div
              style={{
                flex: 1,
                padding: "12px 12px 12px 8px",
                fontFamily: "var(--font-sans)",
                fontSize: 14,
                fontWeight: 700,
                color: "var(--foreground)",
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
                background: "var(--background)",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 12,
                  color: "var(--muted-foreground)",
                  letterSpacing: ".04em",
                }}
              >
                SERIE
              </span>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 14,
                  color: "var(--foreground)",
                  letterSpacing: ".04em",
                }}
              >
                {currentRound}
                <span style={{ color: "var(--muted-foreground)" }}> / </span>
                {totalRounds}
              </span>
              <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
                {Array.from({ length: totalRounds }, (_, i) => (
                  <div
                    key={i}
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background:
                        i < (currentRound ?? 0) - 1
                          ? "var(--green)"
                          : i === (currentRound ?? 0) - 1
                            ? "var(--gold-dark)"
                            : "var(--border)",
                      transition: "background .3s",
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Data row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: 0,
              borderBottom: exercise.notes ? "1px solid var(--secondary)" : "none",
              minHeight: 42,
              background: "var(--surface-inset)",
            }}
          >
            <div
              style={{
                width: 48,
                minWidth: 48,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                alignSelf: "stretch",
                background: "var(--card)",
                borderRight: "1px solid var(--border)",
                color: "var(--gold-dark)",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {exercise.series}×
            </div>
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: 0,
                padding: "10px 14px",
                fontFamily: "var(--font-sans)",
              }}
            >
              {exercise.reps && (
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 800,
                      color: "var(--foreground)",
                      background: "var(--badge-bg)",
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
                        color: "var(--gold-dark)",
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
                      color: "var(--foreground)",
                      background: "var(--badge-bg)",
                      padding: "5px 10px 5px 0",
                      borderRadius: "0 6px 6px 0",
                      letterSpacing: "-.3px",
                    }}
                  >
                    {exercise.reps}
                  </span>
                </div>
              )}
              {exercise.kg != null && (
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: "var(--foreground)",
                    background: "var(--badge-bg)",
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
                      color: "var(--gold-dark)",
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
                color: "var(--muted-foreground)",
                fontStyle: "italic",
                background: "var(--surface-inset)",
              }}
            >
              {exercise.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TabataExerciseInfo;
