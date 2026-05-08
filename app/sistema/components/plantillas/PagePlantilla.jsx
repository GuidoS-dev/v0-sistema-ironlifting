import { useState, useEffect, useRef } from "react";
import { ChevronLeft } from "lucide-react";
import { Modal } from "../common/Modal";
import { mkSemanas } from "../../data/constantes";
import { safeSetItem } from "../../lib/storage";
import {
  remapSemPctKeyForSwap,
  remapTurnoPctKeyForSwap,
  remapOverrideObjectKeys,
  remapOverrideSetKeys,
} from "../../lib/calc";
import { SembradoMensual } from "../sembrado/SembradoMensual";
import { SemanaView } from "../sembrado/SemanaView";
import { ResumenGrupos } from "../resumen/ResumenGrupos";
import { DistribucionTurnos } from "../resumen/DistribucionTurnos";
import { PlanillaTurno } from "../planilla/PlanillaTurno";
import { PlanillaBasica } from "../planilla/PlanillaBasica";
import { PlanillaPretemporada } from "../planilla/PlanillaPretemporada";
import { PageResumen } from "../resumen/PageResumen";

export function PagePlantilla({ plt, onUpdate, onClose }) {
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
