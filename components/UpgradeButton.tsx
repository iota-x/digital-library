"use client";
/**
 * Upgrade-to-premium CTA. Drives the Razorpay one-time checkout:
 *   create-order → open Checkout → verify → refresh the user (isPremium flips).
 *
 * Lazy-loads the Checkout script once (shared promise, same pattern as
 * components/Turnstile.tsx). Requires *.razorpay.com in the CSP. Safe to render
 * anywhere; if billing isn't configured the create-order call returns an error
 * and we surface a gentle message rather than throwing.
 */
import { useState } from "react";
import { fetchUserData } from "@/lib/userStore";
import { publicEnv } from "@/lib/env";

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}
interface RazorpayOptions {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  theme?: { color?: string };
  handler: (r: RazorpayResponse) => void;
  modal?: { ondismiss?: () => void };
}
interface RazorpayInstance { open: () => void }
declare global {
  interface Window {
    Razorpay?: new (opts: RazorpayOptions) => RazorpayInstance;
  }
}

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
let scriptPromise: Promise<void> | null = null;

function loadCheckout(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { scriptPromise = null; reject(new Error("Failed to load checkout")); };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

interface Props {
  /** Button label. */
  children?: React.ReactNode;
  /** Optional callback once the upgrade is confirmed. */
  onUpgraded?: () => void;
  style?: React.CSSProperties;
  className?: string;
}

export default function UpgradeButton({ children, onUpgraded, style, className }: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const start = async () => {
    setErr("");
    setBusy(true);
    try {
      const orderRes = await fetch("/api/billing/create-order", { method: "POST" });
      const order = await orderRes.json();
      if (!orderRes.ok || !order.ok) {
        setErr(order.error || "Couldn't start checkout. Please try again.");
        setBusy(false);
        return;
      }
      // Already unlocked (e.g. grandfathered / paid on another device).
      if (order.alreadyPremium) {
        await fetchUserData();
        onUpgraded?.();
        setBusy(false);
        return;
      }

      await loadCheckout();
      if (!window.Razorpay) {
        setErr("Couldn't load checkout. Please try again.");
        setBusy(false);
        return;
      }

      // Modal owns the flow from here — `busy` is cleared by the handler/dismiss.
      const rzp = new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: publicEnv.APP_NAME,
        description: "Lifetime premium 💝",
        theme: { color: "#ec4899" },
        handler: async (resp) => {
          try {
            const vr = await fetch("/api/billing/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: resp.razorpay_order_id,
                paymentId: resp.razorpay_payment_id,
                signature: resp.razorpay_signature,
              }),
            });
            const vd = await vr.json();
            if (vr.ok && vd.ok) {
              await fetchUserData();
              onUpgraded?.();
            } else {
              setErr("Payment went through but we couldn't confirm it yet — refresh in a moment.");
            }
          } catch {
            setErr("Payment went through but we couldn't confirm it yet — refresh in a moment.");
          } finally {
            setBusy(false);
          }
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      rzp.open();
    } catch {
      setErr("Something went wrong. Please try again.");
      setBusy(false);
    }
  };

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 4 }}>
      <button
        onClick={start}
        disabled={busy}
        className={className}
        style={{
          padding: "0.6rem 1.1rem", borderRadius: 999, border: "none", cursor: busy ? "wait" : "pointer",
          background: "linear-gradient(135deg,#f9a8d4,#ec4899)", color: "#fff", fontWeight: 700,
          opacity: busy ? 0.7 : 1, ...style,
        }}
      >
        {busy ? "opening…" : (children ?? "Unlock premium 💝")}
      </button>
      {err && <span style={{ color: "#f43f5e", fontSize: "0.78rem" }}>{err}</span>}
    </span>
  );
}
