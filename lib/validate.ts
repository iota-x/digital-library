/**
 * Tiny zero-dependency schema validator (zod-flavoured).
 *
 * The app hand-validates request bodies per route — easy to drift, easy to
 * miss a field, and malformed input reaches Mongo as-is. This adds a small
 * declarative layer so a route can state its expected shape once and reject
 * bad input with a clear message before touching the DB.
 *
 * We don't pull in `zod` itself: the project pins a deliberately small
 * dependency set, and our needs (strings, numbers, bools, enums, arrays,
 * nested objects, optionals) fit in ~100 lines with no runtime cost.
 *
 * Usage:
 *   const Schema = v.object({
 *     date: v.string({ min: 1 }),
 *     mood: v.optional(v.string()),
 *     special: v.optional(v.boolean()),
 *   });
 *   const parsed = Schema(body);
 *   if (!parsed.ok) return badRequest(parsed.error);
 *   parsed.value // fully typed
 */

import { NextResponse } from "next/server";

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };
export type Validator<T> = (value: unknown, path?: string) => Result<T>;
export type Infer<V> = V extends Validator<infer T> ? T : never;

function fail(path: string, msg: string): Result<never> {
  return { ok: false, error: path ? `${path}: ${msg}` : msg };
}

interface StringOpts { min?: number; max?: number; pattern?: RegExp; trim?: boolean }
function string(opts: StringOpts = {}): Validator<string> {
  return (value, path = "") => {
    if (typeof value !== "string") return fail(path, "must be a string");
    const s = opts.trim ? value.trim() : value;
    if (opts.min !== undefined && s.length < opts.min) return fail(path, `must be at least ${opts.min} char(s)`);
    if (opts.max !== undefined && s.length > opts.max) return fail(path, `must be at most ${opts.max} char(s)`);
    if (opts.pattern && !opts.pattern.test(s)) return fail(path, "has an invalid format");
    return { ok: true, value: s };
  };
}

interface NumberOpts { min?: number; max?: number; int?: boolean }
function number(opts: NumberOpts = {}): Validator<number> {
  return (value, path = "") => {
    if (typeof value !== "number" || !Number.isFinite(value)) return fail(path, "must be a number");
    if (opts.int && !Number.isInteger(value)) return fail(path, "must be an integer");
    if (opts.min !== undefined && value < opts.min) return fail(path, `must be ≥ ${opts.min}`);
    if (opts.max !== undefined && value > opts.max) return fail(path, `must be ≤ ${opts.max}`);
    return { ok: true, value };
  };
}

function boolean(): Validator<boolean> {
  return (value, path = "") =>
    typeof value === "boolean" ? { ok: true, value } : fail(path, "must be a boolean");
}

function literal<const T extends readonly (string | number)[]>(...allowed: T): Validator<T[number]> {
  return (value, path = "") =>
    allowed.includes(value as T[number])
      ? { ok: true, value: value as T[number] }
      : fail(path, `must be one of: ${allowed.join(", ")}`);
}

/** Marks a field as allowed-to-be-missing (undefined). Null is NOT accepted. */
function optional<T>(inner: Validator<T>): Validator<T | undefined> {
  return (value, path = "") =>
    value === undefined ? { ok: true, value: undefined } : inner(value, path);
}

function array<T>(inner: Validator<T>, opts: { max?: number } = {}): Validator<T[]> {
  return (value, path = "") => {
    if (!Array.isArray(value)) return fail(path, "must be an array");
    if (opts.max !== undefined && value.length > opts.max) return fail(path, `must have at most ${opts.max} item(s)`);
    const out: T[] = [];
    for (let i = 0; i < value.length; i++) {
      const r = inner(value[i], `${path}[${i}]`);
      if (!r.ok) return r;
      out.push(r.value);
    }
    return { ok: true, value: out };
  };
}

type Shape = Record<string, Validator<unknown>>;
type ObjectOf<S extends Shape> = { [K in keyof S]: Infer<S[K]> };

function object<S extends Shape>(shape: S): Validator<ObjectOf<S>> {
  return (value, path = "") => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return fail(path, "must be an object");
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(shape)) {
      const r = shape[key](obj[key], path ? `${path}.${key}` : key);
      if (!r.ok) return r;
      if (r.value !== undefined) out[key] = r.value;
    }
    return { ok: true, value: out as ObjectOf<S> };
  };
}

/** A free-form record (object) with validated values, e.g. Record<string, T>. */
function record<T>(inner: Validator<T>): Validator<Record<string, T>> {
  return (value, path = "") => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return fail(path, "must be an object");
    const obj = value as Record<string, unknown>;
    const out: Record<string, T> = {};
    for (const key of Object.keys(obj)) {
      const r = inner(obj[key], `${path}.${key}`);
      if (!r.ok) return r;
      out[key] = r.value;
    }
    return { ok: true, value: out };
  };
}

export const v = { string, number, boolean, literal, optional, array, object, record };

/** Standard 400 response for a validation failure. */
export function badRequest(error: string): NextResponse {
  return NextResponse.json({ error }, { status: 400 });
}

/**
 * Parse + validate a request's JSON body against a schema. Returns a Result so
 * callers stay terse:
 *   const parsed = await parseBody(req, Schema);
 *   if (!parsed.ok) return badRequest(parsed.error);
 */
export async function parseBody<T>(req: Request, schema: Validator<T>): Promise<Result<T>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { ok: false, error: "invalid JSON body" };
  }
  return schema(body);
}
