import { useState, useEffect, useRef } from "react";
import { ChevronLeft, Copy, Library, Minus, Pencil, Plus, Redo2, Trash2, Undo2 } from "lucide-react";
import { Modal } from "../common/Modal";
import { EJERCICIOS } from "../../data/ejercicios";
import { CATEGORIAS, CAT_COLOR, mkId } from "../../data/constantes";
import { FASES_CICLO } from "../../data/ciclo";
import { getEjercicioById } from "../../lib/calc";
import { formatDateDisplay, getDetalleFaseCiclo, getFechaSemana, parseAppDate } from "../../lib/ciclo-menstrual";
import { safeSetItem } from "../../lib/storage";
import { MesocicloForm } from "./MesocicloForm";
import { EditMesoModal } from "./EditMesoModal";
import { EditVolModal } from "./EditVolModal";
import { GuardarPlantillaModal } from "../plantillas/GuardarPlantillaModal";
import { PlanillaTurno } from "../planilla/PlanillaTurno";
import { PlanillaBasica } from "../planilla/PlanillaBasica";
import { PlanillaPretemporada } from "../planilla/PlanillaPretemporada";
import { SembradoMensual } from "../sembrado/SembradoMensual";
import { ResumenGrupos } from "../resumen/ResumenGrupos";
import { DistribucionTurnos } from "../resumen/DistribucionTurnos";
import { PageNormativosAtleta } from "../normativos/PageNormativosAtleta";
import { PagePDF } from "../pdf/PagePDF";
import { PageResumen } from "../resumen/PageResumen";

export function PageAtleta({
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
