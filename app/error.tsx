"use client";
import { useEffect } from "react";
import { SERIF, SANS, SCRIPT } from "@/lib/typography";

/**
 * App-level error boundary. Catches render/runtime errors in any route segment
 * and shows a gentle recovery screen with a retry, rather than a white page.
 * (Per-component ErrorBoundary still handles localized failures.)
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surface to the console (and any attached logging) so it's debuggable.
    console.error("App error boundary caught:", error);
    // Report to the admin Health view (best-effort, never throws back into UI).
    try {
      const body = JSON.stringify({
        message: error?.message ?? "Unknown client error",
        stack: error?.stack,
        digest: error?.digest,
        path: typeof window !== "undefined" ? window.location.pathname : undefined,
      });
      void fetch("/api/client-error", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
    } catch { /* ignore */ }
  }, [error]);

  return (
    <main style={{
      minHeight: "100dvh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", textAlign: "center",
      padding: "2rem", gap: "0.4rem",
      background: "linear-gradient(160deg,var(--rose) 0%,var(--pink-light) 50%,var(--rose) 100%)",
    }}>
      <div style={{ fontSize: "3.4rem" }} aria-hidden>🩹</div>
      <h1 style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "clamp(1.8rem,5vw,2.6rem)", color: "var(--pink-deep)", margin: "0.2rem 0 0", fontWeight: 400 }}>
        something hiccuped
      </h1>
      <p style={{ fontFamily: SANS, fontSize: "0.95rem", color: "var(--text)", margin: "0.4rem 0 0", maxWidth: 380, lineHeight: 1.55 }}>
        A little something went wrong on our side. Your memories are safe — let&apos;s just try that again.
      </p>
      <div style={{ display: "flex", gap: "0.6rem", marginTop: "1.4rem", flexWrap: "wrap", justifyContent: "center" }}>
        <button onClick={reset} style={{
          fontFamily: SANS, fontSize: "0.95rem", fontWeight: 700, color: "#fff",
          background: "linear-gradient(135deg,var(--pink),var(--pink-deep))",
          border: "none", borderRadius: 50, padding: "0.8rem 1.7rem", cursor: "pointer",
          boxShadow: "0 6px 22px rgba(var(--pink-deep-rgb),.32)",
        }}>
          try again
        </button>
        <a href="/" style={{
          fontFamily: SANS, fontSize: "0.95rem", fontWeight: 600, color: "var(--pink-deep)",
          background: "rgba(var(--pink-rgb),.1)", border: "1px solid var(--pink-mid)",
          borderRadius: 50, padding: "0.8rem 1.5rem", textDecoration: "none",
        }}>
          go home
        </a>
      </div>
      {error?.digest && (
        <p style={{ fontFamily: SANS, fontSize: "0.7rem", color: "var(--muted)", marginTop: "1rem" }}>
          ref: {error.digest}
        </p>
      )}
      <p style={{ fontFamily: SCRIPT, fontSize: "1rem", color: "var(--muted)", marginTop: "0.6rem" }}>
        always us 💗
      </p>
    </main>
  );
}
