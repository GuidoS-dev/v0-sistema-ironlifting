import { useState } from "react";
import { Modal } from "../common/Modal";

export function EditMesoModal({ meso, onSave, onClose }) {
  const [form, setForm] = useState({
    nombre: meso.nombre || "",
    descripcion: meso.descripcion || "",
    fecha_inicio: meso.fecha_inicio,
    modo: meso.modo,
    irm_arranque: meso.irm_arranque || "",
    irm_envion: meso.irm_envion || "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Modal title="Editar Mesociclo" onClose={onClose}>
      <div className="form-group">
        <label className="form-label">Nombre</label>
        <input
          name="field_38"
          className="form-input"
          value={form.nombre}
          onChange={(e) => set("nombre", e.target.value)}
          placeholder="Ej: Pretemporada 2025"
        />
      </div>
      <div className="form-group">
        <label className="form-label">Descripción / Objetivos</label>
        <textarea
          name="field_39"
          className="form-input"
          value={form.descripcion}
          onChange={(e) => set("descripcion", e.target.value)}
          placeholder="Objetivos del ciclo..."
          rows={2}
          style={{ resize: "vertical" }}
        />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Fecha inicio</label>
          <input
            name="field_40"
            className="form-input"
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
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn btn-gold" onClick={() => onSave(form)}>
          Guardar cambios
        </button>
      </div>
    </Modal>
  );
}
