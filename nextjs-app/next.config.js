/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['images.unsplash.com', 'instagram.com'],
  },
  transpilePackages: ['lucide-react'],
}

module.exports = nextConfig
