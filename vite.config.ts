import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {copyFile} from 'node:fs/promises';
import path from 'path';
import {VitePWA} from 'vite-plugin-pwa';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/vibe-finance/',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'Vibe Finance',
          short_name: 'Vibe Finance',
          description: 'A personal finance dashboard for tracking balances, transactions, and planned payments.',
          theme_color: '#0d1117',
          background_color: '#0d1117',
          display: 'standalone',
          start_url: '/vibe-finance/',
          scope: '/vibe-finance/',
          icons: [
            {
              src: '/vibe-finance/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/vibe-finance/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/vibe-finance/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
      }),
      {
        name: 'github-pages-spa-fallback',
        apply: 'build',
        closeBundle: async () => {
          const outputDirectory = path.resolve(__dirname, 'dist');
          await copyFile(
            path.join(outputDirectory, 'index.html'),
            path.join(outputDirectory, '404.html'),
          );
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
