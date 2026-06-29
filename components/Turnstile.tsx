"use client";
/**
 * Cloudflare Turnstile widget (explicit render).
 *
 * Renders the bot-challenge box on the registration form and reports the
 * resulting token up via `onVerify`. When NEXT_PUBLIC_TURNSTILE_SITE_KEY is
 * unset the component renders nothing and calls `onVerify("")` once, so the
 * form stays usable in dev / un-configured deploys — the server then skips
 * verification too (see lib/turnstile.ts).
 *
 * Loads the Turnstile script lazily and once, shared across mounts. Requires
 * the challenges.cloudflare.com origin in the CSP (script-src + frame-src).
 */
import { useEffect, useRef } from "react";
import { publicEnv } from "@/lib/env";

interface TurnstileApi {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
      theme?: "light" | "dark" | "auto";
      size?: "normal" | "flexible" | "compact";
    },
  ) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let scriptPromise: Promise<void> | null = null;

/** Load the Turnstile script once; subsequent callers share the promise. */
function loadTurnstile(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null; // allow a retry on a later mount
      reject(new Error("Failed to load Turnstile"));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

interface Props {
  /** Receives the solved token, "" on expiry/error/disabled. */
  onVerify: (token: string) => void;
}

export default function Turnstile({ onVerify }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  // Keep the latest callback without re-running the render effect.
  const onVerifyRef = useRef(onVerify);
  onVerifyRef.current = onVerify;

  const siteKey = publicEnv.TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey) {
      // Not configured — let the form proceed unchallenged.
      onVerifyRef.current("");
      return;
    }
    let cancelled = false;
    loadTurnstile()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(ref.current, {
          sitekey: siteKey,
          theme: "auto",
          callback: (token) => onVerifyRef.current(token),
          "expired-callback": () => onVerifyRef.current(""),
          "error-callback": () => onVerifyRef.current(""),
        });
      })
      .catch(() => {
        // Script blocked/unreachable. Don't trap the user behind a box that
        // never appears — let them submit; the server still decides.
        if (!cancelled) onVerifyRef.current("");
      });
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) {
        try { window.turnstile.remove(widgetId.current); } catch {}
        widgetId.current = null;
      }
    };
  }, [siteKey]);

  if (!siteKey) return null;
  return <div ref={ref} style={{ marginTop: 4 }} />;
}
