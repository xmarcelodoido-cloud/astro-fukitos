export const UPSTREAM_TIMEOUT_MS = 20_000;

export class UpstreamTimeoutError extends Error {
  constructor() {
    super("O OpenFuture demorou para responder. Tente novamente em instantes. Se você iniciou um envio, confira o status antes de reenviar.");
    this.name = "UpstreamTimeoutError";
  }
}

// The deadline covers both connection establishment and reading the response body.
export async function readUpstream(url: string, init: RequestInit) {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new UpstreamTimeoutError());
      controller.abort();
    }, UPSTREAM_TIMEOUT_MS);
  });
  try {
    return await Promise.race([
      (async () => {
        const response = await fetch(url, { ...init, signal: controller.signal });
        const text = await response.text();
        return { response, text };
      })(),
      deadline,
    ]);
  } finally {
    clearTimeout(timer);
  }
}