"use client";
import { useEffect, useState } from "react";
import AdminOverview from "@/components/admin/AdminOverview";
import AdminCouplesTable from "@/components/admin/AdminCouplesTable";
import AdminActivityFeed from "@/components/admin/AdminActivityFeed";
import AdminAnalytics from "@/components/admin/AdminAnalytics";
import AdminHealth from "@/components/admin/AdminHealth";
import AdminCoupleDetail from "@/components/admin/AdminCoupleDetail";

type Gate = "loading" | "ok" | "unauthorized" | "forbidden" | "error";
type Tab = "overview" | "couples" | "activity" | "analytics" | "health";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "couples", label: "Couples" },
  { id: "activity", label: "Activity" },
  { id: "analytics", label: "Analytics" },
  { id: "health", label: "Health" },
];

export default function AdminPage() {
  const [gate, setGate] = useState<Gate>("loading");
  const [name, setName] = useState<string>("");
  const [tab, setTab] = useState<Tab>("overview");
  const [couple, setCouple] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/me")
      .then(async (r) => {
        if (r.ok) { const d = await r.json(); setName(d.name ?? ""); setGate("ok"); }
        else if (r.status === 401) setGate("unauthorized");
        else if (r.status === 403) setGate("forbidden");
        else setGate("error");
      })
      .catch(() => setGate("error"));
  }, []);

  if (gate !== "ok") {
    const msg =
      gate === "loading" ? "Checking access…"
      : gate === "unauthorized" ? "You need to sign in first."
      : gate === "forbidden" ? "This account doesn’t have admin access."
      : "Something went wrong loading the admin dashboard.";
    return (
      <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: "2rem", color: "var(--text)" }}>
        <div style={{ textAlign: "center", maxWidth: 360 }}>
          <h1 style={{ fontSize: "1.3rem", marginBottom: "0.5rem" }}>Admin</h1>
          <p style={{ color: "var(--muted, #888)" }}>{msg}</p>
          {gate === "unauthorized" && <a href="/" style={{ color: "var(--pink, #d6608a)" }}>Go to sign in →</a>}
        </div>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 1080, margin: "0 auto", padding: "1.5rem clamp(1rem, 3vw, 2rem) 4rem", color: "var(--text)" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: "1.25rem" }}>
        <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Admin dashboard</h1>
        {name && <span style={{ color: "var(--muted, #888)", fontSize: "0.85rem" }}>signed in as {name}</span>}
      </header>

      <nav style={{ display: "flex", gap: 4, marginBottom: "1.5rem", borderBottom: "1px solid color-mix(in srgb, var(--text,#333) 12%, transparent)" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "0.5rem 0.9rem", fontSize: "0.9rem", cursor: "pointer", background: "none", border: "none",
              color: tab === t.id ? "var(--text)" : "var(--muted, #888)",
              fontWeight: tab === t.id ? 700 : 500,
              borderBottom: tab === t.id ? "2px solid var(--pink, #d6608a)" : "2px solid transparent",
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "overview" && <AdminOverview onOpenCouple={setCouple} />}
      {tab === "couples" && <AdminCouplesTable onOpenCouple={setCouple} />}
      {tab === "activity" && <AdminActivityFeed />}
      {tab === "analytics" && <AdminAnalytics />}
      {tab === "health" && <AdminHealth />}

      {couple && <AdminCoupleDetail coupleId={couple} onClose={() => setCouple(null)} />}
    </main>
  );
}
