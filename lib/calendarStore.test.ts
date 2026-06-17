import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * calendarStore is a client-side singleton owning the shared SSE relay.
 * We stub browser globals (localStorage, window, a capturing EventSource)
 * and re-import fresh per test so module state (_cache, _sseHealthy) resets.
 */

const SESSION_KEY = "cal_cache_v2";

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

interface FakeES {
  url: string;
  onopen?: () => void;
  onmessage?: (e: { data: string }) => void;
  onerror?: () => void;
  close: () => void;
}
let esInstances: FakeES[] = [];

const flush = () => new Promise((r) => setTimeout(r, 0));
type Mod = typeof import("./calendarStore");
let mod: Mod;

function readSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

beforeEach(async () => {
  vi.resetModules();
  esInstances = [];
  const g = globalThis as Record<string, unknown>;
  g.localStorage = makeLocalStorage();
  g.window = new EventTarget();
  g.document = Object.assign(new EventTarget(), { visibilityState: "visible" });
  if (!g.CustomEvent) {
    g.CustomEvent = class extends Event {
      detail: unknown;
      constructor(type: string, opts?: { detail?: unknown }) { super(type); this.detail = opts?.detail; }
    };
  }
  g.EventSource = class {
    onopen?: () => void;
    onmessage?: (e: { data: string }) => void;
    onerror?: () => void;
    url: string;
    constructor(url: string) { this.url = url; esInstances.push(this as unknown as FakeES); }
    close() {}
  };
  g.fetch = vi.fn(async () => new Response(JSON.stringify([]), { status: 200 }));
  mod = await import("./calendarStore");
});

afterEach(() => {
  vi.restoreAllMocks();
  const g = globalThis as Record<string, unknown>;
  delete g.fetch; delete g.localStorage; delete g.window; delete g.document; delete g.EventSource;
});

describe("calendarStore", () => {
  it("starts disconnected", () => {
    expect(mod.isRealtimeConnected()).toBe(false);
  });

  it("updateCalendarCache adds a new entry and persists it", async () => {
    await mod.fetchCalendarData(true); // seeds _cache = []
    mod.updateCalendarCache({ date: "2026-01-01", note: "hi" } as never);
    expect(readSession()).toEqual([{ date: "2026-01-01", note: "hi" }]);
  });

  it("updateCalendarCache replaces an existing entry for the same date", async () => {
    await mod.fetchCalendarData(true);
    mod.updateCalendarCache({ date: "2026-01-01", note: "first" } as never);
    mod.updateCalendarCache({ date: "2026-01-01", note: "second" } as never);
    expect(readSession()).toEqual([{ date: "2026-01-01", note: "second" }]);
  });

  it("deleteFromCalendarCache removes by date", async () => {
    await mod.fetchCalendarData(true);
    mod.updateCalendarCache({ date: "2026-01-01", note: "a" } as never);
    mod.updateCalendarCache({ date: "2026-01-02", note: "b" } as never);
    mod.deleteFromCalendarCache("2026-01-01");
    expect(readSession()).toEqual([{ date: "2026-01-02", note: "b" }]);
  });

  it("opens an SSE connection after the first fetch", async () => {
    await mod.fetchCalendarData(true);
    expect(esInstances.length).toBe(1);
    expect(esInstances[0].url).toContain("/api/calendar/stream");
  });

  it("marks realtime connected on SSE open and emits a status event", async () => {
    await mod.fetchCalendarData(true);
    const statuses: boolean[] = [];
    window.addEventListener("annapp:sse-status", (e) =>
      statuses.push((e as CustomEvent).detail.connected));
    esInstances[0].onopen?.();
    expect(mod.isRealtimeConnected()).toBe(true);
    expect(statuses).toEqual([true]);
  });

  it("applies an 'update' frame pushed over SSE to the cache", async () => {
    await mod.fetchCalendarData(true);
    esInstances[0].onmessage?.({ data: JSON.stringify({ type: "update", entry: { date: "2026-02-14", note: "valentines" } }) });
    expect(readSession()).toEqual([{ date: "2026-02-14", note: "valentines" }]);
  });

  it("applies a 'delete' frame pushed over SSE to the cache", async () => {
    await mod.fetchCalendarData(true);
    mod.updateCalendarCache({ date: "2026-02-14", note: "x" } as never);
    esInstances[0].onmessage?.({ data: JSON.stringify({ type: "delete", date: "2026-02-14" }) });
    expect(readSession()).toEqual([]);
  });

  it("forwards non-calendar SSE frames as annapp:sse window events", async () => {
    await mod.fetchCalendarData(true);
    const relayed: unknown[] = [];
    window.addEventListener("annapp:sse", (e) => relayed.push((e as CustomEvent).detail));
    esInstances[0].onmessage?.({ data: JSON.stringify({ type: "presence", userId: "u1" }) });
    expect(relayed).toEqual([{ type: "presence", userId: "u1" }]);
  });

  it("invalidate clears the cache and marks realtime disconnected", async () => {
    await mod.fetchCalendarData(true);
    esInstances[0].onopen?.();
    expect(mod.isRealtimeConnected()).toBe(true);
    mod.invalidateCalendarCache();
    expect(mod.isRealtimeConnected()).toBe(false);
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });
});
