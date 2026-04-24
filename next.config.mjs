/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ESLint mag niet de build blokkeren; lint apart via `npm run lint`
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  experimental: {
    serverComponentsExternalPackages: [
      "pdf-parse",
      "playwright",
      "@react-pdf/renderer",
    ],
  },
};

export default nextConfig;
