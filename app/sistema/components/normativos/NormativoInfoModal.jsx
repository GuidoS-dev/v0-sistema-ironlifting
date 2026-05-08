import { Modal } from "../common/Modal";
import { parseDriveUrl } from "../../lib/normativos-info";

export function NormativoInfoModal({ ejercicio, onClose }) {
  if (!ejercicio) return null;
  const descripcion = (ejercicio.descripcion || "").trim();
  const rawUrl = (ejercicio.videoUrl || "").trim();
  const embedUrl = rawUrl ? parseDriveUrl(rawUrl) : null;
  const title = ejercicio.nombre || `Ejercicio #${ejercicio.id}`;

  return (
    <Modal title={title} onClose={onClose} maxWidth="640px">
      {descripcion && (
        <div
          style={{
            whiteSpace: "pre-wrap",
            fontSize: 13,
            lineHeight: 1.5,
            color: "var(--text)",
            marginBottom: embedUrl || rawUrl ? 16 : 0,
          }}
        >
          {descripcion}
        </div>
      )}

      {!descripcion && !rawUrl && (
        <div
          style={{
            fontSize: 13,
            color: "var(--muted)",
            fontStyle: "italic",
          }}
        >
          Sin información cargada.
        </div>
      )}

      {embedUrl && (
        <div
          style={{
            position: "relative",
            width: "100%",
            maxWidth: 320,
            margin: "0 auto",
            paddingBottom: "min(177.78%, 568px)",
            height: 0,
            overflow: "hidden",
            borderRadius: 8,
            background: "#000",
            border: "1px solid var(--border)",
          }}
        >
          <iframe
            src={embedUrl}
            allow="autoplay"
            allowFullScreen
            title={`Video — ${title}`}
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

      {!embedUrl && rawUrl && (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            background: "rgba(232,71,71,.08)",
            border: "1px solid rgba(232,71,71,.25)",
            fontSize: 12,
            color: "var(--red)",
          }}
        >
          ⚠ El link del video no es un URL de Google Drive válido.{" "}
          <a
            href={rawUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--gold)", textDecoration: "underline" }}
          >
            Abrir en pestaña nueva
          </a>
        </div>
      )}
    </Modal>
  );
}
