import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { sentryVitePlugin } from '@sentry/vite-plugin'

// Sentry só envia sourcemaps quando o token de build está presente (Vercel/CI).
// Sem SENTRY_AUTH_TOKEN o plugin fica de fora — build local/preview não quebra.
const sentryToken = process.env.SENTRY_AUTH_TOKEN

export default defineConfig({
  // Sourcemaps só quando há token: o plugin faz upload p/ o Sentry e apaga os
  // .map (filesToDeleteAfterUpload) — nunca ficam públicos. Sem token, não gera.
  build: { sourcemap: !!sentryToken },
  plugins: [
    react(),
    ...(sentryToken
      ? [
          sentryVitePlugin({
            org: 'nexvel',
            project: 'nexvel-frontend',
            authToken: sentryToken,
            sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
