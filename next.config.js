/** @type {import('next').NextConfig} */
const nextConfig = {
  // Browser sourcemaps in production to diagnose client-side exceptions on Netlify
  productionBrowserSourceMaps: true,

  // Netlify builds: ignore ESLint during build (lint in dev/CI separately)
  eslint: { ignoreDuringBuilds: true },

  output: "standalone",

  experimental: {
    typedRoutes: false,
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "cdn.nerdist.com" },
      { protocol: "https", hostname: "raw.githubusercontent.com" },
      { protocol: "https", hostname: "codexarcana.org" },
      { protocol: "https", hostname: "www.gmbinder.com" },
      { protocol: "https", hostname: "media.tycsports.com" },
      { protocol: "https", hostname: "static0.dualshockersimages.com" },
      { protocol: "https", hostname: "www.tribality.com" },
    ],
  },
};

export default nextConfig;
