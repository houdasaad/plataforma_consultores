import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const REPO_NAME = 'plataforma_consultores'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8080'

  // When building for GitHub Pages the base path must include the repo name.
  // In dev we don't need this — the Vite proxy handles /api already.
  const isGHpages = env.VITE_GH_PAGES === 'true' || mode === 'gh-pages'

  return {
    plugins: [react()],
    base: isGHpages ? `/${REPO_NAME}/` : '/',
    server: {
      port: Number(env.VITE_DEV_PORT) || 5173,
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
