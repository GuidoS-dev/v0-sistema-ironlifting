import { useReducer, useEffect, useRef, useCallback } from "react";
import type {
  TimerState,
  TimerAction,
  TabataConfig,
  TabataExercise,
} from "../types";

const INITIAL_STATE: TimerState = {
  phase: "idle",
  timeLeft: 0,
  currentRound: 1,
  totalRounds: 1,
  isRunning: false,
  currentExerciseIndex: 0,
};

function timerReducer(state: TimerState, action: TimerAction): TimerState {
  switch (action.type) {
    case "START":
      return {
        ...state,
        phase: "countdown",
        timeLeft: action.countdownTime,
        totalRounds: action.totalRounds,
        currentRound: 1,
        isRunning: true,
      };

    case "TICK": {
      if (
        !state.isRunning ||
        state.phase === "idle" ||
        state.phase === "finished" ||
        state.phase === "exerciseComplete"
      ) {
        return state;
      }

      const newTimeLeft = state.timeLeft - 1;
      if (newTimeLeft > 0) {
        return { ...state, timeLeft: newTimeLeft };
      }

      // timeLeft reached 0 — transition to next phase
      const { config, exerciseCount } = action;

      switch (state.phase) {
        case "countdown":
          return { ...state, phase: "work", timeLeft: config.workTime };

        case "work": {
          const isLastRound = state.currentRound >= state.totalRounds;
          if (isLastRound) {
            const hasMore =
              exerciseCount > 0 &&
              state.currentExerciseIndex < exerciseCount - 1;
            if (hasMore) {
              // If next exercise is in the same intensity group → auto-rest
              if (action.nextExerciseSameGroup) {
                return {
                  ...state,
                  phase: "intensityRest",
                  timeLeft: config.restTime,
                  isRunning: true,
                };
              }
              return {
                ...state,
                phase: "exerciseComplete",
                timeLeft: 0,
                isRunning: false,
              };
            }
            return {
              ...state,
              phase: "finished",
              timeLeft: 0,
              isRunning: false,
            };
          }
          return { ...state, phase: "rest", timeLeft: config.restTime };
        }

        case "rest":
          return {
            ...state,
            phase: "work",
            timeLeft: config.workTime,
            currentRound: state.currentRound + 1,
          };

        case "intensityRest": {
          // Auto-advance to next exercise in the same group
          const nextIdx = state.currentExerciseIndex + 1;
          return {
            ...state,
            currentExerciseIndex: nextIdx,
            currentRound: 1,
            totalRounds: action.nextExerciseRounds ?? state.totalRounds,
            phase: "countdown",
            timeLeft: config.countdownTime,
            isRunning: true,
          };
        }

        default:
          return state;
      }
    }

    case "PAUSE":
      return { ...state, isRunning: false };

    case "RESUME":
      return { ...state, isRunning: true };

    case "RESET":
      return { ...INITIAL_STATE };

    case "NEXT_EXERCISE": {
      const nextIdx = state.currentExerciseIndex + 1;
      return {
        ...state,
        currentExerciseIndex: nextIdx,
        currentRound: 1,
        totalRounds: action.exerciseRounds[nextIdx] ?? state.totalRounds,
        phase: "countdown",
        timeLeft: action.countdownTime,
        isRunning: true,
      };
    }

    case "PREV_EXERCISE": {
      const prevIdx = Math.max(0, state.currentExerciseIndex - 1);
      return {
        ...state,
        currentExerciseIndex: prevIdx,
        currentRound: 1,
        totalRounds: action.exerciseRounds[prevIdx] ?? state.totalRounds,
        phase: "countdown",
        timeLeft: action.countdownTime,
        isRunning: true,
      };
    }

    case "SKIP_FORWARD": {
      // More rounds left → advance to next round
      if (state.currentRound < state.totalRounds) {
        return {
          ...state,
          phase: "countdown",
          timeLeft: action.countdownTime,
          currentRound: state.currentRound + 1,
          isRunning: true,
        };
      }
      // Last round — move to next exercise if available
      const nextIdx = state.currentExerciseIndex + 1;
      const hasNext = action.exerciseCount > 0 && nextIdx < action.exerciseCount;
      if (hasNext) {
        return {
          ...state,
          currentExerciseIndex: nextIdx,
          currentRound: 1,
          totalRounds: action.exerciseRounds[nextIdx] ?? state.totalRounds,
          phase: "countdown",
          timeLeft: action.countdownTime,
          isRunning: true,
        };
      }
      // No more exercises — finished
      return {
        ...state,
        phase: "finished",
        timeLeft: 0,
        isRunning: false,
      };
    }

    case "SKIP_PHASE": {
      // Skip current phase → same logic as TICK reaching 0
      const { config, exerciseCount } = action;
      if (state.phase === "countdown") {
        return { ...state, phase: "work", timeLeft: config.workTime };
      }
      if (state.phase === "work") {
        const isLastRound = state.currentRound >= state.totalRounds;
        if (isLastRound) {
          const hasMore =
            exerciseCount > 0 &&
            state.currentExerciseIndex < exerciseCount - 1;
          if (hasMore) {
            if (action.nextExerciseSameGroup) {
              return {
                ...state,
                phase: "intensityRest",
                timeLeft: config.restTime,
                isRunning: true,
              };
            }
            return {
              ...state,
              phase: "exerciseComplete",
              timeLeft: 0,
              isRunning: false,
            };
          }
          return {
            ...state,
            phase: "finished",
            timeLeft: 0,
            isRunning: false,
          };
        }
        return { ...state, phase: "rest", timeLeft: config.restTime };
      }
      if (state.phase === "rest") {
        return {
          ...state,
          phase: "work",
          timeLeft: config.workTime,
          currentRound: state.currentRound + 1,
        };
      }
      if (state.phase === "intensityRest") {
        const nextIdx = state.currentExerciseIndex + 1;
        return {
          ...state,
          currentExerciseIndex: nextIdx,
          currentRound: 1,
          totalRounds: action.nextExerciseRounds ?? state.totalRounds,
          phase: "countdown",
          timeLeft: config.countdownTime,
          isRunning: true,
        };
      }
      return state;
    }

    case "RESTART_PHASE": {
      const { config } = action;
      if (state.phase === "countdown") {
        return { ...state, timeLeft: config.countdownTime, isRunning: true };
      }
      if (state.phase === "work") {
        return { ...state, timeLeft: config.workTime, isRunning: true };
      }
      if (state.phase === "rest" || state.phase === "intensityRest") {
        return { ...state, timeLeft: config.restTime, isRunning: true };
      }
      return state;
    }

    default:
      return state;
  }
}

export function useTabataTimer(
  config: TabataConfig,
  exercises: TabataExercise[] = [],
) {
  const [state, dispatch] = useReducer(timerReducer, INITIAL_STATE);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const configRef = useRef(config);
  configRef.current = config;

  const exerciseCount = exercises.length;

  // Pre-compute rounds array so actions don't rely on stale closure index
  const exerciseRoundsRef = useRef<number[]>([]);
  exerciseRoundsRef.current = exercises.map((e) => e.series);

  // Pre-compute baseId array for group detection
  const exerciseBaseIdsRef = useRef<(string | undefined)[]>([]);
  exerciseBaseIdsRef.current = exercises.map((e) => e.baseId);

  const getRoundsForExercise = useCallback(
    (idx: number) => {
      if (exercises.length > 0 && exercises[idx]) {
        return exercises[idx].series;
      }
      return config.rounds;
    },
    [exercises, config.rounds],
  );

  // Interval management
  useEffect(() => {
    if (state.isRunning) {
      intervalRef.current = setInterval(() => {
        const curIdx = state.currentExerciseIndex;
        const nextIdx = curIdx + 1;
        const curBase = exerciseBaseIdsRef.current[curIdx];
        const nextBase = exerciseBaseIdsRef.current[nextIdx];
        const nextSameGroup = !!(curBase && nextBase && curBase === nextBase);

        dispatch({
          type: "TICK",
          config: {
            workTime: configRef.current.workTime,
            restTime: configRef.current.restTime,
            countdownTime: configRef.current.countdownTime,
          },
          exerciseCount,
          nextExerciseSameGroup: nextSameGroup,
          nextExerciseRounds: exerciseRoundsRef.current[nextIdx],
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state.isRunning, state.currentExerciseIndex, exerciseCount]);

  const start = useCallback(() => {
    dispatch({
      type: "START",
      countdownTime: config.countdownTime,
      totalRounds: getRoundsForExercise(state.currentExerciseIndex),
    });
  }, [config.countdownTime, getRoundsForExercise, state.currentExerciseIndex]);

  const pause = useCallback(() => dispatch({ type: "PAUSE" }), []);
  const resume = useCallback(() => dispatch({ type: "RESUME" }), []);
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  const nextExercise = useCallback(() => {
    if (state.currentExerciseIndex < exerciseCount - 1) {
      dispatch({
        type: "NEXT_EXERCISE",
        exerciseRounds: exerciseRoundsRef.current,
        countdownTime: config.countdownTime,
      });
    }
  }, [
    state.currentExerciseIndex,
    exerciseCount,
    config.countdownTime,
  ]);

  const skipForward = useCallback(() => {
    dispatch({
      type: "SKIP_FORWARD",
      exerciseRounds: exerciseRoundsRef.current,
      countdownTime: config.countdownTime,
      exerciseCount,
    });
  }, [config.countdownTime, exerciseCount]);

  const prevExercise = useCallback(() => {
    if (state.currentExerciseIndex > 0) {
      dispatch({
        type: "PREV_EXERCISE",
        exerciseRounds: exerciseRoundsRef.current,
        countdownTime: config.countdownTime,
      });
    }
  }, [state.currentExerciseIndex, config.countdownTime]);

  const skipPhase = useCallback(() => {
    const curIdx = state.currentExerciseIndex;
    const nextIdx = curIdx + 1;
    const curBase = exerciseBaseIdsRef.current[curIdx];
    const nextBase = exerciseBaseIdsRef.current[nextIdx];
    const nextSameGroup = !!(curBase && nextBase && curBase === nextBase);

    dispatch({
      type: "SKIP_PHASE",
      config: { workTime: config.workTime, restTime: config.restTime, countdownTime: config.countdownTime },
      exerciseCount,
      nextExerciseSameGroup: nextSameGroup,
      nextExerciseRounds: exerciseRoundsRef.current[nextIdx],
    });
  }, [config.workTime, config.restTime, config.countdownTime, exerciseCount, state.currentExerciseIndex]);

  const restartPhase = useCallback(() => {
    dispatch({
      type: "RESTART_PHASE",
      config: {
        workTime: config.workTime,
        restTime: config.restTime,
        countdownTime: config.countdownTime,
      },
    });
  }, [config.workTime, config.restTime, config.countdownTime]);

  const totalPhaseTime = (() => {
    switch (state.phase) {
      case "countdown":
        return config.countdownTime;
      case "work":
        return config.workTime;
      case "rest":
      case "intensityRest":
        return config.restTime;
      default:
        return 1;
    }
  })();

  return {
    ...state,
    totalPhaseTime,
    actions: { start, pause, resume, reset, nextExercise, skipForward, prevExercise, skipPhase, restartPhase },
  };
}
