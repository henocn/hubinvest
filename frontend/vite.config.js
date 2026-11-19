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
        // Hors ligne, l'application garde aussi ses logos, icônes et la police Sen, pas seulement le HTML, le JS et le CSS.
        globPatterns: ['**/*.{js,css,html,png,svg,ico,webp,woff2,webmanifest}'],
        // Photos et logos des stands envoyés depuis l'administration : gardés au fil de l'affichage, rafraîchis en arrière-plan.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/uploads/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'hubinvest-uploads',
              expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        importScripts: ['push-sw.js'],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
});
