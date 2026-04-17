import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  plugins: [tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  worker: {
    format: 'es',
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  base: process.env.GITHUB_ACTIONS ? '/StravaChroma/' : '/',
  server: {
    host: true,
    port: 5173,
    historyApiFallback: true,
  },
  preview: {
    host: true,
    port: 4173,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
});
