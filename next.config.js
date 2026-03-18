/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ['recharts', 'lucide-react', '@radix-ui/react-dialog'],
  },
}
module.exports = nextConfig
