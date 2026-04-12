"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Auto-reload on ChunkLoadError (stale deployment cache)
    if (
      error?.name === "ChunkLoadError" ||
      error?.message?.includes("ChunkLoadError") ||
      error?.message?.includes("Failed to load chunk") ||
      error?.message?.includes("Loading chunk")
    ) {
      window.location.reload();
    }
  }, [error]);

  return (
    <html lang="es">
      <body
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
          margin: 0,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Error crítico</h2>
        <p
          style={{
            fontSize: 13,
            color: "#6b7590",
            maxWidth: 400,
            textAlign: "center",
          }}
        >
          {error.message || "Ocurrió un error inesperado."}
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
      </body>
    </html>
  );
}
