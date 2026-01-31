import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    include: ['**/*.test.js', '**/*.test.jsx', '**/*.spec.js', '**/*.spec.jsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '*.config.js',
        '*.config.ts',
        'dist/',
        '.eslintrc.cjs',
      ],
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    server: {
      deps: {
        inline: ['phaser'],
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      phaser: path.resolve(__dirname, './src/test/mocks/phaser3spectorjs.js'),
      phaser3spectorjs: path.resolve(__dirname, './src/test/mocks/phaser3spectorjs.js'),
    },
  },
});
