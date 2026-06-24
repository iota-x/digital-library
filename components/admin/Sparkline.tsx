"use client";

/** Tiny dependency-free bar sparkline driven by a CSS-variable accent. */
export default function Sparkline({ data, days, accent }: { data: number[]; days: string[]; accent: string }) {
  const max = Math.max(1, ...data);
  const w = 100 / Math.max(1, data.length);
  return (
    <svg viewBox="0 0 100 36" preserveAspectRatio="none" style={{ width: "100%", height: 60 }}>
      {data.map((v, i) => {
        const h = (v / max) * 32;
        return (
          <rect key={i} x={i * w + w * 0.15} y={34 - h} width={w * 0.7} height={Math.max(0.5, h)} rx={0.6} fill={accent} opacity={0.85}>
            <title>{`${days[i]}: ${v}`}</title>
          </rect>
        );
      })}
    </svg>
  );
}
