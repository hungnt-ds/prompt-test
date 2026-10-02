import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

const API_TARGET = process.env.API_TARGET || 'https://vocab-api.nguyentanhung2003.workers.dev'

export default defineConfig({
  base: '/prompt-test/',
  server: {
    // Dev proxy same-origin /api → vocab-api production (không phải bật Worker local).
    // Muốn dùng Worker local: API_TARGET=http://localhost:8787 npm run dev
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true },
      '/health': { target: API_TARGET, changeOrigin: true },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Prompt · IPA — Học tiếng Anh',
        short_name: 'Prompt IPA',
        description: 'Học phát âm IPA, từ vựng và bài tập tiếng Anh (vocab-api)',
        lang: 'vi',
        theme_color: '#0b1120',
        background_color: '#0b1120',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell (JS/CSS/HTML/icons) is precached → the app opens offline.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Handler push + notificationclick (nhắc ôn tập) nạp vào sw.js.
        importScripts: ['push-sw.js'],
        runtimeCaching: [
          {
            // vocab-api GETs (any origin — base URL is user-configurable):
            // network first, fall back to the last good response when offline.
            urlPattern: ({ url, request }) =>
              request.method === 'GET' && url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'vocab-api',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
