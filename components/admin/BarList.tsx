"use client";
import { muted } from "./adminStyles";

/** Compact horizontal bar list — label, proportional bar, value. */
export default function BarList({
  items,
  accent = "var(--pink, #d6608a)",
  empty = "No data yet.",
}: {
  items: { label: string; value: number }[];
  accent?: string;
  empty?: string;
}) {
  if (!items.length) return <span style={muted}>{empty}</span>;
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((it) => (
        <div key={it.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.84rem" }}>
          <span style={{ flex: "0 0 38%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={it.label}>
            {it.label}
          </span>
          <span style={{ flex: 1, height: 10, background: "color-mix(in srgb, var(--text,#333) 8%, transparent)", borderRadius: 6, overflow: "hidden" }}>
            <span style={{ display: "block", height: "100%", width: `${(it.value / max) * 100}%`, background: accent, borderRadius: 6 }} />
          </span>
          <span style={{ flex: "0 0 auto", fontVariantNumeric: "tabular-nums", ...muted }}>{it.value}</span>
        </div>
      ))}
    </div>
  );
}
