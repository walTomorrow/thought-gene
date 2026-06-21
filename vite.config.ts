import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";

// Vite builds the React SPA. The Cloudflare plugin runs the Worker in the
// Workers runtime during dev and bundles both for deployment.
export default defineConfig({
  plugins: [react(), cloudflare()],
});
