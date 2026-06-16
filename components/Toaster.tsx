"use client";
import { createContext, useCallback, useContext, useState, useEffect, useRef, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SANS = `var(--font-lato),"Inter",system-ui,sans-serif`;

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  /** Body text. Required. */
  message: string;
  /** Optional title shown above the message. */
  title?: string;
  /** Lifetime in ms. Default 4000. Set to 0 to make it sticky. */
  durationMs?: number;
  /** Optional inline button (e.g. "Undo"). */
  action?: ToastAction;
  /** Visual variant. */
  variant?: "info" | "success" | "warn" | "error";
  /** Stable ID — if provided, calling again with same id replaces the existing toast. */
  id?: string;
}

interface Toast extends Required<Pick<ToastOptions, "id" | "message" | "durationMs" | "variant">> {
  title?: string;
  action?: ToastAction;
  expiresAt: number;
}

interface ToasterApi {
  toast: (opts: ToastOptions) => string;
  dismiss: (id: string) => void;
}

const Ctx = createContext<ToasterApi | null>(null);

export function useToast(): ToasterApi {
  const c = useContext(Ctx);
  if (!c) throw new Error("useToast must be used inside <ToasterProvider>");
  return c;
}

let _counter = 0;
const nextId = () => `t${++_counter}`;

export function ToasterProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) { clearTimeout(timer); timersRef.current.delete(id); }
  }, []);

  const toast = useCallback((opts: ToastOptions): string => {
    const id = opts.id ?? nextId();
    const durationMs = opts.durationMs ?? 4000;
    const next: Toast = {
      id,
      title: opts.title,
      message: opts.message,
      durationMs,
      variant: opts.variant ?? "info",
      action: opts.action,
      expiresAt: Date.now() + durationMs,
    };
    setToasts(prev => {
      const without = prev.filter(t => t.id !== id);
      return [...without, next];
    });
    const oldTimer = timersRef.current.get(id);
    if (oldTimer) clearTimeout(oldTimer);
    if (durationMs > 0) {
      const t = setTimeout(() => dismiss(id), durationMs);
      timersRef.current.set(id, t);
    }
    return id;
  }, [dismiss]);

  useEffect(() => () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current.clear();
  }, []);

  return (
    <Ctx.Provider value={{ toast, dismiss }}>
      {children}
      <ToastViewport toasts={toasts} dismiss={dismiss} />
    </Ctx.Provider>
  );
}

const COLORS: Record<Toast["variant"], { accent: string; bg: string }> = {
  info:    { accent: "var(--pink-deep)",  bg: "var(--cream)" },
  success: { accent: "#16a34a",            bg: "var(--cream)" },
  warn:    { accent: "#d97706",            bg: "var(--cream)" },
  error:   { accent: "#ef4444",            bg: "var(--cream)" },
};

function ToastViewport({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      style={{
        position: "fixed",
        bottom: "max(1.2rem, env(safe-area-inset-bottom))",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9990,
        display: "flex", flexDirection: "column", gap: "0.55rem",
        pointerEvents: "none",
        maxWidth: "92vw", width: "min(420px, 92vw)",
      }}
    >
      <AnimatePresence initial={false}>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            role={t.variant === "error" ? "alert" : "status"}
            aria-live={t.variant === "error" ? "assertive" : "polite"}
            style={{
              pointerEvents: "auto",
              background: COLORS[t.variant].bg,
              border: `1.5px solid ${COLORS[t.variant].accent}`,
              borderRadius: 14,
              padding: "0.75rem 1rem",
              boxShadow: "0 12px 36px rgba(0,0,0,.22)",
              display: "flex", alignItems: "center", gap: "0.8rem",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              {t.title && (
                <p style={{ fontFamily: SANS, fontSize: "0.82rem", fontWeight: 700, color: COLORS[t.variant].accent, margin: 0, lineHeight: 1.3 }}>
                  {t.title}
                </p>
              )}
              <p style={{ fontFamily: SANS, fontSize: "0.85rem", color: "var(--text)", margin: 0, lineHeight: 1.4 }}>
                {t.message}
              </p>
            </div>
            {t.action && (
              <button
                onClick={() => { t.action!.onClick(); dismiss(t.id); }}
                style={{
                  fontFamily: SANS, fontSize: "0.78rem", fontWeight: 700,
                  color: COLORS[t.variant].accent,
                  background: "transparent",
                  border: `1.5px solid ${COLORS[t.variant].accent}`,
                  padding: "0.4rem 0.9rem",
                  borderRadius: 50,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                {t.action.label}
              </button>
            )}
            <button
              onClick={() => dismiss(t.id)}
              aria-label="dismiss"
              style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "0.95rem", padding: "0 0.2rem", flexShrink: 0 }}>
              ✕
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
