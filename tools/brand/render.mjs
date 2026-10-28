// Renders the Open OfficeUI logo (desktop mark + document badge) to PNGs with headless Edge.
// Usage: npm run logo
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const page_url = pathToFileURL(path.join(root, "tools/brand/logo.html")).href;
const out = path.join(root, "assets/logo");

// the badge is unreadable below 48px, so the smallest icons carry the mark only
const sizes = [16, 32, 64, 80, 128, 256, 1024];
const withBadge = (s) => s >= 64;

const edge = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
].find((p) => fs.existsSync(p));
const browser = await chromium.launch(edge ? { executablePath: edge } : { channel: "msedge" });

try {
  for (const s of sizes) {
    const page = await browser.newPage({ viewport: { width: s, height: s } });
    await page.goto(`${page_url}?s=${s}&badge=${withBadge(s) ? 1 : 0}`);
    await page.waitForFunction(() => document.getElementById("mark").complete);
    await page.screenshot({ path: path.join(out, `logo-${s}.png`), omitBackground: true });
    await page.close();
  }
} finally {
  await browser.close();
}

// distribute: add-in icons (file names are referenced by the manifests) and the in-app logo
for (const app of ["word", "outlook", "excel", "powerpoint"]) {
  for (const s of [16, 32, 64, 80]) {
    fs.copyFileSync(path.join(out, `logo-${s}.png`), path.join(root, `apps/${app}/public/icon-${s}.png`));
  }
}
fs.copyFileSync(path.join(out, "logo-128.png"), path.join(root, "packages/ui/src/logo.png"));
console.log("logo rendered:", sizes.map((s) => `logo-${s}.png`).join(", "));
