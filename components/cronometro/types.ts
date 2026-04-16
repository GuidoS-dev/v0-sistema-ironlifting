export interface TabataConfig {
  workTime: number;
  restTime: number;
  rounds: number;
  countdownTime: number;
  soundEnabled: boolean;
}

export interface TabataExercise {
  id: string;
  name: string;
  category: string;
  kg: number | null;
  reps: string | null;
  series: number;
  notes?: string;
}

export type TimerPhase =
  | "idle"
  | "countdown"
  | "work"
  | "rest"
  | "exerciseComplete"
  | "finished";

export interface TimerState {
  phase: TimerPhase;
  timeLeft: number;
  currentRound: number;
  totalRounds: number;
  isRunning: boolean;
  currentExerciseIndex: number;
}

export type TimerAction =
  | { type: "START"; countdownTime: number; totalRounds: number }
  | {
      type: "TICK";
      config: Pick<TabataConfig, "workTime" | "restTime">;
      exerciseCount: number;
    }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "RESET" }
  | {
      type: "NEXT_EXERCISE";
      totalRounds: number;
      countdownTime: number;
    }
  | {
      type: "PREV_EXERCISE";
      totalRounds: number;
      countdownTime: number;
    }
  | {
      type: "SKIP_FORWARD";
      totalRoundsNextExercise: number;
      countdownTime: number;
      exerciseCount: number;
    }
  | {
      type: "SKIP_PHASE";
      config: Pick<TabataConfig, "workTime" | "restTime">;
      exerciseCount: number;
    }
  | {
      type: "RESTART_PHASE";
      config: Pick<TabataConfig, "workTime" | "restTime" | "countdownTime">;
    };
