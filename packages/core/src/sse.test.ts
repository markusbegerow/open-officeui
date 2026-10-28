import { describe, expect, it } from "vitest";
import { readDeltas } from "./sse";

function streamOf(...chunks: string[]) {
  const enc = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(c) {
      chunks.forEach((x) => c.enqueue(enc.encode(x)));
      c.close();
    },
  });
}

describe("readDeltas", () => {
  it("collects deltas across chunk boundaries and stops at [DONE]", async () => {
    const body = streamOf(
      'data: {"choices":[{"delta":{"content":"Hal"}}]}\n\ndata: {"choices":[{"del',
      'ta":{"content":"lo"}}]}\n\ndata: [DONE]\n\n',
    );
    let out = "";
    for await (const d of readDeltas(body)) out += d;
    expect(out).toBe("Hallo");
  });

  it("skips malformed lines", async () => {
    const body = streamOf("data: nope\n", 'data: {"choices":[{"delta":{"content":"x"}}]}\n');
    const out: string[] = [];
    for await (const d of readDeltas(body)) out.push(d);
    expect(out).toEqual(["x"]);
  });
});
