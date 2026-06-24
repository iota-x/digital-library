"use client";
import { useEffect, useState } from "react";
import { card, muted, relativeTime } from "./adminStyles";

interface FunnelData {
  funnel: { stage: string; count: number; pct: number }[];
  atRiskDays: number;
  atRiskCount: number;
  atRisk: { id: string; name: string; lastSeen: string | null; contentTotal: number }[];
}

export default function AdminFunnel({ onOpenCouple }: { onOpenCouple?: (id: string) => void }) {
  const [data, setData] = useState<FunnelData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/funnel")
      .then((r) => r.json())
      .then((d) => (d.ok ? setData(d) : setError(d.error ?? "Failed")))
      .catch(() => setError("Network error"));
  }, []);

  if (error) return <div style={card}><span style={muted}>Couldn’t load funnel: {error}</span></div>;
  if (!data) return <div style={card}><span style={muted}>Loading funnel…</span></div>;

  const max = Math.max(1, ...data.funnel.map((s) => s.count));
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
      <div style={{ ...card, flex: "1 1 340px" }}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>Activation funnel</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {data.funnel.map((s) => (
            <div key={s.stage}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.84rem", marginBottom: 3 }}>
                <span>{s.stage}</span>
                <span style={muted}>{s.count} · {s.pct}%</span>
              </div>
              <span style={{ display: "block", height: 14, background: "color-mix(in srgb, var(--text,#333) 8%, transparent)", borderRadius: 7, overflow: "hidden" }}>
                <span style={{ display: "block", height: "100%", width: `${(s.count / max) * 100}%`, background: "var(--pink, #d6608a)", borderRadius: 7 }} />
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...card, flex: "1 1 340px" }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>
          At-risk couples <span style={muted}>({data.atRiskCount})</span>
        </div>
        <div style={{ ...muted, fontSize: "0.76rem", marginBottom: 8 }}>
          Have content but not seen in {data.atRiskDays}+ days
        </div>
        {data.atRisk.length === 0 && <span style={muted}>None — everyone engaged is active. 🎉</span>}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 260, overflowY: "auto" }}>
          {data.atRisk.map((c) => (
            <button
              key={c.id}
              onClick={() => onOpenCouple?.(c.id)}
              style={{ all: "unset", cursor: onOpenCouple ? "pointer" : "default", display: "flex", justifyContent: "space-between", gap: 8, fontSize: "0.84rem", padding: "2px 0" }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
              <span style={muted}>{c.contentTotal} items · seen {relativeTime(c.lastSeen)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
