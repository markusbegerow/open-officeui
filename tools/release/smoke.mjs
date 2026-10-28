// Serves site/ under /open-officeui/ and loads every app in headless Edge. Fails on console errors,
// CSP violations, failed requests, or when the sign-in form does not render.
// Usage: npm run build:site && npm run smoke
import { chromium } from "playwright-core";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const site = path.join(root, "site");
const PREFIX = "/open-officeui";
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".xml": "application/xml" };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (!p.startsWith(PREFIX)) return res.writeHead(404).end();
  p = p.slice(PREFIX.length) || "/";
  const file = path.join(site, p.endsWith("/") ? p + "index.html" : p);
  if (!file.startsWith(site) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return res.writeHead(404).end();
  res.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream" }).end(fs.readFileSync(file));
});
await new Promise((r) => server.listen(3200, r));

const edge = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
].find((p) => fs.existsSync(p));
const browser = await chromium.launch(edge ? { executablePath: edge } : { channel: "msedge" });
let failed = false;

try {
  for (const app of ["word", "outlook", "excel", "powerpoint"]) {
    const page = await browser.newPage();
    const problems = [];
    page.on("console", (m) => m.type() === "error" && problems.push(`console: ${m.text()}`));
    page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
    page.on("requestfailed", (r) => problems.push(`request failed: ${r.url()} ${r.failure()?.errorText}`));
    page.on("response", (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()}: ${r.url()}`));

    await page.goto(`http://localhost:3200${PREFIX}/${app}/`);
    const rendered = await page.locator(".oo-login").waitFor({ timeout: 15000 }).then(() => true, () => false);
    if (!rendered) problems.push("sign-in form did not render");
    console.log(`${problems.length ? "FAIL" : "ok  "} ${app}`);
    problems.forEach((p) => console.log(`     ${p}`));
    failed ||= problems.length > 0;
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
process.exit(failed ? 1 : 0);
