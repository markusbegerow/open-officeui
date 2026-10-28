import { useEffect, useMemo, useRef, useState } from "react";
import {
  listModels,
  signIn,
  streamChat,
  type ChatMessage,
  type HostAdapter,
  type ModelInfo,
} from "@open-officeui/core";
import { extractVars, fillVars, type PromptAction } from "./actions";
import { deleteChat, loadChats, newChatId, searchChats, upsertChat, type StoredChat } from "./history";
import { ErrorBoundary } from "./ErrorBoundary";
import { IconHistory, IconLogout, IconPlus, IconSend, IconSettings, IconSparkle, IconStop } from "./Icons";
import { makeT, type T } from "./i18n";
import logo from "./logo.png";
import { Markdown } from "./Markdown";
import { SettingsView } from "./Settings";
import { loadSettings, saveSettings, type Settings } from "./storage";
import "./chat.css";

const CONTEXT_SEP = "\n\n---\n";
type View = "chat" | "settings" | "history";

function Login({ t, onDone }: { t: T; onDone: (s: Settings) => void }) {
  const [baseUrl, setBaseUrl] = useState(loadSettings().baseUrl);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const token = await signIn(baseUrl, email, password);
      const s = { ...loadSettings(), baseUrl, token };
      saveSettings(s);
      onDone(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="oo-login" onSubmit={submit}>
      <img className="oo-logo" src={logo} alt="" width={72} height={72} />
      <h2>{t("login.title")}</h2>
      <input placeholder="https://openwebui.example.com" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} required />
      <input placeholder={t("login.email")} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input placeholder={t("login.password")} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      {error && <p className="oo-error">{error}</p>}
      <button disabled={busy}>{busy ? "…" : t("login.submit")}</button>
    </form>
  );
}

function VarsDialog({
  t,
  action,
  onSubmit,
  onCancel,
}: {
  t: T;
  action: PromptAction;
  onSubmit: (values: Record<string, string>) => void;
  onCancel: () => void;
}) {
  const names = useMemo(() => extractVars(action.prompt), [action]);
  const [values, setValues] = useState<Record<string, string>>({});
  return (
    <form
      className="oo-dialog"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
    >
      <strong>{t("vars.title")}: {action.label}</strong>
      {names.map((n, i) => (
        <label key={n}>
          {n}
          <input autoFocus={i === 0} value={values[n] ?? ""} onChange={(e) => setValues({ ...values, [n]: e.target.value })} />
        </label>
      ))}
      <div className="oo-row">
        <button type="submit">{t("vars.ok")}</button>
        <button type="button" onClick={onCancel}>{t("vars.cancel")}</button>
      </div>
    </form>
  );
}

function HistoryView({
  t,
  chats,
  onOpen,
  onDelete,
  onBack,
}: {
  t: T;
  chats: StoredChat[];
  onOpen: (c: StoredChat) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}) {
  const [query, setQuery] = useState("");
  const shown = searchChats(chats, query);
  return (
    <div className="oo-pane">
      <header>
        <button onClick={onBack}>← {t("settings.back")}</button>
        <input className="oo-grow" placeholder={t("history.search")} value={query} onChange={(e) => setQuery(e.target.value)} />
      </header>
      <div className="oo-history">
        {shown.length === 0 && <p className="oo-hint">{t("history.empty")}</p>}
        {shown.map((c) => (
          <div key={c.id} className="oo-history-item">
            <button className="oo-grow" onClick={() => onOpen(c)}>{c.title || "…"}</button>
            <button onClick={() => onDelete(c.id)} title={t("history.delete")} aria-label={t("history.delete")}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

const visibleText = (m: ChatMessage) => m.content.split(CONTEXT_SEP)[0];

export function ChatPane({ host }: { host: HostAdapter }) {
  return (
    <ErrorBoundary>
      <ChatPaneInner host={host} />
    </ErrorBoundary>
  );
}

function ChatPaneInner({ host }: { host: HostAdapter }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatId, setChatId] = useState(newChatId);
  const [chats, setChats] = useState<StoredChat[]>(loadChats);
  const [view, setView] = useState<View>("chat");
  const [pending, setPending] = useState<PromptAction | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [useContext, setUseContext] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const abort = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  const t = useMemo(() => makeT(settings.lang), [settings.lang]);
  const loggedIn = Boolean(settings.baseUrl && settings.token);

  const update = (patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  };
  const logout = () => update({ token: "" });
  const openUrl = (url: string) => (host.openUrl ? host.openUrl(url) : void window.open(url, "_blank", "noopener"));

  useEffect(() => {
    if (!loggedIn) return;
    listModels(settings)
      .then((m) => {
        setModels(m);
        if (!settings.model && m[0]) update({ model: m[0].id });
      })
      .catch((e: Error) => {
        setError(e.message);
        if (/\((401|403)\)/.test(e.message)) logout();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const runChat = async (history: ChatMessage[]) => {
    setMessages([...history, { role: "assistant", content: "" }]);
    setBusy(true);
    abort.current = new AbortController();
    let acc = "";
    try {
      const opts = {
        signal: abort.current.signal,
        systemPrompt: settings.systemPrompt,
        temperature: settings.temperature ?? undefined,
      };
      for await (const d of streamChat(settings, settings.model, history, opts)) {
        acc += d;
        setMessages([...history, { role: "assistant", content: acc }]);
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      abort.current = null;
      const finalMessages = acc ? [...history, { role: "assistant" as const, content: acc }] : history;
      setMessages(finalMessages);
      setChats((prev) => upsertChat(prev, chatId, finalMessages));
    }
  };

  const send = async (text: string, withContext = useContext) => {
    if (!text.trim() || busy) return;
    setError("");
    let content = text;
    if (withContext) {
      try {
        const ctx = await host.getContext();
        if (ctx.trim()) content = `${text}${CONTEXT_SEP}${ctx}`;
      } catch (e) {
        setError(t("chat.contextError", { error: e instanceof Error ? e.message : String(e) }));
        return;
      }
    }
    setInput("");
    await runChat([...messages, { role: "user", content }]);
  };

  const runAction = (a: PromptAction) => {
    if (busy) return;
    if (extractVars(a.prompt).length) setPending(a);
    else void send(a.prompt, true);
  };

  const regenerate = () => {
    if (busy) return;
    const lastUser = messages.map((m) => m.role).lastIndexOf("user");
    if (lastUser < 0) return;
    setError("");
    void runChat(messages.slice(0, lastUser + 1));
  };

  const edit = (i: number) => {
    if (busy) return;
    setInput(visibleText(messages[i]));
    setMessages(messages.slice(0, i));
  };

  const copy = (i: number) => {
    navigator.clipboard
      ?.writeText(messages[i].content)
      .then(() => {
        setCopied(i);
        setTimeout(() => setCopied(null), 1500);
      })
      .catch(() => setError("Clipboard"));
  };

  const newChat = () => {
    abort.current?.abort();
    setMessages([]);
    setChatId(newChatId());
    setError("");
  };

  const openChat = (c: StoredChat) => {
    setMessages(c.messages);
    setChatId(c.id);
    setView("chat");
  };

  const root = (children: React.ReactNode) => (
    <div className="oo-root" data-theme={settings.theme}>{children}</div>
  );

  if (!loggedIn) return root(<Login t={t} onDone={setSettings} />);
  if (view === "settings") {
    return root(<SettingsView settings={settings} update={update} t={t} openUrl={openUrl} onBack={() => setView("chat")} />);
  }
  if (view === "history") {
    return root(
      <HistoryView
        t={t}
        chats={chats}
        onOpen={openChat}
        onDelete={(id) => setChats((prev) => deleteChat(prev, id))}
        onBack={() => setView("chat")}
      />,
    );
  }

  const last = messages[messages.length - 1];
  const canApply = !busy && last?.role === "assistant" && last.content;
  const report = (e: unknown) => setError(e instanceof Error ? e.message : String(e));
  const slash = input.startsWith("/") && !input.includes("\n") ? input.slice(1).toLowerCase() : null;
  const slashMatches = slash === null ? [] : settings.actions.filter((a) => a.label.toLowerCase().includes(slash));
  const submitKey = (e: React.KeyboardEvent) =>
    e.key === "Enter" && (settings.sendKey === "enter" ? !e.shiftKey : e.ctrlKey);

  return root(
    <div className="oo-pane">
      <header>
        <select className="oo-grow" value={settings.model} onChange={(e) => update({ model: e.target.value })}>
          {models.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        <button className="oo-icon" onClick={newChat} title={t("header.newTitle")} aria-label={t("header.newTitle")}><IconPlus /></button>
        <button className="oo-icon" onClick={() => setView("history")} title={t("header.history")} aria-label={t("header.history")}><IconHistory /></button>
        <button className="oo-icon" onClick={() => setView("settings")} title={t("header.settings")} aria-label={t("header.settings")}><IconSettings /></button>
        <button className="oo-icon" onClick={logout} title={t("header.logout")} aria-label={t("header.logout")}><IconLogout /></button>
      </header>

      <div className="oo-actions">
        {settings.actions.filter((a) => a.label).map((a, i) => (
          <button key={i} className="oo-chip" disabled={busy} onClick={() => runAction(a)}>{a.label}</button>
        ))}
      </div>

      <div className="oo-messages">
        {messages.length === 0 && (
          <div className="oo-empty">
            <IconSparkle />
            <h3>{t("chat.empty.title")}</h3>
            <p>{t("chat.empty.hint")}</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`oo-msg oo-${m.role}`}>
            {m.role === "assistant" ? (m.content ? <Markdown text={m.content} /> : "…") : visibleText(m)}
            {m.content && !(busy && i === messages.length - 1) && (
              <div className="oo-msg-actions">
                <button onClick={() => copy(i)}>{copied === i ? t("chat.copied") : t("chat.copy")}</button>
                {m.role === "user" && <button onClick={() => edit(i)}>{t("chat.edit")}</button>}
                {m.role === "assistant" && i === messages.length - 1 && (
                  <button onClick={regenerate}>{t("chat.regenerate")}</button>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={bottom} />
      </div>

      {error && <p className="oo-error">{error}</p>}

      {canApply && (
        <div className="oo-apply">
          <button className="oo-primary" onClick={() => host.insert(last.content).catch(report)}>{t("chat.insert")}</button>
          <button onClick={() => host.replaceSelection(last.content).catch(report)}>{t("chat.replace")}</button>
        </div>
      )}

      {pending && (
        <VarsDialog
          t={t}
          action={pending}
          onCancel={() => setPending(null)}
          onSubmit={(values) => {
            const a = pending;
            setPending(null);
            void send(fillVars(a.prompt, values), true);
          }}
        />
      )}

      <footer>
        <label>
          <input type="checkbox" checked={useContext} onChange={(e) => setUseContext(e.target.checked)} />
          {t("chat.useContext", { host: host.hostName })}
        </label>
        {slashMatches.length > 0 && (
          <div className="oo-slash">
            {slashMatches.map((a, i) => (
              <button key={i} onClick={() => { setInput(""); runAction(a); }}>{a.label}</button>
            ))}
          </div>
        )}
        <div className="oo-composer">
          <textarea
            rows={2}
            value={input}
            placeholder={t("chat.placeholder")}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (submitKey(e)) {
                e.preventDefault();
                void send(input);
              }
            }}
          />
          {busy ? (
            <button className="oo-send" onClick={() => abort.current?.abort()} title={t("chat.stop")} aria-label={t("chat.stop")}><IconStop /></button>
          ) : (
            <button className="oo-send" onClick={() => send(input)} disabled={!input.trim()} title={t("chat.send")} aria-label={t("chat.send")}><IconSend /></button>
          )}
        </div>
      </footer>
    </div>,
  );
}
