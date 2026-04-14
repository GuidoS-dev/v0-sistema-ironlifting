import { NextResponse, type NextRequest } from 'next/server'

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

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
