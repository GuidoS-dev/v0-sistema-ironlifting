import { useState } from "react";
import { Modal } from "../common/Modal";
import { parseDriveUrl } from "../../lib/normativos-info";

export function EditNormativoInfoModal({ ejercicio, onSave, onClose }) {
  const [descripcion, setDescripcion] = useState(ejercicio?.descripcion || "");
  const [videoUrl, setVideoUrl] = useState(ejercicio?.videoUrl || "");
  const [error, setError] = useState("");

  const trimmedUrl = videoUrl.trim();
  const previewUrl = trimmedUrl ? parseDriveUrl(trimmedUrl) : null;
  const urlInvalid = trimmedUrl && !previewUrl;

  const handleSave = () => {
    if (urlInvalid) {
      setError(
        "El link no es un URL de Google Drive válido. Pegá el link de compartir.",
      );
      return;
    }
    onSave({
      descripcion: descripcion.trim(),
      videoUrl: trimmedUrl,
    });
  };

  return (
    <Modal
      title={`Info — ${ejercicio?.nombre || "Ejercicio"}`}
      onClose={onClose}
      maxWidth="600px"
    >
      <div className="form-group">
        <label className="form-label">Descripción</label>
        <textarea
          className="form-input"
          rows={5}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Explicación del ejercicio, técnica, puntos clave..."
          style={{ resize: "vertical", fontFamily: "inherit" }}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Link de Google Drive (video)</label>
        <input
          className="form-input"
          type="url"
          value={videoUrl}
          onChange={(e) => {
            setVideoUrl(e.target.value);
            setError("");
          }}
          placeholder="https://drive.google.com/file/d/..."
        />
        <div
          style={{
            fontSize: 11,
            color: "var(--muted)",
            marginTop: 4,
          }}
        >
          Pegá el link de "compartir". El archivo debe tener permiso "cualquiera
          con el link puede ver".
        </div>
      </div>

      {previewUrl && (
        <div
          style={{
            marginTop: 8,
            position: "relative",
            width: "100%",
            maxWidth: 320,
            margin: "8px auto 0",
            paddingBottom: "min(177.78%, 568px)",
            height: 0,
            overflow: "hidden",
            borderRadius: 8,
            background: "#000",
            border: "1px solid var(--border)",
          }}
        >
          <iframe
            src={previewUrl}
            title="Vista previa del video"
            allow="autoplay"
            allowFullScreen
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              border: 0,
            }}
          />
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: 12,
            padding: "8px 12px",
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

      <div className="modal-footer" style={{ marginTop: 16 }}>
        <button className="btn btn-ghost" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn btn-gold" onClick={handleSave}>
          Guardar
        </button>
      </div>
    </Modal>
  );
}
