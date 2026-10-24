/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const api = 'http://localhost:5080'

export default defineConfig({
  // The router plugin must run before React's.
  plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { proxy: { '/api': api, '/health': api } },
  // e2e/ is Playwright's.
  test: { environment: 'node', include: ['src/**/*.test.{ts,tsx}'] },
})
