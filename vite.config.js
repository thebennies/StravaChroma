import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
  worker: {
    format: 'es',
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  base: '/StravaChroma/',
  server: {
    historyApiFallback: true,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
});
