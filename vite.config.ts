import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // '/' locally and on a custom domain; '/<repo>/' on a GitHub project page
  // (set by the deploy workflow via configure-pages).
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
})
