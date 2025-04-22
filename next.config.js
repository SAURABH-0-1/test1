/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,
  // Increase memory limit for processing
  experimental: {
    largePageDataBytes: 128 * 1000, // Set to 128KB
  },
  // Specify webpack config to handle memory issues
  webpack: (config, { isServer }) => {
    // Optimize for memory usage
    config.optimization.minimize = true;
    
    // Add cache for better build performance
    config.cache = {
      type: 'filesystem',
      buildDependencies: {
        config: [__filename],
      },
    };

    // Fix for the "Can't resolve 'fs'" error when using @solana/web3.js
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        assert: false,
        http: false,
        https: false,
        zlib: false,
      };
    }
    
    return config;
  },
  // Transpile @solana packages to fix compatibility issues
  transpilePackages: [
    '@solana/web3.js',
    '@solana/wallet-adapter-react',
    '@solana/wallet-adapter-base',
    '@solana/wallet-adapter-react-ui',
    '@solana/wallet-adapter-wallets'
  ],
  // Optimize for API routes
  serverRuntimeConfig: {
    // Will only be available on the server side
    mySecret: process.env.OPENAI_API_KEY,
  },
  publicRuntimeConfig: {
    // Will be available on both server and client
    staticFolder: '/static',
  },
  // Add any custom headers if needed
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
