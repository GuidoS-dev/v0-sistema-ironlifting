import { NextRequest } from "next/server";

type RateLimitWindow = {
  count: number;
  resetAt: number;
};

const windows = new Map<string, RateLimitWindow>();

export type RateLimitConfig = {
  maxRequests: number;
  windowMs: number;
};

function getClientKey(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;

  return "anonymous";
}

function cleanupExpiredWindows(now: number) {
  for (const [key, window] of windows.entries()) {
    if (window.resetAt <= now) {
      windows.delete(key);
    }
  }
}

export function checkRateLimit(
  req: NextRequest,
  scope: string,
  config: RateLimitConfig,
) {
  const now = Date.now();
  const clientKey = getClientKey(req);
  const bucketKey = `${scope}:${clientKey}`;

  const current = windows.get(bucketKey);
  if (!current || current.resetAt <= now) {
    windows.set(bucketKey, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    cleanupExpiredWindows(now);
    return { allowed: true, remaining: config.maxRequests - 1, retryAfter: 0 };
  }

  if (current.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  windows.set(bucketKey, current);
  return {
    allowed: true,
    remaining: Math.max(0, config.maxRequests - current.count),
    retryAfter: 0,
  };
}