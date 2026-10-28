import { afterEach, describe, expect, it, vi } from "vitest";
import { streamChat } from "./client";

const sse = (body: string) =>
  new Response(new ReadableStream({ start: (c) => { c.enqueue(new TextEncoder().encode(body)); c.close(); } }));

afterEach(() => vi.unstubAllGlobals());

describe("streamChat", () => {
  it("prepends the system prompt, sends temperature and yields deltas", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      sse('data: {"choices":[{"delta":{"content":"Hi"}}]}\n\ndata: [DONE]\n\n'),
    );
    vi.stubGlobal("fetch", fetchMock);

    const out: string[] = [];
    for await (const d of streamChat({ baseUrl: "https://x/", token: "t" }, "m", [{ role: "user", content: "yo" }], {
      systemPrompt: " Sei kurz ",
      temperature: 0.2,
    })) out.push(d);

    expect(out).toEqual(["Hi"]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://x/api/chat/completions");
    expect(JSON.parse(init.body)).toEqual({
      model: "m",
      messages: [{ role: "system", content: "Sei kurz" }, { role: "user", content: "yo" }],
      stream: true,
      temperature: 0.2,
    });
  });

  it("omits system message and temperature by default", async () => {
    const fetchMock = vi.fn().mockResolvedValue(sse("data: [DONE]\n\n"));
    vi.stubGlobal("fetch", fetchMock);
    for await (const _ of streamChat({ baseUrl: "https://x", token: "t" }, "m", [{ role: "user", content: "yo" }])) void _;
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      model: "m",
      messages: [{ role: "user", content: "yo" }],
      stream: true,
    });
  });

  it("throws with the HTTP status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 500 })));
    await expect(streamChat({ baseUrl: "https://x", token: "t" }, "m", []).next()).rejects.toThrow("(500)");
  });
});
