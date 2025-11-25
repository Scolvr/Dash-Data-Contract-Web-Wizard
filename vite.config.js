import { defineConfig } from 'vite';
import { resolve } from 'path';

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
        format: 'es'
      },
      // Mark external dependencies that shouldn't be bundled
      external: [
        /^\.\/dist\/evo-sdk\.module\.js$/,
        /^app\.js/
      ]
    },
    // Generate sourcemaps for debugging
    sourcemap: true,
    // Use esnext target to support top-level await
    target: 'esnext',
    // Clear output directory before building
    emptyOutDir: true,
    // Copy app.js to dist as-is
    copyPublicDir: true
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
    include: []
  },
  // Enable CSS code splitting
  css: {
    devSourcemap: true
  }
});
