/**
 * Tiny structured logger.
 *
 * Vercel and most modern log sinks pick up JSON-serialized lines as
 * structured fields. No new dependency, no boot-time cost — just a clean
 * boundary so we never lose context (which route, which coupleId) when an
 * error is logged in prod.
 */

type Level = "info" | "warn" | "error";

interface LogPayload {
  msg: string;
  err?: unknown;
  [key: string]: unknown;
}

function emit(level: Level, payload: LogPayload) {
  const { err, ...rest } = payload;
  const record: Record<string, unknown> = {
    level,
    time: new Date().toISOString(),
    ...rest,
  };
  if (err instanceof Error) {
    record.error = { name: err.name, message: err.message, stack: err.stack };
  } else if (err !== undefined) {
    record.error = err;
  }

  const line = JSON.stringify(record);
  (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(line);
}

export const log = {
  info:  (payload: LogPayload) => emit("info", payload),
  warn:  (payload: LogPayload) => emit("warn", payload),
  error: (payload: LogPayload) => emit("error", payload),
};
