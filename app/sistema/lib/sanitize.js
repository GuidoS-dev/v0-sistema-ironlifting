export function toTitleCase(str) {
  if (typeof str !== "string") return str;
  return str.toLowerCase().replace(/(?:^|\s)\S/g, (c) => c.toUpperCase());
}

export function sanitizeStringInput(value) {
  if (typeof value !== "string") return value;
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

export function sanitizeInput(value) {
  if (typeof value === "string") return sanitizeStringInput(value);
  if (Array.isArray(value)) return value.map(sanitizeInput);
  if (value && typeof value === "object") {
    const out = {};
    Object.entries(value).forEach(([k, v]) => {
      // Avoid prototype-pollution style keys in untrusted payloads.
      if (k === "__proto__" || k === "prototype" || k === "constructor") {
        return;
      }
      out[k] = sanitizeInput(v);
    });
    return out;
  }
  return value;
}

export function sanitizeRequestBody(body, contentType) {
  if (typeof body !== "string") return body;

  const isJson = /application\/json/i.test(contentType || "");
  if (!isJson) {
    return sanitizeStringInput(body);
  }

  try {
    const parsed = JSON.parse(body);
    return JSON.stringify(sanitizeInput(parsed));
  } catch {
    return sanitizeStringInput(body);
  }
}
