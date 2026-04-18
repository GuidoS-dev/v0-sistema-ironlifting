import type { TabataBlock, TabataConfig, TimerPhase } from "./types";

let _blockIdCounter = 0;
export function createBlock(
  overrides?: Partial<Omit<TabataBlock, "id">>,
): TabataBlock {
  _blockIdCounter++;
  return {
    id: `blk_${Date.now()}_${_blockIdCounter}`,
    name: overrides?.name ?? `Bloque ${_blockIdCounter}`,
    workTime: overrides?.workTime ?? 30,
    restTime: overrides?.restTime ?? 90,
    rounds: overrides?.rounds ?? 4,
  };
}

export const DEFAULT_CONFIG: TabataConfig = {
  workTime: 30,
  restTime: 90,
  rounds: 8,
  countdownTime: 5,
  soundEnabled: true,
  blocks: [createBlock({ name: "Bloque 1" })],
};

export const STORAGE_KEY = "liftplan_cronometro_config";
export const TUTORIAL_SEEN_KEY = "liftplan_cronometro_tutorial_seen";

export const PHASE_COLORS: Record<TimerPhase, { bg: string; accent: string }> =
  {
    idle: { bg: "var(--timer-idle-bg)", accent: "var(--muted-foreground)" },
    countdown: { bg: "var(--timer-countdown-bg)", accent: "var(--gold)" },
    work: { bg: "var(--timer-work-bg)", accent: "var(--orange)" },
    rest: { bg: "var(--timer-rest-bg)", accent: "var(--green)" },
    blockRest: { bg: "var(--timer-countdown-bg)", accent: "var(--gold)" },
    intensityRest: { bg: "var(--timer-rest-bg)", accent: "var(--gold-dark)" },
    exerciseComplete: { bg: "var(--timer-rest-bg)", accent: "var(--green)" },
    finished: { bg: "var(--timer-finished-bg)", accent: "var(--gold)" },
  };

export const PHASE_LABELS: Record<TimerPhase, string> = {
  idle: "LISTO",
  countdown: "PREPARATE",
  work: "TRABAJO",
  rest: "DESCANSO",
  blockRest: "SIGUIENTE BLOQUE",
  intensityRest: "CARGÁ LA BARRA",
  exerciseComplete: "EJERCICIO COMPLETO",
  finished: "TERMINADO",
};

export const CAT_COLORS: Record<string, string> = {
  Arranque: "var(--gold)",
  Envion: "var(--blue)",
  Tirones: "var(--orange)",
  Piernas: "var(--green)",
  Complementarios: "var(--purple)",
};

export const MIN_TIME = 5;
export const MAX_TIME = 600;
export const MIN_ROUNDS = 1;
export const MAX_ROUNDS = 50;
export const TIME_STEP = 5;
