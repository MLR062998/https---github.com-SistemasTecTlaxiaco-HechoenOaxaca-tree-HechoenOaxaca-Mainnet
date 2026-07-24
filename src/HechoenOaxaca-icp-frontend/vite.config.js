
import { defineConfig, loadEnv } from "vite";

import react from "@vitejs/plugin-react";

import path from "path";

import { fileURLToPath } from "url";

import { nodePolyfills } from "vite-plugin-node-polyfills";

// =====================================================
// Compatibilidad ES Modules
// =====================================================

const __filename = fileURLToPath(
  import.meta.url
);

const __dirname = path.dirname(
  __filename
);

// =====================================================
// Config
// =====================================================

export default defineConfig(
  ({ mode }) => {
    const env = loadEnv(
      mode,
      process.cwd(),
      ""
    );

    return {
      // =====================================================
      // Root frontend
      // =====================================================

      root: path.resolve(
        __dirname,
        "src"
      ),

      // =====================================================
      // ICP Mainnet
      // =====================================================

      base: "/",

      // =====================================================
      // Public
      // =====================================================

      publicDir: path.resolve(
        __dirname,
        "public"
      ),

      // =====================================================
      // Plugins
      // =====================================================

      plugins: [
        react(),

        nodePolyfills({
          globals: {
            process: true,
            buffer: true,
          },

          protocolImports: true,
        }),
      ],

      // =====================================================
      // Resolve
      // =====================================================

      resolve: {
        alias: {
          "@": path.resolve(
            __dirname,
            "src"
          ),

          declarations:
            path.resolve(
              __dirname,
              "../declarations"
            ),
        },
      },

      // =====================================================
      // Define
      // =====================================================

      define: {
        global: "globalThis",

        "import.meta.env.VITE_BACKEND_CANISTER_ID":
          JSON.stringify(
            env.VITE_BACKEND_CANISTER_ID
          ),

        "import.meta.env.VITE_FRONTEND_CANISTER_ID":
          JSON.stringify(
            env.VITE_FRONTEND_CANISTER_ID
          ),

        "import.meta.env.VITE_DFX_NETWORK":
          JSON.stringify(
            env.VITE_DFX_NETWORK
          ),

        "import.meta.env.VITE_II_CANISTER_ID":
          JSON.stringify(
            env.VITE_II_CANISTER_ID
          ),
      },

      // =====================================================
      // Optimize deps
      // =====================================================

      optimizeDeps: {
        include: [
          "@dfinity/principal",

          "@dfinity/agent",

          "@dfinity/auth-client",

          "sweetalert2",

          "sweetalert2-react-content",
        ],

        exclude: [
          "@dfinity/candid",
        ],
      },

      // =====================================================
      // Assets
      // =====================================================

      assetsInclude: [
        "**/*.wasm",
      ],

      // =====================================================
      // Build
      // =====================================================

      build: {
        outDir: path.resolve(
          __dirname,
          "dist"
        ),

        emptyOutDir: true,

        target: "es2020",

        sourcemap:
          mode !== "production",

        minify:
          mode === "production"
            ? "terser"
            : false,

        chunkSizeWarningLimit: 2000,

        rollupOptions: {
          input: path.resolve(
            __dirname,
            "src/index.html"
          ),

          output: {
            entryFileNames:
              "assets/[name].[hash].js",

            chunkFileNames:
              "assets/[name].[hash].js",

            assetFileNames:
              "assets/[name].[hash].[ext]",
          },
        },
      },

      // =====================================================
      // Dev server
      // =====================================================

      server: {
        port: 3000,

        strictPort: true,
      },
    };
  }
);
