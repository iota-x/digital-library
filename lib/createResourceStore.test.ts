import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createResourceStore } from "./createResourceStore";

/**
 * createResourceStore is client-side SWR. We exercise the non-hook surface
 * (refresh / setCache / addItem / removeWhere / invalidate) under stubbed
 * browser globals. Each test uses a unique storageKey so the module-level
 * singletons inside different stores never collide.
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

const flush = () => new Promise((r) => setTimeout(r, 0));
let keyN = 0;
const uniqueKey = () => `test_store_${keyN++}`;

interface Row { id: string; v: number }

beforeEach(() => {
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
});

afterEach(() => {
  vi.restoreAllMocks();
  const g = globalThis as Record<string, unknown>;
  delete g.fetch; delete g.localStorage; delete g.window; delete g.document;
});

function store(key = uniqueKey()) {
  return createResourceStore<Row>({ storageKey: key, endpoint: "/api/test", pollMs: 0 });
}

describe("createResourceStore", () => {
  it("setCache persists to localStorage under storageKey", () => {
    const key = uniqueKey();
    const s = store(key);
    s.setCache([{ id: "a", v: 1 }]);
    expect(JSON.parse(localStorage.getItem(key)!)).toEqual([{ id: "a", v: 1 }]);
  });

  it("addItem appends to the cache", () => {
    const key = uniqueKey();
    const s = store(key);
    s.setCache([{ id: "a", v: 1 }]);
    s.addItem({ id: "b", v: 2 });
    expect(JSON.parse(localStorage.getItem(key)!)).toEqual([
      { id: "a", v: 1 },
      { id: "b", v: 2 },
    ]);
  });

  it("removeWhere drops matching items", () => {
    const key = uniqueKey();
    const s = store(key);
    s.setCache([{ id: "a", v: 1 }, { id: "b", v: 2 }, { id: "c", v: 3 }]);
    s.removeWhere((r) => r.v === 2);
    expect(JSON.parse(localStorage.getItem(key)!)).toEqual([
      { id: "a", v: 1 },
      { id: "c", v: 3 },
    ]);
  });

  it("invalidate clears the persisted cache", () => {
    const key = uniqueKey();
    const s = store(key);
    s.setCache([{ id: "a", v: 1 }]);
    s.invalidate();
    expect(localStorage.getItem(key)).toBeNull();
  });

  it("refresh fetches the endpoint and updates the cache", async () => {
    const key = uniqueKey();
    const s = store(key);
    (globalThis as Record<string, unknown>).fetch = vi.fn(
      async () => new Response(JSON.stringify([{ id: "x", v: 9 }]), { status: 200 }),
    );
    s.refresh();
    await flush();
    expect(JSON.parse(localStorage.getItem(key)!)).toEqual([{ id: "x", v: 9 }]);
  });

  it("refresh ignores a non-array response (defensive against error payloads)", async () => {
    const key = uniqueKey();
    const s = store(key);
    s.setCache([{ id: "a", v: 1 }]);
    (globalThis as Record<string, unknown>).fetch = vi.fn(
      async () => new Response(JSON.stringify({ error: "boom" }), { status: 500 }),
    );
    s.refresh();
    await flush();
    // Cache untouched — the bad payload was rejected
    expect(JSON.parse(localStorage.getItem(key)!)).toEqual([{ id: "a", v: 1 }]);
  });

  it("refresh coalesces concurrent calls (single in-flight fetch)", async () => {
    const s = store();
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify([{ id: "x", v: 1 }]), { status: 200 }),
    );
    (globalThis as Record<string, unknown>).fetch = fetchMock;
    s.refresh();
    s.refresh();
    s.refresh();
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
