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
  /** Next exercise from a different group (for stacked depth preview) */
  nextExercise?: TabataExercise | null;
  /**
   * When true, hide the previous intensity mini card (the strikethrough
   * "% done" label). Used when transitioning to a different exercise to
   * reduce visual noise.
   */
  hidePrevIntensityCard?: boolean;
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
        const isCurrent = isDuringRest
          ? i === currentIndex + 1
          : i === currentIndex;
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

/* ── Compact stat strip for stacked next card ── */
function StatStrip({ exercise }: { exercise: TabataExercise }) {
  const stats = [
    { label: "SERIES", value: String(exercise.series), unit: null },
    { label: "REPS", value: exercise.reps || "—", unit: null },
    {
      label: "CARGA",
      value: exercise.kg != null ? String(exercise.kg) : "—",
      unit: exercise.kg != null ? " kg" : null,
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        background: "var(--surface-inset)",
      }}
    >
      {stats.map((stat, i) => (
        <React.Fragment key={stat.label}>
          {i > 0 && (
            <div
              style={{
                width: 1,
                alignSelf: "stretch",
                margin: "8px 0",
                background: "var(--border)",
              }}
            />
          )}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "8px 0",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 8,
                letterSpacing: ".1em",
                color: "var(--muted-foreground)",
                marginBottom: 2,
              }}
            >
              {stat.label}
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 15,
                fontWeight: 700,
                color: "var(--foreground)",
              }}
            >
              {stat.value}
              {stat.unit && (
                <span
                  style={{
                    fontSize: 10,
                    color: "var(--gold-dark)",
                    fontWeight: 500,
                  }}
                >
                  {stat.unit}
                </span>
              )}
            </div>
          </div>
        </React.Fragment>
      ))}
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
  nextExercise,
  hidePrevIntensityCard = false,
}: TabataExerciseInfoProps) {
  const catColor = CAT_COLORS[exercise.category] || "var(--muted-foreground)";
  const isGrouped =
    exercise.totalIntensities != null && exercise.totalIntensities > 1;
  const isIntensityRest = phase === "intensityRest";

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

      {/* ── Intensity steps (grouped exercises only) ── */}
      {isGrouped &&
        exercise.totalIntensities != null &&
        exercise.intensityIndex != null && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 8,
            }}
          >
            <IntensitySteps
              currentIndex={exercise.intensityIndex}
              total={exercise.totalIntensities}
              isDuringRest={isIntensityRest}
            />
          </div>
        )}

      {/* ── Previous intensity mini card ── */}
      {isGrouped && prevGroupExercise && !hidePrevIntensityCard && (
        <div style={{ marginBottom: 6 }}>
          <IntensityMiniCard exercise={prevGroupExercise} variant="done" />
        </div>
      )}

      {/* ══ Main HUD Panel ══ */}
      <div
        style={{
          border: isIntensityRest
            ? "1.5px solid var(--gold-dark)"
            : "1px solid color-mix(in srgb, var(--gold-dark) 25%, var(--border))",
          borderRadius: 16,
          background: "var(--card)",
          overflow: "hidden",
          position: "relative",
          boxShadow: "0 0 24px rgba(232,197,71,.15)",
          zIndex: 3,
        }}
      >
        {/* Top highlight line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background:
              "linear-gradient(90deg, transparent, var(--gold-dark), transparent)",
          }}
        />

        {/* Header: badge + name + intensity */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 16px 10px",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 800,
              color: "var(--card)",
              background: catColor,
              flexShrink: 0,
            }}
          >
            {exerciseIndex + 1}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "var(--foreground)",
                fontFamily: "var(--font-sans)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {exercise.name}
            </div>
            {isGrouped && exercise.intensityLabel && (
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 13,
                  color: "var(--gold)",
                  letterSpacing: ".02em",
                  marginTop: 2,
                }}
              >
                {exercise.intensityLabel}
              </div>
            )}
          </div>
        </div>

        {/* ── HUD Stat Pods: SERIES / REPS / CARGA ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 8,
            padding: "8px 16px 14px",
          }}
        >
          {[
            { label: "SERIES", value: String(exercise.series), active: true },
            { label: "REPS", value: exercise.reps || "—", active: false },
            {
              label: "CARGA",
              value: exercise.kg != null ? String(exercise.kg) : "—",
              unit: exercise.kg != null ? " kg" : null,
              active: false,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: "var(--surface-inset)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "10px 4px",
                position: "relative",
              }}
            >
              {stat.active && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: "20%",
                    right: "20%",
                    height: 2,
                    borderRadius: 1,
                    background: "var(--gold-dark)",
                  }}
                />
              )}
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 9,
                  letterSpacing: ".1em",
                  color: "var(--muted-foreground)",
                  marginBottom: 4,
                }}
              >
                {stat.label}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 20,
                  fontWeight: 700,
                  color: "var(--foreground)",
                  lineHeight: 1,
                }}
              >
                {stat.value}
                {"unit" in stat && stat.unit && (
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--gold-dark)",
                      fontWeight: 500,
                    }}
                  >
                    {stat.unit}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ── Series progress bar ── */}
        {currentRound != null && totalRounds != null && totalRounds > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 16px",
              borderTop: "1px solid var(--border)",
              background: "var(--surface-inset)",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 11,
                letterSpacing: ".06em",
                color: "var(--muted-foreground)",
              }}
            >
              SERIE
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                fontWeight: 700,
                color: "var(--foreground)",
              }}
            >
              {currentRound}/{totalRounds}
            </span>
            <div style={{ display: "flex", gap: 5, marginLeft: "auto" }}>
              {Array.from({ length: totalRounds }, (_, i) => (
                <div
                  key={i}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background:
                      i < (currentRound ?? 0) - 1
                        ? "var(--green)"
                        : i === (currentRound ?? 0) - 1
                          ? "var(--gold)"
                          : "rgba(232,197,71,.12)",
                    boxShadow:
                      i === (currentRound ?? 0) - 1
                        ? "0 0 8px rgba(232,197,71,.15)"
                        : "none",
                    transition: "all .3s",
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Notes ── */}
        {exercise.notes && (
          <div
            style={{
              padding: "6px 16px 8px",
              fontSize: 10,
              color: "var(--muted-foreground)",
              fontStyle: "italic",
              background: "var(--surface-inset)",
              borderTop: "1px solid var(--border)",
            }}
          >
            {exercise.notes}
          </div>
        )}
      </div>

      {/* ── CARGÁ LA BARRA banner (intensityRest phase) ── */}
      {isIntensityRest && nextGroupExercise && (
        <div
          style={{
            marginTop: 8,
            padding: "10px 16px",
            background:
              "color-mix(in srgb, var(--gold-dark) 10%, var(--card))",
            border: "1px solid var(--gold-dark)",
            borderRadius: 12,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 14,
              color: "var(--gold)",
              letterSpacing: ".08em",
              marginBottom: 4,
            }}
          >
            CARGÁ LA BARRA
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 16,
              fontWeight: 700,
              color: "var(--foreground)",
            }}
          >
            {nextGroupExercise.series}×{nextGroupExercise.reps || "—"}
            {nextGroupExercise.kg != null && (
              <span style={{ marginLeft: 8, color: "var(--gold-dark)" }}>
                {nextGroupExercise.kg}
                <span style={{ fontSize: 11 }}> kg</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Next intensity mini card (grouped, not during intensityRest) ── */}
      {isGrouped && nextGroupExercise && !isIntensityRest && (
        <div style={{ marginTop: 6 }}>
          <IntensityMiniCard exercise={nextGroupExercise} variant="upcoming" />
        </div>
      )}

      {/* ── Stacked next exercise card (depth effect) ── */}
      {nextExercise &&
        !isIntensityRest &&
        (() => {
          const nc =
            CAT_COLORS[nextExercise.category] || "var(--muted-foreground)";
          return (
            <>
              {/* Divider */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "12px 0 6px",
                }}
              >
                <div
                  style={{
                    flex: 1,
                    maxWidth: 40,
                    height: 1,
                    background:
                      "color-mix(in srgb, var(--gold-dark) 25%, transparent)",
                  }}
                />
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 10,
                    letterSpacing: ".1em",
                    color: "var(--gold-dark)",
                  }}
                >
                  SIGUIENTE
                </span>
                <div
                  style={{
                    flex: 1,
                    maxWidth: 40,
                    height: 1,
                    background:
                      "color-mix(in srgb, var(--gold-dark) 25%, transparent)",
                  }}
                />
              </div>

              {/* Stacked card at 96% scale */}
              <div
                style={{
                  transform: "scale(.96)",
                  transformOrigin: "top center",
                  opacity: 0.75,
                  position: "relative",
                  zIndex: 2,
                }}
              >
                <div
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 14,
                    background: "var(--card)",
                    overflow: "hidden",
                  }}
                >
                  {/* Compact header */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 14px",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 800,
                        color: "var(--card)",
                        background: nc,
                        flexShrink: 0,
                      }}
                    >
                      {exerciseIndex + 2}
                    </div>
                    <div
                      style={{
                        flex: 1,
                        fontSize: 14,
                        fontWeight: 700,
                        color: "var(--foreground)",
                        fontFamily: "var(--font-sans)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {nextExercise.name}
                    </div>
                  </div>

                  {/* Compact stat strip */}
                  <StatStrip exercise={nextExercise} />
                </div>
              </div>
            </>
          );
        })()}
    </div>
  );
}

export default TabataExerciseInfo;
