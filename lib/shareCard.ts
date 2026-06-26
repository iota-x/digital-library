/**
 * Client-side share-card generator for "Us, Wrapped".
 *
 * Draws a 1080×1920 Instagram-story poster directly with the Canvas 2D API —
 * no SVG <img> step. That matters: Safari/iOS taint the canvas when you draw an
 * SVG image and then `toBlob`/`toDataURL` throws a SecurityError (the old
 * "couldn't make the card" bug). Direct drawing keeps the canvas clean, so the
 * PNG always exports, and every couple who posts theirs is a tiny ad.
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
const SANS = '"Helvetica Neue", Arial, sans-serif';
const SERIF = 'Georgia, "Times New Roman", serif';
// Stamped on every shared card so each post is a findable ad. Keep in sync with
// the deployed domain (README → wearesocuteomg.vercel.app).
const SITE = "wearesocuteomg.vercel.app";

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Shared pink gradient + orbs + scattered hearts — used by every card type. */
function drawBackground(ctx: CanvasRenderingContext2D) {
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#f9a8d4");
  bg.addColorStop(0.45, "#ec4899");
  bg.addColorStop(1, "#9d174d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const orb = (x: number, y: number, r: number, a: number) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${a})`);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  };
  orb(880, 240, 340, 0.16);
  orb(150, 1500, 320, 0.12);

  ctx.font = `48px ${SANS}`;
  ctx.globalAlpha = 0.18;
  const hearts: Array<[number, number, number]> = [[120, 520, 0.4], [960, 700, -0.3], [200, 1180, 0.2], [900, 1280, 0.5], [520, 250, -0.2]];
  for (const [x, y, rot] of hearts) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillText("♥", 0, 0); ctx.restore();
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";
}

/** Branded footer — app name + findable URL, so each shared card is an ad. */
function drawFooter(ctx: CanvasRenderingContext2D) {
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = `italic 44px ${SERIF}`;
  ctx.fillText("made with love on Us  ♥", W / 2, 1838);
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.font = `600 32px ${SANS}`;
  ctx.fillText(SITE, W / 2, 1890);
  ctx.textAlign = "left";
}

function drawCard(ctx: CanvasRenderingContext2D, s: ShareStats) {
  drawBackground(ctx);

  // ── Header ──
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.font = `600 38px ${SANS}`;
  ctx.fillText("✦  U S ,   W R A P P E D", 90, 230);

  const title = s.coupleName?.trim() || `${s.youName} & ${s.partnerName}`;
  ctx.fillStyle = "#ffffff";
  ctx.font = `italic 700 92px ${SERIF}`;
  // shrink the title to fit one line if it's long
  let size = 92;
  while (ctx.measureText(title).width > W - 180 && size > 48) { size -= 4; ctx.font = `italic 700 ${size}px ${SERIF}`; }
  ctx.fillText(title, 90, 350);

  // ── Hero number: days together ──
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 300px ${SERIF}`;
  ctx.fillText(String(s.daysTogether), 86, 690);
  ctx.font = `italic 56px ${SERIF}`;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fillText("days together & counting 💞", 96, 770);

  // ── Stat grid (2 columns) ──
  const stats: Array<[string, string]> = [
    [String(s.memories), "memories kept"],
    [String(s.photos), "photos pinned"],
    [String(s.daily), "questions answered"],
    [s.matchPct != null ? `${s.matchPct}%` : "—", "most in sync"],
    [String(s.loveNotes), "reasons in the jar"],
    [String(s.bucketDone), "dreams checked off"],
  ];
  const gx = 90, gy = 900, cw = (W - 180 - 40) / 2, ch = 230, gap = 40;
  stats.forEach(([value, label], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = gx + col * (cw + gap);
    const y = gy + row * (ch + gap);
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    roundRect(ctx, x, y, cw, ch, 36); ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    ctx.font = `700 96px ${SERIF}`;
    ctx.fillText(value, x + 44, y + 130);
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.font = `400 36px ${SANS}`;
    ctx.fillText(label, x + 46, y + 185);
  });

  drawFooter(ctx);
}

export interface MilestoneShare {
  label: string;        // "100 days", "1 year"
  emoji: string;
  coupleName: string;
  daysTogether: number;
}

/** A simpler, punchier card for a single milestone moment. */
function drawMilestoneCard(ctx: CanvasRenderingContext2D, m: MilestoneShare) {
  drawBackground(ctx);

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.font = `600 40px ${SANS}`;
  ctx.fillText("✦  T O D A Y   M A R K S", W / 2, 560);

  ctx.font = `300px ${SERIF}`;
  ctx.fillText(m.emoji, W / 2, 940);

  ctx.fillStyle = "#ffffff";
  let size = 150;
  ctx.font = `italic 700 ${size}px ${SERIF}`;
  const headline = `${m.label} together`;
  while (ctx.measureText(headline).width > W - 160 && size > 70) { size -= 4; ctx.font = `italic 700 ${size}px ${SERIF}`; }
  ctx.fillText(headline, W / 2, 1180);

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = `italic 56px ${SERIF}`;
  ctx.fillText(`${m.daysTogether} days & counting 💞`, W / 2, 1280);

  const name = m.coupleName.trim() || "us";
  ctx.fillStyle = "#ffffff";
  ctx.font = `500 60px ${SANS}`;
  ctx.fillText(`${name} 💗`, W / 2, 1420);

  ctx.textAlign = "left";
  drawFooter(ctx);
}

async function renderPng(draw: (ctx: CanvasRenderingContext2D) => void): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  draw(ctx);
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"),
  );
}

/** Share any rendered card, optionally carrying a referral link in the text so
 *  platforms that support text+file (and the download fallback) spread it. */
async function shareBlob(blob: Blob, filename: string, title: string, referralUrl?: string): Promise<"shared" | "downloaded"> {
  const file = new File([blob], filename, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title, ...(referralUrl ? { text: `come make your own 💗 ${referralUrl}` } : {}) });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return "shared";
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}

/** Generate the Wrapped poster and share it (or download as a fallback). */
export async function shareWrapped(stats: ShareStats, referralUrl?: string): Promise<"shared" | "downloaded"> {
  const blob = await renderPng((ctx) => drawCard(ctx, stats));
  return shareBlob(blob, "us-wrapped.png", "Us, Wrapped 💗", referralUrl);
}

/** Generate a single-milestone poster and share it (or download as a fallback). */
export async function shareMilestone(m: MilestoneShare, referralUrl?: string): Promise<"shared" | "downloaded"> {
  const blob = await renderPng((ctx) => drawMilestoneCard(ctx, m));
  return shareBlob(blob, `us-${m.label.replace(/\s+/g, "-")}.png`, `${m.label} together 💗`, referralUrl);
}
