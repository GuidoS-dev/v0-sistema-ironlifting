import { hasNormativoInfo } from "../../lib/normativos-info";

// Botón "?" inline. Renderiza null si el ejercicio no tiene descripción ni video.
// `size` y `style` permiten ajustarlo a contextos densos (PDF, cronómetro).
export function NormativoInfoButton({
  ejercicio,
  onClick,
  size = 18,
  title = "Ver descripción / video",
  style = null,
  stopPropagation = true,
}) {
  if (!hasNormativoInfo(ejercicio)) return null;

  const handle = (ev) => {
    if (stopPropagation) ev.stopPropagation();
    onClick?.(ejercicio);
  };

  return (
    <button
      type="button"
      onClick={handle}
      title={title}
      aria-label={title}
      style={{
        flexShrink: 0,
        width: size,
        height: size,
        minWidth: size,
        borderRadius: "50%",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(232,197,71,.15)",
        color: "var(--gold)",
        border: "1px solid rgba(232,197,71,.4)",
        fontSize: Math.max(10, Math.round(size * 0.6)),
        fontWeight: 800,
        cursor: "pointer",
        padding: 0,
        lineHeight: 1,
        ...(style || {}),
      }}
    >
      ?
    </button>
  );
}
