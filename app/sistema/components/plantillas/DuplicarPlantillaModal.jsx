import { useState, useEffect } from "react";
import { Files } from "lucide-react";
import { Modal } from "../common/Modal";

export function DuplicarPlantillaModal({ plantillas, base, onSave, onClose }) {
  const [selectedId, setSelectedId] = useState(
    base?.id || plantillas[0]?.id || null,
  );
  const [nombre, setNombre] = useState(() => {
    const b = base || plantillas[0];
    return b ? `Copia de ${b.nombre}` : "";
  });
  const [descripcion, setDescripcion] = useState(base?.descripcion || "");
  const [busq, setBusq] = useState("");

  const selected =
    plantillas.find((p) => p.id === selectedId) || plantillas[0] || null;

  // When selected changes update name suggestion (only if user hasn't typed yet)
  const [nameTouched, setNameTouched] = useState(false);
  useEffect(() => {
    if (!nameTouched && selected) setNombre(`Copia de ${selected.nombre}`);
  }, [selectedId]);

  const filtradas = plantillas.filter(
    (p) => !busq || p.nombre.toLowerCase().includes(busq.toLowerCase()),
  );

  const handleSave = () => {
    if (!nombre.trim()) {
      alert("El nombre es obligatorio");
      return;
    }
    if (!selected) {
      alert("Seleccioná una plantilla base");
      return;
    }
    onSave(selected, nombre.trim(), descripcion.trim());
  };

  return (
    <Modal title="Duplicar plantilla" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Nombre */}
        <div className="form-group">
          <label className="form-label">Nombre de la nueva plantilla *</label>
          <input
            name="field_60"
            className="form-input"
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value);
              setNameTouched(true);
            }}
            placeholder="Nombre de la copia..."
          />
        </div>

        <div className="form-group">
          <label className="form-label">Descripción</label>
          <textarea
            name="field_61"
            className="form-input"
            value={descripcion}
            rows={2}
            onChange={(e) => setDescripcion(e.target.value)}
            style={{ resize: "vertical" }}
            placeholder="Contexto, diferencias respecto a la base..."
          />
        </div>

        {/* Selector de base — solo si no viene preseleccionada */}
        {!base && (
          <div className="form-group">
            <label className="form-label">Plantilla base</label>
            <input
              name="field_62"
              className="form-input"
              value={busq}
              onChange={(e) => setBusq(e.target.value)}
              placeholder="Buscar plantilla..."
              style={{ marginBottom: 8 }}
            />
            <div
              style={{
                maxHeight: 220,
                overflowY: "auto",
                border: "1px solid var(--border)",
                borderRadius: 8,
                background: "var(--surface2)",
              }}
            >
              {filtradas.length === 0 ? (
                <div
                  style={{
                    padding: 16,
                    textAlign: "center",
                    color: "var(--muted)",
                    fontSize: 12,
                  }}
                >
                  Sin resultados
                </div>
              ) : (
                filtradas.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    style={{
                      padding: "10px 14px",
                      cursor: "pointer",
                      borderBottom: "1px solid var(--border)",
                      background:
                        selectedId === p.id
                          ? "rgba(232,197,71,.12)"
                          : "transparent",
                      borderLeft:
                        selectedId === p.id
                          ? "3px solid var(--gold)"
                          : "3px solid transparent",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--text)",
                      }}
                    >
                      {p.nombre}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--muted)",
                        marginTop: 2,
                      }}
                    >
                      {p.semanas?.length || 0} sem ·{" "}
                      {(p.semanas || []).reduce(
                        (a, s) =>
                          a +
                          s.turnos.reduce(
                            (b, t) =>
                              b +
                              t.ejercicios.filter((e) => e.ejercicio_id).length,
                            0,
                          ),
                        0,
                      )}{" "}
                      ejs
                      {p.escuela && ` · EI N${p.escuela_nivel}`}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Preview de la base si está preseleccionada */}
        {base && (
          <div
            style={{
              padding: "10px 14px",
              background: "var(--surface2)",
              borderRadius: 8,
              border: "1px solid var(--border)",
              borderLeft: "3px solid var(--gold)",
            }}
          >
            <div
              style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2 }}
            >
              Base:
            </div>
            <div
              style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}
            >
              {base.nombre}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
              {base.semanas?.length || 0} semanas ·{" "}
              {(base.semanas || []).reduce(
                (a, s) =>
                  a +
                  s.turnos.reduce(
                    (b, t) =>
                      b + t.ejercicios.filter((e) => e.ejercicio_id).length,
                    0,
                  ),
                0,
              )}{" "}
              ejercicios
            </div>
          </div>
        )}
      </div>
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn btn-gold" onClick={handleSave}>
          <Files size={14} /> Crear copia
        </button>
      </div>
    </Modal>
  );
}
