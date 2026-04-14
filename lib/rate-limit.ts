import { NextRequest } from "next/server";

type RateLimitWindow = {
  count: number;
  resetAt: number;
};

const windows = new Map<string, RateLimitWindow>();

// Global rate limit across all IPs — safety net against distributed attacks
const GLOBAL_MAX_REQUESTS = 300;
const GLOBAL_WINDOW_MS = 60_000;
let globalWindow: RateLimitWindow = { count: 0, resetAt: Date.now() + GLOBAL_WINDOW_MS };

// Cap map size to prevent memory exhaustion from spoofed IPs
const MAX_BUCKETS = 500;

export type RateLimitConfig = {
  maxRequests: number;
  windowMs: number;
};

function getClientKey(req: NextRequest) {
  // On Vercel, x-real-ip is set by the platform and cannot be spoofed
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;

  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  return "anonymous";
}

function cleanupExpiredWindows(now: number) {
  for (const [key, window] of windows.entries()) {
    if (window.resetAt <= now) {
      windows.delete(key);
    }
  }
}

function checkGlobalLimit(): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  if (globalWindow.resetAt <= now) {
    globalWindow = { count: 1, resetAt: now + GLOBAL_WINDOW_MS };
    return { allowed: true, retryAfter: 0 };
  }
  if (globalWindow.count >= GLOBAL_MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((globalWindow.resetAt - now) / 1000)),
    };
  }
  globalWindow.count += 1;
  return { allowed: true, retryAfter: 0 };
}

export function checkRateLimit(
  req: NextRequest,
  scope: string,
  config: RateLimitConfig,
) {
  // Check global limit first
  const global = checkGlobalLimit();
  if (!global.allowed) {
    return { allowed: false, remaining: 0, retryAfter: global.retryAfter };
  }

  const now = Date.now();
  const clientKey = getClientKey(req);
  const bucketKey = `${scope}:${clientKey}`;

  const current = windows.get(bucketKey);
  if (!current || current.resetAt <= now) {
    // Prevent unbounded map growth
    if (windows.size >= MAX_BUCKETS) {
      cleanupExpiredWindows(now);
    }
    if (windows.size >= MAX_BUCKETS) {
      // Still full — reject to protect memory
      return { allowed: false, remaining: 0, retryAfter: 5 };
    }
    windows.set(bucketKey, {
      count: 1,
      resetAt: now + config.windowMs,
    });
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
