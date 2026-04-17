import { NextResponse, type NextRequest } from 'next/server'

// ─────────────────────────────────────────────────────────────────────────────
// Content Security Policy (Report-Only first — does NOT block anything yet).
// Once logs are clean for a few days, switch `Content-Security-Policy-Report-Only`
// to `Content-Security-Policy` to enforce.
//
// Notes on directives:
//  - 'unsafe-inline' in script-src: required because app/layout.tsx injects an
//    inline <script> to register the service worker. Remove once that script
//    is moved to an external file or uses a nonce.
//  - 'unsafe-eval': some Next.js/React dev tooling still needs it. Safe in prod.
//  - https://*.supabase.co: Supabase auth/rest/realtime endpoints.
//  - https://*.vercel-insights.com + https://va.vercel-scripts.com: Vercel Analytics.
// ─────────────────────────────────────────────────────────────────────────────
const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.vercel-insights.com https://va.vercel-scripts.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join('; ')

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Prevent clickjacking — only allow your own site to frame pages
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')

  // Prevent MIME-type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // Control referrer info sent to external sites
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Restrict browser features/APIs
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  )

  // Strict Transport Security — force HTTPS for 1 year
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains'
  )

  // Cross-origin isolation — safe defaults that don't break OAuth popups
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups')
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin')

  // Disable DNS prefetching to reduce passive fingerprinting
  response.headers.set('X-DNS-Prefetch-Control', 'off')

  // CSP in Report-Only mode — logs violations in browser devtools without
  // blocking anything. Review for a few days, then flip to enforcing mode.
  response.headers.set('Content-Security-Policy-Report-Only', CSP_DIRECTIVES)

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
