import { afterEach, describe, expect, it, vi } from "vitest";
import { readUpstream, UpstreamTimeoutError } from "../../supabase/functions/proxy-openfuture/upstream";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("OpenFuture deadline", () => {
  it("stops a stalled connection after 20 seconds", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    vi.stubGlobal("fetch", vi.fn((_url, init) => {
      signal = init.signal;
      return new Promise(() => {});
    }));
    const result = readUpstream("https://example.test/api/dashboard", {});
    const rejection = expect(result).rejects.toBeInstanceOf(UpstreamTimeoutError);
    await vi.advanceTimersByTimeAsync(20_000);
    await rejection;
    expect(signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("also stops a response whose body never finishes", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ text: () => new Promise(() => {}) }));
    const result = readUpstream("https://example.test/api/dashboard", {});
    const rejection = expect(result).rejects.toBeInstanceOf(UpstreamTimeoutError);
    await vi.advanceTimersByTimeAsync(20_000);
    await rejection;
  });

  it("returns a completed response and clears the deadline without retrying", async () => {
    vi.useFakeTimers();
    const response = { text: async () => '{"ok":true}' };
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal("fetch", fetchMock);
    expect(await readUpstream("https://example.test/api/dashboard", {})).toEqual({ response, text: '{"ok":true}' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});