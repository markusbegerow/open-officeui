import { useState } from "react";
import { LINKS } from "./links";
import logo from "./logo.png";
import type { T } from "./i18n";

export const VERSION = "1.0.0";

type UpdateState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "current" }
  | { kind: "newer"; version: string }
  | { kind: "error" };

const num = (v: string) => v.replace(/^v/, "").split(".").map((n) => parseInt(n, 10) || 0);

export function isNewer(latest: string, current: string): boolean {
  const a = num(latest);
  const b = num(current);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d > 0;
  }
  return false;
}

export function AboutTab({ t, openUrl }: { t: T; openUrl: (url: string) => void }) {
  const [update, setUpdate] = useState<UpdateState>({ kind: "idle" });

  const check = async () => {
    setUpdate({ kind: "checking" });
    try {
      const res = await fetch(LINKS.releasesApi, { headers: { Accept: "application/vnd.github+json" } });
      if (res.status === 404) return setUpdate({ kind: "current" }); // no release published yet
      if (!res.ok) throw new Error(String(res.status));
      const tag: string = (await res.json()).tag_name ?? "";
      setUpdate(isNewer(tag, VERSION) ? { kind: "newer", version: tag } : { kind: "current" });
    } catch {
      setUpdate({ kind: "error" });
    }
  };

  const Link = ({ url, label }: { url: string; label: string }) => (
    <button type="button" onClick={() => openUrl(url)}>{label}</button>
  );

  return (
    <div className="oo-about">
      <fieldset>
        <legend>{t("about.title")} <span className="oo-hint">v{VERSION}</span></legend>
        <img className="oo-logo" src={logo} alt="" width={64} height={64} />
        <p>{t("about.text")}</p>
        <button type="button" disabled={update.kind === "checking"} onClick={check}>
          {update.kind === "checking" ? t("about.checking") : t("about.checkUpdate")}
        </button>
        {update.kind === "current" && <p className="oo-ok">{t("about.upToDate")}</p>}
        {update.kind === "error" && <p className="oo-error">{t("about.updateError")}</p>}
        {update.kind === "newer" && (
          <p className="oo-ok">
            {t("about.newVersion", { version: update.version })}{" "}
            <a href={LINKS.releases} onClick={(e) => { e.preventDefault(); openUrl(LINKS.releases); }}>
              {LINKS.releases}
            </a>
          </p>
        )}
      </fieldset>

      <fieldset>
        <legend>{t("about.involved")}</legend>
        <div className="oo-row">
          <Link url={LINKS.issues} label={`🐛 ${t("about.bugs")}`} />
          <Link url={LINKS.issues} label={`💡 ${t("about.features")}`} />
          <Link url={LINKS.repo} label={`⭐ ${t("about.star")}`} />
        </div>
      </fieldset>

      <fieldset>
        <legend>{t("about.support")}</legend>
        <div className="oo-row">
          <Link url={LINKS.shareLinkedIn} label={`💼 ${t("about.share")}`} />
          <Link url={LINKS.coffee} label={`☕ ${t("about.coffee")}`} />
        </div>
      </fieldset>

      <fieldset>
        <legend>{t("about.contact")}</legend>
        <div className="oo-row">
          <Link url={LINKS.website} label={`🌐 ${t("about.website")}`} />
          <Link url={LINKS.linkedIn} label="LinkedIn" />
          <Link url={LINKS.github} label="GitHub" />
          <Link url={LINKS.x} label="X" />
        </div>
      </fieldset>
    </div>
  );
}
