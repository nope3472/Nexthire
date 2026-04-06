import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron";
import renderer from "vite-plugin-electron-renderer";
import * as dotenv from "dotenv";
import * as fs from "fs";

// Load .env at config time so we can inline values into the main process bundle.
// Falls back to .env.example if .env doesn't exist yet.
if (fs.existsSync(".env")) {
  dotenv.config({ path: ".env" });
} else if (fs.existsSync(".env.example")) {
  dotenv.config({ path: ".env.example" });
}

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: "src/main/index.ts",
        vite: {
          build: {
            sourcemap: true,
            minify: false,
            outDir: "dist/main",
            rollupOptions: {
              external: [
                "electron",
                "electron-store",
                "@workos-inc/node",
                "path",
                "fs",
                "os",
                "crypto",
                "url",
                "child_process",
              ],
            },
          },
          define: {
            "process.env.WORKOS_CLIENT_ID": JSON.stringify(
              process.env.WORKOS_CLIENT_ID || ""
            ),
            "process.env.WORKOS_REDIRECT_URI": JSON.stringify(
              process.env.WORKOS_REDIRECT_URI || ""
            ),
            "process.env.WORKOS_API_KEY": JSON.stringify(
              process.env.WORKOS_API_KEY || ""
            ),
            "process.env.WORKOS_AUTHKIT_DOMAIN": JSON.stringify(
              process.env.WORKOS_AUTHKIT_DOMAIN || ""
            ),
          },
        },
      },
      {
        entry: "src/preload/index.ts",
        onstart(options) {
          options.reload();
        },
        vite: {
          build: {
            sourcemap: "inline",
            minify: false,
            outDir: "dist/preload",
            rollupOptions: {
              external: ["electron"],
            },
          },
        },
      },
    ]),
    renderer(),
  ],
  build: {
    outDir: "dist/renderer",
  },
});
