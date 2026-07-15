import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  // eslint-disable-next-line no-undef
  base: process.env.GITHUB_PAGES === 'true' ? '/company-sim/' : '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split heavy, rarely-changing vendors into their own chunks so app
        // code stays small and vendors cache independently across deploys.
        manualChunks: {
          phaser: ['phaser'],
          'vendor-react': ['react', 'react-dom'],
        },
      },
    },
    // Phaser is a large but essential engine living in its own async chunk, so
    // the size warning would only ever flag Phaser itself. Raise the limit past
    // it while keeping real app-code regressions visible.
    chunkSizeWarningLimit: 1600,
  },
});
