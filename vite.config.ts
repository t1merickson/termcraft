import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  root: "app",
  // Relative base so the build works at any URL: GitHub Pages project sites,
  // a custom domain, or opened straight off the filesystem.
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./app/src"),
    },
  },
  server: { port: 8000, host: true },
});
