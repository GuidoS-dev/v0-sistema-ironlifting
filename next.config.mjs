/** @type {import('next').NextConfig} */
const nextConfig = {
  // Do not disclose Next.js in the `x-powered-by` response header
  poweredByHeader: false,
  // Surface React issues early (double-invokes effects in dev only, no prod impact)
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
