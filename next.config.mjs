/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    config.resolve.fallback = { fs: false, net: false, tls: false }
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
}

export default nextConfig
