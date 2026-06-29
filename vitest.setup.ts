// vitest's "node" environment doesn't expose the global Web Crypto that browsers
// (and our client code) rely on. Polyfill it from Node's implementation so
// lib/crypto.ts can be unit-tested without bundling node:crypto into the app.
import { webcrypto } from "node:crypto";

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
}
