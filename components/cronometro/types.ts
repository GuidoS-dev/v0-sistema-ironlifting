export interface TabataBlock {
  id: string;
  name: string;
  workTime: number;
  restTime: number;
  rounds: number;
}

export interface TabataConfig {
  workTime: number;
  restTime: number;
  rounds: number;
  countdownTime: number;
  soundEnabled: boolean;
  blocks: TabataBlock[];
}

export interface TabataExercise {
  id: string;
  name: string;
  category: string;
  kg: number | null;
  reps: string | null;
  series: number;
  notes?: string;
  baseId?: string;
  baseName?: string;
  intensityLabel?: string;
  intensityIndex?: number;
  totalIntensities?: number;
}

export type TimerPhase =
  | "idle"
  | "countdown"
  | "work"
  | "rest"
  | "blockRest"
  | "intensityRest"
  | "exerciseComplete"
  | "finished";

export interface TimerState {
  phase: TimerPhase;
  timeLeft: number;
  /** The initial timeLeft when the current phase started (for progress calculation) */
  phaseStartTime: number;
  currentRound: number;
  totalRounds: number;
  isRunning: boolean;
  currentExerciseIndex: number;
  currentBlockIndex: number;
}

export type TimerAction =
  | { type: "START"; countdownTime: number; totalRounds: number }
  | {
      type: "TICK";
      config: Pick<TabataConfig, "workTime" | "restTime" | "countdownTime">;
      exerciseCount: number;
      nextExerciseSameGroup?: boolean;
      nextExerciseRounds?: number;
      /** Block-mode fields */
      blocks?: TabataBlock[];
      blockCount?: number;
    }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "RESET" }
  | {
      type: "NEXT_EXERCISE";
      exerciseRounds: number[];
      countdownTime: number;
    }
  | {
      type: "PREV_EXERCISE";
      exerciseRounds: number[];
      countdownTime: number;
    }
  | {
      type: "SKIP_FORWARD";
      exerciseRounds: number[];
      countdownTime: number;
      exerciseCount: number;
    }
  | {
      type: "SKIP_PHASE";
      config: Pick<TabataConfig, "workTime" | "restTime" | "countdownTime">;
      exerciseCount: number;
      nextExerciseSameGroup?: boolean;
      nextExerciseRounds?: number;
      blocks?: TabataBlock[];
      blockCount?: number;
    }
  | {
      type: "RESTART_PHASE";
      config: Pick<TabataConfig, "workTime" | "restTime" | "countdownTime">;
    }
  | {
      type: "NEXT_BLOCK";
      blocks: TabataBlock[];
      countdownTime: number;
    }
  | {
      type: "PREV_BLOCK";
      blocks: TabataBlock[];
      countdownTime: number;
    };
