import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    watch: {
      // Explicitly ignore folders to stop chokidar and esbuild from scanning outside the source tree
      ignored: ["**/node_modules/**", "**/dist/**", "**/.git/**", "**/Backend/**", "**/.venv/**"],
    },
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    // Force pre-bundling of common packages to limit esbuild parsing loops
    include: ["react", "react-dom", "leaflet", "react-leaflet", "lucide-react", "framer-motion"],
  },
}));
