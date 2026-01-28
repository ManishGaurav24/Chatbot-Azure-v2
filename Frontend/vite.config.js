import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { config } from 'dotenv'

// Load .env into process.env (only for VITE_ variables)
config()

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  // no define.process.env here!
})
