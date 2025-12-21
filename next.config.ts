import analyzer from '@next/bundle-analyzer';
import withSerwistInit from '@serwist/next';
import { codeInspectorPlugin } from 'code-inspector-plugin';
import type { NextConfig } from 'next';
import ReactComponentName from 'react-scan/react-component-name/webpack';

const isProd = process.env.NODE_ENV === 'production';
const buildWithDocker = process.env.DOCKER === 'true';
const isDesktop = process.env.NEXT_PUBLIC_IS_DESKTOP_APP === '1';
const enableReactScan = !!process.env.REACT_SCAN_MONITOR_API_KEY;
const isUsePglite = process.env.NEXT_PUBLIC_CLIENT_DB === 'pglite';
const shouldUseCSP = process.env.ENABLED_CSP === '1';

const isTest =
  process.env.NODE_ENV === 'test' || process.env.TEST === '1' || process.env.E2E === '1';

// if you need to proxy the api endpoint to remote server

const isStandaloneMode = buildWithDocker || isDesktop;

const standaloneConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingIncludes: { '*': ['public/**/*', '.next/static/**/*'] },
};

const assetPrefix = process.env.NEXT_PUBLIC_ASSET_PREFIX;

const nextConfig: NextConfig = {
  ...(isStandaloneMode ? standaloneConfig : {}),
  assetPrefix,
  compiler: {
    emotion: true,
  },
  compress: isProd,
  experimental: {
    optimizePackageImports: [
      'emoji-mart',
      '@emoji-mart/react',
      '@emoji-mart/data',
      '@icons-pack/react-simple-icons',
      '@lobehub/ui',
      '@lobehub/icons',
    ],
    // oidc provider depend on constructor.name
    // but swc minification will remove the name
    // so we need to disable it
    // refs: https://github.com/lobehub/lobe-chat/pull/7430
    serverMinification: false,
    webVitalsAttribution: ['CLS', 'LCP'],
    webpackBuildWorker: true,
    webpackMemoryOptimizations: true,
  },
  async headers() {
    const securityHeaders = [
      {
        key: 'x-robots-tag',
        value: 'all',
      },
    ];

    if (shouldUseCSP) {
      securityHeaders.push(
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'Content-Security-Policy',
          value: "frame-ancestors 'none';",
        },
      );
    }

    return [
      {
        headers: securityHeaders,
        source: '/:path*',
      },
      {
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
        source: '/icons/(.*).(png|jpe?g|gif|svg|ico|webp)',
      },
      {
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'CDN-Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Vercel-CDN-Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
        source: '/images/(.*).(png|jpe?g|gif|svg|ico|webp)',
      },
      {
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'CDN-Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Vercel-CDN-Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
        source: '/videos/(.*).(mp4|webm|ogg|avi|mov|wmv|flv|mkv)',
      },
      {
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'CDN-Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Vercel-CDN-Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
        source: '/screenshots/(.*).(png|jpe?g|gif|svg|ico|webp)',
      },
      {
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'CDN-Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Vercel-CDN-Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
        source: '/og/(.*).(png|jpe?g|gif|svg|ico|webp)',
      },
      {
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'CDN-Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
        source: '/favicon.ico',
      },
      {
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'CDN-Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
        source: '/favicon-32x32.ico',
      },
      {
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'CDN-Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
        source: '/apple-touch-icon.png',
      },
    ];
  },
  logging: {
    fetches: {
      fullUrl: true,
      hmrRefreshes: true,
    },
  },
  reactStrictMode: true,
  redirects: async () => [
    {
      destination: '/sitemap-index.xml',
      permanent: true,
      source: '/sitemap.xml',
    },
    {
      destination: '/sitemap-index.xml',
      permanent: true,
      source: '/sitemap-0.xml',
    },
    {
      destination: '/sitemap/plugins-1.xml',
      permanent: true,
      source: '/sitemap/plugins.xml',
    },
    {
      destination: '/sitemap/assistants-1.xml',
      permanent: true,
      source: '/sitemap/assistants.xml',
    },
    {
      destination: '/manifest.webmanifest',
      permanent: true,
      source: '/manifest.json',
    },
    {
      destination: '/discover/assistant',
      permanent: true,
      source: '/discover/assistants',
    },
    {
      destination: '/discover/plugin',
      permanent: true,
      source: '/discover/plugins',
    },
    {
      destination: '/discover/model',
      permanent: true,
      source: '/discover/models',
    },
    {
      destination: '/discover/provider',
      permanent: true,
      source: '/discover/providers',
    },
    // {
    //   destination: '/settings/common',
    //   permanent: true,
    //   source: '/settings',
    // },
    // {
    //   destination: '/chat',
    //   permanent: false,
    //   source: '/',
    // },
    {
      destination: '/chat',
      permanent: true,
      source: '/welcome',
    },
    // we need back /repos url in the further
    {
      destination: '/files',
      permanent: false,
      source: '/repos',
    },
  ],

  // when external packages in dev mode with turbopack, this config will lead to bundle error
  serverExternalPackages: isProd ? ['@electric-sql/pglite', 'pdfkit'] : ['pdfkit'],

  transpilePackages: ['pdfjs-dist', 'mermaid', 'better-auth-harmony'],
  turbopack: {
    rules: isTest
      ? void 0
      : codeInspectorPlugin({
          bundler: 'turbopack',
          hotKeys: ['altKey'],
        }),
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  webpack(config) {
    config.experiments = {
      asyncWebAssembly: true,
      layers: true,
    };

    // 开启该插件会导致 pglite 的 fs bundler 被改表
    if (enableReactScan && !isUsePglite) {
      config.plugins.push(ReactComponentName({}));
    }

    // to fix shikiji compile error
    // refs: https://github.com/antfu/shikiji/issues/23
    config.module.rules.push({
      resolve: {
        fullySpecified: false,
      },
      test: /\.m?js$/,
      type: 'javascript/auto',
    });

    // https://github.com/pinojs/pino/issues/688#issuecomment-637763276
    config.externals.push('pino-pretty');

    config.resolve.alias.canvas = false;

    // to ignore epub2 compile error
    // refs: https://github.com/lobehub/lobe-chat/discussions/6769
    config.resolve.fallback = {
      ...config.resolve.fallback,
      zipfile: false,
    };

    if (assetPrefix && (assetPrefix.startsWith('http://') || assetPrefix.startsWith('https://'))) {
      // fix the Worker URL cross-origin issue
      // refs: https://github.com/lobehub/lobe-chat/pull/9624
      config.module.rules.push({
        generator: {
          // @see https://webpack.js.org/configuration/module/#rulegeneratorpublicpath
          publicPath: '/_next/',
        },
        test: /worker\.ts$/,
        // @see https://webpack.js.org/guides/asset-modules/
        type: 'asset/resource',
      });
    }

    config.optimization = {
      ...config.optimization,
      // Use deterministic module IDs for better long-term caching
      moduleIds: 'deterministic',

      // 合并运行时代码到 main chunk，减少额外请求
      runtimeChunk: false,

      splitChunks: {
        cacheGroups: {
          // Application common code
          'default': {
            minChunks: 2,
            minSize: 30_000,
            priority: -20,
            reuseExistingChunk: true,
          },

          // Separate framework code (React, React-DOM) for better caching
          'framework': {
            enforce: true,
            name: 'framework',
            priority: 40,
            test: /[/\\]node_modules[/\\](react|react-dom|scheduler)[/\\]/,
          },

          // Common vendor code - split aggressively
          'vendor': {
            maxSize: 2_048_000,
            minChunks: 1,
            minSize: 30_000,
            name: 'vendor-common',
            priority: 10,
            reuseExistingChunk: true,
            test: /[/\\]node_modules[/\\]/,
          },

          // AI/LLM related libraries
          'vendor-ai': {
            enforce: true,
            name: 'vendor-ai',
            priority: 25,
            test: /[/\\]node_modules[/\\](langchain|@langchain|openai|@anthropic-ai)[/\\]/,
          },

          // Database and data libraries
          'vendor-db': {
            enforce: true,
            name: 'vendor-db',
            priority: 20,
            test: /[/\\]node_modules[/\\](drizzle-orm|@electric-sql|pg|postgres|zod)[/\\]/,
          },

          // Form and validation libraries
          'vendor-form': {
            enforce: true,
            name: 'vendor-form',
            priority: 20,
            test: /[/\\]node_modules[/\\](react-hook-form|yup|validator)[/\\]/,
          },

          // i18n and localization
          'vendor-i18n': {
            enforce: true,
            name: 'vendor-i18n',
            priority: 20,
            test: /[/\\]node_modules[/\\](react-i18next|i18next|@formatjs)[/\\]/,
          },

          // Icons
          'vendor-icons': {
            enforce: true,
            name: 'vendor-icons',
            priority: 20,
            test: /[/\\]node_modules[/\\](lucide-react|@lobehub\/icons|@icons-pack)[/\\]/,
          },

          // Code highlighting and rendering
          'vendor-render': {
            enforce: true,
            name: 'vendor-render',
            priority: 25,
            test: /[/\\]node_modules[/\\](shiki|marked|react-markdown|remark|rehype|mdast|unified)[/\\]/,
          },

          // Routing and navigation
          'vendor-router': {
            enforce: true,
            name: 'vendor-router',
            priority: 20,
            test: /[/\\]node_modules[/\\](react-router|react-router-dom|history)[/\\]/,
          },

          // Large UI libraries - split into separate chunks
          'vendor-ui': {
            enforce: true,
            maxSize: 2_048_000,
            name: 'vendor-ui',
            priority: 30,
            test: /[/\\]node_modules[/\\](@lobehub\/ui|antd|@ant-design|antd-style|@emotion|rc-)[/\\]/,
          },

          // Large utility libraries
          'vendor-utils': {
            enforce: true,
            name: 'vendor-utils',
            priority: 25,
            test: /[/\\]node_modules[/\\](lodash-es|dayjs|framer-motion|react-layout-kit|immer|zustand|swr)[/\\]/,
          },
        },
        chunks: 'all',
        maxAsyncRequests: 10,
        maxInitialRequests: 8,
        maxSize: 2_048_000,
        minSize: 40_000,
      },
    };

    return config;
  },
};

const noWrapper = (config: NextConfig) => config;

const withBundleAnalyzer = process.env.ANALYZE === 'true' ? analyzer() : noWrapper;

const withPWA =
  isProd && !isDesktop
    ? withSerwistInit({
        register: false,
        swDest: 'public/sw.js',
        swSrc: 'src/app/sw.ts',
      })
    : noWrapper;

export default withBundleAnalyzer(withPWA(nextConfig as NextConfig));
