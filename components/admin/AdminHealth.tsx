"use client";
import { useEffect, useState } from "react";
import { card, muted, pill, relativeTime } from "./adminStyles";

interface Health {
  counts: { last24h: number; last7d: number };
  top: { message: string; count: number; last: string }[];
  recent: { message: string; name: string | null; path: string | null; method: string | null; source: string; coupleId: string | null; at: string }[];
}

export default function AdminHealth() {
  const [data, setData] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/health")
      .then((r) => r.json())
      .then((d) => (d.ok ? setData(d) : setError(d.error ?? "Failed")))
      .catch(() => setError("Network error"));
  }, []);

  if (error) return <p style={muted}>Couldn’t load health: {error}</p>;
  if (!data) return <p style={muted}>Loading…</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <div style={{ ...card, flex: "1 1 160px" }}>
          <div style={{ ...muted, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>Errors · 24h</div>
          <div style={{ fontSize: "1.9rem", fontWeight: 700, color: data.counts.last24h ? "var(--pink-deep, #b03a63)" : "var(--text)" }}>{data.counts.last24h}</div>
        </div>
        <div style={{ ...card, flex: "1 1 160px" }}>
          <div style={{ ...muted, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>Errors · 7d</div>
          <div style={{ fontSize: "1.9rem", fontWeight: 700 }}>{data.counts.last7d}</div>
        </div>
      </div>

      {data.counts.last7d === 0 ? (
        <div style={card}><span style={muted}>No errors recorded in the last 7 days. ✨</span></div>
      ) : (
        <>
          <div style={card}>
            <div style={{ fontWeight: 600, marginBottom: 10 }}>Top errors (7 days)</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {data.top.map((t, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: "0.84rem" }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={t.message}>{t.message}</span>
                  <span style={muted}>×{t.count} · {relativeTime(t.last)}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...card, padding: 0 }}>
            <div style={{ fontWeight: 600, padding: "0.85rem 0.85rem 0" }}>Recent errors</div>
            {data.recent.map((e, i) => (
              <div key={i} style={{ padding: "0.6rem 0.85rem", borderBottom: i < data.recent.length - 1 ? "1px solid color-mix(in srgb, var(--text,#333) 7%, transparent)" : "none" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                  <span style={pill(e.source === "client" ? "var(--rose, #c47)" : "var(--pink, #d6608a)")}>{e.source}</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{e.message}</span>
                  <span style={{ ...muted, fontSize: "0.76rem", marginLeft: "auto" }}>{relativeTime(e.at)}</span>
                </div>
                {(e.path || e.name) && (
                  <div style={{ ...muted, fontSize: "0.76rem", marginTop: 2 }}>
                    {e.method ? `${e.method} ` : ""}{e.path ?? ""}{e.name ? ` · ${e.name}` : ""}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
