import { NextRequest } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const ALLOWED_PREFIXES = ["/auth/v1/", "/rest/v1/"];

function sanitizeStringInput(value: string) {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

function sanitizeInput(value: unknown): unknown {
  if (typeof value === "string") return sanitizeStringInput(value);
  if (Array.isArray(value)) return value.map((item) => sanitizeInput(item));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([k, v]) => {
      if (k === "__proto__" || k === "prototype" || k === "constructor") {
        return;
      }
      out[k] = sanitizeInput(v);
    });
    return out;
  }
  return value;
}

function sanitizeRequestBody(body: string, contentType: string | null) {
  const isJson = /application\/json/i.test(contentType || "");
  if (!isJson) {
    return sanitizeStringInput(body);
  }

  const parsed = JSON.parse(body) as unknown;
  return JSON.stringify(sanitizeInput(parsed));
}

function getTargetUrl(path: string) {
  if (!SUPABASE_URL) return null;
  if (!ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix))) return null;
  return `${SUPABASE_URL}${path}`;
}

async function handleProxy(req: NextRequest) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return new Response(
      JSON.stringify({ error: "Supabase is not configured in server env." }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }

  const rawPath = req.nextUrl.searchParams.get("path") || "";
  const path = sanitizeStringInput(rawPath);
  const target = getTargetUrl(path);
  if (!target) {
    return new Response(JSON.stringify({ error: "Invalid Supabase path." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const headers = new Headers();
  headers.set("apikey", SUPABASE_ANON_KEY);

  const contentType = req.headers.get("content-type");
  const prefer = req.headers.get("prefer");
  const accept = req.headers.get("accept");
  const authorization = req.headers.get("authorization");

  if (contentType) headers.set("content-type", contentType);
  if (prefer) headers.set("prefer", prefer);
  if (accept) headers.set("accept", accept);
  if (authorization) headers.set("authorization", authorization);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const hasBody = req.method !== "GET" && req.method !== "HEAD";
    let body: string | undefined;
    if (hasBody) {
      const rawBody = await req.text();
      const contentType = req.headers.get("content-type");
      try {
        body = sanitizeRequestBody(rawBody, contentType);
      } catch {
        return new Response(JSON.stringify({ error: "Invalid request body." }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }
    }

    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body,
      signal: controller.signal,
      cache: "no-store",
    });

    const text = await upstream.text();
    const responseHeaders = new Headers();
    responseHeaders.set(
      "content-type",
      upstream.headers.get("content-type") || "application/json",
    );

    return new Response(text, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    const message =
      (error as Error)?.name === "AbortError"
        ? "Supabase upstream timeout"
        : "Supabase proxy failed";

    return new Response(JSON.stringify({ error: message }), {
      status: 504,
      headers: { "content-type": "application/json" },
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function GET(req: NextRequest) {
  return handleProxy(req);
}

export async function POST(req: NextRequest) {
  return handleProxy(req);
}

export async function PATCH(req: NextRequest) {
  return handleProxy(req);
}

export async function DELETE(req: NextRequest) {
  return handleProxy(req);
}
