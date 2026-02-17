import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  root: "app",
  plugins: [tailwindcss()],
  server: { port: 8000 },
});
