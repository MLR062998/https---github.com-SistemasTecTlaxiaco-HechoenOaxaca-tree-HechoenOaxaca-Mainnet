// src/HechoenOaxaca-icp-frontend/vite.config.js
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    root: path.resolve(__dirname, "src"),
    base: "./",
    publicDir: path.resolve(__dirname, "public"),
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
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        declarations: path.resolve(__dirname, "../declarations"),
      },
    },
    define: {
      "import.meta.env.VITE_BACKEND_CANISTER_ID": JSON.stringify(env.VITE_BACKEND_CANISTER_ID),
      "import.meta.env.VITE_FRONTEND_CANISTER_ID": JSON.stringify(env.VITE_FRONTEND_CANISTER_ID),
      "import.meta.env.VITE_DFX_NETWORK": JSON.stringify(env.VITE_DFX_NETWORK),
    },
    optimizeDeps: {
      include: ["@dfinity/principal", "@dfinity/agent"],
    },
    build: {
      outDir: path.resolve(__dirname, "dist"),
      emptyOutDir: true,
      target: "es2020",
      rollupOptions: {
        input: path.resolve(__dirname, "src/index.html"),
        output: {
          entryFileNames: "assets/index.js",
          chunkFileNames: "assets/[name].js",
          assetFileNames: "assets/[name].[ext]",
        },
      },
    },
  };
});
