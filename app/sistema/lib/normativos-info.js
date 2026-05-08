// Helpers para descripción + video por normativo (global por ejercicio).

// Acepta cualquier formato común de URL de Google Drive y devuelve la URL
// embebible (/preview). Devuelve null si no se pudo extraer un fileId.
export function parseDriveUrl(url) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // /file/d/FILE_ID/...
  const m1 = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/);
  if (m1) return `https://drive.google.com/file/d/${m1[1]}/preview`;

  // ?id=FILE_ID o &id=FILE_ID (open?id=, uc?id=, etc)
  const m2 = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (m2) return `https://drive.google.com/file/d/${m2[1]}/preview`;

  return null;
}

export function hasNormativoInfo(ej) {
  if (!ej) return false;
  const desc = (ej.descripcion || "").trim();
  const url = (ej.videoUrl || "").trim();
  return Boolean(desc || url);
}

// Lookup por id en una lista de normativos.
export function findNormativoById(normativos, id) {
  if (!normativos || id == null) return null;
  const target = Number(id);
  if (Number.isNaN(target)) return null;
  return normativos.find((e) => Number(e.id) === target) || null;
}
