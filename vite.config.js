// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/' : '/expense-tracker/',
  plugins: [
    react(),
    // VitePWA({
    //   registerType: 'autoUpdate',
    //   manifest: {
    //     id: '/expense-tracker/',
    //     start_url: '/expense-tracker/',
    //     scope: '/expense-tracker/',
    //     name: 'Expense & Paycheck Planner',
    //     short_name: 'Expenses',
    //     theme_color: '#2563eb',
    //     background_color: '#ffffff',
    //     display: 'standalone',
    //     icons: [
    //       { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    //       { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    //       { src: 'icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
    //       { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    //     ]
    //   }
    // })
  ],
  server: {
    hmr: {
      port: 5173,
    },
    strictPort: true,
  }
}))
