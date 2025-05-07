// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

// Cargar .env principal
dotenv.config({ path: '../../.env' });

// Cargar todas las env vars necesarias explícitamente
const defineEnv = {};
for (const k in process.env) {
  if (k.startsWith("CANISTER_ID_") || k.endsWith("_CANISTER_ID") || k === "DFX_NETWORK") {
    defineEnv[`process.env.${k}`] = JSON.stringify(process.env[k]);
  }
}

export default defineConfig({
  root: path.resolve(__dirname, 'src'),
  base: './',
  publicDir: path.resolve(__dirname, 'public'),
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      declarations: path.resolve(__dirname, '../declarations'),
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    target: 'es2020',
    rollupOptions: {
      input: path.resolve(__dirname, 'src/index.html'),
      output: {
        entryFileNames: 'assets/index.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
  define: defineEnv,
});
