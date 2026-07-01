import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            '/api/idms-proxy': {
                target: 'https://mobiledev.advanceagro.net/ws/api/idms/authentication/',
                changeOrigin: true,
                secure: false,
                rewrite: (path) => '',
            }
        }
    }
})
