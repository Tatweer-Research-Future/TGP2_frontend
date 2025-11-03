import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Increase chunk size warning limit to reduce warnings
    chunkSizeWarningLimit: 2000,
    // Don't fail on warnings, only on actual errors
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress chunk size warnings - these are informational only
        if (warning.code === 'CHUNK_SIZE_WARNING' || 
            (warning.message && warning.message.includes('chunks are larger'))) {
          return;
        }
        // Suppress dynamic import warnings - these are informational only
        if (warning.message && warning.message.includes('dynamically imported')) {
          return;
        }
        // Call the default warn function for other warnings
        warn(warning);
      },
    },
  },
});
