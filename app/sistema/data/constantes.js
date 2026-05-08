export const DIAS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];
export const MOMENTOS = ["Mañana", "Tarde", "Noche"];
export const CATEGORIAS = [
  "Arranque",
  "Envion",
  "Tirones",
  "Piernas",
  "Complementarios",
];
export const CAT_COLOR = {
  Arranque: "#e8c547",
  Envion: "#47b4e8",
  Tirones: "#e87447",
  Piernas: "#47e8a0",
  Complementarios: "#9b87e8",
};

export const mkId = () => Math.random().toString(36).slice(2, 9);

// Factory para una celda de ejercicio dentro del sembrado
// (recuperado durante la fase de cleanup — se había perdido al extraer SembradoMensual).
export const mkEj = () => ({
  id: mkId(),
  ejercicio_id: null,
  intensidad: 75,
  tabla: 1,
  reps_asignadas: 0,
});

export const mkTurnos = () =>
  Array.from({ length: 9 }, (_, i) => ({
    id: mkId(),
    numero: i + 1,
    dia: "",
    momento: "",
    ejercicios: Array.from({ length: 3 }, () => ({
      id: mkId(),
      ejercicio_id: null,
      intensidad: 75,
      tabla: 1,
      reps_asignadas: 0,
    })),
    complementarios_before: Array.from({ length: 0 }),
    complementarios_after: Array.from({ length: 0 }),
  }));
export const mkSemanas = () =>
  Array.from({ length: 4 }, (_, i) => ({
    id: mkId(),
    numero: i + 1,
    pct_volumen: 25,
    reps_calculadas: 0,
    reps_ajustadas: 0,
    fecha_override: "",
    pct_grupos: { Arranque: 25, Envion: 35, Tirones: 20, Piernas: 20 },
    turnos: mkTurnos(),
  }));

// ── Escuela Básica helpers ──────────────────────────────────────────────────
export const mkBloqueBasica = () => ({
  pct: null,
  series: null,
  reps: null,
  kg: null,
  nota: "",
});
export const mkEjBasica = (n = 3) => ({
  id: mkId(),
  ejercicio_id: null,
  nombre_custom: "",
  bloques: Array.from({ length: n }, mkBloqueBasica),
});
export const EMPTY_NAME_SENTINEL = "​";
export const resolveExerciseName = (customName, fallback = "") =>
  customName === EMPTY_NAME_SENTINEL ? "" : customName || fallback;
export const mkTurnosBasica = (n = 3) =>
  Array.from({ length: 3 }, (_, i) => ({
    id: mkId(),
    numero: i + 1,
    dia: "",
    momento: "",
    ejercicios: Array.from({ length: 6 }, () => mkEjBasica(n)),
  }));
export const mkSemanasBasica = (numSem = 4, numBloques = 3) =>
  Array.from({ length: numSem }, (_, i) => ({
    id: mkId(),
    numero: i + 1,
    fecha_override: "",
    turnos: mkTurnosBasica(numBloques),
  }));

// ── Pretemporada helpers ────────────────────────────────────────────────────
export const mkEjPretemp = (n = 3) => ({
  id: mkId(),
  ejercicio_ids: [{ eid: null, link: "-" }],
  nombre_custom: "",
  bloques: Array.from({ length: n }, mkBloqueBasica),
});
export const mkTurnosPretemp = (n = 3) =>
  Array.from({ length: 3 }, (_, i) => ({
    id: mkId(),
    numero: i + 1,
    dia: "",
    momento: "",
    ejercicios: Array.from({ length: 6 }, () => mkEjPretemp(n)),
  }));
export const mkSemanasPretemp = (numSem = 4, numBloques = 3) =>
  Array.from({ length: numSem }, (_, i) => ({
    id: mkId(),
    numero: i + 1,
    fecha_override: "",
    turnos: mkTurnosPretemp(numBloques),
  }));
