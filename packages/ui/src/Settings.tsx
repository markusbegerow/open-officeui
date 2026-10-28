import { useState } from "react";
import { AboutTab } from "./AboutTab";
import { DEFAULT_ACTIONS } from "./actions";
import { LANGS, type T } from "./i18n";
import { clearAllData, type Settings, type SendKey, type Theme } from "./storage";

type Tab = "general" | "prompts" | "about";

interface Props {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  t: T;
  openUrl: (url: string) => void;
  onBack: () => void;
}

export function SettingsView({ settings, update, t, openUrl, onBack }: Props) {
  const [tab, setTab] = useState<Tab>("general");
  const [confirmClear, setConfirmClear] = useState(false);
  const tabs: Tab[] = ["general", "prompts", "about"];

  return (
    <div className="oo-pane oo-settings">
      <header>
        <button onClick={onBack}>← {t("settings.back")}</button>
        <strong>{t("settings.title")}</strong>
      </header>
      <nav className="oo-tabs">
        {tabs.map((id) => (
          <button key={id} className={tab === id ? "oo-active" : ""} onClick={() => setTab(id)}>
            {t(`settings.tab.${id}`)}
          </button>
        ))}
      </nav>

      <div className="oo-settings-body">
        {tab === "general" && (
          <>
            <label>
              {t("settings.systemPrompt")}
              <textarea rows={4} value={settings.systemPrompt} onChange={(e) => update({ systemPrompt: e.target.value })} />
            </label>
            <label>
              {t("settings.temperature")}
              <input
                type="number"
                min={0}
                max={2}
                step={0.1}
                value={settings.temperature ?? ""}
                onChange={(e) => update({ temperature: e.target.value === "" ? null : Number(e.target.value) })}
              />
            </label>
            <label>
              {t("settings.language")}
              <select value={settings.lang} onChange={(e) => update({ lang: e.target.value as Settings["lang"] })}>
                {LANGS.map((l) => (
                  <option key={l} value={l}>{l.toUpperCase()}</option>
                ))}
              </select>
            </label>
            <label>
              {t("settings.theme")}
              <select value={settings.theme} onChange={(e) => update({ theme: e.target.value as Theme })}>
                {(["system", "light", "dark"] as const).map((v) => (
                  <option key={v} value={v}>{t(`settings.theme.${v}`)}</option>
                ))}
              </select>
            </label>
            <label>
              {t("settings.sendKey")}
              <select value={settings.sendKey} onChange={(e) => update({ sendKey: e.target.value as SendKey })}>
                {(["enter", "ctrl-enter"] as const).map((v) => (
                  <option key={v} value={v}>{t(`settings.sendKey.${v}`)}</option>
                ))}
              </select>
            </label>
            <fieldset>
              <p className="oo-hint">{t("settings.clearData.hint")}</p>
              <button
                onClick={() => {
                  // two clicks instead of window.confirm: dialogs can be blocked in Office iframes
                  if (!confirmClear) return setConfirmClear(true);
                  clearAllData();
                  location.reload();
                }}
              >
                {confirmClear ? t("settings.clearData.confirm") : t("settings.clearData")}
              </button>
            </fieldset>
          </>
        )}

        {tab === "prompts" && (
          <>
            {settings.actions.map((a, i) => {
              const set = (patch: Partial<typeof a>) =>
                update({ actions: settings.actions.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
              return (
                <fieldset key={i}>
                  <input aria-label={t("settings.prompts.label")} placeholder={t("settings.prompts.label")} value={a.label} onChange={(e) => set({ label: e.target.value })} />
                  <textarea aria-label={t("settings.prompts.prompt")} placeholder={t("settings.prompts.prompt")} rows={3} value={a.prompt} onChange={(e) => set({ prompt: e.target.value })} />
                  <button onClick={() => update({ actions: settings.actions.filter((_, j) => j !== i) })}>{t("settings.prompts.remove")}</button>
                </fieldset>
              );
            })}
            <div className="oo-row">
              <button onClick={() => update({ actions: [...settings.actions, { label: "", prompt: "" }] })}>{t("settings.prompts.add")}</button>
              <button onClick={() => update({ actions: DEFAULT_ACTIONS })}>{t("settings.prompts.reset")}</button>
            </div>
          </>
        )}

        {tab === "about" && <AboutTab t={t} openUrl={openUrl} />}
      </div>
    </div>
  );
}
