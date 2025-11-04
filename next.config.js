/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['scontent.cdninstagram.com', 'instagram.com', 'scontent-*.cdninstagram.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.cdninstagram.com',
      },
    ],
  },
}

module.exports = nextConfig
