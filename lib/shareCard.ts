/**
 * Client-side share-card generator for "Us, Wrapped".
 *
 * Builds a 1080×1920 Instagram-story-sized poster as an SVG, rasterizes it to a
 * PNG via an offscreen canvas (no external images → canvas stays untainted, so
 * toBlob works), then shares it through the Web Share API when available or
 * falls back to a download. Every couple who posts theirs is a tiny ad — that's
 * the point.
 */

export interface ShareStats {
  youName: string;
  partnerName: string;
  coupleName?: string;
  daysTogether: number;
  memories: number;
  photos: number;
  daily: number;
  matchPct: number | null; // best quiz match %, 0–100, or null
  loveNotes: number;
  bucketDone: number;
  moviesDone: number;
}

const W = 1080, H = 1920;

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function statRow(y: number, value: string, label: string): string {
  return `
    <text x="90" y="${y}" font-family="Georgia, serif" font-size="64" font-weight="bold" fill="#ffffff">${esc(value)}</text>
    <text x="990" y="${y}" text-anchor="end" font-family="Georgia, serif" font-style="italic" font-size="40" fill="rgba(255,255,255,0.85)">${esc(label)}</text>
    <line x1="90" y1="${y + 34}" x2="990" y2="${y + 34}" stroke="rgba(255,255,255,0.18)" stroke-width="2" />`;
}

function buildSvg(s: ShareStats): string {
  const title = s.coupleName?.trim() ? esc(s.coupleName) : `${esc(s.youName)} & ${esc(s.partnerName)}`;
  const rows: Array<[string, string]> = [
    [`${s.memories}`, "memories kept"],
    [`${s.photos}`, "photos pinned"],
    [`${s.daily}`, "questions answered together"],
    [s.matchPct != null ? `${s.matchPct}%` : "—", "most in sync"],
    [`${s.loveNotes}`, "reasons in the jar"],
    [`${s.bucketDone}`, "dreams checked off"],
  ];
  let y = 1060;
  const rowsSvg = rows.map(([v, l]) => { const r = statRow(y, v, l); y += 120; return r; }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ec4899"/>
        <stop offset="55%" stop-color="#db2777"/>
        <stop offset="100%" stop-color="#9d174d"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <circle cx="880" cy="220" r="260" fill="rgba(255,255,255,0.08)"/>
    <circle cx="170" cy="1500" r="220" fill="rgba(255,255,255,0.06)"/>

    <text x="90" y="240" font-family="Georgia, serif" font-size="40" letter-spacing="8" fill="rgba(255,255,255,0.8)">US, WRAPPED</text>
    <text x="90" y="360" font-family="Georgia, serif" font-style="italic" font-size="92" font-weight="bold" fill="#ffffff">${title}</text>

    <text x="90" y="640" font-family="Georgia, serif" font-size="280" font-weight="bold" fill="#ffffff">${s.daysTogether}</text>
    <text x="96" y="730" font-family="Georgia, serif" font-style="italic" font-size="56" fill="rgba(255,255,255,0.9)">days together &amp; counting</text>

    ${rowsSvg}

    <text x="540" y="1840" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="40" fill="rgba(255,255,255,0.85)">made with love on Us &#10084;</text>
  </svg>`;
}

async function svgToPngBlob(svg: string): Promise<Blob> {
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("svg load failed"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.drawImage(img, 0, 0, W, H);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Generate the poster and share it (or download as a fallback). Returns how it
 *  was delivered so the caller can show the right confirmation. */
export async function shareWrapped(stats: ShareStats): Promise<"shared" | "downloaded"> {
  const blob = await svgToPngBlob(buildSvg(stats));
  const file = new File([blob], "us-wrapped.png", { type: "image/png" });

  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: "Us, Wrapped 💗" });
      return "shared";
    } catch (err) {
      // User cancelled the share sheet — don't fall through to a download.
      if (err instanceof DOMException && err.name === "AbortError") return "shared";
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "us-wrapped.png";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}
