import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * offlineQueue runs client-side and touches localStorage + navigator.onLine.
 * The test env is "node", so we stub the minimal globals and re-import the
 * module fresh per test (vi.resetModules) to reset its internal singletons
 * (the `flushing` guard, `listenersInstalled`). `window` is intentionally
 * left undefined so installListeners() no-ops — we drive flushQueue directly.
 */

function makeLocalStorage(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => (m.has(k) ? m.get(k)! : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
    clear: () => m.clear(),
    get length() { return m.size; },
    key: (i) => Array.from(m.keys())[i] ?? null,
  } as Storage;
}

type Q = typeof import("./offlineQueue");
let queuedFetch: Q["queuedFetch"];
let flushQueue: Q["flushQueue"];
let pendingCount: Q["pendingCount"];

beforeEach(async () => {
  vi.resetModules();
  (globalThis as Record<string, unknown>).localStorage = makeLocalStorage();
  (globalThis as Record<string, unknown>).navigator = { onLine: true };
  const mod = await import("./offlineQueue");
  ({ queuedFetch, flushQueue, pendingCount } = mod);
});

afterEach(() => {
  vi.restoreAllMocks();
  delete (globalThis as Record<string, unknown>).fetch;
  delete (globalThis as Record<string, unknown>).localStorage;
  delete (globalThis as Record<string, unknown>).navigator;
});

function setOnline(v: boolean) {
  (globalThis as Record<string, unknown>).navigator = { onLine: v };
}

function mockFetch(statuses: number[]) {
  const calls: string[] = [];
  let i = 0;
  const fn = vi.fn(async (url: string) => {
    calls.push(url);
    const status = statuses[Math.min(i, statuses.length - 1)];
    i++;
    return new Response(null, { status });
  });
  (globalThis as Record<string, unknown>).fetch = fn;
  return { calls };
}

describe("offlineQueue", () => {
  it("sends immediately and does not queue on a 2xx while online", async () => {
    mockFetch([200]);
    const res = await queuedFetch({ url: "/api/x", method: "POST", body: { a: 1 } });
    expect(res).toMatchObject({ ok: true, queued: false });
    expect(pendingCount()).toBe(0);
  });

  it("queues the request when offline", async () => {
    setOnline(false);
    const res = await queuedFetch({ url: "/api/x", method: "POST", body: { a: 1 } });
    expect(res).toMatchObject({ ok: true, queued: true });
    expect(pendingCount()).toBe(1);
  });

  it("queues on a 5xx (server sick — retry later)", async () => {
    mockFetch([500]);
    const res = await queuedFetch({ url: "/api/x", method: "POST" });
    expect(res).toMatchObject({ ok: true, queued: true });
    expect(pendingCount()).toBe(1);
  });

  it("drops on a 4xx (bad request — retrying won't help)", async () => {
    mockFetch([422]);
    const res = await queuedFetch({ url: "/api/x", method: "POST" });
    expect(res).toMatchObject({ ok: false, queued: false, status: 422 });
    expect(pendingCount()).toBe(0);
  });

  it("queues on a network error (offline shape)", async () => {
    (globalThis as Record<string, unknown>).fetch = vi.fn(async () => { throw new Error("network down"); });
    const res = await queuedFetch({ url: "/api/x", method: "PUT" });
    expect(res).toMatchObject({ ok: true, queued: true });
    expect(pendingCount()).toBe(1);
  });

  it("replays queued requests FIFO when back online", async () => {
    setOnline(false);
    await queuedFetch({ url: "/api/first", method: "POST" });
    await queuedFetch({ url: "/api/second", method: "POST" });
    expect(pendingCount()).toBe(2);

    setOnline(true);
    const { calls } = mockFetch([200, 200]);
    await flushQueue();

    expect(calls).toEqual(["/api/first", "/api/second"]);
    expect(pendingCount()).toBe(0);
  });

  it("stops flushing on a 5xx and preserves remaining order", async () => {
    setOnline(false);
    await queuedFetch({ url: "/api/a", method: "POST" });
    await queuedFetch({ url: "/api/b", method: "POST" });

    setOnline(true);
    const { calls } = mockFetch([500]); // first replay 500s
    await flushQueue();

    expect(calls).toEqual(["/api/a"]);   // stopped after the failure
    expect(pendingCount()).toBe(2);      // nothing consumed
  });

  it("drops a 4xx item during flush but continues with the rest", async () => {
    setOnline(false);
    await queuedFetch({ url: "/api/bad", method: "POST" });
    await queuedFetch({ url: "/api/good", method: "POST" });

    setOnline(true);
    const { calls } = mockFetch([400, 200]);
    await flushQueue();

    expect(calls).toEqual(["/api/bad", "/api/good"]);
    expect(pendingCount()).toBe(0); // both consumed (one dropped, one sent)
  });

  it("does not flush while offline", async () => {
    setOnline(false);
    await queuedFetch({ url: "/api/x", method: "POST" });
    const { calls } = mockFetch([200]);
    await flushQueue();
    expect(calls).toEqual([]);
    expect(pendingCount()).toBe(1);
  });
});
