export type SseHandlers<T> = {
  onStart?: () => void;
  onDelta?: (text: string) => void;
  onDone?: (result: T) => void;
  onError?: (message: string) => void;
};

export async function postSseStream<T>(
  url: string,
  token: string,
  body: unknown,
  handlers: SseHandlers<T>,
  signal?: AbortSignal
): Promise<T | null> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "text/event-stream",
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error("Streaming request failed.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalResult: T | null = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const frames = buffer.split("\n\n");
    buffer = frames.pop() || "";

    for (const frame of frames) {
      if (!frame.trim()) continue;
      const eventMatch = frame.match(/^event: (.+)$/m);
      const dataMatch = frame.match(/^data: (.+)$/m);
      if (!eventMatch || !dataMatch) continue;

      const event = eventMatch[1];
      const data = JSON.parse(dataMatch[1]);

      if (event === "start") handlers.onStart?.();
      if (event === "delta") handlers.onDelta?.(data.text as string);
      if (event === "done") {
        finalResult = data.result as T;
        handlers.onDone?.(finalResult);
      }
      if (event === "error") handlers.onError?.(data.message as string);
    }
  }

  return finalResult;
}
