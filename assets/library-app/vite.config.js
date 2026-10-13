import { defineConfig } from 'vite';

export default defineConfig({
  build: { target: 'es2022', sourcemap: false, rollupOptions: { output: { manualChunks: { math: ['katex'], vendor: ['react', 'react-dom'] } } } },
  server: { proxy: { '/api': 'http://127.0.0.1:4317', '/library-assets': 'http://127.0.0.1:4317' } },
});
