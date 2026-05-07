import { useState } from "react";
import { Modal } from "../common/Modal";
import { mkId, mkSemanas, mkSemanasBasica, mkSemanasPretemp } from "../../data/constantes";
import { PERIODOS, OBJETIVOS, NIVELES, ESCUELA_NIVELES, PERIODO_LABEL, OBJETIVO_LABEL, NIVEL_LABEL, ESCUELA_NIVEL_LABEL, ESCUELA_NIVEL_COLOR } from "../../data/plantillas-meta";

export function CrearPlantillaModal({ onSave, onClose }) {
  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    tipo: "meso",
    periodo: "general",
    objetivo: "mixto",
    nivel: "intermedio",
    modo: "Preparatorio",
    volumen_total: 600,
    semanas: mkSemanas(),
    escuela: false,
    escuela_nivel: "1",
    num_bloques_basica: 3,
    pretemporada: false,
    irm_arranque: 0,
    irm_envion: 0,
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const modoOpts = ["Preparatorio", "Competitivo", "General"];

  const handleSave = () => {
    if (!form.nombre.trim()) {
      alert("El nombre es obligatorio");
      return;
    }
    onSave({ ...form, duracion_semanas: form.semanas?.length || 4 });
    onClose();
  };

  return (
    <Modal title="Nueva plantilla" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Tipo selector — oculto si es escuela o pretemporada */}
        {!form.escuela && !form.pretemporada && (
          <div style={{ display: "flex", gap: 8 }}>
            {[
              ["meso", "Mesociclo"],
              ["semana", "Semana"],
            ].map(([v, l]) => (
              <button
                key={v}
                onClick={() => {
                  if (v === "semana")
                    setForm((f) => ({
                      ...f,
                      tipo: v,
                      semanas: [
                        {
                          ...mkSemanas()[0],
                          id: mkId(),
                          numero: 1,
                          pct_volumen: 100,
                        },
                      ],
                    }));
                  else
                    setForm((f) => ({ ...f, tipo: v, semanas: mkSemanas() }));
                }}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "'DM Sans'",
                  fontSize: 13,
                  fontWeight: 700,
                  transition: "all .2s",
                  background:
                    form.tipo === v ? "var(--gold)" : "var(--surface2)",
                  color: form.tipo === v ? "#0a0c10" : "var(--muted)",
                }}
              >
                {l}
              </button>
            ))}
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Nombre *</label>
          <input
            name="field_54"
            className="form-input"
            value={form.nombre}
            onChange={(e) => set("nombre", e.target.value)}
            placeholder="Ej: Pretemporada 4 semanas — Fuerza"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Descripción</label>
          <textarea
            name="field_55"
            className="form-input"
            value={form.descripcion}
            onChange={(e) => set("descripcion", e.target.value)}
            rows={2}
            style={{ resize: "vertical" }}
            placeholder="Notas, contexto, para quién es..."
          />
        </div>
        {/* Selector tipo de planilla */}
        <div style={{ display: "flex", gap: 6 }}>
          {[
            { key: "regular", label: "Regular", color: "var(--gold)" },
            { key: "escuela", label: "Escuela Inicial", color: "#4db6ac" },
            { key: "pretemporada", label: "Pretemporada", color: "#ff9800" },
          ].map((opt) => {
            const active =
              opt.key === "escuela"
                ? form.escuela
                : opt.key === "pretemporada"
                  ? form.pretemporada
                  : !form.escuela && !form.pretemporada;
            return (
              <button
                key={opt.key}
                onClick={() => {
                  if (opt.key === "escuela") {
                    setForm((f) => ({
                      ...f,
                      escuela: true,
                      pretemporada: false,
                      tipo: "meso",
                      semanas: mkSemanasBasica(4, f.num_bloques_basica || 3),
                    }));
                  } else if (opt.key === "pretemporada") {
                    setForm((f) => ({
                      ...f,
                      escuela: false,
                      pretemporada: true,
                      tipo: "meso",
                      semanas: mkSemanasPretemp(4, f.num_bloques_basica || 3),
                    }));
                  } else {
                    setForm((f) => ({
                      ...f,
                      escuela: false,
                      pretemporada: false,
                      tipo: "meso",
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
                  fontFamily: "'DM Sans'",
                  transition: "all .15s",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {form.escuela && (
          <div className="form-group">
            <label className="form-label">Nivel de Escuela</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {ESCUELA_NIVELES.map((n) => (
                <button
                  key={n}
                  onClick={() => set("escuela_nivel", n)}
                  style={{
                    padding: "5px 14px",
                    borderRadius: 20,
                    border: "none",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 700,
                    transition: "all .15s",
                    background:
                      form.escuela_nivel === n
                        ? ESCUELA_NIVEL_COLOR[n]
                        : "var(--surface2)",
                    color: form.escuela_nivel === n ? "#fff" : "var(--muted)",
                  }}
                >
                  {ESCUELA_NIVEL_LABEL[n]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Campos estándar — ocultos si es escuela o pretemporada */}
        {!form.escuela && !form.pretemporada && (
          <>
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
                    name="field_56"
                    className="form-select"
                    value={form[k]}
                    onChange={(e) => set(k, e.target.value)}
                  >
                    {opts.map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              <div className="form-group">
                <label className="form-label">Modo</label>
                <select
                  name="field_57"
                  className="form-select"
                  value={form.modo}
                  onChange={(e) => set("modo", e.target.value)}
                >
                  {modoOpts.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {form.tipo === "meso" && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                <div className="form-group">
                  <label className="form-label">Semanas</label>
                  <select
                    name="field_58"
                    className="form-select"
                    value={form.semanas.length}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      const base = mkSemanas();
                      set(
                        "semanas",
                        Array.from({ length: n }, (_, i) => ({
                          ...base[Math.min(i, 3)],
                          id: mkId(),
                          numero: i + 1,
                          pct_volumen:
                            n === 4
                              ? ([26, 35, 23, 16][i] ?? 20)
                              : Math.round(100 / n),
                        })),
                      );
                    }}
                  >
                    {[2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>
                        {n} semanas
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Volumen total (reps)</label>
                  <input
                    name="field_59"
                    className="form-input"
                    type="number"
                    min={100}
                    max={3000}
                    step={50}
                    value={form.volumen_total}
                    onChange={(e) =>
                      set("volumen_total", Number(e.target.value))
                    }
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn btn-gold" onClick={handleSave}>
          Crear plantilla
        </button>
      </div>
    </Modal>
  );
}
