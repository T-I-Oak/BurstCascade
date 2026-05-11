import { defineConfig } from 'vite';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// package.json からバージョンを取得
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    target: 'esnext',
    cssTarget: 'chrome100',
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name].[ext]',
        chunkFileNames: 'assets/[name].[hash].js',
        entryFileNames: 'assets/[name].[hash].js',
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./burst_cascade/tests/vitest.setup.js'],
  },
});
