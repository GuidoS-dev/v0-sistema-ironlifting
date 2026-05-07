import { useState } from "react";
import { Library } from "lucide-react";
import { Modal } from "../common/Modal";
import { mkId, mkSemanas, mkSemanasBasica, mkSemanasPretemp } from "../../data/constantes";
import { formatDateDisplay, getFechaSemana } from "../../lib/ciclo-menstrual";
import { PlantillaPicker } from "../plantillas/PlantillaPicker";

export function MesocicloForm({ atleta, meso, onSave, onClose }) {
  const [form, setForm] = useState(
    meso || {
      id: mkId(),
      atleta_id: atleta.id,
      fecha_inicio: new Date().toISOString().slice(0, 10),
      nombre: "",
      descripcion: "",
      volumen_total: 1200,
      modo: "Preparatorio",
      irm_arranque: "",
      irm_envion: "",
      escuela: false,
      escuela_nivel: "1",
      num_bloques_basica: 3,
      pretemporada: false,
      semanas: mkSemanas(),
    },
  );
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const esEscuela = form.escuela === true || form.escuela === "true";
  const esPretemp = form.pretemporada === true || form.pretemporada === "true";
  const totalPct =
    esEscuela || esPretemp
      ? 100
      : form.semanas.reduce((s, sem) => s + Number(sem.pct_volumen), 0);
  const [showPicker, setShowPicker] = useState(false);
  const [pendingOverrides, setPendingOverrides] = useState(null);
  const [pendingGrupos, setPendingGrupos] = useState(null);

  const plantillas = (() => {
    try {
      return JSON.parse(localStorage.getItem("liftplan_plantillas") || "[]");
    } catch {
      return [];
    }
  })();

  const [pendingPlantilla, setPendingPlantilla] = useState(null);
  const [importOpts, setImportOpts] = useState({
    irm: true,
    volumen: true,
    reps: true,
    celdas: true,
    grupos: true,
  });

  const confirmApply = (plt, opts) => {
    if (plt.tipo === "meso" && plt.semanas) {
      const esEscuela = plt.escuela === true || plt.escuela === "true";
      const esPretemp =
        plt.pretemporada === true || plt.pretemporada === "true";
      if (esEscuela) {
        // Plantilla escuela: preservar estructura de bloques tal cual
        const newSemanas = plt.semanas.map((s) => ({
          id: mkId(),
          numero: s.numero,
          turnos: (s.turnos || []).map((t) => ({
            id: mkId(),
            dia: t.dia,
            momento: t.momento,
            ejercicios: (t.ejercicios || []).map((e) => ({
              id: mkId(),
              ejercicio_id: e.ejercicio_id,
              nombre_custom: e.nombre_custom || "",
              bloques: (e.bloques || []).map((b) => ({ ...b })),
            })),
          })),
        }));
        setForm((f) => ({
          ...f,
          nombre: f.nombre || plt.nombre,
          escuela: true,
          escuela_nivel: plt.escuela_nivel || "1",
          num_bloques_basica: plt.num_bloques_basica || 3,
          ...(opts.irm
            ? {
                irm_arranque: plt.irm_arranque || "",
                irm_envion: plt.irm_envion || "",
              }
            : {}),
          semanas: newSemanas,
        }));
      } else if (esPretemp) {
        // Plantilla pretemporada: preservar estructura con ejercicio_ids
        const newSemanas = plt.semanas.map((s) => ({
          id: mkId(),
          numero: s.numero,
          turnos: (s.turnos || []).map((t) => ({
            id: mkId(),
            dia: t.dia,
            momento: t.momento,
            ejercicios: (t.ejercicios || []).map((e) => ({
              id: mkId(),
              ejercicio_ids: (
                e.ejercicio_ids || [{ eid: e.ejercicio_id, link: "-" }]
              ).map((sub) => ({ ...sub })),
              nombre_custom: e.nombre_custom || "",
              bloques: (e.bloques || []).map((b) => ({ ...b })),
            })),
          })),
        }));
        setForm((f) => ({
          ...f,
          nombre: f.nombre || plt.nombre,
          pretemporada: true,
          num_bloques_basica: plt.num_bloques_basica || 3,
          ...(opts.irm
            ? {
                irm_arranque: plt.irm_arranque || "",
                irm_envion: plt.irm_envion || "",
              }
            : {}),
          semanas: newSemanas,
        }));
      } else {
        const newSemanas = plt.semanas.map((s, i) => ({
          ...mkSemanas()[Math.min(i, mkSemanas().length - 1)],
          id: mkId(),
          numero: s.numero,
          pct_volumen: opts.volumen
            ? s.pct_volumen
            : mkSemanas()[Math.min(i, mkSemanas().length - 1)].pct_volumen,
          reps_ajustadas: opts.reps ? s.reps_ajustadas : undefined,
          turnos: s.turnos.map((t) => ({
            id: mkId(),
            dia: t.dia,
            momento: t.momento,
            ejercicios: t.ejercicios.map((e) => ({
              id: mkId(),
              ejercicio_id: e.ejercicio_id,
              intensidad: e.intensidad,
              tabla: e.tabla,
              reps_asignadas: opts.reps ? e.reps_asignadas || 0 : 0,
            })),
            ...(opts.complementarios
              ? {
                  complementarios_before: (t.complementarios_before || []).map(
                    (c) => ({ ...c, id: mkId() }),
                  ),
                  complementarios_after: (t.complementarios_after || []).map(
                    (c) => ({ ...c, id: mkId() }),
                  ),
                  num_bloques_comp: t.num_bloques_comp || 1,
                }
              : {}),
          })),
        }));
        setForm((f) => ({
          ...f,
          nombre: f.nombre || plt.nombre,
          modo: plt.modo || f.modo,
          ...(opts.volumen ? { volumen_total: plt.volumen_total } : {}),
          ...(opts.irm
            ? {
                irm_arranque: plt.irm_arranque || "",
                irm_envion: plt.irm_envion || "",
              }
            : {}),
          semanas: newSemanas,
        }));
        // Guardar overrides en un ref para aplicar al mesociclo nuevo tras creación
        if (opts.celdas && plt.overrides)
          setPendingOverrides({ opts, overrides: plt.overrides });
        if (opts.grupos && plt.overrides)
          setPendingGrupos({ opts, overrides: plt.overrides });
      }
    }
    setPendingPlantilla(null);
  };

  return (
    <Modal
      title={meso ? "Editar Mesociclo" : "Nuevo Mesociclo"}
      onClose={onClose}
    >
      {!meso && plantillas.filter((p) => p.tipo === "meso").length > 0 && (
        <div
          style={{
            marginBottom: 16,
            padding: "10px 14px",
            background: "var(--surface2)",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            ¿Partir desde una plantilla?
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowPicker(true)}
          >
            <Library size={13} /> Importar plantilla
          </button>
        </div>
      )}
      {showPicker && (
        <PlantillaPicker
          plantillas={plantillas}
          tipo="meso"
          onSelect={(plt, opts) =>
            confirmApply(
              plt,
              opts || {
                irm: true,
                volumen: true,
                reps: true,
                celdas: true,
                grupos: true,
              },
            )
          }
          onClose={() => setShowPicker(false)}
        />
      )}
      <div className="form-group">
        <label className="form-label">Nombre del mesociclo</label>
        <input
          className="form-input"
          name="meso_nombre"
          value={form.nombre}
          onChange={(e) => set("nombre", e.target.value)}
          placeholder="Ej: Pretemporada 2025, Base Fuerza, etc."
        />
      </div>
      <div className="form-group">
        <label className="form-label">Descripción / Objetivos</label>
        <textarea
          className="form-input"
          name="meso_descripcion"
          value={form.descripcion}
          onChange={(e) => set("descripcion", e.target.value)}
          placeholder="Objetivos del ciclo, observaciones..."
          rows={2}
          style={{ resize: "vertical" }}
        />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Fecha inicio</label>
          <input
            className="form-input"
            name="meso_fecha_inicio"
            type="date"
            value={form.fecha_inicio}
            onChange={(e) => set("fecha_inicio", e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Modo</label>
          <select
            className="form-select"
            name="meso_modo"
            value={form.modo}
            onChange={(e) => set("modo", e.target.value)}
          >
            <option>Preparatorio</option>
            <option>Competitivo</option>
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">IRM Arranque (kg)</label>
          <input
            className="form-input"
            name="irm_arranque"
            type="number"
            min={65}
            max={95}
            value={form.irm_arranque}
            onChange={(e) => set("irm_arranque", Number(e.target.value))}
            placeholder="ej: 80"
          />
        </div>
        <div className="form-group">
          <label className="form-label">IRM Envión (kg)</label>
          <input
            className="form-input"
            name="irm_envion"
            type="number"
            min={65}
            max={95}
            value={form.irm_envion}
            onChange={(e) => set("irm_envion", Number(e.target.value))}
            placeholder="ej: 80"
          />
        </div>
      </div>
      <datalist id="irm-values">
        {IRM_VALUES.map((v) => (
          <option key={v} value={v} />
        ))}
      </datalist>
      {/* ── Selector de tipo de planilla ── */}
      {!meso && (
        <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
          {[
            { key: "regular", label: "Regular", color: "var(--gold)" },
            { key: "escuela", label: "Escuela Inicial", color: "#4db6ac" },
            { key: "pretemporada", label: "Pretemporada", color: "#ff9800" },
          ].map((opt) => {
            const active =
              opt.key === "escuela"
                ? esEscuela
                : opt.key === "pretemporada"
                  ? esPretemp
                  : !esEscuela && !esPretemp;
            return (
              <button
                key={opt.key}
                onClick={() => {
                  if (opt.key === "escuela") {
                    setForm((f) => ({
                      ...f,
                      escuela: true,
                      pretemporada: false,
                      semanas: mkSemanasBasica(4, f.num_bloques_basica || 3),
                    }));
                  } else if (opt.key === "pretemporada") {
                    setForm((f) => ({
                      ...f,
                      escuela: false,
                      pretemporada: true,
                      semanas: mkSemanasPretemp(4, f.num_bloques_basica || 3),
                    }));
                  } else {
                    setForm((f) => ({
                      ...f,
                      escuela: false,
                      pretemporada: false,
                      semanas: mkSemanas(),
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
                  transition: "all .15s",
                  fontFamily: "'DM Sans'",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
      {esEscuela ? (
        <div
          style={{
            padding: "10px 14px",
            background: "rgba(77,182,172,.08)",
            border: "1px solid rgba(77,182,172,.3)",
            borderRadius: 8,
            fontSize: 12,
            color: "#4db6ac",
          }}
        >
          Planilla Escuela Inicial · Nivel {form.escuela_nivel} ·{" "}
          {form.semanas?.length} semanas
        </div>
      ) : esPretemp ? (
        <div
          style={{
            padding: "10px 14px",
            background: "rgba(232,197,71,.08)",
            border: "1px solid rgba(232,197,71,.3)",
            borderRadius: 8,
            fontSize: 12,
            color: "var(--gold)",
          }}
        >
          Planilla Pretemporada ·{" "}
          {(form.semanas || []).reduce(
            (acc, s) => acc + (s.turnos?.length || 0),
            0,
          )}{" "}
          turnos
        </div>
      ) : (
        <>
          <div className="form-group">
            <label className="form-label">Volumen total de repeticiones</label>
            <input
              className="form-input"
              name="volumen_total"
              type="number"
              value={form.volumen_total}
              onChange={(e) => set("volumen_total", Number(e.target.value))}
            />
          </div>
          <div className="divider" />
          <div className="form-label mb8">Distribución semanal</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
              gap: 10,
            }}
          >
            {form.semanas.map((sem, i) => {
              const fechaAuto = getFechaSemana(form.fecha_inicio, sem.numero);
              return (
                <div
                  key={sem.id}
                  style={{
                    background: "var(--surface2)",
                    borderRadius: 8,
                    padding: 12,
                    border: "1px solid var(--border)",
                  }}
                >
                  <div className="text-sm text-muted mb8">
                    Semana {sem.numero}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: sem.fecha_override
                        ? "var(--gold)"
                        : "var(--muted)",
                      marginBottom: 6,
                    }}
                  >
                    {formatDateDisplay(sem.fecha_override || fechaAuto) || "—"}
                    {sem.fecha_override && (
                      <button
                        type="button"
                        onClick={() => {
                          const s = [...form.semanas];
                          s[i] = { ...s[i], fecha_override: "" };
                          set("semanas", s);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--muted)",
                          cursor: "pointer",
                          fontSize: 10,
                          marginLeft: 4,
                        }}
                        title="Restaurar fecha automática"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <input
                    className="form-input"
                    name={`semana_fecha_${i}`}
                    type="date"
                    value={sem.fecha_override || ""}
                    onChange={(e) => {
                      const s = [...form.semanas];
                      s[i] = { ...s[i], fecha_override: e.target.value };
                      set("semanas", s);
                    }}
                    style={{ width: "100%", fontSize: 11, marginBottom: 6 }}
                    placeholder="Sobreescribir fecha"
                  />
                  <div className="flex gap8" style={{ alignItems: "center" }}>
                    <input
                      className="form-input"
                      name={`semana_pct_${i}`}
                      type="number"
                      min={0}
                      max={100}
                      value={sem.pct_volumen}
                      onChange={(e) => {
                        const s = [...form.semanas];
                        s[i] = { ...s[i], pct_volumen: Number(e.target.value) };
                        set("semanas", s);
                      }}
                      style={{ width: 70 }}
                    />
                    <span className="text-muted">%</span>
                    <span
                      className="text-gold"
                      style={{ fontFamily: "'Bebas Neue'", fontSize: 18 }}
                    >
                      {calcVolumenSemana(form.volumen_total, sem.pct_volumen)}
                    </span>
                    <span className="text-sm text-muted">reps</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div
            className="mt12 text-sm"
            style={{ color: totalPct === 100 ? "var(--green)" : "var(--red)" }}
          >
            Total: {totalPct}% {totalPct !== 100 && "(debe sumar 100%)"}
          </div>
        </>
      )}
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>
          Cancelar
        </button>
        <button
          className="btn btn-gold"
          onClick={() =>
            onSave(
              esEscuela || esPretemp
                ? form
                : {
                    ...form,
                    semanas: form.semanas.map((s) => ({
                      ...s,
                      reps_calculadas: calcVolumenSemana(
                        form.volumen_total,
                        s.pct_volumen,
                      ),
                      reps_ajustadas: calcVolumenSemana(
                        form.volumen_total,
                        s.pct_volumen,
                      ),
                    })),
                  },
            )
          }
        >
          Crear Mesociclo
        </button>
      </div>
    </Modal>
  );
}
