import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { checkRateLimit } from "@/lib/rate-limit";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const NOTIFY_EMAIL = "guido.tpc@gmail.com";

// RFC 5321: local-part 64 + @ + domain 255. Keep a conservative cap.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const MAX_NAME_LENGTH = 120;
const ALLOWED_TIPOS = new Set(["coach", "atleta"]);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(request, "notify-registration", {
    maxRequests: 5,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } },
    );
  }

  if (!RESEND_API_KEY) {
    return NextResponse.json(
      { error: "Email service not configured" },
      { status: 500 },
    );
  }

  let body: { email?: unknown; nombre?: unknown; tipo?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const nombreRaw = typeof body.nombre === "string" ? body.nombre.trim() : "";
  const tipo = typeof body.tipo === "string" ? body.tipo.trim() : "";

  if (!email || !tipo) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  if (email.length > MAX_EMAIL_LENGTH || !EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  if (!ALLOWED_TIPOS.has(tipo)) {
    return NextResponse.json({ error: "Invalid tipo" }, { status: 400 });
  }

  const nombre = nombreRaw.slice(0, MAX_NAME_LENGTH);

  const resend = new Resend(RESEND_API_KEY);

  const tipoLabel = tipo === "coach" ? "Coach" : "Atleta";
  const now = new Date().toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
  });

  // Escape all user-controlled values before embedding in HTML to prevent
  // HTML/email injection via malicious names or email addresses.
  const safeTipoLabel = escapeHtml(tipoLabel);
  const safeNombre = escapeHtml(nombre || "No proporcionado");
  const safeEmail = escapeHtml(email);
  const safeNow = escapeHtml(now);

  try {
    await resend.emails.send({
      from: "Ironlifting <onboarding@resend.dev>",
      to: NOTIFY_EMAIL,
      subject: `Nuevo registro: ${tipoLabel} - ${nombre || email}`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px;">
          <h2 style="color: #1a1a1a;">Nuevo registro en Ironlifting</h2>
          <table style="border-collapse: collapse; width: 100%;">
            <tr>
              <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Tipo</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${safeTipoLabel}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Nombre</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${safeNombre}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Email</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${safeEmail}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold;">Fecha</td>
              <td style="padding: 8px;">${safeNow}</td>
            </tr>
          </table>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to send registration notification:", err);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 },
    );
  }
}
