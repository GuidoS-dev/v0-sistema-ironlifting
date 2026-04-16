import type { TabataConfig, TimerPhase } from "./types";

export const DEFAULT_CONFIG: TabataConfig = {
  workTime: 120,
  restTime: 90,
  rounds: 8,
  countdownTime: 5,
  soundEnabled: true,
};

export const STORAGE_KEY = "liftplan_cronometro_config";
export const TUTORIAL_SEEN_KEY = "liftplan_cronometro_tutorial_seen";

export const PHASE_COLORS: Record<TimerPhase, { bg: string; accent: string }> =
  {
    idle: { bg: "#12151c", accent: "#6b7590" },
    countdown: { bg: "#1a1a10", accent: "#e8c547" },
    work: { bg: "#1a1210", accent: "#e87447" },
    rest: { bg: "#101a14", accent: "#47e8a0" },
    exerciseComplete: { bg: "#101a14", accent: "#47e8a0" },
    finished: { bg: "#1a1810", accent: "#e8c547" },
  };

export const PHASE_LABELS: Record<TimerPhase, string> = {
  idle: "LISTO",
  countdown: "PREPARATE",
  work: "TRABAJO",
  rest: "DESCANSO",
  exerciseComplete: "EJERCICIO COMPLETO",
  finished: "TERMINADO",
};

export const CAT_COLORS: Record<string, string> = {
  Arranque: "#e8c547",
  Envion: "#47b4e8",
  Tirones: "#e87447",
  Piernas: "#47e8a0",
  Complementarios: "#9b87e8",
};

export const MIN_TIME = 5;
export const MAX_TIME = 600;
export const MIN_ROUNDS = 1;
export const MAX_ROUNDS = 50;
export const TIME_STEP = 5;
