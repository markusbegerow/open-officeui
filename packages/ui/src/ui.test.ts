import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractVars, fillVars } from "./actions";
import { isNewer, VERSION } from "./AboutTab";
import { chatTitle, searchChats, upsertChat, MAX_CHATS, type StoredChat } from "./history";
import { DICTS, translate } from "./i18n";

describe("prompt variables", () => {
  it("extracts unique variables in order and fills them", () => {
    const p = "Ton {{ton}}, Sprache {{ sprache }}, nochmal {{ton}}";
    expect(extractVars(p)).toEqual(["ton", "sprache"]);
    expect(fillVars(p, { ton: "freundlich", sprache: "Englisch" })).toBe("Ton freundlich, Sprache Englisch, nochmal freundlich");
  });
});

describe("history", () => {
  const msg = (role: "user" | "assistant", content: string) => ({ role, content });

  it("derives the title from the instruction, not the host context", () => {
    expect(chatTitle([msg("user", "Fasse zusammen\n\n---\nlanger Dokumenttext")])).toBe("Fasse zusammen");
  });

  it("does not store empty chats, caps the list, and keeps newest first", () => {
    expect(upsertChat([], "a", [])).toEqual([]);
    let chats: StoredChat[] = [];
    for (let i = 0; i < MAX_CHATS + 5; i++) chats = upsertChat(chats, `c${i}`, [msg("user", `m${i}`)]);
    expect(chats).toHaveLength(MAX_CHATS);
    expect(chats[0].id).toBe(`c${MAX_CHATS + 4}`);
    chats = upsertChat(chats, "c10", [msg("user", "again")]);
    expect(chats[0].id).toBe("c10");
    expect(chats.filter((c) => c.id === "c10")).toHaveLength(1);
  });

  it("searches titles and message text", () => {
    const chats = upsertChat([], "a", [msg("user", "Hallo"), msg("assistant", "Rechnung erstellt")]);
    expect(searchChats(chats, "rechnung")).toHaveLength(1);
    expect(searchChats(chats, "xyz")).toHaveLength(0);
  });
});

describe("i18n", () => {
  it("has the same keys in every language", () => {
    expect(Object.keys(DICTS.en).sort()).toEqual(Object.keys(DICTS.de).sort());
  });

  it("interpolates and keeps unknown placeholders", () => {
    expect(translate("en", "chat.useContext", { host: "Word" })).toBe("Include Word selection");
    expect(translate("en", "settings.prompts.prompt")).toContain("{{name}}");
  });
});

describe("release version", () => {
  it("VERSION matches the root package.json (the release workflow checks the tag against both)", () => {
    const pkg = JSON.parse(readFileSync(new URL("../../../package.json", import.meta.url), "utf8"));
    expect(VERSION).toBe(pkg.version);
  });
});

describe("update check", () => {
  it("compares versions numerically", () => {
    expect(isNewer("v0.10.0", "0.9.0")).toBe(true);
    expect(isNewer("v0.0.1", "0.0.1")).toBe(false);
    expect(isNewer("0.0.1", "0.1.0")).toBe(false);
  });
});
