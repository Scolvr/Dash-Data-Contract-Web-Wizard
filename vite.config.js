import { defineConfig } from 'vite';
import { resolve } from 'path';
import { VitePWA } from 'vite-plugin-pwa';
import viteCompression from 'vite-plugin-compression';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html'
      },
      output: {
        // Support top-level await and modern features
        format: 'es',
        // Manual chunks for code splitting
        manualChunks: (id) => {
          // Group node_modules into vendor chunk
          if (id.includes('node_modules')) {
            return 'vendor';
          }

          // Group web-vitals separately
          if (id.includes('web-vitals')) {
            return 'web-vitals';
          }

          // Group features by folder
          if (id.includes('/features/naming/')) {
            return 'naming';
          }
          if (id.includes('/features/permissions/')) {
            return 'permissions';
          }
          if (id.includes('/features/distribution/')) {
            return 'distribution';
          }
          if (id.includes('/features/advanced/')) {
            return 'advanced';
          }
          if (id.includes('/features/registration/')) {
            return 'registration';
          }
          if (id.includes('/features/templates/')) {
            return 'templates';
          }
          if (id.includes('/features/documents/')) {
            return 'documents';
          }
          if (id.includes('/features/groups/')) {
            return 'groups';
          }

          // Group core utilities
          if (id.includes('/core/')) {
            return 'core';
          }

          // Group UI components
          if (id.includes('/ui/header/')) {
            return 'header';
          }
          if (id.includes('/ui/sidebar/')) {
            return 'sidebar';
          }
          if (id.includes('/ui/')) {
            return 'ui';
          }

          // Contract generation
          if (id.includes('/contract/')) {
            return 'contract';
          }
        }
      },
      // Mark external dependencies that shouldn't be bundled
      external: [
        /^app\.js/
      ]
    },
    // Production optimizations
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      },
      format: {
        comments: false // Remove comments
      }
    },
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Disable source maps in production (enable in dev)
    sourcemap: process.env.NODE_ENV !== 'production',
    // Use esnext target to support top-level await
    target: 'esnext',
    // Clear output directory before building
    emptyOutDir: true,
    // Copy app.js to dist as-is
    copyPublicDir: true,
    // Chunk size warning limit
    chunkSizeWarningLimit: 500
  },
  server: {
    port: 5173,
    open: false,
    // Enable CORS for local development
    cors: true
  },
  preview: {
    port: 5173
  },
  // Path aliases for cleaner imports
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@features': resolve(__dirname, './src/features'),
      '@core': resolve(__dirname, './src/core'),
      '@ui': resolve(__dirname, './src/ui'),
      '@utils': resolve(__dirname, './src/utils'),
      '@integrations': resolve(__dirname, './src/integrations')
    }
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['web-vitals'],
  },
  // Enable CSS code splitting
  css: {
    devSourcemap: true
  },
  // Plugins
  plugins: [
    // PWA Support
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'Dash Token Wizard',
        short_name: 'Token Wizard',
        description: 'Create custom tokens on Dash Platform',
        theme_color: '#0E76FD',
        background_color: '#1a1a1a',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cdn-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.dash\.org\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'dash-api-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              networkTimeoutSeconds: 10
            }
          }
        ],
        skipWaiting: true,
        clientsClaim: true
      },
      devOptions: {
        enabled: false // Disable during development
      }
    }),

    // Gzip compression
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024, // Only compress files larger than 1KB
      deleteOriginFile: false
    }),

    // Brotli compression
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024,
      deleteOriginFile: false
    }),

    // Bundle analyzer (generates stats.html)
    visualizer({
      filename: './dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true
    })
  ],
  // Vitest test configuration
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.js',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/tests/',
        'dist/',
        '**/*.d.ts',
        '**/*.test.js',
        '**/*.spec.js',
        'vite.config.js',
        'playwright.config.ts',
        'app.js',
        'server.js'
      ],
      all: true,
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80
    },
    include: ['src/**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules', 'dist', '.git', '.cache'],
    testTimeout: 10000,
    hookTimeout: 10000
  }
});
