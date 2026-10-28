/** Parses an OpenAI-style SSE stream and yields content deltas. */
export async function* readDeltas(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const raw of lines) {
        const line = raw.trim();
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") return;
        try {
          const delta = JSON.parse(data)?.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta) yield delta;
        } catch {
          // ignore malformed keep-alive lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
