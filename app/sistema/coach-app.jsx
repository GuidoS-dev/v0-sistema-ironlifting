import {
  Briefcase,
  ChevronDown,
  ChevronLeft,
  Clipboard,
  Copy,
  Download,
  Eye,
  EyeOff,
  Files,
  FileText,
  Library,
  LogOut,
  MessageCircle,
  Minus,
  Pencil,
  Plus,
  Redo2,
  Search,
  Send,
  Shield,
  Timer,
  Trash2,
  Undo2,
  User,
  X,
} from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { TabataTimer } from "../../components/cronometro";
import { EJERCICIOS } from "./data/ejercicios";
import {
  DIAS,
  MOMENTOS,
  CATEGORIAS,
  CAT_COLOR,
  mkId,
  mkTurnos,
  mkSemanas,
  mkBloqueBasica,
  mkEjBasica,
  EMPTY_NAME_SENTINEL,
  resolveExerciseName,
  mkTurnosBasica,
  mkSemanasBasica,
  mkEjPretemp,
  mkTurnosPretemp,
  mkSemanasPretemp,
} from "./data/constantes";
import {
  INTENSIDADES,
  IRM_VALUES,
  INTENS_COLS,
  TABLA_DEFAULT,
  DEFAULT_EJS,
} from "./data/tablas-default";
import { FASES_CICLO } from "./data/ciclo";
import {
  PERIODOS,
  OBJETIVOS,
  NIVELES,
  ESCUELA_NIVELES,
  PERIODO_LABEL,
  OBJETIVO_LABEL,
  NIVEL_LABEL,
  ESCUELA_NIVEL_LABEL,
  ESCUELA_NIVEL_COLOR,
  PERIODO_COLOR,
  OBJETIVO_COLOR,
} from "./data/plantillas-meta";
import {
  LogoHorizontal,
  LogoIL,
  LogoILSolo,
} from "./components/common/Logos";
import {
  toTitleCase,
  sanitizeStringInput,
  sanitizeInput,
  sanitizeRequestBody,
} from "./lib/sanitize";
import {
  LIFTPLAN_LOCAL_SYNC_EVENT,
  _freeLocalStorageSpace,
  safeSetItem,
  emitLocalSyncEvent,
  readLocalJson,
  writeLocalJson,
  asPlainObject,
  asArray,
} from "./lib/storage";
import {
  SESSION_KEY,
  PROFILE_KEY_PREFIX,
  saveSession,
  loadSession,
  clearSession,
  saveProfileLocal,
  loadProfileLocal,
  clearProfileLocal,
  _authListeners,
  onAuthChange,
  _emitAuth,
  _authMessageMap,
  _authErrorMessage,
  _runtimeErrorMessage,
} from "./lib/auth-storage";
import {
  collectAtletaNormOverrides,
  restoreAtletaNormOverrides,
  buildMesoOverridesPayload,
  collectMesoOverrides,
  restoreMesoOverrides,
  collectAtletaPctOverrides,
  restoreAtletaPctOverrides,
} from "./lib/overrides";
import {
  atletaToDb,
  atletaFromDb,
  mesoToDb,
  mesoFromDb,
  plantillaToDb,
  plantillaFromDb,
} from "./lib/mappers";
import {
  calcKg,
  calcVolumenSemana,
  calcRepsPorGrupo,
  remapSemanaIdx,
  remapSemPctKeyForSwap,
  remapTurnoPctKeyForSwap,
  remapOverrideObjectKeys,
  remapOverrideSetKeys,
  getEjercicioById,
  getSembradoStats,
  calcSeriesRepsKg,
  calcKgEj,
  GRUPO_RANGES,
  GRUPOS_KEYS,
  getGrupo,
  calcSembradoSemana,
  calcRepsEjercicio,
} from "./lib/calc";
import {
  parseAppDate,
  getAgeFromBirthDate,
  getFasePorDia,
  getFasesVentanaCiclo,
  getFaseDominante,
  getFaseCiclo,
  getDetalleFaseCiclo,
  getFechaSemana,
  getFechaSemanaEfectiva,
  formatFechaSemana,
  formatDateDisplay,
} from "./lib/ciclo-menstrual";
import {
  PLANILLA_NAV_SELECTOR,
  buildPlanillaFocusGrid,
  focusPlanillaField,
  handlePlanillaArrowNavigation,
  SEMBRADO_NAV_SELECTOR,
  SEMBRADO_ROLE_ORDER,
  getSembradoTabSequence,
  handleSembradoTabNavigation,
} from "./lib/navegacion";
import {
  SUPA_URL,
  SUPA_ANON,
  SUPA_CONFIG_OK,
  _fetchWithTimeout,
  _readResponseSafe,
  _getValidSession,
  getCurrentSession,
  sb,
  getSupabase,
} from "./lib/supabase-client";
import {
  _visResume,
  _bc,
  markDbSync,
  broadcastDbWrite,
} from "./lib/sync";
import {
  COACH_SETTING_KEYS,
  loadCoachSetting,
  loadCoachSettingRow,
  saveCoachSetting,
  resolveSharedCoachId,
} from "./lib/coach-settings";
import {
  BACKUP_INTERVAL_MS,
  BACKUP_PROMPTED_KEY,
  getLastDbSync,
  collectLocalData,
  collectBackupData,
  downloadBackup,
} from "./lib/backup";
import { useHistory } from "./hooks/useHistory";
import { usePlantillas } from "./hooks/usePlantillas";
import { Modal } from "./components/common/Modal";
import { ExercisePickerOverlay } from "./components/common/ExercisePickerOverlay";
import { EjBuscador } from "./components/common/EjBuscador";
import { EjBuscadorCompacto } from "./components/common/EjBuscadorCompacto";
import { ComplementarioRow } from "./components/planilla/ComplementarioRow";
import { EjercicioRow } from "./components/planilla/EjercicioRow";
import { TurnoCard } from "./components/planilla/TurnoCard";
import { EjCelda } from "./components/sembrado/EjCelda";
import { CeldaSembrado } from "./components/sembrado/CeldaSembrado";
import { IntensityPickerModal } from "./components/sembrado/IntensityPickerModal";
import { SembradoMensual } from "./components/sembrado/SembradoMensual";
import { SemanaView } from "./components/sembrado/SemanaView";
import { ResumenGrupos } from "./components/resumen/ResumenGrupos";
import { DistribucionTurnos } from "./components/resumen/DistribucionTurnos";
import { AtletaCardItem } from "./components/atletas/AtletaCardItem";
import { AtletaForm } from "./components/atletas/AtletaForm";
import { MesocicloForm } from "./components/atletas/MesocicloForm";
import { EditMesoModal } from "./components/atletas/EditMesoModal";
import { EditVolModal } from "./components/atletas/EditVolModal";
import { PlantillaPicker } from "./components/plantillas/PlantillaPicker";
import { PlantillaCard } from "./components/plantillas/PlantillaCard";
import { GuardarPlantillaModal } from "./components/plantillas/GuardarPlantillaModal";
import { CrearPlantillaModal } from "./components/plantillas/CrearPlantillaModal";
import { DuplicarPlantillaModal } from "./components/plantillas/DuplicarPlantillaModal";
import {
  AlumnoSectionHeader,
  SectionHeader,
  CardGrid,
  NivelSection,
} from "./components/common/LayoutHelpers";
import "./styles/coach-app.css";

const APP_VERSION = "1.7.12";



// ─── COMPONENTS ──────────────────────────────────────────────────────────────


// ─── DISTRIBUCIÓN POR TURNOS ─────────────────────────────────────────────────
// Replica C94:AB106: por semana, por grupo → qué % de ese grupo va en cada turno

// ─── PLANILLA DE TURNO ───────────────────────────────────────────────────────
// Replica A112:AM134 — por semana y turno: ejercicios con series/reps/kg
// por cada columna de intensidad (50,60,70,75,80,85,90,95)

// ─── CÁLCULO SERIES / REPS / KG ──────────────────────────────────────────────
// Lógica replicada del Excel (MESO 1):
//
// 1) KG por columna de intensidad:
//    kg = Normativos[ej].Kgs × intensidad% / 100
//    donde Normativos[ej].Kgs = IRM_atleta × pct_base / 100
//    Ej: Arranque=100kg, pct_base=90 → base=90kg, al 75% → 67.5kg → 68kg
//
// 2) Reps intermedias por columna de intensidad (fórmula IM del Excel):
//    repsInter = ROUND( tabla[ej.intensidad][intens%] / 100 × reps_asignadas , 0 )
//    donde tabla = T1/T2/T3 según ej.tabla, indexada por ej.intensidad (IRM del sembrado)
//
// 3) Series y reps/serie (fórmula G/H del Excel):
//    - Si repsInter = 0  → vacío
//    - Si repsInter > 8  → series=1, reps_serie=repsInter
//    - Si no → XLOOKUP en lookup_tirones (categoria Tirones) o lookup_general
//              usando (intens%, modo Comp/Prep, repsInter)

function PlanillaTurno({
  scrollIdPrefix = "planilla",
  semanas,
  irm_arr,
  irm_env,
  meso,
  semPctOverrides,
  semPctManual,
  turnoPctOverrides,
  turnoPctManual,
  onRequestReset,
  onBeforeChange,
  onChangeTurno,
  onChangeTodasSemanas,
  repsEdit,
  setRepsEdit: setRepsEditProp,
  manualEdit,
  setManualEdit: setManualEditProp,
  cellEdit,
  setCellEdit: setCellEditProp,
  cellManual,
  setCellManual: setCellManualProp,
  nameEdit,
  setNameEdit: setNameEditProp,
  noteEdit,
  setNoteEdit: setNoteEditProp,
  normativos: normativosProp = null,
  initialSemActiva = 0,
  initialTurnoActivo = 0,
  onNavChange,
}) {
  const [semActiva, setSemActivaRaw] = useState(() => {
    const maxSem = (semanas?.length || 1) - 1;
    return Math.max(0, Math.min(initialSemActiva, maxSem));
  });
  const [turnoActivo, setTurnoActivoRaw] = useState(() => {
    const maxTurno = (semanas?.[initialSemActiva]?.turnos?.length || 1) - 1;
    return Math.max(0, Math.min(initialTurnoActivo, maxTurno));
  });

  // Wrappers that also report navigation changes to parent
  const setSemActiva = (v) => {
    setSemActivaRaw((prev) => {
      const next = typeof v === "function" ? v(prev) : v;
      return next;
    });
  };
  const setTurnoActivo = (v) => {
    setTurnoActivoRaw((prev) => {
      const next = typeof v === "function" ? v(prev) : v;
      return next;
    });
  };

  // Report navigation changes back to parent
  useEffect(() => {
    onNavChange?.({ semActiva, turnoActivo });
  }, [semActiva, turnoActivo]);
  const [tipSem, setTipSem] = useState(null);
  const [tipTurno, setTipTurno] = useState(null);
  const [compPickerOpen, setCompPickerOpen] = useState(null); // compId | null
  const [compPickerQuery, setCompPickerQuery] = useState("");
  const [compPickerActiveIdx, setCompPickerActiveIdx] = useState(0);
  const [compPasteFeedback, setCompPasteFeedback] = useState(false);
  const [compPasteTurnosSel, setCompPasteTurnosSel] = useState([]);
  const [compPasteSemanasSel, setCompPasteSemanasSel] = useState([]);
  const [compTurnosDropdownOpen, setCompTurnosDropdownOpen] = useState(false);
  const [compSemanasDropdownOpen, setCompSemanasDropdownOpen] = useState(false);
  const [compIntraTargetSel, setCompIntraTargetSel] = useState([]);
  const [compIntraDropdownOpen, setCompIntraDropdownOpen] = useState(false);
  const [compIntraFeedback, setCompIntraFeedback] = useState(false);
  const [importSemOrigen, setImportSemOrigen] = useState("");
  const [importSemFeedback, setImportSemFeedback] = useState(false);
  const [recalcFeedback, setRecalcFeedback] = useState(false);
  const compPasteTimerRef = useRef(null);
  const compIntraTimerRef = useRef(null);
  const importSemTimerRef = useRef(null);
  const recalcTimerRef = useRef(null);
  const compPickerListRef = useRef(null);
  const compPickerModalRef = useRef(null);
  const compTurnosDropdownRef = useRef(null);
  const compSemanasDropdownRef = useRef(null);
  const compIntraDropdownRef = useRef(null);
  const spreadsheetNavRef = useRef(null);

  useEffect(() => {
    if (compPickerOpen === null) return;

    const getFocusable = () => {
      const root = compPickerModalRef.current;
      if (!root) return [];
      return Array.from(
        root.querySelectorAll(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.getClientRects().length > 0);
    };

    const root = compPickerModalRef.current;
    const initial = getFocusable()[0] || root;
    if (initial && typeof initial.focus === "function") {
      initial.focus();
    }

    const onKeyDown = (e) => {
      if (e.key !== "Tab") return;

      const modalRoot = compPickerModalRef.current;
      if (!modalRoot) return;

      const items = getFocusable();
      if (items.length === 0) {
        e.preventDefault();
        modalRoot.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const isInside = modalRoot.contains(active);

      if (!isInside) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }

      if (e.shiftKey && active === first) {
        e.preventDefault();
        first.focus();
        return;
      }

      if (!e.shiftKey && active === last) {
        e.preventDefault();
        last.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [compPickerOpen]);

  // Clave única por mesociclo para persistencia
  const _k = (type) => `liftplan_pt_${meso.id}_${type}`;

  // Estados elevados — recibidos como props desde PageAtleta/PagePlantilla
  // para que el historial pueda restaurarlos directamente
  const setRepsEditRaw = setRepsEditProp;
  const setManualEditRaw = setManualEditProp;
  const setCellEditRaw = setCellEditProp;
  const setCellManualRaw = setCellManualProp;
  const setNameEditRaw = setNameEditProp;

  const _lastPushTime = useRef(0);
  // Debounced — para onFocus (evita push múltiple si el mismo campo pierde y recupera foco rápido)
  const _beforeChange = () => {
    try {
      if (onBeforeChange) {
        const now = Date.now();
        if (now - _lastPushTime.current > 300) {
          _lastPushTime.current = now;
          onBeforeChange();
        }
      }
    } catch {}
  };
  // Forzado — para doble click (siempre pushea, es una acción distinta)
  const _beforeChangeForced = () => {
    try {
      if (onBeforeChange) {
        _lastPushTime.current = 0; // reset debounce
        onBeforeChange(true); // forced=true
      }
    } catch {}
  };
  // Setters que persisten en localStorage
  const setRepsEdit = (val) => {
    setRepsEditRaw((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      try {
        localStorage.setItem(_k("repsEdit"), JSON.stringify(next));
      } catch {}
      return next;
    });
  };
  const setManualEdit = (val) => {
    setManualEditRaw((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      try {
        localStorage.setItem(_k("manualEdit"), JSON.stringify([...next]));
      } catch {}
      return next;
    });
  };
  const setCellEdit = (val) => {
    setCellEditRaw((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      try {
        localStorage.setItem(_k("cellEdit"), JSON.stringify(next));
      } catch {}
      return next;
    });
  };
  const setCellManual = (val) => {
    setCellManualRaw((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      try {
        localStorage.setItem(_k("cellManual"), JSON.stringify([...next]));
      } catch {}
      return next;
    });
  };

  // nameEdit: "sem-turno-ejId" → nombre personalizado (solo en esta planilla)
  const setNameEdit = (val) => {
    setNameEditRaw((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      try {
        localStorage.setItem(_k("nameEdit"), JSON.stringify(next));
      } catch {}
      return next;
    });
  };
  const [nameEditing, setNameEditing] = useState(null);

  // noteEdit: "sem-turno-ejId-intens" → aclaración de combinado — elevado a prop
  const setNoteEditRaw = setNoteEditProp;
  const setNoteEdit = (val) =>
    setNoteEditRaw((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      try {
        localStorage.setItem(_k("noteEdit"), JSON.stringify(next));
      } catch {}
      return next;
    });

  // Helper: get effective % of a group in a semana (respects ResumenGrupos override)
  const getSemPct = (g, semIdx) => {
    const k = `${g}-${semIdx}`;
    if (semPctManual?.has(k)) return Number(semPctOverrides?.[k]) || 0;
    // fallback: calculated from sembrado
    const { porGrupo, totalSem } = calcSembradoSemana(semanas[semIdx]);
    return totalSem > 0 ? (porGrupo[g].total / totalSem) * 100 : 0;
  };

  // Helper: get effective % of a group in a turno (respects DistribucionTurnos override)
  const getTurnoPct = (g, semIdx, tIdx) => {
    const k = `${g}-${semIdx}-${tIdx}`;
    if (turnoPctManual?.has(k)) return Number(turnoPctOverrides?.[k]) || 0;
    // fallback: calculated from sembrado
    const { porGrupo } = calcSembradoSemana(semanas[semIdx]);
    const total = porGrupo[g].total;
    return total > 0 ? (porGrupo[g].porTurno[tIdx] / total) * 100 : 0;
  };

  // Calcular tentativa usando los % efectivos (con overrides)
  const calcTentativa = (semIdx, tIdx) => {
    const s = semanas[semIdx];
    const t = s?.turnos[tIdx];
    if (!s || !t) return {};

    const reps_sem = meso.volumen_total * (s.pct_volumen / 100);
    const result = {};

    GRUPOS_KEYS.forEach((g) => {
      const pctGSem = getSemPct(g, semIdx) / 100;
      const pctGTurno = getTurnoPct(g, semIdx, tIdx) / 100;
      if (pctGSem === 0 || pctGTurno === 0) return;

      const repsBloque = Math.round(reps_sem * pctGSem * pctGTurno);

      const ejsG = t.ejercicios.filter(
        (e) => e.ejercicio_id && getGrupo(e.ejercicio_id) === g,
      );
      if (ejsG.length === 0) return;

      const editados = ejsG.filter((e) =>
        manualEdit.has(`${semIdx}-${tIdx}-${e.id}`),
      );
      const libres = ejsG.filter(
        (e) => !manualEdit.has(`${semIdx}-${tIdx}-${e.id}`),
      );

      const repsReservadas = editados.reduce((s, e) => {
        const v = repsEdit[`${semIdx}-${tIdx}-${e.id}`];
        return s + (v !== undefined ? Number(v) : 0);
      }, 0);

      const repsLibres = Math.max(0, repsBloque - repsReservadas);
      if (libres.length === 0) return;

      const base = Math.floor(repsLibres / libres.length);
      const extra = repsLibres - base * libres.length;
      libres.forEach((e, i) => {
        result[`${semIdx}-${tIdx}-${e.id}`] = base + (i < extra ? 1 : 0);
      });
    });
    return result;
  };

  // Tentativa calculada inline para el turno activo actual
  const tentativaActual = calcTentativa(semActiva, turnoActivo);

  // Al cambiar semana o turno, pre-cargar tentativa si la casilla está vacía
  const setTurnoConTentativa = (semIdx, tIdx) => {
    const tentativa = calcTentativa(semIdx, tIdx);
    setRepsEdit((prev) => {
      const next = { ...prev };
      Object.entries(tentativa).forEach(([k, v]) => {
        if (next[k] === undefined) next[k] = v;
      });
      return next;
    });
  };

  const forzarRecalculoPlanilla = () => {
    _beforeChangeForced();

    // Conserva solo edits manuales; el resto vuelve a valores calculados en el render actual.
    setRepsEdit((prev) => {
      const next = {};
      manualEdit.forEach((k) => {
        if (prev[k] !== undefined) next[k] = prev[k];
      });
      return next;
    });

    if (recalcTimerRef.current) clearTimeout(recalcTimerRef.current);
    setRecalcFeedback(true);
    recalcTimerRef.current = setTimeout(() => {
      setRecalcFeedback(false);
    }, 1200);
  };
  const turnoRef = useRef(null);
  const turnoContentRef = useRef(null);

  const tablas = (() => {
    try {
      return (
        JSON.parse(localStorage.getItem("liftplan_tablas") || "null") ||
        TABLA_DEFAULT
      );
    } catch {
      return TABLA_DEFAULT;
    }
  })();
  const normativos =
    normativosProp ??
    (() => {
      try {
        return (
          JSON.parse(localStorage.getItem("liftplan_normativos") || "null") ||
          EJERCICIOS
        );
      } catch {
        return EJERCICIOS;
      }
    })();

  const sem = semanas[semActiva];
  const turno = sem?.turnos[turnoActivo];
  const ejs = turno?.ejercicios.filter((e) => e.ejercicio_id) || [];
  const modo = meso.modo;

  // Reps disponibles por grupo en este turno (usa % efectivos con overrides)
  const calcRepsBloque = () => {
    if (!sem || !turno) return {};
    const reps_sem = meso.volumen_total * (sem.pct_volumen / 100);
    const result = {};
    GRUPOS_KEYS.forEach((g) => {
      const pctGSem = getSemPct(g, semActiva) / 100;
      const pctGTurno = getTurnoPct(g, semActiva, turnoActivo) / 100;
      if (pctGSem === 0 || pctGTurno === 0) return;
      result[g] = Math.round(reps_sem * pctGSem * pctGTurno);
    });
    return result;
  };
  const repsBloque = calcRepsBloque();

  // Reps ya asignadas a los ejercicios de cada grupo en este turno
  const repsUsadas = (g) => {
    return ejs
      .filter((e) => getGrupo(e.ejercicio_id) === g)
      .reduce((s, e) => {
        const k = `${semActiva}-${turnoActivo}-${e.id}`;
        // If manually edited → use that value
        // Otherwise → use current tentativa (recalculated with current ejs)
        const v = manualEdit.has(k)
          ? repsEdit[k]
          : e.reps_asignadas > 0
            ? e.reps_asignadas
            : (tentativaActual[k] ?? 0);
        return s + Number(v);
      }, 0);
  };

  const cambiarSem = (i, opts = {}) => {
    const { scroll = true } = opts;

    setSemActiva(i);
    setTurnoActivo(0);
    setTimeout(() => {
      if (scroll) {
        turnoRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
      setTurnoConTentativa(i, 0);
    }, 30);
  };

  useEffect(() => {
    if (importSemOrigen === "") return;
    if (Number(importSemOrigen) === semActiva) setImportSemOrigen("");
  }, [importSemOrigen, semActiva]);

  useEffect(() => {
    const turnosCount = sem?.turnos?.length || 0;
    setCompPasteTurnosSel((prev) => {
      if (turnosCount <= 0) return [];
      const valid = (prev || []).filter((v) => {
        const idx = Number(v);
        return Number.isInteger(idx) && idx >= 0 && idx < turnosCount;
      });
      if (valid.length > 0) return Array.from(new Set(valid));
      return [String(turnoActivo)];
    });
  }, [sem, turnoActivo]);

  useEffect(() => {
    setCompPasteSemanasSel((prev) => {
      const destinoSet = new Set(
        semanas
          .map((_, i) => i)
          .filter((i) => i !== semActiva)
          .map(String),
      );
      if (destinoSet.size === 0) return [];
      const valid = (prev || []).filter((v) => destinoSet.has(String(v)));
      if (valid.length > 0) return Array.from(new Set(valid));
      return Array.from(destinoSet);
    });
  }, [semanas, semActiva]);

  useEffect(
    () => () => {
      if (compPasteTimerRef.current) clearTimeout(compPasteTimerRef.current);
      if (recalcTimerRef.current) clearTimeout(recalcTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    const onDocPointerDown = (event) => {
      const t = event.target;
      if (
        compTurnosDropdownRef.current &&
        !compTurnosDropdownRef.current.contains(t)
      ) {
        setCompTurnosDropdownOpen(false);
      }
      if (
        compSemanasDropdownRef.current &&
        !compSemanasDropdownRef.current.contains(t)
      ) {
        setCompSemanasDropdownOpen(false);
      }
      if (
        compIntraDropdownRef.current &&
        !compIntraDropdownRef.current.contains(t)
      ) {
        setCompIntraDropdownOpen(false);
      }
    };
    document.addEventListener("click", onDocPointerDown);
    return () => {
      document.removeEventListener("click", onDocPointerDown);
    };
  }, []);

  const handleSpreadsheetNavKeyDown = useCallback((event) => {
    handlePlanillaArrowNavigation(event, spreadsheetNavRef.current);
  }, []);

  const pegarComplementariosSeleccionados = () => {
    const sourceTurnos = (compPasteTurnosSel || [])
      .map((v) => Number(v))
      .filter((idx) => Number.isInteger(idx));

    const targetSemanas = (compPasteSemanasSel || [])
      .map((v) => Number(v))
      .filter(
        (idx) =>
          Number.isInteger(idx) &&
          idx >= 0 &&
          idx < semanas.length &&
          idx !== semActiva,
      );

    const turnosCount = sem?.turnos?.length || 0;
    const validSourceTurnos = sourceTurnos.filter(
      (idx) => idx >= 0 && idx < turnosCount,
    );
    if (targetSemanas.length === 0 || validSourceTurnos.length === 0) return;

    _beforeChangeForced();

    const cloneCompList = (list) => JSON.parse(JSON.stringify(list || []));

    if (onChangeTodasSemanas) {
      const nextSemanas = JSON.parse(JSON.stringify(semanas));

      targetSemanas.forEach((sIdx) => {
        validSourceTurnos.forEach((tIdx) => {
          const sourceTurno = sem?.turnos?.[tIdx];
          if (!sourceTurno) return;
          const targetTurno = nextSemanas[sIdx]?.turnos?.[tIdx];
          if (!targetTurno) return;

          targetTurno.num_bloques_comp = sourceTurno.num_bloques_comp || 1;
          targetTurno.complementarios_before = cloneCompList(
            sourceTurno.complementarios_before,
          );
          targetTurno.complementarios_after = cloneCompList(
            sourceTurno.complementarios_after,
          );
        });
      });

      onChangeTodasSemanas(nextSemanas);
    } else {
      targetSemanas.forEach((sIdx) => {
        validSourceTurnos.forEach((tIdx) => {
          const sourceTurno = sem?.turnos?.[tIdx];
          if (!sourceTurno) return;
          const targetTurno = semanas[sIdx]?.turnos?.[tIdx];
          if (!targetTurno) return;

          onChangeTurno?.(sIdx, tIdx, {
            ...targetTurno,
            num_bloques_comp: sourceTurno.num_bloques_comp || 1,
            complementarios_before: cloneCompList(
              sourceTurno.complementarios_before,
            ),
            complementarios_after: cloneCompList(
              sourceTurno.complementarios_after,
            ),
          });
        });
      });
    }

    if (compPasteTimerRef.current) clearTimeout(compPasteTimerRef.current);
    setCompPasteFeedback(true);
    compPasteTimerRef.current = setTimeout(() => {
      setCompPasteFeedback(false);
    }, 1500);
  };

  const toggleCompTurnoSel = (idx) => {
    const k = String(idx);
    setCompPasteTurnosSel((prev) => {
      if ((prev || []).includes(k)) return prev.filter((v) => v !== k);
      return [...(prev || []), k];
    });
  };

  const toggleCompSemanaSel = (idx) => {
    const k = String(idx);
    setCompPasteSemanasSel((prev) => {
      if ((prev || []).includes(k)) return prev.filter((v) => v !== k);
      return [...(prev || []), k];
    });
  };

  const toggleCompIntraTargetSel = (idx) => {
    const k = String(idx);
    setCompIntraTargetSel((prev) => {
      if ((prev || []).includes(k)) return prev.filter((v) => v !== k);
      return [...(prev || []), k];
    });
  };

  const pegarCompEnTurnosMismaSemana = () => {
    const targetTurnos = (compIntraTargetSel || [])
      .map((v) => Number(v))
      .filter(
        (idx) =>
          Number.isInteger(idx) &&
          idx >= 0 &&
          idx < (sem?.turnos?.length || 0) &&
          idx !== turnoActivo,
      );
    if (targetTurnos.length === 0) return;

    const sourceTurno = sem?.turnos?.[turnoActivo];
    if (!sourceTurno) return;

    _beforeChangeForced();

    const cloneCompList = (list) => JSON.parse(JSON.stringify(list || []));

    if (onChangeTodasSemanas) {
      const nextSemanas = JSON.parse(JSON.stringify(semanas));
      targetTurnos.forEach((tIdx) => {
        const targetTurno = nextSemanas[semActiva]?.turnos?.[tIdx];
        if (!targetTurno) return;
        targetTurno.num_bloques_comp = sourceTurno.num_bloques_comp || 1;
        targetTurno.complementarios_before = cloneCompList(
          sourceTurno.complementarios_before,
        );
        targetTurno.complementarios_after = cloneCompList(
          sourceTurno.complementarios_after,
        );
      });
      onChangeTodasSemanas(nextSemanas);
    } else {
      targetTurnos.forEach((tIdx) => {
        const targetTurno = sem?.turnos?.[tIdx];
        if (!targetTurno) return;
        onChangeTurno?.(semActiva, tIdx, {
          ...targetTurno,
          num_bloques_comp: sourceTurno.num_bloques_comp || 1,
          complementarios_before: cloneCompList(
            sourceTurno.complementarios_before,
          ),
          complementarios_after: cloneCompList(
            sourceTurno.complementarios_after,
          ),
        });
      });
    }

    if (compIntraTimerRef.current) clearTimeout(compIntraTimerRef.current);
    setCompIntraFeedback(true);
    compIntraTimerRef.current = setTimeout(() => {
      setCompIntraFeedback(false);
    }, 1500);
  };

  const importarSemanaEnActual = () => {
    const srcIdx = Number(importSemOrigen);
    if (!Number.isInteger(srcIdx)) return;
    if (srcIdx < 0 || srcIdx >= semanas.length || srcIdx === semActiva) return;

    _beforeChangeForced();

    const nextSemanas = JSON.parse(JSON.stringify(semanas));
    const src = nextSemanas[srcIdx];
    const dst = nextSemanas[semActiva];
    if (!src || !dst) return;

    const srcClone = JSON.parse(JSON.stringify(src));
    srcClone.id = dst.id;
    srcClone.numero = dst.numero;
    nextSemanas[semActiva] = srcClone;
    onChangeTodasSemanas?.(nextSemanas);

    const srcPrefix = `${srcIdx}-`;
    const dstPrefix = `${semActiva}-`;
    const remapObjBySemana = (obj) => {
      const next = {};
      Object.entries(obj || {}).forEach(([k, v]) => {
        if (k.startsWith(dstPrefix)) return;
        if (k.startsWith(srcPrefix)) {
          next[`${dstPrefix}${k.slice(srcPrefix.length)}`] = v;
          return;
        }
        next[k] = v;
      });
      return next;
    };
    const remapSetBySemana = (setObj) => {
      const next = new Set();
      Array.from(setObj || []).forEach((k) => {
        if (k.startsWith(dstPrefix)) return;
        if (k.startsWith(srcPrefix)) {
          next.add(`${dstPrefix}${k.slice(srcPrefix.length)}`);
          return;
        }
        next.add(k);
      });
      return next;
    };

    setRepsEdit(remapObjBySemana);
    setManualEdit(remapSetBySemana);
    setCellEdit(remapObjBySemana);
    setCellManual(remapSetBySemana);
    setNameEdit(remapObjBySemana);
    setNoteEdit(remapObjBySemana);

    if (importSemTimerRef.current) clearTimeout(importSemTimerRef.current);
    setImportSemFeedback(true);
    importSemTimerRef.current = setTimeout(() => {
      setImportSemFeedback(false);
    }, 1500);
  };

  return (
    <div
      id={`${scrollIdPrefix}-dias`}
      ref={turnoRef}
      onKeyDown={handleSpreadsheetNavKeyDown}
      style={{ marginTop: 16, scrollMarginTop: 110 }}
    >
      <div ref={spreadsheetNavRef}>
        {/* Semana tabs */}
        <div
          className="semana-tabs"
          style={{ marginBottom: 8, position: "relative" }}
        >
          {semanas.map((s, i) => {
            const [semTip, setSemTip] = [tipSem, setTipSem];
            return (
              <div
                key={s.id}
                style={{ position: "relative", display: "inline-block" }}
              >
                <button
                  className={`semana-tab${semActiva === i ? " active" : ""}`}
                  onClick={() => cambiarSem(i)}
                  onMouseEnter={(e) => {
                    if (semActiva === i) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTipSem({ idx: i, x: rect.left, y: rect.top });
                  }}
                  onMouseLeave={() => setTipSem(null)}
                >
                  Semana {s.numero}
                </button>
                {tipSem?.idx === i &&
                  (() => {
                    // Collect all ejs in this semana with their tentative reps
                    const rows = [];
                    s.turnos.forEach((t, tIdx) => {
                      const ejsT = t.ejercicios.filter((e) => e.ejercicio_id);
                      if (!ejsT.length) return;
                      ejsT.forEach((e) => {
                        const ejData = EJERCICIOS.find(
                          (x) => x.id === Number(e.ejercicio_id),
                        );
                        const k = `${i}-${tIdx}-${e.id}`;
                        const tent = calcTentativa(i, tIdx);
                        const reps =
                          repsEdit[k] !== undefined
                            ? repsEdit[k]
                            : e.reps_asignadas > 0
                              ? e.reps_asignadas
                              : (tent[k] ?? 0);
                        rows.push({
                          tIdx,
                          ejId: e.ejercicio_id,
                          int: e.intensidad,
                          col: ejData
                            ? CAT_COLOR[ejData.categoria]
                            : "var(--muted)",
                          reps,
                        });
                      });
                    });
                    return (
                      <div
                        style={{
                          position: "fixed",
                          left: tipSem.x,
                          bottom: `calc(100vh - ${tipSem.y}px + 6px)`,
                          top: "auto",
                          zIndex: 200,
                          minWidth: "fit-content",
                          maxWidth: "80vw",
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                          borderRadius: 10,
                          boxShadow: "0 8px 32px rgba(0,0,0,.5)",
                          padding: "10px 12px",
                          pointerEvents: "none",
                          textAlign: "left",
                        }}
                      >
                        <div
                          style={{
                            fontFamily: "'Bebas Neue'",
                            fontSize: 15,
                            color: "var(--gold)",
                            marginBottom: 6,
                            lineHeight: 1,
                          }}
                        >
                          Semana {s.numero}
                        </div>
                        {rows.length === 0 ? (
                          <div style={{ fontSize: 11, color: "var(--muted)" }}>
                            Sin ejercicios
                          </div>
                        ) : (
                          (() => {
                            // Group by turno
                            const byTurno = {};
                            rows.forEach((r) => {
                              if (!byTurno[r.tIdx]) byTurno[r.tIdx] = [];
                              byTurno[r.tIdx].push(r);
                            });
                            return Object.entries(byTurno).map(
                              ([tIdx, ejs]) => (
                                <div
                                  key={tIdx}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    padding: "6px 0",
                                    borderTop: "1px solid var(--border)",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontFamily: "'Bebas Neue'",
                                      fontSize: 16,
                                      color: "var(--muted)",
                                      minWidth: 24,
                                      flexShrink: 0,
                                    }}
                                  >
                                    T{Number(tIdx) + 1}
                                  </span>
                                  {ejs.map((r, k) => (
                                    <span
                                      key={k}
                                      style={{
                                        display: "flex",
                                        alignItems: "baseline",
                                        gap: 4,
                                        background: `${r.col}15`,
                                        borderRadius: 5,
                                        padding: "3px 8px",
                                        flexShrink: 0,
                                      }}
                                    >
                                      <span
                                        style={{
                                          fontFamily: "'Bebas Neue'",
                                          color: r.col,
                                          fontSize: 18,
                                          lineHeight: 1,
                                        }}
                                      >
                                        {r.ejId}
                                      </span>
                                      <span
                                        style={{
                                          color: "var(--muted)",
                                          fontSize: 10,
                                          alignSelf: "center",
                                        }}
                                      >
                                        {r.int}%
                                      </span>
                                      <span
                                        style={{
                                          fontFamily: "'Bebas Neue'",
                                          fontSize: 20,
                                          lineHeight: 1,
                                          color: "var(--gold)",
                                        }}
                                      >
                                        {r.reps || "—"}
                                      </span>
                                    </span>
                                  ))}
                                </div>
                              ),
                            );
                          })()
                        )}
                      </div>
                    );
                  })()}
              </div>
            );
          })}
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <select
              name="field_6"
              value={importSemOrigen}
              onChange={(e) => setImportSemOrigen(e.target.value)}
              disabled={semanas.length <= 1}
              style={{
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                color: "var(--text)",
                fontSize: 11,
                padding: "4px 8px",
                outline: "none",
                minWidth: 150,
              }}
              title="Selecciona una semana para importarla sobre la semana activa"
            >
              <option value="">Importar semana...</option>
              {semanas.map((s, i) =>
                i === semActiva ? null : (
                  <option key={`imp-${s.id}`} value={i}>
                    Semana {s.numero}
                  </option>
                ),
              )}
            </select>
            <button
              onClick={importarSemanaEnActual}
              disabled={importSemOrigen === "" || semanas.length <= 1}
              title="Importar el sembrado completo de la semana seleccionada en esta semana"
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                border: importSemFeedback
                  ? "1px solid rgba(77,182,172,.45)"
                  : "1px solid var(--border)",
                background: importSemFeedback
                  ? "rgba(77,182,172,.12)"
                  : "var(--surface2)",
                color: importSemFeedback ? "#4db6ac" : "var(--muted)",
                cursor:
                  importSemOrigen === "" || semanas.length <= 1
                    ? "not-allowed"
                    : "pointer",
                fontSize: 10,
                fontFamily: "'DM Sans'",
                fontWeight: 600,
                opacity:
                  importSemOrigen === "" || semanas.length <= 1 ? 0.65 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {importSemFeedback ? "Semana importada" : "Importar"}
            </button>
          </div>
        </div>

        {/* Turno tabs */}
        <div
          style={{
            display: "flex",
            gap: 4,
            flexWrap: "wrap",
            marginBottom: 12,
            minWidth: 0,
          }}
        >
          {sem.turnos.map((t, i) => {
            const hasEjs = t.ejercicios.some((e) => e.ejercicio_id);
            return (
              <div
                key={t.id}
                style={{ position: "relative", display: "inline-block" }}
              >
                <button
                  onClick={() => {
                    setTurnoActivo(i);
                    setTurnoConTentativa(semActiva, i);
                    setTimeout(() => {
                      turnoContentRef.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                    }, 30);
                  }}
                  onMouseEnter={(e) => {
                    if (turnoActivo === i) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTipTurno({ idx: i, x: rect.left, y: rect.top });
                  }}
                  onMouseLeave={() => setTipTurno(null)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    border: "none",
                    background:
                      turnoActivo === i
                        ? "var(--gold)"
                        : hasEjs
                          ? "var(--surface3)"
                          : "var(--surface2)",
                    color:
                      turnoActivo === i
                        ? "#000"
                        : hasEjs
                          ? "var(--text)"
                          : "var(--muted)",
                    fontFamily: "'Bebas Neue'",
                    fontSize: 14,
                    cursor: "pointer",
                    letterSpacing: ".04em",
                  }}
                >
                  T{i + 1}
                  {t.dia ? ` · ${t.dia.slice(0, 3)}` : ""}
                </button>
                {tipTurno?.idx === i &&
                  hasEjs &&
                  (() => {
                    const ejsT = t.ejercicios.filter((e) => e.ejercicio_id);
                    const tent = calcTentativa(semActiva, i);
                    return (
                      <div
                        style={{
                          position: "fixed",
                          left: tipTurno.x,
                          bottom: `calc(100vh - ${tipTurno.y}px + 6px)`,
                          top: "auto",
                          zIndex: 200,
                          minWidth: "fit-content",
                          maxWidth: "80vw",
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                          borderRadius: 10,
                          boxShadow: "0 8px 32px rgba(0,0,0,.5)",
                          padding: "10px 12px",
                          pointerEvents: "none",
                        }}
                      >
                        <div
                          style={{
                            fontFamily: "'Bebas Neue'",
                            fontSize: 14,
                            color: "var(--gold)",
                            marginBottom: 6,
                            lineHeight: 1,
                          }}
                        >
                          Turno {i + 1}
                          {t.dia ? ` · ${t.dia} ${t.momento || ""}` : ""}
                        </div>
                        {ejsT.map((e, k) => {
                          const ejData = EJERCICIOS.find(
                            (x) => x.id === Number(e.ejercicio_id),
                          );
                          const col = ejData
                            ? CAT_COLOR[ejData.categoria]
                            : "var(--muted)";
                          const key = `${semActiva}-${i}-${e.id}`;
                          const reps =
                            repsEdit[key] !== undefined
                              ? repsEdit[key]
                              : e.reps_asignadas > 0
                                ? e.reps_asignadas
                                : (tent[key] ?? "—");
                          return (
                            <div
                              key={k}
                              style={{
                                display: "flex",
                                alignItems: "baseline",
                                gap: 4,
                                padding: "4px 0",
                                borderTop: "1px solid var(--border)",
                              }}
                            >
                              {/* ID */}
                              <span
                                style={{
                                  fontFamily: "'Bebas Neue'",
                                  fontSize: 18,
                                  color: col,
                                  background: `${col}18`,
                                  padding: "0 7px",
                                  borderRadius: 4,
                                  flexShrink: 0,
                                  lineHeight: "1.4",
                                }}
                              >
                                {e.ejercicio_id}
                              </span>
                              {/* INT — pequeño y gris */}
                              <span
                                style={{
                                  fontSize: 10,
                                  color: "var(--muted)",
                                  flexShrink: 0,
                                  alignSelf: "center",
                                }}
                              >
                                {e.intensidad}%
                              </span>
                              {/* Reps — grande dorado */}
                              <span
                                style={{
                                  fontFamily: "'Bebas Neue'",
                                  fontSize: 20,
                                  color: "var(--gold)",
                                  flexShrink: 0,
                                  lineHeight: 1,
                                  marginLeft: 4,
                                }}
                              >
                                {reps}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
              </div>
            );
          })}
        </div>

        {turno && (
          <div ref={turnoContentRef}>
            {/* Header turno */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 10,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  fontFamily: "'Bebas Neue'",
                  fontSize: 20,
                  color: "var(--gold)",
                }}
              >
                Turno {turnoActivo + 1}
              </div>
              {turno.dia && (
                <span className="badge badge-blue">
                  {turno.dia} {turno.momento}
                </span>
              )}
              <span
                className={`badge ${modo === "Competitivo" ? "badge-gold" : "badge-blue"}`}
              >
                {modo}
              </span>
              <button
                onClick={forzarRecalculoPlanilla}
                title="Fuerza el recálculo de toda la planilla usando los parámetros actuales"
                style={{
                  marginLeft: "auto",
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: recalcFeedback
                    ? "1px solid rgba(77,182,172,.45)"
                    : "1px solid var(--border)",
                  background: recalcFeedback
                    ? "rgba(77,182,172,.12)"
                    : "var(--surface2)",
                  color: recalcFeedback ? "#4db6ac" : "var(--muted)",
                  cursor: "pointer",
                  fontSize: 10,
                  fontFamily: "'DM Sans'",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                {recalcFeedback ? "Recalculado" : "Recalcular planilla"}
              </button>
            </div>

            {/* Bloques con reps disponibles — solo si quedan reps */}
            {Object.keys(repsBloque).length > 0 && (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginBottom: 14,
                }}
              >
                {GRUPOS_KEYS.filter((g) => repsBloque[g]).map((g) => {
                  const disponibles = repsBloque[g];
                  const usadas = repsUsadas(g);
                  const restantes = disponibles - usadas;
                  const col = CAT_COLOR[g];
                  if (restantes === 0) return null;
                  return (
                    <div
                      key={g}
                      style={{
                        background: `${col}10`,
                        border: `1px solid ${col}40`,
                        borderRadius: 8,
                        padding: "8px 14px",
                        textAlign: "center",
                        minWidth: 70,
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "'Bebas Neue'",
                          fontSize: 12,
                          color: col,
                          letterSpacing: ".05em",
                          marginBottom: 4,
                        }}
                      >
                        {g}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          gap: 6,
                          justifyContent: "center",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "'Bebas Neue'",
                            fontSize: 26,
                            color:
                              restantes < 0
                                ? "var(--red)"
                                : restantes === 0
                                  ? "var(--green)"
                                  : col,
                            lineHeight: 1,
                          }}
                        >
                          {restantes}
                        </span>
                        <span style={{ fontSize: 10, color: "var(--muted)" }}>
                          / {disponibles}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 9,
                          color: "var(--muted)",
                          marginTop: 2,
                        }}
                      >
                        reps restantes
                      </div>
                      {/* Barra de progreso */}
                      <div
                        style={{
                          height: 3,
                          background: "var(--surface3)",
                          borderRadius: 2,
                          marginTop: 6,
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            borderRadius: 2,
                            width: `${Math.min((usadas / disponibles) * 100, 100)}%`,
                            background:
                              restantes < 0
                                ? "var(--red)"
                                : restantes === 0
                                  ? "var(--green)"
                                  : col,
                            transition: "width .3s",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tabla de ejercicios */}
            {ejs.length === 0 ? (
              <>
                <div
                  id={`${scrollIdPrefix}-complementarios`}
                  style={{ scrollMarginTop: 110, height: 0 }}
                />
                <div
                  style={{
                    padding: "20px",
                    textAlign: "center",
                    color: "var(--muted)",
                    fontSize: 12,
                  }}
                >
                  Sin ejercicios sembrados en este turno
                </div>
              </>
            ) : (
              <div>
                {/* Hint + reset */}
                {cellManual.size > 0 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 8,
                      padding: "4px 10px",
                      background: "transparent",
                      border: "none",
                    }}
                  >
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>
                      ✏ {cellManual.size}{" "}
                      {cellManual.size === 1
                        ? "celda modificada"
                        : "celdas modificadas"}
                    </span>
                    <button
                      onClick={() =>
                        onRequestReset(
                          "todas las celdas de series, reps y kg",
                          () => {
                            setCellEdit({});
                            setCellManual(new Set());
                          },
                        )
                      }
                      style={{
                        marginLeft: "auto",
                        background: "none",
                        border: "none",
                        color: "var(--muted)",
                        fontSize: 10,
                        padding: "2px 4px",
                        cursor: "pointer",
                        textDecoration: "underline",
                      }}
                      onMouseEnter={(e) =>
                        (e.target.style.color = "var(--text)")
                      }
                      onMouseLeave={(e) =>
                        (e.target.style.color = "var(--muted)")
                      }
                    >
                      resetear todo
                    </button>
                  </div>
                )}
                <div style={{ overflowX: "auto" }}>
                  <table
                    className="planilla-tabla"
                    style={{
                      borderCollapse: "separate",
                      borderSpacing: "2px 2px",
                      width: "100%",
                    }}
                  >
                    <thead>
                      <tr>
                        <th
                          style={{
                            padding: "5px 6px",
                            background: "var(--surface2)",
                            border: "1px solid var(--border)",
                            borderRadius: 5,
                            textAlign: "center",
                            fontSize: 10,
                            color: "var(--muted)",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            width: 36,
                          }}
                        >
                          ID
                        </th>
                        <th
                          style={{
                            padding: "5px 6px",
                            background: "var(--surface2)",
                            border: "1px solid var(--border)",
                            borderRadius: 5,
                            fontSize: 10,
                            color: "var(--muted)",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            minWidth: 90,
                          }}
                        >
                          Ejercicio
                        </th>
                        <th
                          style={{
                            padding: "5px 6px",
                            background: "var(--surface2)",
                            border: "1px solid var(--border)",
                            borderRadius: 5,
                            textAlign: "center",
                            fontSize: 10,
                            color: "var(--muted)",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            width: 44,
                          }}
                        >
                          INT
                        </th>
                        <th
                          style={{
                            padding: "5px 6px",
                            background: "var(--surface2)",
                            border: "1px solid var(--border)",
                            borderRadius: 5,
                            textAlign: "center",
                            fontSize: 10,
                            color: "var(--muted)",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            width: 36,
                          }}
                        >
                          TBL
                        </th>
                        <th
                          style={{
                            padding: "5px 6px",
                            background: "rgba(232,197,71,.08)",
                            border: "1px solid rgba(232,197,71,.3)",
                            borderRadius: 5,
                            textAlign: "center",
                            fontSize: 10,
                            color: "var(--gold)",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            width: 52,
                          }}
                        >
                          Reps
                        </th>
                        {INTENSIDADES.map((v) => (
                          <th
                            key={v}
                            style={{
                              padding: "3px 2px",
                              background: "var(--surface2)",
                              border: "1px solid var(--border)",
                              borderRadius: 5,
                              textAlign: "center",
                              fontSize: 9,
                              color: "var(--muted)",
                              fontWeight: 700,
                              minWidth: 44,
                            }}
                          >
                            <div
                              style={{
                                color: "var(--gold)",
                                fontSize: 10,
                                marginBottom: 2,
                              }}
                            >
                              {v}%
                            </div>
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr 1fr",
                                gap: 0,
                              }}
                            >
                              {["S", "R", "K"].map((l) => (
                                <div
                                  key={l}
                                  style={{
                                    fontSize: 7,
                                    color: "var(--muted)",
                                    textAlign: "center",
                                    fontWeight: 700,
                                  }}
                                >
                                  {l}
                                </div>
                              ))}
                            </div>
                          </th>
                        ))}
                        <th
                          style={{
                            padding: "4px 6px",
                            background: "var(--surface2)",
                            border: "1px solid rgba(232,197,71,.3)",
                            borderRadius: 5,
                            textAlign: "center",
                            fontSize: 9,
                            color: "var(--gold)",
                            fontWeight: 700,
                            minWidth: 36,
                          }}
                        >
                          VOL
                          <br />
                          REPs
                        </th>
                        <th
                          style={{
                            padding: "4px 6px",
                            background: "var(--surface2)",
                            border: "1px solid rgba(71,180,232,.3)",
                            borderRadius: 5,
                            textAlign: "center",
                            fontSize: 9,
                            color: "var(--blue)",
                            fontWeight: 700,
                            minWidth: 36,
                          }}
                        >
                          VOL
                          <br />
                          Kg
                        </th>
                        <th
                          style={{
                            padding: "4px 6px",
                            background: "var(--surface2)",
                            border: "1px solid rgba(71,232,160,.3)",
                            borderRadius: 5,
                            textAlign: "center",
                            fontSize: 9,
                            color: "var(--green)",
                            fontWeight: 700,
                            minWidth: 40,
                          }}
                        >
                          PESO
                          <br />
                          MEDIO
                        </th>
                        <th
                          style={{
                            padding: "4px 6px",
                            background: "var(--surface2)",
                            border: "1px solid rgba(155,135,232,.35)",
                            borderRadius: 5,
                            textAlign: "center",
                            fontSize: 9,
                            color: "#9b87e8",
                            fontWeight: 700,
                            minWidth: 36,
                          }}
                        >
                          INT
                          <br />
                          MEDIA
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {ejs.map((ej, eIdx) => {
                        const ejData = normativos.find(
                          (e) => e.id === Number(ej.ejercicio_id),
                        );
                        const col = ejData
                          ? CAT_COLOR[ejData.categoria]
                          : "var(--muted)";
                        const irm =
                          ejData?.base === "arranque"
                            ? Number(irm_arr)
                            : Number(irm_env);
                        const baseKg = ejData?.pct_base
                          ? Math.round((irm * ejData.pct_base) / 100)
                          : null;
                        const k = `${semActiva}-${turnoActivo}-${ej.id}`;
                        const reps = manualEdit.has(k)
                          ? repsEdit[k]
                          : ej.reps_asignadas > 0
                            ? ej.reps_asignadas
                            : (tentativaActual[k] ?? "");

                        return (
                          <tr
                            key={ej.id}
                            style={{
                              background:
                                eIdx % 2 === 0
                                  ? "var(--surface2)"
                                  : "transparent",
                            }}
                          >
                            <td
                              style={{
                                padding: "5px 6px",
                                textAlign: "center",
                                fontFamily: "'Bebas Neue'",
                                fontSize: 16,
                                color: col,
                                border: `1px solid ${col}30`,
                                borderRadius: 5,
                                background: `${col}0a`,
                              }}
                            >
                              {ej.ejercicio_id}
                            </td>
                            {(() => {
                              const nk = `${semActiva}-${turnoActivo}-${ej.ejercicio_id}`;
                              const customName = nameEdit[nk];
                              return (
                                <td
                                  style={{
                                    padding: "3px 6px",
                                    border: "1px solid var(--border)",
                                    borderRadius: 5,
                                    position: "relative",
                                    background: customName
                                      ? "rgba(232,197,71,.04)"
                                      : "transparent",
                                  }}
                                >
                                  {customName && (
                                    <span
                                      style={{
                                        position: "absolute",
                                        top: 2,
                                        right: 3,
                                        width: 4,
                                        height: 4,
                                        borderRadius: "50%",
                                        background: "var(--muted)",
                                      }}
                                    />
                                  )}
                                  {nameEditing === nk ? (
                                    <input
                                      name="field_7"
                                      autoFocus
                                      type="text"
                                      defaultValue={
                                        customName || ejData?.nombre || ""
                                      }
                                      onBlur={(e) => {
                                        const v = e.target.value.trim();
                                        if (v && v !== ejData?.nombre) {
                                          setNameEdit((prev) => ({
                                            ...prev,
                                            [nk]: v,
                                          }));
                                        } else {
                                          setNameEdit((prev) => {
                                            const n = { ...prev };
                                            delete n[nk];
                                            return n;
                                          });
                                        }
                                        setNameEditing(null);
                                      }}
                                      onKeyDown={(e) => {
                                        if (
                                          e.key === "Enter" ||
                                          e.key === "Escape"
                                        )
                                          e.target.blur();
                                      }}
                                      style={{
                                        width: "100%",
                                        background: "transparent",
                                        border: "none",
                                        color: "var(--text)",
                                        fontSize: 11,
                                        outline: "none",
                                        padding: "2px 0",
                                        fontFamily: "'DM Sans'",
                                      }}
                                    />
                                  ) : (
                                    <div
                                      onClick={() => setNameEditing(nk)}
                                      title="Click para editar nombre (solo en este turno)"
                                      style={{
                                        fontSize: 11,
                                        color: "var(--text)",
                                        cursor: "text",
                                        padding: "2px 0",
                                        maxWidth: 120,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {customName || ejData?.nombre || "—"}
                                    </div>
                                  )}
                                </td>
                              );
                            })()}
                            <td
                              style={{
                                padding: "5px 6px",
                                textAlign: "center",
                                fontFamily: "'Bebas Neue'",
                                fontSize: 15,
                                color: "var(--text)",
                                border: "1px solid var(--border)",
                                borderRadius: 5,
                              }}
                            >
                              {ej.intensidad}%
                            </td>
                            <td
                              style={{
                                padding: "5px 6px",
                                textAlign: "center",
                                fontSize: 11,
                                color: "var(--muted)",
                                border: "1px solid var(--border)",
                                borderRadius: 5,
                              }}
                            >
                              T{ej.tabla}
                            </td>
                            {/* Reps — casilla editable, resaltada si fue modificada a mano */}
                            {(() => {
                              const isManual = manualEdit.has(k);
                              return (
                                <td
                                  style={{
                                    padding: "3px 4px",
                                    textAlign: "center",
                                    background: isManual
                                      ? "rgba(71,180,232,.12)"
                                      : "rgba(232,197,71,.06)",
                                    border: isManual
                                      ? "1px solid var(--blue)"
                                      : "1px solid rgba(232,197,71,.3)",
                                    borderRadius: 5,
                                    position: "relative",
                                  }}
                                >
                                  {isManual && (
                                    <span
                                      style={{
                                        position: "absolute",
                                        top: 2,
                                        right: 3,
                                        width: 5,
                                        height: 5,
                                        borderRadius: "50%",
                                        background: "var(--muted)",
                                        display: "block",
                                      }}
                                    />
                                  )}
                                  <input
                                    name="field_8"
                                    type="number"
                                    min={0}
                                    className="no-spin"
                                    value={reps}
                                    placeholder="—"
                                    onFocus={_beforeChange}
                                    onChange={(e) => {
                                      const v = Number(e.target.value);
                                      setRepsEditRaw((r) => {
                                        const next = { ...r, [k]: v };
                                        try {
                                          localStorage.setItem(
                                            _k("repsEdit"),
                                            JSON.stringify(next),
                                          );
                                        } catch {}
                                        return next;
                                      });
                                      setManualEditRaw((m) => {
                                        const next = new Set([...m, k]);
                                        try {
                                          localStorage.setItem(
                                            _k("manualEdit"),
                                            JSON.stringify([...next]),
                                          );
                                        } catch {}
                                        return next;
                                      });
                                    }}
                                    onDoubleClick={() => {
                                      _beforeChangeForced(); // push estado A (antes del reset)
                                      setRepsEditRaw((r) => {
                                        const next = { ...r };
                                        delete next[k];
                                        try {
                                          localStorage.setItem(
                                            _k("repsEdit"),
                                            JSON.stringify(next),
                                          );
                                        } catch {}
                                        return next;
                                      });
                                      setManualEditRaw((m) => {
                                        const next = new Set(m);
                                        next.delete(k);
                                        try {
                                          localStorage.setItem(
                                            _k("manualEdit"),
                                            JSON.stringify([...next]),
                                          );
                                        } catch {}
                                        return next;
                                      });
                                      // push estado B (después del reset) para que redo funcione
                                      setTimeout(() => {
                                        try {
                                          if (onBeforeChange) {
                                            _lastPushTime.current = 0;
                                            onBeforeChange(true);
                                          }
                                        } catch {}
                                      }, 0);
                                    }}
                                    title={
                                      isManual
                                        ? "Modificado manualmente — doble click para resetear al sugerido"
                                        : "Valor sugerido automáticamente"
                                    }
                                    style={{
                                      width: 44,
                                      background: "transparent",
                                      border: "none",
                                      color: isManual
                                        ? "var(--blue)"
                                        : "var(--gold)",
                                      fontFamily: "'Bebas Neue'",
                                      fontSize: 17,
                                      textAlign: "center",
                                      outline: "none",
                                      padding: "0 2px",
                                      MozAppearance: "textfield",
                                      appearance: "textfield",
                                    }}
                                  />
                                </td>
                              );
                            })()}
                            {/* Columnas de intensidad */}
                            {(() => {
                              const repsVal =
                                repsEdit[k] !== undefined
                                  ? repsEdit[k]
                                  : ej.reps_asignadas > 0
                                    ? ej.reps_asignadas
                                    : (tentativaActual[k] ?? 0);
                              const calcs = calcSeriesRepsKg(
                                tablas,
                                ej,
                                ejData,
                                irm_arr,
                                irm_env,
                                modo,
                                repsVal,
                              );
                              return INTENSIDADES.map((intens, iIdx) => {
                                const c = calcs ? calcs[iIdx] : null;
                                const hasData = c?.series != null;

                                // Helper: get value for a field (series/reps/kg), checking manual override first
                                const ck = (field) => `${k}-${intens}-${field}`;
                                const getVal = (field, calcVal) =>
                                  cellManual.has(ck(field))
                                    ? cellEdit[ck(field)]
                                    : calcVal;
                                const isManual = (field) =>
                                  cellManual.has(ck(field));

                                const inputCellStyle = (field, calcVal) => ({
                                  width: "100%",
                                  background: "transparent",
                                  border: "none",
                                  fontFamily: "'Bebas Neue'",
                                  fontSize: 13,
                                  textAlign: "center",
                                  lineHeight: 1.2,
                                  outline: "none",
                                  padding: 0,
                                  color:
                                    isManual(field) && field !== "kg"
                                      ? "var(--text)"
                                      : field === "kg"
                                        ? "var(--muted)"
                                        : "var(--text)",
                                  MozAppearance: "textfield",
                                  appearance: "textfield",
                                  cursor: "text",
                                  fontWeight: isManual(field) ? 700 : 400,
                                });

                                const handleFocus = _beforeChange;

                                const handleChange = (field, val) => {
                                  const key = ck(field);
                                  // Escribe directo sin _beforeChange (ya se capturó en onFocus)
                                  setCellEditRaw((prev) => {
                                    const next = {
                                      ...prev,
                                      [key]: val === "" ? "" : Number(val),
                                    };
                                    try {
                                      localStorage.setItem(
                                        _k("cellEdit"),
                                        JSON.stringify(next),
                                      );
                                    } catch {}
                                    return next;
                                  });
                                  setCellManualRaw((prev) => {
                                    const next = new Set([...prev, key]);
                                    try {
                                      localStorage.setItem(
                                        _k("cellManual"),
                                        JSON.stringify([...next]),
                                      );
                                    } catch {}
                                    return next;
                                  });
                                };

                                const handleReset = (field, e) => {
                                  if (e.detail === 2) {
                                    // double-click resets to calculated
                                    _beforeChangeForced(); // push estado A
                                    const key = ck(field);
                                    setCellManualRaw((prev) => {
                                      const next = new Set(prev);
                                      next.delete(key);
                                      try {
                                        localStorage.setItem(
                                          _k("cellManual"),
                                          JSON.stringify([...next]),
                                        );
                                      } catch {}
                                      return next;
                                    });
                                    // push estado B para redo
                                    setTimeout(() => {
                                      try {
                                        if (onBeforeChange) {
                                          _lastPushTime.current = 0;
                                          onBeforeChange(true);
                                        }
                                      } catch {}
                                    }, 0);
                                  }
                                };

                                const anyManual = ["series", "reps", "kg"].some(
                                  (f) => isManual(f),
                                );
                                const noteKey = `${k}-${intens}-note`;
                                const noteVal = noteEdit[noteKey] || "";
                                const hasNote = noteVal.trim() !== "";

                                const fields3 =
                                  hasData || anyManual
                                    ? [
                                        { field: "series", calc: c?.series },
                                        { field: "reps", calc: c?.reps_serie },
                                        { field: "kg", calc: c?.kg },
                                      ]
                                    : [
                                        { field: "series", calc: null },
                                        { field: "reps", calc: null },
                                        { field: "kg", calc: null },
                                      ];

                                return (
                                  <td
                                    key={intens}
                                    style={{
                                      padding: "4px 5px",
                                      textAlign: "center",
                                      background: "transparent",
                                      border: `1px solid ${anyManual || hasNote ? "var(--muted)" : "var(--border)"}`,
                                      borderRadius: 5,
                                      position: "relative",
                                    }}
                                  >
                                    {(anyManual || hasNote) && (
                                      <span
                                        style={{
                                          position: "absolute",
                                          top: 2,
                                          right: 3,
                                          width: 4,
                                          height: 4,
                                          borderRadius: "50%",
                                          background: "var(--muted)",
                                          display: "block",
                                        }}
                                      />
                                    )}
                                    <div
                                      style={{
                                        display: "grid",
                                        gridTemplateColumns: "1fr 1fr 1fr",
                                        gap: 0,
                                      }}
                                    >
                                      {fields3.map(({ field, calc }) => (
                                        <input
                                          name="field_9"
                                          key={field}
                                          type="number"
                                          className="no-spin"
                                          value={getVal(field, calc) ?? ""}
                                          placeholder="—"
                                          title={
                                            isManual(field)
                                              ? "Modificado · doble click para resetear"
                                              : field
                                          }
                                          onFocus={handleFocus}
                                          onChange={(e) =>
                                            handleChange(field, e.target.value)
                                          }
                                          onClick={(e) => handleReset(field, e)}
                                          style={inputCellStyle(field, calc)}
                                        />
                                      ))}
                                    </div>
                                    {/* Campo nota combinado — aparece si tiene contenido o al hacer click */}
                                    <input
                                      name="field_10"
                                      type="text"
                                      value={noteVal}
                                      placeholder={
                                        hasData || anyManual ? "…" : ""
                                      }
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        setNoteEdit((prev) => {
                                          const n = { ...prev };
                                          if (v.trim()) n[noteKey] = v;
                                          else delete n[noteKey];
                                          return n;
                                        });
                                      }}
                                      title="Aclaración (ej: 2+2+2 para combinados)"
                                      style={{
                                        display:
                                          hasData || anyManual || hasNote
                                            ? "block"
                                            : "none",
                                        width: "100%",
                                        background: "transparent",
                                        border: "none",
                                        borderTop: hasNote
                                          ? "1px solid var(--border)"
                                          : "none",
                                        color: "var(--muted)",
                                        fontSize: 9,
                                        textAlign: "center",
                                        outline: "none",
                                        padding: "2px 0 0",
                                        fontFamily: "'DM Sans'",
                                        marginTop: 2,
                                      }}
                                    />
                                  </td>
                                );
                              });
                            })()}
                            {/* VOL REPs y VOL Kg — al final de cada fila */}
                            {(() => {
                              const repsVal =
                                repsEdit[k] !== undefined
                                  ? repsEdit[k]
                                  : ej.reps_asignadas > 0
                                    ? ej.reps_asignadas
                                    : (tentativaActual[k] ?? 0);
                              const calcs = calcSeriesRepsKg(
                                tablas,
                                ej,
                                ejData,
                                irm_arr,
                                irm_env,
                                modo,
                                repsVal,
                              );
                              let volReps = 0,
                                volKg = 0;
                              INTENSIDADES.forEach((intens, iIdx) => {
                                const c = calcs ? calcs[iIdx] : null;
                                if (!c) return;
                                const ckf = (f) => `${k}-${intens}-${f}`;
                                const getV = (f, def) =>
                                  cellManual.has(ckf(f))
                                    ? Number(cellEdit[ckf(f)]) || 0
                                    : def || 0;
                                const s = getV("series", c.series);
                                const r = getV("reps", c.reps_serie);
                                const kg = getV("kg", c.kg);
                                // Si series=0 o null → usar 1 (igual que Excel)
                                const sEff = s && s > 0 ? s : r > 0 ? 1 : 0;
                                volReps += Math.round(sEff) * Math.round(r);
                                volKg +=
                                  Math.round(sEff) * Math.round(r) * (kg || 0);
                              });
                              return (
                                <>
                                  <td
                                    style={{
                                      padding: "5px 6px",
                                      textAlign: "center",
                                      background: "rgba(232,197,71,.06)",
                                      border: "1px solid rgba(232,197,71,.2)",
                                      borderRadius: 5,
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontFamily: "'Bebas Neue'",
                                        fontSize: 16,
                                        color: "var(--gold)",
                                        lineHeight: 1,
                                      }}
                                    >
                                      {volReps > 0 ? volReps : "—"}
                                    </div>
                                  </td>
                                  <td
                                    style={{
                                      padding: "5px 6px",
                                      textAlign: "center",
                                      background: "rgba(71,180,232,.06)",
                                      border: "1px solid rgba(71,180,232,.2)",
                                      borderRadius: 5,
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontFamily: "'Bebas Neue'",
                                        fontSize: 16,
                                        color: "var(--blue)",
                                        lineHeight: 1,
                                      }}
                                    >
                                      {volKg > 0
                                        ? Number.isInteger(volKg)
                                          ? volKg
                                          : volKg.toFixed(1)
                                        : "—"}
                                    </div>
                                  </td>
                                  <td
                                    style={{
                                      padding: "5px 6px",
                                      textAlign: "center",
                                      background: "rgba(71,232,160,.05)",
                                      border: "1px solid rgba(71,232,160,.2)",
                                      borderRadius: 5,
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontFamily: "'Bebas Neue'",
                                        fontSize: 16,
                                        color: "var(--green)",
                                        lineHeight: 1,
                                      }}
                                    >
                                      {volReps > 0 && volKg > 0
                                        ? (() => {
                                            const pm = volKg / volReps;
                                            return Number.isInteger(pm * 2) &&
                                              pm % 1 === 0
                                              ? pm
                                              : (
                                                  Math.round(pm * 2) / 2
                                                ).toFixed(1);
                                          })()
                                        : "—"}
                                    </div>
                                  </td>
                                  {/* Intensidad Media % = Peso Medio / IRM × 100 */}
                                  <td
                                    style={{
                                      padding: "5px 6px",
                                      textAlign: "center",
                                      background: "rgba(155,135,232,.05)",
                                      border: "1px solid rgba(155,135,232,.2)",
                                      borderRadius: 5,
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontFamily: "'Bebas Neue'",
                                        fontSize: 16,
                                        color: "#9b87e8",
                                        lineHeight: 1,
                                      }}
                                    >
                                      {(() => {
                                        if (
                                          volReps === 0 ||
                                          volKg === 0 ||
                                          !ejData
                                        )
                                          return "—";
                                        const irm =
                                          ejData.base === "arranque"
                                            ? Number(irm_arr)
                                            : Number(irm_env);
                                        if (!irm) return "—";
                                        const kgBase =
                                          (irm * (ejData.pct_base || 100)) /
                                          100;
                                        const intMedia =
                                          (volKg / volReps / kgBase) * 100;
                                        return Math.round(intMedia) + "%";
                                      })()}
                                    </div>
                                  </td>
                                </>
                              );
                            })()}
                          </tr>
                        );
                      })}
                      {/* Fila de totales del turno */}
                      {(() => {
                        let totalReps = 0,
                          totalKg = 0,
                          totalSumIntReps = 0;
                        ejs.forEach((ej) => {
                          const ejData2 = normativos.find(
                            (e) => e.id === Number(ej.ejercicio_id),
                          );
                          const k2 = `${semActiva}-${turnoActivo}-${ej.id}`;
                          const repsVal2 =
                            repsEdit[k2] !== undefined
                              ? repsEdit[k2]
                              : ej.reps_asignadas > 0
                                ? ej.reps_asignadas
                                : (tentativaActual[k2] ?? 0);
                          const calcs2 = calcSeriesRepsKg(
                            tablas,
                            ej,
                            ejData2,
                            irm_arr,
                            irm_env,
                            modo,
                            repsVal2,
                          );
                          if (!calcs2) return;
                          INTENSIDADES.forEach((intens, iIdx) => {
                            const c2 = calcs2[iIdx];
                            if (!c2) return;
                            const ckf2 = (f) => `${k2}-${intens}-${f}`;
                            const getV2 = (f, def) =>
                              cellManual.has(ckf2(f))
                                ? Number(cellEdit[ckf2(f)]) || 0
                                : def || 0;
                            const s2 = getV2("series", c2.series);
                            const r2 = getV2("reps", c2.reps_serie);
                            const kg2 = getV2("kg", c2.kg);
                            if (r2 === 0) return;
                            const sEff2 = s2 && s2 > 0 ? s2 : 1;
                            const rT2 = Math.round(sEff2) * Math.round(r2);
                            totalReps += rT2;
                            totalKg += rT2 * (kg2 || 0);
                            totalSumIntReps += intens * rT2;
                          });
                        });
                        // Intensidad Media total = Peso Medio total / kgBase promedio ponderado
                        // = Σ(pesoMedio_ej × reps_ej) / totalReps  donde pesoMedio_ej = volKg_ej/volReps_ej
                        // Equivalente: totalKg / totalReps / kgBase_ponderado
                        // Calculamos como Σ(intMedia_ej × volReps_ej) / totalReps
                        let sumIntMediaPond = 0,
                          totalRepsConIRM = 0;
                        ejs.forEach((ej) => {
                          const ejD = normativos.find(
                            (e) => e.id === Number(ej.ejercicio_id),
                          );
                          if (!ejD) return;
                          const irm2 =
                            ejD.base === "arranque"
                              ? Number(irm_arr)
                              : Number(irm_env);
                          const kgB =
                            irm2 && ejD.pct_base
                              ? (irm2 * ejD.pct_base) / 100
                              : null;
                          if (!kgB) return;
                          const k3 = `${semActiva}-${turnoActivo}-${ej.id}`;
                          const rv3 =
                            repsEdit[k3] !== undefined
                              ? repsEdit[k3]
                              : ej.reps_asignadas > 0
                                ? ej.reps_asignadas
                                : (tentativaActual[k3] ?? 0);
                          const c3 = calcSeriesRepsKg(
                            tablas,
                            ej,
                            ejD,
                            irm_arr,
                            irm_env,
                            modo,
                            rv3,
                          );
                          if (!c3) return;
                          let vR3 = 0,
                            vK3 = 0;
                          INTENSIDADES.forEach((intens, iIdx) => {
                            const cx = c3[iIdx];
                            if (!cx) return;
                            const ckx = (f) => `${k3}-${intens}-${f}`;
                            const gx = (f, d) =>
                              cellManual.has(ckx(f))
                                ? Number(cellEdit[ckx(f)]) || 0
                                : d || 0;
                            const s3 = gx("series", cx.series);
                            const r3 = gx("reps", cx.reps_serie);
                            const kg3 = gx("kg", cx.kg);
                            if (r3 === 0) return;
                            const se3 = s3 && s3 > 0 ? s3 : 1;
                            const rt3 = Math.round(se3) * Math.round(r3);
                            vR3 += rt3;
                            vK3 += rt3 * (kg3 || 0);
                          });
                          if (vR3 > 0 && vK3 > 0) {
                            const im3 = (vK3 / vR3 / kgB) * 100;
                            sumIntMediaPond += im3 * vR3;
                            totalRepsConIRM += vR3;
                          }
                        });
                        const intMediaTotal =
                          totalRepsConIRM > 0
                            ? Math.round(sumIntMediaPond / totalRepsConIRM)
                            : null;
                        const colSpan = 4 + INTENSIDADES.length; // ID + Ejercicio + INT + TBL + Reps + intensidades
                        if (totalReps === 0) return null;
                        return (
                          <tr>
                            <td
                              colSpan={colSpan + 1}
                              style={{
                                padding: "6px 8px",
                                textAlign: "right",
                                fontSize: 10,
                                color: "var(--muted)",
                                fontWeight: 700,
                                textTransform: "uppercase",
                                letterSpacing: ".06em",
                                borderTop: "1px solid var(--border)",
                              }}
                            >
                              Total turno
                            </td>
                            <td
                              style={{
                                padding: "5px 6px",
                                textAlign: "center",
                                background: "rgba(232,197,71,.12)",
                                border: "1px solid rgba(232,197,71,.4)",
                                borderRadius: 5,
                                borderTop: "1px solid var(--border)",
                              }}
                            >
                              <div
                                style={{
                                  fontFamily: "'Bebas Neue'",
                                  fontSize: 18,
                                  color: "var(--gold)",
                                  lineHeight: 1,
                                  fontWeight: 700,
                                }}
                              >
                                {totalReps}
                              </div>
                            </td>
                            <td
                              style={{
                                padding: "5px 6px",
                                textAlign: "center",
                                background: "rgba(71,180,232,.12)",
                                border: "1px solid rgba(71,180,232,.4)",
                                borderRadius: 5,
                                borderTop: "1px solid var(--border)",
                              }}
                            >
                              <div
                                style={{
                                  fontFamily: "'Bebas Neue'",
                                  fontSize: 18,
                                  color: "var(--blue)",
                                  lineHeight: 1,
                                  fontWeight: 700,
                                }}
                              >
                                {Number.isInteger(totalKg)
                                  ? totalKg
                                  : totalKg.toFixed(1)}
                              </div>
                            </td>
                            <td
                              style={{
                                padding: "5px 6px",
                                textAlign: "center",
                                background: "rgba(71,232,160,.12)",
                                border: "1px solid rgba(71,232,160,.4)",
                                borderRadius: 5,
                                borderTop: "1px solid var(--border)",
                              }}
                            >
                              <div
                                style={{
                                  fontFamily: "'Bebas Neue'",
                                  fontSize: 18,
                                  color: "var(--green)",
                                  lineHeight: 1,
                                  fontWeight: 700,
                                }}
                              >
                                {totalReps > 0 && totalKg > 0
                                  ? (() => {
                                      const pm = totalKg / totalReps;
                                      return (Math.round(pm * 2) / 2) % 1 === 0
                                        ? Math.round(pm * 2) / 2
                                        : (Math.round(pm * 2) / 2).toFixed(1);
                                    })()
                                  : "—"}
                              </div>
                            </td>
                            {/* Intensidad Media total */}
                            <td
                              style={{
                                padding: "5px 6px",
                                textAlign: "center",
                                background: "rgba(155,135,232,.12)",
                                border: "1px solid rgba(155,135,232,.4)",
                                borderRadius: 5,
                                borderTop: "1px solid var(--border)",
                              }}
                            >
                              <div
                                style={{
                                  fontFamily: "'Bebas Neue'",
                                  fontSize: 18,
                                  color: "#9b87e8",
                                  lineHeight: 1,
                                  fontWeight: 700,
                                }}
                              >
                                {intMediaTotal != null
                                  ? `${intMediaTotal}%`
                                  : "—"}
                              </div>
                            </td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
                {/* Leyenda */}
                <div
                  style={{
                    marginTop: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 11,
                      color: "var(--muted)",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "var(--muted)",
                      }}
                    />
                    Modificado manualmente
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>
                    Doble click en cualquier celda azul para volver al valor
                    sugerido
                  </div>
                </div>

                {/* Gráfico de barras por grupo del turno */}
                {(() => {
                  const grupoTotales = {};
                  GRUPOS_KEYS.forEach((g) => {
                    grupoTotales[g] = { reps: 0, kg: 0 };
                  });
                  ejs.forEach((ej) => {
                    const ejData2 = normativos.find(
                      (e) => e.id === Number(ej.ejercicio_id),
                    );
                    if (!ejData2) return;
                    const g = getGrupo(ej.ejercicio_id);
                    if (!g) return;
                    const k2 = `${semActiva}-${turnoActivo}-${ej.id}`;
                    const repsVal2 =
                      repsEdit[k2] !== undefined
                        ? repsEdit[k2]
                        : ej.reps_asignadas > 0
                          ? ej.reps_asignadas
                          : (tentativaActual[k2] ?? 0);
                    const calcs2 = calcSeriesRepsKg(
                      tablas,
                      ej,
                      ejData2,
                      irm_arr,
                      irm_env,
                      modo,
                      repsVal2,
                    );
                    if (!calcs2) return;
                    INTENSIDADES.forEach((intens, iIdx) => {
                      const c2 = calcs2[iIdx];
                      if (!c2) return;
                      const ckf2 = (f) => `${k2}-${intens}-${f}`;
                      const getV2 = (f, def) =>
                        cellManual.has(ckf2(f))
                          ? Number(cellEdit[ckf2(f)]) || 0
                          : def || 0;
                      const s2 = getV2("series", c2.series);
                      const r2 = getV2("reps", c2.reps_serie);
                      const kg2 = getV2("kg", c2.kg);
                      if (r2 === 0) return;
                      const sEff2 = s2 && s2 > 0 ? s2 : 1;
                      const rT2 = Math.round(sEff2) * Math.round(r2);
                      grupoTotales[g].reps += rT2;
                      grupoTotales[g].kg += rT2 * (kg2 || 0);
                    });
                  });
                  const barData = GRUPOS_KEYS.filter(
                    (g) => grupoTotales[g].reps > 0,
                  ).map((g) => ({
                    grupo: g.slice(0, 3).toUpperCase(),
                    fullName: g,
                    reps: grupoTotales[g].reps,
                    kg: Math.round(grupoTotales[g].kg),
                    color: CAT_COLOR[g],
                  }));
                  if (barData.length === 0) return null;
                  return (
                    <div
                      style={{
                        marginTop: 16,
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                        alignItems: "flex-end",
                      }}
                    >
                      {barData.map((d) => {
                        const maxReps = Math.max(...barData.map((x) => x.reps));
                        const pct = maxReps > 0 ? d.reps / maxReps : 0;
                        return (
                          <div
                            key={d.grupo}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: 4,
                              minWidth: 60,
                              flex: 1,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 10,
                                color: "var(--muted)",
                                fontFamily: "'Bebas Neue'",
                                letterSpacing: ".05em",
                              }}
                            >
                              {d.reps} reps
                            </div>
                            <div
                              style={{
                                width: "100%",
                                height: Math.max(8, Math.round(80 * pct)),
                                background: d.color,
                                borderRadius: "4px 4px 0 0",
                                transition: "height .3s",
                                opacity: 0.85,
                              }}
                            />
                            <div
                              style={{
                                fontSize: 10,
                                color: "var(--muted)",
                                marginTop: 2,
                              }}
                            >
                              {d.kg} kg
                            </div>
                            <div
                              style={{
                                fontFamily: "'Bebas Neue'",
                                fontSize: 13,
                                color: d.color,
                                letterSpacing: ".04em",
                              }}
                            >
                              {d.grupo}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* TABLA DE COMPLEMENTARIOS EDITABLE */}
                {(() => {
                  const turno = semanas[semActiva]?.turnos[turnoActivo];
                  if (!turno) return null;

                  const mkBloqueComp = () => ({
                    pct: null,
                    series: null,
                    reps: null,
                    kg: null,
                    nota: "",
                  });
                  const normComp = (c) => ({
                    nombre_custom: "",
                    ...c,
                    bloques: c.bloques || [mkBloqueComp()],
                  });
                  const numCompBloques = turno.num_bloques_comp || 1;

                  const allComps = [
                    ...(turno.complementarios_before || []).map((c) => ({
                      ...normComp(c),
                      _isBefore: true,
                    })),
                    ...(turno.complementarios_after || []).map((c) => ({
                      ...normComp(c),
                      _isBefore: false,
                    })),
                  ];

                  const _setTurno = (newTurno) => {
                    _beforeChange();
                    onChangeTurno?.(semActiva, turnoActivo, newTurno);
                  };

                  const calcKgComp = (ejercicio_id, pct) => {
                    if (!ejercicio_id || !pct) return null;
                    const ejData = normativos.find(
                      (e) => e.id === Number(ejercicio_id),
                    );
                    if (!ejData || !ejData.pct_base) return null;
                    const irmVal =
                      ejData.base === "arranque"
                        ? Number(irm_arr)
                        : Number(irm_env);
                    if (!irmVal) return null;
                    return (
                      Math.round(
                        ((((irmVal * ejData.pct_base) / 100) * pct) / 100) * 2,
                      ) / 2
                    );
                  };

                  const _mapComp = (compId, fn) => {
                    const bef = turno.complementarios_before || [];
                    const aft = turno.complementarios_after || [];
                    if (bef.some((c) => c.id === compId))
                      return _setTurno({
                        ...turno,
                        complementarios_before: bef.map((c) =>
                          c.id === compId ? fn(normComp(c)) : c,
                        ),
                      });
                    _setTurno({
                      ...turno,
                      complementarios_after: aft.map((c) =>
                        c.id === compId ? fn(normComp(c)) : c,
                      ),
                    });
                  };

                  const updateBloqueComp = (compId, bIdx, field, value) => {
                    _mapComp(compId, (comp) => {
                      const bloques = [...comp.bloques];
                      if (field === "pct") {
                        const newPct = value === "" ? null : Number(value);
                        bloques[bIdx] = {
                          ...bloques[bIdx],
                          pct: newPct,
                          kg: calcKgComp(comp.ejercicio_id, newPct),
                        };
                      } else if (field === "nota" || field === "series") {
                        bloques[bIdx] = {
                          ...bloques[bIdx],
                          [field]: value === "" ? null : value,
                        };
                      } else {
                        bloques[bIdx] = {
                          ...bloques[bIdx],
                          [field]: value === "" ? null : Number(value),
                        };
                      }
                      return { ...comp, bloques };
                    });
                  };

                  const deleteComp = (compId) => {
                    _beforeChangeForced();
                    _setTurno({
                      ...turno,
                      complementarios_before: (
                        turno.complementarios_before || []
                      ).filter((c) => c.id !== compId),
                      complementarios_after: (
                        turno.complementarios_after || []
                      ).filter((c) => c.id !== compId),
                    });
                  };

                  const toggleMomento = (compId) => {
                    _beforeChangeForced();
                    const bef = turno.complementarios_before || [];
                    const aft = turno.complementarios_after || [];
                    const isBefore = bef.some((c) => c.id === compId);
                    if (isBefore) {
                      const comp = bef.find((c) => c.id === compId);
                      _setTurno({
                        ...turno,
                        complementarios_before: bef.filter(
                          (c) => c.id !== compId,
                        ),
                        complementarios_after: [...aft, comp],
                      });
                    } else {
                      const comp = aft.find((c) => c.id === compId);
                      _setTurno({
                        ...turno,
                        complementarios_after: aft.filter(
                          (c) => c.id !== compId,
                        ),
                        complementarios_before: [...bef, comp],
                      });
                    }
                  };

                  const moveComp = (compId, dir) => {
                    _beforeChangeForced();
                    const bef = turno.complementarios_before || [];
                    const aft = turno.complementarios_after || [];

                    const bIdx = bef.findIndex((c) => c.id === compId);
                    if (bIdx >= 0) {
                      const j = bIdx + dir;
                      if (j < 0 || j >= bef.length) return;
                      const next = [...bef];
                      [next[bIdx], next[j]] = [next[j], next[bIdx]];
                      _setTurno({ ...turno, complementarios_before: next });
                      return;
                    }

                    const aIdx = aft.findIndex((c) => c.id === compId);
                    if (aIdx >= 0) {
                      const j = aIdx + dir;
                      if (j < 0 || j >= aft.length) return;
                      const next = [...aft];
                      [next[aIdx], next[j]] = [next[j], next[aIdx]];
                      _setTurno({ ...turno, complementarios_after: next });
                    }
                  };

                  const addComp = () => {
                    _beforeChangeForced();
                    const newComp = {
                      id: mkId(),
                      ejercicio_id: null,
                      bloques: Array.from(
                        { length: numCompBloques },
                        mkBloqueComp,
                      ),
                    };
                    _setTurno({
                      ...turno,
                      complementarios_after: [
                        ...(turno.complementarios_after || []),
                        newComp,
                      ],
                    });
                  };

                  const addBloqueCompCol = () => {
                    _beforeChangeForced();
                    const upd = (list) =>
                      (list || []).map((c) => ({
                        ...normComp(c),
                        bloques: [...normComp(c).bloques, mkBloqueComp()],
                      }));
                    _setTurno({
                      ...turno,
                      num_bloques_comp: numCompBloques + 1,
                      complementarios_before: upd(turno.complementarios_before),
                      complementarios_after: upd(turno.complementarios_after),
                    });
                  };

                  const removeBloqueCompCol = (bIdx) => {
                    if (numCompBloques <= 1) return;
                    _beforeChangeForced();
                    const upd = (list) =>
                      (list || []).map((c) => {
                        const bl = [...normComp(c).bloques];
                        bl.splice(bIdx, 1);
                        return { ...normComp(c), bloques: bl };
                      });
                    _setTurno({
                      ...turno,
                      num_bloques_comp: numCompBloques - 1,
                      complementarios_before: upd(turno.complementarios_before),
                      complementarios_after: upd(turno.complementarios_after),
                    });
                  };

                  const cellInputComp = (extra = {}) => ({
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    fontFamily: "'Bebas Neue'",
                    fontSize: 14,
                    textAlign: "center",
                    lineHeight: 1.2,
                    outline: "none",
                    padding: "3px 2px",
                    color: "var(--text)",
                    MozAppearance: "textfield",
                    appearance: "textfield",
                    ...extra,
                  });

                  const thBase = {
                    padding: "5px 6px",
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    borderRadius: 5,
                    fontSize: 10,
                    color: "var(--muted)",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    textAlign: "center",
                  };

                  return (
                    <div>
                      <ExercisePickerOverlay
                        open={compPickerOpen !== null}
                        normativos={normativos}
                        query={compPickerQuery}
                        setQuery={setCompPickerQuery}
                        activeIdx={compPickerActiveIdx}
                        setActiveIdx={setCompPickerActiveIdx}
                        onClose={() => setCompPickerOpen(null)}
                        onSelect={(ejercicio) => {
                          if (compPickerOpen === null) return;
                          _beforeChangeForced();
                          _mapComp(compPickerOpen, (c) => ({
                            ...c,
                            ejercicio_id: ejercicio.id,
                            nombre_custom: "",
                            bloques: c.bloques.map((b) => ({
                              ...b,
                              kg: calcKgComp(ejercicio.id, b.pct),
                            })),
                          }));
                        }}
                        inputName="field_11"
                      />
                      <div
                        style={{
                          marginTop: 20,
                          paddingTop: 8,
                          borderTop: "1px solid var(--border)",
                          borderBottom: "1px solid var(--border)",
                          marginBottom: 14,
                        }}
                      >
                        <div
                          className="semana-tabs"
                          style={{ marginBottom: 8, minWidth: 0 }}
                        >
                          {semanas.map((s, i) => (
                            <button
                              key={`comp-nav-sem-${s.id}`}
                              className={`semana-tab${semActiva === i ? " active" : ""}`}
                              onClick={() => cambiarSem(i, { scroll: false })}
                            >
                              Semana {s.numero}
                            </button>
                          ))}
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: 4,
                            flexWrap: "wrap",
                            minWidth: 0,
                            paddingBottom: 8,
                          }}
                        >
                          {sem.turnos.map((t, i) => {
                            const hasEjs = t.ejercicios.some(
                              (e) => e.ejercicio_id,
                            );
                            return (
                              <button
                                key={`comp-nav-turno-${t.id}`}
                                onClick={() => {
                                  setTurnoActivo(i);
                                  setTurnoConTentativa(semActiva, i);
                                }}
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: 6,
                                  border: "none",
                                  background:
                                    turnoActivo === i
                                      ? "var(--gold)"
                                      : hasEjs
                                        ? "var(--surface3)"
                                        : "var(--surface2)",
                                  color:
                                    turnoActivo === i
                                      ? "#000"
                                      : hasEjs
                                        ? "var(--text)"
                                        : "var(--muted)",
                                  fontFamily: "'Bebas Neue'",
                                  fontSize: 14,
                                  cursor: "pointer",
                                  letterSpacing: ".04em",
                                }}
                              >
                                T{i + 1}
                                {t.dia ? ` · ${t.dia.slice(0, 3)}` : ""}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div
                        id={`${scrollIdPrefix}-complementarios`}
                        style={{
                          marginTop: 20,
                          borderTop: "1px solid var(--border)",
                          paddingTop: 16,
                          scrollMarginTop: 110,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 8,
                            marginBottom: 10,
                            flexWrap: "wrap",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: "var(--text)",
                              textTransform: "uppercase",
                              letterSpacing: ".08em",
                            }}
                          >
                            Ejercicios Complementarios
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              flexWrap: "wrap",
                            }}
                          >
                            <span
                              style={{ fontSize: 10, color: "var(--muted)" }}
                            >
                              Turnos a copiar
                            </span>
                            <div
                              ref={compTurnosDropdownRef}
                              style={{ position: "relative" }}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setCompTurnosDropdownOpen((prev) => !prev)
                                }
                                style={{
                                  background: "var(--surface2)",
                                  border: "1px solid var(--border)",
                                  borderRadius: 6,
                                  color: "var(--text)",
                                  fontSize: 11,
                                  padding: "4px 8px",
                                  cursor: "pointer",
                                  minWidth: 148,
                                }}
                              >
                                {compPasteTurnosSel.length > 0
                                  ? `${compPasteTurnosSel.length} turno(s)`
                                  : "Seleccionar turnos"}
                              </button>
                              {compTurnosDropdownOpen && (
                                <div
                                  style={{
                                    position: "absolute",
                                    zIndex: 40,
                                    top: "calc(100% + 4px)",
                                    left: 0,
                                    minWidth: 170,
                                    background: "var(--surface)",
                                    border: "1px solid var(--border)",
                                    borderRadius: 8,
                                    padding: 8,
                                    boxShadow: "0 8px 24px rgba(0,0,0,.35)",
                                    display: "grid",
                                    gap: 6,
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      const allTurnos = (sem?.turnos || []).map(
                                        (_, i) => String(i),
                                      );
                                      const allSelected =
                                        allTurnos.length > 0 &&
                                        allTurnos.every((v) =>
                                          compPasteTurnosSel.includes(v),
                                        );
                                      setCompPasteTurnosSel(
                                        allSelected ? [] : allTurnos,
                                      );
                                    }}
                                    className="btn btn-ghost btn-xs"
                                  >
                                    {(sem?.turnos || []).length > 0 &&
                                    (sem?.turnos || []).every((_, i) =>
                                      compPasteTurnosSel.includes(String(i)),
                                    )
                                      ? "Deseleccionar todos"
                                      : "Tildar todos"}
                                  </button>
                                  {(sem?.turnos || []).map((t, i) => {
                                    const checked = compPasteTurnosSel.includes(
                                      String(i),
                                    );
                                    return (
                                      <label
                                        key={`comp-paste-turno-opt-${t.id}`}
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 6,
                                          fontSize: 12,
                                          color: "var(--text)",
                                          cursor: "pointer",
                                        }}
                                      >
                                        <input
                                          name="field_73"
                                          type="checkbox"
                                          checked={checked}
                                          onChange={() => toggleCompTurnoSel(i)}
                                          style={{ accentColor: "var(--gold)" }}
                                        />
                                        Turno {i + 1}
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            <span
                              style={{ fontSize: 10, color: "var(--muted)" }}
                            >
                              →
                            </span>

                            <span
                              style={{ fontSize: 10, color: "var(--muted)" }}
                            >
                              Semanas a pegar
                            </span>
                            <div
                              ref={compSemanasDropdownRef}
                              style={{ position: "relative" }}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setCompSemanasDropdownOpen((prev) => !prev)
                                }
                                style={{
                                  background: "var(--surface2)",
                                  border: "1px solid var(--border)",
                                  borderRadius: 6,
                                  color: "var(--text)",
                                  fontSize: 11,
                                  padding: "4px 8px",
                                  cursor: "pointer",
                                  minWidth: 162,
                                }}
                              >
                                {compPasteSemanasSel.length > 0
                                  ? `${compPasteSemanasSel.length} semana(s)`
                                  : "Seleccionar semanas"}
                              </button>
                              {compSemanasDropdownOpen && (
                                <div
                                  style={{
                                    position: "absolute",
                                    zIndex: 40,
                                    top: "calc(100% + 4px)",
                                    left: 0,
                                    minWidth: 190,
                                    background: "var(--surface)",
                                    border: "1px solid var(--border)",
                                    borderRadius: 8,
                                    padding: 8,
                                    boxShadow: "0 8px 24px rgba(0,0,0,.35)",
                                    display: "grid",
                                    gap: 6,
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      const allSemanas = semanas
                                        .map((_, i) => i)
                                        .filter((i) => i !== semActiva)
                                        .map(String);
                                      const allSelected =
                                        allSemanas.length > 0 &&
                                        allSemanas.every((v) =>
                                          compPasteSemanasSel.includes(v),
                                        );
                                      setCompPasteSemanasSel(
                                        allSelected ? [] : allSemanas,
                                      );
                                    }}
                                    className="btn btn-ghost btn-xs"
                                  >
                                    {semanas
                                      .map((_, i) => i)
                                      .filter((i) => i !== semActiva)
                                      .every((i) =>
                                        compPasteSemanasSel.includes(String(i)),
                                      )
                                      ? "Deseleccionar todas"
                                      : "Tildar todas"}
                                  </button>
                                  {semanas
                                    .map((s, i) => ({ s, i }))
                                    .filter(({ i }) => i !== semActiva)
                                    .map(({ s, i }) => {
                                      const checked =
                                        compPasteSemanasSel.includes(String(i));
                                      return (
                                        <label
                                          key={`comp-paste-sem-opt-${s.id}`}
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 6,
                                            fontSize: 12,
                                            color: "var(--text)",
                                            cursor: "pointer",
                                          }}
                                        >
                                          <input
                                            name="field_74"
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() =>
                                              toggleCompSemanaSel(i)
                                            }
                                            style={{
                                              accentColor: "var(--gold)",
                                            }}
                                          />
                                          Semana {s.numero}
                                        </label>
                                      );
                                    })}
                                </div>
                              )}
                            </div>

                            <button
                              type="button"
                              className="btn btn-ghost btn-xs"
                              onClick={pegarComplementariosSeleccionados}
                              disabled={
                                compPasteTurnosSel.length === 0 ||
                                compPasteSemanasSel.length === 0
                              }
                              style={{
                                border: compPasteFeedback
                                  ? "1px solid rgba(77,182,172,.45)"
                                  : undefined,
                                color: compPasteFeedback
                                  ? "#4db6ac"
                                  : undefined,
                              }}
                              title="Pegar complementarios según selección"
                            >
                              {compPasteFeedback ? "Pegado" : "Pegar"}
                            </button>

                            {(sem?.turnos?.length || 0) > 1 && (
                              <>
                                <span
                                  style={{
                                    fontSize: 10,
                                    color: "var(--muted)",
                                    borderLeft: "1px solid var(--border)",
                                    paddingLeft: 6,
                                    marginLeft: 2,
                                  }}
                                >
                                  Turno {turnoActivo + 1} →
                                </span>
                                <span
                                  style={{
                                    fontSize: 10,
                                    color: "var(--muted)",
                                  }}
                                >
                                  Turnos destino
                                </span>
                                <div
                                  ref={compIntraDropdownRef}
                                  style={{ position: "relative" }}
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setCompIntraDropdownOpen((prev) => !prev)
                                    }
                                    style={{
                                      background: "var(--surface2)",
                                      border: "1px solid var(--border)",
                                      borderRadius: 6,
                                      color: "var(--text)",
                                      fontSize: 11,
                                      padding: "4px 8px",
                                      cursor: "pointer",
                                      minWidth: 148,
                                    }}
                                  >
                                    {compIntraTargetSel.length > 0
                                      ? `${compIntraTargetSel.length} turno(s)`
                                      : "Seleccionar turnos"}
                                  </button>
                                  {compIntraDropdownOpen && (
                                    <div
                                      style={{
                                        position: "absolute",
                                        zIndex: 40,
                                        top: "calc(100% + 4px)",
                                        left: 0,
                                        minWidth: 170,
                                        background: "var(--surface)",
                                        border: "1px solid var(--border)",
                                        borderRadius: 8,
                                        padding: 8,
                                        boxShadow: "0 8px 24px rgba(0,0,0,.35)",
                                        display: "grid",
                                        gap: 6,
                                      }}
                                    >
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          const allOther = (sem?.turnos || [])
                                            .map((_, i) => i)
                                            .filter((i) => i !== turnoActivo)
                                            .map(String);
                                          const allSelected =
                                            allOther.length > 0 &&
                                            allOther.every((v) =>
                                              compIntraTargetSel.includes(v),
                                            );
                                          setCompIntraTargetSel(
                                            allSelected ? [] : allOther,
                                          );
                                        }}
                                        className="btn btn-ghost btn-xs"
                                      >
                                        {(sem?.turnos || [])
                                          .map((_, i) => i)
                                          .filter((i) => i !== turnoActivo)
                                          .every((i) =>
                                            compIntraTargetSel.includes(
                                              String(i),
                                            ),
                                          )
                                          ? "Deseleccionar todos"
                                          : "Tildar todos"}
                                      </button>
                                      {(sem?.turnos || [])
                                        .map((t, i) => ({ t, i }))
                                        .filter(({ i }) => i !== turnoActivo)
                                        .map(({ t, i }) => {
                                          const checked =
                                            compIntraTargetSel.includes(
                                              String(i),
                                            );
                                          return (
                                            <label
                                              key={`comp-intra-turno-opt-${t.id}`}
                                              style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 6,
                                                fontSize: 12,
                                                color: "var(--text)",
                                                cursor: "pointer",
                                              }}
                                            >
                                              <input
                                                name="field_intra_turno"
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() =>
                                                  toggleCompIntraTargetSel(i)
                                                }
                                                style={{
                                                  accentColor: "var(--gold)",
                                                }}
                                              />
                                              Turno {i + 1}
                                            </label>
                                          );
                                        })}
                                    </div>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-xs"
                                  onClick={pegarCompEnTurnosMismaSemana}
                                  disabled={compIntraTargetSel.length === 0}
                                  style={{
                                    border: compIntraFeedback
                                      ? "1px solid rgba(77,182,172,.45)"
                                      : undefined,
                                    color: compIntraFeedback
                                      ? "#4db6ac"
                                      : undefined,
                                  }}
                                  title="Pegar complementarios del turno actual en otros turnos de la misma semana"
                                >
                                  {compIntraFeedback ? "Pegado" : "Pegar"}
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        <div style={{ overflowX: "auto" }}>
                          <table
                            className="planilla-tabla"
                            style={{
                              borderCollapse: "separate",
                              borderSpacing: "2px 2px",
                              width: "100%",
                            }}
                          >
                            <thead>
                              <tr>
                                <th style={{ ...thBase, width: 62 }}>
                                  MOMENTO
                                </th>
                                <th style={{ ...thBase, width: 40 }}>ID</th>
                                <th
                                  style={{
                                    ...thBase,
                                    minWidth: 120,
                                    textAlign: "left",
                                  }}
                                >
                                  EJERCICIO
                                </th>
                                {Array.from({ length: numCompBloques }).map(
                                  (_, bIdx) => (
                                    <th
                                      key={bIdx}
                                      style={{
                                        padding: "3px 4px",
                                        background: "rgba(232,197,71,.08)",
                                        border: "1px solid rgba(232,197,71,.3)",
                                        borderRadius: 5,
                                        textAlign: "center",
                                        fontSize: 9,
                                        color: "var(--gold)",
                                        fontWeight: 700,
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          gap: 2,
                                        }}
                                      >
                                        <div
                                          style={{
                                            display: "grid",
                                            gridTemplateColumns:
                                              "1fr 1fr 1fr 1fr",
                                            gap: 0,
                                            flex: 1,
                                          }}
                                        >
                                          {["%", "S", "R", "Kg"].map((l) => (
                                            <div
                                              key={l}
                                              style={{
                                                fontSize: 8,
                                                color: "var(--muted)",
                                                textAlign: "center",
                                                fontWeight: 700,
                                              }}
                                            >
                                              {l}
                                            </div>
                                          ))}
                                        </div>
                                        {numCompBloques > 1 && (
                                          <button
                                            onClick={() =>
                                              removeBloqueCompCol(bIdx)
                                            }
                                            style={{
                                              width: 14,
                                              height: 14,
                                              borderRadius: "50%",
                                              border: "none",
                                              background: "transparent",
                                              color: "var(--muted)",
                                              cursor: "pointer",
                                              fontSize: 11,
                                              lineHeight: 1,
                                              padding: 0,
                                              flexShrink: 0,
                                            }}
                                            title="Eliminar columna"
                                          >
                                            ×
                                          </button>
                                        )}
                                      </div>
                                    </th>
                                  ),
                                )}
                                <th
                                  style={{
                                    padding: "3px 4px",
                                    background: "var(--surface2)",
                                    border: "1px dashed var(--border)",
                                    borderRadius: 5,
                                    width: 30,
                                  }}
                                >
                                  <button
                                    onClick={addBloqueCompCol}
                                    title="Agregar columna de %"
                                    style={{
                                      width: "100%",
                                      background: "transparent",
                                      border: "none",
                                      color: "var(--gold)",
                                      cursor: "pointer",
                                      fontSize: 13,
                                      fontWeight: 700,
                                      padding: 0,
                                    }}
                                  >
                                    + %
                                  </button>
                                </th>
                                <th style={{ ...thBase, width: 30 }}>↕</th>
                                <th style={{ width: 26 }} />
                              </tr>
                            </thead>
                            <tbody>
                              {allComps.length === 0 ? (
                                <tr>
                                  <td
                                    colSpan={numCompBloques + 5}
                                    style={{
                                      padding: "12px",
                                      textAlign: "center",
                                      color: "var(--muted)",
                                      fontSize: 12,
                                      border: "none",
                                    }}
                                  >
                                    Sin complementarios. Haz click en "+ Agregar
                                    ejercicio" para añadir uno.
                                  </td>
                                </tr>
                              ) : (
                                allComps.map((comp, cIdx) => {
                                  const isBefore = comp._isBefore;
                                  const sameMomentList = isBefore
                                    ? turno.complementarios_before || []
                                    : turno.complementarios_after || [];
                                  const orderIdx = sameMomentList.findIndex(
                                    (c) => c.id === comp.id,
                                  );
                                  const canUp = orderIdx > 0;
                                  const canDown =
                                    orderIdx > -1 &&
                                    orderIdx < sameMomentList.length - 1;
                                  const ejData = comp.ejercicio_id
                                    ? normativos.find(
                                        (e) =>
                                          e.id === Number(comp.ejercicio_id),
                                      )
                                    : null;
                                  const col = ejData
                                    ? CAT_COLOR[ejData.categoria]
                                    : "var(--border)";
                                  const bloques = comp.bloques;
                                  return (
                                    <tr
                                      key={comp.id}
                                      style={{
                                        background:
                                          cIdx % 2 === 0
                                            ? "var(--surface2)"
                                            : "transparent",
                                      }}
                                    >
                                      {/* MOMENTO */}
                                      <td
                                        style={{
                                          padding: "3px 4px",
                                          textAlign: "center",
                                          border: "1px solid var(--border)",
                                          borderRadius: 5,
                                        }}
                                      >
                                        <button
                                          onClick={() => toggleMomento(comp.id)}
                                          title="Cambiar momento"
                                          style={{
                                            background: isBefore
                                              ? "rgba(232,197,71,.12)"
                                              : "rgba(80,180,255,.12)",
                                            border: `1px solid ${isBefore ? "rgba(232,197,71,.35)" : "rgba(80,180,255,.35)"}`,
                                            color: isBefore
                                              ? "var(--gold)"
                                              : "#50b4ff",
                                            borderRadius: 4,
                                            fontSize: 9,
                                            padding: "3px 5px",
                                            cursor: "pointer",
                                            fontWeight: 700,
                                            fontFamily: "'DM Sans'",
                                            width: "100%",
                                          }}
                                        >
                                          {isBefore ? "ANTES" : "DESPUÉS"}
                                        </button>
                                      </td>
                                      {/* ID — click abre picker */}
                                      <td
                                        onClick={() => {
                                          setCompPickerOpen(comp.id);
                                          setCompPickerActiveIdx(0);
                                        }}
                                        style={{
                                          padding: "3px 4px",
                                          textAlign: "center",
                                          border: `1px solid ${col}40`,
                                          borderRadius: 5,
                                          background: `${col}0a`,
                                          cursor: "pointer",
                                          width: 40,
                                        }}
                                      >
                                        <span
                                          style={{
                                            fontFamily: "'Bebas Neue'",
                                            fontSize: 16,
                                            color: col,
                                            lineHeight: 1,
                                          }}
                                        >
                                          {comp.ejercicio_id || "—"}
                                        </span>
                                      </td>
                                      {/* EJERCICIO */}
                                      <td
                                        style={{
                                          padding: "3px 6px",
                                          border: "1px solid var(--border)",
                                          borderRadius: 5,
                                          minWidth: 120,
                                        }}
                                      >
                                        <input
                                          name="field_12"
                                          type="text"
                                          value={resolveExerciseName(
                                            comp.nombre_custom,
                                            ejData ? ejData.nombre : "",
                                          )}
                                          placeholder="Nombre del ejercicio"
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            _mapComp(comp.id, (c) => ({
                                              ...c,
                                              nombre_custom:
                                                val === ""
                                                  ? EMPTY_NAME_SENTINEL
                                                  : ejData &&
                                                      val === ejData.nombre
                                                    ? ""
                                                    : val,
                                            }));
                                          }}
                                          onBlur={() => {
                                            if (
                                              comp.nombre_custom ===
                                              EMPTY_NAME_SENTINEL
                                            ) {
                                              _mapComp(comp.id, (c) => ({
                                                ...c,
                                                nombre_custom: "",
                                              }));
                                            }
                                          }}
                                          style={{
                                            width: "100%",
                                            background: "transparent",
                                            border: "none",
                                            color: "var(--text)",
                                            fontSize: 11,
                                            outline: "none",
                                            padding: "2px 0",
                                            fontFamily: "'DM Sans'",
                                          }}
                                        />
                                      </td>
                                      {/* Bloques */}
                                      {bloques
                                        .slice(0, numCompBloques)
                                        .map((b, bIdx) => {
                                          const hasNota =
                                            b.nota && b.nota.trim() !== "";
                                          const hasData =
                                            b.pct || b.series || b.reps;
                                          return (
                                            <td
                                              key={bIdx}
                                              style={{
                                                padding: "2px 3px",
                                                textAlign: "center",
                                                background:
                                                  "rgba(232,197,71,.04)",
                                                border: `1px solid ${hasNota ? "var(--muted)" : "rgba(232,197,71,.15)"}`,
                                                borderRadius: 5,
                                                position: "relative",
                                              }}
                                            >
                                              <div
                                                style={{
                                                  display: "grid",
                                                  gridTemplateColumns:
                                                    "1fr 1fr 1fr 1fr",
                                                  gap: 0,
                                                }}
                                              >
                                                <input
                                                  name="field_13"
                                                  type="number"
                                                  className="no-spin"
                                                  value={b.pct ?? ""}
                                                  placeholder="%"
                                                  onChange={(e) =>
                                                    updateBloqueComp(
                                                      comp.id,
                                                      bIdx,
                                                      "pct",
                                                      e.target.value,
                                                    )
                                                  }
                                                  style={cellInputComp({
                                                    fontSize: 13,
                                                    color: "var(--gold)",
                                                  })}
                                                />
                                                <input
                                                  name="field_14"
                                                  type="text"
                                                  className="no-spin"
                                                  value={b.series ?? ""}
                                                  placeholder="—"
                                                  onChange={(e) =>
                                                    updateBloqueComp(
                                                      comp.id,
                                                      bIdx,
                                                      "series",
                                                      e.target.value,
                                                    )
                                                  }
                                                  style={cellInputComp()}
                                                />
                                                <input
                                                  name="field_15"
                                                  type="number"
                                                  className="no-spin"
                                                  value={b.reps ?? ""}
                                                  placeholder="—"
                                                  onChange={(e) =>
                                                    updateBloqueComp(
                                                      comp.id,
                                                      bIdx,
                                                      "reps",
                                                      e.target.value,
                                                    )
                                                  }
                                                  style={cellInputComp()}
                                                />
                                                <input
                                                  name="field_16"
                                                  type="number"
                                                  step="0.5"
                                                  className="no-spin"
                                                  value={
                                                    calcKgComp(
                                                      comp.ejercicio_id,
                                                      b.pct,
                                                    ) ??
                                                    b.kg ??
                                                    ""
                                                  }
                                                  readOnly
                                                  style={cellInputComp({
                                                    color: "var(--muted)",
                                                    fontSize: 12,
                                                  })}
                                                />
                                              </div>
                                              <input
                                                name="field_17"
                                                type="text"
                                                value={b.nota || ""}
                                                placeholder="…"
                                                onChange={(e) =>
                                                  updateBloqueComp(
                                                    comp.id,
                                                    bIdx,
                                                    "nota",
                                                    e.target.value,
                                                  )
                                                }
                                                title="Aclaración"
                                                style={{
                                                  display:
                                                    hasData || hasNota
                                                      ? "block"
                                                      : "none",
                                                  width: "100%",
                                                  background: "transparent",
                                                  border: "none",
                                                  borderTop: hasNota
                                                    ? "1px solid var(--border)"
                                                    : "none",
                                                  color: "var(--muted)",
                                                  fontSize: 9,
                                                  textAlign: "center",
                                                  outline: "none",
                                                  padding: "2px 0 0",
                                                  fontFamily: "'DM Sans'",
                                                  marginTop: 2,
                                                }}
                                              />
                                            </td>
                                          );
                                        })}
                                      <td
                                        style={{
                                          border: "none",
                                          textAlign: "center",
                                          padding: 0,
                                        }}
                                      >
                                        <div
                                          style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            gap: 0,
                                          }}
                                        >
                                          <button
                                            onClick={() =>
                                              moveComp(comp.id, -1)
                                            }
                                            disabled={!canUp}
                                            title="Mover arriba"
                                            style={{
                                              background: "none",
                                              border: "none",
                                              color: canUp
                                                ? isBefore
                                                  ? "var(--gold)"
                                                  : "#50b4ff"
                                                : "var(--surface3)",
                                              cursor: canUp
                                                ? "pointer"
                                                : "default",
                                              fontSize: 10,
                                              lineHeight: 1,
                                              padding: "1px 2px",
                                            }}
                                          >
                                            ▲
                                          </button>
                                          <button
                                            onClick={() => moveComp(comp.id, 1)}
                                            disabled={!canDown}
                                            title="Mover abajo"
                                            style={{
                                              background: "none",
                                              border: "none",
                                              color: canDown
                                                ? isBefore
                                                  ? "var(--gold)"
                                                  : "#50b4ff"
                                                : "var(--surface3)",
                                              cursor: canDown
                                                ? "pointer"
                                                : "default",
                                              fontSize: 10,
                                              lineHeight: 1,
                                              padding: "1px 2px",
                                            }}
                                          >
                                            ▼
                                          </button>
                                        </div>
                                      </td>
                                      <td
                                        style={{
                                          padding: 0,
                                          textAlign: "center",
                                          border: "none",
                                        }}
                                      >
                                        <button
                                          onClick={() => deleteComp(comp.id)}
                                          title="Eliminar"
                                          style={{
                                            background: "none",
                                            border: "none",
                                            color: "var(--red)",
                                            cursor: "pointer",
                                            fontSize: 12,
                                            padding: "2px",
                                            opacity: 0.6,
                                          }}
                                        >
                                          ×
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                        <button
                          onClick={addComp}
                          style={{
                            marginTop: 8,
                            padding: "6px 16px",
                            borderRadius: 8,
                            border: "1px dashed var(--border)",
                            background: "transparent",
                            color: "var(--gold)",
                            cursor: "pointer",
                            fontSize: 12,
                            fontFamily: "'DM Sans'",
                            fontWeight: 600,
                            width: "100%",
                          }}
                        >
                          + Agregar ejercicio
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Planilla Básica (Escuela Básica) ─────────────────────────────────────────
// Planilla simplificada sin sembrado, sin IRM, sin % semanal, sin distribución.
// El "sembrado" se hace directamente en la planilla.
// Cada ejercicio tiene N bloques con %, series, reps, kg editables.
function PlanillaBasica({
  semanas,
  onChange,
  numBloques = 3,
  onBeforeChange,
  irm_arr = 100,
  irm_env = 200,
  normativos: normativosProp = null,
}) {
  const [semActiva, setSemActiva] = useState(0);
  const [turnoActivo, setTurnoActivo] = useState(0);
  const [ejPickerOpen, setEjPickerOpen] = useState(null); // ejIdx or null
  const [ejPickerQuery, setEjPickerQuery] = useState("");
  const [ejPickerActiveIdx, setEjPickerActiveIdx] = useState(0);
  const spreadsheetNavRef = useRef(null);

  const normativos =
    normativosProp ??
    (() => {
      try {
        return (
          JSON.parse(localStorage.getItem("liftplan_normativos") || "null") ||
          EJERCICIOS
        );
      } catch {
        return EJERCICIOS;
      }
    })();

  const sem = semanas[semActiva];
  const turno = sem?.turnos[turnoActivo];
  const ejs = turno?.ejercicios || [];

  const _bc = () => {
    try {
      if (onBeforeChange) onBeforeChange();
    } catch {}
  };

  // Calcular kg automático: IRM × pct_base / 100 × pct_bloque / 100
  const calcKgBasica = (ejercicio_id, pct) => {
    if (!ejercicio_id || !pct) return null;
    const ejData = normativos.find((e) => e.id === Number(ejercicio_id));
    if (!ejData || !ejData.pct_base) return null;
    const irm = ejData.base === "arranque" ? Number(irm_arr) : Number(irm_env);
    if (!irm) return null;
    return Math.round(((((irm * ejData.pct_base) / 100) * pct) / 100) * 2) / 2;
  };

  // Deep-clone update — acepta updates extra para el form padre (ej: num_bloques_basica)
  const updateSemanas = (updater, extraFormUpdates) => {
    _bc();
    const next =
      typeof updater === "function"
        ? updater(JSON.parse(JSON.stringify(semanas)))
        : updater;
    onChange(next, extraFormUpdates);
  };

  const updateBloque = (ejIdx, bIdx, field, value) => {
    updateSemanas((ss) => {
      const ej = ss[semActiva].turnos[turnoActivo].ejercicios[ejIdx];
      if (!ej.bloques)
        ej.bloques = Array.from({ length: numBloques }, mkBloqueBasica);
      if (field === "pct") {
        // Al cambiar %, auto-calcular kg
        const newPct = value === "" ? null : Number(value);
        const autoKg = calcKgBasica(ej.ejercicio_id, newPct);
        ej.bloques[bIdx] = { ...ej.bloques[bIdx], pct: newPct, kg: autoKg };
      } else if (field === "nota") {
        ej.bloques[bIdx] = { ...ej.bloques[bIdx], nota: value };
      } else {
        ej.bloques[bIdx] = {
          ...ej.bloques[bIdx],
          [field]: value === "" ? null : Number(value),
        };
      }
      return ss;
    });
  };

  const setEjercicioId = (ejIdx, newId) => {
    updateSemanas((ss) => {
      const ej = ss[semActiva].turnos[turnoActivo].ejercicios[ejIdx];
      ej.ejercicio_id = newId ? Number(newId) : null;
      ej.nombre_custom = "";
      // Recalcular kg de todos los bloques con el nuevo ejercicio
      if (ej.bloques) {
        ej.bloques.forEach((b) => {
          if (b.pct) b.kg = calcKgBasica(ej.ejercicio_id, b.pct);
        });
      }
      return ss;
    });
  };

  const setNombreCustom = (ejIdx, nombre) => {
    updateSemanas((ss) => {
      ss[semActiva].turnos[turnoActivo].ejercicios[ejIdx].nombre_custom =
        nombre;
      return ss;
    });
  };

  const addEjercicio = () => {
    updateSemanas((ss) => {
      ss[semActiva].turnos[turnoActivo].ejercicios.push(mkEjBasica(numBloques));
      return ss;
    });
  };

  const removeEjercicio = (ejIdx) => {
    if (ejs.length <= 1) return;
    updateSemanas((ss) => {
      ss[semActiva].turnos[turnoActivo].ejercicios.splice(ejIdx, 1);
      return ss;
    });
  };

  const addTurno = () => {
    updateSemanas((ss) => {
      const s = ss[semActiva];
      s.turnos.push({
        id: mkId(),
        numero: s.turnos.length + 1,
        dia: "",
        momento: "",
        ejercicios: Array.from({ length: 6 }, () => mkEjBasica(numBloques)),
      });
      return ss;
    });
  };

  const removeTurno = () => {
    if (!sem || sem.turnos.length <= 1) return;
    updateSemanas((ss) => {
      ss[semActiva].turnos.splice(turnoActivo, 1);
      ss[semActiva].turnos.forEach((t, i) => {
        t.numero = i + 1;
      });
      return ss;
    });
    setTurnoActivo((v) =>
      Math.max(0, Math.min(v, (sem?.turnos.length || 2) - 2)),
    );
  };

  const addSemana = () => {
    updateSemanas((ss) => {
      ss.push({
        id: mkId(),
        numero: ss.length + 1,
        turnos: mkTurnosBasica(numBloques),
      });
      return ss;
    });
  };

  const removeSemana = () => {
    if (semanas.length <= 1) return;
    updateSemanas((ss) => {
      ss.splice(semActiva, 1);
      ss.forEach((s, i) => {
        s.numero = i + 1;
      });
      return ss;
    });
    setSemActiva((v) => Math.max(0, Math.min(v, semanas.length - 2)));
    setTurnoActivo(0);
  };

  const addBloqueCol = () => {
    const newNum = numBloques + 1;
    updateSemanas(
      (ss) => {
        ss.forEach((s) =>
          s.turnos.forEach((t) =>
            t.ejercicios.forEach((e) => {
              if (!e.bloques)
                e.bloques = Array.from({ length: numBloques }, mkBloqueBasica);
              e.bloques.push(mkBloqueBasica());
            }),
          ),
        );
        return ss;
      },
      { num_bloques_basica: newNum },
    );
  };

  const removeBloqueCol = (bIdx) => {
    if (numBloques <= 1) return;
    updateSemanas(
      (ss) => {
        ss.forEach((s) =>
          s.turnos.forEach((t) =>
            t.ejercicios.forEach((e) => {
              if (e.bloques && e.bloques.length > bIdx)
                e.bloques.splice(bIdx, 1);
            }),
          ),
        );
        return ss;
      },
      { num_bloques_basica: numBloques - 1 },
    );
  };

  // Move exercise up/down
  const moveEj = (ejIdx, dir) => {
    const tgt = ejIdx + dir;
    if (tgt < 0 || tgt >= ejs.length) return;
    updateSemanas((ss) => {
      const arr = ss[semActiva].turnos[turnoActivo].ejercicios;
      [arr[ejIdx], arr[tgt]] = [arr[tgt], arr[ejIdx]];
      return ss;
    });
  };

  // Copy turno to all weeks
  const copiarTurnoATodasSemanas = () => {
    if (!turno) return;
    updateSemanas((ss) => {
      const turnoBase = JSON.parse(JSON.stringify(turno));
      ss.forEach((s, sIdx) => {
        if (sIdx === semActiva) return;
        // Ensure turno index exists
        while (s.turnos.length <= turnoActivo) {
          s.turnos.push({
            id: mkId(),
            numero: s.turnos.length + 1,
            dia: "",
            momento: "",
            ejercicios: Array.from({ length: 6 }, () => mkEjBasica(numBloques)),
          });
        }
        const copy = JSON.parse(JSON.stringify(turnoBase));
        copy.id = s.turnos[turnoActivo].id; // keep original id
        copy.numero = turnoActivo + 1;
        s.turnos[turnoActivo] = copy;
      });
      return ss;
    });
  };

  // Compact input style
  const cellInput = (extra = {}) => ({
    width: "100%",
    background: "transparent",
    border: "none",
    fontFamily: "'Bebas Neue'",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 1.2,
    outline: "none",
    padding: "3px 2px",
    color: "var(--text)",
    MozAppearance: "textfield",
    appearance: "textfield",
    ...extra,
  });

  const handleSpreadsheetNavKeyDown = useCallback((event) => {
    handlePlanillaArrowNavigation(event, spreadsheetNavRef.current);
  }, []);

  if (!sem) return null;

  return (
    <div ref={spreadsheetNavRef} onKeyDown={handleSpreadsheetNavKeyDown}>
      {/* ── Semana tabs ── */}
      <div
        style={{
          display: "flex",
          gap: 4,
          flexWrap: "wrap",
          marginBottom: 8,
          alignItems: "center",
        }}
      >
        {semanas.map((s, i) => (
          <button
            key={s.id}
            className={`semana-tab${semActiva === i ? " active" : ""}`}
            onClick={() => {
              setSemActiva(i);
              setTurnoActivo(0);
            }}
          >
            Semana {s.numero}
          </button>
        ))}
        <button
          onClick={addSemana}
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            border: "1px dashed var(--border)",
            background: "transparent",
            color: "var(--gold)",
            cursor: "pointer",
            fontSize: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
          }}
        >
          +
        </button>
        {semanas.length > 1 && (
          <button
            onClick={removeSemana}
            title="Eliminar semana actual"
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: "1px dashed var(--border)",
              background: "transparent",
              color: "var(--red)",
              cursor: "pointer",
              fontSize: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
            }}
          >
            −
          </button>
        )}
      </div>

      {/* ── Turno tabs ── */}
      <div
        style={{
          display: "flex",
          gap: 4,
          flexWrap: "wrap",
          marginBottom: 12,
          alignItems: "center",
        }}
      >
        {sem.turnos.map((t, i) => (
          <button
            key={t.id}
            onClick={() => setTurnoActivo(i)}
            style={{
              padding: "4px 12px",
              borderRadius: 6,
              border: "none",
              background: turnoActivo === i ? "var(--gold)" : "var(--surface3)",
              color: turnoActivo === i ? "#000" : "var(--text)",
              fontFamily: "'Bebas Neue'",
              fontSize: 14,
              cursor: "pointer",
              letterSpacing: ".04em",
            }}
          >
            T{i + 1}
            {t.dia ? ` · ${t.dia.slice(0, 3)}` : ""}
          </button>
        ))}
        <button
          onClick={addTurno}
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            border: "1px dashed var(--border)",
            background: "transparent",
            color: "var(--gold)",
            cursor: "pointer",
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
          }}
        >
          +
        </button>
        {sem.turnos.length > 1 && (
          <button
            onClick={removeTurno}
            title="Eliminar turno actual"
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              border: "1px dashed var(--border)",
              background: "transparent",
              color: "var(--red)",
              cursor: "pointer",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
            }}
          >
            −
          </button>
        )}
        <button
          onClick={copiarTurnoATodasSemanas}
          title="Copiar este turno a todas las semanas"
          style={{
            marginLeft: 8,
            padding: "3px 10px",
            borderRadius: 6,
            border: "1px solid var(--border)",
            background: "var(--surface2)",
            color: "var(--muted)",
            cursor: "pointer",
            fontSize: 10,
            fontFamily: "'DM Sans'",
            fontWeight: 600,
          }}
        >
          Copiar a todas las semanas
        </button>
      </div>

      {/* ── Header del turno ── */}
      {turno && (
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 10,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                fontFamily: "'Bebas Neue'",
                fontSize: 20,
                color: "var(--gold)",
              }}
            >
              Semana {sem.numero} — Turno {turnoActivo + 1}
            </div>
            {/* Day/Moment inline selectors */}
            <select
              name="field_18"
              value={turno.dia || ""}
              onChange={(e) => {
                updateSemanas((ss) => {
                  ss[semActiva].turnos[turnoActivo].dia = e.target.value;
                  return ss;
                });
              }}
              style={{
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "3px 6px",
                color: "var(--text)",
                fontSize: 11,
                fontFamily: "'DM Sans'",
              }}
            >
              <option value="">Día</option>
              {[
                "Lunes",
                "Martes",
                "Miércoles",
                "Jueves",
                "Viernes",
                "Sábado",
                "Domingo",
              ].map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select
              name="field_19"
              value={turno.momento || ""}
              onChange={(e) => {
                updateSemanas((ss) => {
                  ss[semActiva].turnos[turnoActivo].momento = e.target.value;
                  return ss;
                });
              }}
              style={{
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "3px 6px",
                color: "var(--text)",
                fontSize: 11,
                fontFamily: "'DM Sans'",
              }}
            >
              <option value="">Momento</option>
              {["Mañana", "Tarde", "Noche"].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* ── Tabla de ejercicios ── */}
          <div style={{ overflowX: "auto" }}>
            <table
              className="planilla-tabla"
              style={{
                borderCollapse: "separate",
                borderSpacing: "2px 2px",
                width: "100%",
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      padding: "5px 6px",
                      background: "var(--surface2)",
                      border: "1px solid var(--border)",
                      borderRadius: 5,
                      textAlign: "center",
                      fontSize: 10,
                      color: "var(--muted)",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      width: 40,
                    }}
                  >
                    REF
                  </th>
                  <th
                    style={{
                      padding: "5px 6px",
                      background: "var(--surface2)",
                      border: "1px solid var(--border)",
                      borderRadius: 5,
                      fontSize: 10,
                      color: "var(--muted)",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      minWidth: 100,
                    }}
                  >
                    EJERCICIO
                  </th>
                  {Array.from({ length: numBloques }).map((_, bIdx) => (
                    <th
                      key={bIdx}
                      style={{
                        padding: "3px 4px",
                        background: "rgba(232,197,71,.08)",
                        border: "1px solid rgba(232,197,71,.3)",
                        borderRadius: 5,
                        textAlign: "center",
                        fontSize: 9,
                        color: "var(--gold)",
                        fontWeight: 700,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 2,
                        }}
                      >
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr 1fr 1fr",
                            gap: 0,
                            flex: 1,
                          }}
                        >
                          {["%", "S", "R", "Kg"].map((l) => (
                            <div
                              key={l}
                              style={{
                                fontSize: 8,
                                color: "var(--muted)",
                                textAlign: "center",
                                fontWeight: 700,
                              }}
                            >
                              {l}
                            </div>
                          ))}
                        </div>
                        {numBloques > 1 && (
                          <button
                            onClick={() => removeBloqueCol(bIdx)}
                            style={{
                              width: 14,
                              height: 14,
                              borderRadius: "50%",
                              border: "none",
                              background: "transparent",
                              color: "var(--muted)",
                              cursor: "pointer",
                              fontSize: 11,
                              lineHeight: 1,
                              padding: 0,
                              flexShrink: 0,
                            }}
                            title="Eliminar esta columna de %"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                  <th
                    style={{
                      padding: "3px 4px",
                      background: "rgba(232,197,71,.08)",
                      border: "1px solid rgba(232,197,71,.3)",
                      borderRadius: 5,
                      textAlign: "center",
                      fontSize: 9,
                      color: "var(--gold)",
                      fontWeight: 700,
                    }}
                  >
                    VOL
                    <br />
                    REPs
                  </th>
                  <th
                    style={{
                      padding: "3px 4px",
                      background: "rgba(71,180,232,.08)",
                      border: "1px solid rgba(71,180,232,.3)",
                      borderRadius: 5,
                      textAlign: "center",
                      fontSize: 9,
                      color: "var(--blue)",
                      fontWeight: 700,
                    }}
                  >
                    VOL
                    <br />
                    Kg
                  </th>
                  <th
                    style={{
                      padding: "3px 4px",
                      background: "rgba(71,232,160,.05)",
                      border: "1px solid rgba(71,232,160,.2)",
                      borderRadius: 5,
                      textAlign: "center",
                      fontSize: 9,
                      color: "var(--green)",
                      fontWeight: 700,
                    }}
                  >
                    Peso
                    <br />
                    Medio
                  </th>
                  <th
                    style={{
                      padding: "3px 4px",
                      background: "rgba(155,135,232,.05)",
                      border: "1px solid rgba(155,135,232,.2)",
                      borderRadius: 5,
                      textAlign: "center",
                      fontSize: 9,
                      color: "#9b87e8",
                      fontWeight: 700,
                    }}
                  >
                    Int
                    <br />
                    Media
                  </th>
                  <th
                    style={{
                      padding: "3px 4px",
                      background: "var(--surface2)",
                      border: "1px dashed var(--border)",
                      borderRadius: 5,
                      width: 30,
                    }}
                  >
                    <button
                      onClick={addBloqueCol}
                      title="Agregar columna de %"
                      style={{
                        width: "100%",
                        background: "transparent",
                        border: "none",
                        color: "var(--gold)",
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 700,
                        padding: 0,
                      }}
                    >
                      + %
                    </button>
                  </th>
                  <th style={{ width: 26 }} />
                </tr>
              </thead>
              <tbody>
                {ejs.map((ej, eIdx) => {
                  const ejData = ej.ejercicio_id
                    ? normativos.find((e) => e.id === Number(ej.ejercicio_id))
                    : null;
                  const col = ejData
                    ? CAT_COLOR[ejData.categoria]
                    : "var(--border)";
                  const bloques =
                    ej.bloques ||
                    Array.from({ length: numBloques }, mkBloqueBasica);
                  const displayName = resolveExerciseName(
                    ej.nombre_custom,
                    ejData?.nombre || "",
                  );

                  return (
                    <tr
                      key={ej.id}
                      style={{
                        background:
                          eIdx % 2 === 0 ? "var(--surface2)" : "transparent",
                      }}
                    >
                      {/* REF — input numérico */}
                      <td
                        style={{
                          padding: "3px 4px",
                          textAlign: "center",
                          border: `1px solid ${col}40`,
                          borderRadius: 5,
                          background: `${col}0a`,
                        }}
                      >
                        <input
                          name="field_20"
                          type="number"
                          min={1}
                          max={200}
                          className="no-spin"
                          value={ej.ejercicio_id || ""}
                          placeholder="—"
                          onChange={(e) => setEjercicioId(eIdx, e.target.value)}
                          style={cellInput({
                            width: 36,
                            fontFamily: "'Bebas Neue'",
                            fontSize: 16,
                            color: col,
                          })}
                        />
                      </td>
                      {/* Ejercicio nombre — click to edit */}
                      <td
                        style={{
                          padding: "3px 6px",
                          border: "1px solid var(--border)",
                          borderRadius: 5,
                          position: "relative",
                          minWidth: 100,
                        }}
                      >
                        <input
                          name="field_21"
                          type="text"
                          value={displayName}
                          placeholder="Nombre del ejercicio"
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "") {
                              setNombreCustom(eIdx, EMPTY_NAME_SENTINEL);
                              return;
                            }
                            if (ejData && val === ejData.nombre) {
                              setNombreCustom(eIdx, "");
                            } else {
                              setNombreCustom(eIdx, val);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (
                              e.key === "Backspace" &&
                              e.currentTarget.value === "" &&
                              ej.nombre_custom === EMPTY_NAME_SENTINEL
                            ) {
                              e.preventDefault();
                              setNombreCustom(eIdx, "");
                            }
                          }}
                          style={{
                            width: "100%",
                            background: "transparent",
                            border: "none",
                            color: "var(--text)",
                            fontSize: 11,
                            outline: "none",
                            padding: "2px 0",
                            fontFamily: "'DM Sans'",
                          }}
                        />
                      </td>
                      {/* Bloques: % | S | R | Kg + nota */}
                      {bloques.slice(0, numBloques).map((b, bIdx) => {
                        const hasNota = b.nota && b.nota.trim() !== "";
                        const hasData = b.pct || b.series || b.reps;
                        return (
                          <td
                            key={bIdx}
                            style={{
                              padding: "2px 3px",
                              textAlign: "center",
                              background: "rgba(232,197,71,.04)",
                              border: `1px solid ${hasNota ? "var(--muted)" : "rgba(232,197,71,.15)"}`,
                              borderRadius: 5,
                              position: "relative",
                            }}
                          >
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr 1fr 1fr",
                                gap: 0,
                              }}
                            >
                              <input
                                name="field_22"
                                type="number"
                                className="no-spin"
                                value={b.pct ?? ""}
                                placeholder="%"
                                onChange={(e) =>
                                  updateBloque(
                                    eIdx,
                                    bIdx,
                                    "pct",
                                    e.target.value,
                                  )
                                }
                                style={cellInput({
                                  fontSize: 13,
                                  color: "var(--gold)",
                                })}
                              />
                              <input
                                name="field_23"
                                type="text"
                                className="no-spin"
                                value={b.series ?? ""}
                                placeholder="—"
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  updateSemanas((ss) => {
                                    const ej2 =
                                      ss[semActiva].turnos[turnoActivo]
                                        .ejercicios[eIdx];
                                    if (!ej2.bloques)
                                      ej2.bloques = Array.from(
                                        { length: numBloques },
                                        mkBloqueBasica,
                                      );
                                    ej2.bloques[bIdx] = {
                                      ...ej2.bloques[bIdx],
                                      series:
                                        raw === ""
                                          ? null
                                          : isNaN(Number(raw))
                                            ? raw
                                            : Number(raw),
                                    };
                                    return ss;
                                  });
                                }}
                                style={cellInput()}
                              />
                              <input
                                name="field_24"
                                type="number"
                                className="no-spin"
                                value={b.reps ?? ""}
                                placeholder="—"
                                onChange={(e) =>
                                  updateBloque(
                                    eIdx,
                                    bIdx,
                                    "reps",
                                    e.target.value,
                                  )
                                }
                                style={cellInput()}
                              />
                              <input
                                name="field_25"
                                type="number"
                                step="0.5"
                                className="no-spin"
                                value={
                                  calcKgBasica(ej.ejercicio_id, b.pct) ??
                                  b.kg ??
                                  ""
                                }
                                readOnly
                                style={cellInput({
                                  color: "var(--muted)",
                                  fontSize: 12,
                                })}
                              />
                            </div>
                            <input
                              name="field_26"
                              type="text"
                              value={b.nota || ""}
                              placeholder="…"
                              onChange={(e) =>
                                updateBloque(eIdx, bIdx, "nota", e.target.value)
                              }
                              title="Aclaración (ej: 2+2+2 para combinados)"
                              style={{
                                display: hasData || hasNota ? "block" : "none",
                                width: "100%",
                                background: "transparent",
                                border: "none",
                                borderTop: hasNota
                                  ? "1px solid var(--border)"
                                  : "none",
                                color: "var(--muted)",
                                fontSize: 9,
                                textAlign: "center",
                                outline: "none",
                                padding: "2px 0 0",
                                fontFamily: "'DM Sans'",
                                marginTop: 2,
                              }}
                            />
                          </td>
                        );
                      })}
                      {/* Stats: VOL REPs, VOL Kg, Peso Medio, Int Media */}
                      {(() => {
                        let volReps = 0,
                          volKg = 0;
                        (bloques || []).slice(0, numBloques).forEach((b) => {
                          if (!b.series && !b.reps) return;
                          const s =
                            typeof b.series === "string" &&
                            b.series.includes("+")
                              ? b.series
                                  .split("+")
                                  .reduce((a, v) => a + Number(v), 0)
                              : Number(b.series) || 0;
                          const r = Number(b.reps) || 0;
                          const kg = Number(
                            calcKgBasica(ej.ejercicio_id, b.pct) ?? b.kg ?? 0,
                          );
                          volReps += s * r;
                          volKg += s * r * kg;
                        });
                        const pesoMedio =
                          volReps > 0
                            ? Math.round((volKg / volReps) * 2) / 2
                            : null;
                        let intMedia = null;
                        if (
                          volReps > 0 &&
                          volKg > 0 &&
                          ejData &&
                          ejData.pct_base
                        ) {
                          const irm =
                            ejData.base === "arranque"
                              ? Number(irm_arr)
                              : Number(irm_env);
                          if (irm) {
                            const kgBase = (irm * ejData.pct_base) / 100;
                            intMedia = Math.round(
                              (volKg / volReps / kgBase) * 100,
                            );
                          }
                        }
                        return (
                          <>
                            <td
                              style={{
                                padding: "5px 6px",
                                textAlign: "center",
                                background: "rgba(232,197,71,.06)",
                                border: "1px solid rgba(232,197,71,.2)",
                                borderRadius: 5,
                              }}
                            >
                              <div
                                style={{
                                  fontFamily: "'Bebas Neue'",
                                  fontSize: 16,
                                  color: "var(--gold)",
                                  lineHeight: 1,
                                }}
                              >
                                {volReps > 0 ? volReps : "—"}
                              </div>
                            </td>
                            <td
                              style={{
                                padding: "5px 6px",
                                textAlign: "center",
                                background: "rgba(71,180,232,.06)",
                                border: "1px solid rgba(71,180,232,.2)",
                                borderRadius: 5,
                              }}
                            >
                              <div
                                style={{
                                  fontFamily: "'Bebas Neue'",
                                  fontSize: 16,
                                  color: "var(--blue)",
                                  lineHeight: 1,
                                }}
                              >
                                {volKg > 0
                                  ? Number.isInteger(volKg)
                                    ? volKg
                                    : volKg.toFixed(1)
                                  : "—"}
                              </div>
                            </td>
                            <td
                              style={{
                                padding: "5px 6px",
                                textAlign: "center",
                                background: "rgba(71,232,160,.05)",
                                border: "1px solid rgba(71,232,160,.2)",
                                borderRadius: 5,
                              }}
                            >
                              <div
                                style={{
                                  fontFamily: "'Bebas Neue'",
                                  fontSize: 16,
                                  color: "var(--green)",
                                  lineHeight: 1,
                                }}
                              >
                                {pesoMedio !== null
                                  ? pesoMedio % 1 === 0
                                    ? pesoMedio
                                    : pesoMedio.toFixed(1)
                                  : "—"}
                              </div>
                            </td>
                            <td
                              style={{
                                padding: "5px 6px",
                                textAlign: "center",
                                background: "rgba(155,135,232,.05)",
                                border: "1px solid rgba(155,135,232,.2)",
                                borderRadius: 5,
                              }}
                            >
                              <div
                                style={{
                                  fontFamily: "'Bebas Neue'",
                                  fontSize: 16,
                                  color: "#9b87e8",
                                  lineHeight: 1,
                                }}
                              >
                                {intMedia !== null ? intMedia + "%" : "—"}
                              </div>
                            </td>
                          </>
                        );
                      })()}
                      {/* Spacer for the "+" column */}
                      <td style={{ border: "none" }} />
                      {/* Actions */}
                      <td
                        style={{
                          padding: 0,
                          textAlign: "center",
                          border: "none",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: 1,
                            justifyContent: "center",
                          }}
                        >
                          {eIdx > 0 && (
                            <button
                              onClick={() => moveEj(eIdx, -1)}
                              title="Mover arriba"
                              style={{
                                background: "none",
                                border: "none",
                                color: "var(--muted)",
                                cursor: "pointer",
                                fontSize: 10,
                                padding: "2px",
                              }}
                            >
                              ▲
                            </button>
                          )}
                          {eIdx < ejs.length - 1 && (
                            <button
                              onClick={() => moveEj(eIdx, 1)}
                              title="Mover abajo"
                              style={{
                                background: "none",
                                border: "none",
                                color: "var(--muted)",
                                cursor: "pointer",
                                fontSize: 10,
                                padding: "2px",
                              }}
                            >
                              ▼
                            </button>
                          )}
                          <button
                            onClick={() => removeEjercicio(eIdx)}
                            title="Eliminar ejercicio"
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--red)",
                              cursor: "pointer",
                              fontSize: 12,
                              padding: "2px",
                              opacity: 0.6,
                            }}
                          >
                            ×
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Agregar ejercicio */}
          <button
            onClick={addEjercicio}
            style={{
              marginTop: 8,
              padding: "6px 16px",
              borderRadius: 8,
              border: "1px dashed var(--border)",
              background: "transparent",
              color: "var(--gold)",
              cursor: "pointer",
              fontSize: 12,
              fontFamily: "'DM Sans'",
              fontWeight: 600,
              width: "100%",
            }}
          >
            + Agregar ejercicio
          </button>

          {/* Selector rápido de ejercicios */}
          <ExercisePickerOverlay
            open={ejPickerOpen !== null}
            normativos={normativos}
            query={ejPickerQuery}
            setQuery={setEjPickerQuery}
            activeIdx={ejPickerActiveIdx}
            setActiveIdx={setEjPickerActiveIdx}
            onClose={() => setEjPickerOpen(null)}
            onSelect={(ejercicio) => {
              if (ejPickerOpen === null) return;
              setEjercicioId(ejPickerOpen, ejercicio.id);
            }}
            inputName="ejercicio_query_basica"
          />

          {/* Info resumen del turno */}
          {(() => {
            const ejsConDatos = ejs.filter((e) => e.ejercicio_id);
            if (ejsConDatos.length === 0) return null;
            let totalReps = 0,
              totalKg = 0;
            ejsConDatos.forEach((e) => {
              const eData = normativos.find(
                (n) => n.id === Number(e.ejercicio_id),
              );
              (e.bloques || []).slice(0, numBloques).forEach((b) => {
                if (!b.series && !b.reps) return;
                const s =
                  typeof b.series === "string" && b.series.includes("+")
                    ? b.series.split("+").reduce((a, v) => a + Number(v), 0)
                    : Number(b.series) || 0;
                const r = Number(b.reps) || 0;
                const kg = Number(
                  calcKgBasica(e.ejercicio_id, b.pct) ?? b.kg ?? 0,
                );
                totalReps += s * r;
                totalKg += s * r * kg;
              });
            });
            const pesoMedioTotal =
              totalReps > 0 ? Math.round((totalKg / totalReps) * 2) / 2 : null;
            const metrics = [
              {
                label: "VOL REPs",
                value: totalReps > 0 ? totalReps : null,
                color: "var(--gold)",
              },
              {
                label: "VOL Kg",
                value:
                  totalKg > 0
                    ? Number.isInteger(totalKg)
                      ? totalKg
                      : totalKg.toFixed(1)
                    : null,
                color: "var(--blue)",
              },
              {
                label: "Peso Medio",
                value:
                  pesoMedioTotal !== null
                    ? pesoMedioTotal % 1 === 0
                      ? pesoMedioTotal
                      : pesoMedioTotal.toFixed(1)
                    : null,
                color: "var(--green)",
              },
            ];
            return (
              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--muted)",
                    padding: "6px 10px",
                    background: "var(--surface2)",
                    borderRadius: 8,
                  }}
                >
                  Ejercicios:{" "}
                  <span style={{ color: "var(--gold)", fontWeight: 700 }}>
                    {ejsConDatos.length}
                  </span>
                </div>
                {metrics.map(
                  (m) =>
                    m.value !== null && (
                      <div
                        key={m.label}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 8,
                          background: "var(--surface2)",
                          border: `1px solid ${m.color}30`,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          minWidth: 60,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 9,
                            color: "var(--muted)",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: ".04em",
                          }}
                        >
                          {m.label}
                        </div>
                        <div
                          style={{
                            fontFamily: "'Bebas Neue'",
                            fontSize: 18,
                            color: m.color,
                            lineHeight: 1,
                          }}
                        >
                          {m.value}
                        </div>
                      </div>
                    ),
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ── Planilla Pretemporada ────────────────────────────────────────────────────
// Similar a PlanillaBasica pero con soporte multi-ejercicio por fila.
// Cada ejercicio tiene ejercicio_ids: [{eid, link}] donde link es "-", "+" o "c".
function PlanillaPretemporada({
  semanas,
  onChange,
  numBloques = 3,
  onBeforeChange,
  irm_arr = 100,
  irm_env = 200,
  normativos: normativosProp = null,
}) {
  const [turnoGlobalActivo, setTurnoGlobalActivo] = useState(0);
  const [jumpTurno, setJumpTurno] = useState("");
  const pendingTurnoIdRef = useRef(null);

  const normativos =
    normativosProp ??
    (() => {
      try {
        return (
          JSON.parse(localStorage.getItem("liftplan_normativos") || "null") ||
          EJERCICIOS
        );
      } catch {
        return EJERCICIOS;
      }
    })();

  const turnosFlat = React.useMemo(() => {
    const out = [];
    let globalNumero = 1;
    (semanas || []).forEach((s, semIdx) => {
      (s.turnos || []).forEach((t, turnoIdx) => {
        out.push({ semIdx, turnoIdx, turno: t, globalNumero });
        globalNumero += 1;
      });
    });
    return out;
  }, [semanas]);

  useEffect(() => {
    if (!turnosFlat.length) {
      setTurnoGlobalActivo(0);
      return;
    }
    if (turnoGlobalActivo >= turnosFlat.length) {
      setTurnoGlobalActivo(turnosFlat.length - 1);
    }
  }, [turnosFlat, turnoGlobalActivo]);

  useEffect(() => {
    if (!pendingTurnoIdRef.current || !turnosFlat.length) return;
    const idx = turnosFlat.findIndex(
      (x) => x.turno.id === pendingTurnoIdRef.current,
    );
    if (idx >= 0) {
      setTurnoGlobalActivo(idx);
      pendingTurnoIdRef.current = null;
    }
  }, [turnosFlat]);

  const turnoRefGlobal = turnosFlat[turnoGlobalActivo] || null;
  const semActiva = turnoRefGlobal?.semIdx ?? 0;
  const turnoActivo = turnoRefGlobal?.turnoIdx ?? 0;
  const sem = semanas[semActiva];
  const turno = turnoRefGlobal?.turno || sem?.turnos?.[turnoActivo];
  const ejs = turno?.ejercicios || [];

  const totalTurnos = turnosFlat.length;
  const turnosPorRango = 12;
  const rangoActivo = Math.floor(turnoGlobalActivo / turnosPorRango);
  const totalRangos = Math.max(1, Math.ceil(totalTurnos / turnosPorRango));
  const inicioRango = rangoActivo * turnosPorRango;
  const finRango = Math.min(totalTurnos, inicioRango + turnosPorRango);

  const _bc = () => {
    try {
      if (onBeforeChange) onBeforeChange();
    } catch {}
  };

  // Calc kg using LOWEST pct_base among all ejercicio_ids with normativos
  const calcKgPretemp = (ejercicio_ids, pct) => {
    if (!ejercicio_ids || !ejercicio_ids.length || !pct) return null;
    let lowestKgBase = null;
    for (const { eid } of ejercicio_ids) {
      if (!eid) continue;
      const ejData = normativos.find((e) => e.id === Number(eid));
      if (!ejData || !ejData.pct_base) continue;
      const irm =
        ejData.base === "arranque" ? Number(irm_arr) : Number(irm_env);
      if (!irm) continue;
      const kgBase = (irm * ejData.pct_base) / 100;
      if (lowestKgBase === null || kgBase < lowestKgBase) lowestKgBase = kgBase;
    }
    if (lowestKgBase === null) return null;
    return Math.round(((lowestKgBase * pct) / 100) * 2) / 2;
  };

  const updateSemanas = (updater, extraFormUpdates) => {
    _bc();
    const next =
      typeof updater === "function"
        ? updater(JSON.parse(JSON.stringify(semanas)))
        : updater;
    onChange(next, extraFormUpdates);
  };

  const updateBloque = (ejIdx, bIdx, field, value) => {
    updateSemanas((ss) => {
      const ej = ss[semActiva].turnos[turnoActivo].ejercicios[ejIdx];
      if (!ej.bloques)
        ej.bloques = Array.from({ length: numBloques }, mkBloqueBasica);
      if (field === "pct") {
        const newPct = value === "" ? null : Number(value);
        const autoKg = calcKgPretemp(ej.ejercicio_ids, newPct);
        ej.bloques[bIdx] = { ...ej.bloques[bIdx], pct: newPct, kg: autoKg };
      } else if (field === "nota") {
        ej.bloques[bIdx] = { ...ej.bloques[bIdx], nota: value };
      } else {
        ej.bloques[bIdx] = {
          ...ej.bloques[bIdx],
          [field]:
            value === "" ? null : isNaN(Number(value)) ? value : Number(value),
        };
      }
      return ss;
    });
  };

  const setSubEjId = (ejIdx, subIdx, newId) => {
    updateSemanas((ss) => {
      const ej = ss[semActiva].turnos[turnoActivo].ejercicios[ejIdx];
      if (!ej.ejercicio_ids) ej.ejercicio_ids = [{ eid: null, link: "-" }];
      ej.ejercicio_ids[subIdx] = {
        ...ej.ejercicio_ids[subIdx],
        eid: newId ? Number(newId) : null,
      };
      // Recalculate kg for all blocks
      if (ej.bloques) {
        ej.bloques.forEach((b) => {
          if (b.pct) b.kg = calcKgPretemp(ej.ejercicio_ids, b.pct);
        });
      }
      return ss;
    });
  };

  const addSubEj = (ejIdx) => {
    updateSemanas((ss) => {
      const ej = ss[semActiva].turnos[turnoActivo].ejercicios[ejIdx];
      if (!ej.ejercicio_ids) ej.ejercicio_ids = [{ eid: null, link: "-" }];
      // Change last "-" to "+"
      const last = ej.ejercicio_ids[ej.ejercicio_ids.length - 1];
      if (last.link === "-") last.link = "+";
      ej.ejercicio_ids.push({ eid: null, link: "-" });
      return ss;
    });
  };

  const removeSubEj = (ejIdx, subIdx) => {
    updateSemanas((ss) => {
      const ej = ss[semActiva].turnos[turnoActivo].ejercicios[ejIdx];
      if (!ej.ejercicio_ids || ej.ejercicio_ids.length <= 1) return ss;
      ej.ejercicio_ids.splice(subIdx, 1);
      // First element always has link "-"
      ej.ejercicio_ids[0].link = "-";
      // Last element always has link "-"
      ej.ejercicio_ids[ej.ejercicio_ids.length - 1].link = "-";
      // Recalculate kg
      if (ej.bloques) {
        ej.bloques.forEach((b) => {
          if (b.pct) b.kg = calcKgPretemp(ej.ejercicio_ids, b.pct);
        });
      }
      return ss;
    });
  };

  const cycleLink = (ejIdx, subIdx) => {
    updateSemanas((ss) => {
      const ej = ss[semActiva].turnos[turnoActivo].ejercicios[ejIdx];
      const sub = ej.ejercicio_ids[subIdx];
      sub.link = sub.link === "+" ? "c" : "+";
      return ss;
    });
  };

  const setNombreCustom = (ejIdx, nombre) => {
    updateSemanas((ss) => {
      ss[semActiva].turnos[turnoActivo].ejercicios[ejIdx].nombre_custom =
        nombre;
      return ss;
    });
  };

  const addEjercicio = () => {
    updateSemanas((ss) => {
      ss[semActiva].turnos[turnoActivo].ejercicios.push(
        mkEjPretemp(numBloques),
      );
      return ss;
    });
  };

  const removeEjercicio = (ejIdx) => {
    if (ejs.length <= 1) return;
    updateSemanas((ss) => {
      ss[semActiva].turnos[turnoActivo].ejercicios.splice(ejIdx, 1);
      return ss;
    });
  };

  const removeTurno = () => {
    if (!sem || totalTurnos <= 1) return;
    const targetGlobalIdx = Math.max(0, turnoGlobalActivo - 1);
    updateSemanas((ss) => {
      ss[semActiva].turnos.splice(turnoActivo, 1);
      ss[semActiva].turnos.forEach((t, i) => {
        t.numero = i + 1;
      });
      if (ss[semActiva].turnos.length === 0 && ss.length > 1) {
        ss.splice(semActiva, 1);
        ss.forEach((s, i) => {
          s.numero = i + 1;
        });
      }
      return ss;
    });
    setTurnoGlobalActivo(targetGlobalIdx);
  };

  const addTurno = () => {
    const newTurnoId = mkId();
    updateSemanas((ss) => {
      const semIdx = Math.max(0, Math.min(semActiva, ss.length - 1));
      const semSel = ss[semIdx];
      const insertIdx = Math.max(
        0,
        Math.min(turnoActivo + 1, semSel.turnos.length),
      );
      semSel.turnos.splice(insertIdx, 0, {
        id: newTurnoId,
        numero: 0,
        dia: "",
        momento: "",
        ejercicios: Array.from({ length: 6 }, () => mkEjPretemp(numBloques)),
      });
      semSel.turnos.forEach((t, i) => {
        t.numero = i + 1;
      });
      return ss;
    });
    pendingTurnoIdRef.current = newTurnoId;
  };

  const addBloqueCol = () => {
    const newNum = numBloques + 1;
    updateSemanas(
      (ss) => {
        ss.forEach((s) =>
          s.turnos.forEach((t) =>
            t.ejercicios.forEach((e) => {
              if (!e.bloques)
                e.bloques = Array.from({ length: numBloques }, mkBloqueBasica);
              e.bloques.push(mkBloqueBasica());
            }),
          ),
        );
        return ss;
      },
      { num_bloques_basica: newNum },
    );
  };

  const removeBloqueCol = (bIdx) => {
    if (numBloques <= 1) return;
    updateSemanas(
      (ss) => {
        ss.forEach((s) =>
          s.turnos.forEach((t) =>
            t.ejercicios.forEach((e) => {
              if (e.bloques && e.bloques.length > bIdx)
                e.bloques.splice(bIdx, 1);
            }),
          ),
        );
        return ss;
      },
      { num_bloques_basica: numBloques - 1 },
    );
  };

  const moveEj = (ejIdx, dir) => {
    const tgt = ejIdx + dir;
    if (tgt < 0 || tgt >= ejs.length) return;
    updateSemanas((ss) => {
      const arr = ss[semActiva].turnos[turnoActivo].ejercicios;
      [arr[ejIdx], arr[tgt]] = [arr[tgt], arr[ejIdx]];
      return ss;
    });
  };

  const irATurnoGlobal = (idx) => {
    if (!turnosFlat.length) return;
    const safe = Math.max(0, Math.min(idx, turnosFlat.length - 1));
    setTurnoGlobalActivo(safe);
  };

  const cellInput = (extra = {}) => ({
    width: "100%",
    background: "transparent",
    border: "none",
    fontFamily: "'Bebas Neue'",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 1.2,
    outline: "none",
    padding: "3px 2px",
    color: "var(--text)",
    MozAppearance: "textfield",
    appearance: "textfield",
    ...extra,
  });

  // Build auto-name from ejercicio_ids
  const buildAutoName = (ejercicio_ids) => {
    if (!ejercicio_ids || !ejercicio_ids.length) return "";
    return ejercicio_ids
      .map((sub, i) => {
        const ejData = sub.eid
          ? normativos.find((e) => e.id === Number(sub.eid))
          : null;
        const name = ejData?.nombre || "";
        if (i === 0) return name;
        const sep = sub.link === "c" ? " c/ " : " + ";
        return sep + name;
      })
      .join("");
  };

  if (!sem) return null;

  return (
    <div>
      {/* ── Navegación por turnos globales ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              padding: "4px 8px",
              borderRadius: 8,
              background: "rgba(255,152,0,.12)",
              border: "1px solid rgba(255,152,0,.3)",
              fontSize: 11,
              color: "#ffb74d",
              fontWeight: 700,
            }}
          >
            Turnos: {totalTurnos}
          </div>
          <div
            style={{
              fontFamily: "'Bebas Neue'",
              fontSize: 20,
              color: "var(--gold)",
              lineHeight: 1,
            }}
          >
            T{Math.min(totalTurnos, turnoGlobalActivo + 1)}
            <span
              style={{
                fontFamily: "'DM Sans'",
                fontSize: 12,
                color: "var(--muted)",
                marginLeft: 6,
              }}
            >
              de {totalTurnos}
            </span>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => irATurnoGlobal(turnoGlobalActivo - 1)}
            disabled={turnoGlobalActivo <= 0}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "var(--surface2)",
              color: "var(--muted)",
              cursor: turnoGlobalActivo <= 0 ? "not-allowed" : "pointer",
              fontSize: 11,
              opacity: turnoGlobalActivo <= 0 ? 0.45 : 1,
            }}
          >
            ◀ Anterior
          </button>
          <button
            onClick={() => irATurnoGlobal(turnoGlobalActivo + 1)}
            disabled={turnoGlobalActivo >= totalTurnos - 1}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "var(--surface2)",
              color: "var(--muted)",
              cursor:
                turnoGlobalActivo >= totalTurnos - 1
                  ? "not-allowed"
                  : "pointer",
              fontSize: 11,
              opacity: turnoGlobalActivo >= totalTurnos - 1 ? 0.45 : 1,
            }}
          >
            Siguiente ▶
          </button>
          <input
            name="field_pt_jump_turno"
            type="number"
            min={1}
            max={Math.max(1, totalTurnos)}
            className="no-spin"
            value={jumpTurno}
            placeholder="N°"
            onChange={(e) => setJumpTurno(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              const n = Number(jumpTurno);
              if (!Number.isInteger(n)) return;
              irATurnoGlobal(n - 1);
            }}
            style={{
              width: 58,
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "4px 6px",
              color: "var(--text)",
              textAlign: "center",
              fontFamily: "'Bebas Neue'",
              fontSize: 15,
              outline: "none",
            }}
          />
        </div>
      </div>

      <div
        style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}
      >
        {Array.from({ length: totalRangos }).map((_, i) => {
          const ini = i * turnosPorRango + 1;
          const fin = Math.min(totalTurnos, (i + 1) * turnosPorRango);
          const activo = i === rangoActivo;
          return (
            <button
              key={`rango-${i}`}
              onClick={() => irATurnoGlobal(i * turnosPorRango)}
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                border: activo
                  ? "1px solid var(--gold)"
                  : "1px solid var(--border)",
                background: activo ? "rgba(232,197,71,.14)" : "var(--surface2)",
                color: activo ? "var(--gold)" : "var(--muted)",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {ini}-{fin}
            </button>
          );
        })}
      </div>

      {/* ── Turnos del rango activo ── */}
      <div
        style={{
          display: "flex",
          gap: 4,
          flexWrap: "wrap",
          marginBottom: 12,
          alignItems: "center",
        }}
      >
        {turnosFlat.slice(inicioRango, finRango).map((tRef, i) => {
          const globalIdx = inicioRango + i;
          const t = tRef.turno;
          return (
            <button
              key={t.id}
              onClick={() => irATurnoGlobal(globalIdx)}
              style={{
                padding: "4px 12px",
                borderRadius: 6,
                border: "none",
                background:
                  turnoGlobalActivo === globalIdx
                    ? "var(--gold)"
                    : "var(--surface3)",
                color: turnoGlobalActivo === globalIdx ? "#000" : "var(--text)",
                fontFamily: "'Bebas Neue'",
                fontSize: 14,
                cursor: "pointer",
                letterSpacing: ".04em",
              }}
            >
              T{tRef.globalNumero}
              {t.dia ? ` · ${t.dia.slice(0, 3)}` : ""}
            </button>
          );
        })}
        <button
          onClick={addTurno}
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            border: "1px dashed var(--border)",
            background: "transparent",
            color: "var(--gold)",
            cursor: "pointer",
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
          }}
        >
          +
        </button>
        {totalTurnos > 1 && (
          <button
            onClick={removeTurno}
            title="Eliminar turno actual"
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              border: "1px dashed var(--border)",
              background: "transparent",
              color: "var(--red)",
              cursor: "pointer",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
            }}
          >
            −
          </button>
        )}
      </div>

      {/* ── Header del turno ── */}
      {turno && (
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 10,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                fontFamily: "'Bebas Neue'",
                fontSize: 20,
                color: "var(--gold)",
              }}
            >
              Turno {Math.min(totalTurnos, turnoGlobalActivo + 1)}
            </div>
            <select
              name="field_pt_day"
              value={turno.dia || ""}
              onChange={(e) => {
                updateSemanas((ss) => {
                  ss[semActiva].turnos[turnoActivo].dia = e.target.value;
                  return ss;
                });
              }}
              style={{
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "3px 6px",
                color: "var(--text)",
                fontSize: 11,
                fontFamily: "'DM Sans'",
              }}
            >
              <option value="">Día</option>
              {[
                "Lunes",
                "Martes",
                "Miércoles",
                "Jueves",
                "Viernes",
                "Sábado",
                "Domingo",
              ].map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select
              name="field_pt_mom"
              value={turno.momento || ""}
              onChange={(e) => {
                updateSemanas((ss) => {
                  ss[semActiva].turnos[turnoActivo].momento = e.target.value;
                  return ss;
                });
              }}
              style={{
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "3px 6px",
                color: "var(--text)",
                fontSize: 11,
                fontFamily: "'DM Sans'",
              }}
            >
              <option value="">Momento</option>
              {["Mañana", "Tarde", "Noche"].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* ── Tabla de ejercicios ── */}
          <div style={{ overflowX: "auto" }}>
            <table
              className="planilla-tabla"
              style={{
                borderCollapse: "separate",
                borderSpacing: "2px 2px",
                width: "100%",
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      padding: "5px 6px",
                      background: "var(--surface2)",
                      border: "1px solid var(--border)",
                      borderRadius: 5,
                      textAlign: "center",
                      fontSize: 10,
                      color: "var(--muted)",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      minWidth: 80,
                    }}
                  >
                    REF
                  </th>
                  <th
                    style={{
                      padding: "5px 6px",
                      background: "var(--surface2)",
                      border: "1px solid var(--border)",
                      borderRadius: 5,
                      fontSize: 10,
                      color: "var(--muted)",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      minWidth: 100,
                    }}
                  >
                    EJERCICIO
                  </th>
                  {Array.from({ length: numBloques }).map((_, bIdx) => (
                    <th
                      key={bIdx}
                      style={{
                        padding: "3px 4px",
                        background: "rgba(232,197,71,.08)",
                        border: "1px solid rgba(232,197,71,.3)",
                        borderRadius: 5,
                        textAlign: "center",
                        fontSize: 9,
                        color: "var(--gold)",
                        fontWeight: 700,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 2,
                        }}
                      >
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr 1fr 1fr",
                            gap: 0,
                            flex: 1,
                          }}
                        >
                          {["%", "S", "R", "Kg"].map((l) => (
                            <div
                              key={l}
                              style={{
                                fontSize: 8,
                                color: "var(--muted)",
                                textAlign: "center",
                                fontWeight: 700,
                              }}
                            >
                              {l}
                            </div>
                          ))}
                        </div>
                        {numBloques > 1 && (
                          <button
                            onClick={() => removeBloqueCol(bIdx)}
                            style={{
                              width: 14,
                              height: 14,
                              borderRadius: "50%",
                              border: "none",
                              background: "transparent",
                              color: "var(--muted)",
                              cursor: "pointer",
                              fontSize: 11,
                              lineHeight: 1,
                              padding: 0,
                              flexShrink: 0,
                            }}
                            title="Eliminar esta columna de %"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                  <th
                    style={{
                      padding: "3px 4px",
                      background: "rgba(232,197,71,.08)",
                      border: "1px solid rgba(232,197,71,.3)",
                      borderRadius: 5,
                      textAlign: "center",
                      fontSize: 9,
                      color: "var(--gold)",
                      fontWeight: 700,
                    }}
                  >
                    VOL
                    <br />
                    REPs
                  </th>
                  <th
                    style={{
                      padding: "3px 4px",
                      background: "rgba(71,180,232,.08)",
                      border: "1px solid rgba(71,180,232,.3)",
                      borderRadius: 5,
                      textAlign: "center",
                      fontSize: 9,
                      color: "var(--blue)",
                      fontWeight: 700,
                    }}
                  >
                    VOL
                    <br />
                    Kg
                  </th>
                  <th
                    style={{
                      padding: "3px 4px",
                      background: "rgba(71,232,160,.05)",
                      border: "1px solid rgba(71,232,160,.2)",
                      borderRadius: 5,
                      textAlign: "center",
                      fontSize: 9,
                      color: "var(--green)",
                      fontWeight: 700,
                    }}
                  >
                    Peso
                    <br />
                    Medio
                  </th>
                  <th
                    style={{
                      padding: "3px 4px",
                      background: "rgba(155,135,232,.05)",
                      border: "1px solid rgba(155,135,232,.2)",
                      borderRadius: 5,
                      textAlign: "center",
                      fontSize: 9,
                      color: "#9b87e8",
                      fontWeight: 700,
                    }}
                  >
                    Int
                    <br />
                    Media
                  </th>
                  <th
                    style={{
                      padding: "3px 4px",
                      background: "var(--surface2)",
                      border: "1px dashed var(--border)",
                      borderRadius: 5,
                      width: 30,
                    }}
                  >
                    <button
                      onClick={addBloqueCol}
                      title="Agregar columna de %"
                      style={{
                        width: "100%",
                        background: "transparent",
                        border: "none",
                        color: "var(--gold)",
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 700,
                        padding: 0,
                      }}
                    >
                      + %
                    </button>
                  </th>
                  <th style={{ width: 26 }} />
                </tr>
              </thead>
              <tbody>
                {ejs.map((ej, eIdx) => {
                  const subEjs = ej.ejercicio_ids || [
                    { eid: ej.ejercicio_id || null, link: "-" },
                  ];
                  // Find lowest pct_base for color
                  const firstEid = subEjs.find((s) => s.eid)?.eid;
                  const firstEjData = firstEid
                    ? normativos.find((e) => e.id === Number(firstEid))
                    : null;
                  const col = firstEjData
                    ? CAT_COLOR[firstEjData.categoria]
                    : "var(--border)";
                  const bloques =
                    ej.bloques ||
                    Array.from({ length: numBloques }, mkBloqueBasica);
                  const autoName = buildAutoName(subEjs);
                  const displayName = resolveExerciseName(
                    ej.nombre_custom,
                    autoName,
                  );

                  return (
                    <tr
                      key={ej.id}
                      style={{
                        background:
                          eIdx % 2 === 0 ? "var(--surface2)" : "transparent",
                      }}
                    >
                      {/* REF — multi-ID con botones de enlace */}
                      <td
                        style={{
                          padding: "4px 4px",
                          textAlign: "center",
                          border: `1px solid ${col}40`,
                          borderRadius: 5,
                          background: `${col}0a`,
                          verticalAlign: "middle",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          {subEjs.map((sub, sIdx) => {
                            const subEjData = sub.eid
                              ? normativos.find((x) => x.id === Number(sub.eid))
                              : null;
                            const subCol = subEjData
                              ? CAT_COLOR[subEjData.categoria]
                              : "var(--border)";
                            return (
                              <React.Fragment key={sIdx}>
                                {/* Link button between sub-exercises */}
                                {sIdx > 0 && (
                                  <button
                                    onClick={() => cycleLink(eIdx, sIdx)}
                                    title={
                                      sub.link === "+"
                                        ? "Secuencial (+): click para cambiar a combinado"
                                        : "Combinado (c): click para cambiar a secuencial"
                                    }
                                    style={{
                                      width: 20,
                                      height: 14,
                                      borderRadius: 3,
                                      border: "none",
                                      cursor: "pointer",
                                      fontSize: 9,
                                      fontWeight: 900,
                                      padding: 0,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      background:
                                        sub.link === "c"
                                          ? "rgba(232,71,71,.25)"
                                          : "rgba(71,180,232,.25)",
                                      color:
                                        sub.link === "c"
                                          ? "var(--red)"
                                          : "var(--blue)",
                                      fontFamily: "'Bebas Neue'",
                                      lineHeight: 1,
                                      margin: "-1px 0",
                                    }}
                                  >
                                    {sub.link === "c" ? "C" : "+"}
                                  </button>
                                )}
                                {/* ID container */}
                                <div
                                  style={{
                                    position: "relative",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: 40,
                                    minHeight: 28,
                                    borderRadius: 6,
                                    border: `1.5px solid ${sub.eid ? subCol : "var(--border)"}`,
                                    background: sub.eid
                                      ? `${subCol}12`
                                      : "var(--surface2)",
                                    transition: "all .15s",
                                  }}
                                >
                                  <input
                                    name={`field_pt_ref_${eIdx}_${sIdx}`}
                                    type="number"
                                    min={1}
                                    max={999}
                                    className="no-spin"
                                    value={sub.eid || ""}
                                    placeholder="—"
                                    onChange={(e) =>
                                      setSubEjId(eIdx, sIdx, e.target.value)
                                    }
                                    style={cellInput({
                                      width: 34,
                                      fontFamily: "'Bebas Neue'",
                                      fontSize: 15,
                                      fontWeight: 700,
                                      color: subEjData
                                        ? subCol
                                        : "var(--muted)",
                                      padding: "2px 0",
                                    })}
                                  />
                                  {/* X to remove sub-exercise */}
                                  {subEjs.length > 1 && sIdx > 0 && (
                                    <button
                                      onClick={() => removeSubEj(eIdx, sIdx)}
                                      title="Quitar este ejercicio"
                                      style={{
                                        position: "absolute",
                                        top: -5,
                                        right: -5,
                                        width: 14,
                                        height: 14,
                                        borderRadius: "50%",
                                        border: "1.5px solid var(--surface1)",
                                        background: "var(--red)",
                                        color: "#fff",
                                        cursor: "pointer",
                                        fontSize: 8,
                                        lineHeight: 1,
                                        padding: 0,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        zIndex: 2,
                                      }}
                                    >
                                      ×
                                    </button>
                                  )}
                                </div>
                              </React.Fragment>
                            );
                          })}
                          {/* Button to add more sub-exercises */}
                          <button
                            onClick={() => addSubEj(eIdx)}
                            title="Agregar ejercicio a esta fila"
                            style={{
                              width: 40,
                              height: 18,
                              borderRadius: 4,
                              border: "1px dashed var(--border)",
                              background: "transparent",
                              color: "var(--muted)",
                              cursor: "pointer",
                              fontSize: 11,
                              fontWeight: 700,
                              padding: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              lineHeight: 1,
                              opacity: 0.6,
                            }}
                          >
                            +
                          </button>
                        </div>
                      </td>
                      {/* Ejercicio nombre */}
                      <td
                        style={{
                          padding: "6px 8px",
                          border: "1px solid var(--border)",
                          borderRadius: 6,
                          position: "relative",
                          minWidth: 160,
                          maxWidth: 240,
                          verticalAlign: "middle",
                          background: "var(--surface2)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 9,
                            color: "var(--muted)",
                            fontFamily: "'DM Sans'",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: ".04em",
                            marginBottom: 2,
                            lineHeight: 1,
                          }}
                        >
                          Ejercicio
                        </div>
                        <textarea
                          name={`field_pt_name_${eIdx}`}
                          value={displayName}
                          placeholder="Nombre del ejercicio"
                          rows={2}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "") {
                              setNombreCustom(eIdx, EMPTY_NAME_SENTINEL);
                              return;
                            }
                            if (val === autoName) {
                              setNombreCustom(eIdx, "");
                            } else {
                              setNombreCustom(eIdx, val);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (
                              e.key === "Backspace" &&
                              e.currentTarget.value === "" &&
                              ej.nombre_custom === EMPTY_NAME_SENTINEL
                            ) {
                              e.preventDefault();
                              setNombreCustom(eIdx, "");
                            }
                          }}
                          style={{
                            width: "100%",
                            background: "transparent",
                            border: "none",
                            color: "var(--text)",
                            fontSize: 11,
                            outline: "none",
                            padding: "2px 0",
                            fontFamily: "'DM Sans'",
                            resize: "none",
                            lineHeight: 1.3,
                            overflow: "hidden",
                          }}
                        />
                      </td>
                      {/* Bloques: % | S | R | Kg + nota */}
                      {bloques.slice(0, numBloques).map((b, bIdx) => {
                        const hasNota = b.nota && b.nota.trim() !== "";
                        const hasData = b.pct || b.series || b.reps;
                        return (
                          <td
                            key={bIdx}
                            style={{
                              padding: "2px 3px",
                              textAlign: "center",
                              background: "rgba(232,197,71,.04)",
                              border: `1px solid ${hasNota ? "var(--muted)" : "rgba(232,197,71,.15)"}`,
                              borderRadius: 5,
                              position: "relative",
                            }}
                          >
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr 1fr 1fr",
                                gap: 0,
                              }}
                            >
                              <input
                                name={`field_pt_pct_${eIdx}_${bIdx}`}
                                type="number"
                                className="no-spin"
                                value={b.pct ?? ""}
                                placeholder="%"
                                onChange={(e) =>
                                  updateBloque(
                                    eIdx,
                                    bIdx,
                                    "pct",
                                    e.target.value,
                                  )
                                }
                                style={cellInput({
                                  fontSize: 13,
                                  color: "var(--gold)",
                                })}
                              />
                              <input
                                name={`field_pt_s_${eIdx}_${bIdx}`}
                                type="text"
                                className="no-spin"
                                value={b.series ?? ""}
                                placeholder="—"
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  updateSemanas((ss) => {
                                    const ej2 =
                                      ss[semActiva].turnos[turnoActivo]
                                        .ejercicios[eIdx];
                                    if (!ej2.bloques)
                                      ej2.bloques = Array.from(
                                        { length: numBloques },
                                        mkBloqueBasica,
                                      );
                                    ej2.bloques[bIdx] = {
                                      ...ej2.bloques[bIdx],
                                      series:
                                        raw === ""
                                          ? null
                                          : isNaN(Number(raw))
                                            ? raw
                                            : Number(raw),
                                    };
                                    return ss;
                                  });
                                }}
                                style={cellInput()}
                              />
                              <input
                                name={`field_pt_r_${eIdx}_${bIdx}`}
                                type="number"
                                className="no-spin"
                                value={b.reps ?? ""}
                                placeholder="—"
                                onChange={(e) =>
                                  updateBloque(
                                    eIdx,
                                    bIdx,
                                    "reps",
                                    e.target.value,
                                  )
                                }
                                style={cellInput()}
                              />
                              <input
                                name={`field_pt_kg_${eIdx}_${bIdx}`}
                                type="number"
                                step="0.5"
                                className="no-spin"
                                value={
                                  calcKgPretemp(subEjs, b.pct) ?? b.kg ?? ""
                                }
                                readOnly
                                style={cellInput({
                                  color: "var(--muted)",
                                  fontSize: 12,
                                })}
                              />
                            </div>
                            <input
                              name={`field_pt_nota_${eIdx}_${bIdx}`}
                              type="text"
                              value={b.nota || ""}
                              placeholder="…"
                              onChange={(e) =>
                                updateBloque(eIdx, bIdx, "nota", e.target.value)
                              }
                              title="Aclaración"
                              style={{
                                display: hasData || hasNota ? "block" : "none",
                                width: "100%",
                                background: "transparent",
                                border: "none",
                                borderTop: hasNota
                                  ? "1px solid var(--border)"
                                  : "none",
                                color: "var(--muted)",
                                fontSize: 9,
                                textAlign: "center",
                                outline: "none",
                                padding: "2px 0 0",
                                fontFamily: "'DM Sans'",
                                marginTop: 2,
                              }}
                            />
                          </td>
                        );
                      })}
                      {/* Stats: VOL REPs, VOL Kg, Peso Medio, Int Media */}
                      {(() => {
                        let volReps = 0,
                          volKg = 0;
                        (bloques || []).slice(0, numBloques).forEach((b) => {
                          if (!b.series && !b.reps) return;
                          const s =
                            typeof b.series === "string" &&
                            b.series.includes("+")
                              ? b.series
                                  .split("+")
                                  .reduce((a, v) => a + Number(v), 0)
                              : Number(b.series) || 0;
                          const r = Number(b.reps) || 0;
                          const kg = Number(
                            calcKgPretemp(subEjs, b.pct) ?? b.kg ?? 0,
                          );
                          volReps += s * r;
                          volKg += s * r * kg;
                        });
                        const pesoMedio =
                          volReps > 0
                            ? Math.round((volKg / volReps) * 2) / 2
                            : null;
                        // Int media: use lowest pct_base
                        let intMedia = null;
                        if (volReps > 0 && volKg > 0) {
                          let lowestKgBase = null;
                          for (const { eid } of subEjs) {
                            if (!eid) continue;
                            const ejD = normativos.find(
                              (e) => e.id === Number(eid),
                            );
                            if (!ejD || !ejD.pct_base) continue;
                            const irm =
                              ejD.base === "arranque"
                                ? Number(irm_arr)
                                : Number(irm_env);
                            if (!irm) continue;
                            const kb = (irm * ejD.pct_base) / 100;
                            if (lowestKgBase === null || kb < lowestKgBase)
                              lowestKgBase = kb;
                          }
                          if (lowestKgBase)
                            intMedia = Math.round(
                              (volKg / volReps / lowestKgBase) * 100,
                            );
                        }
                        return (
                          <>
                            <td
                              style={{
                                padding: "5px 6px",
                                textAlign: "center",
                                background: "rgba(232,197,71,.06)",
                                border: "1px solid rgba(232,197,71,.2)",
                                borderRadius: 5,
                              }}
                            >
                              <div
                                style={{
                                  fontFamily: "'Bebas Neue'",
                                  fontSize: 16,
                                  color: "var(--gold)",
                                  lineHeight: 1,
                                }}
                              >
                                {volReps > 0 ? volReps : "—"}
                              </div>
                            </td>
                            <td
                              style={{
                                padding: "5px 6px",
                                textAlign: "center",
                                background: "rgba(71,180,232,.06)",
                                border: "1px solid rgba(71,180,232,.2)",
                                borderRadius: 5,
                              }}
                            >
                              <div
                                style={{
                                  fontFamily: "'Bebas Neue'",
                                  fontSize: 16,
                                  color: "var(--blue)",
                                  lineHeight: 1,
                                }}
                              >
                                {volKg > 0
                                  ? Number.isInteger(volKg)
                                    ? volKg
                                    : volKg.toFixed(1)
                                  : "—"}
                              </div>
                            </td>
                            <td
                              style={{
                                padding: "5px 6px",
                                textAlign: "center",
                                background: "rgba(71,232,160,.05)",
                                border: "1px solid rgba(71,232,160,.2)",
                                borderRadius: 5,
                              }}
                            >
                              <div
                                style={{
                                  fontFamily: "'Bebas Neue'",
                                  fontSize: 16,
                                  color: "var(--green)",
                                  lineHeight: 1,
                                }}
                              >
                                {pesoMedio !== null
                                  ? pesoMedio % 1 === 0
                                    ? pesoMedio
                                    : pesoMedio.toFixed(1)
                                  : "—"}
                              </div>
                            </td>
                            <td
                              style={{
                                padding: "5px 6px",
                                textAlign: "center",
                                background: "rgba(155,135,232,.05)",
                                border: "1px solid rgba(155,135,232,.2)",
                                borderRadius: 5,
                              }}
                            >
                              <div
                                style={{
                                  fontFamily: "'Bebas Neue'",
                                  fontSize: 16,
                                  color: "#9b87e8",
                                  lineHeight: 1,
                                }}
                              >
                                {intMedia !== null ? intMedia + "%" : "—"}
                              </div>
                            </td>
                          </>
                        );
                      })()}
                      <td style={{ border: "none" }} />
                      {/* Actions */}
                      <td
                        style={{
                          padding: 0,
                          textAlign: "center",
                          border: "none",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: 1,
                            justifyContent: "center",
                          }}
                        >
                          {eIdx > 0 && (
                            <button
                              onClick={() => moveEj(eIdx, -1)}
                              title="Mover arriba"
                              style={{
                                background: "none",
                                border: "none",
                                color: "var(--muted)",
                                cursor: "pointer",
                                fontSize: 10,
                                padding: "2px",
                              }}
                            >
                              ▲
                            </button>
                          )}
                          {eIdx < ejs.length - 1 && (
                            <button
                              onClick={() => moveEj(eIdx, 1)}
                              title="Mover abajo"
                              style={{
                                background: "none",
                                border: "none",
                                color: "var(--muted)",
                                cursor: "pointer",
                                fontSize: 10,
                                padding: "2px",
                              }}
                            >
                              ▼
                            </button>
                          )}
                          <button
                            onClick={() => removeEjercicio(eIdx)}
                            title="Eliminar ejercicio"
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--red)",
                              cursor: "pointer",
                              fontSize: 12,
                              padding: "2px",
                              opacity: 0.6,
                            }}
                          >
                            ×
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Agregar ejercicio */}
          <button
            onClick={addEjercicio}
            style={{
              marginTop: 8,
              padding: "6px 16px",
              borderRadius: 8,
              border: "1px dashed var(--border)",
              background: "transparent",
              color: "var(--gold)",
              cursor: "pointer",
              fontSize: 12,
              fontFamily: "'DM Sans'",
              fontWeight: 600,
              width: "100%",
            }}
          >
            + Agregar ejercicio
          </button>

          {/* Info resumen del turno */}
          {(() => {
            const ejsConDatos = ejs.filter((e) =>
              (e.ejercicio_ids || []).some((s) => s.eid),
            );
            if (ejsConDatos.length === 0) return null;
            let totalReps = 0,
              totalKg = 0;
            ejsConDatos.forEach((e) => {
              const subEjsR = e.ejercicio_ids || [
                { eid: e.ejercicio_id, link: "-" },
              ];
              (e.bloques || []).slice(0, numBloques).forEach((b) => {
                if (!b.series && !b.reps) return;
                const s =
                  typeof b.series === "string" && b.series.includes("+")
                    ? b.series.split("+").reduce((a, v) => a + Number(v), 0)
                    : Number(b.series) || 0;
                const r = Number(b.reps) || 0;
                const kg = Number(calcKgPretemp(subEjsR, b.pct) ?? b.kg ?? 0);
                totalReps += s * r;
                totalKg += s * r * kg;
              });
            });
            const pesoMedioTotal =
              totalReps > 0 ? Math.round((totalKg / totalReps) * 2) / 2 : null;
            const metrics = [
              {
                label: "VOL REPs",
                value: totalReps > 0 ? totalReps : null,
                color: "var(--gold)",
              },
              {
                label: "VOL Kg",
                value:
                  totalKg > 0
                    ? Number.isInteger(totalKg)
                      ? totalKg
                      : totalKg.toFixed(1)
                    : null,
                color: "var(--blue)",
              },
              {
                label: "Peso Medio",
                value:
                  pesoMedioTotal !== null
                    ? pesoMedioTotal % 1 === 0
                      ? pesoMedioTotal
                      : pesoMedioTotal.toFixed(1)
                    : null,
                color: "var(--green)",
              },
            ];
            return (
              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--muted)",
                    padding: "6px 10px",
                    background: "var(--surface2)",
                    borderRadius: 8,
                  }}
                >
                  Ejercicios:{" "}
                  <span style={{ color: "var(--gold)", fontWeight: 700 }}>
                    {ejsConDatos.length}
                  </span>
                </div>
                {metrics.map(
                  (m) =>
                    m.value !== null && (
                      <div
                        key={m.label}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 8,
                          background: "var(--surface2)",
                          border: `1px solid ${m.color}30`,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          minWidth: 60,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 9,
                            color: "var(--muted)",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: ".04em",
                          }}
                        >
                          {m.label}
                        </div>
                        <div
                          style={{
                            fontFamily: "'Bebas Neue'",
                            fontSize: 18,
                            color: m.color,
                            lineHeight: 1,
                          }}
                        >
                          {m.value}
                        </div>
                      </div>
                    ),
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}


// ─── RESUMEN DE GRUPOS ───────────────────────────────────────────────────────
// ─── SEMBRADO MENSUAL ─────────────────────────────────────────────────────────
// ── Buscador compacto para EjCelda (muestra ID, abre popover al hacer click) ──
const mkEj = () => ({
  id: mkId(),
  ejercicio_id: null,
  intensidad: 75,
  tabla: 1,
  reps_asignadas: 0,
});

const PREVIEW_REPS = 14;

// Una fila de ejercicio dentro de una celda turno×semana — ultra compacta
// Una celda completa: N ejercicios apilados + botón agregar
// ── Hook de ordenamiento por drag (mouse + touch) ────────────────────────────
// El drag se inicia SOLO desde el handle. Funciona en desktop y móvil.

// ─── PAGES ───────────────────────────────────────────────────────────────────

function PageAtletas({
  atletas,
  setAtletas,
  mesociclos,
  setMesociclos,
  onSelect,
  coachId,
}) {
  const [showForm, setShowForm] = useState(false);
  const [tipoInicial, setTipoInicial] = useState("atleta");
  const [editAtleta, setEditAtleta] = useState(null);
  const [previewAtleta, setPreviewAtleta] = useState(null);
  const [expandedAtletas, setExpandedAtletas] = useState(false);
  const [expandedAsesorias, setExpandedAsesorias] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const MAX_VISIBLE = 4;

  // Load registered athlete users for the selector
  useEffect(() => {
    if (!SUPA_CONFIG_OK) return;
    sb.from("profiles")
      .select("id, nombre, email")
      .eq("rol", "atleta")
      .then(({ data }) => {
        if (data) setRegisteredUsers(data);
      })
      .catch(() => {});
  }, []);

  const saveAtleta = (a) => {
    setAtletas((prev) => {
      const idx = prev.findIndex((x) => x.id === a.id);
      return idx >= 0 ? prev.map((x) => (x.id === a.id ? a : x)) : [...prev, a];
    });
    setShowForm(false);
    setEditAtleta(null);
  };

  const [confirmDeleteAtleta, setConfirmDeleteAtleta] = useState(null);
  const deleteAtleta = (id, e) => {
    e.stopPropagation();
    const atleta = atletas.find((a) => a.id === id);
    setConfirmDeleteAtleta(atleta);
  };

  const atletasGrupo = atletas.filter((a) => a.tipo !== "asesoria");
  const asesorias = atletas.filter((a) => a.tipo === "asesoria");

  const renderCard = (a) => (
    <AtletaCardItem
      key={a.id}
      a={a}
      mesociclos={mesociclos}
      coachId={coachId}
      onSelect={() => setPreviewAtleta(a)}
      onEdit={setEditAtleta}
      onDelete={deleteAtleta}
    />
  );

  const previewMesos = previewAtleta
    ? mesociclos
        .filter((m) => m.atleta_id === previewAtleta.id)
        .sort(
          (x, y) =>
            (parseAppDate(y.fecha_inicio)?.getTime() || 0) -
            (parseAppDate(x.fecha_inicio)?.getTime() || 0),
        )
    : [];

  const [confirmDeletePreviewMeso, setConfirmDeletePreviewMeso] =
    useState(null);

  const previewSetActivo = (m) => {
    const willBeActive = !m.activo;
    setMesociclos((prev) =>
      prev.map((x) =>
        x.atleta_id === previewAtleta.id
          ? { ...x, activo: willBeActive && x.id === m.id }
          : x,
      ),
    );
  };

  const previewDuplicarMeso = (meso) => {
    const newId = mkId();
    const dup = {
      ...JSON.parse(JSON.stringify(meso)),
      id: newId,
      activo: false,
      nombre: (meso.nombre || "Mesociclo") + " (copia)",
      fecha_inicio: new Date().toISOString().slice(0, 10),
      semanas: (meso.semanas || []).map((s) => ({
        ...s,
        id: mkId(),
        turnos: (s.turnos || []).map((t) => ({
          ...t,
          id: mkId(),
          ejercicios: (t.ejercicios || []).map((e) => ({ ...e, id: mkId() })),
        })),
      })),
    };
    setMesociclos((prev) => [...prev, dup]);
  };

  return (
    <div>
      <div className="flex-between mb20">
        <div>
          <div className="page-title">Alumnos</div>
          <div className="page-sub">
            {atletas.length} registrados · {atletasGrupo.length} atletas ·{" "}
            {asesorias.length} asesorías
          </div>
        </div>
      </div>

      {atletas.length === 0 ? (
        <div className="card text-center" style={{ padding: 48 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <LogoIL size={80} />
          </div>
          <div
            style={{
              fontSize: 18,
              fontFamily: "'Bebas Neue'",
              color: "var(--muted)",
            }}
          >
            No hay alumnos todavía
          </div>
          <div className="text-sm text-muted mt8 mb16">
            Creá tu primer atleta o asesoría
          </div>
          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              className="btn btn-gold"
              onClick={() => {
                setShowForm(true);
              }}
            >
              <Plus size={14} /> Atleta
            </button>
            <button
              className="btn"
              style={{ background: "var(--blue)", color: "#fff" }}
              onClick={() => {
                setShowForm(true);
              }}
            >
              <Plus size={14} /> Asesoría
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* ── Atletas ─────────────────────────────────────── */}
          <div>
            <AlumnoSectionHeader
              title="Atletas"
              count={atletasGrupo.length}
              color="var(--gold)"
              onAdd={() => {
                setTipoInicial("atleta");
                setShowForm(true);
              }}
            />
            {atletasGrupo.length === 0 ? (
              <div
                style={{
                  padding: "20px",
                  textAlign: "center",
                  color: "var(--muted)",
                  fontSize: 12,
                  background: "var(--surface2)",
                  borderRadius: 8,
                }}
              >
                No hay atletas.{" "}
                <button
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--gold)",
                    cursor: "pointer",
                    textDecoration: "underline",
                    fontSize: 12,
                  }}
                  onClick={() => {
                    setTipoInicial("atleta");
                    setShowForm(true);
                  }}
                >
                  Crear uno
                </button>
              </div>
            ) : (
              (() => {
                const visible = expandedAtletas
                  ? atletasGrupo
                  : atletasGrupo.slice(0, MAX_VISIBLE);
                const hasMore = atletasGrupo.length > MAX_VISIBLE;
                return (
                  <>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        maxHeight:
                          hasMore && !expandedAtletas
                            ? `${MAX_VISIBLE * 90}px`
                            : "none",
                        overflowY:
                          hasMore && !expandedAtletas ? "hidden" : "visible",
                        position: "relative",
                      }}
                    >
                      {visible.map((a) => renderCard(a))}
                      {!expandedAtletas && hasMore && (
                        <div
                          style={{
                            position: "absolute",
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: 60,
                            background:
                              "linear-gradient(transparent, var(--background))",
                            pointerEvents: "none",
                          }}
                        />
                      )}
                    </div>
                    {hasMore && (
                      <button
                        onClick={() => setExpandedAtletas((e) => !e)}
                        style={{
                          width: "100%",
                          marginTop: 8,
                          padding: "8px",
                          background: "var(--surface2)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          color: "var(--gold)",
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: 600,
                          fontFamily: "'DM Sans'",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                        }}
                      >
                        {expandedAtletas ? (
                          <>
                            <ChevronLeft
                              size={14}
                              style={{ transform: "rotate(90deg)" }}
                            />{" "}
                            Ver menos
                          </>
                        ) : (
                          <>
                            <ChevronLeft
                              size={14}
                              style={{ transform: "rotate(-90deg)" }}
                            />{" "}
                            Ver {atletasGrupo.length - MAX_VISIBLE} más
                          </>
                        )}
                      </button>
                    )}
                  </>
                );
              })()
            )}
          </div>

          {/* ── Asesorías ────────────────────────────────────── */}
          <div>
            <AlumnoSectionHeader
              title="Asesorías"
              count={asesorias.length}
              color="var(--blue)"
              onAdd={() => {
                setTipoInicial("asesoria");
                setShowForm(true);
              }}
            />
            {asesorias.length === 0 ? (
              <div
                style={{
                  padding: "20px",
                  textAlign: "center",
                  color: "var(--muted)",
                  fontSize: 12,
                  background: "var(--surface2)",
                  borderRadius: 8,
                }}
              >
                No hay asesorías.{" "}
                <button
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--blue)",
                    cursor: "pointer",
                    textDecoration: "underline",
                    fontSize: 12,
                  }}
                  onClick={() => {
                    setTipoInicial("asesoria");
                    setShowForm(true);
                  }}
                >
                  Crear una
                </button>
              </div>
            ) : (
              (() => {
                const visible = expandedAsesorias
                  ? asesorias
                  : asesorias.slice(0, MAX_VISIBLE);
                const hasMore = asesorias.length > MAX_VISIBLE;
                return (
                  <>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        maxHeight:
                          hasMore && !expandedAsesorias
                            ? `${MAX_VISIBLE * 90}px`
                            : "none",
                        overflowY:
                          hasMore && !expandedAsesorias ? "hidden" : "visible",
                        position: "relative",
                      }}
                    >
                      {visible.map((a) => renderCard(a))}
                      {!expandedAsesorias && hasMore && (
                        <div
                          style={{
                            position: "absolute",
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: 60,
                            background:
                              "linear-gradient(transparent, var(--background))",
                            pointerEvents: "none",
                          }}
                        />
                      )}
                    </div>
                    {hasMore && (
                      <button
                        onClick={() => setExpandedAsesorias((e) => !e)}
                        style={{
                          width: "100%",
                          marginTop: 8,
                          padding: "8px",
                          background: "var(--surface2)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          color: "var(--blue)",
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: 600,
                          fontFamily: "'DM Sans'",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                        }}
                      >
                        {expandedAsesorias ? (
                          <>
                            <ChevronLeft
                              size={14}
                              style={{ transform: "rotate(90deg)" }}
                            />{" "}
                            Ver menos
                          </>
                        ) : (
                          <>
                            <ChevronLeft
                              size={14}
                              style={{ transform: "rotate(-90deg)" }}
                            />{" "}
                            Ver {asesorias.length - MAX_VISIBLE} más
                          </>
                        )}
                      </button>
                    )}
                  </>
                );
              })()
            )}
          </div>
        </div>
      )}
      {(showForm || editAtleta) && (
        <AtletaForm
          atleta={editAtleta}
          tipoInicial={tipoInicial}
          registeredUsers={registeredUsers}
          onSave={saveAtleta}
          onClose={() => {
            setShowForm(false);
            setEditAtleta(null);
          }}
        />
      )}

      {confirmDeleteAtleta && (
        <Modal
          title="Eliminar atleta"
          onClose={() => setConfirmDeleteAtleta(null)}
        >
          <p style={{ fontSize: 13, color: "var(--text)", marginBottom: 8 }}>
            ¿Eliminar a <strong>{confirmDeleteAtleta.nombre}</strong>?
          </p>
          <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 20 }}>
            Se eliminarán también todos sus mesociclos. Esta acción no se puede
            deshacer.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              className="btn btn-ghost"
              onClick={() => setConfirmDeleteAtleta(null)}
            >
              Cancelar
            </button>
            <button
              className="btn"
              style={{ background: "var(--red)", color: "#fff" }}
              onClick={() => {
                setAtletas((prev) =>
                  prev.filter((a) => a.id !== confirmDeleteAtleta.id),
                );
                setConfirmDeleteAtleta(null);
              }}
            >
              <Trash2 size={14} /> Eliminar atleta
            </button>
          </div>
        </Modal>
      )}

      {previewAtleta && (
        <Modal
          title={`Historial · ${previewAtleta.nombre}`}
          onClose={() => setPreviewAtleta(null)}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: 10,
            }}
          >
            <button
              className="btn btn-gold btn-sm"
              onClick={() => {
                onSelect(previewAtleta, {
                  view: "historial",
                  openNewMeso: true,
                });
                setPreviewAtleta(null);
              }}
            >
              <Plus size={13} /> Nuevo mesociclo
            </button>
          </div>

          {previewMesos.length === 0 ? (
            <div
              style={{
                fontSize: 12,
                color: "var(--muted)",
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: 12,
              }}
            >
              Este atleta no tiene mesociclos todavía.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {previewMesos.map((m) => (
                <div
                  key={m.id}
                  className="historial-row"
                  style={{
                    marginBottom: 0,
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                    border: m.activo
                      ? "1px solid rgba(71,232,160,.4)"
                      : undefined,
                    background: m.activo ? "rgba(71,232,160,.04)" : undefined,
                  }}
                >
                  <div className="historial-fecha">
                    {formatDateDisplay(m.fecha_inicio)}
                  </div>
                  <div className="historial-info">
                    <div className="historial-name">
                      {m.nombre || "Mesociclo sin nombre"}
                    </div>
                    <div className="historial-marks">
                      {m.modo} · {m.volumen_total || 0} reps
                      {m.activo ? " · Activo" : ""}
                    </div>
                  </div>
                  <div
                    style={{ display: "flex", gap: 4, alignItems: "center" }}
                  >
                    <button
                      className="btn btn-xs"
                      title={m.activo ? "Desactivar" : "Activar"}
                      style={{
                        background: m.activo
                          ? "rgba(71,232,160,.15)"
                          : "transparent",
                        color: m.activo ? "var(--green)" : "var(--muted)",
                        border: `1px solid ${m.activo ? "rgba(71,232,160,.4)" : "var(--border)"}`,
                        borderRadius: 6,
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: 11,
                        padding: "3px 8px",
                      }}
                      onClick={() => previewSetActivo(m)}
                    >
                      {m.activo ? "● Activo" : "Activar"}
                    </button>
                    <button
                      className="btn btn-ghost btn-xs"
                      title="Duplicar"
                      style={{ padding: "3px 5px" }}
                      onClick={() => previewDuplicarMeso(m)}
                    >
                      <Copy size={12} />
                    </button>
                    <button
                      className="btn btn-ghost btn-xs"
                      title="Eliminar"
                      style={{ padding: "3px 5px", color: "var(--red)" }}
                      onClick={() => setConfirmDeletePreviewMeso(m)}
                    >
                      <Trash2 size={12} />
                    </button>
                    <button
                      className="btn btn-gold btn-sm"
                      style={{ fontSize: 11, padding: "3px 10px" }}
                      onClick={() => {
                        onSelect(previewAtleta, { view: "meso", mesoId: m.id });
                        setPreviewAtleta(null);
                      }}
                    >
                      Abrir planilla
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="modal-footer">
            <button
              className="btn btn-ghost"
              onClick={() => setPreviewAtleta(null)}
            >
              Cerrar
            </button>
          </div>
        </Modal>
      )}

      {confirmDeletePreviewMeso && (
        <Modal
          title="Eliminar mesociclo"
          onClose={() => setConfirmDeletePreviewMeso(null)}
        >
          <p style={{ fontSize: 13, marginBottom: 8 }}>
            ¿Eliminar{" "}
            <strong>
              {confirmDeletePreviewMeso.nombre || "este mesociclo"}
            </strong>
            ?
          </p>
          <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 20 }}>
            Se perderán todos los datos del ciclo. Esta acción no se puede
            deshacer.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              className="btn btn-ghost"
              onClick={() => setConfirmDeletePreviewMeso(null)}
            >
              Cancelar
            </button>
            <button
              className="btn"
              style={{ background: "var(--red)", color: "#fff" }}
              onClick={() => {
                setMesociclos((prev) =>
                  prev.filter((m) => m.id !== confirmDeletePreviewMeso.id),
                );
                setConfirmDeletePreviewMeso(null);
              }}
            >
              <Trash2 size={14} /> Eliminar
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Modal editar datos básicos del mesociclo ───────────────────────────────
// ── Modal editar volumen total y distribución semanal ─────────────────────
function PageAtleta({
  atleta,
  mesociclos,
  setMesociclos,
  onBack,
  addPlantilla,
  onLiveMesoData,
  onAtletaOverridesChange,
  openRequest,
}) {
  const latestMesoRef = useRef(null); // always-current meso for cleanup save
  const planillaNavRef = useRef({}); // { [mesoId]: { semActiva, turnoActivo } }
  const [showMeso, setShowMeso] = useState(false);
  const [showEditMeso, setShowEditMeso] = useState(false);
  const [showGuardarPlantilla, setShowGuardarPlantilla] = useState(null); // null | "meso" | "semana"
  const [showEditVol, setShowEditVol] = useState(false);
  const [mesoSelId, setMesoSelId] = useState(null);
  const [vistaActual, setVistaActual] = useState("meso");
  const [showFullSembrado, setShowFullSembrado] = useState(false);
  const [filtroGrupos, setFiltroGrupos] = useState([]);
  const [filtroIntensidades, setFiltroIntensidades] = useState([]);
  const [filtroTablas, setFiltroTablas] = useState([]);
  const [fullTableZoom, setFullTableZoom] = useState(1);
  const fullTableViewportRef = useRef(null);
  const fullTableRef = useRef(null);

  useEffect(() => {
    if (!openRequest?.view) return;
    setVistaActual(openRequest.view);
    if (openRequest?.mesoId) setMesoSelId(openRequest.mesoId);
    if (openRequest?.openNewMeso) setShowMeso(true);
  }, [openRequest?.tick, openRequest?.view]);

  const [atletaNormOverrides, setAtletaNormOverrides] = useState(() => {
    try {
      return (
        JSON.parse(
          localStorage.getItem(`liftplan_normativos_atleta_${atleta.id}`) ||
            "null",
        ) || {}
      );
    } catch {
      return {};
    }
  });

  const globalNormativos = (() => {
    try {
      return (
        JSON.parse(localStorage.getItem("liftplan_normativos") || "null") ||
        EJERCICIOS
      );
    } catch {
      return EJERCICIOS;
    }
  })();

  const atletaNormativos = globalNormativos.map((ej) => {
    const ovr = atletaNormOverrides[ej.id];
    if (!ovr) return ej;
    return {
      ...ej,
      ...(ovr.pct_base !== undefined ? { pct_base: ovr.pct_base } : {}),
      ...(ovr.base !== undefined ? { base: ovr.base } : {}),
    };
  });

  const getEjAtleta = (id) => getEjercicioById(id, atletaNormativos);

  const saveAtletaOverrides = (updates) => {
    setAtletaNormOverrides((prev) => {
      const next = typeof updates === "function" ? updates(prev) : updates;
      try {
        localStorage.setItem(
          `liftplan_normativos_atleta_${atleta.id}`,
          JSON.stringify(next),
        );
        window.dispatchEvent(
          new CustomEvent("liftplan:normativos-overrides-updated", {
            detail: { atletaId: atleta.id },
          }),
        );
      } catch {}
      onAtletaOverridesChange?.(atleta.id, next);
      return next;
    });
  };

  useEffect(() => {
    try {
      setAtletaNormOverrides(
        JSON.parse(
          localStorage.getItem(`liftplan_normativos_atleta_${atleta.id}`) ||
            "null",
        ) || {},
      );
    } catch {
      setAtletaNormOverrides({});
    }
  }, [atleta.id]);

  useEffect(() => {
    const onOverridesUpdated = (event) => {
      if (event?.detail?.atletaId !== atleta.id) return;
      try {
        setAtletaNormOverrides(
          JSON.parse(
            localStorage.getItem(`liftplan_normativos_atleta_${atleta.id}`) ||
              "null",
          ) || {},
        );
      } catch {
        setAtletaNormOverrides({});
      }
    };

    window.addEventListener(
      "liftplan:normativos-overrides-updated",
      onOverridesUpdated,
    );
    return () => {
      window.removeEventListener(
        "liftplan:normativos-overrides-updated",
        onOverridesUpdated,
      );
    };
  }, [atleta.id]);

  // ── Re-render cuando cambian normativos globales (ej: edición en PageNormativos) ──
  const [globalNormRev, setGlobalNormRev] = useState(0);
  useEffect(() => {
    const onSync = (e) => {
      if (e?.detail?.key === "liftplan_normativos") {
        setGlobalNormRev((v) => v + 1);
      }
    };
    window.addEventListener(LIFTPLAN_LOCAL_SYNC_EVENT, onSync);
    return () => window.removeEventListener(LIFTPLAN_LOCAL_SYNC_EVENT, onSync);
  }, []);
  void globalNormRev;

  // ── Overrides de porcentajes — persisten en localStorage por mesociclo ───────
  // Compute initial meso ID so we can initialize pct states from localStorage
  // (avoids one-frame flash of empty overrides on first render)
  const _initMesoId = (() => {
    const filtered = mesociclos
      .filter((m) => m.atleta_id === atleta.id)
      .sort(
        (a, b) =>
          (parseAppDate(b.fecha_inicio)?.getTime() || 0) -
          (parseAppDate(a.fecha_inicio)?.getTime() || 0),
      );
    return (filtered.find((m) => m.activo) || filtered[0])?.id || null;
  })();
  const _loadPctInit = (type, dflt) => {
    if (!_initMesoId) return dflt;
    try {
      const mesoKey = `liftplan_pct_${_initMesoId}_${type}`;
      const mesoVal = JSON.parse(localStorage.getItem(mesoKey) || "null");
      if (mesoVal != null) return mesoVal;
      const legacyKey = `liftplan_pct_${atleta.id}_${type}`;
      const legacyVal = JSON.parse(localStorage.getItem(legacyKey) || "null");
      return legacyVal ?? dflt;
    } catch {
      return dflt;
    }
  };
  const [semPctOverrides, setSemPctOverridesRaw] = useState(() =>
    _loadPctInit("semOvr", {}),
  );
  const [semPctManual, setSemPctManualRaw] = useState(
    () => new Set(_loadPctInit("semMan", [])),
  );
  const [turnoPctOverrides, setTurnoPctOverridesRaw] = useState(() =>
    _loadPctInit("turnoOvr", {}),
  );
  const [turnoPctManual, setTurnoPctManualRaw] = useState(
    () => new Set(_loadPctInit("turnoMan", [])),
  );
  const [confirmReset, setConfirmReset] = useState(null);

  const resetAllPcts = () => {
    setSemPctOverrides({});
    setSemPctManual(new Set());
    setTurnoPctOverrides({});
    setTurnoPctManual(new Set());
  };

  const mesoAtleta = mesociclos
    .filter((m) => m.atleta_id === atleta.id)
    .sort(
      (a, b) =>
        (parseAppDate(b.fecha_inicio)?.getTime() || 0) -
        (parseAppDate(a.fecha_inicio)?.getTime() || 0),
    );

  const mesoActivoReal = mesoAtleta.find((m) => m.activo);

  const mesoVisto =
    mesoAtleta.find((m) => m.id === mesoSelId) ||
    mesoActivoReal ||
    mesoAtleta[0] ||
    null;

  const semanasConDatosBase = (mesoVisto?.semanas || [])
    .map((sem, semIdxOriginal) => ({ sem, semIdxOriginal }))
    .filter(({ sem }) =>
      (sem.turnos || []).some((turno) =>
        (turno?.ejercicios || []).some((ej) => !!ej?.ejercicio_id),
      ),
    );

  const turnosConDatosBase = (() => {
    const idxs = new Set();
    semanasConDatosBase.forEach(({ sem }) => {
      (sem.turnos || []).forEach((turno, tIdx) => {
        if ((turno?.ejercicios || []).some((ej) => !!ej?.ejercicio_id)) {
          idxs.add(tIdx);
        }
      });
    });
    return [...idxs].sort((a, b) => a - b);
  })();

  const gruposUsados = (() => {
    const used = new Set();
    semanasConDatosBase.forEach(({ sem }) => {
      turnosConDatosBase.forEach((tIdx) => {
        (sem.turnos?.[tIdx]?.ejercicios || []).forEach((ej) => {
          if (!ej?.ejercicio_id) return;
          const categoria = getEjAtleta(ej.ejercicio_id)?.categoria;
          if (categoria) used.add(categoria);
        });
      });
    });
    return CATEGORIAS.filter((g) => used.has(g));
  })();

  const intensidadesUsadas = (() => {
    const used = new Set();
    semanasConDatosBase.forEach(({ sem }) => {
      turnosConDatosBase.forEach((tIdx) => {
        (sem.turnos?.[tIdx]?.ejercicios || []).forEach((ej) => {
          if (!ej?.ejercicio_id) return;
          const val = Number(ej.intensidad);
          if (Number.isFinite(val) && val > 0) used.add(val);
        });
      });
    });
    return [...used].sort((a, b) => a - b);
  })();

  const tablasUsadas = (() => {
    const used = new Set();
    semanasConDatosBase.forEach(({ sem }) => {
      turnosConDatosBase.forEach((tIdx) => {
        (sem.turnos?.[tIdx]?.ejercicios || []).forEach((ej) => {
          if (!ej?.ejercicio_id) return;
          const val = Number(ej.tabla);
          if (Number.isFinite(val) && val > 0) used.add(val);
        });
      });
    });
    return [...used].sort((a, b) => a - b);
  })();

  const gruposUsadosKey = gruposUsados.join("|");
  const intensidadesUsadasKey = intensidadesUsadas.join("|");
  const tablasUsadasKey = tablasUsadas.join("|");

  useEffect(() => {
    if (!showFullSembrado) return;
    setFiltroGrupos([]);
    setFiltroIntensidades([]);
    setFiltroTablas([]);
  }, [showFullSembrado]);

  useEffect(() => {
    if (!showFullSembrado) return;

    setFiltroGrupos((prev) =>
      prev.filter((item) => gruposUsados.includes(item)),
    );
    setFiltroIntensidades((prev) =>
      prev.filter((item) => intensidadesUsadas.includes(item)),
    );
    setFiltroTablas((prev) =>
      prev.filter((item) => tablasUsadas.includes(item)),
    );
  }, [
    showFullSembrado,
    gruposUsadosKey,
    intensidadesUsadasKey,
    tablasUsadasKey,
  ]);

  const pasaFiltrosSembrado = (ej) => {
    if (!ej?.ejercicio_id) return false;
    const categoria = getEjAtleta(ej.ejercicio_id)?.categoria;
    const intensidad = Number(ej.intensidad);
    const tabla = Number(ej.tabla);

    if (filtroGrupos.length > 0 && !filtroGrupos.includes(categoria))
      return false;
    if (
      filtroIntensidades.length > 0 &&
      (!Number.isFinite(intensidad) || !filtroIntensidades.includes(intensidad))
    )
      return false;
    if (
      filtroTablas.length > 0 &&
      (!Number.isFinite(tabla) || !filtroTablas.includes(tabla))
    )
      return false;
    return true;
  };

  const semanasConDatos = semanasConDatosBase
    .map(({ sem, semIdxOriginal }) => ({
      sem: {
        ...sem,
        turnos: (sem.turnos || []).map((turno) => ({
          ...turno,
          ejercicios: (turno?.ejercicios || []).filter((ej) =>
            pasaFiltrosSembrado(ej),
          ),
        })),
      },
      semIdxOriginal,
    }))
    .filter(({ sem }) =>
      (sem.turnos || []).some((turno) => (turno?.ejercicios || []).length > 0),
    );

  const turnosConDatos = (() => {
    const idxs = new Set();
    semanasConDatos.forEach(({ sem }) => {
      (sem.turnos || []).forEach((turno, tIdx) => {
        if ((turno?.ejercicios || []).length > 0) idxs.add(tIdx);
      });
    });
    return [...idxs].sort((a, b) => a - b);
  })();

  const semanaColsMap = (() => {
    const map = new Map();
    semanasConDatos.forEach(({ sem }) => {
      const maxCols = Math.max(
        1,
        ...turnosConDatos.map(
          (tIdx) => (sem.turnos?.[tIdx]?.ejercicios || []).length || 0,
        ),
      );
      map.set(sem.id, maxCols);
    });
    return map;
  })();

  const _pctKey = (type) =>
    mesoVisto ? `liftplan_pct_${mesoVisto.id}_${type}` : null;

  useEffect(() => {
    if (!mesoVisto) return;
    const load = (type, dflt) => {
      try {
        const mesoKey = `liftplan_pct_${mesoVisto.id}_${type}`;
        const mesoVal = JSON.parse(localStorage.getItem(mesoKey) || "null");
        if (mesoVal != null) return mesoVal;

        const legacyKey = `liftplan_pct_${atleta.id}_${type}`;
        const legacyVal = JSON.parse(localStorage.getItem(legacyKey) || "null");
        if (legacyVal != null) {
          localStorage.setItem(mesoKey, JSON.stringify(legacyVal));
          return legacyVal;
        }
      } catch {}
      return dflt;
    };

    setSemPctOverridesRaw(load("semOvr", {}));
    setSemPctManualRaw(new Set(load("semMan", [])));
    setTurnoPctOverridesRaw(load("turnoOvr", {}));
    setTurnoPctManualRaw(new Set(load("turnoMan", [])));
  }, [mesoVisto?.id, atleta.id]);

  // Wrappers que persisten automáticamente
  const setSemPctOverrides = (val) =>
    setSemPctOverridesRaw((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      try {
        const key = _pctKey("semOvr");
        if (key) localStorage.setItem(key, JSON.stringify(next));
      } catch {}
      return next;
    });
  const setSemPctManual = (val) =>
    setSemPctManualRaw((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      try {
        const key = _pctKey("semMan");
        if (key) localStorage.setItem(key, JSON.stringify([...next]));
      } catch {}
      return next;
    });
  const setTurnoPctOverrides = (val) =>
    setTurnoPctOverridesRaw((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      try {
        const key = _pctKey("turnoOvr");
        if (key) localStorage.setItem(key, JSON.stringify(next));
      } catch {}
      return next;
    });
  const setTurnoPctManual = (val) =>
    setTurnoPctManualRaw((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      try {
        const key = _pctKey("turnoMan");
        if (key) localStorage.setItem(key, JSON.stringify([...next]));
      } catch {}
      return next;
    });

  const saveMeso = (m) => {
    setMesociclos((prev) => [...prev, { ...m, activo: false }]);
    setMesoSelId(m.id);
    setShowMeso(false);
    setVistaActual("meso");
  };

  const duplicarMeso = (meso) => {
    const newId = mkId();
    const dup = {
      ...JSON.parse(JSON.stringify(meso)),
      id: newId,
      activo: false,
      nombre: (meso.nombre || "Mesociclo") + " (copia)",
      fecha_inicio: new Date().toISOString().slice(0, 10),
      semanas: (meso.semanas || []).map((s) => ({
        ...s,
        id: mkId(),
        turnos: (s.turnos || []).map((t) => ({
          ...t,
          id: mkId(),
          ejercicios: (t.ejercicios || []).map((e) => ({ ...e, id: mkId() })),
        })),
      })),
    };
    setMesociclos((prev) => [...prev, dup]);
  };

  // Editar solo nombre, fecha, modo, IRM del meso actual
  const saveEditMeso = (changes) => {
    setMesociclos((prev) =>
      prev.map((m) => (m.id === mesoVisto.id ? { ...m, ...changes } : m)),
    );
    setShowEditMeso(false);
  };

  // Editar volumen total y % semanales
  const saveEditVol = (volTotal, semanas) => {
    setMesociclos((prev) =>
      prev.map((m) =>
        m.id === mesoVisto.id
          ? {
              ...m,
              volumen_total: volTotal,
              semanas: semanas.map((s) => ({
                ...s,
                reps_calculadas: Math.round((volTotal * s.pct_volumen) / 100),
                reps_ajustadas: Math.round((volTotal * s.pct_volumen) / 100),
              })),
            }
          : m,
      ),
    );
    setShowEditVol(false);
  };

  const setActivo = (m) => {
    const willBeActive = !m.activo;
    setMesociclos((prev) =>
      prev.map((x) =>
        x.atleta_id === atleta.id
          ? { ...x, activo: willBeActive && x.id === m.id }
          : x,
      ),
    );
  };

  const [confirmDeleteMeso, setConfirmDeleteMeso] = useState(null);
  const deleteMeso = (id) => {
    const meso = mesoAtleta.find((m) => m.id === id);
    setConfirmDeleteMeso(meso);
  };

  const updateSemana = (sIdx, newSem) => {
    if (!mesoVisto) return;
    const sems = [...mesoVisto.semanas];
    sems[sIdx] = newSem;
    const updated = { ...mesoVisto, semanas: sems };
    setMesociclos((prev) =>
      prev.map((m) => (m.id === updated.id ? updated : m)),
    );
  };

  const irm_arr = mesoVisto ? Number(mesoVisto.irm_arranque) : 0;
  const irm_env = mesoVisto ? Number(mesoVisto.irm_envion) : 0;
  const planillaScrollPrefix = mesoVisto
    ? `planilla-${atleta.id}-${mesoVisto.id}`
    : `planilla-${atleta.id}`;

  const scrollToPlanillaSection = (section) => {
    const el = document.getElementById(`${planillaScrollPrefix}-${section}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Guardar en cleanup al desmontar (cambio de pestaña)
  useEffect(() => {
    return () => {
      const m = latestMesoRef.current;
      if (!m) return;
      try {
        setMesociclos((prev) => prev.map((x) => (x.id === m.id ? m : x)));
        localStorage.setItem(
          "liftplan_mesociclos",
          JSON.stringify(
            (() => {
              try {
                return JSON.parse(
                  localStorage.getItem("liftplan_mesociclos") || "[]",
                ).map((x) => (x.id === m.id ? m : x));
              } catch {
                return [m];
              }
            })(),
          ),
        );
      } catch {}
    };
  }, []);

  // ── Estados elevados de PlanillaTurno (para historial completo) ──────────────
  const _ptk = (type) =>
    mesoVisto ? `liftplan_pt_${mesoVisto.id}_${type}` : null;
  const _loadPt = (type, dflt) => {
    try {
      const k = _ptk(type);
      return k ? (JSON.parse(localStorage.getItem(k) || "null") ?? dflt) : dflt;
    } catch {
      return dflt;
    }
  };

  const [repsEdit, setRepsEditRaw] = useState(() => _loadPt("repsEdit", {}));
  const [manualEdit, setManualEditRaw] = useState(
    () => new Set(_loadPt("manualEdit", [])),
  );
  const [cellEdit, setCellEditRaw] = useState(() => _loadPt("cellEdit", {}));
  const [cellManual, setCellManualRaw] = useState(
    () => new Set(_loadPt("cellManual", [])),
  );
  const [nameEdit, setNameEditRaw] = useState(() => _loadPt("nameEdit", {}));
  const [noteEdit, setNoteEditRaw] = useState(() => _loadPt("noteEdit", {}));

  // Reload when meso changes
  const prevPtMesoId = useRef(null);
  useEffect(() => {
    if (!mesoVisto || mesoVisto.id === prevPtMesoId.current) return;
    prevPtMesoId.current = mesoVisto.id;
    const id = mesoVisto.id;
    const get = (t, d) => {
      try {
        return (
          JSON.parse(
            localStorage.getItem(`liftplan_pt_${id}_${t}`) || "null",
          ) ?? d
        );
      } catch {
        return d;
      }
    };
    setRepsEditRaw(get("repsEdit", {}));
    setManualEditRaw(new Set(get("manualEdit", [])));
    setCellEditRaw(get("cellEdit", {}));
    setCellManualRaw(new Set(get("cellManual", [])));
    setNameEditRaw(get("nameEdit", {}));
    setNoteEditRaw(get("noteEdit", {}));
  }, [mesoVisto?.id]);

  // Emit live data — always keep a ref current, debounce the actual emit
  const liveDataRef = useRef(null);
  liveDataRef.current = {
    atletaId: atleta.id,
    meso: mesoVisto,
    repsEdit,
    manualEdit,
    cellEdit,
    cellManual,
    semPctOverrides,
    semPctManual,
    turnoPctOverrides,
    turnoPctManual,
  };
  useEffect(() => {
    if (!onLiveMesoData) return;
    const t = setTimeout(() => {
      if (liveDataRef.current?.meso) onLiveMesoData(liveDataRef.current);
    }, 100);
    return () => clearTimeout(t);
  });

  // ── Historial de modificaciones ─────────────────────────────────────────────
  // Stack de snapshots en ref (no causa re-renders), persistido en localStorage
  const histStackRef = useRef(null);
  const histIdxRef = useRef(0);
  const prevMesoIdRef = useRef(null);

  const histStorageKey = mesoVisto
    ? `liftplan_hist_meso_${mesoVisto.id}`
    : null;

  // Carga el stack del meso activo cuando cambia
  useEffect(() => {
    if (!mesoVisto || mesoVisto.id === prevMesoIdRef.current) return;
    prevMesoIdRef.current = mesoVisto.id;
    try {
      const saved = JSON.parse(
        localStorage.getItem(`liftplan_hist_meso_${mesoVisto.id}`) || "null",
      );
      if (saved && Array.isArray(saved.stack)) {
        histStackRef.current = saved.stack;
        histIdxRef.current = saved.idx;
      } else {
        histStackRef.current = [];
        histIdxRef.current = -1;
      }
    } catch {
      histStackRef.current = [];
      histIdxRef.current = -1;
    }
  }, [mesoVisto?.id]);

  const [histState, setHistState] = useState({
    canUndo: false,
    canRedo: false,
  });

  const persistHistStack = () => {
    if (!histStorageKey) return;
    safeSetItem(
      histStorageKey,
      JSON.stringify({
        stack: histStackRef.current,
        idx: histIdxRef.current,
      }),
    );
  };

  // Captura snapshot desde React state (no localStorage — siempre consistente)
  const captureSnapshot = () => {
    if (!mesoVisto) return null;
    return {
      semanas: JSON.parse(JSON.stringify(mesoVisto.semanas)),
      volumen_total: mesoVisto.volumen_total,
      irm_arranque: mesoVisto.irm_arranque,
      irm_envion: mesoVisto.irm_envion,
      semPctOverrides: JSON.parse(JSON.stringify(semPctOverrides)),
      turnoPctOverrides: JSON.parse(JSON.stringify(turnoPctOverrides)),
      semPctManual: [...semPctManual],
      turnoPctManual: [...turnoPctManual],
      repsEdit: { ...repsEdit },
      manualEdit: [...manualEdit],
      cellEdit: { ...cellEdit },
      cellManual: [...cellManual],
      nameEdit: { ...nameEdit },
      noteEdit: { ...noteEdit },
    };
  };

  // Llamar ANTES de cualquier cambio — guarda el estado actual en el stack
  const _lastPushSnapTime = useRef(0);
  const pushSnap = (forced = false) => {
    if (!mesoVisto) return;
    const now = Date.now();
    if (!forced && now - _lastPushSnapTime.current < 300) return;
    _lastPushSnapTime.current = now;
    if (!histStackRef.current) {
      histStackRef.current = [];
      histIdxRef.current = -1;
    }
    const snap = captureSnapshot();
    const base = histStackRef.current.slice(0, histIdxRef.current + 1);
    const next = [...base, snap].slice(-15);
    histStackRef.current = next;
    histIdxRef.current = next.length - 1;
    persistHistStack();
    setHistState({ canUndo: histIdxRef.current > 0, canRedo: false });
  };

  const applySnapshot = (snap) => {
    if (!snap || !mesoVisto) return;
    const id = mesoVisto.id;
    const ls = (k, v) => {
      safeSetItem(k, JSON.stringify(v));
    };
    // 1. Mesociclo
    setMesociclos((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              semanas: snap.semanas,
              volumen_total: snap.volumen_total,
              irm_arranque: snap.irm_arranque,
              irm_envion: snap.irm_envion,
            }
          : m,
      ),
    );
    // 2. Pct overrides
    setSemPctOverridesRaw(snap.semPctOverrides || {});
    setTurnoPctOverridesRaw(snap.turnoPctOverrides || {});
    setSemPctManualRaw(new Set(snap.semPctManual || []));
    setTurnoPctManualRaw(new Set(snap.turnoPctManual || []));
    // 3. PlanillaTurno state — React state + localStorage
    const re = snap.repsEdit || {};
    const me = snap.manualEdit || [];
    const ce = snap.cellEdit || {};
    const cm = snap.cellManual || [];
    const ne = snap.nameEdit || {};
    const no = snap.noteEdit || {};
    setRepsEditRaw(re);
    ls(`liftplan_pt_${id}_repsEdit`, re);
    setManualEditRaw(new Set(me));
    ls(`liftplan_pt_${id}_manualEdit`, me);
    setCellEditRaw(ce);
    ls(`liftplan_pt_${id}_cellEdit`, ce);
    setCellManualRaw(new Set(cm));
    ls(`liftplan_pt_${id}_cellManual`, cm);
    setNameEditRaw(ne);
    ls(`liftplan_pt_${id}_nameEdit`, ne);
    setNoteEditRaw(no);
    ls(`liftplan_pt_${id}_noteEdit`, no);
  };

  const canUndoHist = histState.canUndo;
  const canRedoHist = histState.canRedo;

  const undoHist = () => {
    if (!histStackRef.current || histIdxRef.current <= 0) return;
    // Antes de deshacer, guarda el estado actual como siguiente en el stack si no existe
    // (por si el usuario modifica sin haber pusheado el estado actual)
    histIdxRef.current -= 1;
    persistHistStack();
    setHistState({
      canUndo: histIdxRef.current > 0,
      canRedo: histIdxRef.current < histStackRef.current.length - 1,
    });
    applySnapshot(histStackRef.current[histIdxRef.current]);
  };

  const redoHist = () => {
    if (
      !histStackRef.current ||
      histIdxRef.current >= histStackRef.current.length - 1
    )
      return;
    histIdxRef.current += 1;
    persistHistStack();
    setHistState({
      canUndo: histIdxRef.current > 0,
      canRedo: histIdxRef.current < histStackRef.current.length - 1,
    });
    applySnapshot(histStackRef.current[histIdxRef.current]);
  };

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undoHist();
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || (e.key === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        redoHist();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mesoVisto?.id, histState]);

  // updateMeso: push BEFORE applying
  const updateMeso = (updatedMeso) => {
    latestMesoRef.current = updatedMeso;
    pushSnap();
    setMesociclos((prev) =>
      prev.map((m) => (m.id === updatedMeso.id ? updatedMeso : m)),
    );
  };
  const updateSemanaH = (sIdx, newSem) => {
    if (!mesoVisto) return;
    const sems = [...mesoVisto.semanas];
    sems[sIdx] = newSem;
    updateMeso({ ...mesoVisto, semanas: sems });
  };
  const setSemPctOverridesH = (val) => {
    setSemPctOverrides(val);
  };
  const setSemPctManualH = (val) => {
    setSemPctManual(val);
  };
  const setTurnoPctOverridesH = (val) => {
    setTurnoPctOverrides(val);
  };
  const setTurnoPctManualH = (val) => {
    setTurnoPctManual(val);
  };

  const handleSwapSemanasOverrides = (aIdx, bIdx) => {
    setSemPctOverrides((prev) =>
      remapOverrideObjectKeys(prev, (k) =>
        remapSemPctKeyForSwap(k, aIdx, bIdx),
      ),
    );
    setSemPctManual((prev) =>
      remapOverrideSetKeys(prev, (k) => remapSemPctKeyForSwap(k, aIdx, bIdx)),
    );
    setTurnoPctOverrides((prev) =>
      remapOverrideObjectKeys(prev, (k) =>
        remapTurnoPctKeyForSwap(k, aIdx, bIdx),
      ),
    );
    setTurnoPctManual((prev) =>
      remapOverrideSetKeys(prev, (k) => remapTurnoPctKeyForSwap(k, aIdx, bIdx)),
    );
  };

  return (
    <div>
      {/* ══════════════════════════════════════════
          BANDA SUPERIOR — Atleta + navegación
      ══════════════════════════════════════════ */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "14px 14px 0 0",
          marginBottom: 0,
          marginTop: -28,
        }}
      >
        {/* Fila 1 — identidad + IRM + botones */}
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          {/* Línea superior: back + avatar + nombre + nuevo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={onBack}
              style={{ padding: "5px 10px", fontSize: 12, flexShrink: 0 }}
            >
              <ChevronLeft size={14} /> Atletas
            </button>

            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "var(--surface3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "'Bebas Neue'",
                fontSize: 18,
                color: "var(--gold)",
                flexShrink: 0,
              }}
            >
              {atleta.nombre.charAt(0)}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "'Bebas Neue'",
                  fontSize: 18,
                  color: "var(--text)",
                  lineHeight: 1.1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {atleta.nombre}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--muted)",
                  marginTop: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {atleta.email}
                {atleta.telefono && ` · ${atleta.telefono}`}
              </div>
            </div>

            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setVistaActual("historial")}
              style={{
                flexShrink: 0,
                fontSize: 11,
                padding: "5px 10px",
                whiteSpace: "nowrap",
                borderColor:
                  vistaActual === "historial" ? "var(--gold)" : undefined,
                color: vistaActual === "historial" ? "var(--gold)" : undefined,
              }}
            >
              Historial{mesoAtleta.length > 0 ? ` (${mesoAtleta.length})` : ""}
            </button>

            <button
              className="btn btn-gold btn-sm"
              onClick={() => setShowMeso(true)}
              style={{
                flexShrink: 0,
                fontSize: 11,
                padding: "5px 10px",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <Plus size={13} /> Nuevo
            </button>
          </div>

          {/* Línea inferior: IRM + modo + editar */}
          {mesoVisto && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginTop: 10,
                flexWrap: "wrap",
              }}
            >
              {mesoVisto.nombre && (
                <div
                  style={{
                    fontFamily: "'Bebas Neue'",
                    fontSize: 13,
                    color: "var(--muted)",
                    letterSpacing: ".05em",
                    paddingRight: 10,
                    borderRight: "1px solid var(--border)",
                  }}
                >
                  {mesoVisto.nombre}
                </div>
              )}
              {mesoVisto.irm_arranque && (
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontFamily: "'Bebas Neue'",
                      fontSize: 18,
                      color: "var(--gold)",
                      lineHeight: 1,
                    }}
                  >
                    {mesoVisto.irm_arranque}
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: ".07em",
                    }}
                  >
                    Arr kg
                  </div>
                </div>
              )}
              {mesoVisto.irm_envion && (
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontFamily: "'Bebas Neue'",
                      fontSize: 18,
                      color: "var(--blue)",
                      lineHeight: 1,
                    }}
                  >
                    {mesoVisto.irm_envion}
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: ".07em",
                    }}
                  >
                    Env kg
                  </div>
                </div>
              )}
              <span
                className={`badge ${mesoVisto.modo === "Competitivo" ? "badge-gold" : "badge-blue"}`}
                style={{ fontSize: 10 }}
              >
                {mesoVisto.modo}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowEditMeso(true)}
                style={{ padding: "4px 8px", fontSize: 11, marginLeft: "auto" }}
              >
                <Pencil size={12} /> Editar
              </button>
              <button
                className="btn btn-xs"
                title={
                  mesoVisto.activo
                    ? "Desactivar — el atleta dejará de verlo"
                    : "Activar — el atleta podrá verlo"
                }
                style={{
                  background: mesoVisto.activo
                    ? "rgba(71,232,160,.15)"
                    : "rgba(71,232,160,.06)",
                  color: mesoVisto.activo ? "var(--green)" : "var(--muted)",
                  border: `1px solid ${mesoVisto.activo ? "rgba(71,232,160,.4)" : "var(--border)"}`,
                  borderRadius: 6,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 11,
                  padding: "3px 10px",
                }}
                onClick={() => setActivo(mesoVisto)}
              >
                {mesoVisto.activo ? "● Activo" : "Activar"}
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Fila 2 — tabs (fila propia, nunca se solapa) */}
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          position: "sticky",
          top:
            typeof window !== "undefined" && window.innerWidth <= 480
              ? -8
              : -28,
          zIndex: 90,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderTop: "none",
          borderRadius: "0 0 14px 14px",
          marginBottom: 20,
          boxShadow: "0 6px 16px rgba(0,0,0,.5)",
          flexDirection: "column",
        }}
      >
        {/* Fila de tabs + undo/redo — una sola línea sin wrap */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            minHeight: 44,
            padding: "0 20px",
            gap: 0,
            flexWrap: "nowrap",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", height: 44, flexShrink: 0 }}>
            {[
              { id: "meso", label: "Planilla" },
              ...(mesoVisto?.pretemporada === true ||
              mesoVisto?.pretemporada === "true"
                ? []
                : [{ id: "resumen", label: "Resumen" }]),
              { id: "pdf", label: "PDF" },
              { id: "normativos", label: "Normativos A" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  console.log("[CLICK TAB]", t.id);
                  setVistaActual(t.id);
                }}
                style={{
                  height: 44,
                  padding: "0 16px",
                  border: "none",
                  background: "none",
                  color: vistaActual === t.id ? "var(--gold)" : "var(--muted)",
                  fontFamily: "'DM Sans'",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  borderBottom:
                    vistaActual === t.id
                      ? "2px solid var(--gold)"
                      : "2px solid transparent",
                  transition: "all .2s",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          {vistaActual === "meso" &&
            mesoVisto &&
            !(mesoVisto.escuela === true || mesoVisto.escuela === "true") &&
            !(
              mesoVisto.pretemporada === true ||
              mesoVisto.pretemporada === "true"
            ) && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  marginLeft: 10,
                  minWidth: 0,
                  overflowX: "auto",
                  padding: "0 8px",
                  scrollbarWidth: "none",
                }}
              >
                {[
                  { id: "sembrado", label: "Sembrado" },
                  { id: "semanas", label: "Semanas" },
                  { id: "dias", label: "Dias" },
                  { id: "complementarios", label: "Complementarios" },
                ].map((nav) => (
                  <button
                    key={nav.id}
                    onClick={() => scrollToPlanillaSection(nav.id)}
                    style={{
                      padding: "4px 11px",
                      borderRadius: 10,
                      border: "1px solid var(--border)",
                      background: "var(--surface2)",
                      color: "var(--muted)",
                      fontFamily: "'DM Sans'",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {nav.label}
                  </button>
                ))}
                <div
                  style={{
                    width: "1px",
                    height: 24,
                    background: "var(--border)",
                    margin: "0 4px",
                  }}
                />
                <button
                  onClick={() => setShowFullSembrado(true)}
                  style={{
                    padding: "4px 11px",
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    background: "var(--surface2)",
                    color: "var(--muted)",
                    fontFamily: "'DM Sans'",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all .2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--gold)";
                    e.currentTarget.style.color = "var(--gold)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.color = "var(--muted)";
                  }}
                >
                  Ver todo
                </button>
              </div>
            )}
          <div style={{ flex: 1 }} />
          {mesoVisto && (
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={undoHist}
                disabled={!canUndoHist}
                title="Deshacer (Ctrl+Z)"
                style={{
                  opacity: canUndoHist ? 1 : 0.35,
                  padding: "0 10px",
                  height: 44,
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Undo2 size={14} /> Deshacer
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={redoHist}
                disabled={!canRedoHist}
                title="Rehacer (Ctrl+Y)"
                style={{
                  opacity: canRedoHist ? 1 : 0.35,
                  padding: "0 10px",
                  height: 44,
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                Rehacer <Redo2 size={14} />
              </button>
            </div>
          )}
        </div>
        {/* Fila selector de ciclo — debajo, solo cuando hay varios mesos */}
        {mesoAtleta.length > 1 && vistaActual === "meso" && mesoVisto && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "6px 20px 8px",
              flexWrap: "wrap",
              borderTop: "1px solid var(--border)",
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: "var(--muted)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: ".07em",
                whiteSpace: "nowrap",
              }}
            >
              Ciclo:
            </span>
            <select
              name="field_43"
              className="form-select"
              style={{
                maxWidth: "min(320px,100%)",
                padding: "4px 10px",
                fontSize: 12,
              }}
              value={mesoVisto.id}
              onChange={(e) => setMesoSelId(e.target.value)}
            >
              {mesoAtleta.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre ? `${m.nombre} — ` : ""}
                  {formatDateDisplay(m.fecha_inicio)} · {m.modo}
                  {m.activo ? " ✓" : ""}
                </option>
              ))}
            </select>
            {mesoVisto.activo ? (
              <button
                className="btn btn-xs"
                style={{
                  background: "rgba(71,232,160,.15)",
                  color: "var(--green)",
                  border: "1px solid rgba(71,232,160,.4)",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 11,
                  padding: "4px 10px",
                }}
                onClick={() => setActivo(mesoVisto)}
              >
                ● Activo
              </button>
            ) : (
              <button
                className="btn btn-xs"
                style={{
                  background: "rgba(71,232,160,.06)",
                  color: "var(--muted)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 11,
                  padding: "4px 10px",
                }}
                onClick={() => setActivo(mesoVisto)}
              >
                Activar
              </button>
            )}
          </div>
        )}
        {mesoAtleta.length === 0 && (
          <div
            style={{
              padding: "0 20px 8px",
              fontSize: 12,
              color: "var(--muted)",
            }}
          >
            Sin mesociclos — creá uno para empezar
          </div>
        )}
      </div>

      {/* Sin mesociclos */}
      {mesoAtleta.length === 0 && (
        <div className="card text-center" style={{ padding: 48 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div
            style={{
              fontFamily: "'Bebas Neue'",
              fontSize: 22,
              color: "var(--muted)",
            }}
          >
            Sin mesociclos
          </div>
          <div className="text-sm text-muted mt8 mb16">
            Creá el primer mesociclo para {atleta.nombre}
          </div>
          <button className="btn btn-gold" onClick={() => setShowMeso(true)}>
            <Plus size={14} /> Nuevo mesociclo
          </button>
        </div>
      )}

      {/* ════════════ HISTORIAL ════════════ */}
      {vistaActual === "historial" && mesoAtleta.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {mesoAtleta.map((m) => (
            <div
              key={m.id}
              style={{
                background: "var(--surface)",
                border: `1px solid ${m.activo ? "var(--green)" : m.id === mesoVisto?.id ? "var(--gold)" : "var(--border)"}`,
                borderRadius: 12,
                overflow: "hidden",
                transition: "border .2s",
              }}
            >
              <div
                style={{
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                  background: m.activo
                    ? "rgba(71,232,160,.05)"
                    : m.id === mesoVisto?.id
                      ? "rgba(232,197,71,.04)"
                      : "transparent",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Bebas Neue'",
                    fontSize: 22,
                    lineHeight: 1,
                    color: m.activo
                      ? "var(--green)"
                      : m.id === mesoVisto?.id
                        ? "var(--gold)"
                        : "var(--text)",
                    minWidth: 110,
                  }}
                >
                  {formatDateDisplay(m.fecha_inicio)}
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                    flex: 1,
                  }}
                >
                  {m.nombre && (
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 14,
                        color: "var(--text)",
                      }}
                    >
                      {m.nombre}
                    </div>
                  )}
                  {m.descripcion && (
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>
                      {m.descripcion}
                    </div>
                  )}
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    {m.activo && (
                      <span className="badge badge-green">● Activo</span>
                    )}
                    <span
                      className={`badge ${m.modo === "Competitivo" ? "badge-gold" : "badge-blue"}`}
                    >
                      {m.modo}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>
                      {m.volumen_total} reps
                    </span>
                    {m.irm_arranque && (
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>
                        ARR{" "}
                        <span style={{ color: "var(--gold)", fontWeight: 700 }}>
                          {m.irm_arranque}
                        </span>{" "}
                        kg
                      </span>
                    )}
                    {m.irm_envion && (
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>
                        ENV{" "}
                        <span style={{ color: "var(--blue)", fontWeight: 700 }}>
                          {m.irm_envion}
                        </span>{" "}
                        kg
                      </span>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    flexShrink: 0,
                    alignItems: "center",
                  }}
                >
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => {
                      setMesoSelId(m.id);
                      setVistaActual("meso");
                    }}
                  >
                    Ver planilla
                  </button>
                  <button
                    className="btn btn-xs"
                    title={m.activo ? "Desactivar" : "Activar"}
                    style={{
                      background: m.activo
                        ? "rgba(71,232,160,.15)"
                        : "rgba(71,232,160,.06)",
                      color: m.activo ? "var(--green)" : "var(--muted)",
                      border: `1px solid ${m.activo ? "rgba(71,232,160,.4)" : "var(--border)"}`,
                      borderRadius: 6,
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: 11,
                      padding: "3px 10px",
                    }}
                    onClick={() => setActivo(m)}
                  >
                    {m.activo ? "● Activo" : "Activar"}
                  </button>
                  <button
                    className="btn btn-ghost btn-xs"
                    title="Duplicar mesociclo"
                    style={{ padding: "3px 6px" }}
                    onClick={() => duplicarMeso(m)}
                  >
                    <Copy size={13} />
                  </button>
                  <button
                    className="btn btn-ghost btn-xs"
                    title="Eliminar mesociclo"
                    style={{ padding: "3px 6px", color: "var(--red)" }}
                    onClick={() => deleteMeso(m.id)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <div
                style={{
                  padding: "10px 18px 14px",
                  borderTop: "1px solid var(--border)",
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                {m.semanas.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      background: "var(--surface2)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: "8px 14px",
                      textAlign: "center",
                      flex: 1,
                      minWidth: 60,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "'Bebas Neue'",
                        fontSize: 20,
                        color: "var(--gold)",
                        lineHeight: 1,
                      }}
                    >
                      {s.reps_ajustadas || s.reps_calculadas || 0}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--muted)",
                        textTransform: "uppercase",
                        letterSpacing: ".06em",
                        marginTop: 3,
                      }}
                    >
                      Sem {s.numero} · {s.pct_volumen}%
                    </div>
                    <div
                      style={{
                        height: 3,
                        background: "var(--surface3)",
                        borderRadius: 2,
                        marginTop: 6,
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          borderRadius: 2,
                          width: `${s.pct_volumen}%`,
                          background: "var(--gold)",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ════════════ NORMATIVOS ════════════ */}
      {vistaActual === "normativos" && (
        <PanelTabBoundary tab="Normativos A">
          <PageNormativosAtleta
            atleta={atleta}
            globalNormativos={globalNormativos}
            atletaNormativos={atletaNormativos}
            atletaNormOverrides={atletaNormOverrides}
            saveAtletaOverrides={saveAtletaOverrides}
            getEjAtleta={getEjAtleta}
          />
        </PanelTabBoundary>
      )}

      {/* ════════════ PDF ════════════ */}
      {vistaActual === "pdf" && (
        <PanelTabBoundary tab="PDF principal">
          {mesoVisto ? (
            <PagePDF
              meso={mesoVisto}
              atleta={atleta}
              irm_arr={irm_arr}
              irm_env={irm_env}
              normativos={atletaNormativos}
            />
          ) : (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                color: "var(--muted)",
              }}
            >
              Sin mesociclo seleccionado
            </div>
          )}
        </PanelTabBoundary>
      )}

      {/* ════════════ RESUMEN ════════════ */}
      {vistaActual === "resumen" && (
        <PanelTabBoundary tab="Resumen principal">
          {mesoVisto ? (
            <PageResumen
              meso={mesoVisto}
              atleta={atleta}
              irm_arr={irm_arr}
              irm_env={irm_env}
              normativos={atletaNormativos}
            />
          ) : (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                color: "var(--muted)",
              }}
            >
              Sin mesociclo seleccionado
            </div>
          )}
        </PanelTabBoundary>
      )}

      {/* ════════════ PLANILLA ════════════ */}
      {vistaActual === "meso" && mesoVisto && (
        <PanelTabBoundary tab="Planilla">
          <>
            {/* Toolbar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
                flexWrap: "wrap",
                gap: 8,
                minWidth: 0,
              }}
            >
              {mesoVisto.escuela === true || mesoVisto.escuela === "true" ? (
                <div style={{ fontSize: 12, color: "#4db6ac" }}>
                  Planilla Escuela Inicial · Nivel {mesoVisto.escuela_nivel}
                </div>
              ) : mesoVisto.pretemporada === true ||
                mesoVisto.pretemporada === "true" ? (
                <div style={{ fontSize: 12, color: "#ff9800" }}>
                  Planilla Pretemporada
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    Total:{" "}
                    <span style={{ color: "var(--gold)", fontWeight: 700 }}>
                      {mesoVisto.volumen_total}
                    </span>{" "}
                    reps
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setShowEditVol(true)}
                  >
                    <Pencil size={12} /> Editar volumen y semanas
                  </button>
                </>
              )}
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowGuardarPlantilla("meso")}
                style={{ color: "var(--muted)" }}
              >
                <Library size={12} /> Guardar como plantilla
              </button>
            </div>

            {/* ── Escuela Inicial: PlanillaBasica ── */}
            {mesoVisto.escuela === true || mesoVisto.escuela === "true" ? (
              <div className="card">
                <div
                  className="flex-between mb16"
                  style={{ flexWrap: "wrap", gap: 10 }}
                >
                  <div className="card-title" style={{ marginBottom: 0 }}>
                    Planilla Escuela Inicial
                  </div>
                  <div
                    style={{ display: "flex", gap: 10, alignItems: "center" }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <label
                        style={{
                          fontSize: 10,
                          color: "var(--gold)",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: ".05em",
                        }}
                      >
                        IRM Arr
                      </label>
                      <input
                        name="field_44"
                        type="number"
                        min={0}
                        max={300}
                        className="no-spin"
                        value={mesoVisto.irm_arranque ?? ""}
                        placeholder="kg"
                        onChange={(e) => {
                          pushSnap();
                          setMesociclos((prev) =>
                            prev.map((m) =>
                              m.id === mesoVisto.id
                                ? {
                                    ...m,
                                    irm_arranque:
                                      e.target.value === ""
                                        ? null
                                        : Number(e.target.value),
                                  }
                                : m,
                            ),
                          );
                        }}
                        style={{
                          width: 52,
                          background: "var(--surface2)",
                          border: "1px solid var(--border)",
                          borderRadius: 6,
                          padding: "4px 6px",
                          color: "var(--gold)",
                          fontSize: 14,
                          fontFamily: "'Bebas Neue'",
                          textAlign: "center",
                          outline: "none",
                          MozAppearance: "textfield",
                          appearance: "textfield",
                        }}
                      />
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <label
                        style={{
                          fontSize: 10,
                          color: "var(--blue)",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: ".05em",
                        }}
                      >
                        IRM Env
                      </label>
                      <input
                        name="field_45"
                        type="number"
                        min={0}
                        max={400}
                        className="no-spin"
                        value={mesoVisto.irm_envion ?? ""}
                        placeholder="kg"
                        onChange={(e) => {
                          pushSnap();
                          setMesociclos((prev) =>
                            prev.map((m) =>
                              m.id === mesoVisto.id
                                ? {
                                    ...m,
                                    irm_envion:
                                      e.target.value === ""
                                        ? null
                                        : Number(e.target.value),
                                  }
                                : m,
                            ),
                          );
                        }}
                        style={{
                          width: 52,
                          background: "var(--surface2)",
                          border: "1px solid var(--border)",
                          borderRadius: 6,
                          padding: "4px 6px",
                          color: "var(--blue)",
                          fontSize: 14,
                          fontFamily: "'Bebas Neue'",
                          textAlign: "center",
                          outline: "none",
                          MozAppearance: "textfield",
                          appearance: "textfield",
                        }}
                      />
                    </div>
                  </div>
                </div>
                <PlanillaBasica
                  semanas={mesoVisto.semanas}
                  onChange={(ss, extra) =>
                    updateMeso({ ...mesoVisto, semanas: ss, ...(extra || {}) })
                  }
                  numBloques={mesoVisto.num_bloques_basica || 3}
                  onBeforeChange={(forced) => pushSnap(forced)}
                  irm_arr={irm_arr}
                  irm_env={irm_env}
                  normativos={atletaNormativos}
                />
              </div>
            ) : mesoVisto.pretemporada === true ||
              mesoVisto.pretemporada === "true" ? (
              <div className="card">
                <div
                  className="flex-between mb16"
                  style={{ flexWrap: "wrap", gap: 10 }}
                >
                  <div
                    className="card-title"
                    style={{ marginBottom: 0, color: "#ff9800" }}
                  >
                    Planilla Pretemporada
                  </div>
                  <div
                    style={{ display: "flex", gap: 10, alignItems: "center" }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <label
                        style={{
                          fontSize: 10,
                          color: "var(--gold)",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: ".05em",
                        }}
                      >
                        IRM Arr
                      </label>
                      <input
                        name="field_pt_irm_arr"
                        type="number"
                        min={0}
                        max={300}
                        className="no-spin"
                        value={mesoVisto.irm_arranque ?? ""}
                        placeholder="kg"
                        onChange={(e) => {
                          pushSnap();
                          setMesociclos((prev) =>
                            prev.map((m) =>
                              m.id === mesoVisto.id
                                ? {
                                    ...m,
                                    irm_arranque:
                                      e.target.value === ""
                                        ? null
                                        : Number(e.target.value),
                                  }
                                : m,
                            ),
                          );
                        }}
                        style={{
                          width: 52,
                          background: "var(--surface2)",
                          border: "1px solid var(--border)",
                          borderRadius: 6,
                          padding: "4px 6px",
                          color: "var(--gold)",
                          fontSize: 14,
                          fontFamily: "'Bebas Neue'",
                          textAlign: "center",
                          outline: "none",
                          MozAppearance: "textfield",
                          appearance: "textfield",
                        }}
                      />
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <label
                        style={{
                          fontSize: 10,
                          color: "var(--blue)",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: ".05em",
                        }}
                      >
                        IRM Env
                      </label>
                      <input
                        name="field_pt_irm_env"
                        type="number"
                        min={0}
                        max={400}
                        className="no-spin"
                        value={mesoVisto.irm_envion ?? ""}
                        placeholder="kg"
                        onChange={(e) => {
                          pushSnap();
                          setMesociclos((prev) =>
                            prev.map((m) =>
                              m.id === mesoVisto.id
                                ? {
                                    ...m,
                                    irm_envion:
                                      e.target.value === ""
                                        ? null
                                        : Number(e.target.value),
                                  }
                                : m,
                            ),
                          );
                        }}
                        style={{
                          width: 52,
                          background: "var(--surface2)",
                          border: "1px solid var(--border)",
                          borderRadius: 6,
                          padding: "4px 6px",
                          color: "var(--blue)",
                          fontSize: 14,
                          fontFamily: "'Bebas Neue'",
                          textAlign: "center",
                          outline: "none",
                          MozAppearance: "textfield",
                          appearance: "textfield",
                        }}
                      />
                    </div>
                  </div>
                </div>
                <PlanillaPretemporada
                  semanas={mesoVisto.semanas}
                  onChange={(ss, extra) =>
                    updateMeso({ ...mesoVisto, semanas: ss, ...(extra || {}) })
                  }
                  numBloques={mesoVisto.num_bloques_basica || 3}
                  onBeforeChange={(forced) => pushSnap(forced)}
                  irm_arr={irm_arr}
                  irm_env={irm_env}
                  normativos={atletaNormativos}
                />
              </div>
            ) : (
              <>
                {/* Stats semanas */}
                <div className="stats-row mb16">
                  {mesoVisto.semanas.map((s, i) => {
                    const faseDetalle =
                      atleta.genero === "f" && atleta.ciclo?.ultimo_inicio
                        ? getDetalleFaseCiclo(
                            atleta.ciclo,
                            getFechaSemana(mesoVisto.fecha_inicio, s.numero),
                            7,
                          )
                        : null;
                    const fase = faseDetalle?.fase || null;
                    const faseInfo = fase ? FASES_CICLO[fase] : null;
                    return (
                      <div
                        key={s.id}
                        className="stat-box"
                        style={
                          faseInfo
                            ? {
                                border: `1px solid ${faseInfo.color}60`,
                                background: faseInfo.bg,
                              }
                            : {}
                        }
                      >
                        <div className="stat-box-val">
                          {s.reps_ajustadas || s.reps_calculadas || 0}
                        </div>
                        <div className="stat-box-lbl">
                          Semana {s.numero} · {s.pct_volumen}%
                        </div>
                        {faseInfo && (
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: faseInfo.color,
                              marginTop: 4,
                              display: "flex",
                              alignItems: "center",
                              gap: 3,
                            }}
                          >
                            <faseInfo.Icon size={11} /> {faseInfo.label}
                          </div>
                        )}
                        {faseDetalle?.transicion && (
                          <div
                            style={{
                              fontSize: 9,
                              fontWeight: 600,
                              color: "var(--muted)",
                              marginTop: 2,
                              lineHeight: 1.15,
                            }}
                          >
                            Transicion: {faseDetalle.transicion}
                          </div>
                        )}
                        <div className="prog-bar">
                          <div
                            className="prog-fill"
                            style={{
                              width: `${s.pct_volumen}%`,
                              background: faseInfo
                                ? faseInfo.color
                                : "var(--gold)",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Sembrado mensual completo */}
                <div
                  id={`${planillaScrollPrefix}-sembrado`}
                  className="card"
                  style={{ scrollMarginTop: 110 }}
                >
                  <div className="flex-between mb16">
                    <div className="card-title" style={{ marginBottom: 0 }}>
                      Sembrado Mensual
                    </div>
                  </div>
                  <SembradoMensual
                    semanas={mesoVisto.semanas}
                    irm_arr={irm_arr}
                    irm_env={irm_env}
                    meso={mesoVisto}
                    onChangeSemana={updateSemanaH}
                    onChangeTodasSemanas={(newSemanas) => {
                      updateMeso({ ...mesoVisto, semanas: newSemanas });
                    }}
                    onSwapSemanas={handleSwapSemanasOverrides}
                    normativos={atletaNormativos}
                  />
                  <div
                    id={`${planillaScrollPrefix}-semanas`}
                    style={{ scrollMarginTop: 110 }}
                  >
                    <ResumenGrupos
                      semanas={mesoVisto.semanas}
                      meso={mesoVisto}
                      onGuardarDistribucion={(dist) => {
                        try {
                          const stored = JSON.parse(
                            localStorage.getItem("liftplan_plantillas") || "[]",
                          );
                          const nuevo = {
                            id: mkId(),
                            tipo: "distribucion",
                            creado: new Date().toISOString().slice(0, 10),
                            nombre: `Distribución ${mesoVisto.nombre || "Mesociclo"}`,
                            descripcion: `${mesoVisto.semanas.length} semanas`,
                            periodo: "general",
                            objetivo: "mixto",
                            nivel: "intermedio",
                            distribucion: dist,
                          };
                          safeSetItem(
                            "liftplan_plantillas",
                            JSON.stringify([...stored, nuevo]),
                          );
                          alert("Distribución guardada como plantilla");
                        } catch (e) {}
                      }}
                      semPctOverrides={semPctOverrides}
                      semPctManual={semPctManual}
                      setSemPctOverrides={setSemPctOverridesH}
                      setSemPctManual={setSemPctManualH}
                      onRequestReset={(label, fn) =>
                        setConfirmReset({ label, onConfirm: fn })
                      }
                      onBeforeChange={(forced) => {
                        if (!forced && histIdxRef.current != null) pushSnap();
                        else pushSnap(true);
                      }}
                    />
                  </div>
                  <DistribucionTurnos
                    semanas={mesoVisto.semanas}
                    meso={mesoVisto}
                    turnoPctOverrides={turnoPctOverrides}
                    turnoPctManual={turnoPctManual}
                    setTurnoPctOverrides={setTurnoPctOverridesH}
                    setTurnoPctManual={setTurnoPctManualH}
                    semPctOverrides={semPctOverrides}
                    semPctManual={semPctManual}
                    onRequestReset={(label, fn) =>
                      setConfirmReset({ label, onConfirm: fn })
                    }
                    onBeforeChange={(forced) => pushSnap(forced)}
                  />
                  <PlanillaTurno
                    key={mesoVisto.id}
                    scrollIdPrefix={planillaScrollPrefix}
                    semanas={mesoVisto.semanas}
                    irm_arr={irm_arr}
                    irm_env={irm_env}
                    meso={mesoVisto}
                    semPctOverrides={semPctOverrides}
                    semPctManual={semPctManual}
                    turnoPctOverrides={turnoPctOverrides}
                    turnoPctManual={turnoPctManual}
                    onRequestReset={(label, fn) =>
                      setConfirmReset({ label, onConfirm: fn })
                    }
                    onBeforeChange={(forced) => {
                      pushSnap(forced);
                    }}
                    onChangeTodasSemanas={(newSemanas) => {
                      updateMeso({ ...mesoVisto, semanas: newSemanas });
                    }}
                    onChangeTurno={(sIdx, tIdx, newTurno) => {
                      const sem = mesoVisto.semanas[sIdx];
                      const ts = [...sem.turnos];
                      ts[tIdx] = newTurno;
                      updateSemana(sIdx, { ...sem, turnos: ts });
                    }}
                    repsEdit={repsEdit}
                    setRepsEdit={setRepsEditRaw}
                    manualEdit={manualEdit}
                    setManualEdit={setManualEditRaw}
                    cellEdit={cellEdit}
                    setCellEdit={setCellEditRaw}
                    cellManual={cellManual}
                    setCellManual={setCellManualRaw}
                    nameEdit={nameEdit}
                    setNameEdit={setNameEditRaw}
                    noteEdit={noteEdit}
                    setNoteEdit={setNoteEditRaw}
                    normativos={atletaNormativos}
                    initialSemActiva={
                      planillaNavRef.current[mesoVisto.id]?.semActiva ?? 0
                    }
                    initialTurnoActivo={
                      planillaNavRef.current[mesoVisto.id]?.turnoActivo ?? 0
                    }
                    onNavChange={(nav) => {
                      planillaNavRef.current[mesoVisto.id] = nav;
                    }}
                  />
                </div>
              </>
            )}
          </>
        </PanelTabBoundary>
      )}

      {/* ════ MODAL confirmar reset ════ */}
      {confirmReset && (
        <Modal title="Confirmar reseteo" onClose={() => setConfirmReset(null)}>
          <p style={{ color: "var(--text)", fontSize: 14, marginBottom: 20 }}>
            ¿Resetear{" "}
            <strong style={{ color: "var(--gold)" }}>
              {confirmReset.label}
            </strong>{" "}
            a los valores calculados automáticamente? Esta acción no se puede
            deshacer.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setConfirmReset(null)}
            >
              Cancelar
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                confirmReset.onConfirm();
                setConfirmReset(null);
              }}
            >
              Resetear
            </button>
          </div>
        </Modal>
      )}

      {/* ════ MODAL Ver todo Sembrado ════ */}
      {showFullSembrado && mesoVisto && (
        <Modal
          title="Sembrado Completo"
          onClose={() => setShowFullSembrado(false)}
          maxWidth="calc(100vw - 12px)"
          fitContent
          compact
          overlayPadding="6px"
          scrollable
          maxHeight="calc(100vh - 12px)"
          tightHeader
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "flex-start",
              gap: 6,
              marginBottom: 6,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "grid", gap: 4 }}>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>
                Vista matricial por turno · filas EJ / INT / TBL
              </div>
              <span
                className="badge badge-blue"
                style={{
                  fontSize: 10,
                  letterSpacing: ".04em",
                  width: "fit-content",
                }}
              >
                {semanasConDatos.length} semanas · {turnosConDatos.length}{" "}
                turnos
              </span>
            </div>
          </div>

          <div style={{ display: "grid", gap: 5, marginBottom: 4 }}>
            <div
              style={{
                display: "flex",
                gap: 6,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  minWidth: 68,
                  fontSize: 10,
                  color: "var(--muted)",
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
                Grupos
              </span>
              {gruposUsados.map((g) => {
                const active = filtroGrupos.includes(g);
                const color = CAT_COLOR[g] || "var(--gold)";
                return (
                  <button
                    key={`fg-${g}`}
                    className="btn btn-ghost btn-sm"
                    onClick={() =>
                      setFiltroGrupos((prev) =>
                        prev.includes(g)
                          ? prev.filter((x) => x !== g)
                          : [...prev, g],
                      )
                    }
                    style={{
                      padding: "3px 9px",
                      fontSize: 11,
                      borderColor: active ? color : "var(--border)",
                      color: active ? color : "var(--muted)",
                      background: active ? `${color}22` : "var(--surface2)",
                    }}
                  >
                    {g}
                  </button>
                );
              })}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginLeft: "auto",
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    color: "var(--muted)",
                    minWidth: 44,
                    textAlign: "right",
                  }}
                >
                  {Math.round(fullTableZoom * 100)}%
                </span>
                <button
                  className="btn btn-ghost btn-sm btn-icon"
                  onClick={() =>
                    setFullTableZoom((z) =>
                      Math.max(0.35, Math.round((z - 0.1) * 100) / 100),
                    )
                  }
                  title="Reducir zoom"
                  aria-label="Reducir zoom"
                >
                  <Minus size={14} />
                </button>
                <button
                  className="btn btn-ghost btn-sm btn-icon"
                  onClick={() =>
                    setFullTableZoom((z) =>
                      Math.min(2.5, Math.round((z + 0.1) * 100) / 100),
                    )
                  }
                  title="Aumentar zoom"
                  aria-label="Aumentar zoom"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 6,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  minWidth: 68,
                  fontSize: 10,
                  color: "var(--muted)",
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
                Intensidad
              </span>
              {intensidadesUsadas.map((intens) => {
                const active = filtroIntensidades.includes(intens);
                return (
                  <button
                    key={`fi-${intens}`}
                    className="btn btn-ghost btn-sm"
                    onClick={() =>
                      setFiltroIntensidades((prev) =>
                        prev.includes(intens)
                          ? prev.filter((x) => x !== intens)
                          : [...prev, intens],
                      )
                    }
                    style={{
                      padding: "3px 9px",
                      fontSize: 11,
                      borderColor: active ? "var(--red)" : "var(--border)",
                      color: active ? "var(--red)" : "var(--muted)",
                      background: active
                        ? "rgba(232,80,71,.16)"
                        : "var(--surface2)",
                    }}
                  >
                    {intens}%
                  </button>
                );
              })}
            </div>

            <div
              style={{
                display: "flex",
                gap: 6,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  minWidth: 68,
                  fontSize: 10,
                  color: "var(--muted)",
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
                Tablas
              </span>
              {tablasUsadas.map((tbl) => {
                const active = filtroTablas.includes(tbl);
                return (
                  <button
                    key={`ft-${tbl}`}
                    className="btn btn-ghost btn-sm"
                    onClick={() =>
                      setFiltroTablas((prev) =>
                        prev.includes(tbl)
                          ? prev.filter((x) => x !== tbl)
                          : [...prev, tbl],
                      )
                    }
                    style={{
                      padding: "3px 9px",
                      fontSize: 11,
                      borderColor: active ? "#9b87e8" : "var(--border)",
                      color: active ? "#9b87e8" : "var(--muted)",
                      background: active
                        ? "rgba(155,135,232,.17)"
                        : "var(--surface2)",
                    }}
                  >
                    T{tbl}
                  </button>
                );
              })}
            </div>
          </div>
          {semanasConDatos.length === 0 || turnosConDatos.length === 0 ? (
            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: 10,
                background:
                  "linear-gradient(180deg,var(--surface2),var(--surface))",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,.02)",
                padding: 24,
                textAlign: "center",
                color: "var(--muted)",
                fontSize: 12,
              }}
            >
              No hay datos cargados para mostrar en la vista completa.
            </div>
          ) : (
            <div
              ref={fullTableViewportRef}
              style={{
                width: "max-content",
                maxWidth: "none",
                marginRight: "auto",
                overflowY: "visible",
                overflowX: "visible",
                border: "1px solid var(--border)",
                borderRadius: 10,
                background:
                  "linear-gradient(180deg,var(--surface2),var(--surface))",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,.02)",
              }}
            >
              <table
                ref={fullTableRef}
                style={{
                  borderCollapse: "collapse",
                  fontSize: 10,
                  fontFamily: "'DM Sans', sans-serif",
                  width: "max-content",
                  minWidth: "max-content",
                  zoom: fullTableZoom,
                }}
              >
                <thead
                  style={{
                    background: "rgba(26,30,39,.96)",
                    backdropFilter: "blur(3px)",
                  }}
                >
                  <tr>
                    <th
                      style={{
                        padding: "4px 6px",
                        textAlign: "center",
                        borderRight: "2px solid var(--gold)",
                        borderBottom: "2px solid var(--gold)",
                        fontWeight: 700,
                        color: "var(--gold)",
                        width: 58,
                        fontFamily: "'Bebas Neue'",
                        fontSize: 14,
                        lineHeight: 1,
                        letterSpacing: ".06em",
                      }}
                    >
                      Turno
                    </th>
                    <th
                      style={{
                        padding: "4px 6px",
                        textAlign: "center",
                        borderRight: "2px solid var(--gold)",
                        borderBottom: "2px solid var(--gold)",
                        fontWeight: 700,
                        color: "var(--gold)",
                        width: 48,
                        fontFamily: "'Bebas Neue'",
                        fontSize: 14,
                        lineHeight: 1,
                        letterSpacing: ".06em",
                      }}
                    >
                      Tipo
                    </th>
                    {semanasConDatos.map(({ sem }, semRenderIdx) => (
                      <th
                        key={`header-${sem.id}`}
                        colSpan={semanaColsMap.get(sem.id) || 1}
                        style={{
                          padding: "4px 6px",
                          textAlign: "center",
                          borderRight:
                            semRenderIdx < semanasConDatos.length - 1
                              ? "7px solid rgba(255,255,255,.03)"
                              : "1px solid var(--border)",
                          borderBottom: "2px solid var(--gold)",
                          fontWeight: 700,
                          color: "var(--blue)",
                          fontFamily: "'Bebas Neue'",
                          fontSize: 14,
                          lineHeight: 1,
                          letterSpacing: ".06em",
                          textTransform: "uppercase",
                          boxShadow:
                            semRenderIdx < semanasConDatos.length - 1
                              ? "inset -2px 0 0 rgba(0,0,0,.28)"
                              : undefined,
                        }}
                      >
                        Sem {sem.numero}
                      </th>
                    ))}
                  </tr>
                  <tr>
                    <th
                      style={{
                        padding: "3px 5px",
                        textAlign: "center",
                        borderRight: "2px solid var(--gold)",
                        borderBottom: "1px solid var(--border)",
                        fontWeight: 600,
                        color: "var(--muted)",
                        fontSize: 8,
                        textTransform: "uppercase",
                        letterSpacing: ".06em",
                      }}
                    >
                      —
                    </th>
                    <th
                      style={{
                        padding: "3px 5px",
                        textAlign: "center",
                        borderRight: "2px solid var(--gold)",
                        borderBottom: "1px solid var(--border)",
                        fontWeight: 600,
                        color: "var(--muted)",
                        fontSize: 8,
                        textTransform: "uppercase",
                        letterSpacing: ".06em",
                      }}
                    >
                      —
                    </th>
                    {semanasConDatos.map(({ sem }, semRenderIdx) =>
                      Array.from({
                        length: semanaColsMap.get(sem.id) || 1,
                      }).map((_, slotIdx) => (
                        <th
                          key={`subheader-${sem.id}-${slotIdx}`}
                          style={{
                            padding: "3px 3px",
                            textAlign: "center",
                            borderRight:
                              slotIdx ===
                                (semanaColsMap.get(sem.id) || 1) - 1 &&
                              semRenderIdx < semanasConDatos.length - 1
                                ? "7px solid rgba(255,255,255,.03)"
                                : "1px solid var(--border)",
                            borderBottom: "1px solid var(--border)",
                            fontWeight: 600,
                            color: "var(--muted)",
                            fontSize: 8,
                            width: 28,
                            letterSpacing: ".04em",
                            boxShadow:
                              slotIdx ===
                                (semanaColsMap.get(sem.id) || 1) - 1 &&
                              semRenderIdx < semanasConDatos.length - 1
                                ? "inset -2px 0 0 rgba(0,0,0,.28)"
                                : undefined,
                          }}
                        >
                          {slotIdx + 1}
                        </th>
                      )),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const maxTurnos = turnosConDatos.length;
                    const totalCols = semanasConDatos.reduce(
                      (acc, { sem }) => acc + (semanaColsMap.get(sem.id) || 1),
                      0,
                    );

                    const rowCellBase = {
                      padding: "1px 3px",
                      textAlign: "center",
                      borderRight: "1px solid var(--border)",
                      borderBottom: "1px solid var(--border)",
                      color: "var(--text)",
                      fontSize: 10,
                      lineHeight: 1,
                      background: "rgba(10,12,16,.2)",
                    };

                    const renderDataCells = (
                      turnoGlobalIdx,
                      valueGetter,
                      rowType,
                    ) =>
                      semanasConDatos.map(
                        ({ sem, semIdxOriginal }, semRenderIdx) => {
                          const turno = sem.turnos?.[turnoGlobalIdx];
                          const ejercicios = (turno?.ejercicios || []).filter(
                            (ej) => !!ej?.ejercicio_id,
                          );
                          const colsSemana = semanaColsMap.get(sem.id) || 1;
                          return Array.from({ length: colsSemana }).map(
                            (_, slotIdx) => {
                              const ej = ejercicios[slotIdx];
                              const cell = ej ? valueGetter(ej) : null;
                              const val = cell?.val ?? null;
                              const isEndOfSemana = slotIdx === colsSemana - 1;
                              const toneColor =
                                rowType === "ej"
                                  ? "var(--gold)"
                                  : rowType === "int"
                                    ? "var(--red)"
                                    : "#9b87e8";
                              const valueColor = cell?.color || toneColor;
                              return (
                                <td
                                  key={`s-${semIdxOriginal}-t-${turnoGlobalIdx}-c-${slotIdx}`}
                                  style={{
                                    ...rowCellBase,
                                    borderRight:
                                      isEndOfSemana &&
                                      semRenderIdx < semanasConDatos.length - 1
                                        ? "7px solid rgba(255,255,255,.03)"
                                        : isEndOfSemana
                                          ? "2px solid var(--border)"
                                          : rowCellBase.borderRight,
                                    boxShadow:
                                      isEndOfSemana &&
                                      semRenderIdx < semanasConDatos.length - 1
                                        ? "inset -2px 0 0 rgba(0,0,0,.28)"
                                        : undefined,
                                    color:
                                      val === null ||
                                      val === undefined ||
                                      val === ""
                                        ? "var(--muted)"
                                        : valueColor,
                                    fontWeight: rowType === "ej" ? 700 : 600,
                                    background:
                                      val === null ||
                                      val === undefined ||
                                      val === ""
                                        ? "rgba(10,12,16,.12)"
                                        : "rgba(18,21,28,.72)",
                                  }}
                                >
                                  {val === null ||
                                  val === undefined ||
                                  val === ""
                                    ? ""
                                    : val}
                                </td>
                              );
                            },
                          );
                        },
                      );

                    return Array.from({ length: maxTurnos }).flatMap(
                      (_, rowTurnoIdx) => {
                        const turnoGlobalIdx = turnosConDatos[rowTurnoIdx];
                        const isLastTurno = rowTurnoIdx === maxTurnos - 1;
                        const baseTurnoCell = {
                          padding: "2px 6px",
                          textAlign: "center",
                          borderRight: "2px solid var(--gold)",
                          fontWeight: 700,
                          color: "var(--gold)",
                          background: "rgba(232,197,71,.08)",
                          fontFamily: "'Bebas Neue'",
                          fontSize: 18,
                          lineHeight: 1,
                          letterSpacing: ".06em",
                        };

                        const rows = [
                          <tr key={`turno-${turnoGlobalIdx}-ej`}>
                            <td rowSpan={3} style={baseTurnoCell}>
                              T{turnoGlobalIdx + 1}
                            </td>
                            <td
                              style={{
                                ...rowCellBase,
                                borderRight: "2px solid var(--gold)",
                                color: "var(--gold)",
                                fontWeight: 700,
                                background: "rgba(232,197,71,.08)",
                                fontSize: 9,
                                letterSpacing: ".06em",
                              }}
                            >
                              EJ
                            </td>
                            {renderDataCells(
                              turnoGlobalIdx,
                              (ej) => {
                                const categoria = getEjAtleta(
                                  ej.ejercicio_id,
                                )?.categoria;
                                return {
                                  val: ej.ejercicio_id || null,
                                  color: CAT_COLOR[categoria] || "var(--gold)",
                                };
                              },
                              "ej",
                            )}
                          </tr>,
                          <tr key={`turno-${turnoGlobalIdx}-int`}>
                            <td
                              style={{
                                ...rowCellBase,
                                borderRight: "2px solid var(--gold)",
                                color: "var(--red)",
                                fontWeight: 700,
                                background: "rgba(232,80,71,.09)",
                                fontSize: 9,
                                letterSpacing: ".06em",
                              }}
                            >
                              INT
                            </td>
                            {renderDataCells(
                              turnoGlobalIdx,
                              (ej) => ({ val: ej.intensidad || null }),
                              "int",
                            )}
                          </tr>,
                          <tr key={`turno-${turnoGlobalIdx}-tbl`}>
                            <td
                              style={{
                                ...rowCellBase,
                                borderRight: "2px solid var(--gold)",
                                color: "#9b87e8",
                                fontWeight: 700,
                                background: "rgba(155,135,232,.14)",
                                fontSize: 9,
                                letterSpacing: ".06em",
                              }}
                            >
                              TBL
                            </td>
                            {renderDataCells(
                              turnoGlobalIdx,
                              (ej) => ({ val: ej.tabla || null }),
                              "tbl",
                            )}
                          </tr>,
                        ];

                        if (!isLastTurno) {
                          rows.push(
                            <tr key={`turno-${turnoGlobalIdx}-sep1`}>
                              <td
                                colSpan={2 + totalCols}
                                style={{
                                  height: 3,
                                  border: "none",
                                  background: "rgba(255,255,255,.02)",
                                  padding: 0,
                                }}
                              />
                            </tr>,
                          );
                          rows.push(
                            <tr key={`turno-${turnoGlobalIdx}-sep2`}>
                              <td
                                colSpan={2 + totalCols}
                                style={{
                                  height: 3,
                                  border: "none",
                                  background: "rgba(0,0,0,.22)",
                                  padding: 0,
                                }}
                              />
                            </tr>,
                          );
                        }

                        return rows;
                      },
                    );
                  })()}
                </tbody>
              </table>
            </div>
          )}

          <div
            style={{
              marginTop: 16,
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
            }}
          >
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowFullSembrado(false)}
            >
              Cerrar
            </button>
          </div>
        </Modal>
      )}

      {showMeso && (
        <MesocicloForm
          atleta={atleta}
          onSave={saveMeso}
          onClose={() => setShowMeso(false)}
        />
      )}

      {/* ════ MODAL editar datos del meso ════ */}
      {showEditMeso && mesoVisto && (
        <EditMesoModal
          meso={mesoVisto}
          onSave={saveEditMeso}
          onClose={() => setShowEditMeso(false)}
        />
      )}

      {/* ════ MODAL editar volumen y semanas ════ */}
      {showEditVol && mesoVisto && (
        <EditVolModal
          meso={mesoVisto}
          onSave={saveEditVol}
          onClose={() => setShowEditVol(false)}
        />
      )}

      {confirmDeleteMeso && (
        <Modal
          title="Eliminar mesociclo"
          onClose={() => setConfirmDeleteMeso(null)}
        >
          <p style={{ fontSize: 13, color: "var(--text)", marginBottom: 8 }}>
            ¿Eliminar{" "}
            <strong>{confirmDeleteMeso.nombre || "este mesociclo"}</strong>?
          </p>
          <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 20 }}>
            Se perderán todos los datos del ciclo. Esta acción no se puede
            deshacer.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              className="btn btn-ghost"
              onClick={() => setConfirmDeleteMeso(null)}
            >
              Cancelar
            </button>
            <button
              className="btn"
              style={{ background: "var(--red)", color: "#fff" }}
              onClick={() => {
                setMesociclos((prev) =>
                  prev.filter((m) => m.id !== confirmDeleteMeso.id),
                );
                if (mesoSelId === confirmDeleteMeso.id) setMesoSelId(null);
                setConfirmDeleteMeso(null);
              }}
            >
              <Trash2 size={14} /> Eliminar mesociclo
            </button>
          </div>
        </Modal>
      )}

      {showGuardarPlantilla && mesoVisto && (
        <GuardarPlantillaModal
          tipo={showGuardarPlantilla}
          dataMeso={showGuardarPlantilla === "meso" ? mesoVisto : null}
          onSave={(p) => addPlantilla && addPlantilla(p)}
          onClose={() => setShowGuardarPlantilla(null)}
        />
      )}
    </div>
  );
}

function PageResumen({
  meso,
  atleta,
  irm_arr,
  irm_env,
  normativos: normativosProp = null,
}) {
  const [semActiva, setSemActiva] = useState(null);
  const [turnoActivo, setTurnoActivo] = useState(null);

  // Recharts via import (disponible en el entorno React)
  const [RC, setRC] = useState({});
  useEffect(() => {
    import("recharts")
      .then((m) => setRC(m))
      .catch(() => {
        // fallback: intentar desde window si ya fue cargado
        if (window.Recharts) setRC(window.Recharts);
      });
  }, []);
  const {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell,
  } = RC;
  const hasRecharts = !!BarChart;

  const normativos =
    normativosProp ??
    (() => {
      try {
        return (
          JSON.parse(localStorage.getItem("liftplan_normativos") || "null") ||
          EJERCICIOS
        );
      } catch {
        return EJERCICIOS;
      }
    })();
  const tablas = (() => {
    try {
      return (
        JSON.parse(localStorage.getItem("liftplan_tablas") || "null") ||
        TABLA_DEFAULT
      );
    } catch {
      return TABLA_DEFAULT;
    }
  })();

  // ── Leer repsEdit y cellEdit del localStorage del mesociclo ─────────────────
  const repsEditSaved = (() => {
    try {
      return (
        JSON.parse(
          localStorage.getItem(`liftplan_pt_${meso.id}_repsEdit`) || "null",
        ) || {}
      );
    } catch {
      return {};
    }
  })();
  const manualEditSaved = (() => {
    try {
      return new Set(
        JSON.parse(
          localStorage.getItem(`liftplan_pt_${meso.id}_manualEdit`) || "[]",
        ),
      );
    } catch {
      return new Set();
    }
  })();
  const cellEditSaved = (() => {
    try {
      return (
        JSON.parse(
          localStorage.getItem(`liftplan_pt_${meso.id}_cellEdit`) || "null",
        ) || {}
      );
    } catch {
      return {};
    }
  })();
  const cellManualSaved = (() => {
    try {
      return new Set(
        JSON.parse(
          localStorage.getItem(`liftplan_pt_${meso.id}_cellManual`) || "[]",
        ),
      );
    } catch {
      return new Set();
    }
  })();

  // Obtener reps efectivas para un ejercicio (con overrides de repsEdit)
  const getRepsVal = (ej, semIdx, tIdx) => {
    const k = `${semIdx}-${tIdx}-${ej.id}`;
    if (manualEditSaved.has(k) && repsEditSaved[k] !== undefined)
      return Number(repsEditSaved[k]);
    if (ej.reps_asignadas > 0) return ej.reps_asignadas;
    // Calcular tentativa igual que PlanillaTurno
    const sem = meso.semanas[semIdx];
    if (!sem) return 0;
    const reps_sem = meso.volumen_total * (sem.pct_volumen / 100);
    const { porGrupo, totalSem } = calcSembradoSemana(sem);
    const ejData2 = normativos.find((e) => e.id === Number(ej.ejercicio_id));
    if (!ejData2) return 0;
    const g = getGrupo(ej.ejercicio_id);
    if (!g || totalSem === 0) return 0;
    const pctGSem = porGrupo[g].total / totalSem;
    const pctGTurno = porGrupo[g].porTurno[tIdx] / (porGrupo[g].total || 1);
    const repsBloque = Math.round(reps_sem * pctGSem * pctGTurno);
    // Distribuir entre ejercicios del grupo en el turno
    const ejsG = sem.turnos[tIdx].ejercicios.filter(
      (e) => e.ejercicio_id && getGrupo(e.ejercicio_id) === g,
    );
    if (ejsG.length === 0) return 0;
    const base = Math.floor(repsBloque / ejsG.length);
    const extra = repsBloque - base * ejsG.length;
    const idx = ejsG.findIndex((e) => e.id === ej.id);
    return base + (idx < extra ? 1 : 0);
  };

  // ── Función core: calcular métricas de un array de {ej, semIdx, tIdx} ────
  const calcMetricas = (pairs) => {
    let volReps = 0,
      volKg = 0,
      sumIntReps = 0;
    let levGrupo = {
      Arranque: 0,
      Envion: 0,
      Tirones: 0,
      Piernas: 0,
      Complementarios: 0,
    };
    let tonGrupo = {
      Arranque: 0,
      Envion: 0,
      Tirones: 0,
      Piernas: 0,
      Complementarios: 0,
    };
    let sumIntMed = 0,
      repsConIRM = 0;

    const _isEscuela = meso.escuela === true || meso.escuela === "true";

    pairs.forEach(({ ej, semIdx, tIdx }) => {
      const ejData = normativos.find((e) => e.id === Number(ej.ejercicio_id));
      if (!ejData) return;

      let vR = 0,
        vK = 0;

      if (_isEscuela) {
        // Escuela: usar bloques directamente (no hay intensidades/sembrado)
        (ej.bloques || []).forEach((bloque) => {
          const s = Number(bloque.series) || 0;
          const r = Number(bloque.reps) || 0;
          const rT = Math.round(s) * Math.round(r);
          if (rT === 0) return;
          let kg = bloque.kg != null ? Number(bloque.kg) : null;
          if (kg == null && bloque.pct) {
            const irm =
              ejData.base === "arranque" ? Number(irm_arr) : Number(irm_env);
            if (irm && ejData.pct_base)
              kg =
                Math.round(
                  ((((irm * ejData.pct_base) / 100) * bloque.pct) / 100) * 2,
                ) / 2;
          }
          vR += rT;
          vK += rT * (kg || 0);
          sumIntReps += (bloque.pct || 0) * rT;
        });
      } else {
        const repsVal = getRepsVal(ej, semIdx, tIdx);
        const calcs = calcSeriesRepsKg(
          tablas,
          ej,
          ejData,
          irm_arr,
          irm_env,
          meso.modo,
          repsVal,
        );
        if (!calcs) return;

        INTENSIDADES.forEach((intens, iIdx) => {
          const c = calcs[iIdx];
          if (!c) return;
          const ckf = (f) => `${semIdx}-${tIdx}-${ej.id}-${intens}-${f}`;
          const getV = (f, def) =>
            cellManualSaved.has(ckf(f))
              ? Number(cellEditSaved[ckf(f)]) || 0
              : def || 0;
          const s = getV("series", c.series);
          const r = getV("reps", c.reps_serie);
          const kg = getV("kg", c.kg);
          if (r === 0) return;
          const sEff = s && s > 0 ? s : 1;
          const rT = Math.round(sEff) * Math.round(r);
          if (rT === 0) return;
          vR += rT;
          vK += rT * (kg || 0);
          sumIntReps += intens * rT;
        });
      }

      volReps += vR;
      volKg += vK;
      const cat = ejData.categoria || "Complementarios";
      levGrupo[cat] = (levGrupo[cat] || 0) + vR;
      tonGrupo[cat] = (tonGrupo[cat] || 0) + vK;

      const irm2 =
        ejData.base === "arranque" ? Number(irm_arr) : Number(irm_env);
      const kgB =
        irm2 && ejData.pct_base ? (irm2 * ejData.pct_base) / 100 : null;
      if (kgB && vR > 0 && vK > 0) {
        sumIntMed += (vK / vR / kgB) * 100 * vR;
        repsConIRM += vR;
      }
    });

    const pesoMedio = volReps > 0 ? Math.round((volKg / volReps) * 2) / 2 : 0;
    const coefInt =
      volReps > 0 ? Math.round((sumIntReps / volReps) * 10) / 10 : 0;
    const intMedia = repsConIRM > 0 ? Math.round(sumIntMed / repsConIRM) : 0;
    const totalLev = Object.values(levGrupo).reduce((a, b) => a + b, 0);
    const grupoData = Object.entries(levGrupo)
      .filter(([, v]) => v > 0)
      .map(([g, v]) => ({
        name: g,
        lev: v,
        ton: Math.round(tonGrupo[g]),
        pct: totalLev > 0 ? Math.round((v / totalLev) * 100) : 0,
        color: CAT_COLOR[g],
      }));
    return {
      volReps,
      volKg: Math.round(volKg),
      pesoMedio,
      coefInt,
      intMedia,
      grupoData,
    };
  };

  // ── Métricas por semana ───────────────────────────────────────────────────
  const _isEscuelaMeso = meso.escuela === true || meso.escuela === "true";
  const metSemanas = meso.semanas.map((sem, semIdx) => {
    const pairs = sem.turnos.flatMap((t, tIdx) =>
      t.ejercicios
        .filter((e) => e.ejercicio_id)
        .map((ej) => ({ ej, semIdx, tIdx })),
    );
    return {
      label: `Sem ${sem.numero}`,
      pct: sem.pct_volumen ?? null,
      plan:
        meso.volumen_total && sem.pct_volumen
          ? Math.round((meso.volumen_total * sem.pct_volumen) / 100)
          : null,
      ...calcMetricas(pairs),
    };
  });

  // ── Métricas por turno de la semana activa ────────────────────────────────
  const semVista = semActiva !== null ? meso.semanas[semActiva] : null;
  const metTurnos = semVista
    ? semVista.turnos
        .map((t, tIdx) => {
          const pairs = t.ejercicios
            .filter((e) => e.ejercicio_id)
            .map((ej) => ({ ej, semIdx: semActiva, tIdx }));
          return {
            label: t.dia ? `T${tIdx + 1} ${t.dia.slice(0, 3)}` : `T${tIdx + 1}`,
            ...calcMetricas(pairs),
          };
        })
        .filter((t) => t.volReps > 0)
    : [];

  // ── Métricas globales del mesociclo ───────────────────────────────────────
  const totMeso = calcMetricas(
    meso.semanas.flatMap((sem, semIdx) =>
      sem.turnos.flatMap((t, tIdx) =>
        t.ejercicios
          .filter((e) => e.ejercicio_id)
          .map((ej) => ({ ej, semIdx, tIdx })),
      ),
    ),
  );

  // ── UI helpers ────────────────────────────────────────────────────────────
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "8px 12px",
          fontSize: 11,
        }}
      >
        <div
          style={{
            color: "var(--gold)",
            fontFamily: "'Bebas Neue'",
            fontSize: 13,
            marginBottom: 4,
          }}
        >
          {label}
        </div>
        {payload.map((p, i) => (
          <div
            key={i}
            style={{
              color: p.color,
              display: "flex",
              gap: 8,
              justifyContent: "space-between",
            }}
          >
            <span>{p.name}:</span>
            <span style={{ fontWeight: 700 }}>{p.value}</span>
          </div>
        ))}
      </div>
    );
  };

  const cardStyle = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "16px 20px",
  };

  const MetricBox = ({ label, value, sub, color = "var(--gold)" }) => (
    <div
      style={{
        background: "var(--surface2)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "10px 12px",
        textAlign: "center",
        flex: 1,
        minWidth: 80,
      }}
    >
      <div
        style={{
          fontFamily: "'Bebas Neue'",
          fontSize: 24,
          color,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 9,
          color: "var(--muted)",
          textTransform: "uppercase",
          letterSpacing: ".06em",
          marginTop: 3,
        }}
      >
        {label}
      </div>
      {sub && (
        <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 1 }}>
          {sub}
        </div>
      )}
    </div>
  );

  // Datos activos según navegación
  const chartDataSem = metSemanas.map((s) => ({
    name: s.label,
    "Vol. Real": s.volReps,
    Planificado: s.plan,
    Tonelaje: s.volKg,
    "Int. Media": s.intMedia,
    "Coef. Int.": s.coefInt,
    "Peso Medio": s.pesoMedio,
  }));

  const chartDataTurno = metTurnos.map((t) => ({
    name: t.label,
    "Vol. Reps": t.volReps,
    Tonelaje: t.volKg,
    "Int. Media": t.intMedia,
    "Coef. Int.": t.coefInt,
    "Peso Medio": t.pesoMedio,
  }));

  const vistaMetricas =
    semActiva !== null && turnoActivo !== null
      ? calcMetricas(
          semVista.turnos[turnoActivo]?.ejercicios
            .filter((e) => e.ejercicio_id)
            .map((ej) => ({ ej, semIdx: semActiva, tIdx: turnoActivo })) || [],
        )
      : semActiva !== null
        ? calcMetricas(
            semVista.turnos.flatMap((t, tIdx) =>
              t.ejercicios
                .filter((e) => e.ejercicio_id)
                .map((ej) => ({ ej, semIdx: semActiva, tIdx })),
            ),
          )
        : totMeso;

  const vistaLabel =
    turnoActivo !== null && semVista
      ? `T${turnoActivo + 1}${semVista.turnos[turnoActivo]?.dia ? " · " + semVista.turnos[turnoActivo].dia : ""}`
      : semActiva !== null
        ? `Semana ${semActiva + 1}`
        : "Mesociclo completo";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ── Navegación semana / turno ─────────────────────────────────── */}
      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
            minWidth: 0,
            overflowX: "auto",
          }}
        >
          <button
            onClick={() => {
              setSemActiva(null);
              setTurnoActivo(null);
            }}
            style={{
              padding: "4px 12px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              background:
                semActiva === null ? "var(--gold)" : "var(--surface3)",
              color: semActiva === null ? "#000" : "var(--muted)",
              fontFamily: "'DM Sans'",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Mesociclo
          </button>
          {meso.semanas.map((s, i) => (
            <button
              key={i}
              onClick={() => {
                setSemActiva(i);
                setTurnoActivo(null);
              }}
              style={{
                padding: "4px 12px",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                background:
                  semActiva === i && turnoActivo === null
                    ? "var(--gold)"
                    : "var(--surface3)",
                color:
                  semActiva === i && turnoActivo === null
                    ? "#000"
                    : "var(--muted)",
                fontFamily: "'DM Sans'",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Sem {s.numero}
            </button>
          ))}
        </div>
        {semActiva !== null && metTurnos.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginTop: 8,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: 10,
                color: "var(--muted)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: ".06em",
              }}
            >
              Turno:
            </span>
            {semVista.turnos.map((t, i) => {
              const hasEjs = t.ejercicios.some((e) => e.ejercicio_id);
              if (!hasEjs) return null;
              return (
                <button
                  key={i}
                  onClick={() => setTurnoActivo(turnoActivo === i ? null : i)}
                  style={{
                    padding: "3px 10px",
                    borderRadius: 5,
                    border: "none",
                    cursor: "pointer",
                    background:
                      turnoActivo === i ? "var(--blue)" : "var(--surface3)",
                    color: turnoActivo === i ? "#fff" : "var(--muted)",
                    fontFamily: "'DM Sans'",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  T{i + 1}
                  {t.dia ? ` · ${t.dia.slice(0, 3)}` : ""}
                </button>
              );
            })}
          </div>
        )}
        <div style={{ marginTop: 8, fontSize: 11, color: "var(--muted)" }}>
          Viendo:{" "}
          <span style={{ color: "var(--gold)", fontWeight: 700 }}>
            {vistaLabel}
          </span>
        </div>
      </div>

      {/* ── KPIs de la vista activa ───────────────────────────────────── */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <MetricBox
          label="VOL REPs"
          value={vistaMetricas.volReps || "—"}
          color="var(--gold)"
        />
        <MetricBox
          label="VOL Kg"
          value={vistaMetricas.volKg || "—"}
          color="var(--blue)"
        />
        <MetricBox
          label="Peso Medio"
          value={
            vistaMetricas.pesoMedio ? `${vistaMetricas.pesoMedio} kg` : "—"
          }
          color="var(--green)"
        />
        <MetricBox
          label="Int. Media"
          value={vistaMetricas.intMedia ? `${vistaMetricas.intMedia}%` : "—"}
          color="#9b87e8"
        />
        {semActiva === null && (
          <MetricBox
            label="IRM Arranque"
            value={irm_arr ? `${irm_arr} kg` : "—"}
            color="var(--gold)"
          />
        )}
        {semActiva === null && (
          <MetricBox
            label="IRM Envión"
            value={irm_env ? `${irm_env} kg` : "—"}
            color="var(--blue)"
          />
        )}
      </div>

      {/* ── Gráficos (solo cuando hay datos suficientes) ──────────────── */}
      {!hasRecharts && (
        <div
          style={{
            ...cardStyle,
            textAlign: "center",
            color: "var(--muted)",
            padding: 32,
            fontSize: 12,
          }}
        >
          Los gráficos requieren conexión para cargar la librería de
          visualización.
          <br />
          Las tablas y métricas están disponibles igualmente.
        </div>
      )}

      {hasRecharts && semActiva === null && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {/* Volumen por semana */}
          <div style={cardStyle}>
            <div
              style={{
                fontFamily: "'Bebas Neue'",
                fontSize: 15,
                color: "var(--text)",
                marginBottom: 10,
              }}
            >
              Volumen por semana
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartDataSem} barGap={3}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "var(--muted)", fontSize: 10 }}
                />
                <YAxis tick={{ fill: "var(--muted)", fontSize: 9 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                {!_isEscuelaMeso && (
                  <Bar
                    dataKey="Planificado"
                    fill="rgba(232,197,71,.2)"
                    radius={[3, 3, 0, 0]}
                  />
                )}
                <Bar
                  dataKey="Vol. Real"
                  fill="var(--gold)"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Intensidad media por semana */}
          <div style={cardStyle}>
            <div
              style={{
                fontFamily: "'Bebas Neue'",
                fontSize: 15,
                color: "var(--text)",
                marginBottom: 10,
              }}
            >
              Intensidad media por semana
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartDataSem}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "var(--muted)", fontSize: 10 }}
                />
                <YAxis tick={{ fill: "var(--muted)", fontSize: 9 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line
                  type="monotone"
                  dataKey="Int. Media"
                  stroke="#9b87e8"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#9b87e8" }}
                />
                <Line
                  type="monotone"
                  dataKey="Coef. Int."
                  stroke="var(--green)"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "var(--green)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={cardStyle}>
            <div
              style={{
                fontFamily: "'Bebas Neue'",
                fontSize: 15,
                color: "var(--text)",
                marginBottom: 10,
              }}
            >
              Peso Medio por semana
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartDataSem}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "var(--muted)", fontSize: 10 }}
                />
                <YAxis tick={{ fill: "var(--muted)", fontSize: 9 }} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="Peso Medio"
                  name="Peso Medio (kg)"
                  stroke="var(--blue)"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "var(--blue)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Distribución por grupo */}
          <div style={cardStyle}>
            <div
              style={{
                fontFamily: "'Bebas Neue'",
                fontSize: 15,
                color: "var(--text)",
                marginBottom: 10,
              }}
            >
              Distribución por grupo
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={totMeso.grupoData} layout="vertical" barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  type="number"
                  tick={{ fill: "var(--muted)", fontSize: 9 }}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fill: "var(--muted)", fontSize: 9 }}
                  width={88}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="lev" name="Levant." radius={[0, 3, 3, 0]}>
                  {totMeso.grupoData.map((g, i) => (
                    <Cell key={i} fill={g.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Gráficos por semana — turnos */}
      {hasRecharts &&
        semActiva !== null &&
        turnoActivo === null &&
        metTurnos.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            <div style={cardStyle}>
              <div
                style={{
                  fontFamily: "'Bebas Neue'",
                  fontSize: 15,
                  color: "var(--text)",
                  marginBottom: 10,
                }}
              >
                Vol. Reps por turno — Semana {semActiva + 1}
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartDataTurno}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "var(--muted)", fontSize: 10 }}
                  />
                  <YAxis tick={{ fill: "var(--muted)", fontSize: 9 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="Vol. Reps"
                    fill="var(--gold)"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={cardStyle}>
              <div
                style={{
                  fontFamily: "'Bebas Neue'",
                  fontSize: 15,
                  color: "var(--text)",
                  marginBottom: 10,
                }}
              >
                Tonelaje por turno — Semana {semActiva + 1}
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartDataTurno}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "var(--muted)", fontSize: 10 }}
                  />
                  <YAxis tick={{ fill: "var(--muted)", fontSize: 9 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="Tonelaje"
                    fill="var(--blue)"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={cardStyle}>
              <div
                style={{
                  fontFamily: "'Bebas Neue'",
                  fontSize: 15,
                  color: "var(--text)",
                  marginBottom: 10,
                }}
              >
                Int. Media por turno — Sem {semActiva + 1}
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartDataTurno}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "var(--muted)", fontSize: 10 }}
                  />
                  <YAxis tick={{ fill: "var(--muted)", fontSize: 9 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="Int. Media"
                    name="Int. Media (%)"
                    stroke="#9b87e8"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#9b87e8" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div style={{ ...cardStyle, gridColumn: "1 / -1" }}>
              <div
                style={{
                  fontFamily: "'Bebas Neue'",
                  fontSize: 15,
                  color: "var(--text)",
                  marginBottom: 10,
                }}
              >
                Peso Medio por turno — Sem {semActiva + 1}
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartDataTurno}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "var(--muted)", fontSize: 10 }}
                  />
                  <YAxis tick={{ fill: "var(--muted)", fontSize: 9 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="Peso Medio"
                    name="Peso Medio (kg)"
                    stroke="var(--blue)"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "var(--blue)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

      {/* ── Tabla resumen ─────────────────────────────────────────────── */}
      {semActiva === null && (
        <div style={cardStyle}>
          <div
            style={{
              fontFamily: "'Bebas Neue'",
              fontSize: 15,
              color: "var(--text)",
              marginBottom: 10,
            }}
          >
            Tabla por semana
          </div>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                borderCollapse: "separate",
                borderSpacing: "3px 2px",
                width: "100%",
              }}
            >
              <thead>
                <tr>
                  {[
                    "Semana",
                    "% Vol",
                    "Planif.",
                    "VOL REPs",
                    "VOL Kg",
                    "Peso Medio",
                    "Int. Media",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "5px 8px",
                        background: "var(--surface2)",
                        border: "1px solid var(--border)",
                        borderRadius: 5,
                        fontSize: 9,
                        color: "var(--muted)",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: ".05em",
                        textAlign: "center",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metSemanas.map((s, i) => (
                  <tr
                    key={i}
                    style={{ cursor: "pointer" }}
                    onClick={() => setSemActiva(i)}
                  >
                    <td
                      style={{
                        padding: "6px 8px",
                        fontFamily: "'Bebas Neue'",
                        fontSize: 16,
                        color: "var(--gold)",
                        textAlign: "center",
                        border: "1px solid var(--border)",
                        borderRadius: 5,
                      }}
                    >
                      {s.label}
                    </td>
                    <td
                      style={{
                        padding: "5px 8px",
                        textAlign: "center",
                        border: "1px solid var(--border)",
                        borderRadius: 5,
                        color: "var(--muted)",
                      }}
                    >
                      {s.pct}%
                    </td>
                    <td
                      style={{
                        padding: "5px 8px",
                        textAlign: "center",
                        border: "1px solid var(--border)",
                        borderRadius: 5,
                      }}
                    >
                      {s.plan}
                    </td>
                    <td
                      style={{
                        padding: "5px 8px",
                        textAlign: "center",
                        background: "rgba(232,197,71,.06)",
                        border: "1px solid rgba(232,197,71,.2)",
                        borderRadius: 5,
                        fontFamily: "'Bebas Neue'",
                        fontSize: 16,
                        color: "var(--gold)",
                      }}
                    >
                      {s.volReps || "—"}
                    </td>
                    <td
                      style={{
                        padding: "5px 8px",
                        textAlign: "center",
                        background: "rgba(71,180,232,.06)",
                        border: "1px solid rgba(71,180,232,.2)",
                        borderRadius: 5,
                        fontFamily: "'Bebas Neue'",
                        fontSize: 16,
                        color: "var(--blue)",
                      }}
                    >
                      {s.volKg || "—"}
                    </td>
                    <td
                      style={{
                        padding: "5px 8px",
                        textAlign: "center",
                        background: "rgba(71,232,160,.06)",
                        border: "1px solid rgba(71,232,160,.2)",
                        borderRadius: 5,
                        fontFamily: "'Bebas Neue'",
                        fontSize: 16,
                        color: "var(--green)",
                      }}
                    >
                      {s.pesoMedio || "—"}
                    </td>
                    <td
                      style={{
                        padding: "5px 8px",
                        textAlign: "center",
                        background: "rgba(155,135,232,.06)",
                        border: "1px solid rgba(155,135,232,.2)",
                        borderRadius: 5,
                        fontFamily: "'Bebas Neue'",
                        fontSize: 16,
                        color: "#9b87e8",
                      }}
                    >
                      {s.intMedia ? `${s.intMedia}%` : "—"}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td
                    colSpan={3}
                    style={{
                      padding: "5px 8px",
                      textAlign: "right",
                      fontSize: 9,
                      color: "var(--muted)",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: ".06em",
                      borderTop: "2px solid var(--border)",
                    }}
                  >
                    Total
                  </td>
                  <td
                    style={{
                      padding: "5px 8px",
                      textAlign: "center",
                      background: "rgba(232,197,71,.12)",
                      border: "1px solid rgba(232,197,71,.4)",
                      borderRadius: 5,
                      fontFamily: "'Bebas Neue'",
                      fontSize: 18,
                      color: "var(--gold)",
                      fontWeight: 700,
                    }}
                  >
                    {totMeso.volReps || "—"}
                  </td>
                  <td
                    style={{
                      padding: "5px 8px",
                      textAlign: "center",
                      background: "rgba(71,180,232,.12)",
                      border: "1px solid rgba(71,180,232,.4)",
                      borderRadius: 5,
                      fontFamily: "'Bebas Neue'",
                      fontSize: 18,
                      color: "var(--blue)",
                      fontWeight: 700,
                    }}
                  >
                    {totMeso.volKg || "—"}
                  </td>
                  <td
                    style={{
                      padding: "5px 8px",
                      textAlign: "center",
                      background: "rgba(71,232,160,.12)",
                      border: "1px solid rgba(71,232,160,.4)",
                      borderRadius: 5,
                      fontFamily: "'Bebas Neue'",
                      fontSize: 18,
                      color: "var(--green)",
                      fontWeight: 700,
                    }}
                  >
                    {totMeso.pesoMedio ? `${totMeso.pesoMedio} kg` : "—"}
                  </td>
                  <td
                    style={{
                      padding: "5px 8px",
                      textAlign: "center",
                      background: "rgba(155,135,232,.12)",
                      border: "1px solid rgba(155,135,232,.4)",
                      borderRadius: 5,
                      fontFamily: "'Bebas Neue'",
                      fontSize: 18,
                      color: "#9b87e8",
                      fontWeight: 700,
                    }}
                  >
                    {totMeso.intMedia ? `${totMeso.intMedia}%` : "—"}
                  </td>
                </tr>
              </tbody>
            </table>
            <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 6 }}>
              💡 Click en una fila para ver el detalle por turnos de esa semana
            </div>
          </div>
        </div>
      )}

      {/* Tabla por turno cuando hay semana seleccionada */}
      {semActiva !== null && turnoActivo === null && metTurnos.length > 0 && (
        <div style={cardStyle}>
          <div
            style={{
              fontFamily: "'Bebas Neue'",
              fontSize: 15,
              color: "var(--text)",
              marginBottom: 10,
            }}
          >
            Detalle por turno — Semana {semActiva + 1}
          </div>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                borderCollapse: "separate",
                borderSpacing: "3px 2px",
                width: "100%",
              }}
            >
              <thead>
                <tr>
                  {[
                    "Turno",
                    "Día",
                    "VOL REPs",
                    "VOL Kg",
                    "Peso Medio",
                    "Int. Media",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "5px 8px",
                        background: "var(--surface2)",
                        border: "1px solid var(--border)",
                        borderRadius: 5,
                        fontSize: 9,
                        color: "var(--muted)",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: ".05em",
                        textAlign: "center",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {semVista.turnos.map((t, tIdx) => {
                  const mt = metTurnos.find((x) =>
                    x.label.startsWith(`T${tIdx + 1}`),
                  );
                  if (!mt) return null;
                  return (
                    <tr
                      key={tIdx}
                      style={{ cursor: "pointer" }}
                      onClick={() => setTurnoActivo(tIdx)}
                    >
                      <td
                        style={{
                          padding: "6px 8px",
                          fontFamily: "'Bebas Neue'",
                          fontSize: 16,
                          color: "var(--gold)",
                          textAlign: "center",
                          border: "1px solid var(--border)",
                          borderRadius: 5,
                        }}
                      >
                        T{tIdx + 1}
                      </td>
                      <td
                        style={{
                          padding: "5px 8px",
                          textAlign: "center",
                          border: "1px solid var(--border)",
                          borderRadius: 5,
                          color: "var(--muted)",
                          fontSize: 11,
                        }}
                      >
                        {t.dia || "—"}
                        {t.momento ? ` ${t.momento.slice(0, 1)}` : ""}
                      </td>
                      <td
                        style={{
                          padding: "5px 8px",
                          textAlign: "center",
                          background: "rgba(232,197,71,.06)",
                          border: "1px solid rgba(232,197,71,.2)",
                          borderRadius: 5,
                          fontFamily: "'Bebas Neue'",
                          fontSize: 16,
                          color: "var(--gold)",
                        }}
                      >
                        {mt.volReps || "—"}
                      </td>
                      <td
                        style={{
                          padding: "5px 8px",
                          textAlign: "center",
                          background: "rgba(71,180,232,.06)",
                          border: "1px solid rgba(71,180,232,.2)",
                          borderRadius: 5,
                          fontFamily: "'Bebas Neue'",
                          fontSize: 16,
                          color: "var(--blue)",
                        }}
                      >
                        {mt.volKg || "—"}
                      </td>
                      <td
                        style={{
                          padding: "5px 8px",
                          textAlign: "center",
                          background: "rgba(71,232,160,.06)",
                          border: "1px solid rgba(71,232,160,.2)",
                          borderRadius: 5,
                          fontFamily: "'Bebas Neue'",
                          fontSize: 16,
                          color: "var(--green)",
                        }}
                      >
                        {mt.pesoMedio || "—"}
                      </td>
                      <td
                        style={{
                          padding: "5px 8px",
                          textAlign: "center",
                          background: "rgba(155,135,232,.06)",
                          border: "1px solid rgba(155,135,232,.2)",
                          borderRadius: 5,
                          fontFamily: "'Bebas Neue'",
                          fontSize: 16,
                          color: "#9b87e8",
                        }}
                      >
                        {mt.intMedia ? `${mt.intMedia}%` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 6 }}>
              💡 Click en un turno para ver sus métricas individuales
            </div>
          </div>
        </div>
      )}

      {/* Desglose por grupo */}
      {vistaMetricas.grupoData.length > 0 && (
        <div style={cardStyle}>
          <div
            style={{
              fontFamily: "'Bebas Neue'",
              fontSize: 15,
              color: "var(--text)",
              marginBottom: 14,
            }}
          >
            Distribución por grupo — {vistaLabel}
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "flex-end",
            }}
          >
            {vistaMetricas.grupoData.map((g) => {
              const maxLev = Math.max(
                ...vistaMetricas.grupoData.map((x) => x.lev),
              );
              const pctH = maxLev > 0 ? g.lev / maxLev : 0;
              return (
                <div
                  key={g.name}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    minWidth: 70,
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--muted)",
                      fontFamily: "'Bebas Neue'",
                      letterSpacing: ".05em",
                    }}
                  >
                    {g.lev} reps
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: Math.max(8, Math.round(100 * pctH)),
                      background: g.color,
                      borderRadius: "4px 4px 0 0",
                      transition: "height .3s",
                      opacity: 0.85,
                    }}
                  />
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--muted)",
                      marginTop: 2,
                    }}
                  >
                    {g.ton} kg
                  </div>
                  <div
                    style={{
                      fontFamily: "'Bebas Neue'",
                      fontSize: 13,
                      color: g.color,
                      letterSpacing: ".04em",
                    }}
                  >
                    {g.name.slice(0, 3).toUpperCase()}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--muted)" }}>
                    {g.pct}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function PagePDF({
  meso,
  atleta,
  irm_arr,
  irm_env,
  normativos: normativosProp = null,
  tablas: tablasProp = null,
  hideActions = false,
  onStartTimer = null,
}) {
  const previewRef = React.useRef(null);
  const normativos =
    normativosProp ??
    (() => {
      try {
        return (
          JSON.parse(localStorage.getItem("liftplan_normativos") || "null") ||
          EJERCICIOS
        );
      } catch {
        return EJERCICIOS;
      }
    })();
  const tablas =
    tablasProp ??
    (() => {
      try {
        return (
          JSON.parse(localStorage.getItem("liftplan_tablas") || "null") ||
          TABLA_DEFAULT
        );
      } catch {
        return TABLA_DEFAULT;
      }
    })();
  const repsEditSaved = (() => {
    try {
      return (
        JSON.parse(
          localStorage.getItem(`liftplan_pt_${meso.id}_repsEdit`) || "null",
        ) || {}
      );
    } catch {
      return {};
    }
  })();
  const manualEditSaved = (() => {
    try {
      return new Set(
        JSON.parse(
          localStorage.getItem(`liftplan_pt_${meso.id}_manualEdit`) || "[]",
        ),
      );
    } catch {
      return new Set();
    }
  })();
  const cellEditSaved = (() => {
    try {
      return (
        JSON.parse(
          localStorage.getItem(`liftplan_pt_${meso.id}_cellEdit`) || "null",
        ) || {}
      );
    } catch {
      return {};
    }
  })();
  const cellManualSaved = (() => {
    try {
      return new Set(
        JSON.parse(
          localStorage.getItem(`liftplan_pt_${meso.id}_cellManual`) || "[]",
        ),
      );
    } catch {
      return new Set();
    }
  })();
  const nameEditSaved = (() => {
    try {
      return (
        JSON.parse(
          localStorage.getItem(`liftplan_pt_${meso.id}_nameEdit`) || "null",
        ) || {}
      );
    } catch {
      return {};
    }
  })();
  const noteEditSaved = (() => {
    try {
      return (
        JSON.parse(
          localStorage.getItem(`liftplan_pt_${meso.id}_noteEdit`) || "null",
        ) || {}
      );
    } catch {
      return {};
    }
  })();

  const getRepsVal = (ej, semIdx, tIdx) => {
    const k = `${semIdx}-${tIdx}-${ej.id}`;
    if (manualEditSaved.has(k)) return Number(repsEditSaved[k]) || 0;
    if (ej.reps_asignadas > 0) return ej.reps_asignadas;
    const sem = meso.semanas[semIdx];
    if (!sem) return 0;
    const { porGrupo, totalSem } = calcSembradoSemana(sem);
    const g = getGrupo(ej.ejercicio_id);
    if (!g || totalSem === 0) return 0;
    const pctGSem = porGrupo[g].total / totalSem;
    const pctGTurno = porGrupo[g].porTurno[tIdx] / (porGrupo[g].total || 1);
    const repsBloque = Math.round(
      meso.volumen_total * (sem.pct_volumen / 100) * pctGSem * pctGTurno,
    );
    const ejsG = sem.turnos[tIdx].ejercicios.filter(
      (e) => e.ejercicio_id && getGrupo(e.ejercicio_id) === g,
    );
    if (!ejsG.length) return 0;
    const base = Math.floor(repsBloque / ejsG.length);
    const extra = repsBloque - base * ejsG.length;
    const idx = ejsG.findIndex((e) => e.id === ej.id);
    return base + (idx < extra ? 1 : 0);
  };

  const getCell = (k, intens, field, calc) =>
    cellManualSaved.has(`${k}-${intens}-${field}`)
      ? cellEditSaved[`${k}-${intens}-${field}`]
      : calc;

  const GC = {
    Arranque: "#b8860b",
    Envion: "#1565c0",
    Tirones: "#b71c1c",
    Piernas: "#1b5e20",
    Complementarios: "#4a148c",
  };
  const GB = {
    Arranque: "#fff8e1",
    Envion: "#e3f2fd",
    Tirones: "#ffebee",
    Piernas: "#e8f5e9",
    Complementarios: "#f3e5f5",
  };

  // Calcular métricas resumen por semana
  const isEscuelaPdf = meso.escuela === true || meso.escuela === "true";
  const metricas = meso.semanas.map((sem, semIdx) => {
    let volReps = 0,
      volKg = 0,
      sumIntReps = 0,
      sumIntMed = 0,
      repsConIRM = 0;
    const levGrupo = {
      Arranque: 0,
      Envion: 0,
      Tirones: 0,
      Piernas: 0,
      Complementarios: 0,
    };
    sem.turnos.forEach((t, tIdx) => {
      t.ejercicios
        .filter((e) => e.ejercicio_id)
        .forEach((ej) => {
          const ejData = normativos.find(
            (e) => e.id === Number(ej.ejercicio_id),
          );
          if (!ejData) return;

          let vR = 0,
            vK = 0;

          if (isEscuelaPdf) {
            // Escuela: usar bloques directamente
            (ej.bloques || []).forEach((bloque) => {
              const s = Number(bloque.series) || 0;
              const r = Number(bloque.reps) || 0;
              const rT = Math.round(s) * Math.round(r);
              if (rT === 0) return;
              let kg = bloque.kg != null ? Number(bloque.kg) : null;
              if (kg == null && bloque.pct) {
                const irm =
                  ejData.base === "arranque"
                    ? Number(irm_arr)
                    : Number(irm_env);
                if (irm && ejData.pct_base)
                  kg =
                    Math.round(
                      ((((irm * ejData.pct_base) / 100) * bloque.pct) / 100) *
                        2,
                    ) / 2;
              }
              vR += rT;
              vK += rT * (kg || 0);
              sumIntReps += (bloque.pct || 0) * rT;
            });
          } else {
            const repsVal = getRepsVal(ej, semIdx, tIdx);
            const calcs = calcSeriesRepsKg(
              tablas,
              ej,
              ejData,
              irm_arr,
              irm_env,
              meso.modo,
              repsVal,
            );
            if (!calcs) return;
            INTENSIDADES.forEach((intens, iIdx) => {
              const c = calcs[iIdx];
              if (!c) return;
              const k2 = `${semIdx}-${tIdx}-${ej.id}`;
              const s = getCell(k2, intens, "series", c.series);
              const r = getCell(k2, intens, "reps", c.reps_serie);
              const kg = getCell(k2, intens, "kg", c.kg);
              if (!r) return;
              const sEff = s && s > 0 ? s : 1;
              const rT = Math.round(sEff) * Math.round(r);
              vR += rT;
              vK += rT * (kg || 0);
              sumIntReps += intens * rT;
            });
          }

          volReps += vR;
          volKg += vK;
          const cat = ejData.categoria || "Complementarios";
          levGrupo[cat] = (levGrupo[cat] || 0) + vR;
          const irm2 =
            ejData.base === "arranque" ? Number(irm_arr) : Number(irm_env);
          const kgB =
            irm2 && ejData.pct_base ? (irm2 * ejData.pct_base) / 100 : null;
          if (kgB && vR > 0 && vK > 0) {
            sumIntMed += (vK / vR / kgB) * 100 * vR;
            repsConIRM += vR;
          }
        });
    });
    return {
      volReps,
      volKg: Math.round(volKg),
      pesoMedio: volReps > 0 ? Math.round((volKg / volReps) * 2) / 2 : 0,
      coefInt: volReps > 0 ? Math.round((sumIntReps / volReps) * 10) / 10 : 0,
      intMedia: repsConIRM > 0 ? Math.round(sumIntMed / repsConIRM) : 0,
      levGrupo,
    };
  });

  const totalVolReps = metricas.reduce((a, m) => a + m.volReps, 0);
  const totalVolKg = metricas.reduce((a, m) => a + m.volKg, 0);
  const pesoMedioTotal =
    totalVolReps > 0 ? Math.round((totalVolKg / totalVolReps) * 2) / 2 : 0;

  const hasBlockValue = (value) =>
    value !== null &&
    value !== undefined &&
    value !== "" &&
    !Number.isNaN(value);

  const hasComplementarioBlockContent = (bloque) => {
    if (!bloque) return false;
    return [
      bloque.pct,
      bloque.series,
      bloque.s,
      bloque.reps,
      bloque.r,
      bloque.kg,
      bloque.nota,
      bloque.note,
    ].some(hasBlockValue);
  };

  // Bar chart SVG inline para el resumen
  const BarChartSVG = ({ data, color, width = 200, height = 50 }) => {
    const max = Math.max(...data.map((d) => d.v), 1);
    const bw = (width - data.length * 2) / data.length;
    return (
      <svg
        viewBox={`0 0 ${width} ${height + 20}`}
        width="100%"
        style={{ overflow: "visible", maxWidth: width }}
      >
        {data.map((d, i) => {
          const h = Math.max(2, Math.round((d.v / max) * (height - 4)));
          const x = i * (bw + 2);
          return (
            <g key={i}>
              <rect
                x={x}
                y={height - h}
                width={bw}
                height={h}
                fill={color}
                opacity={0.85}
                rx={2}
              />
              <text
                x={x + bw / 2}
                y={height + 14}
                textAnchor="middle"
                fontSize={7}
                fill="#666"
              >
                {d.l}
              </text>
              {d.v > 0 && (
                <text
                  x={x + bw / 2}
                  y={height - h - 3}
                  textAnchor="middle"
                  fontSize={7}
                  fontWeight="700"
                  fill={color}
                >
                  {d.v}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    );
  };

  // Grupos donut-like horizontal bar
  const GrupoBar = ({ levGrupo }) => {
    const total = Object.values(levGrupo).reduce((a, b) => a + b, 0);
    if (!total) return null;
    const grupos = Object.entries(levGrupo).filter(([, v]) => v > 0);
    return (
      <div style={{ marginTop: 6 }}>
        <div
          style={{
            display: "flex",
            height: 10,
            borderRadius: 4,
            overflow: "hidden",
            gap: 1,
          }}
        >
          {grupos.map(([g, v]) => (
            <div
              key={g}
              style={{
                flex: v,
                background: GC[g],
                title: `${g}: ${v}`,
                minWidth: 2,
              }}
            />
          ))}
        </div>
        <div
          style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}
        >
          {grupos.map(([g, v]) => (
            <div
              key={g}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 3,
                fontSize: 7,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 1,
                  background: GC[g],
                  display: "inline-block",
                }}
              />
              <span style={{ color: "#555" }}>
                {g.slice(0, 3).toUpperCase()}
              </span>
              <span style={{ fontWeight: 700, color: "#1a1a2e" }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Helper para convertir complementario con bloques a row
  const buildComplementarioRow = (comp, semIdx, tIdx) => {
    const ejData = normativos.find((e) => e.id === Number(comp.ejercicio_id));

    const calcKgCompPdf = (pct) => {
      if (!ejData || !ejData.pct_base || pct == null) return null;
      if (pct === 0) return 0;
      const irmVal =
        ejData.base === "arranque" ? Number(irm_arr) : Number(irm_env);
      if (!irmVal) return null;
      return (
        Math.round(((((irmVal * ejData.pct_base) / 100) * pct) / 100) * 2) / 2
      );
    };

    // Los complementarios usan bloques en lugar de intensidades
    const cols = (comp.bloques || [])
      .map((bloque) => {
        const pct = bloque.pct;
        const kgCalc = pct != null ? calcKgCompPdf(pct) : null;
        return {
          pct,
          s: bloque.series,
          r: bloque.reps,
          kg: kgCalc != null ? kgCalc : bloque.kg,
          note: bloque.nota || "",
        };
      })
      .filter(hasComplementarioBlockContent);

    // Si no hay ejData, permitir si hay nombre_custom o aclaracion
    if (!ejData) {
      const hasCustomText = comp.nombre_custom || comp.aclaracion;
      if (!hasCustomText) return null;

      const nombre = resolveExerciseName(comp.nombre_custom, "");
      const aclaracion = comp.aclaracion ? ` (${comp.aclaracion})` : "";

      return {
        id: null,
        nombre: nombre + aclaracion,
        categoria: "Complementarios",
        cols,
        isComplementario: true,
        isCompBloques: true,
      };
    }

    const nombre = resolveExerciseName(comp.nombre_custom, ejData.nombre);
    const aclaracion = comp.aclaracion ? ` (${comp.aclaracion})` : "";

    return {
      id: comp.ejercicio_id,
      nombre: nombre + aclaracion,
      categoria: ejData.categoria,
      cols,
      isComplementario: true,
      isCompBloques: true, // Flag para indicar que usa bloques en lugar de intensidades
    };
  };

  // Helper para convertir ejercicio de pretemporada (ejercicio_ids + bloques) a row
  const buildPretemporadaRow = (ej) => {
    const ejercicio_ids = ej.ejercicio_ids || [];
    const hasAnyEid = ejercicio_ids.some((sub) => sub.eid);
    const hasCustomText = ej.nombre_custom || ej.aclaracion;
    if (!hasAnyEid && !hasCustomText) return null;

    // Build name from ejercicio_ids (same pattern as PlanillaPretemporada's buildAutoName)
    let nombre;
    if (ej.nombre_custom) {
      nombre = resolveExerciseName(ej.nombre_custom, "");
    } else {
      nombre = ejercicio_ids
        .map((sub, i) => {
          const ejData = sub.eid
            ? normativos.find((e) => e.id === Number(sub.eid))
            : null;
          const name = ejData?.nombre || "";
          if (i === 0) return name;
          const sep = sub.link === "c" ? " c/ " : " + ";
          return sep + name;
        })
        .join("");
    }
    const aclaracion = ej.aclaracion ? ` (${ej.aclaracion})` : "";

    // Build combined ID string like "27 + 34" or "27 c 74"
    const idDisplay = ejercicio_ids
      .map((sub, i) => {
        if (!sub.eid) return "";
        if (i === 0) return String(sub.eid);
        const sep = sub.link === "c" ? " c " : " + ";
        return sep + sub.eid;
      })
      .join("");

    // Determine categoria from first valid eid
    let categoria = "Complementarios";
    for (const sub of ejercicio_ids) {
      if (!sub.eid) continue;
      const ejData = normativos.find((e) => e.id === Number(sub.eid));
      if (ejData?.categoria) {
        categoria = ejData.categoria;
        break;
      }
    }

    // Calc kg using LOWEST pct_base among all ejercicio_ids (same as PlanillaPretemporada)
    const calcKgPretempPdf = (pct) => {
      if (!ejercicio_ids || !ejercicio_ids.length || pct == null) return null;
      if (pct === 0) return 0;
      let lowestKgBase = null;
      for (const { eid } of ejercicio_ids) {
        if (!eid) continue;
        const ejData = normativos.find((e) => e.id === Number(eid));
        if (!ejData || !ejData.pct_base) continue;
        const irm =
          ejData.base === "arranque" ? Number(irm_arr) : Number(irm_env);
        if (!irm) continue;
        const kgBase = (irm * ejData.pct_base) / 100;
        if (lowestKgBase === null || kgBase < lowestKgBase)
          lowestKgBase = kgBase;
      }
      if (lowestKgBase === null) return null;
      return Math.round(((lowestKgBase * pct) / 100) * 2) / 2;
    };

    const cols = (ej.bloques || [])
      .map((bloque) => {
        const pct = bloque.pct;
        const kg = pct != null ? calcKgPretempPdf(pct) : bloque.kg;
        return {
          pct,
          s: bloque.series,
          r: bloque.reps,
          kg: kg != null ? kg : bloque.kg,
          note: bloque.nota || "",
        };
      })
      .filter(hasComplementarioBlockContent);

    return {
      id: idDisplay || null,
      nombre: nombre + aclaracion,
      categoria,
      cols,
      isCompBloques: true,
      isPretemporadaRow: true,
    };
  };

  // Helper para convertir ejercicio a row
  const buildEjercicioRow = (ej, semIdx, tIdx, isComplementario = false) => {
    const ejData = normativos.find((e) => e.id === Number(ej.ejercicio_id));
    if (!ejData) return null;
    const k = `${semIdx}-${tIdx}-${ej.id}`;
    const nameKey = `${semIdx}-${tIdx}-${ej.ejercicio_id}`;
    const repsVal = getRepsVal(ej, semIdx, tIdx);
    const calcs = calcSeriesRepsKg(
      tablas,
      ej,
      ejData,
      irm_arr,
      irm_env,
      meso.modo,
      repsVal,
    );
    const cols = INTENSIDADES.map((intens, iIdx) => {
      const c = calcs ? calcs[iIdx] : null;
      const s = getCell(k, intens, "series", c?.series);
      const r = getCell(k, intens, "reps", c?.reps_serie);
      const kg = getCell(k, intens, "kg", c?.kg);
      const noteKey = `${semIdx}-${tIdx}-${ej.id}-${intens}-note`;
      const note = noteEditSaved[noteKey] || "";
      return { intens, s, r, kg, note };
    }).filter((c) => c.s || c.r);
    const nombre = nameEditSaved[nameKey] || ejData.nombre;
    const aclaracion = ej.aclaracion ? ` (${ej.aclaracion})` : "";
    return {
      id: ej.ejercicio_id,
      nombre: nombre + aclaracion,
      categoria: ejData.categoria,
      cols,
      isComplementario,
    };
  };

  // ── Extract exercise data for timer ──
  const extractTimerExercises = (semIdx, tIdx) => {
    if (semIdx == null || tIdx == null) return [];
    const sem = meso.semanas[semIdx];
    if (!sem) return [];
    const turno = sem.turnos[tIdx];
    if (!turno) return [];
    const result = [];

    const pushCompRows = (comps, prefix) => {
      (comps || []).forEach((comp, ci) => {
        if (!comp.ejercicio_id && !comp.nombre_custom && !comp.aclaracion)
          return;
        const row = buildComplementarioRow(comp, semIdx, tIdx);
        if (!row || !row.cols.length) {
          // Si no hay bloques con contenido, al menos agregar la entrada base
          const ejData = comp.ejercicio_id
            ? normativos.find((e) => e.id === Number(comp.ejercicio_id))
            : null;
          const nombre =
            comp.nombre_custom || (ejData ? ejData.nombre : "Ejercicio");
          const acl = comp.aclaracion ? ` (${comp.aclaracion})` : "";
          result.push({
            id: comp.id || `${prefix}-${ci}`,
            name: nombre + acl,
            category: ejData?.categoria || "Complementarios",
            kg: null,
            reps: null,
            series: 3,
            notes: "",
            normativoId: comp.ejercicio_id ? String(comp.ejercicio_id) : undefined,
          });
          return;
        }
        const compId = comp.id || `${prefix}-${ci}`;
        const hasMulti = row.cols.length > 1;
        row.cols.forEach((col, colIdx) => {
          result.push({
            id: compId + (hasMulti ? `-${col.pct || ""}` : ""),
            name: row.nombre + (hasMulti && col.pct ? ` (${col.pct}%)` : ""),
            category: row.categoria,
            kg: col.kg || null,
            reps: col.r ? String(col.r) : null,
            series: col.s || 3,
            notes: col.note || "",
            normativoId: comp.ejercicio_id ? String(comp.ejercicio_id) : undefined,
            ...(hasMulti
              ? {
                  baseId: compId,
                  baseName: row.nombre,
                  intensityLabel: col.pct ? `${col.pct}%` : undefined,
                  intensityIndex: colIdx,
                  totalIntensities: row.cols.length,
                }
              : {}),
          });
        });
      });
    };

    pushCompRows(turno.complementarios_before, "cb");

    if (isPretemp) {
      // Pretemporada: ejercicios usan ejercicio_ids + bloques
      (turno.ejercicios || [])
        .filter(
          (e) =>
            (e.ejercicio_ids && e.ejercicio_ids.some((sub) => sub.eid)) ||
            e.nombre_custom ||
            e.aclaracion,
        )
        .forEach((ej) => {
          const row = buildPretemporadaRow(ej);
          if (!row || !row.cols.length) {
            // Fallback: at least push a basic entry
            result.push({
              id: ej.id || `pretemp-${result.length}`,
              name: row ? row.nombre : ej.nombre_custom || "Ejercicio",
              category: row ? row.categoria : "Complementarios",
              kg: null,
              reps: null,
              series: 3,
              notes: "",
              normativoId: row?.id || undefined,
            });
            return;
          }
          const ptId = ej.id || `pretemp-${result.length}`;
          const hasMulti = row.cols.length > 1;
          row.cols.forEach((col, colIdx) => {
            result.push({
              id: ptId + (hasMulti ? `-${col.pct || ""}` : ""),
              name: row.nombre + (hasMulti && col.pct ? ` (${col.pct}%)` : ""),
              category: row.categoria,
              kg: col.kg || null,
              reps: col.r ? String(col.r) : null,
              series: col.s || 3,
              notes: col.note || "",
              normativoId: row.id || undefined,
              ...(hasMulti
                ? {
                    baseId: ptId,
                    baseName: row.nombre,
                    intensityLabel: col.pct ? `${col.pct}%` : undefined,
                    intensityIndex: colIdx,
                    totalIntensities: row.cols.length,
                  }
                : {}),
            });
          });
        });
    } else if (isEscuelaPdf) {
      // Escuela: usar buildEscuelaRow (bloques)
      turno.ejercicios
        .filter((e) => e.ejercicio_id)
        .forEach((ej) => {
          const row = buildEscuelaRow(ej);
          if (!row || !row.cols.length) return;
          const hasMulti = row.cols.length > 1;
          row.cols.forEach((col, colIdx) => {
            result.push({
              id: ej.id + (hasMulti ? `-${col.pct || ""}` : ""),
              name: row.nombre + (hasMulti && col.pct ? ` (${col.pct}%)` : ""),
              category: row.categoria,
              kg: col.kg || null,
              reps: col.r ? String(col.r) : null,
              series: col.s || 3,
              notes: col.note || "",
              normativoId: ej.ejercicio_id ? String(ej.ejercicio_id) : undefined,
              ...(hasMulti
                ? {
                    baseId: ej.id,
                    baseName: row.nombre,
                    intensityLabel: col.pct ? `${col.pct}%` : undefined,
                    intensityIndex: colIdx,
                    totalIntensities: row.cols.length,
                  }
                : {}),
            });
          });
        });
    } else {
      turno.ejercicios
        .filter((e) => e.ejercicio_id)
        .forEach((ej) => {
          const row = buildEjercicioRow(ej, semIdx, tIdx, false);
          if (!row || !row.cols.length) return;
          const hasMulti = row.cols.length > 1;
          row.cols.forEach((col, colIdx) => {
            result.push({
              id: ej.id + (hasMulti ? `-${col.intens}` : ""),
              name: row.nombre + (hasMulti ? ` (${col.intens}%)` : ""),
              category: row.categoria,
              kg: col.kg || null,
              reps: col.r ? String(col.r) : null,
              series: col.s || 3,
              notes: col.note || "",
              normativoId: ej.ejercicio_id ? String(ej.ejercicio_id) : undefined,
              ...(hasMulti
                ? {
                    baseId: ej.id,
                    baseName: row.nombre,
                    intensityLabel: `${col.intens}%`,
                    intensityIndex: colIdx,
                    totalIntensities: row.cols.length,
                  }
                : {}),
            });
          });
        });
    }

    pushCompRows(turno.complementarios_after, "ca");

    return result;
  };

  const isPretemp = meso.pretemporada === true || meso.pretemporada === "true";

  // Helper para construir row de ejercicio Escuela (bloques)
  const buildEscuelaRow = (ej) => {
    const ejData = normativos.find((e) => e.id === Number(ej.ejercicio_id));
    if (!ejData) return null;
    const cols = (ej.bloques || [])
      .map((bloque) => {
        let kg = bloque.kg != null ? Number(bloque.kg) : null;
        if (kg == null && bloque.pct) {
          const irm =
            ejData.base === "arranque" ? Number(irm_arr) : Number(irm_env);
          if (irm && ejData.pct_base)
            kg =
              Math.round(
                ((((irm * ejData.pct_base) / 100) * bloque.pct) / 100) * 2,
              ) / 2;
        }
        return {
          pct: bloque.pct,
          s: bloque.series,
          r: bloque.reps,
          kg: kg != null ? kg : bloque.kg,
          note: bloque.nota || "",
        };
      })
      .filter(hasComplementarioBlockContent);
    const nombre = ejData.nombre;
    const aclaracion = ej.aclaracion ? ` (${ej.aclaracion})` : "";
    return {
      id: ej.ejercicio_id,
      nombre: nombre + aclaracion,
      categoria: ejData.categoria,
      cols,
      isCompBloques: true,
      isEscuelaRow: true,
    };
  };

  const semTurnos = meso.semanas.map((sem, semIdx) => {
    const turnos = sem.turnos
      .map((t, tIdx) => {
        const rows = [];

        if (isPretemp) {
          // Pretemporada: ejercicios usan ejercicio_ids + bloques
          const ejsPretemp = (t.ejercicios || []).filter(
            (e) =>
              (e.ejercicio_ids && e.ejercicio_ids.some((sub) => sub.eid)) ||
              e.nombre_custom ||
              e.aclaracion,
          );
          if (!ejsPretemp.length) return null;
          ejsPretemp.forEach((ej) => {
            const row = buildPretemporadaRow(ej);
            if (row) rows.push(row);
          });
        } else if (isEscuelaPdf) {
          // Escuela: ejercicios usan ejercicio_id + bloques (sin intensidades)
          const ejs = t.ejercicios.filter((e) => e.ejercicio_id);
          if (!ejs.length) return null;
          ejs.forEach((ej) => {
            const row = buildEscuelaRow(ej);
            if (row) rows.push(row);
          });
        } else {
          // Regular: ejercicios usan ejercicio_id + intensidades
          const ejs = t.ejercicios.filter((e) => e.ejercicio_id);
          const hasEjerciciosPrincipales = ejs.length > 0;
          if (!hasEjerciciosPrincipales) return null;

          // Complementarios ANTES
          if (t.complementarios_before?.length > 0) {
            const compBefore = t.complementarios_before.filter(
              (c) => c.ejercicio_id || c.nombre_custom || c.aclaracion,
            );
            compBefore.forEach((comp) => {
              const row = buildComplementarioRow(comp, semIdx, tIdx);
              if (row) rows.push({ ...row, isComplementarioBefore: true });
            });
          }

          // Ejercicios principales
          ejs.forEach((ej) => {
            const row = buildEjercicioRow(ej, semIdx, tIdx, false);
            if (row) rows.push(row);
          });

          // Complementarios DESPUÉS
          if (t.complementarios_after?.length > 0) {
            const compAfter = t.complementarios_after.filter(
              (c) => c.ejercicio_id || c.nombre_custom || c.aclaracion,
            );
            compAfter.forEach((comp) => {
              const row = buildComplementarioRow(comp, semIdx, tIdx);
              if (row) rows.push({ ...row, isComplementarioAfter: true });
            });
          }
        }

        if (!rows.length) return null;
        return { tIdx, dia: t.dia, momento: t.momento, rows };
      })
      .filter(Boolean);
    return { sem, semIdx, turnos, met: metricas[semIdx] };
  });

  // Medir sem-header y posicionar turno-headers debajo (solo desktop, mobile no usa sticky)
  React.useLayoutEffect(() => {
    const container = previewRef.current;
    if (!container || window.innerWidth <= 768) return;
    container.querySelectorAll(".pdf-page").forEach((page) => {
      const semH = page.querySelector(".pdf-sem-header");
      if (!semH) return;
      const h = semH.offsetHeight;
      page.querySelectorAll(".pdf-turno-header").forEach((t) => {
        t.style.top = h + "px";
      });
    });
  });

  const pdfStyle = `
    @media print {
      body > * { display: none !important; }
      #pdf-preview { display: block !important; position: static !important; }
      .no-print { display: none !important; }
      @page { margin: 10mm; size: A4 landscape; }
    }
    #pdf-preview * { box-sizing: border-box; }
    #pdf-preview {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 9px;
      color: #1a1a2e;
      background: #fff;
      line-height: 1.3;
    }
    .pdf-page {
      width: 100%;
      page-break-after: always;
      padding-bottom: 20px;
    }
    .pdf-page:last-child { page-break-after: avoid; }

    /* ── Portada / header general ── */
    .pdf-cover {
      background: #0d1117;
      color: #fff;
      padding: 18px 20px 16px;
      margin-bottom: 0;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      flex-wrap: wrap;
      gap: 12px;
    }
    .pdf-cover-name {
      font-size: 22px; font-weight: 900; letter-spacing: -.5px;
      color: #fff; line-height: 1.1;
    }
    .pdf-cover-meso {
      font-size: 11px; color: #f0b429; font-weight: 700;
      text-transform: uppercase; letter-spacing: .06em; margin-top: 3px;
    }
    .pdf-cover-sub {
      font-size: 9px; color: #888; margin-top: 6px;
    }
    .pdf-cover-right { text-align: right; }
    .pdf-irm-box {
      display: inline-flex; gap: 16px; margin-top: 8px;
    }
    .pdf-irm-item { text-align: center; }
    .pdf-irm-val {
      font-size: 16px; font-weight: 900; color: #f0b429; line-height: 1;
    }
    .pdf-irm-lbl {
      font-size: 7px; color: #888; text-transform: uppercase;
      letter-spacing: .08em; margin-top: 2px;
    }
    .pdf-accent-bar {
      height: 4px;
      background: linear-gradient(90deg, #f0b429 0%, #e05050 40%, #3090e0 70%, #30c080 100%);
      margin-bottom: 0;
    }

    /* ── Semana header ── */
    .pdf-sem-header {
      display: flex; align-items: stretch; margin-bottom: 10px;
      border: 1px solid #e0e0e0; border-radius: 6px; overflow: hidden;
    }
    .pdf-sem-num {
      display: none;
    }
    .pdf-sem-info { flex: 1; padding: 6px 10px; background: #fafafa; min-width: 0; }
    .pdf-sem-title { font-size: 10px; font-weight: 800; color: #1a1a2e; }
    .pdf-sem-details { font-size: 8px; color: #888; margin-top: 2px; }
    .pdf-sem-metrics {
      display: flex; gap: 1px; background: #e0e0e0;
    }
    .pdf-sem-metric {
      background: #fff; padding: 5px 7px; text-align: center; min-width: 44px;
    }
    .pdf-sem-metric-val {
      font-size: 11px; font-weight: 900; color: #1a1a2e; line-height: 1;
    }
    .pdf-sem-metric-lbl {
      font-size: 6px; color: #999; text-transform: uppercase;
      letter-spacing: .04em; margin-top: 1px;
    }

    /* ── Turno ── */
    .pdf-turno-header {
      background: #0d1117; color: #fff;
      padding: 3px 8px; margin: 6px 0 2px;
      display: flex; align-items: center; gap: 6px;
      border-radius: 3px;
    }
    .pdf-turno-num {
      font-size: 9px; font-weight: 900; color: #f0b429;
      text-transform: uppercase; letter-spacing: .04em;
    }
    .pdf-turno-dia { font-size: 8px; color: #aaa; }

    /* ── Collapsible turnos ── */
    .pdf-turno-header { cursor: pointer; user-select: none; -webkit-tap-highlight-color: transparent; }
    .pdf-turno-chevron {
      margin-left: auto; display: flex; align-items: center;
      transition: transform .25s ease;
      color: #666; flex-shrink: 0;
    }
    .pdf-turno-chevron.open { transform: rotate(180deg); color: #f0b429; }
    .pdf-turno-content {
      overflow: hidden; transition: max-height .3s ease, opacity .2s ease;
      max-height: 0; opacity: 0;
    }
    .pdf-turno-content.expanded {
      max-height: 9999px; opacity: 1;
    }
    @media print {
      .pdf-turno-content { max-height: none !important; opacity: 1 !important; overflow: visible !important; }
      .pdf-turno-chevron { display: none !important; }
      .pdf-sem-tabs-wrap { display: none !important; }
    }

    /* ── Week tabs ── */
    .pdf-sem-tabs-wrap {
      display: flex; align-items: center; gap: 6px;
      padding: 12px 12px; margin-bottom: 16px;
      background: transparent; border: none; border-radius: 0;
      flex-wrap: wrap;
    }
    .pdf-sem-tab {
      padding: 6px 14px; border-radius: 6px; border: 1px solid #1a1f2e;
      font-size: 11px; font-weight: 700; cursor: pointer;
      background: #0d1117; color: #f0b429; transition: all .2s;
      font-family: 'DM Sans', sans-serif;
    }
    .pdf-sem-tab.active {
      background: #0d1117; color: #f0b429; border-color: #f0b429; box-shadow: 0 0 0 1px #f0b429;
    }
    .pdf-sem-tab:hover:not(.active) { background: #161b22; }

    /* ── Tabla ejercicios ── */
    .pdf-table {
      width: 100%; border-collapse: collapse; margin-bottom: 6px;
    }
    .pdf-table thead tr {
      background: #f5f5f5; border-bottom: 2px solid #1a1a2e;
    }
    .pdf-table th {
      padding: 3px 3px; text-align: center;
      font-size: 7px; font-weight: 800; color: #1a1a2e;
      text-transform: uppercase; letter-spacing: .03em;
      border-right: 1px solid #e8e8e8;
    }
    .pdf-table th.left { text-align: left; }
    .pdf-table th.intens-header {
      background: #0d1117; color: #f0b429;
      font-size: 8px; font-weight: 900;
    }
    .pdf-table th.sub-header {
      font-size: 6px; font-weight: 600; color: #888;
      background: #f8f8f8; padding: 1px 2px;
    }
    .pdf-table td {
      padding: 3px 3px; border-bottom: 1px solid #f0f0f0;
      border-right: 1px solid #f0f0f0; text-align: center;
      vertical-align: middle;
    }
    .pdf-table td.left { text-align: left; }
    .pdf-table tr:hover td { background: #fafafa; }
    .pdf-table .grupo-dot {
      width: 6px; height: 6px; border-radius: 50%;
      display: inline-block; margin-right: 5px; vertical-align: middle;
    }
    .pdf-table .ej-nombre {
      font-size: 7.5px; font-weight: 600; color: #1a1a2e;
    }
    .pdf-table .cell-data {
      display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0;
      font-size: 8px; align-items: baseline; overflow: hidden;
    }
    .pdf-table .cell-data .cell-note {
      grid-column: 1 / -1; font-size: 6px; color: #666;
      text-align: center; line-height: 1.1; margin-top: 1px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .pdf-table .cell-series { font-weight: 900; color: #1a1a2e; font-size: 9px; }
    .pdf-table .cell-reps { color: #333; font-size: 8px; font-weight: 600; }
    .pdf-table .cell-kg { color: #888; font-size: 7px; font-weight: 400; }
    .pdf-table .cell-empty { color: #ddd; font-size: 10px; }
    .pdf-table tr.last-ej td { border-bottom: 2px solid #e0e0e0; }

    /* ── Resumen final ── */
    .pdf-resumen-page {
      padding: 24px 0 0;
    }
    .pdf-resumen-title {
      font-size: 14px; font-weight: 900; color: #1a1a2e;
      border-bottom: 2px solid #1a1a2e; padding-bottom: 4px; margin-bottom: 10px;
      text-transform: uppercase; letter-spacing: .05em;
    }
    .pdf-resumen-grid {
      display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; margin-bottom: 16px;
    }
    .pdf-kpi {
      background: #0d1117; padding: 8px 10px; border-radius: 6px;
    }
    .pdf-kpi-val {
      font-size: 17px; font-weight: 900; color: #f0b429; line-height: 1;
    }
    .pdf-kpi-lbl {
      font-size: 6.5px; color: #888; text-transform: uppercase;
      letter-spacing: .06em; margin-top: 2px;
    }
    .pdf-sem-table {
      width: 100%; border-collapse: collapse; margin-bottom: 16px;
    }
    .pdf-sem-table th {
      background: #0d1117; color: #fff; padding: 5px 8px;
      font-size: 8px; font-weight: 700; text-transform: uppercase;
      letter-spacing: .05em; text-align: center;
    }
    .pdf-sem-table td {
      padding: 5px 8px; border-bottom: 1px solid #f0f0f0;
      text-align: center; font-size: 9px;
    }
    .pdf-sem-table tr:last-child td {
      background: #f5f5f5; font-weight: 700; border-top: 2px solid #1a1a2e;
    }
    .pdf-footer {
      display: flex; justify-content: space-between; align-items: center;
      border-top: 1px solid #e0e0e0; padding-top: 6px; margin-top: 8px;
      font-size: 7px; color: #767676;
    }
    .pdf-footer strong { color: #1a1a2e; }

    /* ══════════════════════════════════════════════
       RESPONSIVE — Mobile-first (≤ 768px)
       ══════════════════════════════════════════════ */
    @media screen and (max-width: 768px) {
      #pdf-preview {
        font-size: 13px;
        line-height: 1.45;
      }

      /* ── Portada ── */
      .pdf-cover {
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 20px 16px 16px;
        gap: 6px;
      }
      .pdf-cover > div:first-child {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
      }
      .pdf-cover > div:first-child > div:first-child {
        flex-direction: column !important;
        align-items: center !important;
        gap: 8px !important;
      }
      .pdf-cover-name {
        font-size: 22px;
        word-break: break-word;
        text-align: center;
      }
      .pdf-cover-meso {
        font-size: 13px;
        text-align: center;
        line-height: 1.3;
      }
      .pdf-cover-sub {
        font-size: 11px;
        text-align: center;
      }
      .pdf-cover-right {
        text-align: center;
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        margin-top: 4px;
        padding-top: 10px;
        border-top: 1px solid rgba(255,255,255,.1);
      }
      .pdf-cover-right > div:first-child {
        font-size: 10px;
      }
      .pdf-irm-box {
        gap: 28px;
      }
      .pdf-irm-val {
        font-size: 26px;
      }
      .pdf-irm-lbl {
        font-size: 9px;
      }
      .pdf-cover svg {
        max-width: 180px;
        height: auto;
      }

      /* ── Semana header ── */
      .pdf-sem-header {
        flex-direction: column;
        border-radius: 8px;
        position: relative;
        z-index: 2;
        box-shadow: 0 2px 8px rgba(0,0,0,.15);
        background: #fafafa;
      }
      .pdf-sem-num {
        display: none;
      }
      .pdf-sem-info {
        padding: 10px 12px;
      }
      .pdf-sem-title {
        font-size: 13px;
      }
      .pdf-sem-details {
        font-size: 11px;
        margin-top: 4px;
      }
      .pdf-sem-metrics {
        flex-wrap: wrap;
        gap: 1px;
        border-radius: 0 0 8px 8px;
        overflow: hidden;
      }
      .pdf-sem-metric {
        flex: 1 1 auto;
        min-width: 60px;
        padding: 8px 6px;
      }
      .pdf-sem-metric-val {
        font-size: 15px;
      }
      .pdf-sem-metric-lbl {
        font-size: 8px;
        margin-top: 2px;
      }

      /* ── Turno ── */
      .pdf-turno-header {
        padding: 8px 12px;
        margin: 10px 0 0;
        border-radius: 6px;
        box-shadow: 0 2px 10px rgba(0,0,0,.25);
        position: relative;
        z-index: 2;
      }
      .pdf-turno-content {
        overflow: hidden;
      }
      .pdf-turno-num {
        font-size: 13px;
      }
      .pdf-turno-dia {
        font-size: 11px;
      }
      .pdf-turno-chevron { color: #888; }
      .pdf-turno-chevron.open { color: #f0b429; }

      /* ── Week tabs mobile ── */
      .pdf-sem-tabs-wrap {
        position: relative;
        background: transparent;
        border: none; border-radius: 0;
        margin: 0 0 16px; padding: 14px 4px 0;
        overflow-x: auto; flex-wrap: nowrap;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
        gap: 8px;
      }
      .pdf-sem-tabs-wrap::-webkit-scrollbar { display: none; }
      .pdf-sem-tab {
        font-size: 13px; padding: 10px 20px; white-space: nowrap; flex-shrink: 0;
        background: #0d1117; color: #f0b429;
        border: 1px solid #1a1f2e; border-radius: 8px;
      }
      .pdf-sem-tab.active {
        background: #0d1117; color: #f0b429; border-color: #f0b429; box-shadow: 0 0 0 1px #f0b429;
      }
      .pdf-sem-tab:hover:not(.active) { background: #161b22; }

      /* ── Tabla ejercicios — dark premium cards en móvil ── */
      .pdf-table,
      .pdf-table thead,
      .pdf-table tbody,
      .pdf-table th,
      .pdf-table td,
      .pdf-table tr {
        display: block;
      }
      .pdf-table thead {
        display: none;
      }

      /* Cada ejercicio = una card dark premium */
      .pdf-table tr {
        background: #0d1117;
        border: 1px solid #1e2733;
        border-radius: 10px;
        margin-bottom: 10px;
        padding: 0;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        box-shadow: 0 3px 12px rgba(0,0,0,.28);
      }
      .pdf-table tr.last-ej td {
        border-bottom: none;
      }
      .pdf-table td {
        border: none;
        padding: 0;
        text-align: left;
      }

      /* ID badge + nombre: header de la card */
      .pdf-table td:first-child {
        position: static;
        padding: 0;
        width: 48px;
        min-width: 48px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        align-self: stretch;
      }
      .pdf-table td:first-child span {
        font-size: 9px !important;
        padding: 2px 5px !important;
        border-radius: 3px !important;
        opacity: .8;
      }
      .pdf-table td.left {
        width: auto;
        flex: 1;
        min-width: 0;
        padding: 12px 12px 12px 8px;
        display: flex;
        align-items: center;
        align-self: stretch;
      }
      /* Wrap ID + name in same row */
      .pdf-table tr {
        flex-flow: row wrap;
      }
      .pdf-table td:first-child,
      .pdf-table td.left {
        border-bottom: 1px solid #1e2733;
        background: #0d1117;
      }
      /* Pretemporada merged ID+name cell: override first-child narrow width */
      .pdf-table td.pdf-pretemp-ej {
        width: auto !important;
        min-width: 0 !important;
        flex: 1 !important;
        justify-content: flex-start !important;
        padding: 10px 12px !important;
      }
      .pdf-table .cell-pct-pretemp {
        display: none;
      }
      .pdf-table .ej-nombre {
        font-size: 13px;
        font-weight: 700;
        line-height: 1.2;
        color: #e8e8e8;
        letter-spacing: .01em;
      }

      /* Cada celda de intensidad = una fila dentro de la card */
      .pdf-table td[data-label] {
        display: flex;
        align-items: center;
        padding: 0;
        border-bottom: 1px solid #1a2030;
        gap: 0;
        min-height: 42px;
        width: 100%;
        flex-basis: 100%;
        background: #0f1520 !important;
      }
      .pdf-table td[data-label]:last-child {
        border-bottom: none;
      }

      /* Label del porcentaje — columna fija a la izquierda */
      .pdf-table td[data-label]::before {
        content: attr(data-label);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        min-width: 48px;
        padding: 0;
        background: #0d1117;
        color: #d4a832;
        font-size: 11px;
        font-weight: 700;
        flex-shrink: 0;
        letter-spacing: -.02em;
        align-self: stretch;
        border-right: 1px solid #1e2733;
      }

      /* Cell data: two mini-cards [S×R] [Kg] */
      .pdf-table .cell-data {
        display: flex;
        align-items: center;
        gap: 0;
        font-size: 15px;
        flex: 1;
        padding: 10px 14px;
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        flex-wrap: wrap;
        overflow: visible;
      }
      /* Mini-card for series × reps */
      .pdf-table .cell-series {
        font-size: 15px;
        font-weight: 800;
        color: #fff;
        letter-spacing: -.3px;
      }
      .pdf-table .cell-series::after {
        content: '×';
        font-size: 11px;
        font-weight: 600;
        color: #d4a832;
        margin: 0 2px;
      }
      .pdf-table .cell-reps {
        font-size: 15px;
        font-weight: 800;
        color: #fff;
        letter-spacing: -.3px;
        padding-right: 2px;
      }
      .pdf-table .cell-reps::after {
        content: '';
        margin: 0;
      }
      /* Mini-card for kg */
      .pdf-table .cell-kg {
        font-size: 15px;
        font-weight: 800;
        color: #fff;
        background: #1a1a2e;
        padding: 5px 10px;
        border-radius: 6px;
        white-space: nowrap;
        margin-left: 6px;
      }
      .pdf-table .cell-kg::after {
        content: ' kg';
        font-size: 11px;
        font-weight: 600;
        color: #d4a832;
        margin-left: 2px;
        vertical-align: baseline;
      }
      /* Wrap series+reps in a mini-card too — via parent background trick */
      .pdf-table .cell-data {
        background: transparent;
      }
      .pdf-table .cell-data > .cell-series:first-child,
      .pdf-table .cell-data > .cell-pct-pretemp + .cell-series {
        background: #1a1a2e;
        padding: 5px 0 5px 10px;
        border-radius: 6px 0 0 6px;
        margin-left: 0;
      }
      .pdf-table .cell-data > .cell-reps {
        background: #1a1a2e;
        padding: 5px 10px 5px 0;
        border-radius: 0 6px 6px 0;
      }
      .pdf-table .cell-data .cell-note {
        font-size: 10px;
        white-space: normal;
        overflow: visible;
        text-overflow: unset;
        color: #8a95a8;
        font-style: italic;
        flex-basis: 100%;
        flex-shrink: 1;
        margin-left: 0;
        margin-top: 4px;
        padding-left: 0;
        text-align: left;
        line-height: 1.3;
      }

      /* Empty cells: hide (except pretemporada rows) */
      .pdf-table td[data-label]:has(.cell-empty) {
        display: none;
      }
      .pdf-table tr.pretemporada-row td[data-label]:has(.cell-empty) {
        display: flex;
      }
      .pdf-table tr.pretemporada-row td[data-label]:has(.cell-empty) .cell-empty {
        color: #333;
        font-size: 13px;
        padding: 10px 14px;
      }

      .pdf-table .cell-empty {
        font-size: 14px;
        color: #333;
      }
      .pdf-table .cell-pct-pretemp {
        font-size: 9px;
        font-weight: 700;
        color: #f0b429;
        background: #1a1a2e;
        padding: 3px 6px;
        border-radius: 4px;
        margin-right: 4px;
        white-space: nowrap;
      }

      /* Separator rows */
      .pdf-table tr[style*="height: 2px"],
      .pdf-table tr[style*="height:2px"] {
        height: 0 !important;
        margin: 4px 0;
        background: none !important;
        border: none;
        box-shadow: none;
        padding: 0;
      }
      .pdf-table tr[style*="height: 2px"] td,
      .pdf-table tr[style*="height:2px"] td {
        padding: 0;
        height: 0;
      }

      /* ── Páginas ── */
      .pdf-page {
        padding: 0 8px 20px !important;
        page-break-after: auto;
      }

      /* ── Resumen ── */
      .pdf-resumen-page {
        padding: 16px 8px 20px !important;
      }
      .pdf-resumen-title {
        font-size: 16px;
        margin-bottom: 12px;
      }
      .pdf-resumen-grid {
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .pdf-kpi {
        padding: 12px 14px;
        border-radius: 8px;
      }
      .pdf-kpi-val {
        font-size: 22px;
      }
      .pdf-kpi-lbl {
        font-size: 9px;
        margin-top: 4px;
      }

      /* ── Tabla resumen por semana ── */
      .pdf-sem-table {
        display: block;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }
      .pdf-sem-table th {
        font-size: 9px;
        padding: 8px 6px;
        white-space: nowrap;
      }
      .pdf-sem-table td {
        font-size: 12px;
        padding: 8px 6px;
        white-space: nowrap;
      }

      /* ── Footer ── */
      .pdf-footer {
        flex-direction: column;
        gap: 4px;
        align-items: flex-start;
        font-size: 10px;
        padding-top: 10px;
        margin-top: 16px;
        position: relative;
        z-index: 3;
      }
    }

    /* ══ Extra-small screens (≤ 400px) ══ */
    @media screen and (max-width: 400px) {
      .pdf-cover-name {
        font-size: 17px;
      }
      .pdf-resumen-grid {
        grid-template-columns: 1fr;
      }
      .pdf-table td[data-label]::before {
        width: 40px;
        min-width: 40px;
        font-size: 10px;
      }
      .pdf-table .cell-series,
      .pdf-table .cell-reps {
        font-size: 14px;
      }
      .pdf-table .cell-kg {
        font-size: 14px;
      }
    }

    /* ══ Mobile bottom navigation bar ══ */
    .pdf-mobile-nav {
      display: none;
    }
    @media screen and (max-width: 768px) {
      .pdf-mobile-nav {
        display: flex;
        flex-direction: column;
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 100;
        background: #0d1117;
        border-top: 1px solid rgba(240,180,41,.18);
        padding: 10px 12px 0;
        padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 36px);
        gap: 0;
        align-items: stretch;
        box-shadow: 0 -4px 20px rgba(0,0,0,.45);
        transition: transform .35s ease, opacity .35s ease;
      }
      .pdf-mobile-nav.mob-nav-hidden {
        transform: translateY(100%);
        opacity: 0;
        pointer-events: none;
      }
      .pdf-mobile-nav-row {
        display: flex;
        gap: 0;
        align-items: stretch;
        width: 100%;
        background: rgba(26,32,48,.7);
        border-radius: 10px;
        overflow: hidden;
        border: 1px solid rgba(255,255,255,.06);
      }
      .pdf-mobile-nav-pill {
        flex: 1;
        padding: 10px 4px;
        border-radius: 0;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: .02em;
        border: none;
        cursor: pointer;
        font-family: 'DM Sans', sans-serif;
        transition: all .2s ease;
        background: transparent;
        color: rgba(138,149,168,.7);
        position: relative;
        text-align: center;
        -webkit-tap-highlight-color: transparent;
      }
      .pdf-mobile-nav-pill + .pdf-mobile-nav-pill {
        border-left: 1px solid rgba(255,255,255,.04);
      }
      .pdf-mobile-nav-pill.active {
        background: rgba(240,180,41,.12);
        color: #f0b429;
      }
      .pdf-mobile-nav-pill.active::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 20%;
        right: 20%;
        height: 2px;
        background: #f0b429;
        border-radius: 2px 2px 0 0;
      }
      .pdf-mobile-nav-turnos {
        display: flex;
        gap: 6px;
        width: 100%;
        justify-content: center;
        padding-top: 8px;
        margin-top: 8px;
      }
      .pdf-mobile-nav-turno {
        flex: 1;
        max-width: 120px;
        padding: 7px 6px;
        border-radius: 8px;
        font-size: 11px;
        font-weight: 600;
        border: 1px solid rgba(255,255,255,.06);
        cursor: pointer;
        font-family: 'DM Sans', sans-serif;
        background: rgba(26,32,48,.6);
        color: rgba(138,149,168,.8);
        transition: all .15s;
        text-align: center;
        -webkit-tap-highlight-color: transparent;
      }
      .pdf-mobile-nav-turno:active,
      .pdf-mobile-nav-turno.active {
        background: rgba(240,180,41,.15);
        color: #f0b429;
        border-color: rgba(240,180,41,.3);
      }
      /* Disable exercise row hover on mobile */
      .pdf-table tr:hover td {
        background: inherit !important;
      }
      /* Floating indicator when nav is hidden */
      .mob-nav-indicator {
        position: fixed;
        bottom: calc(env(safe-area-inset-bottom, 0px) + 100px);
        right: 12px;
        z-index: 99;
        background: #0d1117;
        border: 1px solid rgba(240,180,41,.3);
        border-radius: 20px;
        padding: 6px 14px;
        font-size: 12px;
        font-weight: 700;
        font-family: 'DM Sans', sans-serif;
        color: #f0b429;
        cursor: pointer;
        box-shadow: 0 4px 16px rgba(0,0,0,.5);
        transition: opacity .25s ease, transform .25s ease;
        -webkit-tap-highlight-color: transparent;
        opacity: 1;
        transform: translateY(0);
      }
      .mob-nav-indicator.hidden {
        opacity: 0;
        transform: translateY(20px);
        pointer-events: none;
      }
      /* Padding inferior para que el contenido no quede tapado por la barra */
      #pdf-preview {
        padding-bottom: 80px !important;
      }
    }
  `;

  const [sharing, setSharing] = useState(false);

  const [shareStatus, setShareStatus] = useState("");
  const [downloading, setDownloading] = useState(false);

  // ── Mobile navigation state ──
  const [isMob, setIsMob] = useState(
    typeof window !== "undefined" && window.innerWidth <= 768,
  );
  const [mobNavActive, setMobNavActive] = useState(0);
  const [mobNavTurnos, setMobNavTurnos] = useState(true);
  const [mobActiveTurno, setMobActiveTurno] = useState(-1);
  const [mobNavHidden, setMobNavHidden] = useState(false);
  const mobNavTimerRef = React.useRef(null);

  // ── Collapsible turnos + week filter ──
  const [pdfActiveSem, setPdfActiveSem] = useState(() => {
    const idx = (meso.semanas || []).findIndex((sem) =>
      (sem.turnos || []).some((t) =>
        (t.ejercicios || []).some(
          (e) =>
            e.ejercicio_id ||
            (e.ejercicio_ids && e.ejercicio_ids.some((sub) => sub.eid)),
        ),
      ),
    );
    return idx >= 0 ? idx : 0;
  });
  const [expandedTurnos, setExpandedTurnos] = useState(new Set());

  const toggleTurno = (key) =>
    setExpandedTurnos((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const toggleAllTurnos = (semIdx, turnos) => {
    setExpandedTurnos((prev) => {
      const next = new Set(prev);
      const allExpanded = turnos.every((t) => next.has(`${semIdx}-${t.tIdx}`));
      turnos.forEach((t) => {
        const k = `${semIdx}-${t.tIdx}`;
        allExpanded ? next.delete(k) : next.add(k);
      });
      return next;
    });
  };

  // Detect mobile on resize
  React.useEffect(() => {
    const check = () => setIsMob(window.innerWidth <= 768);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Auto-hide mobile nav after 1s of no scrolling (athlete view only)
  React.useEffect(() => {
    if (!isMob || !hideActions) return;
    const onScroll = () => {
      setMobNavHidden(false);
      clearTimeout(mobNavTimerRef.current);
      mobNavTimerRef.current = setTimeout(() => setMobNavHidden(true), 1000);
    };
    // Start the initial timer
    mobNavTimerRef.current = setTimeout(() => setMobNavHidden(true), 1000);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(mobNavTimerRef.current);
    };
  }, [isMob, hideActions]);

  // Track which semana is currently visible via IntersectionObserver
  React.useEffect(() => {
    if (!isMob) return;
    const container = previewRef.current;
    if (!container) return;
    const pages = container.querySelectorAll(".pdf-page[data-sem-idx]");
    if (!pages.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const idx = parseInt(e.target.dataset.semIdx, 10);
            if (!isNaN(idx)) setMobNavActive(idx);
          }
        });
      },
      { rootMargin: "-10% 0px -70% 0px", threshold: 0 },
    );
    pages.forEach((p) => observer.observe(p));
    return () => observer.disconnect();
  }, [isMob]);

  // Track which turno is currently visible via IntersectionObserver
  React.useEffect(() => {
    if (!isMob) return;
    const container = previewRef.current;
    if (!container) return;
    const turnoEls = container.querySelectorAll(".pdf-turno-header[id]");
    if (!turnoEls.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const parts = e.target.id.match(/^pdf-turno-(\d+)-(\d+)$/);
            if (parts) {
              const tIdx = parseInt(parts[2], 10);
              setMobActiveTurno(tIdx);
              setMobNavTurnos(true);
            }
          }
        });
      },
      { rootMargin: "-10% 0px -70% 0px", threshold: 0 },
    );
    turnoEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [isMob]);

  const handleShareWhatsApp = () => {
    const phone = atleta.telefono ? atleta.telefono.replace(/\D/g, "") : "";
    const nombre = atleta.nombre;
    const msoNombre = meso.nombre || "Mesociclo";
    const msg = encodeURIComponent(
      `Hola ${nombre}! Te envío tu planilla: *${msoNombre}* 💪`,
    );
    const waUrl = phone
      ? `https://wa.me/${phone}?text=${msg}`
      : `https://wa.me/?text=${msg}`;
    window.open(waUrl, "_blank");
  };

  const handleDownload = () => {
    setDownloading(true);
    try {
      const previewEl = previewRef.current;
      if (!previewEl) return;

      // Temporarily expand all turnos and show all weeks for capture
      const turnoContents = previewEl.querySelectorAll(".pdf-turno-content");
      turnoContents.forEach((el) => el.classList.add("expanded"));
      const chevrons = previewEl.querySelectorAll(".pdf-turno-chevron");
      chevrons.forEach((el) => el.classList.add("open"));
      // Show all pdf-page
      const pages = previewEl.querySelectorAll(".pdf-page");
      pages.forEach((p) => {
        p.style.display = "";
      });

      // Setear top de turno-headers antes de capturar el HTML
      previewEl.querySelectorAll(".pdf-page").forEach((page) => {
        const semH = page.querySelector(".pdf-sem-header");
        if (!semH) return;
        const h = semH.offsetHeight;
        page.querySelectorAll(".pdf-turno-header").forEach((t) => {
          t.style.top = h + "px";
        });
      });
      // Construir HTML con estilos completos
      const style = Array.from(document.querySelectorAll("style"))
        .map((s) => s.innerHTML)
        .join("\n");
      const capturedHTML = previewEl.outerHTML;

      // Restore current state
      turnoContents.forEach((el) => {
        const turnoHeader = el.previousElementSibling;
        const turnoId = turnoHeader?.id || "";
        const parts = turnoId.match(/^pdf-turno-(\d+)-(\d+)$/);
        if (parts) {
          const k = `${parts[1]}-${parts[2]}`;
          if (!expandedTurnos.has(k)) {
            el.classList.remove("expanded");
          }
        }
      });
      chevrons.forEach((el) => {
        const header = el.closest(".pdf-turno-header");
        const turnoId = header?.id || "";
        const parts = turnoId.match(/^pdf-turno-(\d+)-(\d+)$/);
        if (parts) {
          const k = `${parts[1]}-${parts[2]}`;
          if (!expandedTurnos.has(k)) {
            el.classList.remove("open");
          }
        }
      });
      // Restore page visibility to show only active semana
      pages.forEach((p) => {
        const pIdx = parseInt(p.dataset.semIdx, 10);
        if (!isNaN(pIdx) && pIdx !== pdfActiveSem) p.style.display = "none";
      });

      const html = `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,maximum-scale=5"/>
<meta name="apple-mobile-web-app-capable" content="yes"/>
<meta name="mobile-web-app-capable" content="yes"/>
<meta name="theme-color" content="#0d1117"/>
<title>${atleta.nombre} — ${meso.nombre || "Mesociclo"}</title>
<style>
html{-webkit-text-size-adjust:100%;text-size-adjust:100%}
body{margin:0;padding:0;background:#fff;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;
  padding-top:env(safe-area-inset-top,0px);
  padding-left:env(safe-area-inset-left,0px);
  padding-right:env(safe-area-inset-right,0px);
  padding-bottom:env(safe-area-inset-bottom,0px);
}
@media screen and (min-width:769px){body{padding:16px}}
@media screen and (max-width:768px){
  body{padding-top:calc(env(safe-area-inset-top,0px) + 52px);padding-left:0;padding-right:0;padding-bottom:0}
  .pdf-sem-header{top:calc(env(safe-area-inset-top,0px) + 52px)!important}
}
@media print{@page{size:A4 landscape;margin:8mm}body{padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}.pdf-sem-header{top:0!important}}
${pdfStyle}
</style>
</head>
<body>
${capturedHTML}
<script>
// Posicionar turno sticky debajo de semana header, considerando offset de barra de visor
function updateStickyTurnos(){
  var isMobile=window.innerWidth<=768;
  var barOffset=isMobile?52:0;
  document.querySelectorAll('.pdf-page').forEach(function(page){
    var semH=page.querySelector('.pdf-sem-header');
    if(!semH)return;
    if(isMobile)semH.style.top=barOffset+'px';
    var h=semH.offsetHeight+barOffset;
    page.querySelectorAll('.pdf-turno-header').forEach(function(t){
      t.style.top=h+'px';
    });
  });
}
updateStickyTurnos();
window.addEventListener('resize',updateStickyTurnos);
window.addEventListener('load',updateStickyTurnos);

// Collapsible turnos
document.querySelectorAll('.pdf-turno-header').forEach(function(header){
  // Start all collapsed
  var content=header.nextElementSibling;
  if(content&&content.classList.contains('pdf-turno-content')){
    content.classList.remove('expanded');
    var chev=header.querySelector('.pdf-turno-chevron');
    if(chev)chev.classList.remove('open');
  }
  header.addEventListener('click',function(){
    var c=this.nextElementSibling;
    if(!c||!c.classList.contains('pdf-turno-content'))return;
    var chev=this.querySelector('.pdf-turno-chevron');
    c.classList.toggle('expanded');
    if(chev)chev.classList.toggle('open');
  });
});

// Week tabs
(function(){
  var tabs=document.querySelectorAll('.pdf-sem-tab');
  var pages=document.querySelectorAll('.pdf-page[data-sem-idx]');
  if(!tabs.length||!pages.length)return;
  // Show only first week initially
  pages.forEach(function(p,i){p.style.display=i===0?'':'none'});
  tabs.forEach(function(tab){
    tab.addEventListener('click',function(){
      var idx=parseInt(this.dataset.semIdx||this.getAttribute('data-sem-idx'));
      tabs.forEach(function(t){t.classList.remove('active')});
      this.classList.add('active');
      pages.forEach(function(p){
        var pIdx=parseInt(p.dataset.semIdx);
        p.style.display=pIdx===idx?'':'none';
      });
    });
  });
  // Expand/collapse all button
  var toggleBtn=document.querySelector('.pdf-sem-tabs-actions button');
  if(toggleBtn){
    toggleBtn.addEventListener('click',function(){
      var activePage=document.querySelector('.pdf-page[data-sem-idx]:not([style*="display: none"])');
      if(!activePage)return;
      var contents=activePage.querySelectorAll('.pdf-turno-content');
      var allExp=Array.from(contents).every(function(c){return c.classList.contains('expanded')});
      contents.forEach(function(c){
        c.classList.toggle('expanded',!allExp);
        var h=c.previousElementSibling;
        if(h){var chev=h.querySelector('.pdf-turno-chevron');if(chev)chev.classList.toggle('open',!allExp);}
      });
      this.textContent=allExp?'Expandir todos':'Colapsar todos';
    });
  }
})();
</script>
</body></html>`;
      // Crear blob y link de descarga — funciona en la mayoría de browsers modernos
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${atleta.nombre.replace(/\s+/g, "_")}_${(meso.nombre || "Meso").replace(/\s+/g, "_")}.html`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) {
      alert(
        'Para guardar el PDF: usá el botón del browser "Compartir → Imprimir → Guardar como PDF"',
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      <style>{pdfStyle}</style>

      {/* Barra de acciones */}
      {!hideActions && (
        <div
          className="no-print"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
            padding: "14px 20px",
            flexWrap: "wrap",
            gap: 10,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'Bebas Neue'",
                fontSize: 18,
                color: "var(--gold)",
                letterSpacing: ".05em",
              }}
            >
              Vista previa — Planilla del atleta
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
              Usá "Guardar como PDF" en el diálogo de impresión · Orientación
              horizontal A4
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={handleShareWhatsApp}
              disabled={sharing}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 18px",
                background:
                  shareStatus === "error"
                    ? "#e53935"
                    : shareStatus === "done"
                      ? "#43a047"
                      : sharing
                        ? "var(--surface3)"
                        : "#25D366",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                cursor: sharing ? "default" : "pointer",
                fontFamily: "'DM Sans'",
                fontSize: 13,
                fontWeight: 600,
                opacity: sharing ? 0.85 : 1,
                transition: "all .3s",
                minWidth: 200,
                justifyContent: "center",
              }}
            >
              {sharing ? (
                <>
                  <Download
                    size={15}
                    style={{ animation: "spin 1s linear infinite" }}
                  />{" "}
                  Generando PDF...
                </>
              ) : shareStatus === "done" ? (
                <>
                  <Send size={15} /> Enviado
                </>
              ) : shareStatus === "error" ? (
                "Error — reintentando..."
              ) : (
                <>
                  <MessageCircle size={15} /> Enviar por WhatsApp
                </>
              )}
            </button>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="btn btn-gold"
              style={{
                gap: 8,
                padding: "10px 18px",
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                opacity: downloading ? 0.7 : 1,
                transition: "all .2s",
              }}
            >
              <Download
                size={15}
                style={
                  downloading ? { animation: "spin 1s linear infinite" } : {}
                }
              />
              {downloading ? "Generando..." : "Descargar PDF"}
            </button>
          </div>
        </div>
      )}

      {/* Preview */}
      <div
        ref={previewRef}
        id="pdf-preview"
        style={{
          background: "#fff",
          borderRadius: 12,
          border: "1px solid var(--border)",
          boxShadow: "0 8px 40px rgba(0,0,0,.4)",
        }}
      >
        {/* ── PORTADA / HEADER ── */}
        <div className="pdf-cover">
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 4,
              }}
            >
              <div
                dangerouslySetInnerHTML={{
                  __html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 220" width="200" height="73"><defs><linearGradient id="pc-g" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#f5d96a"/><stop offset="40%" stop-color="#e8c547"/><stop offset="100%" stop-color="#b8941e"/></linearGradient><linearGradient id="pc-gh" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#604800"/><stop offset="50%" stop-color="#f5d96a"/><stop offset="100%" stop-color="#604800"/></linearGradient><filter id="pc-glow"><feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#e8c547" flood-opacity="0.4"/></filter></defs><rect x="40" y="20" width="520" height="1.5" rx="1" fill="url(#pc-gh)" opacity="0.7"/><rect x="40" y="200" width="520" height="1.5" rx="1" fill="url(#pc-gh)" opacity="0.7"/><rect x="40" y="20" width="22" height="2" fill="#e8c547"/><rect x="40" y="20" width="2" height="22" fill="#e8c547"/><rect x="538" y="20" width="22" height="2" fill="#e8c547"/><rect x="558" y="20" width="2" height="22" fill="#e8c547"/><rect x="40" y="198" width="22" height="2" fill="#e8c547"/><rect x="40" y="176" width="2" height="24" fill="#e8c547"/><rect x="538" y="198" width="22" height="2" fill="#e8c547"/><rect x="558" y="176" width="2" height="24" fill="#e8c547"/><text x="300" y="78" font-family="Bebas Neue,Impact,Arial Black,sans-serif" font-size="26" letter-spacing="16" fill="url(#pc-g)" text-anchor="middle" filter="url(#pc-glow)">SISTEMA</text><rect x="190" y="88" width="220" height="1" rx="1" fill="#e8c547" opacity="0.4"/><text x="300" y="178" font-family="Bebas Neue,Impact,Arial Black,sans-serif" font-size="100" letter-spacing="2" fill="url(#pc-g)" text-anchor="middle" filter="url(#pc-glow)">IRONLIFTING</text></svg>`,
                }}
              />
              <div>
                <div className="pdf-cover-name">
                  {atleta.nombre.toUpperCase()}
                </div>
              </div>
            </div>
            <div className="pdf-cover-meso">
              {meso.nombre ||
                (isPretemp ? "Pretemporada" : "Mesociclo de Entrenamiento")}
            </div>
            <div className="pdf-cover-sub">
              {formatDateDisplay(meso.fecha_inicio)}
              {!isPretemp && meso.modo ? <>&nbsp;·&nbsp; {meso.modo}</> : null}
              {!isPretemp && meso.volumen_total ? (
                <>
                  &nbsp;·&nbsp; {meso.volumen_total.toLocaleString()} reps
                  totales
                </>
              ) : null}
            </div>
          </div>
          <div className="pdf-cover-right">
            <div
              style={{
                fontSize: 8,
                color: "#888",
                textTransform: "uppercase",
                letterSpacing: ".08em",
                marginBottom: 6,
              }}
            >
              Marcas personales
            </div>
            <div className="pdf-irm-box">
              {irm_arr && (
                <div className="pdf-irm-item">
                  <div className="pdf-irm-val">{irm_arr}</div>
                  <div className="pdf-irm-lbl">Arranque kg</div>
                </div>
              )}
              {irm_env && (
                <div className="pdf-irm-item">
                  <div className="pdf-irm-val" style={{ color: "#3090e0" }}>
                    {irm_env}
                  </div>
                  <div className="pdf-irm-lbl">Envión kg</div>
                </div>
              )}
            </div>
            <div style={{ fontSize: 7, color: "#555", marginTop: 10 }}>
              {formatDateDisplay(new Date().toISOString().slice(0, 10))}
            </div>
          </div>
        </div>
        <div className="pdf-accent-bar" />

        {/* ── WEEK TABS ── */}
        {(() => {
          const validSems = semTurnos.filter((s) => s.turnos.length > 0);
          if (validSems.length <= 1) return null;
          // Compute offsets for pretemporada
          const tabOffsets = [];
          let tabCum = 0;
          (meso.semanas || []).forEach((s) => {
            tabOffsets.push(tabCum);
            tabCum += (s.turnos || []).length;
          });
          const activeSemData =
            validSems.find((s) => s.semIdx === pdfActiveSem) || validSems[0];
          const activeTurnos = activeSemData?.turnos || [];
          const allExpanded = activeTurnos.every((t) =>
            expandedTurnos.has(`${activeSemData.semIdx}-${t.tIdx}`),
          );
          return (
            <div className="pdf-sem-tabs-wrap no-print">
              {validSems.map(({ sem, semIdx: sIdx }) => {
                const off = tabOffsets[sIdx] || 0;
                const first = off + 1;
                const last = off + (sem.turnos || []).length;
                return (
                  <button
                    key={sIdx}
                    data-sem-idx={sIdx}
                    className={`pdf-sem-tab${pdfActiveSem === sIdx ? " active" : ""}`}
                    onClick={() => {
                      setPdfActiveSem(sIdx);
                      setMobNavActive(sIdx);
                      setMobActiveTurno(-1);
                    }}
                  >
                    {isPretemp ? `T${first}-${last}` : `Semana ${sem.numero}`}
                  </button>
                );
              })}
            </div>
          );
        })()}

        {/* ── SEMANAS ── */}
        {(() => {
          // Compute cumulative turno offsets per semana for pretemporada labeling
          const turnoOffsets = [];
          let cumTurnos = 0;
          (meso.semanas || []).forEach((s) => {
            turnoOffsets.push(cumTurnos);
            cumTurnos += (s.turnos || []).length;
          });
          // Render all semanas, hide inactive ones (so download captures all)
          return semTurnos.map(({ sem, semIdx, turnos, met }) => {
            if (!turnos.length) return null;
            const tOff = turnoOffsets[semIdx] || 0;
            const tFirst = tOff + 1;
            const tLast = tOff + (sem.turnos || []).length;
            const isActiveSem = semIdx === pdfActiveSem;
            return (
              <div
                key={sem.id}
                id={`pdf-sem-${semIdx}`}
                data-sem-idx={semIdx}
                className="pdf-page"
                style={{
                  padding: "0 12px 16px",
                  display: isActiveSem ? undefined : "none",
                }}
              >
                {/* Sem header */}
                <div className="pdf-sem-header">
                  <div className="pdf-sem-info">
                    <div className="pdf-sem-title">
                      {isPretemp
                        ? `TURNOS ${tFirst}-${tLast}`
                        : `SEMANA ${sem.numero}`}
                      {!isPretemp &&
                        (() => {
                          const fechaSem = getFechaSemanaEfectiva(
                            meso.fecha_inicio,
                            sem,
                          );
                          return fechaSem ? (
                            <span
                              style={{
                                fontWeight: 400,
                                fontSize: 9,
                                color: "#666",
                                marginLeft: 8,
                              }}
                            >
                              {formatFechaSemana(fechaSem)}
                            </span>
                          ) : null;
                        })()}
                    </div>
                    {isPretemp ? (
                      <div className="pdf-sem-details">
                        {turnos.length} turno{turnos.length !== 1 ? "s" : ""}
                      </div>
                    ) : isEscuelaPdf ? (
                      <>
                        <div className="pdf-sem-details">
                          Escuela Inicial · Nivel {meso.escuela_nivel || "—"}
                        </div>
                        {met && <GrupoBar levGrupo={met.levGrupo} />}
                      </>
                    ) : (
                      <>
                        <div className="pdf-sem-details">
                          {sem.pct_volumen}% del volumen total &nbsp;·&nbsp;
                          {sem.reps_ajustadas ||
                            sem.reps_calculadas ||
                            Math.round(
                              (meso.volumen_total * sem.pct_volumen) / 100,
                            )}{" "}
                          reps planificadas
                        </div>
                        {met && <GrupoBar levGrupo={met.levGrupo} />}
                      </>
                    )}
                  </div>
                  {!isPretemp && (
                    <div className="pdf-sem-metrics">
                      {met?.volReps > 0 && (
                        <>
                          <div className="pdf-sem-metric">
                            <div className="pdf-sem-metric-val">
                              {met.volReps}
                            </div>
                            <div className="pdf-sem-metric-lbl">Vol. Reps</div>
                          </div>
                          <div className="pdf-sem-metric">
                            <div className="pdf-sem-metric-val">
                              {met.volKg}
                            </div>
                            <div className="pdf-sem-metric-lbl">Vol. Kg</div>
                          </div>
                          <div className="pdf-sem-metric">
                            <div className="pdf-sem-metric-val">
                              {met.pesoMedio}
                            </div>
                            <div className="pdf-sem-metric-lbl">Peso Medio</div>
                          </div>
                          {met.intMedia > 0 && (
                            <div className="pdf-sem-metric">
                              <div className="pdf-sem-metric-val">
                                {met.intMedia}%
                              </div>
                              <div className="pdf-sem-metric-lbl">
                                Int. Media
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Turnos */}
                {turnos.map(({ tIdx, dia, momento, rows }) => {
                  const turnoKey = `${semIdx}-${tIdx}`;
                  const isExpanded = expandedTurnos.has(turnoKey);
                  return (
                    <React.Fragment key={tIdx}>
                      <div
                        className="pdf-turno-header"
                        id={`pdf-turno-${semIdx}-${tIdx}`}
                        style={{ display: "flex", alignItems: "center" }}
                      >
                        <div
                          onClick={() => toggleTurno(turnoKey)}
                          style={{
                            flex: 1,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            cursor: "pointer",
                          }}
                        >
                          <span className="pdf-turno-num">
                            Turno {isPretemp ? tOff + tIdx + 1 : tIdx + 1}
                          </span>
                          {dia && (
                            <span className="pdf-turno-dia">
                              {dia}
                              {momento ? ` · ${momento}` : ""}
                            </span>
                          )}
                          <span
                            className={`pdf-turno-chevron${isExpanded ? " open" : ""}`}
                          >
                            <ChevronDown size={14} />
                          </span>
                        </div>
                        {onStartTimer && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const exercises = extractTimerExercises(
                                semIdx,
                                tIdx,
                              );
                              if (exercises.length > 0)
                                onStartTimer(exercises, {
                                  semana: semIdx + 1,
                                  turno: isPretemp ? tOff + tIdx + 1 : tIdx + 1,
                                  dia: dia || null,
                                  momento: momento || null,
                                });
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                              padding: "4px 12px",
                              borderRadius: 6,
                              border: "1px solid #47e8a0",
                              background: "rgba(71,232,160,.12)",
                              color: "#47e8a0",
                              cursor: "pointer",
                              fontFamily: "'Bebas Neue'",
                              fontSize: 12,
                              letterSpacing: ".05em",
                              flexShrink: 0,
                              transition: "all .2s",
                            }}
                          >
                            <Timer size={13} /> ENTRENAR
                          </button>
                        )}
                      </div>

                      <div
                        className={`pdf-turno-content${isExpanded ? " expanded" : ""}`}
                      >
                        <div
                          style={{
                            overflowX: "auto",
                            WebkitOverflowScrolling: "touch",
                          }}
                        >
                          <table className="pdf-table">
                            <thead>
                              <tr>
                                <th style={{ width: 20 }} className="left" />
                                <th className="left" style={{ minWidth: 130 }}>
                                  Ejercicio
                                </th>
                                {(() => {
                                  // Detectar si tenemos complementarios con bloques
                                  const hasCompBloques = rows.some(
                                    (r) => r.isCompBloques,
                                  );
                                  const hasRegularIntensidades = rows.some(
                                    (r) => !r.isCompBloques,
                                  );
                                  const hasPretemporadaRows = rows.some(
                                    (r) => r.isPretemporadaRow,
                                  );
                                  const hasEscuelaRows = rows.some(
                                    (r) => r.isEscuelaRow,
                                  );
                                  const hasPctCol =
                                    hasPretemporadaRows || hasEscuelaRows;

                                  if (
                                    hasCompBloques &&
                                    !hasRegularIntensidades
                                  ) {
                                    // Solo complementarios con bloques - mostrar headers dinámicos
                                    const maxBloques = Math.max(
                                      ...rows.map((r) => r.cols?.length || 0),
                                    );
                                    return Array.from({
                                      length: maxBloques,
                                    }).map((_, bIdx) => (
                                      <th
                                        key={bIdx}
                                        className="intens-header"
                                        style={{
                                          width: hasPctCol ? 72 : 58,
                                        }}
                                      >
                                        Bloque{bIdx + 1}
                                      </th>
                                    ));
                                  }
                                  // Regular con intensidades
                                  return INTENSIDADES.map((v) => (
                                    <th
                                      key={v}
                                      className="intens-header"
                                      style={{ width: 58 }}
                                    >
                                      {v}%
                                    </th>
                                  ));
                                })()}
                              </tr>
                              <tr>
                                <th />
                                <th />
                                {(() => {
                                  const hasCompBloques = rows.some(
                                    (r) => r.isCompBloques,
                                  );
                                  const hasRegularIntensidades = rows.some(
                                    (r) => !r.isCompBloques,
                                  );
                                  const hasPretemporadaRows = rows.some(
                                    (r) => r.isPretemporadaRow,
                                  );
                                  const hasEscuelaRows2 = rows.some(
                                    (r) => r.isEscuelaRow,
                                  );
                                  const hasPctCol2 =
                                    hasPretemporadaRows || hasEscuelaRows2;

                                  if (
                                    hasCompBloques &&
                                    !hasRegularIntensidades
                                  ) {
                                    // Solo complementarios - mostrar headers de bloque
                                    const maxBloques = Math.max(
                                      ...rows.map((r) => r.cols?.length || 0),
                                    );
                                    return Array.from({
                                      length: maxBloques,
                                    }).map((_, bIdx) => (
                                      <th key={bIdx} className="sub-header">
                                        <div
                                          style={{
                                            display: "grid",
                                            gridTemplateColumns: hasPctCol2
                                              ? "1fr 1fr 1fr 1fr"
                                              : "1fr 1fr 1fr",
                                            gap: 0,
                                            fontSize: 6.5,
                                          }}
                                        >
                                          {hasPctCol2 && <span>%</span>}
                                          <span>Ser</span>
                                          <span>Rep</span>
                                          <span>Kg</span>
                                        </div>
                                      </th>
                                    ));
                                  }
                                  // Regular con intensidades
                                  return INTENSIDADES.map((v) => (
                                    <th key={v} className="sub-header">
                                      <div
                                        style={{
                                          display: "grid",
                                          gridTemplateColumns: "1fr 1fr 1fr",
                                          gap: 0,
                                          fontSize: 6.5,
                                        }}
                                      >
                                        <span>Ser</span>
                                        <span>Rep</span>
                                        <span>Kg</span>
                                      </div>
                                    </th>
                                  ));
                                })()}
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                let section = null;
                                const hasCompBloques = rows.some(
                                  (r) => r.isCompBloques,
                                );
                                const hasRegularIntensidades = rows.some(
                                  (r) => !r.isCompBloques,
                                );
                                const hasPretemporadaRows = rows.some(
                                  (r) => r.isPretemporadaRow,
                                );
                                const maxBloques = hasCompBloques
                                  ? Math.max(
                                      ...rows.map((r) => r.cols?.length || 0),
                                    )
                                  : 0;

                                return rows
                                  .map((row, rIdx) => {
                                    const rowArr = [];

                                    // Detectar cambios de sección
                                    let newSection = null;
                                    if (row.isComplementarioBefore)
                                      newSection = "ANTES";
                                    else if (row.isComplementarioAfter)
                                      newSection = "DESPUÉS";
                                    else newSection = "PRINCIPAL";

                                    if (newSection !== section && rIdx > 0) {
                                      section = newSection;
                                      const sectionColors = {
                                        ANTES: {
                                          bg: "#e3f2fd",
                                          text: "#1565c0",
                                        },
                                        PRINCIPAL: {
                                          bg: "#fff8e1",
                                          text: "#b8860b",
                                        },
                                        DESPUÉS: {
                                          bg: "#e8f5e9",
                                          text: "#1b5e20",
                                        },
                                      };
                                      const colors = sectionColors[newSection];
                                      const colSpan =
                                        2 +
                                        (hasCompBloques &&
                                        !hasRegularIntensidades
                                          ? maxBloques
                                          : INTENSIDADES.length);
                                      rowArr.push(
                                        <tr
                                          key={`sep-${rIdx}`}
                                          style={{
                                            height: 2,
                                            background: "#ddd",
                                          }}
                                        >
                                          <td colSpan={colSpan}></td>
                                        </tr>,
                                      );
                                    } else if (rIdx === 0) {
                                      section = newSection;
                                    }

                                    const gc = GC[row.categoria] || "#555";
                                    const gb = GB[row.categoria] || "#fafafa";
                                    const isLast = rIdx === rows.length - 1;

                                    rowArr.push(
                                      <tr
                                        key={rIdx}
                                        className={`${isLast ? "last-ej" : ""} ${row.isPretemporadaRow ? "pretemporada-row" : ""}`}
                                      >
                                        {row.isPretemporadaRow ? (
                                          <>
                                            <td
                                              colSpan={2}
                                              className="left pdf-pretemp-ej"
                                              style={{ padding: "3px 4px" }}
                                            >
                                              <div
                                                style={{
                                                  display: "flex",
                                                  alignItems: "baseline",
                                                  gap: 4,
                                                  flexWrap: "wrap",
                                                }}
                                              >
                                                <span
                                                  style={{
                                                    background: gc,
                                                    color: "#fff",
                                                    fontSize: 8,
                                                    fontWeight: 800,
                                                    padding: "1px 4px",
                                                    borderRadius: 2,
                                                    whiteSpace: "nowrap",
                                                    flexShrink: 0,
                                                  }}
                                                >
                                                  {row.id}
                                                </span>
                                                <span
                                                  className="ej-nombre"
                                                  style={{
                                                    whiteSpace: "normal",
                                                    wordBreak: "break-word",
                                                  }}
                                                >
                                                  {row.nombre}
                                                </span>
                                              </div>
                                            </td>
                                          </>
                                        ) : (
                                          <>
                                            <td style={{ padding: "3px 4px" }}>
                                              <span
                                                style={{
                                                  background: gc,
                                                  color: "#fff",
                                                  fontSize: 8,
                                                  fontWeight: 800,
                                                  padding: "1px 4px",
                                                  borderRadius: 2,
                                                  whiteSpace: "nowrap",
                                                }}
                                              >
                                                {row.id}
                                              </span>
                                            </td>
                                            <td className="left">
                                              <span
                                                className="ej-nombre"
                                                style={{
                                                  fontStyle:
                                                    row.isComplementario
                                                      ? "italic"
                                                      : "normal",
                                                }}
                                              >
                                                {row.nombre}
                                              </span>
                                            </td>
                                          </>
                                        )}
                                        {(() => {
                                          // Si es complementario con bloques
                                          if (row.isCompBloques) {
                                            return Array.from({
                                              length: maxBloques,
                                            }).map((_, bIdx) => {
                                              const col = row.cols[bIdx];
                                              if (
                                                !hasComplementarioBlockContent(
                                                  col,
                                                )
                                              ) {
                                                return (
                                                  <td
                                                    key={bIdx}
                                                    data-label={
                                                      col?.pct != null
                                                        ? `${col.pct}%`
                                                        : row.isPretemporadaRow ||
                                                            row.isEscuelaRow
                                                          ? `B${bIdx + 1}`
                                                          : ""
                                                    }
                                                  >
                                                    <span className="cell-empty">
                                                      –
                                                    </span>
                                                  </td>
                                                );
                                              }
                                              return (
                                                <td
                                                  key={bIdx}
                                                  data-label={
                                                    col?.pct != null
                                                      ? `${col.pct}%`
                                                      : row.isPretemporadaRow ||
                                                          row.isEscuelaRow
                                                        ? `B${bIdx + 1}`
                                                        : ""
                                                  }
                                                  style={{ background: gb }}
                                                >
                                                  <div className="cell-data">
                                                    {(row.isPretemporadaRow ||
                                                      row.isEscuelaRow) &&
                                                      col.pct != null && (
                                                        <span className="cell-pct-pretemp">
                                                          {col.pct}%
                                                        </span>
                                                      )}
                                                    <span className="cell-series">
                                                      {col.s}
                                                    </span>
                                                    <span className="cell-reps">
                                                      {col.r}
                                                    </span>
                                                    <span className="cell-kg">
                                                      {col.kg}
                                                    </span>
                                                    {col.note && (
                                                      <span className="cell-note">
                                                        {col.note}
                                                      </span>
                                                    )}
                                                  </div>
                                                </td>
                                              );
                                            });
                                          }

                                          // Regular con intensidades
                                          return INTENSIDADES.map((intens) => {
                                            const col = row.cols.find(
                                              (c) => c.intens === intens,
                                            );
                                            if (!col || !col.s) {
                                              return (
                                                <td
                                                  key={intens}
                                                  data-label={`${intens}%`}
                                                >
                                                  <span className="cell-empty">
                                                    –
                                                  </span>
                                                </td>
                                              );
                                            }
                                            return (
                                              <td
                                                key={intens}
                                                data-label={`${intens}%`}
                                                style={{ background: gb }}
                                              >
                                                <div className="cell-data">
                                                  <span className="cell-series">
                                                    {col.s}
                                                  </span>
                                                  <span className="cell-reps">
                                                    {col.r}
                                                  </span>
                                                  <span className="cell-kg">
                                                    {col.kg}
                                                  </span>
                                                  {col.note && (
                                                    <span className="cell-note">
                                                      {col.note}
                                                    </span>
                                                  )}
                                                </div>
                                              </td>
                                            );
                                          });
                                        })()}
                                      </tr>,
                                    );

                                    return rowArr;
                                  })
                                  .flat();
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}

                <div className="pdf-footer">
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 5 }}
                  >
                    <span
                      dangerouslySetInnerHTML={{
                        __html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 380" width="14" height="13.3"><defs><linearGradient id="pfs-g" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#f8e47a"/><stop offset="100%" stop-color="#9a7010"/></linearGradient><linearGradient id="pfs-gh" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#604800"/><stop offset="50%" stop-color="#f5d96a"/><stop offset="100%" stop-color="#604800"/></linearGradient></defs><text x="200" y="100" font-family="Arial Black,sans-serif" font-size="32" letter-spacing="14" fill="url(#pfs-g)" text-anchor="middle">SISTEMA</text><rect x="100" y="112" width="200" height="1.5" fill="url(#pfs-gh)" opacity="0.5"/><text x="218" y="300" font-family="Arial Black,sans-serif" font-size="240" letter-spacing="-4" fill="url(#pfs-g)" text-anchor="middle">IL</text><text x="200" y="344" font-family="Arial Black,sans-serif" font-size="15" letter-spacing="9" fill="url(#pfs-g)" text-anchor="middle">IRONLIFTING</text></svg>`,
                      }}
                    />
                    <strong>{atleta.nombre}</strong>
                  </div>
                  <div>
                    {isPretemp
                      ? `Turnos ${tFirst}-${tLast}`
                      : `Semana ${sem.numero} de ${meso.semanas.length}`}
                  </div>
                </div>
              </div>
            );
          });
        })()}

        {/* ── PÁGINA DE RESUMEN FINAL ── */}
        {!isPretemp && (
          <div
            className="pdf-page pdf-resumen-page"
            style={{ padding: "14px 12px 16px" }}
          >
            <div className="pdf-resumen-title">Resumen del Mesociclo</div>

            {/* KPIs */}
            <div className="pdf-resumen-grid">
              <div className="pdf-kpi">
                <div className="pdf-kpi-val">
                  {totalVolReps.toLocaleString()}
                </div>
                <div className="pdf-kpi-lbl">Volumen Total (reps)</div>
              </div>
              <div className="pdf-kpi">
                <div className="pdf-kpi-val" style={{ color: "#3090e0" }}>
                  {totalVolKg.toLocaleString()}
                </div>
                <div className="pdf-kpi-lbl">Tonelaje Total (kg)</div>
              </div>
              <div className="pdf-kpi">
                <div className="pdf-kpi-val" style={{ color: "#30c080" }}>
                  {pesoMedioTotal ? `${pesoMedioTotal} kg` : "—"}
                </div>
                <div className="pdf-kpi-lbl">Peso Medio</div>
              </div>
              <div className="pdf-kpi">
                <div className="pdf-kpi-val" style={{ color: "#c080f0" }}>
                  {irm_arr && irm_env
                    ? `${irm_arr} / ${irm_env}`
                    : irm_arr || irm_env || "—"}
                </div>
                <div className="pdf-kpi-lbl">IRM Arr / Env (kg)</div>
              </div>
            </div>

            {/* Tabla resumen por semana */}
            <table className="pdf-sem-table">
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Semana</th>
                  {!isEscuelaPdf && <th>% Vol</th>}
                  {!isEscuelaPdf && <th>Planificado</th>}
                  <th>Vol. Reps</th>
                  <th>Vol. Kg</th>
                  <th>Peso Medio</th>
                  <th>Int. Media</th>
                </tr>
              </thead>
              <tbody>
                {meso.semanas.map((sem, i) => {
                  const m = metricas[i];
                  return (
                    <tr key={sem.id}>
                      <td style={{ textAlign: "left", fontWeight: 700 }}>
                        Semana {sem.numero}
                      </td>
                      {!isEscuelaPdf && <td>{sem.pct_volumen}%</td>}
                      {!isEscuelaPdf && (
                        <td>
                          {Math.round(
                            (meso.volumen_total * sem.pct_volumen) / 100,
                          )}
                        </td>
                      )}
                      <td style={{ fontWeight: 700, color: "#b8860b" }}>
                        {m.volReps || "—"}
                      </td>
                      <td style={{ fontWeight: 700, color: "#1565c0" }}>
                        {m.volKg || "—"}
                      </td>
                      <td style={{ color: "#1b5e20" }}>{m.pesoMedio || "—"}</td>
                      <td style={{ color: "#4a148c" }}>
                        {m.intMedia ? `${m.intMedia}%` : "—"}
                      </td>
                    </tr>
                  );
                })}
                <tr>
                  <td style={{ textAlign: "left" }}>TOTAL</td>
                  {!isEscuelaPdf && <td>100%</td>}
                  {!isEscuelaPdf && <td>{meso.volumen_total}</td>}
                  <td style={{ color: "#b8860b" }}>{totalVolReps || "—"}</td>
                  <td style={{ color: "#1565c0" }}>{totalVolKg || "—"}</td>
                  <td style={{ color: "#1b5e20" }}>
                    {pesoMedioTotal ? `${pesoMedioTotal} kg` : "—"}
                  </td>
                  <td>—</td>
                </tr>
              </tbody>
            </table>

            {/* Gráfico de barras de volumen por semana */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
                gap: 12,
                marginTop: 8,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 8,
                    fontWeight: 800,
                    color: "#1a1a2e",
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                    marginBottom: 8,
                    borderBottom: "1px solid #e0e0e0",
                    paddingBottom: 4,
                  }}
                >
                  Volumen de Repeticiones por Semana
                </div>
                <BarChartSVG
                  data={meso.semanas.map((s, i) => ({
                    v: metricas[i].volReps,
                    l: `S${s.numero}`,
                  }))}
                  color="#b8860b"
                  width={240}
                  height={60}
                />
              </div>
              <div>
                <div
                  style={{
                    fontSize: 8,
                    fontWeight: 800,
                    color: "#1a1a2e",
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                    marginBottom: 8,
                    borderBottom: "1px solid #e0e0e0",
                    paddingBottom: 4,
                  }}
                >
                  Tonelaje (kg) por Semana
                </div>
                <BarChartSVG
                  data={meso.semanas.map((s, i) => ({
                    v: metricas[i].volKg,
                    l: `S${s.numero}`,
                  }))}
                  color="#1565c0"
                  width={240}
                  height={60}
                />
              </div>
            </div>

            <div className="pdf-footer" style={{ marginTop: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  dangerouslySetInnerHTML={{
                    __html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 380" width="20" height="19"><defs><linearGradient id="pfm-g" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#f8e47a"/><stop offset="100%" stop-color="#9a7010"/></linearGradient><linearGradient id="pfm-gh" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#604800"/><stop offset="50%" stop-color="#f5d96a"/><stop offset="100%" stop-color="#604800"/></linearGradient></defs><text x="200" y="100" font-family="Arial Black,sans-serif" font-size="32" letter-spacing="14" fill="url(#pfm-g)" text-anchor="middle">SISTEMA</text><rect x="100" y="112" width="200" height="1.5" fill="url(#pfm-gh)" opacity="0.5"/><text x="218" y="300" font-family="Arial Black,sans-serif" font-size="240" letter-spacing="-4" fill="url(#pfm-g)" text-anchor="middle">IL</text><text x="200" y="344" font-family="Arial Black,sans-serif" font-size="15" letter-spacing="9" fill="url(#pfm-g)" text-anchor="middle">IRONLIFTING</text></svg>`,
                  }}
                />
                <span style={{ fontSize: 9, color: "#888" }}>
                  Sistema IronLifting
                </span>{" "}
                <span style={{ color: "#aaa" }}>·</span> {atleta.nombre}
              </div>
              <div>
                {formatDateDisplay(new Date().toISOString().slice(0, 10))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SISTEMA DE PLANTILLAS — helpers, PagePlantillas, hooks
// ═══════════════════════════════════════════════════════════════


// ── Modal para guardar plantilla desde un mesociclo/semana/distribución ──────
// ── Card de plantilla ─────────────────────────────────────────────────────────
// ── Página principal de Plantillas ───────────────────────────────────────────

// ── Página de edición de plantilla (abre en pestaña, como PageAtleta) ────────
function PagePlantilla({ plt, onUpdate, onClose }) {
  const irm_arr = 100;
  const irm_env = 200;
  const [vistaActual, setVistaActual] = useState("planilla");
  // Ref to always-current form for cleanup save
  const latestFormRef = useRef(null);
  const [semPctOverrides, setSemPctOverrides] = useState({});
  const [semPctManual, setSemPctManual] = useState(new Set());
  const [turnoPctOverrides, setTurnoPctOverrides] = useState({});
  const [turnoPctManual, setTurnoPctManual] = useState(new Set());
  const [confirmReset, setConfirmReset] = useState(null);

  // Estados elevados de PlanillaTurno para historial
  const _ptk = (type) => `liftplan_pt_${plt.id}_${type}`;
  const _lpg = (t, d) => {
    try {
      return JSON.parse(localStorage.getItem(_ptk(t)) || "null") ?? d;
    } catch {
      return d;
    }
  };
  const [repsEdit, setRepsEditRaw] = useState(() => _lpg("repsEdit", {}));
  const [manualEdit, setManualEditRaw] = useState(
    () => new Set(_lpg("manualEdit", [])),
  );
  const [cellEdit, setCellEditRaw] = useState(() => _lpg("cellEdit", {}));
  const [cellManual, setCellManualRaw] = useState(
    () => new Set(_lpg("cellManual", [])),
  );
  const [nameEdit, setNameEditRaw] = useState(() => _lpg("nameEdit", {}));
  const [noteEdit, setNoteEditRaw] = useState(() => _lpg("noteEdit", {}));

  const initialForm = {
    ...plt,
    semanas: plt.semanas || mkSemanas(),
    volumen_total: plt.volumen_total || 600,
  };

  // ── Historial completo (form + estados PlanillaTurno) ─────────────────────
  const pHistRef = useRef(null);
  const pIdxRef = useRef(0);
  const pStorageKey = `liftplan_hist_plt_${plt.id}`;

  const pCaptureSnap = (currentForm) => ({
    form: JSON.parse(JSON.stringify(currentForm)),
    semPctOverrides: JSON.parse(JSON.stringify(semPctOverrides)),
    turnoPctOverrides: JSON.parse(JSON.stringify(turnoPctOverrides)),
    semPctManual: [...semPctManual],
    turnoPctManual: [...turnoPctManual],
    repsEdit: { ...repsEdit },
    manualEdit: [...manualEdit],
    cellEdit: { ...cellEdit },
    cellManual: [...cellManual],
    nameEdit: { ...nameEdit },
    noteEdit: { ...noteEdit },
  });

  const pApplySnap = (snap) => {
    if (!snap) return;
    const id = plt.id;
    const ls = (k, v) => {
      safeSetItem(k, JSON.stringify(v));
    };
    // Handle both new {form:{...}} and old {semanas:...} formats
    const f = snap.form || (snap.semanas ? snap : null) || initialForm;
    latestFormRef.current = f;
    setFormState(f);
    safeSetItem(`liftplan_plt_draft_${plt.id}`, JSON.stringify(f));
    try {
      onUpdate(f);
    } catch {}
    setSemPctOverrides(snap.semPctOverrides || {});
    setTurnoPctOverrides(snap.turnoPctOverrides || {});
    setSemPctManual(new Set(snap.semPctManual || []));
    setTurnoPctManual(new Set(snap.turnoPctManual || []));
    const re = snap.repsEdit || {};
    const me = snap.manualEdit || [];
    const ce = snap.cellEdit || {};
    const cm = snap.cellManual || [];
    const ne = snap.nameEdit || {};
    const no = snap.noteEdit || {};
    setRepsEditRaw(re);
    ls(`liftplan_pt_${id}_repsEdit`, re);
    setManualEditRaw(new Set(me));
    ls(`liftplan_pt_${id}_manualEdit`, me);
    setCellEditRaw(ce);
    ls(`liftplan_pt_${id}_cellEdit`, ce);
    setCellManualRaw(new Set(cm));
    ls(`liftplan_pt_${id}_cellManual`, cm);
    setNameEditRaw(ne);
    ls(`liftplan_pt_${id}_nameEdit`, ne);
    setNoteEditRaw(no);
    ls(`liftplan_pt_${id}_noteEdit`, no);
  };

  if (pHistRef.current === null) {
    try {
      const saved = JSON.parse(localStorage.getItem(pStorageKey) || "null");
      if (saved && Array.isArray(saved.stack) && saved.stack.length > 0) {
        pHistRef.current = saved.stack;
        pIdxRef.current = saved.idx;
      } else {
        pHistRef.current = [];
        pIdxRef.current = -1;
      }
    } catch {
      pHistRef.current = [];
      pIdxRef.current = -1;
    }
  }

  // IMPORTANT: Always initialize form from plt (the most recently persisted state via onUpdate),
  // NOT from the undo history. The history snapshots are taken BEFORE each change, so reading
  // from history on mount would restore a state one step behind the last saved value.
  // Initialize latestFormRef synchronously so setForm never reads a null prev.
  if (latestFormRef.current === null) {
    latestFormRef.current = initialForm;
  }

  const [form, setFormState] = useState(() => initialForm);
  const [pHistState, setPHistState] = useState({
    canUndo: pIdxRef.current > 0,
    canRedo: pIdxRef.current < (pHistRef.current?.length || 0) - 1,
  });

  const canUndo = pHistState.canUndo;
  const canRedo = pHistState.canRedo;

  const pPersist = () => {
    safeSetItem(
      pStorageKey,
      JSON.stringify({
        stack: pHistRef.current,
        idx: pIdxRef.current,
      }),
    );
  };

  const _pLastPush = useRef(0);
  const pushSnap = (forced = false) => {
    const now = Date.now();
    if (!forced && now - _pLastPush.current < 300) return;
    _pLastPush.current = now;
    const snap = pCaptureSnap(form);
    const base = pHistRef.current.slice(0, pIdxRef.current + 1);
    const next = [...base, snap].slice(-15);
    pHistRef.current = next;
    pIdxRef.current = next.length - 1;
    pPersist();
    setPHistState({ canUndo: pIdxRef.current > 0, canRedo: false });
  };

  // setForm: actualiza sin pushear (pushSnap ya se llamó antes)
  const pendingSaveRef = useRef(false);

  const setForm = (updater) => {
    // latestFormRef is always initialized (never null), use it as prev to avoid stale closures.
    const prev = latestFormRef.current;
    const next = typeof updater === "function" ? updater(prev) : updater;
    latestFormRef.current = next;
    pendingSaveRef.current = true;
    // Guardar borrador directo siempre (síncrono)
    safeSetItem(`liftplan_plt_draft_${plt.id}`, JSON.stringify(next));
    // Propagar al store (síncrono)
    try {
      onUpdate(next);
      pendingSaveRef.current = false;
    } catch {}
    // Actualizar estado React (puede ser batched pero ya guardamos todo arriba)
    setFormState(next);
  };

  const handleClose = () => {
    const next = latestFormRef.current || form;
    if (next) {
      safeSetItem(`liftplan_plt_draft_${plt.id}`, JSON.stringify(next));
      try {
        onUpdate(next);
      } catch {}
    }
    onClose();
  };

  // Auto-guardado: cada 3s si hay cambios pendientes
  useEffect(() => {
    const interval = setInterval(() => {
      if (!pendingSaveRef.current || !latestFormRef.current) return;
      try {
        onUpdate(latestFormRef.current);
        pendingSaveRef.current = false;
      } catch {}
    }, 3000);
    // Guardar al cambiar visibilidad (cambio de pestaña del browser)
    const onVisibility = () => {
      if (document.hidden && latestFormRef.current) {
        try {
          localStorage.setItem(
            `liftplan_plt_draft_${plt.id}`,
            JSON.stringify(latestFormRef.current),
          );
        } catch {}
        try {
          onUpdate(latestFormRef.current);
        } catch {}
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      // Cleanup al desmontar
      if (latestFormRef.current) {
        try {
          localStorage.setItem(
            `liftplan_plt_draft_${plt.id}`,
            JSON.stringify(latestFormRef.current),
          );
        } catch {}
        try {
          onUpdate(latestFormRef.current);
        } catch {}
      }
    };
  }, []);

  const undo = () => {
    if (pIdxRef.current <= 0) return;
    pIdxRef.current -= 1;
    pPersist();
    pApplySnap(pHistRef.current[pIdxRef.current]);
    setPHistState({
      canUndo: pIdxRef.current > 0,
      canRedo: pIdxRef.current < pHistRef.current.length - 1,
    });
  };

  const redo = () => {
    if (pIdxRef.current >= pHistRef.current.length - 1) return;
    pIdxRef.current += 1;
    pPersist();
    pApplySnap(pHistRef.current[pIdxRef.current]);
    setPHistState({
      canUndo: pIdxRef.current > 0,
      canRedo: pIdxRef.current < pHistRef.current.length - 1,
    });
  };

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || (e.key === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [pHistState]);

  // setForm: pushea snapshot ANTES de cambiar, luego actualiza
  // Usa latestFormRef como prev para evitar stale closure
  const setFormWithHist = (updater) => {
    pushSnap();
    const prev = latestFormRef.current;
    const next = typeof updater === "function" ? updater(prev) : updater;
    setForm(next);
  };
  const set = (k, v) => setFormWithHist((f) => ({ ...f, [k]: v }));

  const updateSemana = (sIdx, newSem) => {
    pushSnap();
    const prev = latestFormRef.current;
    const ss = [...prev.semanas];
    ss[sIdx] = newSem;
    setForm({ ...prev, semanas: ss });
  };

  const mesoFake = {
    id: plt.id,
    modo: form?.modo || plt?.modo || "Preparatorio",
    volumen_total: form?.volumen_total || plt?.volumen_total || 600,
    semanas: form?.semanas || plt?.semanas || mkSemanas(),
  };

  const esSemanal = plt.tipo === "semana";
  const esBasica = form.escuela === true || form.escuela === "true";
  const esPretempPlt =
    form.pretemporada === true || form.pretemporada === "true";

  return (
    <div>
      {/* Banda superior */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "14px 14px 0 0",
          marginBottom: 0,
          marginTop: -28,
        }}
      >
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleClose}
              style={{ padding: "5px 10px", fontSize: 12, flexShrink: 0 }}
            >
              <ChevronLeft size={14} /> Plantillas
            </button>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: esBasica
                  ? "rgba(232,197,71,.15)"
                  : "var(--surface3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "'Bebas Neue'",
                fontSize: 18,
                color: "var(--gold)",
                flexShrink: 0,
              }}
            >
              {esBasica ? "EB" : "P"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "'Bebas Neue'",
                  fontSize: 18,
                  color: "var(--text)",
                  lineHeight: 1.1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {form.nombre}
              </div>
              <div
                style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}
              >
                {esBasica ? (
                  <>
                    {form.semanas?.length} semanas ·{" "}
                    {form.num_bloques_basica || 3} columnas de % · Escuela
                    Inicial
                  </>
                ) : (
                  <>
                    {(form.semanas || []).reduce(
                      (acc, s) => acc + (s.turnos?.length || 0),
                      0,
                    )}{" "}
                    turnos · {form.volumen_total} reps
                    {" · "}IRM prueba: {irm_arr}/{irm_env} kg
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs — sticky */}
      <div
        className="sticky-tabs-bar"
        style={{
          padding: "0 20px",
          display: "flex",
          alignItems: "center",
          gap: 0,
          minHeight: 44,
          position: "sticky",
          top: -28,
          zIndex: 90,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderTop: "none",
          borderRadius: "0 0 14px 14px",
          marginBottom: 20,
          boxShadow: "0 6px 16px rgba(0,0,0,.5)",
        }}
      >
        {(esBasica || esPretempPlt
          ? [{ id: "planilla", label: "Planilla" }]
          : [
              { id: "planilla", label: "Planilla" },
              { id: "resumen", label: "Resumen" },
            ]
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setVistaActual(t.id)}
            style={{
              padding: "0 16px",
              border: "none",
              background: "none",
              color: vistaActual === t.id ? "var(--gold)" : "var(--muted)",
              fontFamily: "'DM Sans'",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              height: 44,
              borderBottom:
                vistaActual === t.id
                  ? "2px solid var(--gold)"
                  : "2px solid transparent",
              transition: "all .2s",
            }}
          >
            {t.label}
          </button>
        ))}
        <div
          style={{ display: "flex", gap: 4, marginLeft: "auto", flexShrink: 0 }}
        >
          <button
            className="btn btn-ghost btn-sm"
            onClick={undo}
            disabled={!canUndo}
            title="Deshacer (Ctrl+Z)"
            style={{
              opacity: canUndo ? 1 : 0.35,
              padding: "0 10px",
              height: 44,
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Undo2 size={14} /> Deshacer
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={redo}
            disabled={!canRedo}
            title="Rehacer (Ctrl+Y)"
            style={{
              opacity: canRedo ? 1 : 0.35,
              padding: "0 10px",
              height: 44,
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            Rehacer <Redo2 size={14} />
          </button>
        </div>
      </div>

      {/* ── Planilla ── */}
      {vistaActual === "planilla" && esBasica && (
        <div className="card">
          <div
            className="flex-between mb16"
            style={{ flexWrap: "wrap", gap: 10 }}
          >
            <div className="card-title" style={{ marginBottom: 0 }}>
              Planilla Escuela Inicial
            </div>
            {/* IRM Arranque / Envión */}
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <label
                  style={{
                    fontSize: 10,
                    color: "var(--gold)",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: ".05em",
                  }}
                >
                  IRM Arr
                </label>
                <input
                  name="field_52"
                  type="number"
                  min={0}
                  max={300}
                  className="no-spin"
                  value={form.irm_arranque ?? ""}
                  placeholder="kg"
                  onChange={(e) =>
                    set(
                      "irm_arranque",
                      e.target.value === "" ? null : Number(e.target.value),
                    )
                  }
                  style={{
                    width: 52,
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    padding: "4px 6px",
                    color: "var(--gold)",
                    fontSize: 14,
                    fontFamily: "'Bebas Neue'",
                    textAlign: "center",
                    outline: "none",
                    MozAppearance: "textfield",
                    appearance: "textfield",
                  }}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <label
                  style={{
                    fontSize: 10,
                    color: "var(--blue)",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: ".05em",
                  }}
                >
                  IRM Env
                </label>
                <input
                  name="field_53"
                  type="number"
                  min={0}
                  max={400}
                  className="no-spin"
                  value={form.irm_envion ?? ""}
                  placeholder="kg"
                  onChange={(e) =>
                    set(
                      "irm_envion",
                      e.target.value === "" ? null : Number(e.target.value),
                    )
                  }
                  style={{
                    width: 52,
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    padding: "4px 6px",
                    color: "var(--blue)",
                    fontSize: 14,
                    fontFamily: "'Bebas Neue'",
                    textAlign: "center",
                    outline: "none",
                    MozAppearance: "textfield",
                    appearance: "textfield",
                  }}
                />
              </div>
              <span style={{ fontSize: 9, color: "var(--muted)" }}>kg</span>
            </div>
          </div>
          <PlanillaBasica
            semanas={form.semanas}
            onChange={(ss, extraUpdates) =>
              setFormWithHist((f) => ({
                ...f,
                semanas: ss,
                ...(extraUpdates || {}),
              }))
            }
            numBloques={form.num_bloques_basica || 3}
            onBeforeChange={(forced) => pushSnap(forced)}
            irm_arr={form.irm_arranque || 100}
            irm_env={form.irm_envion || 200}
          />
        </div>
      )}

      {/* ── Planilla Pretemporada ── */}
      {vistaActual === "planilla" && esPretempPlt && (
        <div className="card">
          <div
            className="flex-between mb16"
            style={{ flexWrap: "wrap", gap: 10 }}
          >
            <div
              className="card-title"
              style={{ marginBottom: 0, color: "#ff9800" }}
            >
              Planilla Pretemporada
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <label
                  style={{
                    fontSize: 10,
                    color: "var(--gold)",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: ".05em",
                  }}
                >
                  IRM Arr
                </label>
                <input
                  name="field_pt_plt_arr"
                  type="number"
                  min={0}
                  max={300}
                  className="no-spin"
                  value={form.irm_arranque ?? ""}
                  placeholder="kg"
                  onChange={(e) =>
                    set(
                      "irm_arranque",
                      e.target.value === "" ? null : Number(e.target.value),
                    )
                  }
                  style={{
                    width: 52,
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    padding: "4px 6px",
                    color: "var(--gold)",
                    fontSize: 14,
                    fontFamily: "'Bebas Neue'",
                    textAlign: "center",
                    outline: "none",
                    MozAppearance: "textfield",
                    appearance: "textfield",
                  }}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <label
                  style={{
                    fontSize: 10,
                    color: "var(--blue)",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: ".05em",
                  }}
                >
                  IRM Env
                </label>
                <input
                  name="field_pt_plt_env"
                  type="number"
                  min={0}
                  max={400}
                  className="no-spin"
                  value={form.irm_envion ?? ""}
                  placeholder="kg"
                  onChange={(e) =>
                    set(
                      "irm_envion",
                      e.target.value === "" ? null : Number(e.target.value),
                    )
                  }
                  style={{
                    width: 52,
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    padding: "4px 6px",
                    color: "var(--blue)",
                    fontSize: 14,
                    fontFamily: "'Bebas Neue'",
                    textAlign: "center",
                    outline: "none",
                    MozAppearance: "textfield",
                    appearance: "textfield",
                  }}
                />
              </div>
              <span style={{ fontSize: 9, color: "var(--muted)" }}>kg</span>
            </div>
          </div>
          <PlanillaPretemporada
            semanas={form.semanas}
            onChange={(ss, extraUpdates) =>
              setFormWithHist((f) => ({
                ...f,
                semanas: ss,
                ...(extraUpdates || {}),
              }))
            }
            numBloques={form.num_bloques_basica || 3}
            onBeforeChange={(forced) => pushSnap(forced)}
            irm_arr={form.irm_arranque || 100}
            irm_env={form.irm_envion || 200}
          />
        </div>
      )}

      {vistaActual === "planilla" && !esBasica && !esPretempPlt && (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              Total:{" "}
              <span style={{ color: "var(--gold)", fontWeight: 700 }}>
                {form.volumen_total}
              </span>{" "}
              reps
            </div>
          </div>
          <div className="stats-row mb16">
            {form.semanas?.map((s) => (
              <div key={s.id} className="stat-box">
                <div className="stat-box-val">
                  {s.reps_ajustadas ||
                    Math.round((form.volumen_total * s.pct_volumen) / 100)}
                </div>
                <div className="stat-box-lbl">
                  Semana {s.numero} · {s.pct_volumen}%
                </div>
                <div className="prog-bar">
                  <div
                    className="prog-fill"
                    style={{
                      width: `${s.pct_volumen}%`,
                      background: "var(--gold)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="flex-between mb16">
              <div className="card-title" style={{ marginBottom: 0 }}>
                Sembrado Mensual
              </div>
            </div>
            {esSemanal ? (
              <SemanaView
                semana={form.semanas[0]}
                irm_arr={irm_arr}
                irm_env={irm_env}
                meso={mesoFake}
                onChange={(s) => updateSemana(0, s)}
              />
            ) : (
              <>
                <SembradoMensual
                  semanas={form.semanas}
                  irm_arr={irm_arr}
                  irm_env={irm_env}
                  meso={mesoFake}
                  onChangeSemana={updateSemana}
                  onChangeTodasSemanas={(ss) => set("semanas", ss)}
                  onSwapSemanas={(aIdx, bIdx) => {
                    setSemPctOverrides((prev) =>
                      remapOverrideObjectKeys(prev, (k) =>
                        remapSemPctKeyForSwap(k, aIdx, bIdx),
                      ),
                    );
                    setSemPctManual((prev) =>
                      remapOverrideSetKeys(prev, (k) =>
                        remapSemPctKeyForSwap(k, aIdx, bIdx),
                      ),
                    );
                    setTurnoPctOverrides((prev) =>
                      remapOverrideObjectKeys(prev, (k) =>
                        remapTurnoPctKeyForSwap(k, aIdx, bIdx),
                      ),
                    );
                    setTurnoPctManual((prev) =>
                      remapOverrideSetKeys(prev, (k) =>
                        remapTurnoPctKeyForSwap(k, aIdx, bIdx),
                      ),
                    );
                  }}
                />
                <ResumenGrupos
                  semanas={form.semanas}
                  meso={mesoFake}
                  semPctOverrides={semPctOverrides}
                  semPctManual={semPctManual}
                  setSemPctOverrides={setSemPctOverrides}
                  setSemPctManual={setSemPctManual}
                  onGuardarDistribucion={() => {}}
                  onRequestReset={(label, fn) =>
                    setConfirmReset({ label, onConfirm: fn })
                  }
                  onBeforeChange={(forced) => pushSnap(forced)}
                />
                <DistribucionTurnos
                  semanas={form.semanas}
                  meso={mesoFake}
                  turnoPctOverrides={turnoPctOverrides}
                  turnoPctManual={turnoPctManual}
                  setTurnoPctOverrides={setTurnoPctOverrides}
                  setTurnoPctManual={setTurnoPctManual}
                  onRequestReset={(label, fn) =>
                    setConfirmReset({ label, onConfirm: fn })
                  }
                  onBeforeChange={(forced) => pushSnap(forced)}
                />
                <PlanillaTurno
                  semanas={form.semanas}
                  irm_arr={irm_arr}
                  irm_env={irm_env}
                  meso={mesoFake}
                  semPctOverrides={semPctOverrides}
                  semPctManual={semPctManual}
                  turnoPctOverrides={turnoPctOverrides}
                  turnoPctManual={turnoPctManual}
                  onRequestReset={(label, fn) =>
                    setConfirmReset({ label, onConfirm: fn })
                  }
                  onBeforeChange={(forced) => pushSnap(forced)}
                  onChangeTodasSemanas={(newSemanas) =>
                    set("semanas", newSemanas)
                  }
                  onChangeTurno={(sIdx, tIdx, newTurno) => {
                    const sem = form.semanas[sIdx];
                    const ts = [...sem.turnos];
                    ts[tIdx] = newTurno;
                    updateSemana(sIdx, { ...sem, turnos: ts });
                  }}
                  repsEdit={repsEdit}
                  setRepsEdit={setRepsEditRaw}
                  manualEdit={manualEdit}
                  setManualEdit={setManualEditRaw}
                  cellEdit={cellEdit}
                  setCellEdit={setCellEditRaw}
                  cellManual={cellManual}
                  setCellManual={setCellManualRaw}
                  nameEdit={nameEdit}
                  setNameEdit={setNameEditRaw}
                  noteEdit={noteEdit}
                  setNoteEdit={setNoteEditRaw}
                />
              </>
            )}
          </div>
        </>
      )}

      {/* ── Resumen ── */}
      {vistaActual === "resumen" && (
        <PageResumen
          meso={mesoFake}
          atleta={{ nombre: form.nombre, id: plt.id }}
          irm_arr={irm_arr}
          irm_env={irm_env}
        />
      )}

      {confirmReset && (
        <Modal title="Confirmar reseteo" onClose={() => setConfirmReset(null)}>
          <p style={{ color: "var(--text)", fontSize: 14, marginBottom: 20 }}>
            ¿Resetear{" "}
            <strong style={{ color: "var(--gold)" }}>
              {confirmReset.label}
            </strong>
            ?
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setConfirmReset(null)}
            >
              Cancelar
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                confirmReset.onConfirm();
                setConfirmReset(null);
              }}
            >
              Resetear
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Modal para crear plantilla desde cero ────────────────────────────────────
// ── Modal para duplicar plantilla existente ──────────────────────────────────
function PagePlantillas({ plantillas, onAdd, onUpdate, onDelete, onOpen }) {
  const [busqueda, setBusqueda] = useState("");
  const [editando, setEditando] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showCrear, setShowCrear] = useState(false);
  const [showNueva, setShowNueva] = useState(false);
  const [duplicando, setDuplicando] = useState(null);
  const [showImportar, setShowImportar] = useState(false);
  const [colapsadoEscuela, setColapsadoEscuela] = useState({});
  const [colapsadoEscuelaMain, setColapsadoEscuelaMain] = useState(false);
  const [colapsadoPretemp, setColapsadoPretemp] = useState(false);
  const [colapsadoMias, setColapsadoMias] = useState(false);

  const escuela = plantillas.filter(
    (p) => p.escuela === true || p.escuela === "true",
  );
  const pretemporada = plantillas.filter(
    (p) => p.pretemporada === true || p.pretemporada === "true",
  );
  const mias = plantillas.filter(
    (p) =>
      (!p.escuela || p.escuela === false || p.escuela === "false") &&
      (!p.pretemporada ||
        p.pretemporada === false ||
        p.pretemporada === "false"),
  );

  const matchBusqueda = (p) =>
    !busqueda ||
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.descripcion?.toLowerCase().includes(busqueda.toLowerCase());

  const handleOpen = onOpen ? (plt) => onOpen(plt) : null;
  const handleDuplicate = (plt) => setDuplicando(plt);
  const handleEdit = (plt) => setEditando(plt);
  const handleDelete = (plt) => setConfirmDelete(plt);

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div className="page-title">Biblioteca de Plantillas</div>
          <div className="page-sub">
            {plantillas.length} plantilla{plantillas.length !== 1 ? "s" : ""}{" "}
            guardada{plantillas.length !== 1 ? "s" : ""}
            {escuela.length > 0 && ` · ${escuela.length} Escuela Inicial`}
            {pretemporada.length > 0 &&
              ` · ${pretemporada.length} Pretemporada`}
          </div>
        </div>
        <button className="btn btn-gold" onClick={() => setShowNueva(true)}>
          <Plus size={14} /> Nueva plantilla
        </button>
      </div>

      {/* Modal selector: crear desde cero o importar */}
      {showNueva && (
        <Modal title="Nueva plantilla" onClose={() => setShowNueva(false)}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              padding: "8px 0",
            }}
          >
            <button
              className="btn btn-gold"
              onClick={() => {
                setShowNueva(false);
                setShowCrear(true);
              }}
              style={{
                padding: "14px 20px",
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                gap: 10,
                justifyContent: "flex-start",
              }}
            >
              <Plus size={18} />
              <div style={{ textAlign: "left" }}>
                <div style={{ fontWeight: 700 }}>Crear desde cero</div>
                <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 400 }}>
                  Plantilla nueva con estructura vacía
                </div>
              </div>
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => {
                setShowNueva(false);
                setShowImportar(true);
              }}
              style={{
                padding: "14px 20px",
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                gap: 10,
                justifyContent: "flex-start",
                border: "1px solid var(--border)",
              }}
            >
              <Files size={18} />
              <div style={{ textAlign: "left" }}>
                <div style={{ fontWeight: 700 }}>
                  Duplicar plantilla existente
                </div>
                <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 400 }}>
                  Copiá una plantilla como base y modificala
                </div>
              </div>
            </button>
          </div>
        </Modal>
      )}

      {showCrear && (
        <CrearPlantillaModal
          onSave={(p) => {
            onAdd(p);
            setShowCrear(false);
          }}
          onClose={() => setShowCrear(false)}
        />
      )}

      {/* Modal importar/duplicar desde plantilla existente */}
      {showImportar && (
        <DuplicarPlantillaModal
          plantillas={plantillas}
          onSave={(base, nombre, desc) => {
            const copia = {
              ...JSON.parse(JSON.stringify(base)),
              id: mkId(),
              nombre,
              descripcion: desc,
              creado: new Date().toISOString().slice(0, 10),
            };
            onAdd(copia);
            setShowImportar(false);
          }}
          onClose={() => setShowImportar(false)}
        />
      )}

      {/* Modal duplicar desde card */}
      {duplicando && (
        <DuplicarPlantillaModal
          plantillas={plantillas}
          base={duplicando}
          onSave={(base, nombre, desc) => {
            const copia = {
              ...JSON.parse(JSON.stringify(base)),
              id: mkId(),
              nombre,
              descripcion: desc,
              creado: new Date().toISOString().slice(0, 10),
            };
            onAdd(copia);
            setDuplicando(null);
          }}
          onClose={() => setDuplicando(null)}
        />
      )}

      {/* Buscador global */}
      {plantillas.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 20,
          }}
        >
          <input
            name="field_63"
            style={{
              flex: 1,
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "8px 14px",
              color: "var(--text)",
              fontSize: 13,
              outline: "none",
              fontFamily: "'DM Sans'",
            }}
            placeholder="Buscar plantilla..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda("")}
              style={{
                background: "none",
                border: "none",
                color: "var(--muted)",
                cursor: "pointer",
                fontSize: 18,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          )}
        </div>
      )}

      {plantillas.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            background: "var(--surface)",
            borderRadius: 14,
            border: "1px solid var(--border)",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <div
            style={{
              fontFamily: "'Bebas Neue'",
              fontSize: 24,
              color: "var(--muted)",
              letterSpacing: ".05em",
              marginBottom: 8,
            }}
          >
            Sin plantillas aún
          </div>
          <div
            style={{
              fontSize: 13,
              color: "var(--muted)",
              maxWidth: 360,
              margin: "0 auto",
            }}
          >
            Creá una plantilla nueva con el botón{" "}
            <strong style={{ color: "var(--text)" }}>Nueva plantilla</strong>, o
            guardá mesociclos desde la pestaña de cada atleta
          </div>
        </div>
      ) : (
        <>
          {/* ── SECCIÓN ESCUELA INICIAL ── */}
          {escuela.length > 0 && (
            <SectionHeader
              title="Escuela Inicial"
              count={escuela.filter(matchBusqueda).length}
              color="#4db6ac"
              badge={`${ESCUELA_NIVELES.filter((n) => escuela.some((p) => p.escuela_nivel === n)).length} niveles`}
              collapsed={colapsadoEscuelaMain}
              onToggle={() => setColapsadoEscuelaMain((v) => !v)}
            >
              {ESCUELA_NIVELES.map((n) => (
                <NivelSection
                  key={n}
                  nivel={n}
                  pltList={escuela.filter((p) => p.escuela_nivel === n)}
                  colapsadoEscuela={colapsadoEscuela}
                  setColapsadoEscuela={setColapsadoEscuela}
                  matchBusqueda={matchBusqueda}
                  onOpen={handleOpen}
                  onDuplicate={handleDuplicate}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
              {/* Plantillas de escuela sin nivel asignado */}
              {(() => {
                const sinNivel = escuela
                  .filter(
                    (p) =>
                      !p.escuela_nivel ||
                      !ESCUELA_NIVELES.includes(p.escuela_nivel),
                  )
                  .filter(matchBusqueda);
                return sinNivel.length > 0 ? (
                  <div style={{ marginTop: 8 }}>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--muted)",
                        marginBottom: 8,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: ".06em",
                      }}
                    >
                      Sin nivel asignado
                    </div>
                    <CardGrid
                      lista={sinNivel}
                      onOpen={handleOpen}
                      onDuplicate={handleDuplicate}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  </div>
                ) : null;
              })()}
            </SectionHeader>
          )}

          {/* ── SECCIÓN PRETEMPORADA ── */}
          {pretemporada.filter(matchBusqueda).length > 0 && (
            <SectionHeader
              title="Pretemporada"
              count={pretemporada.filter(matchBusqueda).length}
              color="#ff9800"
              collapsed={colapsadoPretemp}
              onToggle={() => setColapsadoPretemp((v) => !v)}
            >
              <CardGrid
                lista={pretemporada.filter(matchBusqueda)}
                onOpen={handleOpen}
                onDuplicate={handleDuplicate}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </SectionHeader>
          )}

          {/* ── SECCIÓN MIS PLANTILLAS ── */}
          {mias.filter(matchBusqueda).length > 0 && (
            <SectionHeader
              title="Mis Plantillas"
              count={mias.filter(matchBusqueda).length}
              color="var(--gold)"
              collapsed={colapsadoMias}
              onToggle={() => setColapsadoMias((v) => !v)}
            >
              <CardGrid
                lista={mias.filter(matchBusqueda)}
                onOpen={handleOpen}
                onDuplicate={handleDuplicate}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </SectionHeader>
          )}

          {busqueda &&
            escuela.filter(matchBusqueda).length === 0 &&
            pretemporada.filter(matchBusqueda).length === 0 &&
            mias.filter(matchBusqueda).length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: 40,
                  color: "var(--muted)",
                  fontSize: 13,
                }}
              >
                No hay plantillas con ese nombre
              </div>
            )}
        </>
      )}

      {/* Modal editar metadatos */}
      {editando && (
        <Modal
          title="Editar plantilla"
          onClose={() => {
            onUpdate(editando);
            setEditando(null);
          }}
        >
          <div className="form-group">
            <label className="form-label">Nombre</label>
            <input
              name="field_64"
              className="form-input"
              value={editando.nombre}
              onChange={(e) =>
                setEditando((p) => ({ ...p, nombre: e.target.value }))
              }
            />
          </div>
          <div className="form-group">
            <label className="form-label">Descripción</label>
            <textarea
              name="field_65"
              className="form-input"
              value={editando.descripcion || ""}
              onChange={(e) =>
                setEditando((p) => ({ ...p, descripcion: e.target.value }))
              }
              rows={2}
              style={{ resize: "vertical" }}
            />
          </div>

          {/* Selector tipo en edición */}
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {[
              { key: "regular", label: "Regular", color: "var(--gold)" },
              { key: "escuela", label: "Escuela Inicial", color: "#4db6ac" },
              { key: "pretemporada", label: "Pretemporada", color: "#ff9800" },
            ].map((opt) => {
              const active =
                opt.key === "escuela"
                  ? editando.escuela
                  : opt.key === "pretemporada"
                    ? editando.pretemporada
                    : !editando.escuela && !editando.pretemporada;
              return (
                <button
                  key={opt.key}
                  onClick={() => {
                    if (opt.key === "escuela") {
                      setEditando((p) => ({
                        ...p,
                        escuela: true,
                        pretemporada: false,
                      }));
                    } else if (opt.key === "pretemporada") {
                      setEditando((p) => ({
                        ...p,
                        escuela: false,
                        pretemporada: true,
                      }));
                    } else {
                      setEditando((p) => ({
                        ...p,
                        escuela: false,
                        pretemporada: false,
                      }));
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: "7px 10px",
                    borderRadius: 8,
                    border: active
                      ? `2px solid ${opt.color}`
                      : "1px solid var(--border)",
                    background: active ? `${opt.color}18` : "var(--surface2)",
                    color: active ? opt.color : "var(--muted)",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: "'DM Sans'",
                    transition: "all .15s",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {editando.escuela && (
            <>
              <div className="form-group">
                <label className="form-label">Nivel de Escuela</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {ESCUELA_NIVELES.map((n) => (
                    <button
                      key={n}
                      onClick={() =>
                        setEditando((p) => ({ ...p, escuela_nivel: n }))
                      }
                      style={{
                        padding: "5px 14px",
                        borderRadius: 20,
                        border: "none",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 700,
                        transition: "all .15s",
                        background:
                          editando.escuela_nivel === n
                            ? ESCUELA_NIVEL_COLOR[n]
                            : "var(--surface2)",
                        color:
                          editando.escuela_nivel === n
                            ? "#fff"
                            : "var(--muted)",
                      }}
                    >
                      {ESCUELA_NIVEL_LABEL[n]}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {!editando.escuela && !editando.pretemporada && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              {[
                [
                  "periodo",
                  "Período",
                  PERIODOS.map((p) => [p, PERIODO_LABEL[p]]),
                ],
                [
                  "objetivo",
                  "Objetivo",
                  OBJETIVOS.map((o) => [o, OBJETIVO_LABEL[o]]),
                ],
                ["nivel", "Nivel", NIVELES.map((n) => [n, NIVEL_LABEL[n]])],
              ].map(([k, lbl, opts]) => (
                <div key={k} className="form-group">
                  <label className="form-label">{lbl}</label>
                  <select
                    name="field_66"
                    className="form-select"
                    value={editando[k]}
                    onChange={(e) =>
                      setEditando((p) => ({ ...p, [k]: e.target.value }))
                    }
                  >
                    {opts.map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
          <div
            className="flex gap8 mt16"
            style={{ justifyContent: "flex-end" }}
          >
            <button className="btn btn-ghost" onClick={() => setEditando(null)}>
              Cancelar
            </button>
            <button
              className="btn btn-gold"
              onClick={() => {
                onUpdate(editando);
                setEditando(null);
              }}
            >
              Guardar cambios
            </button>
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <Modal
          title="Eliminar plantilla"
          onClose={() => setConfirmDelete(null)}
        >
          <p style={{ fontSize: 13, color: "var(--text)", marginBottom: 16 }}>
            ¿Eliminar <strong>{confirmDelete.nombre}</strong>? Esta acción no se
            puede deshacer.
          </p>
          <div className="flex gap8" style={{ justifyContent: "flex-end" }}>
            <button
              className="btn btn-ghost"
              onClick={() => setConfirmDelete(null)}
            >
              Cancelar
            </button>
            <button
              className="btn"
              style={{ background: "var(--red)", color: "#fff" }}
              onClick={() => {
                onDelete(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              <Trash2 size={14} /> Eliminar
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Normativos por atleta ────────────────────────────────────────────────────
function PageNormativosAtleta({
  atleta,
  globalNormativos,
  atletaNormativos,
  atletaNormOverrides,
  saveAtletaOverrides,
  getEjAtleta,
}) {
  const [filtro, setFiltro] = useState("");
  const [catFiltro, setCatFiltro] = useState("");
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [error, setError] = useState("");

  const globalById = {};
  globalNormativos.forEach((e) => {
    globalById[e.id] = e;
  });

  const startEdit = (e) => {
    const curr = getEjAtleta(e.id) || e;
    setEditId(e.id);
    setEditForm({
      id: e.id,
      pct_base: curr.pct_base ?? "",
      base: curr.base || "",
    });
    setError("");
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditForm(null);
    setError("");
  };

  const confirmEdit = () => {
    if (!editForm) return;
    const parsedPct =
      editForm.pct_base === "" ? null : Number(editForm.pct_base);
    if (
      parsedPct !== null &&
      (isNaN(parsedPct) || parsedPct < 0 || parsedPct > 200)
    ) {
      setError("% Base debe estar entre 0 y 200");
      return;
    }
    const globalEj = globalById[editId];
    if (!globalEj) {
      setError("No se pudo encontrar el ejercicio global");
      return;
    }

    const nextRow = {};
    if (parsedPct !== (globalEj.pct_base ?? null)) nextRow.pct_base = parsedPct;
    if ((editForm.base || "") !== (globalEj.base || ""))
      nextRow.base = editForm.base || "";

    saveAtletaOverrides((prev) => {
      const next = { ...prev };
      if (Object.keys(nextRow).length === 0) delete next[editId];
      else next[editId] = nextRow;
      return next;
    });
    setEditId(null);
    setEditForm(null);
    setError("");
  };

  const resetOverride = (id) => {
    saveAtletaOverrides((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (editId === id) cancelEdit();
  };

  const filtered = atletaNormativos
    .filter(
      (e) =>
        (!catFiltro || e.categoria === catFiltro) &&
        (!filtro ||
          e.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
          String(e.id).includes(filtro)),
    )
    .sort((a, b) => Number(a.id) - Number(b.id));

  const setF = (field, val) => setEditForm((f) => ({ ...f, [field]: val }));
  const inputStyle = {
    background: "var(--surface3)",
    border: "1px solid var(--gold)",
    borderRadius: 5,
    color: "var(--text)",
    fontSize: 12,
    padding: "3px 6px",
    outline: "none",
    width: "100%",
  };

  return (
    <div>
      <div className="flex-between mb16">
        <div>
          <div className="page-title">Normativos A · {atleta.nombre}</div>
          <div className="page-sub">
            Overrides locales por atleta sobre los normativos globales
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex gap12 mb14" style={{ flexWrap: "wrap" }}>
          <input
            name="field_67"
            className="form-input"
            style={{ maxWidth: 240 }}
            placeholder="Buscar por nombre o ID..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />
          <select
            name="field_68"
            className="form-select"
            style={{ maxWidth: 200 }}
            value={catFiltro}
            onChange={(e) => setCatFiltro(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {CATEGORIAS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <span className="text-sm text-muted" style={{ alignSelf: "center" }}>
            {filtered.length} ejercicios ·{" "}
            {Object.keys(atletaNormOverrides).length} overrides
          </span>
        </div>

        {error && (
          <div
            style={{
              marginBottom: 12,
              padding: "8px 14px",
              borderRadius: 8,
              background: "rgba(232,71,71,.1)",
              border: "1px solid rgba(232,71,71,.3)",
              fontSize: 12,
              color: "var(--red)",
              fontWeight: 600,
            }}
          >
            ⚠ {error}
          </div>
        )}

        <div className="scroll-x">
          <table className="norm-table">
            <thead>
              <tr>
                <th style={{ width: 50 }}>ID</th>
                <th>Ejercicio</th>
                <th style={{ width: 150 }}>Categoría</th>
                <th style={{ width: 90, textAlign: "center" }}>% Base</th>
                <th style={{ width: 120 }}>Base IRM</th>
                <th style={{ width: 160, textAlign: "right" }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => {
                const isEditing = editId === e.id;
                const row = isEditing ? editForm : e;
                const ovr = atletaNormOverrides[e.id] || null;
                const hasOverride = !!ovr;
                const pctOver =
                  hasOverride &&
                  Object.prototype.hasOwnProperty.call(ovr, "pct_base");
                const baseOver =
                  hasOverride &&
                  Object.prototype.hasOwnProperty.call(ovr, "base");

                return (
                  <tr
                    key={e.id}
                    style={{
                      background: isEditing
                        ? "rgba(232,197,71,.06)"
                        : hasOverride
                          ? "rgba(71,157,232,.05)"
                          : "transparent",
                      cursor: isEditing ? "default" : "pointer",
                      borderLeft: hasOverride
                        ? "3px solid var(--blue)"
                        : "3px solid transparent",
                    }}
                    onClick={() => !isEditing && startEdit(e)}
                  >
                    <td>
                      <span
                        style={{
                          fontFamily: "'Bebas Neue'",
                          fontSize: 16,
                          color: "var(--muted)",
                        }}
                      >
                        {e.id}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 500 }}>{e.nombre}</span>
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: `${CAT_COLOR[e.categoria]}20`,
                          color: CAT_COLOR[e.categoria],
                        }}
                      >
                        {e.categoria}
                      </span>
                    </td>
                    <td
                      style={{ textAlign: "center" }}
                      onClick={(ev) => isEditing && ev.stopPropagation()}
                    >
                      {isEditing ? (
                        <input
                          name="field_69"
                          type="number"
                          min={0}
                          max={200}
                          style={{
                            ...inputStyle,
                            width: 70,
                            textAlign: "center",
                            borderColor: pctOver
                              ? "var(--blue)"
                              : "var(--gold)",
                            color: pctOver ? "var(--blue)" : "var(--text)",
                          }}
                          value={row.pct_base}
                          onChange={(ev) => setF("pct_base", ev.target.value)}
                        />
                      ) : (
                        <span
                          style={{
                            fontFamily: "'Bebas Neue'",
                            fontSize: 16,
                            color: pctOver ? "var(--blue)" : "var(--gold)",
                          }}
                        >
                          {e.pct_base ?? "—"}
                        </span>
                      )}
                    </td>
                    <td onClick={(ev) => isEditing && ev.stopPropagation()}>
                      {isEditing ? (
                        <select
                          name="field_70"
                          style={{
                            ...inputStyle,
                            borderColor: baseOver
                              ? "var(--blue)"
                              : "var(--gold)",
                            color: baseOver ? "var(--blue)" : "var(--text)",
                          }}
                          value={row.base || ""}
                          onChange={(ev) => setF("base", ev.target.value)}
                        >
                          <option value="arranque">Arranque</option>
                          <option value="envion">Envión</option>
                          <option value="">Ninguna</option>
                        </select>
                      ) : (
                        <span
                          className="text-sm"
                          style={{
                            color: baseOver ? "var(--blue)" : "var(--muted)",
                          }}
                        >
                          {e.base || "—"}
                        </span>
                      )}
                    </td>
                    <td
                      style={{ textAlign: "right" }}
                      onClick={(ev) => ev.stopPropagation()}
                    >
                      {isEditing ? (
                        <div
                          className="flex gap4"
                          style={{ justifyContent: "flex-end" }}
                        >
                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={cancelEdit}
                          >
                            ✕
                          </button>
                          <button
                            className="btn btn-gold btn-xs"
                            onClick={confirmEdit}
                          >
                            ✓
                          </button>
                        </div>
                      ) : hasOverride ? (
                        <button
                          className="btn btn-ghost btn-xs"
                          style={{ color: "var(--blue)" }}
                          onClick={() => resetOverride(e.id)}
                        >
                          Resetear
                        </button>
                      ) : (
                        <span style={{ color: "var(--surface3)" }}>•</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Selector de plantilla para usar al crear mesociclo ───────────────────────
function PageNormativos({ coachId, isActive = false }) {
  const isNormativosValid = (value) =>
    Array.isArray(value) && value.length >= EJERCICIOS.length;

  const [ejercicios, setEjercicios] = useState(() => {
    const stored = readLocalJson("liftplan_normativos", null);
    return isNormativosValid(stored) ? stored : EJERCICIOS;
  });
  const [filtro, setFiltro] = useState("");
  const [catFiltro, setCatFiltro] = useState("");
  const [editId, setEditId] = useState(null); // id original del ej en edición
  const [editForm, setEditForm] = useState(null); // copia local mientras se edita
  const [showAdd, setShowAdd] = useState(false);
  const [newEj, setNewEj] = useState({
    id: "",
    nombre: "",
    categoria: "Arranque",
    pct_base: "",
    base: "arranque",
  });
  const [confirmDel, setConfirmDel] = useState(null);
  const [error, setError] = useState("");
  const isSyncingRef = useRef(false);

  const syncFromDb = useCallback(async () => {
    if (!coachId || isSyncingRef.current) return;
    isSyncingRef.current = true;
    try {
      const remoteRow = await loadCoachSettingRow(
        coachId,
        COACH_SETTING_KEYS.normativos,
      );
      const remote = remoteRow?.setting_value ?? null;

      if (isNormativosValid(remote)) {
        const local = readLocalJson("liftplan_normativos", null);
        const hasChanged = JSON.stringify(local) !== JSON.stringify(remote);
        if (hasChanged) {
          setEjercicios(remote);
          writeLocalJson("liftplan_normativos", remote);
        }
        return;
      }

      const local = readLocalJson("liftplan_normativos", null);
      const seed = isNormativosValid(local) ? local : EJERCICIOS;
      if (!isNormativosValid(local)) {
        writeLocalJson("liftplan_normativos", seed);
        setEjercicios(seed);
      }
      await saveCoachSetting(coachId, COACH_SETTING_KEYS.normativos, seed);
    } finally {
      isSyncingRef.current = false;
    }
  }, [coachId]);

  useEffect(() => {
    if (!coachId) return;
    syncFromDb().catch(() => {});
  }, [coachId, syncFromDb]);

  useEffect(() => {
    if (!coachId || !isActive) return;
    const unsub = _visResume.sub(() => syncFromDb().catch(() => {}));
    return () => unsub();
  }, [coachId, isActive, syncFromDb]);

  const save = (list) => {
    setEjercicios(list);
    writeLocalJson("liftplan_normativos", list);
    if (coachId) {
      saveCoachSetting(coachId, COACH_SETTING_KEYS.normativos, list);
    }
  };

  // Abrir edición: crea copia local del ejercicio
  const startEdit = (e) => {
    setEditId(e.id);
    setEditForm({ ...e, pct_base: e.pct_base ?? "" });
    setError("");
  };

  // Cancelar edición sin guardar
  const cancelEdit = () => {
    setEditId(null);
    setEditForm(null);
    setError("");
  };

  // Confirmar edición con validaciones
  const confirmEdit = () => {
    if (!editForm.nombre.trim()) {
      setError("El nombre no puede estar vacío");
      return;
    }
    const newId =
      editForm.id !== "" && editForm.id !== null ? Number(editForm.id) : editId;
    if (isNaN(newId) || newId === 0) {
      setError("El ID debe ser un número válido");
      return;
    }
    if (newId !== editId && ejercicios.some((e) => Number(e.id) === newId)) {
      setError(`El ID ${newId} ya está en uso`);
      return;
    }
    save(
      ejercicios.map((e) =>
        e.id === editId
          ? {
              ...editForm,
              id: newId,
              pct_base:
                editForm.pct_base !== "" ? Number(editForm.pct_base) : null,
            }
          : e,
      ),
    );
    setEditId(null);
    setEditForm(null);
    setError("");
  };

  const deleteEj = (id) => {
    save(ejercicios.filter((e) => e.id !== id));
    setConfirmDel(null);
    if (editId === id) cancelEdit();
  };

  const addEj = () => {
    if (!newEj.nombre.trim()) {
      setError("El nombre no puede estar vacío");
      return;
    }
    const id =
      newEj.id !== ""
        ? Number(newEj.id)
        : Math.max(...ejercicios.map((e) => Number(e.id) || 0)) + 1;
    if (isNaN(id)) {
      setError("El ID debe ser un número");
      return;
    }
    if (ejercicios.some((e) => Number(e.id) === id)) {
      setError(`El ID ${id} ya existe`);
      return;
    }
    setError("");
    save([
      ...ejercicios,
      {
        ...newEj,
        id,
        pct_base: newEj.pct_base !== "" ? Number(newEj.pct_base) : null,
      },
    ]);
    setNewEj({
      id: "",
      nombre: "",
      categoria: "Arranque",
      pct_base: "",
      base: "arranque",
    });
    setShowAdd(false);
  };

  const filtered = ejercicios
    .filter(
      (e) =>
        (!catFiltro || e.categoria === catFiltro) &&
        (!filtro ||
          e.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
          String(e.id).includes(filtro)),
    )
    .sort((a, b) => Number(a.id) - Number(b.id));

  const setF = (field, val) => setEditForm((f) => ({ ...f, [field]: val }));

  const inputStyle = {
    background: "var(--surface3)",
    border: "1px solid var(--gold)",
    borderRadius: 5,
    color: "var(--text)",
    fontSize: 12,
    padding: "3px 6px",
    outline: "none",
    width: "100%",
  };

  return (
    <div>
      <div className="flex-between mb16">
        <div>
          <div className="page-title">Normativos G</div>
          <div className="page-sub">
            Ejercicios y porcentajes de referencia — editables globalmente
          </div>
        </div>
        <button
          className="btn btn-gold btn-sm"
          onClick={() => {
            setShowAdd((s) => !s);
            setError("");
          }}
        >
          {showAdd ? "Cancelar" : "+ Nuevo ejercicio"}
        </button>
      </div>

      {/* Formulario nuevo ejercicio */}
      {showAdd && (
        <div
          className="card mb16"
          style={{
            background: "rgba(232,197,71,.05)",
            border: "1px solid rgba(232,197,71,.25)",
          }}
        >
          <div className="card-title" style={{ fontSize: 15 }}>
            Nuevo ejercicio
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(100px,1fr))",
              gap: 10,
              alignItems: "end",
            }}
          >
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">ID</label>
              <input
                name="field_73"
                className="form-input"
                type="number"
                placeholder="auto"
                value={newEj.id}
                onChange={(e) =>
                  setNewEj((n) => ({ ...n, id: e.target.value }))
                }
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Nombre</label>
              <input
                name="field_74"
                className="form-input"
                placeholder="Nombre del ejercicio"
                value={newEj.nombre}
                onChange={(e) =>
                  setNewEj((n) => ({ ...n, nombre: e.target.value }))
                }
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Categoría</label>
              <select
                name="field_75"
                className="form-select"
                value={newEj.categoria}
                onChange={(e) =>
                  setNewEj((n) => ({ ...n, categoria: e.target.value }))
                }
              >
                {CATEGORIAS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">% Base</label>
              <input
                name="field_76"
                className="form-input"
                type="number"
                min={0}
                max={200}
                placeholder="100"
                value={newEj.pct_base}
                onChange={(e) =>
                  setNewEj((n) => ({ ...n, pct_base: e.target.value }))
                }
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Referencia</label>
              <select
                name="field_77"
                className="form-select"
                value={newEj.base}
                onChange={(e) =>
                  setNewEj((n) => ({ ...n, base: e.target.value }))
                }
              >
                <option value="arranque">Arranque</option>
                <option value="envion">Envión</option>
                <option value="">Ninguna</option>
              </select>
            </div>
          </div>
          {error && (
            <div
              style={{
                color: "var(--red)",
                fontSize: 12,
                fontWeight: 600,
                marginTop: 8,
              }}
            >
              ⚠ {error}
            </div>
          )}
          <div
            style={{
              marginTop: 12,
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
            }}
          >
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setShowAdd(false);
                setError("");
              }}
            >
              Cancelar
            </button>
            <button className="btn btn-gold btn-sm" onClick={addEj}>
              Agregar ejercicio
            </button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="card">
        <div className="flex gap12 mb14" style={{ flexWrap: "wrap" }}>
          <input
            name="field_78"
            className="form-input"
            style={{ maxWidth: 240 }}
            placeholder="Buscar por nombre o ID..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />
          <select
            name="field_79"
            className="form-select"
            style={{ maxWidth: 200 }}
            value={catFiltro}
            onChange={(e) => setCatFiltro(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {CATEGORIAS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <span className="text-sm text-muted" style={{ alignSelf: "center" }}>
            {filtered.length} ejercicios
          </span>
        </div>

        {/* Error en edición */}
        {error && editId && (
          <div
            style={{
              marginBottom: 12,
              padding: "8px 14px",
              borderRadius: 8,
              background: "rgba(232,71,71,.1)",
              border: "1px solid rgba(232,71,71,.3)",
              fontSize: 12,
              color: "var(--red)",
              fontWeight: 600,
            }}
          >
            ⚠ {error}
          </div>
        )}

        <div className="scroll-x">
          <table className="norm-table">
            <thead>
              <tr>
                <th style={{ width: 50 }}>ID</th>
                <th>Ejercicio</th>
                <th style={{ width: 150 }}>Categoría</th>
                <th style={{ width: 80, textAlign: "center" }}>% Base</th>
                <th style={{ width: 100 }}>Referencia</th>
                <th style={{ width: 80, textAlign: "right" }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => {
                const isEditing = editId === e.id;
                const row = isEditing ? editForm : e;
                return (
                  <tr
                    key={e.id}
                    style={{
                      background: isEditing
                        ? "rgba(232,197,71,.06)"
                        : "transparent",
                      cursor: isEditing ? "default" : "pointer",
                    }}
                    onClick={() => !isEditing && startEdit(e)}
                  >
                    {/* ID */}
                    <td onClick={(ev) => isEditing && ev.stopPropagation()}>
                      {isEditing ? (
                        <input
                          name="field_80"
                          style={{
                            ...inputStyle,
                            width: 60,
                            textAlign: "center",
                          }}
                          value={row.id ?? ""}
                          onChange={(ev) =>
                            setF(
                              "id",
                              ev.target.value === ""
                                ? ""
                                : Number(ev.target.value),
                            )
                          }
                          onKeyDown={(ev) => {
                            // Only allow digits, backspace, delete, arrows, tab
                            if (
                              !/[\d]/.test(ev.key) &&
                              ![
                                "Backspace",
                                "Delete",
                                "ArrowLeft",
                                "ArrowRight",
                                "Tab",
                                "Enter",
                              ].includes(ev.key)
                            ) {
                              ev.preventDefault();
                            }
                          }}
                          placeholder={String(e.id)}
                        />
                      ) : (
                        <span
                          style={{
                            fontFamily: "'Bebas Neue'",
                            fontSize: 16,
                            color: "var(--muted)",
                          }}
                        >
                          {e.id}
                        </span>
                      )}
                    </td>

                    {/* Nombre */}
                    <td onClick={(ev) => isEditing && ev.stopPropagation()}>
                      {isEditing ? (
                        <input
                          name="field_81"
                          style={{ ...inputStyle, minWidth: 250 }}
                          value={row.nombre}
                          onChange={(ev) => setF("nombre", ev.target.value)}
                        />
                      ) : (
                        <span style={{ fontWeight: 500 }}>{e.nombre}</span>
                      )}
                    </td>

                    {/* Categoría */}
                    <td onClick={(ev) => isEditing && ev.stopPropagation()}>
                      {isEditing ? (
                        <select
                          name="field_82"
                          style={inputStyle}
                          value={row.categoria}
                          onChange={(ev) => setF("categoria", ev.target.value)}
                        >
                          {CATEGORIAS.map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className="badge"
                          style={{
                            background: `${CAT_COLOR[e.categoria]}20`,
                            color: CAT_COLOR[e.categoria],
                          }}
                        >
                          {e.categoria}
                        </span>
                      )}
                    </td>

                    {/* % Base */}
                    <td
                      style={{ textAlign: "center" }}
                      onClick={(ev) => isEditing && ev.stopPropagation()}
                    >
                      {isEditing ? (
                        <input
                          name="field_83"
                          type="number"
                          min={0}
                          max={200}
                          style={{
                            ...inputStyle,
                            width: 70,
                            textAlign: "center",
                          }}
                          value={row.pct_base}
                          onChange={(ev) => setF("pct_base", ev.target.value)}
                        />
                      ) : (
                        <span
                          style={{
                            fontFamily: "'Bebas Neue'",
                            fontSize: 16,
                            color: "var(--gold)",
                          }}
                        >
                          {e.pct_base || "—"}
                        </span>
                      )}
                    </td>

                    {/* Referencia */}
                    <td onClick={(ev) => isEditing && ev.stopPropagation()}>
                      {isEditing ? (
                        <select
                          name="field_84"
                          style={inputStyle}
                          value={row.base || ""}
                          onChange={(ev) => setF("base", ev.target.value)}
                        >
                          <option value="arranque">Arranque</option>
                          <option value="envion">Envión</option>
                          <option value="">Ninguna</option>
                        </select>
                      ) : (
                        <span className="text-sm text-muted">
                          {e.base || "—"}
                        </span>
                      )}
                    </td>

                    {/* Acciones */}
                    <td
                      style={{ textAlign: "right" }}
                      onClick={(ev) => ev.stopPropagation()}
                    >
                      {isEditing ? (
                        <div
                          className="flex gap4"
                          style={{ justifyContent: "flex-end" }}
                        >
                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={cancelEdit}
                          >
                            ✕
                          </button>
                          <button
                            className="btn btn-gold btn-xs"
                            onClick={confirmEdit}
                          >
                            ✓
                          </button>
                        </div>
                      ) : (
                        <button
                          className="btn btn-danger btn-xs"
                          onClick={() => setConfirmDel(e.id)}
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm delete modal */}
      {confirmDel !== null &&
        (() => {
          const ej = ejercicios.find((e) => e.id === confirmDel);
          return (
            <Modal
              title="Eliminar ejercicio"
              onClose={() => setConfirmDel(null)}
            >
              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    fontSize: 14,
                    color: "var(--text)",
                    marginBottom: 8,
                  }}
                >
                  ¿Estás seguro que querés eliminar este ejercicio?
                </div>
                <div
                  style={{
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: "12px 16px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Bebas Neue'",
                      fontSize: 18,
                      color: "var(--gold)",
                    }}
                  >
                    {ej?.id} — {ej?.nombre}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--muted)",
                      marginTop: 4,
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <span
                      className="badge"
                      style={{
                        background: `${CAT_COLOR[ej?.categoria]}20`,
                        color: CAT_COLOR[ej?.categoria],
                      }}
                    >
                      {ej?.categoria}
                    </span>
                    {ej?.pct_base && (
                      <span>
                        {ej.pct_base}% ({ej.base})
                      </span>
                    )}
                  </div>
                </div>
                <div
                  style={{ fontSize: 12, color: "var(--red)", marginTop: 10 }}
                >
                  Esta acción no se puede deshacer.
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-ghost"
                  onClick={() => setConfirmDel(null)}
                >
                  Cancelar
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => deleteEj(confirmDel)}
                >
                  Eliminar
                </button>
              </div>
            </Modal>
          );
        })()}
    </div>
  );
}

// ─── PAGE CALCULADORA ────────────────────────────────────────────────────────
function PageCalculadora({ coachId }) {
  const DEFAULT_DESCRIPTIONS = {
    tabla1: "",
    tabla2: "",
    tabla3: "",
    tabla4: "",
    tabla5: "",
  };

  const normalizeTablas = (value) => {
    if (!value || typeof value !== "object")
      return { ...TABLA_DEFAULT, _descriptions: { ...DEFAULT_DESCRIPTIONS } };
    const merged = { ...TABLA_DEFAULT };
    Object.keys(TABLA_DEFAULT).forEach((k) => {
      if (Array.isArray(value[k])) merged[k] = value[k];
    });
    merged._descriptions = {
      ...DEFAULT_DESCRIPTIONS,
      ...(value._descriptions || {}),
    };
    return merged;
  };

  const [tablas, setTablas] = useState(() => {
    const local = readLocalJson("liftplan_tablas", null);
    return normalizeTablas(local);
  });

  // Top tabs: IRM | Series/Reps
  const [seccion, setSeccion] = useState("irm");
  // Sub-tabs within each section
  const [tabIRM, setTabIRM] = useState("tabla1");
  const [tabSR, setTabSR] = useState("lookup_general");
  const [editCell, setEditCell] = useState(null);

  useEffect(() => {
    if (!coachId) return;
    let cancelled = false;

    const syncFromDb = async () => {
      const remote = await loadCoachSetting(coachId, COACH_SETTING_KEYS.tablas);
      if (cancelled) return;

      if (remote && typeof remote === "object") {
        const merged = normalizeTablas(remote);
        setTablas(merged);
        writeLocalJson("liftplan_tablas", merged);
        return;
      }

      const local = readLocalJson("liftplan_tablas", null);
      const seed = normalizeTablas(local);
      writeLocalJson("liftplan_tablas", seed);
      setTablas(seed);
      await saveCoachSetting(coachId, COACH_SETTING_KEYS.tablas, seed);
    };

    syncFromDb().catch(() => {});
    const unsub = _visResume.sub(() => syncFromDb().catch(() => {}));
    return () => {
      cancelled = true;
      unsub();
    };
  }, [coachId]);

  const saveTablas = (newTablas) => {
    setTablas(newTablas);
    writeLocalJson("liftplan_tablas", newTablas);
    if (coachId) {
      saveCoachSetting(coachId, COACH_SETTING_KEYS.tablas, newTablas);
    }
  };

  const updateCell = (tablaKey, irmIdx, col, val) => {
    const newVal = val === "" ? 0 : Number(val);
    const newTablas = { ...tablas };
    newTablas[tablaKey] = tablas[tablaKey].map((row, i) =>
      i === irmIdx ? { ...row, [col]: newVal } : row,
    );
    saveTablas(newTablas);
  };

  const updateLookup = (tablaKey, rowIdx, field, val) => {
    const newTablas = { ...tablas };
    newTablas[tablaKey] = tablas[tablaKey].map((row, i) =>
      i === rowIdx ? { ...row, [field]: val === "" ? 0 : Number(val) } : row,
    );
    saveTablas(newTablas);
  };

  const resetTabla = (tablaKey) => {
    if (!confirm("¿Restaurar esta tabla a los valores originales?")) return;
    saveTablas({ ...tablas, [tablaKey]: TABLA_DEFAULT[tablaKey] });
  };

  const rowSum = (row) => INTENS_COLS.reduce((s, c) => s + (row[c] || 0), 0);

  // IRM resultante: media ponderada = (pct50*50 + pct60*60 + ... + pct95*95) / 100
  const calcIRMresultante = (row) =>
    Math.round(INTENS_COLS.reduce((s, c) => s + (row[c] || 0) * c, 0)) / 100;

  // Suggestion state: { tablaKey, rIdx, pivotCol, pivotVal, suggested }
  const [suggestion, setSuggestion] = useState(null);
  const [testIRM, setTestIRM] = useState(null);
  const [testReps, setTestReps] = useState(14);

  // Auto-balance: fix pivot col, distribute remaining so IRM_calc = irm_nominal exactly
  // Uses two-col interpolation: finds two bracketing cols and splits weight between them
  const computeBalance = (row, pivotCol, pivotVal) => {
    const pVal = Math.min(100, Math.max(0, Number(pivotVal)));
    const remaining = 100 - pVal;
    const irmNominal = row.irm;

    // Active cols = those with value > 0, plus pivot (always active)
    let activeCols = INTENS_COLS.filter(
      (c) => c === pivotCol || (row[String(c)] || 0) > 0,
    );
    // Fallback: if no other active cols, use all adjacent to pivot
    const otherActive = activeCols.filter((c) => c !== pivotCol);
    const resolvedOther =
      otherActive.length > 0
        ? otherActive
        : INTENS_COLS.filter((c) => c !== pivotCol);

    // Build result zeroing non-active cols
    const suggested = {};
    INTENS_COLS.forEach((c) => {
      suggested[String(c)] = 0;
    });
    suggested[String(pivotCol)] = pVal;

    if (remaining <= 0) return { ...row, ...suggested };

    // Target: IRM_calc = irmNominal
    // pivot contrib: pVal * pivotCol / 100
    // other contrib needed: irmNominal - pVal * pivotCol / 100
    // other contrib = sum(w_i * c_i) / 100, sum(w_i) = remaining
    // → target avg intensity of other = (irmNominal - pVal*pivotCol/100) * 100 / remaining
    const pivotContrib = (pVal * pivotCol) / 100;
    const otherContrib = irmNominal - pivotContrib;
    const targetAvg = (otherContrib * 100) / remaining;

    const sortedOther = [...resolvedOther].sort((a, b) => a - b);
    const minI = sortedOther[0];
    const maxI = sortedOther[sortedOther.length - 1];
    const clampedTarget = Math.max(minI, Math.min(maxI, targetAvg));

    if (sortedOther.length === 1) {
      suggested[String(sortedOther[0])] = remaining;
      return { ...row, ...suggested };
    }

    // Find two bracketing cols
    let lowCol = sortedOther[0],
      highCol = sortedOther[sortedOther.length - 1];
    for (let i = 0; i < sortedOther.length - 1; i++) {
      if (
        sortedOther[i] <= clampedTarget &&
        clampedTarget <= sortedOther[i + 1]
      ) {
        lowCol = sortedOther[i];
        highCol = sortedOther[i + 1];
        break;
      }
    }

    const alpha =
      lowCol === highCol ? 0 : (clampedTarget - lowCol) / (highCol - lowCol);
    const highW = Math.round(alpha * remaining * 10) / 10;
    const lowW = Math.round((remaining - highW) * 10) / 10;

    suggested[String(lowCol)] = lowW;
    suggested[String(highCol)] = highW;

    return { ...row, ...suggested };
  };

  const applySuggestion = () => {
    if (!suggestion) return;
    const { tablaKey, rIdx, suggested } = suggestion;
    const newTablas = { ...tablas };
    newTablas[tablaKey] = tablas[tablaKey].map((row, i) =>
      i === rIdx ? suggested : row,
    );
    saveTablas(newTablas);
    setSuggestion(null);
  };

  // ── IRM distribution tables ─────────────────────────────────────────────
  const renderTablaIRM = (tablaKey) => {
    const rows = tablas[tablaKey];
    return (
      <div style={{ overflowX: "auto" }}>
        <table className="norm-table" style={{ fontSize: 12, minWidth: 620 }}>
          <thead>
            <tr>
              <th style={{ width: 48 }}>IRM</th>
              {INTENS_COLS.map((c) => (
                <th key={c} style={{ textAlign: "center", width: 56 }}>
                  {c}%
                </th>
              ))}
              <th style={{ textAlign: "center", width: 56 }}>Total</th>
              <th style={{ textAlign: "center", width: 64 }}>IRM calc.</th>
              <th style={{ width: 36 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rIdx) => {
              const total = rowSum(row);
              const ok = Math.round(total * 10) === 1000; // handles floats
              return (
                <tr key={row.irm}>
                  <td
                    style={{
                      fontFamily: "'Bebas Neue'",
                      fontSize: 16,
                      color: "var(--gold)",
                    }}
                  >
                    {row.irm}
                  </td>
                  {INTENS_COLS.map((col) => {
                    const key = String(col);
                    const isEditing =
                      editCell?.tabla === tablaKey &&
                      editCell?.rIdx === rIdx &&
                      editCell?.col === key;
                    return (
                      <td
                        key={col}
                        style={{ textAlign: "center", padding: "3px 4px" }}
                      >
                        {isEditing ? (
                          <input
                            name="field_85"
                            autoFocus
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            defaultValue={row[key] || 0}
                            style={{
                              width: 50,
                              background: "var(--surface3)",
                              border: "1px solid var(--gold)",
                              borderRadius: 4,
                              color: "var(--text)",
                              textAlign: "center",
                              fontSize: 12,
                              padding: "2px 4px",
                              outline: "none",
                            }}
                            onBlur={(e) => {
                              const newVal = e.target.value;
                              updateCell(tablaKey, rIdx, key, newVal);
                              setEditCell(null);
                              // Compute balance suggestion
                              const suggested = computeBalance(
                                tablas[tablaKey][rIdx],
                                Number(key),
                                newVal,
                              );
                              const sugTotal =
                                Math.round(
                                  INTENS_COLS.reduce(
                                    (s, c) => s + (suggested[String(c)] || 0),
                                    0,
                                  ) * 10,
                                ) / 10;
                              if (sugTotal === 100) {
                                setSuggestion({
                                  tablaKey,
                                  rIdx,
                                  pivotCol: Number(key),
                                  pivotVal: Number(newVal),
                                  suggested,
                                });
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === "Escape")
                                e.target.blur();
                            }}
                          />
                        ) : (
                          <div
                            onClick={() =>
                              setEditCell({ tabla: tablaKey, rIdx, col: key })
                            }
                            style={{
                              cursor: "pointer",
                              padding: "3px 6px",
                              borderRadius: 4,
                              color: row[key] ? "var(--text)" : "var(--muted)",
                              background: row[key]
                                ? "var(--surface2)"
                                : "transparent",
                              minWidth: 36,
                              display: "inline-block",
                              border: "1px solid transparent",
                              transition: "border .1s",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.borderColor =
                                "var(--border)")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.borderColor =
                                "transparent")
                            }
                          >
                            {row[key] || "—"}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  {/* Total con semáforo */}
                  <td style={{ textAlign: "center" }}>
                    <span
                      style={{
                        fontFamily: "'Bebas Neue'",
                        fontSize: 15,
                        color: ok ? "var(--green)" : "var(--red)",
                        fontWeight: 700,
                      }}
                    >
                      {total % 1 === 0 ? total : total.toFixed(1)}
                    </span>
                  </td>
                  {/* IRM resultante */}
                  <td style={{ textAlign: "center" }}>
                    {(() => {
                      const irm_calc = calcIRMresultante(row);
                      const diff = Math.round((irm_calc - row.irm) * 10) / 10;
                      const color =
                        diff === 0
                          ? "var(--green)"
                          : Math.abs(diff) <= 1
                            ? "var(--gold)"
                            : "var(--red)";
                      return (
                        <div style={{ lineHeight: 1.2 }}>
                          <span
                            style={{
                              fontFamily: "'Bebas Neue'",
                              fontSize: 15,
                              color,
                            }}
                          >
                            {irm_calc}
                          </span>
                          {diff !== 0 && (
                            <div style={{ fontSize: 10, color, marginTop: 1 }}>
                              {diff > 0 ? "+" : ""}
                              {diff}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td style={{ textAlign: "center", padding: "3px 4px" }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTestIRM({
                          tablaKey,
                          origRow: row,
                          editRow: { ...row },
                        });
                      }}
                      title="Testear distribución de reps"
                      style={{
                        background: "none",
                        border: "1px solid var(--border)",
                        borderRadius: 6,
                        padding: "3px 7px",
                        cursor: "pointer",
                        fontSize: 13,
                        color: "var(--muted)",
                        transition: "all .15s",
                        lineHeight: 1,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "var(--gold)";
                        e.currentTarget.style.color = "var(--gold)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--border)";
                        e.currentTarget.style.color = "var(--muted)";
                      }}
                    >
                      🧪
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ marginTop: 10, fontSize: 12, color: "var(--muted)" }}>
          💡 Cada fila debe sumar exactamente{" "}
          <span style={{ color: "var(--gold)", fontWeight: 700 }}>100</span>.
          Click en cualquier celda para editar.
        </div>

        {/* Suggestion banner */}
        {suggestion && suggestion.tablaKey === tablaKey && (
          <div
            style={{
              marginTop: 12,
              padding: "12px 16px",
              background: "rgba(232,197,71,.08)",
              border: "1px solid rgba(232,197,71,.3)",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--gold)",
                  marginBottom: 4,
                }}
              >
                ⚡ Balance exacto — IRM {tablas[tablaKey][suggestion.rIdx]?.irm}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                Priorizando{" "}
                <span style={{ color: "var(--gold)", fontWeight: 700 }}>
                  {suggestion.pivotCol}% = {suggestion.pivotVal}
                </span>
                , el resto se distribuye en dos zonas para que el IRM calculado
                sea exactamente{" "}
                <span style={{ color: "var(--green)", fontWeight: 700 }}>
                  {tablas[tablaKey][suggestion.rIdx]?.irm}
                </span>
                :
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  marginTop: 8,
                  flexWrap: "wrap",
                }}
              >
                {INTENS_COLS.map((c) => {
                  const orig =
                    tablas[tablaKey][suggestion.rIdx]?.[String(c)] || 0;
                  const sug = suggestion.suggested[String(c)] || 0;
                  const changed = orig !== sug;
                  const isPivot = c === suggestion.pivotCol;
                  return (
                    <div
                      key={c}
                      style={{
                        background: isPivot
                          ? "rgba(232,197,71,.2)"
                          : changed
                            ? "rgba(71,180,232,.1)"
                            : "var(--surface2)",
                        border: `1px solid ${isPivot ? "var(--gold)" : changed ? "var(--blue)" : "var(--border)"}`,
                        borderRadius: 6,
                        padding: "4px 8px",
                        textAlign: "center",
                        minWidth: 52,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 9,
                          color: "var(--muted)",
                          textTransform: "uppercase",
                        }}
                      >
                        {c}%
                      </div>
                      <div
                        style={{
                          fontFamily: "'Bebas Neue'",
                          fontSize: 15,
                          color: isPivot
                            ? "var(--gold)"
                            : changed
                              ? "var(--blue)"
                              : "var(--text)",
                        }}
                      >
                        {sug % 1 === 0 ? sug : sug.toFixed(1)}
                      </div>
                      {changed && !isPivot && (
                        <div style={{ fontSize: 9, color: "var(--muted)" }}>
                          era {orig % 1 === 0 ? orig : orig.toFixed(1)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                flexShrink: 0,
              }}
            >
              <button className="btn btn-gold btn-sm" onClick={applySuggestion}>
                Aplicar
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setSuggestion(null)}
              >
                Ignorar
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Series/Reps lookup tables ───────────────────────────────────────────
  const renderLookup = (tablaKey) => {
    const rows = tablas[tablaKey];
    return (
      <div style={{ overflowX: "auto" }}>
        <table className="norm-table" style={{ fontSize: 12 }}>
          <thead>
            <tr>
              <th>Intensidad</th>
              <th>Modo</th>
              <th>Reps totales</th>
              <th style={{ textAlign: "center" }}>Series</th>
              <th style={{ textAlign: "center" }}>Reps / serie</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rIdx) => (
              <tr key={rIdx}>
                <td
                  style={{
                    fontFamily: "'Bebas Neue'",
                    fontSize: 15,
                    color: "var(--gold)",
                  }}
                >
                  {row.intens}%
                </td>
                <td>
                  <span
                    className={`badge ${row.modo === "Comp" ? "badge-gold" : "badge-blue"}`}
                  >
                    {row.modo}
                  </span>
                </td>
                <td style={{ color: "var(--muted)", fontWeight: 600 }}>
                  {row.reps}
                </td>
                <td style={{ textAlign: "center" }}>
                  <input
                    name="field_86"
                    type="number"
                    min={1}
                    value={row.series || 1}
                    onChange={(e) =>
                      updateLookup(tablaKey, rIdx, "series", e.target.value)
                    }
                    style={{
                      width: 52,
                      background: "var(--surface2)",
                      border: "1px solid var(--border)",
                      borderRadius: 4,
                      color: "var(--text)",
                      textAlign: "center",
                      fontSize: 12,
                      padding: "3px 4px",
                      outline: "none",
                    }}
                  />
                </td>
                <td style={{ textAlign: "center" }}>
                  <input
                    name="field_87"
                    type="number"
                    min={1}
                    value={row.reps_serie || 1}
                    onChange={(e) =>
                      updateLookup(tablaKey, rIdx, "reps_serie", e.target.value)
                    }
                    style={{
                      width: 52,
                      background: "var(--surface2)",
                      border: "1px solid var(--border)",
                      borderRadius: 4,
                      color: "var(--text)",
                      textAlign: "center",
                      fontSize: 12,
                      padding: "3px 4px",
                      outline: "none",
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const tabActiva = seccion === "irm" ? tabIRM : tabSR;

  return (
    <div>
      {/* Header */}
      <div className="flex-between mb16">
        <div>
          <div className="page-title">Calculadora</div>
          <div className="page-sub">
            Tablas compartidas para todos los atletas — editables globalmente
          </div>
        </div>
      </div>

      {/* Secciones principales */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          marginBottom: 16,
          overflow: "hidden",
        }}
      >
        {/* Fila 1 — IRM | Series/Reps */}
        <div
          style={{ display: "flex", borderBottom: "1px solid var(--border)" }}
        >
          {[
            { id: "irm", label: "Tablas IRM" },
            { id: "sr", label: "Series / Reps" },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setSeccion(s.id)}
              style={{
                flex: 1,
                padding: "12px 0",
                border: "none",
                background: "none",
                color: seccion === s.id ? "var(--gold)" : "var(--muted)",
                fontFamily: "'Bebas Neue'",
                fontSize: 18,
                letterSpacing: ".05em",
                cursor: "pointer",
                borderBottom:
                  seccion === s.id
                    ? "2px solid var(--gold)"
                    : "2px solid transparent",
                transition: "all .2s",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Fila 2 — sub-tabs */}
        <div style={{ padding: "0 16px", display: "flex", gap: 0, height: 40 }}>
          {seccion === "irm"
            ? [
                { id: "tabla1", label: "Tabla 1" },
                { id: "tabla2", label: "Tabla 2" },
                { id: "tabla3", label: "Tabla 3" },
                { id: "tabla4", label: "Tabla 4" },
                { id: "tabla5", label: "Tabla 5" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTabIRM(t.id)}
                  style={{
                    padding: "0 16px",
                    border: "none",
                    background: "none",
                    color: tabIRM === t.id ? "var(--gold)" : "var(--muted)",
                    fontFamily: "'DM Sans'",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    borderBottom:
                      tabIRM === t.id
                        ? "2px solid var(--gold)"
                        : "2px solid transparent",
                    transition: "all .2s",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t.label}
                  {tablas._descriptions?.[t.id]
                    ? ` — ${tablas._descriptions[t.id]}`
                    : ""}
                </button>
              ))
            : [
                { id: "lookup_general", label: "General" },
                { id: "lookup_tirones", label: "Tirones" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTabSR(t.id)}
                  style={{
                    padding: "0 16px",
                    border: "none",
                    background: "none",
                    color: tabSR === t.id ? "var(--gold)" : "var(--muted)",
                    fontFamily: "'DM Sans'",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    borderBottom:
                      tabSR === t.id
                        ? "2px solid var(--gold)"
                        : "2px solid transparent",
                    transition: "all .2s",
                  }}
                >
                  {t.label}
                </button>
              ))}
        </div>
      </div>

      {/* Descripción editable por tabla (solo sección IRM) */}
      {seccion === "irm" && (
        <div style={{ padding: "8px 16px 0" }}>
          <input
            type="text"
            name="irm_description"
            value={tablas._descriptions?.[tabIRM] || ""}
            onChange={(e) => {
              const newDescriptions = {
                ...tablas._descriptions,
                [tabIRM]: e.target.value,
              };
              saveTablas({ ...tablas, _descriptions: newDescriptions });
            }}
            placeholder="Descripción (ej: Principiantes, Avanzados...)"
            style={{
              width: "100%",
              padding: "6px 10px",
              background: "var(--bg2)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              color: "var(--fg)",
              fontFamily: "'DM Sans'",
              fontSize: 12,
              outline: "none",
            }}
            maxLength={60}
          />
        </div>
      )}

      {/* Contenido */}
      <div className="card">
        {seccion === "irm" ? renderTablaIRM(tabIRM) : renderLookup(tabSR)}
      </div>

      {/* Modal Testeo IRM */}
      {testIRM &&
        (() => {
          const { tablaKey, origRow, editRow } = testIRM;
          const tablaNum = tablaKey.replace("tabla", "");
          const tablaDesc = tablas._descriptions?.[tablaKey];
          const tablaLabel = `Tabla ${tablaNum}${tablaDesc ? ` — ${tablaDesc}` : ""}`;
          const stepVal = (col, delta) => {
            const key = String(col);
            const cur = editRow[key] || 0;
            const next = Math.max(
              0,
              Math.min(100, Math.round((cur + delta) * 10) / 10),
            );
            setTestIRM({ ...testIRM, editRow: { ...editRow, [key]: next } });
          };
          const results = INTENS_COLS.map((col) => {
            const key = String(col);
            const tablaVal = editRow[key] || 0;
            const origVal = origRow[key] || 0;
            const changed = tablaVal !== origVal;
            const raw = (tablaVal * testReps) / 100;
            const rounded = Math.round(raw);
            return { col, key, tablaVal, origVal, changed, raw, rounded };
          });
          const totalRounded = results.reduce((s, r) => s + r.rounded, 0);
          const totalPct = results.reduce((s, r) => s + r.tablaVal, 0);
          const totalPctOk = Math.round(totalPct * 10) === 1000;
          const hasChanges = results.some((r) => r.changed);
          const applyChanges = () => {
            const rIdx = tablas[tablaKey].findIndex(
              (r) => r.irm === editRow.irm,
            );
            if (rIdx < 0) return;
            const newTablas = { ...tablas };
            newTablas[tablaKey] = tablas[tablaKey].map((r, i) =>
              i === rIdx ? { ...editRow } : r,
            );
            saveTablas(newTablas);
            setTestIRM(null);
          };
          const stepBtnStyle = {
            background: "none",
            border: "1px solid var(--border)",
            borderRadius: 4,
            width: 22,
            height: 18,
            cursor: "pointer",
            color: "var(--muted)",
            fontSize: 10,
            lineHeight: 1,
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all .12s",
          };
          return (
            <Modal
              title={`🧪 Testeo IRM ${editRow.irm} — ${tablaLabel}`}
              onClose={() => setTestIRM(null)}
            >
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--muted)",
                    marginBottom: 12,
                  }}
                >
                  Simulá la distribución de repeticiones. Usá las flechas ▲▼
                  para ajustar los valores y ver el resultado en tiempo real.
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  <label
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text)",
                    }}
                  >
                    Repeticiones:
                  </label>
                  <input
                    name="field_test_irm_reps"
                    autoFocus
                    type="number"
                    min={1}
                    max={200}
                    value={testReps}
                    onChange={(e) =>
                      setTestReps(Math.max(1, Number(e.target.value) || 1))
                    }
                    style={{
                      width: 72,
                      background: "var(--surface2)",
                      border: "1px solid var(--gold)",
                      borderRadius: 6,
                      color: "var(--text)",
                      textAlign: "center",
                      fontSize: 18,
                      fontFamily: "'Bebas Neue'",
                      padding: "6px 8px",
                      outline: "none",
                    }}
                  />
                </div>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table
                  className="norm-table"
                  style={{ fontSize: 12, width: "100%" }}
                >
                  <thead>
                    <tr>
                      <th style={{ textAlign: "center" }}>Intensidad</th>
                      <th style={{ textAlign: "center" }}>% Tabla</th>
                      <th style={{ textAlign: "center" }}>Cálculo</th>
                      <th style={{ textAlign: "center" }}>Reps asignadas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <tr
                        key={r.col}
                        style={{
                          opacity: r.tablaVal > 0 || r.origVal > 0 ? 1 : 0.35,
                        }}
                      >
                        <td
                          style={{
                            textAlign: "center",
                            fontFamily: "'Bebas Neue'",
                            fontSize: 15,
                            color: "var(--gold)",
                          }}
                        >
                          {r.col}%
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 4,
                            }}
                          >
                            <button
                              style={stepBtnStyle}
                              onClick={() => stepVal(r.col, -0.5)}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor =
                                  "var(--gold)";
                                e.currentTarget.style.color = "var(--gold)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor =
                                  "var(--border)";
                                e.currentTarget.style.color = "var(--muted)";
                              }}
                            >
                              ▼
                            </button>
                            <div style={{ minWidth: 32, textAlign: "center" }}>
                              <span
                                style={{
                                  fontFamily: "'Bebas Neue'",
                                  fontSize: 15,
                                  color: r.changed
                                    ? "var(--blue)"
                                    : "var(--text)",
                                  fontWeight: r.changed ? 700 : 400,
                                }}
                              >
                                {r.tablaVal || "—"}
                              </span>
                              {r.changed && (
                                <div
                                  style={{
                                    fontSize: 9,
                                    color: "var(--muted)",
                                    lineHeight: 1,
                                  }}
                                >
                                  era {r.origVal}
                                </div>
                              )}
                            </div>
                            <button
                              style={stepBtnStyle}
                              onClick={() => stepVal(r.col, 0.5)}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor =
                                  "var(--gold)";
                                e.currentTarget.style.color = "var(--gold)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor =
                                  "var(--border)";
                                e.currentTarget.style.color = "var(--muted)";
                              }}
                            >
                              ▲
                            </button>
                          </div>
                        </td>
                        <td
                          style={{
                            textAlign: "center",
                            color: "var(--text)",
                            fontSize: 11,
                          }}
                        >
                          {r.tablaVal > 0 ? (
                            <span>
                              {r.tablaVal} × {testReps} / 100 ={" "}
                              <span style={{ color: "var(--gold)" }}>
                                {r.raw % 1 === 0 ? r.raw : r.raw.toFixed(2)}
                              </span>
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span
                            style={{
                              fontFamily: "'Bebas Neue'",
                              fontSize: 17,
                              color:
                                r.rounded > 0 ? "var(--green)" : "var(--muted)",
                              fontWeight: 700,
                            }}
                          >
                            {r.rounded || "—"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: "2px solid var(--border)" }}>
                      <td
                        style={{
                          textAlign: "center",
                          fontWeight: 600,
                          fontSize: 12,
                          color: totalPctOk ? "var(--green)" : "var(--red)",
                        }}
                      >
                        Σ {Math.round(totalPct * 10) / 10}
                      </td>
                      <td></td>
                      <td
                        style={{
                          textAlign: "right",
                          fontWeight: 600,
                          fontSize: 13,
                          color: "var(--text)",
                          paddingRight: 8,
                        }}
                      >
                        Total reps:
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span
                          style={{
                            fontFamily: "'Bebas Neue'",
                            fontSize: 20,
                            color:
                              totalRounded === testReps
                                ? "var(--green)"
                                : "var(--gold)",
                            fontWeight: 700,
                          }}
                        >
                          {totalRounded}
                        </span>
                        {totalRounded !== testReps && (
                          <span
                            style={{
                              fontSize: 11,
                              color:
                                totalRounded > testReps
                                  ? "var(--red)"
                                  : "var(--gold)",
                              marginLeft: 6,
                            }}
                          >
                            ({totalRounded > testReps ? "+" : ""}
                            {totalRounded - testReps})
                          </span>
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div
                style={{
                  marginTop: 14,
                  fontSize: 11,
                  color: "var(--muted)",
                  lineHeight: 1.6,
                }}
              >
                💡 Fórmula:{" "}
                <code
                  style={{
                    background: "var(--surface2)",
                    padding: "2px 6px",
                    borderRadius: 4,
                  }}
                >
                  reps = Math.round(% × reps / 100)
                </code>{" "}
                — mismo redondeo que la tabla de turnos.
              </div>
              <div className="modal-footer" style={{ marginTop: 16 }}>
                {hasChanges && (
                  <button className="btn btn-gold" onClick={applyChanges}>
                    Aplicar a tabla
                  </button>
                )}
                <button
                  className="btn btn-ghost"
                  onClick={() => setTestIRM(null)}
                >
                  {hasChanges ? "Descartar" : "Cerrar"}
                </button>
              </div>
            </Modal>
          );
        })()}
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
// Helpers de persistencia
const load = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};
const save = (key, val) => {
  try {
    safeSetItem(key, JSON.stringify(val));
    emitLocalSyncEvent(key);
  } catch {}
};

// ═══════════════════════════════════════════════════════════════
// PANEL DE REFERENCIA — vista lateral de solo lectura
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// PANEL DE REFERENCIA

class PanelTabBoundary extends React.Component {
  constructor(p) {
    super(p);
    this.state = { err: null };
  }
  static getDerivedStateFromError(e) {
    return { err: e };
  }
  componentDidCatch(e, i) {
    console.error(
      "[BOUNDARY]",
      this.props.tab,
      e?.message,
      i?.componentStack?.slice(0, 200),
    );
  }
  render() {
    if (this.state.err)
      return (
        <div
          style={{
            padding: 24,
            color: "#e85047",
            fontSize: 12,
            fontFamily: "monospace",
            wordBreak: "break-all",
            background: "#1a0000",
            borderRadius: 8,
            margin: 8,
          }}
        >
          <strong>💥 Error en {this.props.tab}:</strong>
          <br />
          {String(this.state.err?.message || this.state.err)}
        </div>
      );
    return this.props.children;
  }
}

function PanelReferencia({
  atletas,
  mesociclos,
  plantillas,
  liveMesoData = {},
  onClose,
  onWidthChange,
  isMobile,
}) {
  const [modo, setModo] = useState("atleta");
  const [atletaId, setAtletaId] = useState(atletas[0]?.id || null);
  const [mesoId, setMesoId] = useState(null);
  const [pltId, setPltId] = useState(plantillas[0]?.id || null);
  const [semIdx, setSemIdx] = useState(0);
  const [turnoIdx, setTurnoIdx] = useState(0);
  const [vista, setVista] = useState("planilla");
  const [vistaKey, setVistaKey] = useState({ planilla: 0, resumen: 0, pdf: 0 });
  const cambiarVista = (v) => {
    setVista(v);
    setVistaKey((prev) => ({ ...prev, [v]: Date.now() }));
  };

  const misMesos = mesociclos
    .filter((m) => m.atleta_id === atletaId)
    .sort((a, b) => (b.fecha_inicio || "").localeCompare(a.fecha_inicio || ""));
  const atleta = atletas.find((a) => a.id === atletaId) || null;
  const mesoBase = misMesos.find((m) => m.id === mesoId) || misMesos[0] || null;

  // Use live meso from emit if available, otherwise use stored
  // live.meso has the latest semanas/pct_grupos structure from PageAtleta state
  const live = liveMesoData?.[atletaId];
  const meso =
    live?.meso?.id === mesoBase?.id
      ? live?.meso
      : live?.meso || mesoBase || null;

  // Read overrides from localStorage — same approach as PageResumen/PagePDF
  // This always stays in sync because PageAtleta writes to localStorage on every change
  const mid = meso?.id;
  const lsGet = (key, dflt) => {
    try {
      return (
        JSON.parse(
          localStorage.getItem(`liftplan_pt_${mid}_${key}`) || "null",
        ) ?? dflt
      );
    } catch {
      return dflt;
    }
  };
  const lsPctGet = (key, dflt) => {
    try {
      return (
        JSON.parse(
          localStorage.getItem(`liftplan_pct_${mid}_${key}`) || "null",
        ) ?? dflt
      );
    } catch {
      return dflt;
    }
  };

  const liveRepsEdit = live?.repsEdit ?? lsGet("repsEdit", {});
  const liveManualEdit = new Set(live?.manualEdit ?? lsGet("manualEdit", []));
  const liveSemPctOvr = live?.semPctOverrides ?? lsPctGet("semOvr", {});
  const liveSemPctMan = new Set(live?.semPctManual ?? lsPctGet("semMan", []));
  const liveTurnoPctOvr = live?.turnoPctOverrides ?? lsPctGet("turnoOvr", {});
  const liveTurnoPctMan = new Set(
    live?.turnoPctManual ?? lsPctGet("turnoMan", []),
  );

  const globalNormativos = (() => {
    try {
      return (
        JSON.parse(localStorage.getItem("liftplan_normativos") || "null") ||
        EJERCICIOS
      );
    } catch {
      return EJERCICIOS;
    }
  })();
  const atletaNormOverrides = (() => {
    if (!atletaId) return {};
    try {
      return (
        JSON.parse(
          localStorage.getItem(`liftplan_normativos_atleta_${atletaId}`) ||
            "null",
        ) || {}
      );
    } catch {
      return {};
    }
  })();
  const atletaNormativos = globalNormativos.map((ej) => {
    const ovr = atletaNormOverrides[ej.id];
    if (!ovr) return ej;
    return {
      ...ej,
      ...(ovr.pct_base !== undefined ? { pct_base: ovr.pct_base } : {}),
      ...(ovr.base !== undefined ? { base: ovr.base } : {}),
    };
  });

  // Re-read local overrides only when relevant storage keys actually change.
  const [localRevision, setLocalRevision] = useState(0);
  useEffect(() => {
    const bump = () => setLocalRevision((v) => v + 1);
    const shouldRefreshForKey = (key) => {
      if (!key) return false;
      if (key === "liftplan_normativos") return true;
      if (key === `liftplan_normativos_atleta_${atletaId}`) return true;
      if (!mid) return false;
      if (key.startsWith(`liftplan_pt_${mid}_`)) return true;
      if (key.startsWith(`liftplan_pct_${mid}_`)) return true;
      return false;
    };

    const onStorage = (event) => {
      if (shouldRefreshForKey(event?.key)) bump();
    };

    const onLocalSync = (event) => {
      const key = event?.detail?.key;
      if (shouldRefreshForKey(key)) bump();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(LIFTPLAN_LOCAL_SYNC_EVENT, onLocalSync);
    window.addEventListener("liftplan:normativos-overrides-updated", bump);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(LIFTPLAN_LOCAL_SYNC_EVENT, onLocalSync);
      window.removeEventListener("liftplan:normativos-overrides-updated", bump);
    };
  }, [mid, atletaId]);

  void localRevision;

  // Mirrors PlanillaTurno getSemPct/getTurnoPct/calcTentativa exactly
  const _getSemPct = (g, sIdx) => {
    const k = `${g}-${sIdx}`;
    if (liveSemPctMan.has(k)) return Number(liveSemPctOvr[k]) || 0;
    if (!meso?.semanas?.[sIdx]) return 0;
    const { porGrupo, totalSem } = calcSembradoSemana(meso.semanas[sIdx]);
    return totalSem > 0 ? ((porGrupo[g]?.total || 0) / totalSem) * 100 : 0;
  };
  const _getTurnoPct = (g, sIdx, tIdx) => {
    const k = `${g}-${sIdx}-${tIdx}`;
    if (liveTurnoPctMan.has(k)) return Number(liveTurnoPctOvr[k]) || 0;
    if (!meso?.semanas?.[sIdx]) return 0;
    const { porGrupo } = calcSembradoSemana(meso.semanas[sIdx]);
    const total = porGrupo[g]?.total || 0;
    return total > 0 ? ((porGrupo[g]?.porTurno?.[tIdx] || 0) / total) * 100 : 0;
  };

  const getRepsVal = (ej, sIdx, tIdx) => {
    const k = `${sIdx}-${tIdx}-${ej.id}`;
    // Manual override wins
    if (liveManualEdit.has(k)) return Number(liveRepsEdit[k]) || 0;
    // Direct assignment
    if (ej.reps_asignadas > 0) return ej.reps_asignadas;
    // Calculate tentativa with overrides — same as PlanillaTurno
    const sem = meso?.semanas?.[sIdx];
    if (!sem || !meso?.volumen_total) return 0;
    const reps_sem = meso.volumen_total * (sem.pct_volumen / 100);
    const g = getGrupo(ej.ejercicio_id);
    if (!g) return 0;
    const pctGSem = _getSemPct(g, sIdx) / 100;
    const pctGTurno = _getTurnoPct(g, sIdx, tIdx) / 100;
    if (!pctGSem || !pctGTurno) return 0;
    const repsBloque = Math.round(reps_sem * pctGSem * pctGTurno);
    const turno = sem.turnos[tIdx];
    if (!turno) return 0;
    const ejsG = turno.ejercicios.filter(
      (e) => e.ejercicio_id && getGrupo(e.ejercicio_id) === g,
    );
    const editados = ejsG.filter((e) =>
      liveManualEdit.has(`${sIdx}-${tIdx}-${e.id}`),
    );
    const libres = ejsG.filter(
      (e) => !liveManualEdit.has(`${sIdx}-${tIdx}-${e.id}`),
    );
    const repsReservadas = editados.reduce(
      (s, e) => s + (Number(liveRepsEdit[`${sIdx}-${tIdx}-${e.id}`]) || 0),
      0,
    );
    const repsLibres = Math.max(0, repsBloque - repsReservadas);
    if (!libres.length) return 0;
    const base = Math.floor(repsLibres / libres.length);
    const extra = repsLibres - base * libres.length;
    const idx = libres.findIndex((e) => e.id === ej.id);
    return idx >= 0 ? base + (idx < extra ? 1 : 0) : 0;
  };

  const plt = plantillas.find((p) => p.id === pltId) || null;
  const fuente = modo === "atleta" ? meso : plt?.semanas ? plt : null;
  const semanas = fuente?.semanas || [];
  const sem = semanas[semIdx] || semanas[0] || null;
  const turno = sem?.turnos?.[turnoIdx] || sem?.turnos?.[0] || null;

  useEffect(() => {
    setMesoId(null);
    setSemIdx(0);
    setTurnoIdx(0);
  }, [atletaId]);
  useEffect(() => {
    setSemIdx(0);
    setTurnoIdx(0);
  }, [mesoId, pltId, modo]);
  useEffect(() => {
    setTurnoIdx(0);
  }, [semIdx]);

  const irm_arr = modo === "atleta" ? Number(meso?.irm_arranque || 0) : 100;
  const irm_env = modo === "atleta" ? Number(meso?.irm_envion || 0) : 200;

  const TabBtn = ({ id, label }) => (
    <button
      onClick={() => cambiarVista(id)}
      style={{
        flex: 1,
        padding: "6px 0",
        border: "none",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 700,
        borderRadius: 8,
        background: vista === id ? "var(--gold)" : "var(--surface2)",
        color: vista === id ? "#000" : "var(--muted)",
        transition: "all .15s",
      }}
    >
      {label}
    </button>
  );

  const SemBtn = ({ s, i }) => (
    <button
      onClick={() => setSemIdx(i)}
      style={{
        padding: "4px 10px",
        borderRadius: 20,
        border: "none",
        cursor: "pointer",
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
        background: semIdx === i ? "var(--gold)" : "var(--surface2)",
        color: semIdx === i ? "#000" : "var(--muted)",
        transition: "all .15s",
      }}
    >
      Sem {s.numero}
    </button>
  );

  const TurnoBtn = ({ t, i }) => (
    <button
      onClick={() => setTurnoIdx(i)}
      style={{
        padding: "4px 10px",
        borderRadius: 20,
        border: "none",
        cursor: "pointer",
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
        background:
          turnoIdx === i ? "rgba(100,180,255,.85)" : "var(--surface2)",
        color: turnoIdx === i ? "#000" : "var(--muted)",
        transition: "all .15s",
      }}
    >
      T{t.numero || i + 1}
      {t.dia ? ` · ${t.dia}` : ""}
    </button>
  );

  // ── Vista PLANILLA (resumen + planilla de turnos) ────────────────
  const VistaPlanilla = () => {
    if (!fuente)
      return (
        <div
          style={{
            padding: 32,
            textAlign: "center",
            color: "var(--muted)",
            fontSize: 13,
          }}
        >
          Sin datos
        </div>
      );
    const volTotal = fuente.volumen_total || 0;
    const tablas = TABLA_DEFAULT;
    const modo_ = fuente.modo || "Preparatorio";

    // % bloques y turnos — usar _getSemPct/_getTurnoPct (respetan overrides en tiempo real)
    const GRUPOS_PANEL = ["Arranque", "Envion", "Tirones", "Piernas"];
    const turnosRef = sem?.turnos || [];
    const gruposPct = GRUPOS_PANEL.map((g) => ({
      g,
      col: CAT_COLOR[g] || "var(--muted)",
      pctSem: Math.round(_getSemPct(g, semIdx)),
      pctTurnos: turnosRef
        .map((t, tIdx) => ({
          tIdx,
          label: `T${t.numero || tIdx + 1}${t.dia ? ` ${t.dia.slice(0, 3)}` : ""}`,
          pct: Math.round(_getTurnoPct(g, semIdx, tIdx)),
        }))
        .filter((x) => x.pct > 0),
    })).filter((x) => x.pctSem > 0);

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {/* IRM + vol */}
        {modo === "atleta" && meso && (
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {[
              { v: meso.irm_arranque, l: "Arr kg", c: "var(--gold)" },
              { v: meso.irm_envion, l: "Env kg", c: "var(--blue)" },
              { v: volTotal, l: "Vol reps", c: "var(--text)" },
            ].map(({ v, l, c }) => (
              <div key={l} style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontFamily: "'Bebas Neue'",
                    fontSize: 22,
                    color: c,
                    lineHeight: 1,
                  }}
                >
                  {v || "—"}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    letterSpacing: ".06em",
                    marginTop: 2,
                  }}
                >
                  {l}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* % Semanal — usa s.pct_volumen directo de live.meso (siempre actualizado) */}
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: ".07em",
              marginBottom: 8,
            }}
          >
            % Semanal · Reps
          </div>
          {semanas.map((s, i) => {
            const pct = s.pct_volumen;
            const reps = Math.round((volTotal * pct) / 100);
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 5,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--muted)",
                    width: 52,
                    flexShrink: 0,
                  }}
                >
                  Sem {s.numero}
                </div>
                <div
                  style={{
                    flex: 1,
                    height: 6,
                    background: "var(--surface3)",
                    borderRadius: 3,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      borderRadius: 3,
                      width: `${pct}%`,
                      background: "var(--gold)",
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--gold)",
                    width: 30,
                    textAlign: "right",
                    flexShrink: 0,
                  }}
                >
                  {pct}%
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--muted)",
                    width: 44,
                    textAlign: "right",
                    flexShrink: 0,
                  }}
                >
                  {reps}r
                </div>
              </div>
            );
          })}
        </div>

        {/* % Bloques — usa _getSemPct (respeta overrides) + desglose por turno */}
        {gruposPct.length > 0 && (
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: ".07em",
                marginBottom: 8,
              }}
            >
              % Bloques · Sem {sem?.numero}
            </div>
            {gruposPct.map(({ g, col, pctSem, pctTurnos }) => (
              <div key={g} style={{ marginBottom: 8 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 3,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: col,
                      width: 70,
                      flexShrink: 0,
                      fontWeight: 600,
                    }}
                  >
                    {g}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      height: 6,
                      background: "var(--surface3)",
                      borderRadius: 3,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        borderRadius: 3,
                        width: `${pctSem}%`,
                        background: col,
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: col,
                      width: 34,
                      textAlign: "right",
                      flexShrink: 0,
                    }}
                  >
                    {pctSem}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* % Bloques por turno — mismo formato, datos de _getTurnoPct del turno activo */}
        {gruposPct.length > 0 && (
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: ".07em",
                marginBottom: 8,
              }}
            >
              % Bloques · T{turno?.numero || turnoIdx + 1}
              {turno?.dia ? ` · ${turno.dia.slice(0, 3)}` : ""}
            </div>
            {gruposPct.map(({ g, col, pctSem }) => {
              const pct = Math.round(_getTurnoPct(g, semIdx, turnoIdx));
              if (!pct) return null;
              return (
                <div
                  key={g}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 5,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: col,
                      width: 70,
                      flexShrink: 0,
                      fontWeight: 600,
                    }}
                  >
                    {g}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      height: 6,
                      background: "var(--surface3)",
                      borderRadius: 3,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        borderRadius: 3,
                        width: `${pct}%`,
                        background: col,
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: col,
                      width: 34,
                      textAlign: "right",
                      flexShrink: 0,
                    }}
                  >
                    {pct}%
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* % Turnos — mismo formato que % Semanal, usando _getTurnoPct por bloque */}
        {turnosRef.length > 0 && gruposPct.length > 0 && (
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: ".07em",
                marginBottom: 8,
              }}
            >
              % Turnos · Sem {sem?.numero}
            </div>
            {turnosRef.map((t, tIdx) => {
              const pct = Math.round(
                gruposPct.reduce(
                  (sum, { g, pctSem }) =>
                    sum + (pctSem * _getTurnoPct(g, semIdx, tIdx)) / 100,
                  0,
                ),
              );
              if (!pct) return null;
              const label = `T${t.numero || tIdx + 1}${t.dia ? ` · ${t.dia.slice(0, 3)}` : ""}`;
              return (
                <div
                  key={tIdx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 5,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--muted)",
                      width: 52,
                      flexShrink: 0,
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      height: 6,
                      background: "var(--surface3)",
                      borderRadius: 3,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        borderRadius: 3,
                        width: `${pct}%`,
                        background: "var(--blue)",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--blue)",
                      width: 30,
                      textAlign: "right",
                      flexShrink: 0,
                    }}
                  >
                    {pct}%
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Divisor */}
        {turno &&
          turno.ejercicios?.filter((e) => e.ejercicio_id).length > 0 && (
            <div
              style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: ".07em",
                  marginBottom: 12,
                }}
              >
                Planilla · Sem {sem?.numero} · T{turno?.numero || turnoIdx + 1}
                {turno?.dia ? ` · ${turno.dia}` : ""}
              </div>
              {turno.ejercicios
                .filter((e) => e.ejercicio_id)
                .map((ej, i) => {
                  const data = getEjercicioById(
                    ej.ejercicio_id,
                    atletaNormativos,
                  );
                  const col = CAT_COLOR[data?.categoria] || "var(--muted)";
                  const k = `${semIdx}-${turnoIdx}-${ej.id}`;
                  const repsVal = getRepsVal(ej, semIdx, turnoIdx);
                  const liveCellEdit = live?.cellEdit || {};
                  const liveCellManual = live?.cellManual || new Set();
                  const getC = (intens, field, def) => {
                    const k2 = `${semIdx}-${turnoIdx}-${ej.id}-${intens}-${field}`;
                    return liveCellManual.has(k2)
                      ? Number(liveCellEdit[k2]) || 0
                      : def;
                  };
                  const calcs =
                    repsVal > 0
                      ? calcSeriesRepsKg(
                          tablas,
                          ej,
                          data,
                          irm_arr,
                          irm_env,
                          modo_,
                          repsVal,
                        )
                      : null;
                  return (
                    <div
                      key={i}
                      style={{
                        border: `1px solid ${col}40`,
                        borderRadius: 10,
                        overflow: "hidden",
                        background: `${col}08`,
                        marginBottom: 8,
                      }}
                    >
                      <div
                        style={{
                          padding: "6px 10px",
                          borderBottom: `1px solid ${col}25`,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "'Bebas Neue'",
                            fontSize: 14,
                            color: col,
                            minWidth: 20,
                          }}
                        >
                          {ej.ejercicio_id}
                        </span>
                        <span
                          style={{
                            flex: 1,
                            fontSize: 12,
                            color: "var(--text)",
                            fontWeight: 600,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {data?.nombre || "?"}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            color: "var(--muted)",
                            flexShrink: 0,
                          }}
                        >
                          T{ej.tabla} · {ej.intensidad}%
                        </span>
                      </div>
                      <div style={{ padding: "6px 10px" }}>
                        {repsVal > 0 ? (
                          <div
                            style={{
                              display: "flex",
                              gap: 5,
                              flexWrap: "wrap",
                              alignItems: "center",
                            }}
                          >
                            <span
                              style={{
                                color: "var(--gold)",
                                fontWeight: 700,
                                fontFamily: "'Bebas Neue'",
                                fontSize: 16,
                              }}
                            >
                              {repsVal}r
                            </span>
                            {calcs &&
                              INTENSIDADES.map((intens, ii) => {
                                const c = calcs[ii];
                                if (!c || c.series == null) return null;
                                const s = getC(intens, "series", c.series);
                                const r = getC(intens, "reps", c.reps_serie);
                                const kg = getC(intens, "kg", c.kg);
                                return (
                                  <span
                                    key={intens}
                                    style={{
                                      padding: "2px 7px",
                                      borderRadius: 6,
                                      background: "var(--surface2)",
                                      fontSize: 11,
                                    }}
                                  >
                                    <span style={{ color: "var(--muted)" }}>
                                      {intens}%{" "}
                                    </span>
                                    <span
                                      style={{
                                        color: "var(--text)",
                                        fontWeight: 600,
                                      }}
                                    >
                                      {s}×{r}
                                    </span>
                                    {kg && (
                                      <span style={{ color: "var(--muted)" }}>
                                        {" "}
                                        {kg}kg
                                      </span>
                                    )}
                                  </span>
                                );
                              })}
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: "var(--muted)" }}>
                            Sin reps asignadas
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
      </div>
    );
  };

  // ── Resumen completo (reutiliza PageResumen) ─────────────────
  const _mesoRef = fuente
    ? modo === "atleta"
      ? meso
      : {
          ...fuente,
          id: fuente.id,
          modo: fuente.modo || "Preparatorio",
          irm_arranque: irm_arr,
          irm_envion: irm_env,
        }
    : null;
  // atleta puede ser null si el ID no matchea — usar fallback para no bloquear Resumen/PDF
  const _atletaBase = atleta || {
    id: atletaId || "?",
    nombre: "Atleta",
    telefono: "",
  };
  const _atletaRef = fuente
    ? modo === "atleta"
      ? _atletaBase
      : { nombre: fuente.nombre || "Atleta", id: fuente.id, telefono: "" }
    : null;
  const _hasDatos = !!_mesoRef?.semanas?.length;

  const [panelWidth, setPanelWidth] = useState(420);
  const resizing = useRef(false);
  const [isMobileState, setIsMobileState] = useState(
    typeof window !== "undefined" && window.innerWidth <= 768,
  );
  useEffect(() => {
    const check = () => setIsMobileState(window.innerWidth <= 768);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  const isM = isMobile !== undefined ? isMobile : isMobileState;

  const onResizeStart = (e) => {
    e.preventDefault();
    resizing.current = true;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "ew-resize";

    const onMove = (ev) => {
      if (!resizing.current) return;
      const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const raw = window.innerWidth - clientX;
      const newW = Math.min(Math.max(raw, 280), window.innerWidth * 0.85);
      setPanelWidth(newW);
      onWidthChange && onWidthChange(newW);
    };
    const onUp = () => {
      resizing.current = false;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
  };

  return (
    <div
      style={{
        position: isM ? "fixed" : "relative",
        right: isM ? 0 : undefined,
        top: isM ? 0 : undefined,
        bottom: isM ? 0 : undefined,
        zIndex: isM ? 300 : 1,
        width: panelWidth,
        minWidth: 260,
        flexShrink: 0,
        background: "var(--surface)",
        borderLeft: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        boxShadow: isM
          ? "-8px 0 32px rgba(0,0,0,.5)"
          : "-2px 0 12px rgba(0,0,0,.2)",
        height: isM ? undefined : "100%",
        overflowY: "hidden",
      }}
    >
      {/* Resize handle */}
      <div
        onMouseDown={onResizeStart}
        onTouchStart={onResizeStart}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 6,
          cursor: "ew-resize",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 3,
            height: 40,
            borderRadius: 3,
            background: "var(--border)",
            opacity: 0.6,
            pointerEvents: "none",
          }}
        />
      </div>
      {/* Header */}
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontFamily: "'Bebas Neue'",
            fontSize: 17,
            color: "var(--gold)",
            letterSpacing: ".04em",
            flex: 1,
          }}
        >
          Panel de Referencia
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "var(--muted)",
            cursor: "pointer",
            fontSize: 22,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      {/* Modo */}
      <div
        style={{
          padding: "8px 14px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          gap: 6,
          flexShrink: 0,
        }}
      >
        {[
          ["atleta", "Atleta/Meso"],
          ["plantilla", "Plantilla"],
        ].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setModo(v)}
            style={{
              flex: 1,
              padding: "5px 0",
              borderRadius: 7,
              border: "none",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
              background: modo === v ? "var(--gold)" : "var(--surface2)",
              color: modo === v ? "#000" : "var(--muted)",
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Selectores */}
      <div
        style={{
          padding: "8px 14px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          flexShrink: 0,
        }}
      >
        {modo === "atleta" ? (
          <>
            <select
              name="field_88"
              className="form-select"
              value={atletaId || ""}
              onChange={(e) => setAtletaId(e.target.value)}
              style={{ fontSize: 12, padding: "5px 10px" }}
            >
              {atletas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
            <select
              name="field_89"
              className="form-select"
              value={mesoId || misMesos[0]?.id || ""}
              onChange={(e) => setMesoId(e.target.value)}
              style={{ fontSize: 12, padding: "5px 10px" }}
            >
              {misMesos.length === 0 ? (
                <option value="">Sin mesociclos</option>
              ) : (
                misMesos.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre || "Sin nombre"} ·{" "}
                    {formatDateDisplay(m.fecha_inicio)} · {m.modo}
                  </option>
                ))
              )}
            </select>
          </>
        ) : (
          <select
            name="field_90"
            className="form-select"
            value={pltId || ""}
            onChange={(e) => setPltId(e.target.value)}
            style={{ fontSize: 12, padding: "5px 10px" }}
          >
            {plantillas.length === 0 ? (
              <option value="">Sin plantillas</option>
            ) : (
              plantillas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                  {p.escuela ? ` · EI N${p.escuela_nivel}` : ""}
                </option>
              ))
            )}
          </select>
        )}
      </div>

      {/* Vista tabs — botones inline directos, sin componente interno */}
      <div
        style={{
          padding: "8px 14px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          gap: 6,
          flexShrink: 0,
        }}
      >
        {(fuente?.pretemporada === true || fuente?.pretemporada === "true"
          ? ["planilla", "pdf"]
          : ["planilla", "resumen", "pdf"]
        ).map((id) => (
          <button
            key={id}
            onClick={() => {
              setVista(id);
              setVistaKey((prev) => ({ ...prev, [id]: Date.now() }));
            }}
            style={{
              flex: 1,
              padding: "6px 0",
              border: "none",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
              borderRadius: 8,
              background: vista === id ? "var(--gold)" : "var(--surface2)",
              color: vista === id ? "#000" : "var(--muted)",
              transition: "all .15s",
            }}
          >
            {id === "planilla"
              ? "Planilla"
              : id === "resumen"
                ? "Resumen"
                : "PDF"}
          </button>
        ))}
      </div>

      {/* Semanas */}
      {vista === "planilla" && semanas.length > 0 && (
        <div
          style={{
            padding: "6px 14px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            gap: 5,
            overflowX: "auto",
            flexShrink: 0,
            scrollbarWidth: "none",
          }}
        >
          {semanas.map((s, i) => (
            <button
              key={i}
              onClick={() => setSemIdx(i)}
              style={{
                padding: "4px 10px",
                borderRadius: 20,
                border: "none",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 700,
                whiteSpace: "nowrap",
                background: semIdx === i ? "var(--gold)" : "var(--surface2)",
                color: semIdx === i ? "#000" : "var(--muted)",
              }}
            >
              Sem {s.numero}
            </button>
          ))}
        </div>
      )}

      {/* Turnos */}
      {vista === "planilla" && sem?.turnos?.length > 0 && (
        <div
          style={{
            padding: "6px 14px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            gap: 5,
            overflowX: "auto",
            flexShrink: 0,
            scrollbarWidth: "none",
          }}
        >
          {sem.turnos.map((t, i) => (
            <button
              key={i}
              onClick={() => setTurnoIdx(i)}
              style={{
                padding: "4px 10px",
                borderRadius: 20,
                border: "none",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 700,
                whiteSpace: "nowrap",
                background:
                  turnoIdx === i ? "rgba(100,180,255,.85)" : "var(--surface2)",
                color: turnoIdx === i ? "#000" : "var(--muted)",
              }}
            >
              T{t.numero || i + 1}
              {t.dia ? ` · ${t.dia}` : ""}
            </button>
          ))}
        </div>
      )}

      {/* Contenido scrolleable */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
        {vista === "planilla" && <VistaPlanilla />}

        {vista === "resumen" && (
          <div>
            <div
              style={{
                fontSize: 10,
                color: "var(--muted)",
                padding: "4px 0 8px",
                fontFamily: "monospace",
              }}
            >
              debug: hasDatos={String(_hasDatos)} mesoId=
              {_mesoRef?.id || "null"} sems={_mesoRef?.semanas?.length || 0}
            </div>
            {_hasDatos ? (
              <PanelTabBoundary tab="Resumen">
                <PageResumen
                  key={vistaKey.resumen}
                  meso={_mesoRef}
                  atleta={_atletaRef}
                  irm_arr={irm_arr}
                  irm_env={irm_env}
                  normativos={atletaNormativos}
                />
              </PanelTabBoundary>
            ) : (
              <div
                style={{
                  padding: 32,
                  textAlign: "center",
                  color: "var(--muted)",
                  fontSize: 13,
                }}
              >
                Sin datos — seleccioná un atleta con mesociclo
              </div>
            )}
          </div>
        )}

        {vista === "pdf" &&
          (_hasDatos ? (
            <PanelTabBoundary tab="PDF">
              <PagePDF
                key={vistaKey.pdf}
                meso={_mesoRef}
                atleta={_atletaRef}
                irm_arr={irm_arr}
                irm_env={irm_env}
                normativos={atletaNormativos}
              />
            </PanelTabBoundary>
          ) : (
            <div
              style={{
                padding: 32,
                textAlign: "center",
                color: "var(--muted)",
                fontSize: 13,
              }}
            >
              Sin datos — seleccioná un atleta con mesociclo
            </div>
          ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// AUTH — Login / Register screens
// ═══════════════════════════════════════════════════════════════

function LoginScreen({
  onAuth,
  recoveryMode: initialRecovery = false,
  initialMsg = "",
}) {
  const [mode, setMode] = useState(initialRecovery ? "recovery" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState("atleta");
  const [codigoCoach, setCodigoCoach] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(initialMsg);
  const [logs, setLogs] = useState([]);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState(0);

  const log = (txt, type = "info") => {
    const ts = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev.slice(-15), { ts, txt, type }]);
  };

  const normalizeEmail = (e) => e.trim().toLowerCase();

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Completá email y contraseña");
      return;
    }
    // Client-side rate limit
    const now = Date.now();
    if (lockoutUntil > now) {
      const secs = Math.ceil((lockoutUntil - now) / 1000);
      setError(`Demasiados intentos. Esperá ${secs}s.`);
      return;
    }
    setLoading(true);
    setError("");
    const { data, error } = await sb.auth.signInWithPassword({
      email: normalizeEmail(email),
      password,
    });
    setLoading(false);
    if (error) {
      const attempts = loginAttempts + 1;
      setLoginAttempts(attempts);
      if (attempts >= 5) {
        setLockoutUntil(Date.now() + 30000);
        setLoginAttempts(0);
        setError("Demasiados intentos fallidos. Esperá 30 segundos.");
      } else {
        setError(error.message);
      }
      return;
    }
    setLoginAttempts(0);
    onAuth(data.session);
  };

  const handleRegister = async () => {
    if (!email || !password) {
      setError("Completá email y contraseña");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setLoading(true);
    setError("");

    // Si es coach, verificar código de autorización
    if (rol === "coach") {
      if (!codigoCoach.trim()) {
        setLoading(false);
        setError(
          "Ingresá el código de autorización para registrarte como coach.",
        );
        return;
      }
      try {
        const { data: valid, error: rpcErr } = await sb.rpc(
          "verify_coach_code",
          { input_code: codigoCoach.trim() },
        );
        if (rpcErr || !valid) {
          setLoading(false);
          setError(
            "Código de autorización inválido. Contactá al administrador.",
          );
          return;
        }
      } catch {
        setLoading(false);
        setError("No se pudo verificar el código. Intentá más tarde.");
        return;
      }
    }

    const normalizedEmail = normalizeEmail(email);
    const registeredNombre = toTitleCase(
      nombre || normalizedEmail.split("@")[0],
    );
    const { data, error } = await sb.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: { nombre: registeredNombre, rol },
        emailRedirectTo: `${window.location.origin}/sistema`,
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      setMsg("");
      return;
    }
    // Notify admin of new registration (fire-and-forget)
    fetch("/api/notify-registration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: normalizedEmail,
        nombre: registeredNombre,
        tipo: rol,
      }),
    }).catch(() => {});
    setError("");
    setMsg(
      rol === "coach"
        ? "Revisá tu email para confirmar tu cuenta de coach."
        : "Revisá tu email para confirmar tu cuenta.",
    );
  };

  const handleForgot = async () => {
    if (!email) {
      setError("Ingresá tu email primero");
      return;
    }
    if (loading) return;
    setLoading(true);
    setError("");
    const { error } = await sb.auth.resetPasswordForEmail(
      normalizeEmail(email),
    );
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setMsg("Se envió un link para restablecer tu contraseña.");
  };

  const handleRecovery = async () => {
    if (!newPassword) {
      setError("Ingresá tu nueva contraseña");
      return;
    }
    if (newPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const r = await _fetchWithTimeout(`${SUPA_URL}/auth/v1/user`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPA_ANON,
          Authorization: `bearer ${getCurrentSession()?.access_token}`,
        },
        body: JSON.stringify({ password: newPassword }),
      });
      const { data, raw } = await _readResponseSafe(r);
      setLoading(false);
      if (!r.ok) {
        setError(
          _authErrorMessage(
            r.status,
            data,
            raw,
            "No se pudo cambiar la contraseña.",
          ),
        );
        return;
      }
      setMsg("Contraseña actualizada. Ya podés ingresar.");
      setMode("login");
      setNewPassword("");
    } catch {
      setLoading(false);
      setError("No se pudo conectar con Supabase.");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Logo */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: 32,
          }}
        >
          <LogoHorizontal height={100} />
          <div
            style={{
              fontFamily: "'Bebas Neue'",
              fontSize: 13,
              color: "var(--muted)",
              letterSpacing: ".15em",
              marginTop: 8,
            }}
          >
            SISTEMA DE GESTIÓN
          </div>
        </div>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: 28,
          }}
        >
          {/* Tabs login/register — hide in recovery mode */}
          {mode !== "recovery" && (
            <div
              style={{
                display: "flex",
                gap: 0,
                marginBottom: 24,
                background: "var(--surface2)",
                borderRadius: 10,
                padding: 4,
              }}
            >
              {[
                ["login", "Ingresar"],
                ["register", "Registrarse"],
              ].map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => {
                    setMode(v);
                    setError("");
                    setMsg("");
                    setPassword("");
                    setShowPassword(false);
                    setRol("atleta");
                    setCodigoCoach("");
                  }}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    border: "none",
                    cursor: "pointer",
                    borderRadius: 8,
                    fontFamily: "'DM Sans'",
                    fontSize: 13,
                    fontWeight: 700,
                    transition: "all .2s",
                    background: mode === v ? "var(--surface)" : "transparent",
                    color: mode === v ? "var(--text)" : "var(--muted)",
                    boxShadow: mode === v ? "0 1px 4px rgba(0,0,0,.3)" : "none",
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (mode === "recovery") handleRecovery();
              else if (mode === "login") handleLogin();
              else handleRegister();
            }}
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            {mode === "register" && (
              <>
                {/* Selector de rol */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Tipo de cuenta</label>
                  <div
                    style={{
                      display: "flex",
                      gap: 0,
                      background: "var(--surface2)",
                      borderRadius: 10,
                      padding: 4,
                    }}
                  >
                    {[
                      ["atleta", "Atleta"],
                      ["coach", "Coach"],
                    ].map(([v, l]) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => {
                          setRol(v);
                          setError("");
                        }}
                        style={{
                          flex: 1,
                          padding: "8px 0",
                          border: "none",
                          cursor: "pointer",
                          borderRadius: 8,
                          fontFamily: "'DM Sans'",
                          fontSize: 13,
                          fontWeight: 700,
                          transition: "all .2s",
                          background:
                            rol === v ? "var(--surface)" : "transparent",
                          color:
                            rol === v
                              ? v === "coach"
                                ? "var(--gold)"
                                : "var(--green)"
                              : "var(--muted)",
                          boxShadow:
                            rol === v ? "0 1px 4px rgba(0,0,0,.3)" : "none",
                        }}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--muted)",
                      marginTop: 4,
                    }}
                  >
                    {rol === "coach"
                      ? "Requiere código de autorización del administrador"
                      : "Cuenta gratuita para atletas"}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Nombre completo</label>
                  <input
                    name="field_91"
                    className="form-input"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Tu nombre"
                  />
                </div>

                {/* Código de autorización para coaches */}
                {rol === "coach" && (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Código de autorización</label>
                    <input
                      name="field_94"
                      className="form-input"
                      value={codigoCoach}
                      onChange={(e) => setCodigoCoach(e.target.value)}
                      placeholder="Ingresá el código proporcionado"
                      style={{
                        letterSpacing: ".15em",
                        textTransform: "uppercase",
                      }}
                    />
                  </div>
                )}
              </>
            )}

            {mode === "recovery" ? (
              <>
                <div
                  style={{
                    fontSize: 14,
                    color: "var(--text)",
                    textAlign: "center",
                    marginBottom: 4,
                  }}
                >
                  Ingresá tu nueva contraseña
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Nueva contraseña</label>
                  <div style={{ position: "relative" }}>
                    <input
                      name="field_95"
                      className="form-input"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      style={{ paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      style={{
                        position: "absolute",
                        right: 8,
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: "var(--muted)",
                        cursor: "pointer",
                        fontSize: 16,
                        padding: 4,
                        lineHeight: 1,
                      }}
                      tabIndex={-1}
                      aria-label={
                        showPassword
                          ? "Ocultar contraseña"
                          : "Mostrar contraseña"
                      }
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Email</label>
                  <input
                    name="field_92"
                    className="form-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@ejemplo.com"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Contraseña</label>
                  <div style={{ position: "relative" }}>
                    <input
                      name="field_93"
                      className="form-input"
                      type={showPassword ? "text" : "password"}
                      autoComplete={
                        mode === "register"
                          ? "new-password"
                          : "current-password"
                      }
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={
                        mode === "register"
                          ? "Mínimo 6 caracteres"
                          : "Tu contraseña"
                      }
                      style={{ paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      style={{
                        position: "absolute",
                        right: 8,
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: "var(--muted)",
                        cursor: "pointer",
                        fontSize: 16,
                        padding: 4,
                        lineHeight: 1,
                      }}
                      tabIndex={-1}
                      aria-label={
                        showPassword
                          ? "Ocultar contraseña"
                          : "Mostrar contraseña"
                      }
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {error && (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--red)",
                  background: "rgba(229,57,53,.1)",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid rgba(229,57,53,.3)",
                }}
              >
                {error}
              </div>
            )}
            {msg && (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--green)",
                  background: "rgba(71,232,160,.1)",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid rgba(71,232,160,.3)",
                }}
              >
                {msg}
              </div>
            )}

            <button
              className="btn btn-gold"
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                justifyContent: "center",
                padding: "12px 0",
                fontSize: 14,
                opacity: loading ? 0.5 : 1,
                pointerEvents: loading ? "none" : "auto",
              }}
            >
              {loading
                ? "Procesando…"
                : mode === "recovery"
                  ? "Guardar nueva contraseña"
                  : mode === "login"
                    ? "Ingresar"
                    : rol === "coach"
                      ? "Crear cuenta Coach"
                      : "Crear cuenta Atleta"}
            </button>

            {mode === "login" && (
              <button
                type="button"
                onClick={handleForgot}
                disabled={loading}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--muted)",
                  fontSize: 12,
                  cursor: loading ? "default" : "pointer",
                  textAlign: "center",
                  padding: "4px",
                  opacity: loading ? 0.5 : 1,
                }}
              >
                Olvidé mi contraseña
              </button>
            )}
          </form>
        </div>

        <div
          style={{
            textAlign: "center",
            marginTop: 16,
            fontSize: 11,
            color: "var(--muted)",
          }}
        >
          Sistema IronLifting © 2026 · v{APP_VERSION}
        </div>
      </div>
    </div>
  );
}

// ── Auth wrapper — carga Supabase JS y maneja sesión ────────────────────────

function CoachApp({ session, profile, onLogout }) {
  // ── Clear dynamic tabs on new browser session (prevents accumulation) ──
  // sessionStorage survives refreshes but is cleared when the browser closes,
  // so tabs only reset on a truly new session.
  if (
    typeof window !== "undefined" &&
    !sessionStorage.getItem("ironlifting_session")
  ) {
    sessionStorage.setItem("ironlifting_session", "1");
    localStorage.removeItem("liftplan_atletas_tabs");
    localStorage.removeItem("liftplan_plantillas_tabs");
  }

  // tab puede ser: "atletas" | "normativos" | "calculadora" | "atleta:ID"
  const [tab, setTab] = useState("atletas");
  const [refPanel, setRefPanel] = useState(false);
  const [refPanelWidth, setRefPanelWidth] = useState(420);
  const [liveMesoData, setLiveMesoData] = useState({});
  const onLiveMesoDataCb = useCallback(
    (d) => setLiveMesoData((prev) => ({ ...prev, [d.atletaId]: d })),
    [],
  );

  const [atletas, setAtletasRaw] = useState(() =>
    load("liftplan_atletas", [
      {
        id: "demo1",
        nombre: "Joana Palacios",
        email: "joana@halterofilia.com",
        telefono: "5493413666737",
        fecha_nacimiento: "1998-05-12",
        notas: "",
        tipo: "atleta",
      },
    ]),
  );
  const [mesociclos, setMesociclosRaw] = useState(() => {
    const raw = load("liftplan_mesociclos", []);
    // Strip any nulls left by old drag code
    return raw.map((m) =>
      m
        ? {
            ...m,
            semanas: (m.semanas || []).map((s) =>
              s
                ? {
                    ...s,
                    turnos: (s.turnos || []).map((t) =>
                      t
                        ? {
                            ...t,
                            ejercicios: (t.ejercicios || []).filter(Boolean),
                            // Migración: inicializar complementarios si no existen
                            complementarios_before:
                              t.complementarios_before || [],
                            complementarios_after:
                              t.complementarios_after || [],
                          }
                        : t,
                    ),
                  }
                : s,
            ),
          }
        : m,
    );
  });
  const [atletasTabs, setAtletasTabsRaw] = useState(() =>
    load("liftplan_atletas_tabs", []),
  );
  const [atletaOpenRequest, setAtletaOpenRequest] = useState({});
  const [plantillasTabs, setPlantillasTabsRaw] = useState(() =>
    load("liftplan_plantillas_tabs", []),
  );
  const authCoachId = session?.user?.id || null;
  const [coachId, setCoachId] = useState(null);
  useEffect(() => {
    let cancelled = false;
    if (!authCoachId) {
      setCoachId(null);
      return;
    }

    (async () => {
      const resolved = await resolveSharedCoachId(authCoachId);
      if (!cancelled) setCoachId(resolved || authCoachId);
    })();

    return () => {
      cancelled = true;
    };
  }, [authCoachId]);

  const {
    plantillas,
    add: addPlantillaRaw,
    update: updatePlantilla,
    remove: removePlantilla,
    flushSync: flushPlantillaSync,
  } = usePlantillas(coachId);
  const mesoOverrideSyncTimersRef = useRef(new Map());
  const atletaOverrideSyncTimersRef = useRef(new Map());
  const atletaSyncTimerRef = useRef(null);
  const mesoSyncTimerRef = useRef(null);

  // ── Refs para sincronización con DB ────────────────────────────────────────
  const prevAtletasRef = useRef(null); // null = DB aún no inicializada
  const prevMesociclosRef = useRef(null);
  const atletasRef = useRef(atletas);
  const mesociclosRef = useRef(mesociclos);
  // IDs pendientes de borrado en DB (evita que pull restaure items eliminados)
  const pendingDeleteAtletaIdsRef = useRef(new Set());
  const pendingDeleteMesoIdsRef = useRef(new Set());
  useEffect(() => {
    atletasRef.current = atletas;
  }, [atletas]);
  useEffect(() => {
    mesociclosRef.current = mesociclos;
  }, [mesociclos]);

  const queueMesoOverrideSync = useCallback(
    (liveData) => {
      if (!coachId || !liveData?.meso?.id) return;
      const mesoId = liveData.meso.id;
      const pending = mesoOverrideSyncTimersRef.current.get(mesoId);
      if (pending) clearTimeout(pending);

      const timer = setTimeout(async () => {
        mesoOverrideSyncTimersRef.current.delete(mesoId);
        const currentMeso =
          mesociclosRef.current.find((item) => item.id === mesoId) ||
          liveData.meso;
        if (!currentMeso) return;

        const payload = mesoToDb(currentMeso, coachId, {
          overrides: buildMesoOverridesPayload(currentMeso, liveData),
        });
        const { error } = await sb.from("mesociclos").upsert([payload], {
          onConflict: "app_id",
        });
        if (error) console.warn("DB sync mesociclo overrides failed:", error);
      }, 800);

      mesoOverrideSyncTimersRef.current.set(mesoId, timer);
    },
    [coachId],
  );

  const queueAtletaOverrideSync = useCallback(
    (atletaId, overrides) => {
      if (!coachId || !atletaId) return;
      const pending = atletaOverrideSyncTimersRef.current.get(atletaId);
      if (pending) clearTimeout(pending);

      const timer = setTimeout(async () => {
        atletaOverrideSyncTimersRef.current.delete(atletaId);
        const currentAtleta = atletasRef.current.find(
          (item) => item.id === atletaId,
        );
        if (!currentAtleta) return;

        const payload = atletaToDb(currentAtleta, coachId, {
          normativosOverrides: asPlainObject(overrides),
        });
        const { error } = await sb.from("atletas").upsert([payload], {
          onConflict: "app_id",
        });
        if (error) console.warn("DB sync atleta overrides failed:", error);
      }, 800);

      atletaOverrideSyncTimersRef.current.set(atletaId, timer);
    },
    [coachId],
  );

  const prevLiveMesoDataRef = useRef({});
  useEffect(() => {
    // Solo sincronizar mesos que realmente cambiaron, no todos
    const prev = prevLiveMesoDataRef.current;
    Object.entries(liveMesoData).forEach(([key, val]) => {
      if (prev[key] !== val) {
        queueMesoOverrideSync(val);
      }
    });
    prevLiveMesoDataRef.current = liveMesoData;
  }, [liveMesoData, queueMesoOverrideSync]);

  useEffect(() => {
    return () => {
      mesoOverrideSyncTimersRef.current.forEach((timer) => clearTimeout(timer));
      atletaOverrideSyncTimersRef.current.forEach((timer) =>
        clearTimeout(timer),
      );
      mesoOverrideSyncTimersRef.current.clear();
      atletaOverrideSyncTimersRef.current.clear();
    };
  }, []);

  // ── Backspace siempre borra el último dígito en inputs numéricos ───────────
  useEffect(() => {
    function handleNumericBackspace(e) {
      if (e.key !== "Backspace") return;
      const el = e.target;
      if (el.tagName !== "INPUT" || el.type !== "number") return;
      e.preventDefault();
      const cur = el.value;
      if (cur.length === 0) return;
      const next = cur.slice(0, -1);
      // Disparar evento nativo para que React detecte el cambio
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      ).set;
      nativeInputValueSetter.call(el, next);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
    document.addEventListener("keydown", handleNumericBackspace);
    return () =>
      document.removeEventListener("keydown", handleNumericBackspace);
  }, []);

  // ── Carga inicial desde Supabase ───────────────────────────────────────────
  useEffect(() => {
    if (!coachId) return;
    (async () => {
      try {
        // Atletas — filtra solo los que tienen app_id (creados por esta app)
        const { data: dbAtletas, error: e1 } = await sb
          .from("atletas")
          .select("*")
          .eq("coach_id", coachId)
          .exec();
        if (!e1 && dbAtletas) {
          const appAtletas = dbAtletas.filter((r) => r.app_id);
          if (appAtletas.length > 0) {
            appAtletas.forEach((r) => {
              restoreAtletaPctOverrides(r.app_id, r.pct_overrides);
              restoreAtletaNormOverrides(r.app_id, r.normativos_overrides);
            });
            const loaded = appAtletas.map(atletaFromDb);
            setAtletasRaw(loaded);
            save("liftplan_atletas", loaded);
            prevAtletasRef.current = loaded;
          } else {
            // DB vacía — migrar localStorage → DB
            const local = load("liftplan_atletas", []);
            if (local.length > 0) {
              await sb.from("atletas").upsert(
                local.map((a) => atletaToDb(a, coachId)),
                { onConflict: "app_id" },
              );
            }
            prevAtletasRef.current = atletasRef.current;
          }
        }

        // Mesociclos — filtra solo los que tienen app_id
        const { data: dbMesos, error: e2 } = await sb
          .from("mesociclos")
          .select("*")
          .eq("coach_id", coachId)
          .exec();
        if (!e2 && dbMesos) {
          const appMesos = dbMesos.filter((r) => r.app_id);
          if (appMesos.length > 0) {
            appMesos.forEach((r) =>
              restoreMesoOverrides(r.app_id, r.overrides),
            );
            const loaded = appMesos.map(mesoFromDb);
            const cleaned = loaded.map((m) =>
              m
                ? {
                    ...m,
                    semanas: (m.semanas || []).map((s) =>
                      s
                        ? {
                            ...s,
                            turnos: (s.turnos || []).map((t) =>
                              t
                                ? {
                                    ...t,
                                    ejercicios: (t.ejercicios || []).filter(
                                      Boolean,
                                    ),
                                  }
                                : t,
                            ),
                          }
                        : s,
                    ),
                  }
                : m,
            );
            setMesociclosRaw(cleaned);
            save("liftplan_mesociclos", cleaned);
            prevMesociclosRef.current = cleaned;
          } else {
            const local = load("liftplan_mesociclos", []);
            if (local.length > 0) {
              const { error: emig } = await sb.from("mesociclos").upsert(
                local.map((m) => mesoToDb(m, coachId)),
                { onConflict: "app_id" },
              );
              if (emig) console.warn("DB migrate mesociclos failed:", emig);
            }
            prevMesociclosRef.current = mesociclosRef.current;
          }
        }
      } catch (e) {
        console.warn("DB load failed, usando localStorage:", e);
      } finally {
        if (prevAtletasRef.current === null)
          prevAtletasRef.current = atletasRef.current;
        if (prevMesociclosRef.current === null)
          prevMesociclosRef.current = mesociclosRef.current;
        // Registrar sync exitoso con DB
        markDbSync();
      }
    })();
  }, [coachId]);

  // ── Pull remoto de atletas (incluye overrides normativos) ─────────────────
  const lastPullAtletasRef = useRef(0);
  const lastPullMesosRef = useRef(0);
  const lastSyncTsAtletasRef = useRef(null); // ISO timestamp for delta sync
  const lastSyncTsMesosRef = useRef(null);
  const PULL_THROTTLE_MS = 5000; // mínimo 5s entre pulls
  useEffect(() => {
    if (!coachId) return;
    let cancelled = false;

    const pullAtletas = async () => {
      const now = Date.now();
      if (now - lastPullAtletasRef.current < PULL_THROTTLE_MS) return;
      lastPullAtletasRef.current = now;
      const q = sb.from("atletas").select("*").eq("coach_id", coachId);
      // Delta sync: solo traer filas modificadas desde último pull exitoso
      if (lastSyncTsAtletasRef.current) {
        q.gt("updated_at", lastSyncTsAtletasRef.current);
      }
      const { data, error } = await q.exec();
      if (cancelled || error || !data) return;

      const appAtletas = data.filter((r) => r.app_id);
      // Registrar timestamp ANTES de mergear (usar max updated_at de esta respuesta)
      if (data.length > 0) {
        const maxTs = data.reduce((max, r) => {
          return r.updated_at && r.updated_at > max ? r.updated_at : max;
        }, lastSyncTsAtletasRef.current || "");
        if (maxTs) lastSyncTsAtletasRef.current = maxTs;
      } else if (!lastSyncTsAtletasRef.current) {
        // Primer pull vacío — marcar como synced
        lastSyncTsAtletasRef.current = new Date().toISOString();
      }
      if (appAtletas.length === 0) return;

      markDbSync();

      const loaded = appAtletas.map(atletaFromDb);
      setAtletasRaw((prev) => {
        const pendingDel = pendingDeleteAtletaIdsRef.current;
        // LWW: solo actualizar items donde DB es más reciente que local
        const merged = loaded
          .filter((dbItem) => !pendingDel.has(dbItem.id)) // skip pending deletes
          .map((dbItem) => {
            const local = prev.find((p) => p.id === dbItem.id);
            if (!local) {
              // Nuevo en DB — restaurar overrides
              const raw = appAtletas.find((r) => r.app_id === dbItem.id);
              if (raw) {
                restoreAtletaPctOverrides(raw.app_id, raw.pct_overrides);
                restoreAtletaNormOverrides(
                  raw.app_id,
                  raw.normativos_overrides,
                );
              }
              return dbItem;
            }
            const dbTs = dbItem._updated_at
              ? new Date(dbItem._updated_at).getTime()
              : 0;
            const localTs = local._updated_at
              ? new Date(local._updated_at).getTime()
              : 0;
            // LWW: empate (dbTs === localTs) gana local — evita que un pull
            // que trae nuestra propia escritura pise overrides editados después
            // del push sin haber bumpeado _updated_at del meso.
            if (dbTs > localTs) {
              // DB gana — restaurar overrides de DB
              const raw = appAtletas.find((r) => r.app_id === dbItem.id);
              if (raw) {
                restoreAtletaPctOverrides(raw.app_id, raw.pct_overrides);
                restoreAtletaNormOverrides(
                  raw.app_id,
                  raw.normativos_overrides,
                );
              }
              return dbItem;
            }
            // Local gana — mantener overrides locales
            return local;
          });
        // agregar items locales que aún no están en DB
        prev.forEach((localItem) => {
          if (
            !pendingDel.has(localItem.id) &&
            !merged.find((m) => m.id === localItem.id)
          )
            merged.push(localItem);
        });
        if (JSON.stringify(prev) === JSON.stringify(merged)) return prev;
        save("liftplan_atletas", merged);
        prevAtletasRef.current = merged;
        return merged;
      });
    };

    pullAtletas();
    const unsub = _visResume.sub(() => pullAtletas());
    const onBc = (e) => {
      if (e.data?.type === "atletas" || e.data?.type === "all") pullAtletas();
    };

    _bc?.addEventListener("message", onBc);
    return () => {
      cancelled = true;
      unsub();
      _bc?.removeEventListener("message", onBc);
    };
  }, [coachId]);

  // ── Pull remoto de mesociclos (LWW) ───────────────────────────────────────
  useEffect(() => {
    if (!coachId) return;
    let cancelled = false;

    const pullMesociclos = async () => {
      const now = Date.now();
      if (now - lastPullMesosRef.current < PULL_THROTTLE_MS) return;
      lastPullMesosRef.current = now;
      const q = sb.from("mesociclos").select("*").eq("coach_id", coachId);
      // Delta sync: solo traer filas modificadas desde último pull exitoso
      if (lastSyncTsMesosRef.current) {
        q.gt("updated_at", lastSyncTsMesosRef.current);
      }
      const { data, error } = await q.exec();
      if (cancelled || error || !data) return;

      const appMesos = data.filter((r) => r.app_id);
      // Registrar timestamp
      if (data.length > 0) {
        const maxTs = data.reduce((max, r) => {
          return r.updated_at && r.updated_at > max ? r.updated_at : max;
        }, lastSyncTsMesosRef.current || "");
        if (maxTs) lastSyncTsMesosRef.current = maxTs;
      } else if (!lastSyncTsMesosRef.current) {
        lastSyncTsMesosRef.current = new Date().toISOString();
      }
      if (appMesos.length === 0) return;

      markDbSync();

      const loaded = appMesos.map(mesoFromDb);
      setMesociclosRaw((prev) => {
        const pendingDel = pendingDeleteMesoIdsRef.current;
        // LWW: solo actualizar items donde DB es más reciente que local
        const merged = loaded
          .filter((dbItem) => !pendingDel.has(dbItem.id)) // skip pending deletes
          .map((dbItem) => {
            const local = prev.find((p) => p.id === dbItem.id);
            if (!local) {
              // Nuevo en DB — restaurar overrides
              const raw = appMesos.find((r) => r.app_id === dbItem.id);
              if (raw) restoreMesoOverrides(raw.app_id, raw.overrides);
              return dbItem;
            }
            const dbTs = dbItem._updated_at
              ? new Date(dbItem._updated_at).getTime()
              : 0;
            const localTs = local._updated_at
              ? new Date(local._updated_at).getTime()
              : 0;
            // LWW: empate gana local — ver nota en pullAtletas.
            if (dbTs > localTs) {
              // DB gana — restaurar overrides de DB
              const raw = appMesos.find((r) => r.app_id === dbItem.id);
              if (raw) restoreMesoOverrides(raw.app_id, raw.overrides);
              return dbItem;
            }
            // Local gana — mantener overrides locales
            return local;
          });
        prev.forEach((localItem) => {
          if (
            !pendingDel.has(localItem.id) &&
            !merged.find((m) => m.id === localItem.id)
          )
            merged.push(localItem);
        });
        if (JSON.stringify(prev) === JSON.stringify(merged)) return prev;
        save("liftplan_mesociclos", merged);
        prevMesociclosRef.current = merged;
        return merged;
      });
    };

    pullMesociclos();
    const unsub = _visResume.sub(() => pullMesociclos());
    const onBc = (e) => {
      if (e.data?.type === "mesociclos" || e.data?.type === "all")
        pullMesociclos();
    };

    _bc?.addEventListener("message", onBc);
    return () => {
      cancelled = true;
      unsub();
      _bc?.removeEventListener("message", onBc);
    };
  }, [coachId]);

  // ── Sincronizar atletas con DB cuando cambian (debounce 2s) ───────────
  useEffect(() => {
    if (!coachId || prevAtletasRef.current === null) return;
    const curr = atletas;
    const prev = prevAtletasRef.current;

    // Detectar borrados INMEDIATAMENTE (sin debounce) y ejecutar ya
    const deletedIds = prev
      .filter((p) => !curr.find((a) => a.id === p.id))
      .map((p) => p.id);
    if (deletedIds.length > 0) {
      deletedIds.forEach((id) => pendingDeleteAtletaIdsRef.current.add(id));
      // Borrar de DB inmediatamente (sin esperar debounce)
      for (const id of deletedIds) {
        sb.from("atletas")
          .eq("app_id", id)
          .delete()
          .then((res) => {
            if (res?.error) {
              console.warn(
                "DELETE atleta failed, keeping pending:",
                id,
                res.error,
              );
            } else {
              pendingDeleteAtletaIdsRef.current.delete(id);
            }
          })
          .catch((e) => console.warn("DELETE atleta exception:", id, e));
      }
      prevAtletasRef.current = curr;
    }

    if (atletaSyncTimerRef.current) clearTimeout(atletaSyncTimerRef.current);
    atletaSyncTimerRef.current = setTimeout(async () => {
      atletaSyncTimerRef.current = null;
      const prev2 = prevAtletasRef.current;
      prevAtletasRef.current = curr;

      const toUpsert = curr.filter((a) => {
        const old = prev2.find((p) => p.id === a.id);
        return !old || JSON.stringify(old) !== JSON.stringify(a);
      });
      if (toUpsert.length === 0) return;

      // _updated_at ya fue estampado por setAtletas() wrapper — no re-estampar
      // para evitar loop infinito (re-stamp → state change → re-trigger)

      await sb
        .from("atletas")
        .upsert(
          toUpsert.map((a) => atletaToDb(a, coachId)),
          { onConflict: "app_id" },
        )
        .catch((e) => console.warn("DB sync atletas failed:", e));
      broadcastDbWrite("atletas");
    }, 2000);
  }, [atletas]);

  // ── Sincronizar mesociclos con DB cuando cambian (debounce 2s) ──────────
  useEffect(() => {
    if (!coachId || prevMesociclosRef.current === null) return;
    const curr = mesociclos;
    const prev = prevMesociclosRef.current;

    // Detectar borrados INMEDIATAMENTE (sin debounce) y ejecutar ya
    const deletedIds = prev
      .filter((p) => !curr.find((m) => m.id === p.id))
      .map((p) => p.id);
    if (deletedIds.length > 0) {
      deletedIds.forEach((id) => pendingDeleteMesoIdsRef.current.add(id));
      for (const id of deletedIds) {
        sb.from("mesociclos")
          .eq("app_id", id)
          .delete()
          .then((res) => {
            if (res?.error) {
              console.warn(
                "DELETE mesociclo failed, keeping pending:",
                id,
                res.error,
              );
            } else {
              pendingDeleteMesoIdsRef.current.delete(id);
            }
          })
          .catch((e) => console.warn("DELETE mesociclo exception:", id, e));
      }
      prevMesociclosRef.current = curr;
    }

    if (mesoSyncTimerRef.current) clearTimeout(mesoSyncTimerRef.current);
    mesoSyncTimerRef.current = setTimeout(async () => {
      mesoSyncTimerRef.current = null;
      const prev2 = prevMesociclosRef.current;
      prevMesociclosRef.current = curr;

      const toUpsert = curr.filter((m) => {
        const old = prev2.find((p) => p.id === m.id);
        return !old || JSON.stringify(old) !== JSON.stringify(m);
      });
      if (toUpsert.length === 0) return;

      await sb
        .from("mesociclos")
        .upsert(
          toUpsert.map((m) => mesoToDb(m, coachId)),
          { onConflict: "app_id" },
        )
        .catch((e) => console.warn("DB sync mesociclos failed:", e));
      broadcastDbWrite("mesociclos");
    }, 2000);
  }, [mesociclos, coachId]);

  // ── Sincronizar overrides al ocultar/cerrar (sin polling periódico) ───────
  useEffect(() => {
    if (!coachId) return;
    const flushPendingDeletes = () => {
      // Ejecutar borrados pendientes que no se enviaron aún a DB
      const prevAtletas = prevAtletasRef.current || [];
      const currAtletas = atletasRef.current;
      const deletedAtletaIds = prevAtletas
        .filter((p) => !currAtletas.find((a) => a.id === p.id))
        .map((p) => p.id);
      for (const id of deletedAtletaIds) {
        pendingDeleteAtletaIdsRef.current.add(id);
        sb.from("atletas")
          .eq("app_id", id)
          .delete()
          .then((res) => {
            if (res?.error)
              console.warn("flush DELETE atleta failed:", id, res.error);
          })
          .catch((e) => console.warn("flush DELETE atleta exception:", id, e));
      }
      prevAtletasRef.current = currAtletas;

      const prevMesos = prevMesociclosRef.current || [];
      const currMesos = mesociclosRef.current;
      const deletedMesoIds = prevMesos
        .filter((p) => !currMesos.find((m) => m.id === p.id))
        .map((p) => p.id);
      for (const id of deletedMesoIds) {
        pendingDeleteMesoIdsRef.current.add(id);
        sb.from("mesociclos")
          .eq("app_id", id)
          .delete()
          .then((res) => {
            if (res?.error)
              console.warn("flush DELETE meso failed:", id, res.error);
          })
          .catch((e) => console.warn("flush DELETE meso exception:", id, e));
      }
      prevMesociclosRef.current = currMesos;
    };

    const syncOverrides = (useKeepalive = false) => {
      if (prevMesociclosRef.current === null) return;
      flushPendingDeletes();
      // Solo sincronizar si hay timers pendientes (cambios no guardados)
      const hadPendingMesos = mesoSyncTimerRef.current !== null;
      const hadPendingAtletas = atletaSyncTimerRef.current !== null;
      if (hadPendingMesos) {
        const curr = mesociclosRef.current;
        if (curr.length > 0) {
          sb.from("mesociclos")
            .upsert(
              curr.map((m) => mesoToDb(m, coachId)),
              { onConflict: "app_id" },
            )
            .catch(() => {});
        }
      }
      if (hadPendingAtletas) {
        const currAtletas = atletasRef.current;
        if (currAtletas.length > 0) {
          sb.from("atletas")
            .upsert(
              currAtletas.map((a) => atletaToDb(a, coachId)),
              { onConflict: "app_id" },
            )
            .catch(() => {});
        }
      }
      // Flush de timers de OVERRIDES (800ms) — los de celdas/sembrado, que
      // son los que más frecuentemente se pierden al ocultar/cerrar pestaña.
      const pendingMesoOvrIds = Array.from(
        mesoOverrideSyncTimersRef.current.keys(),
      );
      if (pendingMesoOvrIds.length > 0) {
        mesoOverrideSyncTimersRef.current.forEach((t) => clearTimeout(t));
        mesoOverrideSyncTimersRef.current.clear();
        const mesosToFlush = mesociclosRef.current.filter((m) =>
          pendingMesoOvrIds.includes(m.id),
        );
        if (mesosToFlush.length > 0) {
          sb.from("mesociclos")
            .upsert(
              mesosToFlush.map((m) => mesoToDb(m, coachId)),
              { onConflict: "app_id" },
            )
            .catch(() => {});
        }
      }
      const pendingAtletaOvrIds = Array.from(
        atletaOverrideSyncTimersRef.current.keys(),
      );
      if (pendingAtletaOvrIds.length > 0) {
        atletaOverrideSyncTimersRef.current.forEach((t) => clearTimeout(t));
        atletaOverrideSyncTimersRef.current.clear();
        const atletasToFlush = atletasRef.current.filter((a) =>
          pendingAtletaOvrIds.includes(a.id),
        );
        if (atletasToFlush.length > 0) {
          sb.from("atletas")
            .upsert(
              atletasToFlush.map((a) => atletaToDb(a, coachId)),
              { onConflict: "app_id" },
            )
            .catch(() => {});
        }
      }
      // Flush pending plantilla timers
      flushPlantillaSync();
    };

    const onHide = () => {
      if (document.visibilityState === "hidden") {
        // Cancel debounce timers but keep refs non-null so syncOverrides
        // knows there were pending changes and flushes them to DB.
        if (atletaSyncTimerRef.current)
          clearTimeout(atletaSyncTimerRef.current);
        if (mesoSyncTimerRef.current) clearTimeout(mesoSyncTimerRef.current);
        syncOverrides();
        // Safe to clear refs AFTER syncOverrides has checked them
        atletaSyncTimerRef.current = null;
        mesoSyncTimerRef.current = null;
      }
    };

    const onBeforeUnload = () => {
      if (atletaSyncTimerRef.current) clearTimeout(atletaSyncTimerRef.current);
      if (mesoSyncTimerRef.current) clearTimeout(mesoSyncTimerRef.current);
      syncOverrides(true);
    };

    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [coachId, flushPlantillaSync]);

  // Wrappers que persisten automáticamente
  const setAtletas = (val) => {
    setAtletasRaw((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      // Stamp _updated_at on changed items so LWW keeps local edits
      const now = new Date().toISOString();
      const stamped = next.map((a) => {
        const old = prev.find((p) => p.id === a.id);
        if (!old || JSON.stringify(old) !== JSON.stringify(a)) {
          return { ...a, _updated_at: now };
        }
        return a;
      });
      save("liftplan_atletas", stamped);
      return stamped;
    });
  };
  const setMesociclos = (val) => {
    setMesociclosRaw((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      // Stamp _updated_at on changed items so LWW keeps local edits
      // until the debounce sync pushes to DB
      const now = new Date().toISOString();
      const stamped = next.map((m) => {
        const old = prev.find((p) => p.id === m.id);
        if (!old || JSON.stringify(old) !== JSON.stringify(m)) {
          return { ...m, _updated_at: now };
        }
        return m;
      });
      save("liftplan_mesociclos", stamped);
      return stamped;
    });
  };
  const setAtletasTabs = (val) => {
    setAtletasTabsRaw((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      save("liftplan_atletas_tabs", next);
      return next;
    });
  };
  const setPlantillasTabs = (val) => {
    setPlantillasTabsRaw((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      save("liftplan_plantillas_tabs", next);
      return next;
    });
  };
  // addPlantilla: saves + opens tab
  const addPlantilla = (p) => {
    const saved = addPlantillaRaw(p);
    abrirPlantilla(saved || p);
  };

  // setAtletas con soporte de función (para los casos que usan prev =>)
  const setAtletasFn = (val) => {
    setAtletasRaw((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      const now = new Date().toISOString();
      const stamped = next.map((a) => {
        const old = prev.find((p) => p.id === a.id);
        if (!old || JSON.stringify(old) !== JSON.stringify(a)) {
          return { ...a, _updated_at: now };
        }
        return a;
      });
      save("liftplan_atletas", stamped);
      return stamped;
    });
  };

  const abrirAtleta = (a, opts = {}) => {
    const view = opts.view || "meso";
    setAtletaOpenRequest((prev) => ({
      ...prev,
      [a.id]: {
        view,
        mesoId: opts.mesoId || null,
        openNewMeso: !!opts.openNewMeso,
        tick: (prev[a.id]?.tick || 0) + 1,
      },
    }));
    if (!atletasTabs.includes(a.id)) {
      setAtletasTabs((prev) => [...prev, a.id]);
    }
    setTab(`atleta:${a.id}`);
  };

  const cerrarAtleta = (id, e) => {
    e.stopPropagation();
    setAtletasTabs((prev) => prev.filter((x) => x !== id));
    if (tab === `atleta:${id}`) setTab("atletas");
  };

  const abrirPlantilla = (p) => {
    if (!plantillasTabs.includes(p.id)) {
      setPlantillasTabs((prev) => [...prev, p.id]);
    }
    setTab(`plantilla:${p.id}`);
  };
  const cerrarPlantilla = (id, e) => {
    e && e.stopPropagation && e.stopPropagation();
    setPlantillasTabs((prev) => prev.filter((x) => x !== id));
    if (tab === `plantilla:${id}`) setTab("plantillas");
  };

  const fixedTabs = [
    { id: "atletas", label: "Atletas" },
    { id: "plantillas", label: "Plantillas" },
    { id: "normativos", label: "Normativos G" },
    { id: "calculadora", label: "Tablas" },
  ];

  const [isManualSaving, setIsManualSaving] = useState(false);
  const [showBackupBanner, setShowBackupBanner] = useState(false);

  // ── Auto-backup: si pasan 5h sin sync a DB, mostrar aviso ─────────────────
  useEffect(() => {
    const check = () => {
      const lastSync = getLastDbSync();
      const lastPrompted = Number(
        localStorage.getItem(BACKUP_PROMPTED_KEY) || "0",
      );
      const now = Date.now();
      // Mostrar si: pasaron 5h desde último sync Y no se descargó backup recientemente
      if (
        lastSync > 0 &&
        now - lastSync > BACKUP_INTERVAL_MS &&
        now - lastPrompted > BACKUP_INTERVAL_MS
      ) {
        setShowBackupBanner(true);
      }
    };
    check();
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const forceSaveAllToDb = useCallback(async () => {
    if (!coachId || isManualSaving) return;

    // Cancelar debounce pendientes para evitar doble write
    if (atletaSyncTimerRef.current) {
      clearTimeout(atletaSyncTimerRef.current);
      atletaSyncTimerRef.current = null;
    }
    if (mesoSyncTimerRef.current) {
      clearTimeout(mesoSyncTimerRef.current);
      mesoSyncTimerRef.current = null;
    }

    setIsManualSaving(true);
    try {
      const atletasPayload = atletasRef.current.map((a) =>
        atletaToDb(a, coachId),
      );
      const mesociclosPayload = mesociclosRef.current.map((m) =>
        mesoToDb(m, coachId),
      );
      const plantillasPayload = (plantillas || []).map((p) =>
        plantillaToDb(p, coachId),
      );

      const writes = [];

      if (atletasPayload.length > 0) {
        writes.push(
          sb.from("atletas").upsert(atletasPayload, { onConflict: "app_id" }),
        );
      }
      if (mesociclosPayload.length > 0) {
        writes.push(
          sb
            .from("mesociclos")
            .upsert(mesociclosPayload, { onConflict: "app_id" }),
        );
      }
      if (plantillasPayload.length > 0) {
        writes.push(
          sb
            .from("plantillas")
            .upsert(plantillasPayload, { onConflict: "app_id" }),
        );
      }

      const normativosLocal = readLocalJson("liftplan_normativos", null);
      const tablasLocal = readLocalJson("liftplan_tablas", null);

      if (normativosLocal) {
        writes.push(
          saveCoachSetting(
            coachId,
            COACH_SETTING_KEYS.normativos,
            normativosLocal,
          ),
        );
      }
      if (tablasLocal) {
        writes.push(
          saveCoachSetting(coachId, COACH_SETTING_KEYS.tablas, tablasLocal),
        );
      }

      await Promise.all(writes);
      broadcastDbWrite("all");
    } catch (e) {
      console.warn("Manual save all failed:", e);
    } finally {
      setIsManualSaving(false);
    }
  }, [coachId, isManualSaving, plantillas]);

  return (
    <>
      <div className="app">
        <nav className="nav">
          <div className="nav-logo">
            <LogoHorizontal height={44} />
          </div>
          <div className="nav-tabs">
            {/* Pestañas fijas */}
            {fixedTabs.map((t) => (
              <button
                key={t.id}
                className={`nav-tab${tab === t.id ? " active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}

            {/* Separador si hay atletas abiertos */}
            {atletasTabs.length > 0 && (
              <div
                style={{
                  width: 1,
                  background: "var(--border)",
                  margin: "12px 6px",
                  flexShrink: 0,
                }}
              />
            )}

            {/* Una pestaña por cada atleta abierto */}
            {atletasTabs.map((aid) => {
              const a = atletas.find((x) => x.id === aid);
              if (!a) return null;
              const isActive = tab === `atleta:${aid}`;
              return (
                <div
                  key={aid}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    height: "100%",
                  }}
                >
                  <button
                    className={`nav-tab${isActive ? " active" : ""}`}
                    style={{
                      paddingRight: 6,
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                    onClick={() => setTab(`atleta:${aid}`)}
                  >
                    {a.tipo === "asesoria" ? (
                      <Briefcase
                        size={13}
                        style={{ flexShrink: 0, opacity: 0.8 }}
                      />
                    ) : (
                      <User size={13} style={{ flexShrink: 0, opacity: 0.8 }} />
                    )}
                    {a.nombre.split(" ")[0]}
                  </button>
                  <button
                    onClick={(e) => cerrarAtleta(aid, e)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--muted)",
                      lineHeight: 1,
                      padding: "0 6px 0 0",
                      marginLeft: -4,
                      display: "flex",
                      alignItems: "center",
                    }}
                    title="Cerrar pestaña"
                  >
                    <X size={11} />
                  </button>
                </div>
              );
            })}

            {/* Separador plantillas */}
            {plantillasTabs.length > 0 && (
              <div
                style={{
                  width: 1,
                  background: "var(--border)",
                  margin: "12px 6px",
                  flexShrink: 0,
                }}
              />
            )}

            {/* Una pestaña por cada plantilla abierta */}
            {plantillasTabs.map((pid) => {
              const p = plantillas.find((x) => x.id === pid);
              if (!p) return null;
              const isActive = tab === `plantilla:${pid}`;
              return (
                <div
                  key={pid}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    height: "100%",
                  }}
                >
                  <button
                    className={`nav-tab${isActive ? " active" : ""}`}
                    style={{
                      paddingRight: 6,
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                    onClick={() => setTab(`plantilla:${pid}`)}
                  >
                    <Library
                      size={13}
                      style={{ flexShrink: 0, opacity: 0.8 }}
                    />
                    {p.nombre.split(" ")[0]}
                  </button>
                  <button
                    onClick={(e) => cerrarPlantilla(pid, e)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--muted)",
                      lineHeight: 1,
                      padding: "0 6px 0 0",
                      marginLeft: -4,
                      display: "flex",
                      alignItems: "center",
                    }}
                    title="Cerrar pestaña"
                  >
                    <X size={11} />
                  </button>
                </div>
              );
            })}
          </div>
          {/* Botón panel referencia */}
          <button
            onClick={() => setRefPanel((v) => !v)}
            title="Panel de referencia"
            style={{
              flexShrink: 0,
              marginLeft: 8,
              padding: "0 12px",
              height: 36,
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: refPanel ? "rgba(232,197,71,.15)" : "var(--surface2)",
              color: refPanel ? "var(--gold)" : "var(--muted)",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all .2s",
              whiteSpace: "nowrap",
            }}
          >
            <Copy size={13} /> Ref
          </button>

          <button
            onClick={forceSaveAllToDb}
            title="Guardar todo en la base"
            disabled={!coachId || isManualSaving}
            style={{
              flexShrink: 0,
              marginLeft: 6,
              padding: "0 12px",
              height: 36,
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--surface2)",
              color: isManualSaving ? "var(--gold)" : "var(--muted)",
              cursor: !coachId || isManualSaving ? "not-allowed" : "pointer",
              opacity: !coachId ? 0.6 : 1,
              fontSize: 12,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all .2s",
              whiteSpace: "nowrap",
            }}
          >
            <Send size={13} /> {isManualSaving ? "Guardando..." : "Guardar"}
          </button>

          <button
            onClick={() => {
              downloadBackup();
              setShowBackupBanner(false);
            }}
            title="Descargar respaldo completo (localStorage + Supabase)"
            style={{
              flexShrink: 0,
              marginLeft: 6,
              padding: "0 10px",
              height: 36,
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--surface2)",
              color: "var(--muted)",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 5,
              transition: "all .2s",
            }}
          >
            <Download size={13} />
          </button>

          {/* Usuario logueado */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexShrink: 0,
              marginLeft: 8,
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "var(--muted)",
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "0 8px",
                display: "none",
              }}
              className="nav-user-info"
            >
              {profile?.rol === "superadmin" && (
                <Shield size={11} style={{ color: "var(--gold)" }} />
              )}
              <span
                style={{
                  maxWidth: 100,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {profile?.nombre || session?.user?.email?.split("@")[0]}
              </span>
            </div>
            <button
              onClick={onLogout}
              title="Cerrar sesión"
              style={{
                flexShrink: 0,
                padding: "0 10px",
                height: 36,
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--surface2)",
                color: "var(--muted)",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 5,
                transition: "all .2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--red)";
                e.currentTarget.style.borderColor = "var(--red)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--muted)";
                e.currentTarget.style.borderColor = "var(--border)";
              }}
            >
              <LogOut size={13} />
            </button>
          </div>
        </nav>

        {/* Banner de respaldo automático */}
        {showBackupBanner && (
          <div
            style={{
              background: "rgba(232,80,71,.12)",
              borderBottom: "1px solid var(--red)",
              padding: "8px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              fontSize: 13,
              color: "var(--text)",
            }}
          >
            <span>
              ⚠️ Hace más de 5 horas sin sincronizar con la base de datos.
              Descargá un respaldo por seguridad.
            </span>
            <button
              onClick={() => {
                downloadBackup();
                setShowBackupBanner(false);
              }}
              style={{
                padding: "4px 14px",
                borderRadius: 6,
                border: "1px solid var(--gold)",
                background: "var(--gold)",
                color: "#0a0c10",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              <Download
                size={12}
                style={{ verticalAlign: -2, marginRight: 4 }}
              />
              Descargar respaldo
            </button>
            <button
              onClick={() => setShowBackupBanner(false)}
              style={{
                background: "none",
                border: "none",
                color: "var(--muted)",
                cursor: "pointer",
                padding: 4,
              }}
              title="Cerrar"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Content area — flex row with panel as sidebar on desktop */}
        <div
          style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}
        >
          <main
            className="main"
            style={{ flex: 1, minWidth: 0, overflowY: "auto" }}
          >
            {/* Pestañas estáticas — siempre montadas */}
            <div style={{ display: tab === "atletas" ? "block" : "none" }}>
              <PageAtletas
                atletas={atletas}
                setAtletas={setAtletasFn}
                mesociclos={mesociclos}
                setMesociclos={setMesociclos}
                onSelect={abrirAtleta}
                coachId={coachId}
              />
            </div>
            <div style={{ display: tab === "plantillas" ? "block" : "none" }}>
              <PagePlantillas
                plantillas={plantillas}
                onAdd={addPlantilla}
                onUpdate={updatePlantilla}
                onDelete={removePlantilla}
                onOpen={abrirPlantilla}
              />
            </div>
            <div style={{ display: tab === "calculadora" ? "block" : "none" }}>
              <PageCalculadora coachId={coachId} />
            </div>
            <div style={{ display: tab === "normativos" ? "block" : "none" }}>
              <PageNormativos
                coachId={coachId}
                isActive={tab === "normativos"}
              />
            </div>

            {/* Pestañas de atletas — montadas mientras estén abiertas */}
            {atletasTabs.map((aid) => {
              const a = atletas.find((x) => x.id === aid);
              if (!a) return null;
              return (
                <div
                  key={aid}
                  style={{
                    display: tab === `atleta:${aid}` ? "block" : "none",
                  }}
                >
                  <PageAtleta
                    atleta={a}
                    mesociclos={mesociclos}
                    setMesociclos={setMesociclos}
                    addPlantilla={addPlantilla}
                    onLiveMesoData={onLiveMesoDataCb}
                    onAtletaOverridesChange={queueAtletaOverrideSync}
                    openRequest={atletaOpenRequest[aid]}
                    onBack={() => {
                      cerrarAtleta(aid, { stopPropagation: () => {} });
                    }}
                  />
                </div>
              );
            })}

            {/* Pestañas de plantillas — montadas mientras estén abiertas */}
            {plantillasTabs.map((pid) => {
              const p = plantillas.find((x) => x.id === pid);
              if (!p) return null;
              return (
                <div
                  key={pid}
                  style={{
                    display: tab === `plantilla:${pid}` ? "block" : "none",
                  }}
                >
                  <PagePlantilla
                    plt={p}
                    onUpdate={(updated) => updatePlantilla(updated)}
                    onClose={() => cerrarPlantilla(pid, null)}
                  />
                </div>
              );
            })}
          </main>

          {refPanel && (
            <PanelReferencia
              atletas={atletas}
              mesociclos={mesociclos}
              plantillas={plantillas}
              liveMesoData={liveMesoData}
              onClose={() => setRefPanel(false)}
              onWidthChange={setRefPanelWidth}
              isMobile={
                typeof window !== "undefined" && window.innerWidth <= 768
              }
            />
          )}
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// PANEL DE ATLETA — vista para usuarios con rol "atleta"
// ═══════════════════════════════════════════════════════════════
function AtletaPanel({ session, profile, onLogout }) {
  const [loading, setLoading] = useState(true);
  const [atletaInfo, setAtletaInfo] = useState(null);
  const [mesociclos, setMesociclos] = useState([]);
  const [selectedMeso, setSelectedMeso] = useState(null);
  const [coachNormativos, setCoachNormativos] = useState(null);
  const [coachTablas, setCoachTablas] = useState(null);
  const [atletaView, setAtletaView] = useState(null); // "resumen" | "normativos" | "cronometro" | null
  const [normSearch, setNormSearch] = useState("");
  const [atletaNormOvr, setAtletaNormOvr] = useState({});
  const [cronometroExercises, setCronometroExercises] = useState(null);
  const [cronometroTurnoInfo, setCronometroTurnoInfo] = useState(null);
  const mesoScrollRef = useRef(0);
  const mesoIdRef = useRef(null);

  useEffect(() => {
    if (!SUPA_CONFIG_OK || !session?.user?.id) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        // Load the atleta record linked to this profile
        const { data: atletaData } = await sb
          .from("atletas")
          .select("*")
          .eq("profile_id", session.user.id)
          .limit(1);
        const atleta = atletaData?.[0] || null;
        setAtletaInfo(atleta);

        if (atleta?.app_id) {
          // Load all mesociclos for this athlete (active + completed)
          const { data: mesosData } = await sb
            .from("mesociclos")
            .select("*")
            .eq("app_atleta_id", atleta.app_id)
            .order("updated_at", { ascending: false });
          if (mesosData) {
            // Restore overrides (repsEdit, cellEdit, etc.) into localStorage
            // so PagePDF can read them — same as CoachApp does on pull
            mesosData.forEach((r) => {
              if (r.app_id && r.overrides)
                restoreMesoOverrides(r.app_id, r.overrides);
            });
            setMesociclos(mesosData.map(mesoFromDb));
          }

          // Restore athlete-specific overrides into localStorage
          if (atleta.pct_overrides) {
            restoreAtletaPctOverrides(atleta.app_id, atleta.pct_overrides);
          }
          if (atleta.normativos_overrides) {
            restoreAtletaNormOverrides(
              atleta.app_id,
              atleta.normativos_overrides,
            );
            // Also store in state directly — avoids localStorage timing issues
            const ovr =
              typeof atleta.normativos_overrides === "string"
                ? JSON.parse(atleta.normativos_overrides)
                : atleta.normativos_overrides;
            setAtletaNormOvr(ovr || {});
          }

          // Load coach settings (normativos and tablas) for PDF rendering
          if (atleta.coach_id) {
            const { data: settingsData } = await sb
              .from("coach_settings")
              .select("setting_key, setting_value")
              .eq("coach_id", atleta.coach_id);
            if (settingsData) {
              settingsData.forEach((s) => {
                if (
                  s.setting_key === "normativos_globales" &&
                  s.setting_value
                ) {
                  try {
                    const parsed =
                      typeof s.setting_value === "string"
                        ? JSON.parse(s.setting_value)
                        : s.setting_value;
                    setCoachNormativos(parsed);
                    // Write to localStorage so getEjercicioById/getGrupo
                    // can find custom exercises (IDs > 144)
                    if (parsed) writeLocalJson("liftplan_normativos", parsed);
                  } catch {}
                }
                if (s.setting_key === "tablas_calculadora" && s.setting_value) {
                  try {
                    const parsed =
                      typeof s.setting_value === "string"
                        ? JSON.parse(s.setting_value)
                        : s.setting_value;
                    setCoachTablas(parsed);
                    if (parsed) writeLocalJson("liftplan_tablas", parsed);
                  } catch {}
                }
              });
            }
          }
        }
      } catch (e) {
        console.warn("Error loading athlete data:", e);
      }
      setLoading(false);
    })();
  }, [session?.user?.id]);

  // Build atletaNormativos: merge coach normativos with athlete-specific overrides
  // Uses state (atletaNormOvr) directly — no localStorage dependency
  const atletaNormativos = useMemo(() => {
    const base = coachNormativos || EJERCICIOS;
    if (!Object.keys(atletaNormOvr).length) return base;
    return base.map((ej) => {
      const ovr = atletaNormOvr[ej.id];
      if (!ovr) return ej;
      return {
        ...ej,
        ...(ovr.pct_base !== undefined ? { pct_base: ovr.pct_base } : {}),
        ...(ovr.base !== undefined ? { base: ovr.base } : {}),
      };
    });
  }, [coachNormativos, atletaNormOvr]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <LogoHorizontal height={60} />
        <div
          style={{ fontSize: 12, color: "var(--muted)", letterSpacing: ".1em" }}
        >
          CARGANDO TUS DATOS...
        </div>
        <div style={{ fontSize: 10, color: "var(--muted)", opacity: 0.5 }}>
          v{APP_VERSION}
        </div>
      </div>
    );
  }

  // Not linked to any coach athlete record
  if (!atletaInfo) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 440,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: 32,
            textAlign: "center",
          }}
        >
          <div style={{ display: "flex", justifyContent: "center" }}>
            <LogoHorizontal height={60} />
          </div>
          <div
            style={{
              fontFamily: "'Bebas Neue'",
              fontSize: 13,
              color: "var(--muted)",
              letterSpacing: ".15em",
              marginTop: 8,
              marginBottom: 28,
            }}
          >
            PANEL DE ATLETA
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              marginBottom: 20,
              padding: "12px 16px",
              background: "var(--surface2)",
              borderRadius: 10,
              border: "1px solid var(--border)",
            }}
          >
            <User size={18} style={{ color: "var(--gold)" }} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>
              {toTitleCase(profile.nombre) || session?.user?.email}
            </span>
          </div>
          <p
            style={{
              fontSize: 14,
              color: "var(--muted)",
              lineHeight: 1.6,
              marginBottom: 24,
            }}
          >
            Tu cuenta aún no fue vinculada por tu coach.
            <br />
            <br />
            Pedile a tu coach que vincule tu usuario desde el panel de gestión
            para poder ver tus mesociclos acá.
          </p>
          <button
            className="btn btn-ghost"
            onClick={onLogout}
            style={{ width: "100%", justifyContent: "center" }}
          >
            <LogOut size={14} /> Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  // Show selected mesociclo detail — render the PDF-style view
  if (selectedMeso) {
    const meso = selectedMeso;
    // Reset scroll if different meso
    if (mesoIdRef.current !== meso.id) {
      mesoScrollRef.current = 0;
      mesoIdRef.current = meso.id;
    }
    const savedScroll = mesoScrollRef.current;
    if (savedScroll > 0) {
      setTimeout(() => window.scrollTo(0, savedScroll), 0);
    }
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg)",
          padding: "12px",
          paddingTop: 0,
        }}
      >
        {/* Navigation header */}
        <div
          style={{
            background: "var(--bg)",
            padding: "12px 0",
            marginBottom: 4,
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              maxWidth: 1000,
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <button
              className="btn btn-ghost"
              onClick={() => {
                mesoScrollRef.current = window.scrollY;
                setSelectedMeso(null);
              }}
              style={{ gap: 6 }}
            >
              <ChevronLeft size={14} /> Volver
            </button>
            <button className="btn btn-ghost" onClick={onLogout}>
              <LogOut size={14} /> Salir
            </button>
          </div>
        </div>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <PagePDF
            meso={meso}
            atleta={atletaInfo}
            irm_arr={meso.irm_arranque}
            irm_env={meso.irm_envion}
            normativos={atletaNormativos}
            tablas={coachTablas || TABLA_DEFAULT}
            hideActions
            onStartTimer={(exercises, turnoInfo) => {
              setCronometroExercises(exercises);
              setCronometroTurnoInfo(turnoInfo || null);
            }}
          />
        </div>
        {/* Cronómetro overlay */}
        {cronometroExercises && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: "var(--bg)",
              overflow: "auto",
              WebkitOverflowScrolling: "touch",
              paddingTop: "env(safe-area-inset-top, 0px)",
            }}
            ref={(el) => {
              if (el) {
                document.body.style.overflow = "hidden";
              } else {
                document.body.style.overflow = "";
              }
            }}
          >
            <TabataTimer
              exercises={cronometroExercises}
              turnoInfo={cronometroTurnoInfo}
              onBack={() => {
                setCronometroExercises(null);
                setCronometroTurnoInfo(null);
              }}
            />
          </div>
        )}
      </div>
    );
  }

  // Show Cronómetro standalone (from home button)
  if (atletaView === "cronometro") {
    return (
      <TabataTimer
        exercises={[]}
        onBack={() => {
          setAtletaView(null);
        }}
      />
    );
  }

  // Show Resumen full-page view
  if (atletaView === "resumen") {
    const activeMesos = mesociclos.filter((m) => m.activo);
    const primaryMeso = activeMesos[0] || null;
    if (!primaryMeso) {
      setAtletaView(null);
    } else {
      return (
        <div
          style={{
            minHeight: "100vh",
            background: "var(--bg)",
            padding: "12px",
            paddingTop: 0,
          }}
        >
          {/* Navigation header */}
          <div
            style={{
              background: "var(--bg)",
              padding: "12px 0",
              marginBottom: 4,
            }}
          >
            <div
              style={{
                maxWidth: 1000,
                margin: "0 auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <button
                className="btn btn-ghost"
                onClick={() => setAtletaView(null)}
                style={{ gap: 6 }}
              >
                <ChevronLeft size={14} /> Volver
              </button>
              <button className="btn btn-ghost" onClick={onLogout}>
                <LogOut size={14} /> Salir
              </button>
            </div>
          </div>
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            <div
              style={{
                fontFamily: "'Bebas Neue'",
                fontSize: 22,
                color: "var(--blue)",
                letterSpacing: ".04em",
                marginBottom: 16,
                paddingBottom: 10,
                borderBottom: "2px solid var(--blue)",
              }}
            >
              RESUMEN — {primaryMeso.nombre || "Mesociclo"}
            </div>
            <PageResumen
              meso={primaryMeso}
              atleta={atletaInfo}
              irm_arr={primaryMeso.irm_arranque}
              irm_env={primaryMeso.irm_envion}
              normativos={atletaNormativos}
            />
          </div>
        </div>
      );
    }
  }

  // Show Normativos full-page view
  if (atletaView === "normativos") {
    const norms = atletaNormativos;
    const categories = [
      "Arranque",
      "Envion",
      "Tirones",
      "Piernas",
      "Complementarios",
    ];
    const searchLower = normSearch.trim().toLowerCase();
    const filteredNorms = searchLower
      ? norms.filter(
          (ej) =>
            ej.nombre.toLowerCase().includes(searchLower) ||
            String(ej.id).includes(searchLower) ||
            (ej.categoria || "").toLowerCase().includes(searchLower),
        )
      : norms;
    const grouped = {};
    categories.forEach((c) => {
      grouped[c] = [];
    });
    filteredNorms.forEach((ej) => {
      const cat = ej.categoria || "Complementarios";
      if (grouped[cat]) grouped[cat].push(ej);
      else grouped["Complementarios"].push(ej);
    });
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg)",
          padding: "12px",
          paddingTop: 0,
        }}
      >
        {/* Navigation header */}
        <div
          style={{
            background: "var(--bg)",
            padding: "12px 0",
            marginBottom: 4,
          }}
        >
          <div
            style={{
              maxWidth: 1000,
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <button
              className="btn btn-ghost"
              onClick={() => {
                setAtletaView(null);
                setNormSearch("");
              }}
              style={{ gap: 6 }}
            >
              <ChevronLeft size={14} /> Volver
            </button>
            <button className="btn btn-ghost" onClick={onLogout}>
              <LogOut size={14} /> Salir
            </button>
          </div>
        </div>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div
            style={{
              fontFamily: "'Bebas Neue'",
              fontSize: 22,
              color: "#9b87e8",
              letterSpacing: ".04em",
              marginBottom: 16,
              paddingBottom: 10,
              borderBottom: "2px solid #9b87e8",
            }}
          >
            NORMATIVOS
          </div>
          {/* Search/filter */}
          <div style={{ position: "relative", marginBottom: 12 }}>
            <Search
              size={14}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--muted)",
                pointerEvents: "none",
              }}
            />
            <input
              type="text"
              name="norm_search"
              placeholder="Buscar ejercicio..."
              value={normSearch}
              onChange={(e) => setNormSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: 34 }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {categories.map((cat) => {
              const items = grouped[cat];
              if (!items || items.length === 0) return null;
              const catColor = CAT_COLOR[cat] || "#9b87e8";
              return (
                <div
                  key={cat}
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "10px 16px",
                      background: "var(--surface2)",
                      borderBottom: "1px solid var(--border)",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        width: 4,
                        height: 16,
                        borderRadius: 2,
                        background: catColor,
                        flexShrink: 0,
                      }}
                    />
                    <div
                      style={{
                        fontFamily: "'Bebas Neue'",
                        fontSize: 16,
                        color: catColor,
                        letterSpacing: ".04em",
                      }}
                    >
                      {cat.toUpperCase()}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--muted)",
                        marginLeft: "auto",
                      }}
                    >
                      {items.length} ejercicio{items.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <div style={{ padding: "4px 0" }}>
                    {items.map((ej, idx) => (
                      <div
                        key={ej.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "8px 16px",
                          borderBottom:
                            idx < items.length - 1
                              ? "1px solid var(--border)"
                              : "none",
                        }}
                      >
                        <div
                          style={{
                            fontFamily: "'Bebas Neue'",
                            fontSize: 16,
                            color: "var(--muted)",
                            minWidth: 28,
                            textAlign: "right",
                          }}
                        >
                          {ej.id}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 500,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {ej.nombre}
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: catColor,
                            minWidth: 40,
                            textAlign: "center",
                          }}
                        >
                          {ej.pct_base}%
                        </div>
                        {ej.base && (
                          <div
                            style={{
                              fontSize: 10,
                              color:
                                ej.base === "arranque"
                                  ? "var(--gold)"
                                  : "var(--blue)",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: ".04em",
                              minWidth: 30,
                            }}
                          >
                            {ej.base === "arranque" ? "ARR" : "ENV"}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {filteredNorms.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: 24,
                color: "var(--muted)",
                fontSize: 13,
              }}
            >
              No se encontraron ejercicios para "{normSearch}"
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main athlete dashboard — only show active mesociclos
  const activeMesos = mesociclos.filter((m) => m.activo);

  // Calculate current week number based on fecha_inicio
  const getCurrentWeek = (meso) => {
    if (!meso.fecha_inicio || !meso.semanas?.length) return null;
    const start = new Date(meso.fecha_inicio + "T00:00:00");
    if (isNaN(start.getTime())) return null;
    const now = new Date();
    const diffMs = now - start;
    if (diffMs < 0) return 0; // hasn't started
    const weekNum = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
    return Math.min(weekNum, meso.semanas.length - 1);
  };

  // Helper to get the exercise name from normativos
  const getEjercicioNombre = (ejId) => {
    const norms = atletaNormativos;
    const found = norms.find((e) => e.id === ejId);
    return found?.nombre || `Ejercicio #${ejId}`;
  };

  // Calculate athlete age from fecha_nacimiento
  const calcAge = (dateStr) => {
    if (!dateStr) return null;
    const birth = new Date(dateStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const atletaAge = calcAge(atletaInfo?.fecha_nacimiento);
  const atletaGenero =
    atletaInfo?.genero === "f"
      ? "Femenino"
      : atletaInfo?.genero === "m"
        ? "Masculino"
        : null;

  const MesoCard = ({ m, isActive }) => {
    const currentWeek = getCurrentWeek(m);
    const currentSemana = currentWeek != null ? m.semanas?.[currentWeek] : null;
    return (
      <button
        className="atleta-card-btn"
        onClick={() => setSelectedMeso(m)}
        style={{
          width: "100%",
          textAlign: "left",
          cursor: "pointer",
          background: "var(--surface)",
          border: isActive
            ? "2px solid var(--gold)"
            : "1px solid var(--border)",
          borderRadius: 12,
          padding: 0,
          marginBottom: 10,
          fontFamily: "'DM Sans'",
          color: "var(--text)",
          transition: "all .2s",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "14px 18px",
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: isActive ? "rgba(232,197,71,.15)" : "var(--surface3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "'Bebas Neue',sans-serif",
              fontSize: 18,
              color: isActive ? "var(--gold)" : "var(--muted)",
              flexShrink: 0,
            }}
          >
            {(m.nombre || "M").charAt(0).toUpperCase()}
          </div>
          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {m.nombre || "Mesociclo"}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--muted)",
                marginTop: 4,
              }}
            >
              {m.semanas?.length || 0} semana{(m.semanas?.length || 0) !== 1 ? "s" : ""}
            </div>
          </div>
          {/* Arrow */}
          <ChevronLeft
            size={16}
            style={{
              color: "var(--muted)",
              transform: "rotate(180deg)",
              flexShrink: 0,
            }}
          />
        </div>
      </button>
    );
  };

  // Get the primary active meso for the IRM cards
  const primaryMeso = activeMesos[0] || null;

  return (
    <div
      style={{ minHeight: "100vh", background: "var(--bg)", padding: "20px" }}
    >
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        {/* Header — name left, logo center, logout right */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 28,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}
            >
              {toTitleCase(profile.nombre) || session?.user?.email}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--gold)",
                fontWeight: 600,
                letterSpacing: ".04em",
              }}
            >
              ATLETA
            </div>
          </div>
          <div style={{ flex: "0 0 auto" }}>
            <LogoHorizontal height={48} />
          </div>
          <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
            <button
              className="btn btn-ghost"
              onClick={onLogout}
              style={{ padding: "6px 10px" }}
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>

        {/* IRM Summary Card */}
        {primaryMeso &&
          (primaryMeso.irm_arranque || primaryMeso.irm_envion) && (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 14,
                  paddingBottom: 8,
                  borderBottom: "2px solid var(--gold)",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Bebas Neue'",
                    fontSize: 20,
                    color: "var(--gold)",
                    letterSpacing: ".04em",
                  }}
                >
                  MARCAS HISTÓRICAS
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                {primaryMeso.irm_arranque && (
                  <div
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      padding: "16px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--muted)",
                        marginBottom: 4,
                        fontWeight: 600,
                      }}
                    >
                      ARRANQUE
                    </div>
                    <div
                      style={{
                        fontSize: 24,
                        fontWeight: 700,
                        color: "var(--gold)",
                        fontFamily: "'Bebas Neue'",
                        display: "flex",
                        alignItems: "baseline",
                        justifyContent: "center",
                        gap: 4,
                      }}
                    >
                      {primaryMeso.irm_arranque}
                      <span
                        style={{
                          fontSize: 12,
                          color: "var(--muted)",
                          fontWeight: 500,
                          fontFamily: "'DM Sans'",
                        }}
                      >
                        kg
                      </span>
                    </div>
                  </div>
                )}
                {primaryMeso.irm_envion && (
                  <div
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      padding: "16px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--muted)",
                        marginBottom: 4,
                        fontWeight: 600,
                      }}
                    >
                      ENVIÓN
                    </div>
                    <div
                      style={{
                        fontSize: 24,
                        fontWeight: 700,
                        color: "var(--blue)",
                        fontFamily: "'Bebas Neue'",
                        display: "flex",
                        alignItems: "baseline",
                        justifyContent: "center",
                        gap: 4,
                      }}
                    >
                      {primaryMeso.irm_envion}
                      <span
                        style={{
                          fontSize: 12,
                          color: "var(--muted)",
                          fontWeight: 500,
                          fontFamily: "'DM Sans'",
                        }}
                      >
                        kg
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

        {/* Active mesociclos */}
        {activeMesos.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 14,
                paddingBottom: 8,
                borderBottom: "2px solid var(--gold)",
              }}
            >
              <div
                style={{
                  fontFamily: "'Bebas Neue'",
                  fontSize: 20,
                  color: "var(--gold)",
                  letterSpacing: ".04em",
                }}
              >
                {activeMesos.length === 1
                  ? "MESOCICLO ACTIVO"
                  : "MESOCICLOS ACTIVOS"}
              </div>
            </div>
            {activeMesos.map((m) => (
              <MesoCard key={m.id} m={m} isActive />
            ))}
          </div>
        )}

        {/* Resumen — navigation card */}
        {primaryMeso && primaryMeso.semanas?.length > 0 && (
          <button
            className="atleta-nav-btn"
            onClick={() => setAtletaView("resumen")}
            style={{
              width: "100%",
              textAlign: "left",
              cursor: "pointer",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "16px 20px",
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              gap: 12,
              transition: "all .2s",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "var(--blue)22",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <FileText size={20} style={{ color: "var(--blue)" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "'Bebas Neue'",
                  fontSize: 18,
                  color: "var(--blue)",
                  letterSpacing: ".04em",
                }}
              >
                RESUMEN
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>
                {primaryMeso.nombre || "Mesociclo"}
              </div>
            </div>
            <ChevronLeft
              size={16}
              style={{ color: "var(--blue)", transform: "rotate(180deg)" }}
            />
          </button>
        )}

        {/* Normativos — navigation card */}
        {(() => {
          const norms = atletaNormativos;
          if (!norms || norms.length === 0) return null;
          return (
            <button
              className="atleta-nav-btn"
              onClick={() => setAtletaView("normativos")}
              style={{
                width: "100%",
                textAlign: "left",
                cursor: "pointer",
                background: "var(--surface)",
                border: "1px solid #9b87e8",
                borderRadius: 12,
                padding: "16px 20px",
                marginBottom: 20,
                display: "flex",
                alignItems: "center",
                gap: 12,
                transition: "all .2s",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "#9b87e822",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Library size={20} style={{ color: "#9b87e8" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "'Bebas Neue'",
                    fontSize: 18,
                    color: "#9b87e8",
                    letterSpacing: ".04em",
                  }}
                >
                  NORMATIVOS
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>
                  {norms.length} ejercicio{norms.length !== 1 ? "s" : ""}
                </div>
              </div>
              <ChevronLeft
                size={16}
                style={{ color: "#9b87e8", transform: "rotate(180deg)" }}
              />
            </button>
          );
        })()}

        {/* Cronómetro — navigation card */}
        <button
          className="atleta-nav-btn"
          onClick={() => {
            setCronometroExercises(null);
            setAtletaView("cronometro");
          }}
          style={{
            width: "100%",
            textAlign: "left",
            cursor: "pointer",
            background: "var(--surface)",
            border: "1px solid var(--green)",
            borderRadius: 12,
            padding: "16px 20px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 12,
            transition: "all .2s",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "rgba(71,232,160,.13)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Timer size={20} style={{ color: "var(--green)" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: "'Bebas Neue'",
                fontSize: 18,
                color: "var(--green)",
                letterSpacing: ".04em",
              }}
            >
              CRONÓMETRO
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>
              Timer de entrenamiento
            </div>
          </div>
          <ChevronLeft
            size={16}
            style={{ color: "var(--green)", transform: "rotate(180deg)" }}
          />
        </button>

        {/* No active mesociclos */}
        {activeMesos.length === 0 && (
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: 32,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: "'Bebas Neue'",
                fontSize: 18,
                color: "var(--muted)",
                marginBottom: 8,
              }}
            >
              SIN MESOCICLO ACTIVO
            </div>
            <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
              Tu coach aún no activó ningún mesociclo para vos. Contactalo para
              más información.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState("");

  const withTimeout = useCallback((promise, ms) => {
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error("AUTH_TIMEOUT")), ms);
      }),
    ]);
  }, []);

  // Check session on mount
  useEffect(() => {
    let mounted = true;
    const authWatchdog = setTimeout(() => {
      if (mounted && !session) {
        // Watchdog: si Supabase no respondió, intentar modo offline
        const cached = loadSession();
        if (cached?.user?.id) {
          console.warn(
            "Auth timeout — entrando en modo offline con sesión cacheada",
          );
          setSession(cached);
          const cachedProfile = loadProfileLocal(cached.user.id);
          if (cachedProfile) setProfile(cachedProfile);
        }
        setAuthLoading(false);
      }
    }, 8000);

    const init = async () => {
      try {
        // First, check if this is a callback from email confirmation/recovery
        const callbackSession = await sb._handleEmailCallback();
        if (callbackSession && mounted) {
          if (callbackSession._callbackType === "recovery") {
            if (callbackSession._verifyFailed) {
              // Recovery link expired or already used
              setConfirmMsg("");
              setAuthLoading(false);
              return;
            }
            // Password recovery — show reset form instead of logging in
            setRecoveryMode(true);
            setSession(callbackSession);
            setAuthLoading(false);
            return;
          }
          if (callbackSession._callbackType === "signup") {
            // Email confirmed — show login with success message
            setConfirmMsg("¡Cuenta confirmada! Ya podés iniciar sesión.");
            setAuthLoading(false);
            return;
          }
          // Other callback types (magiclink, etc.) — if verify failed, just show login
          if (callbackSession._verifyFailed) {
            setAuthLoading(false);
            return;
          }
          setSession(callbackSession);
          if (callbackSession.user?.id) {
            void loadProfile(callbackSession.user.id);
          } else setAuthLoading(false);
          return;
        }

        const sessionResult = await withTimeout(sb.auth.getSession(), 6000);
        const session = sessionResult?.data?.session || null;
        if (mounted) {
          setSession(session);
          if (session?.user?.id) {
            // Load profile without blocking initial auth UI transition.
            void loadProfile(session.user.id);
          } else setAuthLoading(false);
        }
      } catch (e) {
        if (e?.message === "SUPABASE_CONFIG_MISSING") {
          console.warn(
            "Supabase no configurado en deploy: faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY.",
          );
        }
        // Supabase no disponible — intentar modo offline
        if (mounted) {
          const cached = loadSession();
          if (cached?.user?.id) {
            console.warn(
              "Supabase no disponible — modo offline con sesión cacheada",
            );
            setSession(cached);
            const cachedProfile = loadProfileLocal(cached.user.id);
            if (cachedProfile) setProfile(cachedProfile);
          }
          setAuthLoading(false);
        }
      }
    };

    init();

    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        setSession(session);
        if (session?.user?.id) loadProfile(session.user.id);
        else {
          setProfile(null);
          setAuthLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      clearTimeout(authWatchdog);
      subscription?.unsubscribe();
    };
  }, [withTimeout]);

  const loadProfile = async (userId) => {
    try {
      const profileResult = await withTimeout(
        sb.from("profiles").select("*").eq("id", userId).single(),
        6000,
      );
      const { data } = profileResult || {};
      if (data) {
        setProfile(data);
        saveProfileLocal(data);
      } else {
        // DB no devolvió perfil — usar cache local
        const cached = loadProfileLocal(userId);
        if (cached) setProfile(cached);
      }
    } catch (e) {
      // Falló la carga de perfil — usar cache local
      const cached = loadProfileLocal(userId);
      if (cached) setProfile(cached);
    }
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    const userId = session?.user?.id;
    await sb.auth.signOut();
    clearSession();
    clearProfileLocal(userId);
    setSession(null);
    setProfile(null);
  };

  // Loading
  if (authLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <style>{`
          :root{--bg:#0a0c10;--surface:#12151c;--surface2:#1a1e27;--surface3:#222732;
          --border:#2a303c;--text:#e8eaf0;--muted:#6b7280;--gold:#e8c547;
          --blue:#64b4e8;--green:#47e8a0;--red:#e85047}
          body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;margin:0}
        `}</style>
        <LogoHorizontal height={60} />
        <div
          style={{ fontSize: 12, color: "var(--muted)", letterSpacing: ".1em" }}
        >
          CARGANDO...
        </div>
        <div style={{ fontSize: 10, color: "var(--muted)", opacity: 0.5 }}>
          v{APP_VERSION}
        </div>
      </div>
    );
  }

  // Not logged in (or recovery mode — show password reset form)
  if (!session || recoveryMode) {
    return (
      <>
        <style>{`
          :root{--bg:#0a0c10;--surface:#12151c;--surface2:#1a1e27;--surface3:#22273c;
          --border:#2a303c;--text:#e8eaf0;--muted:#6b7280;--gold:#e8c547;
          --blue:#64b4e8;--green:#47e8a0;--red:#e85047}
          body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;margin:0}
          .form-group{display:flex;flex-direction:column;gap:6px;margin-bottom:14px}
          .form-label{font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.07em}
          .form-input{background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:'DM Sans';font-size:16px;padding:9px 12px;outline:none;transition:border .2s;width:100%;box-sizing:border-box}
          .form-input:focus{border-color:var(--gold)}
          .btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;border:none;cursor:pointer;font-family:'DM Sans';font-size:13px;font-weight:600;transition:all .2s}
          .btn-gold{background:var(--gold);color:#0a0c10}
          .btn-ghost{background:var(--surface2);color:var(--text);border:1px solid var(--border)}
          @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;600;700&display=swap');
        `}</style>
        <LoginScreen
          onAuth={(s) => {
            setRecoveryMode(false);
            setConfirmMsg("");
            setSession(s);
          }}
          recoveryMode={recoveryMode}
          initialMsg={confirmMsg}
        />
      </>
    );
  }

  // Logged in but profile not yet loaded — show loading
  if (!profile) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <style>{`
          :root{--bg:#0a0c10;--surface:#12151c;--surface2:#1a1e27;--surface3:#222732;
          --border:#2a303c;--text:#e8eaf0;--muted:#6b7280;--gold:#e8c547;
          --blue:#64b4e8;--green:#47e8a0;--red:#e85047}
          body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;margin:0}
        `}</style>
        <LogoHorizontal height={60} />
        <div
          style={{ fontSize: 12, color: "var(--muted)", letterSpacing: ".1em" }}
        >
          CARGANDO...
        </div>
        <div style={{ fontSize: 10, color: "var(--muted)", opacity: 0.5 }}>
          v{APP_VERSION}
        </div>
      </div>
    );
  }

  // Logged in — check role before showing the appropriate panel
  if (profile.rol !== "coach") {
    return (
      <>
        <style>{`
          :root{--bg:#0a0c10;--surface:#12151c;--surface2:#1a1e27;--surface3:#222732;
          --border:#2a303c;--text:#e8eaf0;--muted:#6b7280;--gold:#e8c547;
          --blue:#64b4e8;--green:#47e8a0;--red:#e85047}
          body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;margin:0}
          .btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;border:none;cursor:pointer;font-family:'DM Sans';font-size:13px;font-weight:600;transition:all .2s}
          .btn-ghost{background:var(--surface2);color:var(--text);border:1px solid var(--border)}
          @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;600;700&display=swap');
        `}</style>
        <AtletaPanel
          session={session}
          profile={profile}
          onLogout={handleLogout}
        />
      </>
    );
  }

  return (
    <CoachApp session={session} profile={profile} onLogout={handleLogout} />
  );
}
