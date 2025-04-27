import patchRollupPlugin from './vite-plugin-force-native-cjs.js';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import environment from 'vite-plugin-environment';
import { join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  root: __dirname,
  plugins: [
    patchRollupPlugin(),
    react(),
    environment({
      CANISTER_ID_HECHOENOAXACA_ICP_BACKEND: process.env.CANISTER_ID_HECHOENOAXACA_ICP_BACKEND || '',
      CANISTER_ID_HECHOENOAXACA_ICP_FRONTEND: process.env.CANISTER_ID_HECHOENOAXACA_ICP_FRONTEND || '',
      DFX_NETWORK: process.env.DFX_NETWORK || '',
    }),
  ],
  optimizeDeps: {
    include: [
      '@connect2ic/core',
      '@connect2ic/react',
      '@dfinity/agent',
      '@dfinity/auth-client',
      '@dfinity/candid',
      '@dfinity/identity'
    ],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
      target: 'es2020'
    },
  },
  build: {
    target: 'es2020',
    emptyOutDir: true,
    commonjsOptions: {
      transformMixedEsModules: true,
      include: [/node_modules/],
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('@connect2ic')) return 'connect2ic';
            if (id.includes('@dfinity')) return 'dfinity';
            if (id.includes('react')) return 'react';
            return 'vendor';
          }
        }
      },
      treeshake: {
        moduleSideEffects: (id) => {
          if (id.includes('@dfinity/candid') || id.includes('@dfinity/agent')) {
            return true; // NO hacer tree-shake
          }
          return false;
        }
      }
    },
  },
  resolve: {
    alias: {
      'buffer': 'buffer/',
      'stream': 'stream-browserify',
      'rollup/dist/es/shared/parseAst.js': join(__dirname, '../../node_modules/rollup/dist/es/shared/parseAst.js'),
      'rollup/dist/es/shared/parseAst': join(__dirname, '../../node_modules/rollup/dist/es/shared/parseAst.js'),
      '../../native.js': join(__dirname, '../../node_modules/rollup/dist/native.cjs'),
      'native.js': join(__dirname, '../../node_modules/rollup/dist/native.cjs'),
      'rollup/dist/native.js': join(__dirname, '../../node_modules/rollup/dist/native.cjs'),
      'declarations': join(__dirname, '../declarations'),
      '@connect2ic/core': join(__dirname, '../../node_modules/@connect2ic/core'),
      '@connect2ic/react': join(__dirname, '../../node_modules/@connect2ic/react'),
      '@dfinity/agent': join(__dirname, '../../node_modules/@dfinity/agent'),
      '@dfinity/auth-client': join(__dirname, '../../node_modules/@dfinity/auth-client'),
      '@dfinity/candid': join(__dirname, '../../node_modules/@dfinity/candid'),
      '@dfinity/identity': join(__dirname, '../../node_modules/@dfinity/identity'),
    },
  },
});
