import { useCallback, useEffect, useReducer, useRef } from "react";
import type {
  TabataBlock,
  TabataConfig,
  TabataExercise,
  TimerAction,
  TimerState,
} from "../types";

const INITIAL_STATE: TimerState = {
  phase: "idle",
  timeLeft: 0,
  phaseStartTime: 0,
  currentRound: 1,
  totalRounds: 1,
  isRunning: false,
  currentExerciseIndex: 0,
  currentBlockIndex: 0,
};

/* ── Helpers ── */

/** Get the current block's config for work/rest, or fall back to global config */
function blockConfig(
  action: {
    blocks?: TabataBlock[];
    config: Pick<TabataConfig, "workTime" | "restTime" | "countdownTime">;
  },
  blockIndex: number,
) {
  const block = action.blocks?.[blockIndex];
  if (block) {
    return {
      workTime: block.workTime,
      restTime: block.restTime,
      countdownTime: action.config.countdownTime,
    };
  }
  return action.config;
}

function isBlockMode(action: {
  blocks?: TabataBlock[];
  exerciseCount?: number;
  blockCount?: number;
}) {
  return (action.blockCount ?? 0) > 0 && (action.exerciseCount ?? 0) === 0;
}

function timerReducer(state: TimerState, action: TimerAction): TimerState {
  switch (action.type) {
    case "START":
      return {
        ...state,
        phase: "countdown",
        timeLeft: action.countdownTime,
        phaseStartTime: action.countdownTime,
        totalRounds: action.totalRounds,
        currentRound: 1,
        currentBlockIndex: 0,
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
      const useBlocks = isBlockMode(action);
      const cfg = useBlocks
        ? blockConfig(action, state.currentBlockIndex)
        : action.config;
      const { exerciseCount } = action;

      switch (state.phase) {
        case "countdown":
          return { ...state, phase: "work", timeLeft: cfg.workTime, phaseStartTime: cfg.workTime };

        case "work": {
          const isLastRound = state.currentRound >= state.totalRounds;
          if (isLastRound) {
            // ── Block mode: advance to next block ──
            if (useBlocks) {
              const blockCount = action.blockCount ?? 0;
              const hasMoreBlocks = state.currentBlockIndex < blockCount - 1;
              if (hasMoreBlocks) {
                const nextBlock = action.blocks![state.currentBlockIndex + 1];
                return {
                  ...state,
                  phase: "blockRest",
                  timeLeft: cfg.restTime,
                  phaseStartTime: cfg.restTime,
                  isRunning: true,
                };
              }
              return {
                ...state,
                phase: "finished",
                timeLeft: 0,
                isRunning: false,
              };
            }
            // ── Exercise mode ──
            const hasMore =
              exerciseCount > 0 &&
              state.currentExerciseIndex < exerciseCount - 1;
            if (hasMore) {
              if (action.nextExerciseSameGroup) {
                return {
                  ...state,
                  phase: "intensityRest",
                  timeLeft: cfg.restTime,
                  phaseStartTime: cfg.restTime,
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
          return { ...state, phase: "rest", timeLeft: cfg.restTime, phaseStartTime: cfg.restTime };
        }

        case "rest":
          return {
            ...state,
            phase: "work",
            timeLeft: cfg.workTime,
            phaseStartTime: cfg.workTime,
            currentRound: state.currentRound + 1,
          };

        case "blockRest": {
          // Advance to next block
          const nextIdx = state.currentBlockIndex + 1;
          const nextBlock = action.blocks?.[nextIdx];
          return {
            ...state,
            currentBlockIndex: nextIdx,
            currentRound: 1,
            totalRounds: nextBlock?.rounds ?? state.totalRounds,
            phase: "countdown",
            timeLeft: cfg.countdownTime,
            phaseStartTime: cfg.countdownTime,
            isRunning: true,
          };
        }

        case "intensityRest": {
          const nextIdx = state.currentExerciseIndex + 1;
          return {
            ...state,
            currentExerciseIndex: nextIdx,
            currentRound: 1,
            totalRounds: action.nextExerciseRounds ?? state.totalRounds,
            phase: "countdown",
            timeLeft: cfg.countdownTime,
            phaseStartTime: cfg.countdownTime,
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
        phaseStartTime: action.countdownTime,
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
        phaseStartTime: action.countdownTime,
        isRunning: true,
      };
    }

    case "NEXT_BLOCK": {
      const nextIdx = state.currentBlockIndex + 1;
      if (nextIdx >= action.blocks.length) return state;
      const nextBlock = action.blocks[nextIdx];
      return {
        ...state,
        currentBlockIndex: nextIdx,
        currentRound: 1,
        totalRounds: nextBlock.rounds,
        phase: "countdown",
        timeLeft: action.countdownTime,
        phaseStartTime: action.countdownTime,
        isRunning: true,
      };
    }

    case "PREV_BLOCK": {
      const prevIdx = Math.max(0, state.currentBlockIndex - 1);
      const prevBlock = action.blocks[prevIdx];
      return {
        ...state,
        currentBlockIndex: prevIdx,
        currentRound: 1,
        totalRounds: prevBlock.rounds,
        phase: "countdown",
        timeLeft: action.countdownTime,
        phaseStartTime: action.countdownTime,
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
          phaseStartTime: action.countdownTime,
          currentRound: state.currentRound + 1,
          isRunning: true,
        };
      }
      // Last round — move to next exercise if available
      const nextIdx = state.currentExerciseIndex + 1;
      const hasNext =
        action.exerciseCount > 0 && nextIdx < action.exerciseCount;
      if (hasNext) {
        return {
          ...state,
          currentExerciseIndex: nextIdx,
          currentRound: 1,
          totalRounds: action.exerciseRounds[nextIdx] ?? state.totalRounds,
          phase: "countdown",
          timeLeft: action.countdownTime,
          phaseStartTime: action.countdownTime,
          isRunning: true,
        };
      }
      // No more exercises — finished
      return {
        ...state,
        phase: "finished",
        timeLeft: 0,
        phaseStartTime: 0,
        isRunning: false,
      };
    }

    case "SKIP_PHASE": {
      const useBlocks = isBlockMode(action);
      const cfg = useBlocks
        ? blockConfig(action, state.currentBlockIndex)
        : action.config;
      const { exerciseCount } = action;

      if (state.phase === "countdown") {
        return { ...state, phase: "work", timeLeft: cfg.workTime, phaseStartTime: cfg.workTime };
      }
      if (state.phase === "work") {
        const isLastRound = state.currentRound >= state.totalRounds;
        if (isLastRound) {
          if (useBlocks) {
            const blockCount = action.blockCount ?? 0;
            const hasMoreBlocks = state.currentBlockIndex < blockCount - 1;
            if (hasMoreBlocks) {
              return {
                ...state,
                phase: "blockRest",
                timeLeft: cfg.restTime,
                phaseStartTime: cfg.restTime,
                isRunning: true,
              };
            }
            return {
              ...state,
              phase: "finished",
              timeLeft: 0,
              phaseStartTime: 0,
              isRunning: false,
            };
          }
          const hasMore =
            exerciseCount > 0 && state.currentExerciseIndex < exerciseCount - 1;
          if (hasMore) {
            if (action.nextExerciseSameGroup) {
              return {
                ...state,
                phase: "intensityRest",
                timeLeft: cfg.restTime,
                phaseStartTime: cfg.restTime,
                isRunning: true,
              };
            }
            return {
              ...state,
              phase: "exerciseComplete",
              timeLeft: 0,
              phaseStartTime: 0,
              isRunning: false,
            };
          }
          return { ...state, phase: "finished", timeLeft: 0, phaseStartTime: 0, isRunning: false };
        }
        return { ...state, phase: "rest", timeLeft: cfg.restTime, phaseStartTime: cfg.restTime };
      }
      if (state.phase === "rest") {
        return {
          ...state,
          phase: "work",
          timeLeft: cfg.workTime,
          phaseStartTime: cfg.workTime,
          currentRound: state.currentRound + 1,
        };
      }
      if (state.phase === "blockRest") {
        const nextIdx = state.currentBlockIndex + 1;
        const nextBlock = action.blocks?.[nextIdx];
        return {
          ...state,
          currentBlockIndex: nextIdx,
          currentRound: 1,
          totalRounds: nextBlock?.rounds ?? state.totalRounds,
          phase: "countdown",
          timeLeft: cfg.countdownTime,
          phaseStartTime: cfg.countdownTime,
          isRunning: true,
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
          timeLeft: cfg.countdownTime,
          phaseStartTime: cfg.countdownTime,
          isRunning: true,
        };
      }
      return state;
    }

    case "RESTART_PHASE": {
      // Use phaseStartTime to restart to the original duration
      return { ...state, timeLeft: state.phaseStartTime, isRunning: true };
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
  const blocks = config.blocks;
  const blockCount = blocks.length;
  const isStandaloneBlockMode = exerciseCount === 0 && blockCount > 0;

  // Pre-compute rounds array so actions don't rely on stale closure index
  const exerciseRoundsRef = useRef<number[]>([]);
  exerciseRoundsRef.current = exercises.map((e) => e.series);

  // Pre-compute baseId array for group detection
  const exerciseBaseIdsRef = useRef<(string | undefined)[]>([]);
  exerciseBaseIdsRef.current = exercises.map((e) => e.baseId);

  const blocksRef = useRef<TabataBlock[]>(blocks);
  blocksRef.current = blocks;

  const getRoundsForExercise = useCallback(
    (idx: number) => {
      if (exercises.length > 0 && exercises[idx]) {
        return exercises[idx].series;
      }
      return config.rounds;
    },
    [exercises, config.rounds],
  );

  // For block mode, get the correct work/rest config for the current block
  const getBlockConfig = useCallback(
    (blockIdx: number) => {
      const block = blocks[blockIdx];
      if (block) {
        return {
          workTime: block.workTime,
          restTime: block.restTime,
          countdownTime: config.countdownTime,
        };
      }
      return {
        workTime: config.workTime,
        restTime: config.restTime,
        countdownTime: config.countdownTime,
      };
    },
    [blocks, config.workTime, config.restTime, config.countdownTime],
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

        // In block mode, use current block's config
        const tickConfig = isStandaloneBlockMode
          ? getBlockConfig(state.currentBlockIndex)
          : {
              workTime: configRef.current.workTime,
              restTime: configRef.current.restTime,
              countdownTime: configRef.current.countdownTime,
            };

        dispatch({
          type: "TICK",
          config: tickConfig,
          exerciseCount,
          nextExerciseSameGroup: nextSameGroup,
          nextExerciseRounds: exerciseRoundsRef.current[nextIdx],
          blocks: blocksRef.current,
          blockCount,
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
  }, [
    state.isRunning,
    state.currentExerciseIndex,
    state.currentBlockIndex,
    exerciseCount,
    blockCount,
    isStandaloneBlockMode,
    getBlockConfig,
  ]);

  const start = useCallback(() => {
    const isFirstStart = state.phase === "idle";
    const countdown = isFirstStart ? 10 : config.countdownTime;

    if (isStandaloneBlockMode) {
      const firstBlock = blocks[0];
      dispatch({
        type: "START",
        countdownTime: countdown,
        totalRounds: firstBlock.rounds,
      });
    } else {
      dispatch({
        type: "START",
        countdownTime: countdown,
        totalRounds: getRoundsForExercise(state.currentExerciseIndex),
      });
    }

    // First start: pause immediately so the athlete can set the phone down
    if (isFirstStart) {
      dispatch({ type: "PAUSE" });
    }
  }, [
    config.countdownTime,
    getRoundsForExercise,
    state.currentExerciseIndex,
    state.phase,
    isStandaloneBlockMode,
    blocks,
  ]);

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
  }, [state.currentExerciseIndex, exerciseCount, config.countdownTime]);

  const nextBlock = useCallback(() => {
    if (state.currentBlockIndex < blockCount - 1) {
      dispatch({
        type: "NEXT_BLOCK",
        blocks: blocksRef.current,
        countdownTime: config.countdownTime,
      });
    }
  }, [state.currentBlockIndex, blockCount, config.countdownTime]);

  const prevBlock = useCallback(() => {
    if (state.currentBlockIndex > 0) {
      dispatch({
        type: "PREV_BLOCK",
        blocks: blocksRef.current,
        countdownTime: config.countdownTime,
      });
    }
  }, [state.currentBlockIndex, config.countdownTime]);

  const skipForward = useCallback(() => {
    if (isStandaloneBlockMode) {
      // In block mode, skip forward = next round or next block
      if (state.currentRound < state.totalRounds) {
        dispatch({
          type: "SKIP_FORWARD",
          exerciseRounds: [],
          countdownTime: config.countdownTime,
          exerciseCount: 0,
        });
      } else if (state.currentBlockIndex < blockCount - 1) {
        dispatch({
          type: "NEXT_BLOCK",
          blocks: blocksRef.current,
          countdownTime: config.countdownTime,
        });
      } else {
        // Last block, last round → finished
        dispatch({ type: "RESET" });
      }
      return;
    }
    dispatch({
      type: "SKIP_FORWARD",
      exerciseRounds: exerciseRoundsRef.current,
      countdownTime: config.countdownTime,
      exerciseCount,
    });
  }, [
    config.countdownTime,
    exerciseCount,
    isStandaloneBlockMode,
    state.currentRound,
    state.totalRounds,
    state.currentBlockIndex,
    blockCount,
  ]);

  const prevExercise = useCallback(() => {
    if (isStandaloneBlockMode) {
      if (state.currentBlockIndex > 0) {
        dispatch({
          type: "PREV_BLOCK",
          blocks: blocksRef.current,
          countdownTime: config.countdownTime,
        });
      }
      return;
    }
    if (state.currentExerciseIndex > 0) {
      dispatch({
        type: "PREV_EXERCISE",
        exerciseRounds: exerciseRoundsRef.current,
        countdownTime: config.countdownTime,
      });
    }
  }, [
    state.currentExerciseIndex,
    state.currentBlockIndex,
    config.countdownTime,
    isStandaloneBlockMode,
  ]);

  const skipPhase = useCallback(() => {
    const curIdx = state.currentExerciseIndex;
    const nextIdx = curIdx + 1;
    const curBase = exerciseBaseIdsRef.current[curIdx];
    const nextBase = exerciseBaseIdsRef.current[nextIdx];
    const nextSameGroup = !!(curBase && nextBase && curBase === nextBase);

    const phaseConfig = isStandaloneBlockMode
      ? getBlockConfig(state.currentBlockIndex)
      : {
          workTime: config.workTime,
          restTime: config.restTime,
          countdownTime: config.countdownTime,
        };

    dispatch({
      type: "SKIP_PHASE",
      config: phaseConfig,
      exerciseCount,
      nextExerciseSameGroup: nextSameGroup,
      nextExerciseRounds: exerciseRoundsRef.current[nextIdx],
      blocks: blocksRef.current,
      blockCount,
    });
  }, [
    config.workTime,
    config.restTime,
    config.countdownTime,
    exerciseCount,
    state.currentExerciseIndex,
    state.currentBlockIndex,
    isStandaloneBlockMode,
    getBlockConfig,
    blockCount,
  ]);

  const restartPhase = useCallback(() => {
    const phaseConfig = isStandaloneBlockMode
      ? getBlockConfig(state.currentBlockIndex)
      : {
          workTime: config.workTime,
          restTime: config.restTime,
          countdownTime: config.countdownTime,
        };

    dispatch({
      type: "RESTART_PHASE",
      config: phaseConfig,
    });
  }, [
    config.workTime,
    config.restTime,
    config.countdownTime,
    isStandaloneBlockMode,
    getBlockConfig,
    state.currentBlockIndex,
  ]);

  // totalPhaseTime tracks the initial duration when each phase started.
  // This is critical for accurate SVG progress circle calculations,
  // especially when the initial countdown (10s) differs from config.countdownTime (5s).
  const totalPhaseTime = state.phaseStartTime || 1;

  return {
    ...state,
    totalPhaseTime,
    actions: {
      start,
      pause,
      resume,
      reset,
      nextExercise,
      nextBlock,
      prevBlock,
      skipForward,
      prevExercise,
      skipPhase,
      restartPhase,
    },
  };
}
