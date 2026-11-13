import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png', 'pwa-192.png', 'badge-96.png'],
      manifest: {
        name: 'Hub de l’Investissement',
        short_name: 'HubInvest',
        description: 'Les stands et les contacts du Hub de l’Investissement',
        theme_color: '#156C53',
        background_color: '#FFFFFF',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//, /^\/sitemap\.xml$/, /^\/robots\.txt$/],
        cleanupOutdatedCaches: true,
        importScripts: ['push-sw.js'],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
});
