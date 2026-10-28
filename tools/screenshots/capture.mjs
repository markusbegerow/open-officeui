// Takes the README screenshots of the real chat pane against a mocked Open WebUI server.
// All content is fictional. Usage: npm run screenshots
import { chromium } from "playwright-core";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = path.join(root, "docs/screenshots");
const SERVER = "https://openwebui.example.com";
const PORT = 3100;

const ACTIONS = [
  { label: "Summarize", prompt: "Summarize the following text briefly." },
  { label: "Rewrite", prompt: "Rewrite the following text more clearly and professionally. Output only the new text." },
  { label: "Proofread", prompt: "Fix spelling and grammar in the following text. Output only the corrected text." },
  { label: "Change tone", prompt: "Rewrite the following text in a {{tone}} tone. Output only the new text." },
  { label: "Translate", prompt: "Translate the following text into {{language}}. Output only the translation." },
];

const REPLY = `Here is a short summary of the **Q3 project update**:

- **Website relaunch** is on track; the new design goes live on 14 November.
- **Customer portal** is two weeks behind because of a delayed vendor delivery.
- **Budget** is at 82 % of plan; no extra funds are requested.

| Milestone | Owner | Due |
| --- | --- | --- |
| Website relaunch | Design team | 14 Nov |
| Portal beta | Engineering | 5 Dec |
| Budget review | Finance | 19 Dec |
`;

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
};

/** Fake Open WebUI: model list and a streamed chat completion. */
async function mockServer(context) {
  await context.route(`${SERVER}/**`, async (route) => {
    const req = route.request();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const url = new URL(req.url());
    if (url.pathname === "/api/models") {
      return route.fulfill({
        status: 200,
        headers: { ...cors, "content-type": "application/json" },
        body: JSON.stringify({ data: [{ id: "atlas-large", name: "Atlas Large" }, { id: "atlas-small", name: "Atlas Small" }] }),
      });
    }
    if (url.pathname === "/api/chat/completions") {
      const words = REPLY.match(/\S+\s*|\n+/g) ?? [];
      const events = words.map((w) => `data: ${JSON.stringify({ choices: [{ delta: { content: w } }] })}\n\n`);
      return route.fulfill({
        status: 200,
        headers: { ...cors, "content-type": "text/event-stream" },
        body: events.join("") + "data: [DONE]\n\n",
      });
    }
    return route.fulfill({ status: 404, headers: cors, body: "{}" });
  });
}

const edge = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
].find((p) => fs.existsSync(p));

fs.mkdirSync(outDir, { recursive: true });
const vite = await createServer({
  root: path.join(root, "tools/screenshots"),
  configFile: false,
  plugins: [react()],
  logLevel: "error",
  server: { port: PORT, strictPort: true },
});
await vite.listen();
const browser = await chromium.launch(edge ? { executablePath: edge } : { channel: "msedge" });

async function scene(name, settings, steps, height = 680) {
  const context = await browser.newContext({ viewport: { width: 400, height }, deviceScaleFactor: 2 });
  await mockServer(context);
  await context.addInitScript((s) => localStorage.setItem("open-officeui.settings", JSON.stringify(s)), settings);
  const page = await context.newPage();
  page.on("pageerror", (e) => console.error(`[${name}] page error:`, e.message));
  await page.goto(`http://localhost:${PORT}/`);
  await steps(page);
  await page.screenshot({ path: path.join(outDir, `${name}.png`) });
  await context.close();
  console.log("saved", `docs/screenshots/${name}.png`);
}

const signedIn = (theme) => ({ baseUrl: SERVER, token: "demo-token", model: "atlas-large", lang: "en", theme, actions: ACTIONS });

async function chat(page) {
  await page.getByRole("button", { name: "Summarize" }).click();
  await page.locator(".oo-apply").waitFor(); // shown once the stream has finished
  await page.locator(".oo-md table").waitFor();
}

try {
  await scene("sign-in", { baseUrl: SERVER, lang: "en", theme: "light" }, async (page) => {
    await page.getByPlaceholder("Email").fill("you@example.com");
    await page.getByPlaceholder("Password").fill("not-a-real-password");
    await page.evaluate(() => document.activeElement?.blur()); // no focus ring / reveal icon in the shot
  }, 360);
  await scene("chat-light", signedIn("light"), chat);
  await scene("chat-dark", signedIn("dark"), chat);
} finally {
  await browser.close();
  await vite.close();
}
