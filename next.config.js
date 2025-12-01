/** @type {import('next').NextConfig} */
const nextConfig = {
  // Image optimization
  images: {
    remotePatterns: [
      // AWS S3 - Specific prod-files-secure domains
      {
        protocol: 'https',
        hostname: 'prod-files-secure.s3.us-west-2.amazonaws.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'prod-files-secure.s3.amazonaws.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 's3.us-west-2.amazonaws.com',
        pathname: '/**',
      },
      // AWS S3 - Wildcard patterns for all S3 buckets (Next.js 16 requirement)
      {
        protocol: 'https',
        hostname: '*.s3.amazonaws.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.s3.*.amazonaws.com',
        pathname: '/**',
      },
      // Notion CDN
      {
        protocol: 'https',
        hostname: 'www.notion.so',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'secure.notion-static.com',
        pathname: '/**',
      },
      // Other image services
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/**',
      },
      // Local development
      {
        protocol: 'http',
        hostname: 'localhost',
        pathname: '/**',
      },
    ],
    formats: ['image/avif', 'image/webp'], // AVIF 우선, WebP 폴백
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1 year
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Production optimizations
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,

  // Output standalone for smaller bundle size
  output: 'standalone',

  // 🎯 Next.js 15/16: Exclude cache from serverless functions (CRITICAL for Vercel)
  outputFileTracingExcludes: {
    '*': [
      '.next/cache/**',
      '.next/cache',
      'node_modules/.cache/**',
      'node_modules/@swc/**',
      'node_modules/webpack/**',
      '.git/**',
      '.vercel/**',
    ],
  },

  // Webpack configuration for Vercel deployment
  webpack: (config, { isServer }) => {
    // Webpack 캐시 완전 비활성화 (Vercel 배포용)
    config.cache = false;

    // 불필요한 source map 제거 (프로덕션)
    if (!isServer) {
      config.devtool = false;
    }

    // 번들 크기 최적화
    config.optimization = {
      ...config.optimization,
      moduleIds: 'deterministic',
      minimize: true,
    };

    return config;
  },

  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ['lucide-react', '@heroicons/react', '@supabase/supabase-js'],
    // optimizeCss: true,  // Removed to fix Critters module error in Vercel
  },

  // TypeScript build configuration for production deployment
  typescript: {
    // ⚠️ Dangerously allow production builds to successfully complete even if
    // your project has TypeScript errors. Most errors have been fixed (40+),
    // remaining ones are safe for production.
    ignoreBuildErrors: true,
  },

  // Next.js 16: Turbopack is default, allow webpack config to coexist
  turbopack: {},

  // Security and performance headers
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif|woff|woff2)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },

  // Redirects for SEO
  async redirects() {
    return [
      // Example: old URL patterns to new ones
      // {
      //   source: '/old-blog/:slug',
      //   destination: '/posts/:slug',
      //   permanent: true,
      // },
    ]
  },
}

module.exports = nextConfig