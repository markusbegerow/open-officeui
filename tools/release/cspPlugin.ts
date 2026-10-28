import type { Plugin } from "vite";

// GitHub Pages cannot send HTTP headers, so the policy goes into a meta tag. Production build only.
// connect-src is any https origin because the Open WebUI server is entered by the user (and the
// About tab asks api.github.com for the latest release).
export const CSP = [
  "default-src 'self'",
  "script-src 'self' https://appsforoffice.microsoft.com",
  "connect-src https:",
  "img-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "base-uri 'none'",
  "object-src 'none'",
].join("; ");

/** Set SITE_CSP=off to build without the policy (kill switch if Office.js needs more than allowed here). */
export function cspPlugin(): Plugin {
  return {
    name: "open-officeui-csp",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler: (html) =>
        process.env.SITE_CSP === "off"
          ? html
          : html.replace("<head>", `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
    },
  };
}
