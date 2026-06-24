"use client";
import { useEffect, useState } from "react";
import { card, muted } from "./adminStyles";

interface Overview {
  accounts: { totalCouples: number; pairedCouples: number; soloCouples: number; totalUsers: number; verifiedUsers: number; unverifiedUsers: number };
  signups: { last7d: number; last30d: number };
  logins: { last24h: number; last7d: number; failed7d: number };
  active: { dau: number; wau: number };
  referrals: { given: number; referredSignups: number };
  content: { total: number; byCollection: { name: string; label: string; count: number }[] };
  series: { dayKeys: string[]; signups: number[]; logins: number[] };
}

function Metric({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div style={{ ...card, minWidth: 140, flex: "1 1 140px" }}>
      <div style={{ ...muted, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ fontSize: "1.9rem", fontWeight: 700, lineHeight: 1.1, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ ...muted, fontSize: "0.78rem", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Sparkline({ data, days, accent }: { data: number[]; days: string[]; accent: string }) {
  const max = Math.max(1, ...data);
  const w = 100 / Math.max(1, data.length);
  return (
    <svg viewBox="0 0 100 36" preserveAspectRatio="none" style={{ width: "100%", height: 60 }}>
      {data.map((v, i) => {
        const h = (v / max) * 32;
        return (
          <rect
            key={i}
            x={i * w + w * 0.15}
            y={34 - h}
            width={w * 0.7}
            height={Math.max(0.5, h)}
            rx={0.6}
            fill={accent}
            opacity={0.85}
          >
            <title>{`${days[i]}: ${v}`}</title>
          </rect>
        );
      })}
    </svg>
  );
}

export default function AdminOverview() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/overview")
      .then((r) => r.json())
      .then((d) => (d.ok ? setData(d) : setError(d.error ?? "Failed to load")))
      .catch(() => setError("Network error"));
  }, []);

  if (error) return <p style={muted}>Couldn’t load overview: {error}</p>;
  if (!data) return <p style={muted}>Loading…</p>;

  const a = data.accounts;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
        <Metric label="Couples" value={a.totalCouples} sub={`${a.pairedCouples} paired · ${a.soloCouples} solo`} />
        <Metric label="Users" value={a.totalUsers} sub={`${a.verifiedUsers} verified · ${a.unverifiedUsers} pending`} />
        <Metric label="Active today" value={data.active.dau} sub={`${data.active.wau} this week`} />
        <Metric label="Logins 24h" value={data.logins.last24h} sub={`${data.logins.last7d} this week`} />
        <Metric label="Failed logins 7d" value={data.logins.failed7d} />
        <Metric label="Signups 7d" value={data.signups.last7d} sub={`${data.signups.last30d} this month`} />
        <Metric label="Referrals" value={data.referrals.given} sub={`${data.referrals.referredSignups} signed up`} />
        <Metric label="Content items" value={data.content.total} />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
        <div style={{ ...card, flex: "1 1 280px" }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Signups · last 14 days</div>
          <Sparkline data={data.series.signups} days={data.series.dayKeys} accent="var(--pink, #d6608a)" />
        </div>
        <div style={{ ...card, flex: "1 1 280px" }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Logins · last 14 days</div>
          <Sparkline data={data.series.logins} days={data.series.dayKeys} accent="var(--rose, #c47)" />
        </div>
      </div>

      <div style={card}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>Content by type</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem 1.5rem" }}>
          {data.content.byCollection.map((c) => (
            <div key={c.name} style={{ minWidth: 110 }}>
              <span style={{ fontWeight: 700 }}>{c.count}</span>{" "}
              <span style={muted}>{c.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
