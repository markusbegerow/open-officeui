import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cspPlugin } from "../../tools/release/cspPlugin";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Certs from `npx office-addin-dev-certs install`
const certDir = path.join(os.homedir(), ".office-addin-dev-certs");
const https = fs.existsSync(path.join(certDir, "localhost.key"))
  ? {
      key: fs.readFileSync(path.join(certDir, "localhost.key")),
      cert: fs.readFileSync(path.join(certDir, "localhost.crt")),
      ca: fs.readFileSync(path.join(certDir, "ca.crt")),
    }
  : undefined;

export default defineConfig({
  plugins: [react(), cspPlugin()],
  server: { port: 3002, https },
});
