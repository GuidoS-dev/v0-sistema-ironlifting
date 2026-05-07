import { useState } from "react";
import { Modal } from "../common/Modal";
import { PERIODOS, OBJETIVOS, NIVELES, PERIODO_LABEL, OBJETIVO_LABEL, NIVEL_LABEL } from "../../data/plantillas-meta";

export function GuardarPlantillaModal({
  tipo,
  dataMeso,
  dataSemana,
  dataDistribucion,
  onSave,
  onClose,
}) {
  const [form, setForm] = useState({
    nombre: dataMeso?.nombre || dataSemana?.nombre || "",
    descripcion: dataMeso?.descripcion || "",
    periodo: "general",
    objetivo: "mixto",
    nivel: "intermedio",
    modo: dataMeso?.modo || "Preparatorio",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const tipoLabel =
    tipo === "meso"
      ? "Mesociclo completo"
      : tipo === "semana"
        ? "Bloque semanal"
        : "Distribución de grupos";

  const handleSave = () => {
    if (!form.nombre.trim()) {
      alert("El nombre de la plantilla es obligatorio");
      return;
    }
    const base = {
      ...form,
      tipo,
      escuela: dataMeso?.escuela ?? false,
      escuela_nivel: dataMeso?.escuela_nivel ?? "1",
      num_bloques_basica: dataMeso?.num_bloques_basica ?? 3,
      pretemporada: dataMeso?.pretemporada ?? false,
      duracion_semanas:
        tipo === "meso"
          ? dataMeso?.semanas?.length || 4
          : tipo === "semana"
            ? 1
            : null,
    };
    if (tipo === "meso" && dataMeso) {
      const isBasicaOrPretemp = dataMeso.escuela || dataMeso.pretemporada;
      if (isBasicaOrPretemp) {
        // Escuela/Pretemporada: guardar semanas completas tal cual
        base.semanas = dataMeso.semanas;
        base.num_bloques_basica = dataMeso.num_bloques_basica ?? 3;
      } else {
        // Guardar estructura completa con todo
        base.semanas = dataMeso.semanas.map((s) => ({
          numero: s.numero,
          pct_volumen: s.pct_volumen,
          reps_ajustadas: s.reps_ajustadas,
          turnos: s.turnos.map((t) => ({
            dia: t.dia,
            momento: t.momento,
            ejercicios: t.ejercicios
              .filter((e) => e.ejercicio_id)
              .map((e) => ({
                ejercicio_id: e.ejercicio_id,
                intensidad: e.intensidad,
                tabla: e.tabla,
                reps_asignadas: e.reps_asignadas || 0,
              })),
            complementarios_before: (t.complementarios_before || []).map(
              (c) => ({
                ...c,
              }),
            ),
            complementarios_after: (t.complementarios_after || []).map((c) => ({
              ...c,
            })),
            num_bloques_comp: t.num_bloques_comp || 1,
          })),
        }));
      }
      base.volumen_total = dataMeso.volumen_total;
      base.irm_arranque = dataMeso.irm_arranque;
      base.irm_envion = dataMeso.irm_envion;
      // Guardar overrides de celdas y distribución
      try {
        const id = dataMeso.id;
        base.overrides = {
          repsEdit: JSON.parse(
            localStorage.getItem(`liftplan_pt_${id}_repsEdit`) || "{}",
          ),
          manualEdit: JSON.parse(
            localStorage.getItem(`liftplan_pt_${id}_manualEdit`) || "[]",
          ),
          cellEdit: JSON.parse(
            localStorage.getItem(`liftplan_pt_${id}_cellEdit`) || "{}",
          ),
          cellManual: JSON.parse(
            localStorage.getItem(`liftplan_pt_${id}_cellManual`) || "[]",
          ),
          nameEdit: JSON.parse(
            localStorage.getItem(`liftplan_pt_${id}_nameEdit`) || "{}",
          ),
          semPcts: JSON.parse(
            localStorage.getItem(`liftplan_pct_${id}_semOvr`) || "{}",
          ),
          semPctsMan: JSON.parse(
            localStorage.getItem(`liftplan_pct_${id}_semMan`) || "[]",
          ),
          turnoPcts: JSON.parse(
            localStorage.getItem(`liftplan_pct_${id}_turnoOvr`) || "{}",
          ),
          turnoPctsMan: JSON.parse(
            localStorage.getItem(`liftplan_pct_${id}_turnoMan`) || "[]",
          ),
        };
      } catch (e) {}
    }
    if (tipo === "semana" && dataSemana) {
      base.semana = {
        pct_volumen: dataSemana.pct_volumen,
        turnos: dataSemana.turnos.map((t) => ({
          dia: t.dia,
          momento: t.momento,
          ejercicios: t.ejercicios
            .filter((e) => e.ejercicio_id)
            .map((e) => ({
              ejercicio_id: e.ejercicio_id,
              intensidad: e.intensidad,
              tabla: e.tabla,
            })),
        })),
      };
    }
    if (tipo === "distribucion" && dataDistribucion) {
      base.distribucion = dataDistribucion;
    }
    onSave(base);
    onClose();
  };

  return (
    <Modal title={`Guardar como plantilla — ${tipoLabel}`} onClose={onClose}>
      <div className="form-group">
        <label className="form-label">Nombre de la plantilla *</label>
        <input
          name="field_46"
          className="form-input"
          value={form.nombre}
          onChange={(e) => set("nombre", e.target.value)}
          placeholder="Ej: Pretemporada 4 semanas fuerza"
          style={!form.nombre.trim() ? { borderColor: "var(--red)" } : {}}
        />
        {!form.nombre.trim() && (
          <span style={{ fontSize: 10, color: "var(--red)" }}>Requerido</span>
        )}
      </div>
      <div className="form-group">
        <label className="form-label">Descripción</label>
        <textarea
          name="field_47"
          className="form-input"
          value={form.descripcion}
          onChange={(e) => set("descripcion", e.target.value)}
          placeholder="Características, contexto de uso..."
          rows={2}
          style={{ resize: "vertical" }}
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div className="form-group">
          <label className="form-label">Período</label>
          <select
            name="field_48"
            className="form-select"
            value={form.periodo}
            onChange={(e) => set("periodo", e.target.value)}
          >
            {PERIODOS.map((p) => (
              <option key={p} value={p}>
                {PERIODO_LABEL[p]}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Objetivo</label>
          <select
            name="field_49"
            className="form-select"
            value={form.objetivo}
            onChange={(e) => set("objetivo", e.target.value)}
          >
            {OBJETIVOS.map((o) => (
              <option key={o} value={o}>
                {OBJETIVO_LABEL[o]}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Nivel atleta</label>
          <select
            name="field_50"
            className="form-select"
            value={form.nivel}
            onChange={(e) => set("nivel", e.target.value)}
          >
            {NIVELES.map((n) => (
              <option key={n} value={n}>
                {NIVEL_LABEL[n]}
              </option>
            ))}
          </select>
        </div>
        {tipo === "meso" && (
          <div className="form-group">
            <label className="form-label">Modo</label>
            <select
              name="field_51"
              className="form-select"
              value={form.modo}
              onChange={(e) => set("modo", e.target.value)}
            >
              <option>Preparatorio</option>
              <option>Competitivo</option>
            </select>
          </div>
        )}
      </div>
      {tipo === "meso" &&
        dataMeso &&
        (() => {
          const ejCount = dataMeso.semanas.reduce(
            (a, s) =>
              a +
              s.turnos.reduce(
                (b, t) => b + t.ejercicios.filter((e) => e.ejercicio_id).length,
                0,
              ),
            0,
          );
          const hasIrm = dataMeso.irm_arranque || dataMeso.irm_envion;
          const hasReps = dataMeso.semanas.some((s) =>
            s.turnos.some((t) =>
              t.ejercicios.some((e) => e.reps_asignadas > 0),
            ),
          );
          return (
            <div
              style={{
                marginTop: 8,
                padding: "8px 12px",
                background: "var(--surface2)",
                borderRadius: 8,
                fontSize: 11,
                color: "var(--muted)",
                lineHeight: 1.6,
              }}
            >
              Se guardarán:{" "}
              <span style={{ color: "var(--text)" }}>
                {dataMeso.semanas.length} semanas
              </span>
              {" · "}
              <span style={{ color: "var(--text)" }}>
                {ejCount} ejercicio{ejCount !== 1 ? "s" : ""}
              </span>
              {hasIrm && (
                <>
                  {" · "}
                  <span style={{ color: "var(--gold)" }}>IRM arr/env</span>
                </>
              )}
              {hasReps && (
                <>
                  {" · "}
                  <span style={{ color: "var(--blue)" }}>reps asignadas</span>
                </>
              )}
              {" · "}
              <span style={{ color: "var(--green)" }}>
                distribución y porcentajes
              </span>
            </div>
          );
        })()}
      <div className="flex gap8 mt16" style={{ justifyContent: "flex-end" }}>
        <button className="btn btn-ghost" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn btn-gold" onClick={handleSave}>
          <FileText size={14} /> Guardar plantilla
        </button>
      </div>
    </Modal>
  );
}
