"use client";
import { useEffect, useState } from "react";
import { card, muted, pill, relativeTime } from "./adminStyles";

interface FeedItem {
  kind: "auth" | "content";
  type: string; label: string;
  coupleId: string | null; coupleName?: string | null;
  email?: string | null; ip?: string | null; at: string;
}

const FILTERS: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "login", label: "Logins" },
  { value: "login_failed", label: "Failed logins" },
  { value: "verify_email", label: "Verifications" },
  { value: "content", label: "Content" },
];

function accentFor(item: FeedItem): string {
  if (item.type === "login_failed") return "var(--muted, #888)";
  if (item.kind === "content") return "var(--rose, #c47)";
  return "var(--pink, #d6608a)";
}

export default function AdminActivityFeed() {
  const [type, setType] = useState("");
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(null); setError(null);
    const params = new URLSearchParams({ limit: "100" });
    if (type) params.set("type", type);
    fetch(`/api/admin/events?${params}`)
      .then((r) => r.json())
      .then((d) => (d.ok ? setItems(d.items) : setError(d.error ?? "Failed")))
      .catch(() => setError("Network error"));
  }, [type]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setType(f.value)}
            style={{
              padding: "0.3rem 0.7rem", borderRadius: 999, fontSize: "0.8rem", cursor: "pointer",
              border: "1px solid color-mix(in srgb, var(--text,#333) 14%, transparent)",
              background: type === f.value ? "var(--pink, #d6608a)" : "var(--cream,#fff)",
              color: type === f.value ? "#fff" : "var(--text)",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <p style={muted}>Couldn’t load: {error}</p>}
      {!items && !error && <p style={muted}>Loading…</p>}

      {items && (
        <div style={{ ...card, padding: 0 }}>
          {items.length === 0 && <div style={{ padding: "1rem", ...muted }}>No activity yet.</div>}
          {items.map((it, i) => (
            <div
              key={i}
              style={{
                display: "flex", gap: 10, alignItems: "baseline", padding: "0.6rem 0.85rem",
                borderBottom: i < items.length - 1 ? "1px solid color-mix(in srgb, var(--text,#333) 7%, transparent)" : "none",
              }}
            >
              <span style={pill(accentFor(it))}>{it.label}</span>
              <div style={{ flex: 1, fontSize: "0.85rem" }}>
                {it.coupleName ?? it.email ?? "—"}
                {it.kind === "auth" && it.email && it.coupleName ? <span style={muted}> · {it.email}</span> : null}
                {it.ip ? <span style={muted}> · {it.ip}</span> : null}
              </div>
              <span style={{ ...muted, fontSize: "0.78rem", whiteSpace: "nowrap" }}>{relativeTime(it.at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
