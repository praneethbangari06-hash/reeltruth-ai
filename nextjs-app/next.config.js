const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['images.unsplash.com', 'instagram.com'],
  },
  webpack: (config) => {
    config.resolve.alias['react'] = path.resolve(__dirname, 'node_modules/react');
    config.resolve.alias['react-dom'] = path.resolve(__dirname, 'node_modules/react-dom');
    return config;
  }
}

module.exports = nextConfig
