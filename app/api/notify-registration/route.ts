import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { checkRateLimit } from "@/lib/rate-limit";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const NOTIFY_EMAIL = "guido.tpc@gmail.com";

export async function POST(request: NextRequest) {
  const rateLimitResponse = checkRateLimit(request, {
    maxRequests: 5,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  if (!RESEND_API_KEY) {
    return NextResponse.json(
      { error: "Email service not configured" },
      { status: 500 },
    );
  }

  let body: { email?: string; nombre?: string; tipo?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, nombre, tipo } = body;
  if (!email || !tipo) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  const resend = new Resend(RESEND_API_KEY);

  const tipoLabel = tipo === "coach" ? "Coach" : "Atleta";
  const now = new Date().toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
  });

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
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${tipoLabel}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Nombre</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${nombre || "No proporcionado"}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Email</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold;">Fecha</td>
              <td style="padding: 8px;">${now}</td>
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
