import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    // Next 16: qualities além de 75 precisam ser declaradas
    qualities: [75, 90, 95],
    // Permite otimizar imagens servidas pelo backend local em dev
    dangerouslyAllowLocalIP: process.env.NODE_ENV === 'development',
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '3001', pathname: '/uploads/**' },
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default nextConfig;
