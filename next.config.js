/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['mongoose'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        tls: false,
        net: false,
        dns: false,
        fs: false,
        crypto: false,
      };
    }
    return config;
  },
};