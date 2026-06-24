"use client";
import { useEffect, useState } from "react";
import { card, muted } from "./adminStyles";
import Sparkline from "./Sparkline";
import BarList from "./BarList";

interface Analytics {
  totalViews: number;
  sampleSize: number;
  series: { dayKeys: string[]; views: number[] };
  topPages: { path: string; views: number }[];
  features: { label: string; views: number }[];
  devices: { label: string; count: number }[];
  browsers: { label: string; count: number }[];
  os: { label: string; count: number }[];
  countries: { label: string; count: number }[];
  push: { subscriptions: number; couples: number };
}

const toBars = (a: { label: string; count: number }[]) => a.map((x) => ({ label: x.label, value: x.count }));

export default function AdminAnalytics() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then((d) => (d.ok ? setData(d) : setError(d.error ?? "Failed")))
      .catch(() => setError("Network error"));
  }, []);

  if (error) return <p style={muted}>Couldn’t load analytics: {error}</p>;
  if (!data) return <p style={muted}>Loading…</p>;

  if (data.totalViews === 0) {
    return (
      <div style={card}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>No page views yet</div>
        <span style={muted}>
          Page views are collected from now on as people use the app. Browse a few pages (while signed in
          on a non-admin account) and they’ll show up here.
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontWeight: 600 }}>Page views · last 14 days</div>
          <div style={muted}>{data.totalViews.toLocaleString()} views in 30 days</div>
        </div>
        <Sparkline data={data.series.views} days={data.series.dayKeys} accent="var(--pink, #d6608a)" />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
        <div style={{ ...card, flex: "1 1 320px" }}>
          <div style={{ fontWeight: 600, marginBottom: 10 }}>Most-visited pages</div>
          <BarList items={data.topPages.map((p) => ({ label: p.path, value: p.views }))} />
        </div>
        <div style={{ ...card, flex: "1 1 320px" }}>
          <div style={{ fontWeight: 600, marginBottom: 10 }}>Top features</div>
          <BarList items={data.features.map((f) => ({ label: f.label, value: f.views }))} accent="var(--rose, #c47)" />
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
        <div style={{ ...card, flex: "1 1 220px" }}>
          <div style={{ fontWeight: 600, marginBottom: 10 }}>Device</div>
          <BarList items={toBars(data.devices)} accent="var(--pink, #d6608a)" />
        </div>
        <div style={{ ...card, flex: "1 1 220px" }}>
          <div style={{ fontWeight: 600, marginBottom: 10 }}>Browser</div>
          <BarList items={toBars(data.browsers)} accent="var(--rose, #c47)" />
        </div>
        <div style={{ ...card, flex: "1 1 220px" }}>
          <div style={{ fontWeight: 600, marginBottom: 10 }}>OS</div>
          <BarList items={toBars(data.os)} accent="var(--pink, #d6608a)" />
        </div>
        <div style={{ ...card, flex: "1 1 220px" }}>
          <div style={{ fontWeight: 600, marginBottom: 10 }}>Country</div>
          <BarList items={toBars(data.countries)} accent="var(--rose, #c47)" empty="No location data." />
        </div>
      </div>

      <div style={card}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Push notifications</div>
        <span style={muted}>
          {data.push.subscriptions} device subscription{data.push.subscriptions === 1 ? "" : "s"} across {data.push.couples} couple{data.push.couples === 1 ? "" : "s"}.
        </span>
      </div>

      <p style={{ ...muted, fontSize: "0.74rem" }}>
        Device, OS, browser and country are estimated from a sample of {data.sampleSize.toLocaleString()} recent views.
      </p>
    </div>
  );
}
