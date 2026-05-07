import { useState } from "react";
import { Modal } from "../common/Modal";
import { mkId } from "../../data/constantes";
import { toTitleCase } from "../../lib/sanitize";

export function AtletaForm({
  atleta,
  tipoInicial = "atleta",
  onSave,
  onClose,
  registeredUsers = [],
}) {
  const [form, setForm] = useState(
    atleta || {
      id: mkId(),
      nombre: "",
      email: "",
      telefono: "",
      fecha_nacimiento: "",
      notas: "",
      tipo: tipoInicial,
      genero: "m",
      ciclo: null,
      profile_id: null,
    },
  );
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Modal title={atleta ? "Editar Atleta" : "Nuevo Atleta"} onClose={onClose}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[
          ["atleta", "Atleta"],
          ["asesoria", "Asesoría"],
        ].map(([v, l]) => (
          <button
            key={v}
            onClick={() => set("tipo", v)}
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
                form.tipo === v
                  ? v === "atleta"
                    ? "var(--gold)"
                    : "var(--blue)"
                  : "var(--surface2)",
              color:
                form.tipo === v
                  ? v === "atleta"
                    ? "#0a0c10"
                    : "#fff"
                  : "var(--muted)",
            }}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="form-group">
        <label className="form-label">Nombre completo</label>
        <input
          className="form-input"
          name="nombre"
          value={form.nombre}
          onChange={(e) => set("nombre", e.target.value)}
          placeholder="Ej: Juan Pérez"
        />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            className="form-input"
            name="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            type="email"
            placeholder="atleta@email.com"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Teléfono</label>
          <input
            className="form-input"
            name="telefono"
            value={form.telefono}
            onChange={(e) => set("telefono", e.target.value)}
            placeholder="+54 341..."
          />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Fecha de nacimiento</label>
        <input
          className="form-input"
          name="fecha_nacimiento"
          value={form.fecha_nacimiento}
          onChange={(e) => set("fecha_nacimiento", e.target.value)}
          type="text"
          placeholder="DD/MM/AAAA"
          pattern="\d{2}/\d{2}/\d{4}"
        />
      </div>
      {/* Género */}
      <div className="form-group">
        <label className="form-label">Género</label>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            ["m", "Masculino"],
            ["f", "Femenino"],
          ].map(([v, l]) => (
            <button
              key={v}
              onClick={() => set("genero", v)}
              style={{
                flex: 1,
                padding: "7px 0",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                fontFamily: "'DM Sans'",
                fontSize: 13,
                fontWeight: 700,
                transition: "all .2s",
                background:
                  form.genero === v ? "var(--gold)" : "var(--surface2)",
                color: form.genero === v ? "#0a0c10" : "var(--muted)",
              }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Ciclo menstrual — solo si género femenino */}
      {form.genero === "f" && (
        <div
          style={{
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "12px 14px",
            marginBottom: 14,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--text)",
              marginBottom: 10,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            🌙 Ciclo menstrual
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
          >
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Último inicio</label>
              <input
                className="form-input"
                name="ciclo_ultimo_inicio"
                type="date"
                value={form.ciclo?.ultimo_inicio || ""}
                onChange={(e) =>
                  set("ciclo", { ...form.ciclo, ultimo_inicio: e.target.value })
                }
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Duración ciclo (días)</label>
              <input
                className="form-input"
                name="ciclo_duracion_ciclo"
                type="number"
                min={21}
                max={40}
                value={form.ciclo?.duracion_ciclo || 28}
                onChange={(e) =>
                  set("ciclo", {
                    ...form.ciclo,
                    duracion_ciclo: Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Duración menstruación (días)</label>
              <input
                className="form-input"
                name="ciclo_duracion_mens"
                type="number"
                min={2}
                max={10}
                value={form.ciclo?.duracion_mens || 5}
                onChange={(e) =>
                  set("ciclo", {
                    ...form.ciclo,
                    duracion_mens: Number(e.target.value),
                  })
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* Vincular usuario registrado */}
      <div className="form-group">
        <label className="form-label">Vincular usuario registrado</label>
        <select
          className="form-input"
          value={form.profile_id || ""}
          onChange={(e) => set("profile_id", e.target.value || null)}
          style={{ cursor: "pointer" }}
        >
          <option value="">— Sin vincular —</option>
          {registeredUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nombre || u.email} ({u.email})
            </option>
          ))}
        </select>
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
          Vinculá este atleta con su cuenta de usuario para que pueda ver sus
          mesociclos al iniciar sesión.
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Notas</label>
        <textarea
          className="form-input"
          name="notas"
          value={form.notas}
          onChange={(e) => set("notas", e.target.value)}
          placeholder="Observaciones, lesiones, objetivos..."
          rows={3}
          style={{ resize: "vertical" }}
        />
      </div>
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>
          Cancelar
        </button>
        <button
          className="btn btn-gold"
          onClick={() => {
            if (form.nombre)
              onSave({ ...form, nombre: toTitleCase(form.nombre) });
          }}
        >
          Guardar
        </button>
      </div>
    </Modal>
  );
}
