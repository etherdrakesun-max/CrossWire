/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    config.resolve.fallback = { fs: false, net: false, tls: false }
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': false,
      'react-native': false
    }
    config.externals.push('pino-pretty', 'lokijs', 'encoding')

    // Ignore Hardhat and deployment scripts from Next.js build
    config.module.rules.push({
      test: /\.cjs$/,
      include: /scripts/,
      use: 'ignore-loader',
    })

    return config
  },
  // Exclude contracts and scripts from the build
  excludeDefaultMomentLocales: true,
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
  async redirects() {
    return [
      // AI Workspace becomes the default entry point for logged-in users
      // Landing page (/) remains the marketing page
    ]
  },
}

export default nextConfig
