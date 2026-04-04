"use client";

export default function SistemaError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0c10",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 16,
        color: "#e8eaf0",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <h2 style={{ fontSize: 18, fontWeight: 700 }}>Algo salió mal</h2>
      <p
        style={{
          fontSize: 13,
          color: "#6b7590",
          maxWidth: 400,
          textAlign: "center",
        }}
      >
        {error.message || "Ocurrió un error inesperado en el sistema."}
      </p>
      <button
        onClick={reset}
        style={{
          padding: "8px 20px",
          borderRadius: 8,
          border: "none",
          background: "#e8c547",
          color: "#0a0c12",
          fontWeight: 700,
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        Reintentar
      </button>
    </div>
  );
}
