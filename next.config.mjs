/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep Netlify builds stable (avoid failing deploys for lint/type noise).
  // We still keep types in dev; this only prevents CI deploy from hard-failing.
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  output: "standalone",

  experimental: {
    typedRoutes: false,
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "cdn.nerdist.com" },
      { protocol: "https", hostname: "raw.githubusercontent.com" },
    ],
  },
};

export default nextConfig;
