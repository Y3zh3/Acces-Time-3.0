import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: ['face-api.js', '@tensorflow/tfjs-core', '@tensorflow/tfjs-node'],
  webpack: (config, { isServer }) => {
    // Para todos los builds (cliente y servidor)
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      encoding: false,
      path: false,
      os: false,
      crypto: false,
      stream: false,
      http: false,
      https: false,
      zlib: false,
    };
    
    // Ignorar módulos problemáticos de node-fetch usado por tensorflow
    config.resolve.alias = {
      ...config.resolve.alias,
      'node-fetch': false,
    };

    if (isServer) {
      // Agregar face-api.js como external en servidor
      config.externals = [...(config.externals || []), 'face-api.js', '@tensorflow/tfjs-core'];
    }
    
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
