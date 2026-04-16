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

    case "NEXT_EXERCISE":
      return {
        ...state,
        currentExerciseIndex: state.currentExerciseIndex + 1,
        currentRound: 1,
        totalRounds: action.totalRounds,
        phase: "countdown",
        timeLeft: action.countdownTime,
        isRunning: true,
      };

    case "PREV_EXERCISE": {
      const newIdx = Math.max(0, state.currentExerciseIndex - 1);
      return {
        ...state,
        currentExerciseIndex: newIdx,
        currentRound: 1,
        totalRounds: action.totalRounds,
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
      const hasNext =
        action.exerciseCount > 0 &&
        state.currentExerciseIndex < action.exerciseCount - 1;
      if (hasNext) {
        return {
          ...state,
          currentExerciseIndex: state.currentExerciseIndex + 1,
          currentRound: 1,
          totalRounds: action.totalRoundsNextExercise,
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
      if (state.phase === "rest") {
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
        dispatch({
          type: "TICK",
          config: {
            workTime: configRef.current.workTime,
            restTime: configRef.current.restTime,
          },
          exerciseCount,
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
  }, [state.isRunning, exerciseCount]);

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
      const nextIdx = state.currentExerciseIndex + 1;
      dispatch({
        type: "NEXT_EXERCISE",
        totalRounds: getRoundsForExercise(nextIdx),
        countdownTime: config.countdownTime,
      });
    }
  }, [
    state.currentExerciseIndex,
    exerciseCount,
    getRoundsForExercise,
    config.countdownTime,
  ]);

  const skipForward = useCallback(() => {
    const nextIdx = Math.min(state.currentExerciseIndex + 1, exerciseCount - 1);
    dispatch({
      type: "SKIP_FORWARD",
      totalRoundsNextExercise: getRoundsForExercise(nextIdx),
      countdownTime: config.countdownTime,
      exerciseCount,
    });
  }, [
    state.currentExerciseIndex,
    exerciseCount,
    getRoundsForExercise,
    config.countdownTime,
  ]);

  const prevExercise = useCallback(() => {
    if (state.currentExerciseIndex > 0) {
      const prevIdx = state.currentExerciseIndex - 1;
      dispatch({
        type: "PREV_EXERCISE",
        totalRounds: getRoundsForExercise(prevIdx),
        countdownTime: config.countdownTime,
      });
    }
  }, [state.currentExerciseIndex, getRoundsForExercise, config.countdownTime]);

  const skipPhase = useCallback(() => {
    dispatch({
      type: "SKIP_PHASE",
      config: { workTime: config.workTime, restTime: config.restTime },
      exerciseCount,
    });
  }, [config.workTime, config.restTime, exerciseCount]);

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
