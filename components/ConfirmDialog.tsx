"use client";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SERIF = `"Georgia","Times New Roman",serif`;
const SANS  = `var(--font-lato),"Inter",system-ui,sans-serif`;

interface ConfirmOptions {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

type Confirm = (opts: ConfirmOptions) => Promise<boolean>;

const Ctx = createContext<Confirm | null>(null);

export function useConfirm(): Confirm {
  const c = useContext(Ctx);
  if (!c) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return c;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    opts: ConfirmOptions;
    resolve: (v: boolean) => void;
  } | null>(null);

  const confirm = useCallback<Confirm>(opts => new Promise(resolve => {
    setState({ opts, resolve });
  }), []);

  const close = (value: boolean) => {
    if (!state) return;
    state.resolve(value);
    setState(null);
  };

  return (
    <Ctx.Provider value={confirm}>
      {children}
      <AnimatePresence>
        {state && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => close(false)}
              style={{ position: "fixed", inset: 0, zIndex: 9990, background: "rgba(0,0,0,.5)", backdropFilter: "blur(6px)" }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 280, damping: 24 }}
              role="dialog" aria-modal="true"
              style={{
                position: "fixed", zIndex: 9991,
                top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                width: "min(420px, 92vw)",
                background: "var(--cream)",
                border: "1.5px solid var(--pink-mid)",
                borderRadius: 20, padding: "1.7rem",
                boxShadow: "0 32px 80px rgba(var(--pink-deep-rgb),.3)",
                textAlign: "center",
              }}
            >
              <h3 style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "1.3rem", color: "var(--pink-deep)", margin: "0 0 0.5rem" }}>
                {state.opts.title}
              </h3>
              {state.opts.body && (
                <p style={{ fontFamily: SANS, fontSize: "0.85rem", color: "var(--muted)", margin: "0 0 1.3rem", lineHeight: 1.5 }}>
                  {state.opts.body}
                </p>
              )}
              <div style={{ display: "flex", gap: "0.7rem" }}>
                <button onClick={() => close(false)}
                  style={{
                    flex: 1, padding: "0.75rem", borderRadius: 12,
                    border: "1px solid rgba(var(--pink-rgb),.3)", background: "transparent",
                    color: "var(--text)", fontFamily: SANS, fontSize: "0.88rem",
                    cursor: "pointer", fontWeight: 600,
                  }}>
                  {state.opts.cancelLabel ?? "cancel"}
                </button>
                <button onClick={() => close(true)}
                  style={{
                    flex: 1, padding: "0.75rem", borderRadius: 12, border: "none",
                    background: state.opts.destructive
                      ? "linear-gradient(135deg, #f87171, #ef4444)"
                      : "linear-gradient(135deg, var(--pink), var(--pink-deep))",
                    color: "#fff",
                    fontFamily: SANS, fontSize: "0.88rem",
                    cursor: "pointer", fontWeight: 600,
                    boxShadow: state.opts.destructive
                      ? "0 4px 16px rgba(239,68,68,.35)"
                      : "0 4px 16px rgba(var(--pink-deep-rgb),.3)",
                  }}>
                  {state.opts.confirmLabel ?? "confirm"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Ctx.Provider>
  );
}
