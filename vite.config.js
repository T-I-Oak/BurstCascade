import { defineConfig } from 'vite';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// package.json からバージョンを取得
const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8'));

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';

  return {
    base: '/BurstCascade/',
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    server: {
      fs: {
        allow: ['..'],
      },
    },
    build: {
      target: 'esnext',
      cssTarget: 'chrome100',
      cssMinify: false,
      assetsInlineLimit: 0,
      rollupOptions: {
        external: [
          /^https:\/\/t-i-oak\.github\.io\/GameWorksOAK\//,
        ],
        output: {
          assetFileNames: 'assets/[name]-[hash].[ext]',
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
        },
      },
    },
    resolve: {
      alias: isDev ? {
        'https://t-i-oak.github.io/GameWorksOAK/lib': resolve(__dirname, '../GameWorksOAK/src/lib'),
      } : {},
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./tests/vitest.setup.js'],
    },
  };
});
