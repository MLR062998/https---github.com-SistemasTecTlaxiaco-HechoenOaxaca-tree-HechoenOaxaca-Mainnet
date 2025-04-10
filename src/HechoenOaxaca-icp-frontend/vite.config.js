import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import environment from 'vite-plugin-environment';
import { join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  root: __dirname, // <- ESTA ES LA CLAVE
  plugins: [
    react(),
    environment({
      CANISTER_ID_HECHOENOAXACA_ICP_BACKEND: process.env.CANISTER_ID_HECHOENOAXACA_ICP_BACKEND || '',
      CANISTER_ID_HECHOENOAXACA_ICP_FRONTEND: process.env.CANISTER_ID_HECHOENOAXACA_ICP_FRONTEND || '',
      CANISTER_ID_INTERNET_IDENTITY: process.env.CANISTER_ID_INTERNET_IDENTITY || '',
      DFX_NETWORK: process.env.DFX_NETWORK || '',
      DFX_VERSION: process.env.DFX_VERSION || ''
    }),
  ],
  optimizeDeps: {
    include: [
      '@connect2ic/core',
      '@connect2ic/react',
      '@dfinity/agent',
      '@dfinity/auth-client',
      '@nfid/identitykit'
    ],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  build: {
    emptyOutDir: true,
    commonjsOptions: {
      transformMixedEsModules: true,
      include: [/node_modules/],
    },
    rollupOptions: {
      external: [],
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('@connect2ic')) return 'connect2ic';
            if (id.includes('@dfinity')) return 'dfinity';
            if (id.includes('react')) return 'react';
            return 'vendor';
          }
        }
      }
    },
  },
  resolve: {
    alias: {
      '@connect2ic/core': join(__dirname, 'node_modules/@connect2ic/core'),
      'declarations': join(__dirname, '../declarations'),
      '@dfinity/principal': join(__dirname, 'node_modules/@dfinity/principal/lib/cjs/index.js'),
    },
  },
});
