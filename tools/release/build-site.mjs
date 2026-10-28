// Builds the four add-ins for GitHub Pages and writes production manifests plus a landing page.
// Usage: npm run build:site            (SITE_URL=https://example.com/base to host elsewhere)
// Output: site/<app>/, site/manifests/<app>.manifest.xml, site/index.html, robots.txt, sitemap.xml, llms.txt
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const site = path.join(root, "site");
const SITE_URL = (process.env.SITE_URL || "https://markusbegerow.github.io/open-officeui").replace(/\/+$/, "");
if (!/^https:\/\/[\w.-]+(:\d+)?(\/[\w.-]+)*$/.test(SITE_URL)) throw new Error(`SITE_URL looks wrong: ${SITE_URL}`);
const REPO = "https://github.com/markusbegerow/open-officeui";
const version = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version;

const APPS = [
  { id: "word", port: 3000, name: "Word" },
  { id: "outlook", port: 3001, name: "Outlook" },
  { id: "excel", port: 3002, name: "Excel" },
  { id: "powerpoint", port: 3003, name: "PowerPoint" },
];

// one command string (all parts are constants or validated above), so no args are passed with shell: true
const run = (cmdline) => {
  const r = spawnSync(cmdline, { cwd: root, stdio: "inherit", shell: true });
  if (r.status !== 0) throw new Error(`${cmdline} failed (${r.status})`);
};

fs.rmSync(site, { recursive: true, force: true });
fs.mkdirSync(path.join(site, "manifests"), { recursive: true });

const basePath = new URL(SITE_URL).pathname.replace(/\/+$/, "");

for (const app of APPS) {
  console.log(`\n== ${app.name}`);
  run(`npm run build -w @open-officeui/${app.id} -- --base ${basePath}/${app.id}/`);
  fs.cpSync(path.join(root, "apps", app.id, "dist"), path.join(site, app.id), { recursive: true });

  const dev = fs.readFileSync(path.join(root, "apps", app.id, "manifest.xml"), "utf8");
  const prod = dev
    .replace(/<bt:Url id="Url" DefaultValue="[^"]*"\/>/, `<bt:Url id="Url" DefaultValue="${SITE_URL}/"/>`)
    .replace(/<SupportUrl DefaultValue="[^"]*"\/>/, `<SupportUrl DefaultValue="${REPO}/issues"/>`)
    .replaceAll(`https://localhost:${app.port}`, `${SITE_URL}/${app.id}`)
    .replace(/<Version>[^<]*<\/Version>/, `<Version>${version}.0</Version>`);
  if (prod.includes("localhost")) throw new Error(`${app.id}: manifest still mentions localhost`);

  const file = path.join(site, "manifests", `${app.id}.manifest.xml`);
  fs.writeFileSync(file, prod);
  run(`npx office-addin-manifest validate "${file}"`);
}

fs.copyFileSync(path.join(root, "assets/logo/logo-256.png"), path.join(site, "logo.png"));
fs.writeFileSync(path.join(site, ".nojekyll"), "");
fs.mkdirSync(path.join(site, "screenshots"), { recursive: true });
for (const f of ["sign-in.png", "chat-light.png", "chat-dark.png"]) {
  fs.copyFileSync(path.join(root, "docs/screenshots", f), path.join(site, "screenshots", f));
}

const origin = new URL(SITE_URL).origin;
const RELEASES = `${REPO}/releases/latest`;
const LICENSE_URL = "https://www.gnu.org/licenses/gpl-3.0.html";
const today = new Date().toISOString().slice(0, 10);
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const TITLE = "Open OfficeUI - Open WebUI add-ins for Word, Outlook, Excel and PowerPoint";
const DESCRIPTION =
  "Free, open-source Office add-ins that connect Word, Outlook, Excel and PowerPoint to your self-hosted Open WebUI server. No cloud middleman.";
const FEATURES = [
  "Streaming chat with your own Open WebUI server",
  "Markdown rendering of replies",
  "Insert a reply or replace the selected text",
  "Optional document context",
  "Prompt template library",
  "Local chat history (last 50 chats)",
  "German and English interface with light, dark or system theme",
];

// one source for the visible FAQ and the FAQPage structured data, so the two can never drift apart
const FAQ = [
  {
    q: "What is Open OfficeUI?",
    a: "Open OfficeUI is a set of four Microsoft Office task-pane add-ins for Word, Outlook, Excel and PowerPoint. They let you chat with your own self-hosted Open WebUI server from inside Office, without a cloud middleman.",
  },
  {
    q: "Which Office applications are supported?",
    a: "Word, Outlook, Excel and PowerPoint, each as its own add-in. Word on Windows is the most tested; the other hosts are less tested.",
  },
  {
    q: "What do I need to use it?",
    a: `Microsoft Office, an Open WebUI server reachable over HTTPS, and the add-in origin ${origin} added to the server's CORS_ALLOW_ORIGIN setting.`,
  },
  {
    q: "Is Open OfficeUI free and open source?",
    a: `Yes. It is free and released under the GPL-3.0 licence. The source code is on GitHub at ${REPO}.`,
  },
  {
    q: "Where is my data stored?",
    a: "Chats go directly from Office to your own Open WebUI server. Chat history is kept locally in your browser storage (last 50 chats) and is not synced anywhere.",
  },
];

const jsonLd = JSON.stringify(
  {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#software`,
        name: "Open OfficeUI",
        description: DESCRIPTION,
        url: `${SITE_URL}/`,
        image: `${SITE_URL}/logo.png`,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Microsoft Office (Windows, Mac, Web)",
        softwareVersion: version,
        license: LICENSE_URL,
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
        downloadUrl: RELEASES,
        codeRepository: REPO,
        sameAs: [REPO],
        featureList: FEATURES,
        inLanguage: ["en", "de"],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: "Open OfficeUI",
        inLanguage: "en",
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ.map(({ q, a }) => ({
          "@type": "Question",
          name: q,
          acceptedAnswer: { "@type": "Answer", text: a },
        })),
      },
    ],
  },
  null,
  2,
).replace(/</g, "\\u003c"); // keep "</script>" out of the inline JSON

const ZIP_URL = `${REPO}/releases/latest/download/open-officeui-manifests.zip`;
const SIDELOAD = {
  word: "https://learn.microsoft.com/office/dev/add-ins/testing/sideload-office-add-ins-for-testing",
  outlook: "https://learn.microsoft.com/office/dev/add-ins/outlook/sideload-outlook-add-ins-for-testing",
};
const buttons = APPS.map(
  (a) => `<a class="btn" href="manifests/${a.id}.manifest.xml" download>Add to ${a.name}</a>`,
).join("\n        ");
const featureItems = FEATURES.map((f) => `<li>${esc(f)}</li>`).join("\n        ");
const faqItems = FAQ.map(({ q, a }) => `<h3>${esc(q)}</h3>\n    <p>${esc(a)}</p>`).join("\n    ");

fs.writeFileSync(
  path.join(site, "index.html"),
  `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(TITLE)}</title>
  <meta name="description" content="${esc(DESCRIPTION)}" />
  <link rel="canonical" href="${SITE_URL}/" />
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
  <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
  <meta name="theme-color" content="#1e1e1e" media="(prefers-color-scheme: dark)" />
  <link rel="icon" type="image/png" href="logo.png" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Open OfficeUI" />
  <meta property="og:title" content="${esc(TITLE)}" />
  <meta property="og:description" content="${esc(DESCRIPTION)}" />
  <meta property="og:url" content="${SITE_URL}/" />
  <meta property="og:image" content="${SITE_URL}/logo.png" />
  <meta property="og:image:alt" content="Open OfficeUI logo" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${esc(TITLE)}" />
  <meta name="twitter:description" content="${esc(DESCRIPTION)}" />
  <meta name="twitter:image" content="${SITE_URL}/logo.png" />
  <script type="application/ld+json">
${jsonLd}
  </script>
  <style>
    :root { color-scheme: light dark; font-family: "Segoe UI", system-ui, sans-serif; line-height: 1.5; }
    body { max-width: 680px; margin: 40px auto; padding: 0 16px; }
    img { display: block; margin: 0 auto 8px; }
    h1 { text-align: center; margin-top: 0; }
    h3 { margin-bottom: 4px; font-size: 1rem; }
    h3 + p { margin-top: 0; }
    .lead { text-align: center; opacity: 0.75; }
    code { background: rgba(128,128,128,.18); padding: 1px 5px; border-radius: 4px; }
    li { margin: 4px 0; } small { opacity: 0.6; margin-left: 6px; }
    .btns { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
    .btn { display: inline-block; padding: 8px 16px; border-radius: 6px; background: #0f6cbd; color: #fff; text-decoration: none; font-weight: 600; }
    .btn:hover { background: #115ea3; }
    .btn.alt { background: transparent; color: inherit; border: 1px solid rgba(128,128,128,.6); }
    .shots { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 8px; margin: 12px 0; }
    .shots img { width: 100%; height: auto; margin: 0; border-radius: 6px; border: 1px solid rgba(128,128,128,.4); }
    ol li { margin: 6px 0; }
    footer { margin-top: 32px; }
  </style>
</head>
<body>
  <header>
    <img src="logo.png" alt="Open OfficeUI logo" width="120" height="120" />
    <h1>Open OfficeUI</h1>
    <p class="lead">Your self-hosted Open WebUI inside Word, Outlook, Excel and PowerPoint. Version ${version}.</p>
  </header>

  <main>
    <section>
      <h2>What is Open OfficeUI?</h2>
      <p>Open OfficeUI is a free, open-source (GPL-3.0) set of Office task-pane add-ins that connect Word, Outlook, Excel and PowerPoint to your own Open WebUI server, with no cloud middleman.</p>
      <ul>
        ${featureItems}
      </ul>
    </section>

    <section>
      <h2>Screenshots</h2>
      <div class="shots">
        <img src="screenshots/sign-in.png" alt="Sign-in screen" loading="lazy" />
        <img src="screenshots/chat-light.png" alt="Chat pane, light theme" loading="lazy" />
        <img src="screenshots/chat-dark.png" alt="Chat pane, dark theme" loading="lazy" />
      </div>
    </section>

    <section>
      <h2>1. Download the add-in file</h2>
      <p>Each Office app needs its own small setup file (a "manifest"). Pick the app you use; it tells Office where to load the add-in from. Nothing is installed on your computer.</p>
      <div class="btns">
        ${buttons}
      </div>
      <p>Need several? <a class="btn alt" href="${ZIP_URL}">Download all (zip)</a></p>
      <p><small>Word on Windows is the most tested; the other apps are less tested. The zip is attached to the <a href="${RELEASES}">latest GitHub release</a>.</small></p>
    </section>

    <section>
      <h2>2. Add it to Office</h2>
      <p>Open the app, then:</p>
      <ol>
        <li><b>Word, Excel, PowerPoint:</b> Insert &rarr; Add-ins &rarr; My Add-ins &rarr; Upload My Add-in, then choose the downloaded file.</li>
        <li><b>Outlook:</b> Get Add-ins &rarr; My add-ins &rarr; Custom add-ins &rarr; Add from file.</li>
        <li>Open <b>Open OfficeUI</b> from the ribbon to show the chat pane.</li>
      </ol>
      <p><b>Organisations:</b> an admin can roll it out via Microsoft 365 admin center &rarr; Integrated apps &rarr; Upload custom apps.
      Help: <a href="${SIDELOAD.word}">Word, Excel, PowerPoint</a>, <a href="${SIDELOAD.outlook}">Outlook</a>.</p>
    </section>

    <section>
      <h2>3. Allow the add-in on your Open WebUI server (admin step)</h2>
      <p>Add <code>${origin}</code> to <code>CORS_ALLOW_ORIGIN</code> (origin only, no path) and serve the server over HTTPS.
      Then open the pane and sign in with your server URL.</p>
    </section>

    <section>
      <h2>Frequently asked questions</h2>
    ${faqItems}
    </section>
  </main>

  <footer>
    <p><a href="${REPO}">Source code, documentation and issues on GitHub</a></p>
  </footer>
</body>
</html>
`,
);

fs.writeFileSync(
  path.join(site, "robots.txt"),
  `User-agent: *
Allow: /

User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`,
);

fs.writeFileSync(
  path.join(site, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${today}</lastmod>
  </url>
</urlset>
`,
);

fs.writeFileSync(
  path.join(site, "llms.txt"),
  `# Open OfficeUI

> ${DESCRIPTION}

Open OfficeUI is a set of four Microsoft Office task-pane add-ins (Word, Outlook, Excel, PowerPoint) that chat with a self-hosted Open WebUI server. Free and open source under GPL-3.0. Current version: ${version}.

## Install
- [Install page](${SITE_URL}/): manifest downloads and setup steps
${APPS.map((a) => `- [${a.name} manifest](${SITE_URL}/manifests/${a.id}.manifest.xml)`).join("\n")}
- [Latest release](${RELEASES}): all manifests as a zip (${ZIP_URL})

## Project
- [Source code and documentation](${REPO})
- [Issues](${REPO}/issues)
- [License: GPL-3.0](${LICENSE_URL})
`,
);

console.log(`\nsite/ ready for ${SITE_URL} (version ${version})`);
