import { useState, useEffect, useRef, useCallback } from "react";
import { EJERCICIOS } from "../../data/ejercicios";
import { CAT_COLOR, EMPTY_NAME_SENTINEL, mkId, resolveExerciseName } from "../../data/constantes";
import { INTENSIDADES, TABLA_DEFAULT } from "../../data/tablas-default";
import { calcSembradoSemana, calcSeriesRepsKg, getGrupo, GRUPOS_KEYS } from "../../lib/calc";
import { handlePlanillaArrowNavigation } from "../../lib/navegacion";

export function PlanillaTurno({
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
