// frontend/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  return {
    plugins: [react()],

    base: '/',

    server: {
      port: 5173,
      host: true,

      // ===== PROXY ONLY WORKS IN DEVELOPMENT =====
      // This is IGNORED in production (Vercel)
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
          // Add this to avoid CORS issues in dev
          rewrite: (path) => path.replace(/^\/api/, '/api')
        }
      }
    },

    build: {
      outDir: 'dist',
      sourcemap: isProduction ? false : true,
      minify: isProduction ? 'terser' : false,
      chunkSizeWarningLimit: 1000,
      emptyOutDir: true,
      // Add this for better production builds
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            socket: ['socket.io-client'],
            ui: ['axios']
          }
        }
      }
    },

    resolve: {
      alias: {
        '@': '/src',
        '@context': '/src/context',
        '@api': '/src/api',
        '@pages': '/src/pages',
        '@components': '/src/components',
        '@utils': '/src/utils'
      }
    },

    // ===== FIX: These define statements are NOT needed =====
    // Vite automatically injects env variables with import.meta.env
    // Remove the define block entirely
    define: {
      // REMOVE THIS - it's causing issues
      // 'import.meta.env.VITE_SOCKET_URL': JSON.stringify(process.env.VITE_SOCKET_URL),
      // 'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL),
    },

    // ===== Add this for better environment handling =====
    envPrefix: 'VITE_'
  };
});