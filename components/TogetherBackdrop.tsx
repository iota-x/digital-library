"use client";
import { useEffect, useRef } from "react";

/**
 * Ambient backdrop for /together — a soft night sky (twinkling theme-tinted
 * stars) with a glowing arc connecting two points and a heart that travels
 * across it: a little visual metaphor for two people staying close across the
 * miles. Canvas-based, theme-aware (re-reads accent on theme change), behind
 * the content, and respects prefers-reduced-motion.
 */
export default function TogetherBackdrop() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let rgb = "244,114,182", rgbDeep = "190,24,93";
    const readColors = () => {
      const cs = getComputedStyle(document.documentElement);
      rgb = cs.getPropertyValue("--pink-rgb").trim() || rgb;
      rgbDeep = cs.getPropertyValue("--pink-deep-rgb").trim() || rgbDeep;
    };
    readColors();
    const onTheme = () => readColors();
    window.addEventListener("annapp:theme", onTheme);

    let W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      W = window.innerWidth; H = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + "px"; canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    interface Star { x: number; y: number; r: number; ph: number; sp: number; deep: boolean }
    const STARS = Math.max(60, Math.min(160, Math.round((W * H) / 11000)));
    const stars: Star[] = Array.from({ length: STARS }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: 0.6 + Math.random() * 1.7,
      ph: Math.random() * Math.PI * 2,
      sp: 0.6 + Math.random() * 1.6,
      deep: Math.random() < 0.35,
    }));

    // Two glowing endpoints + a connecting arc ("you" and "them").
    const arc = () => {
      const ax = W * 0.16, ay = H * 0.74;
      const bx = W * 0.84, by = H * 0.68;
      const cx = W * 0.5, cy = H * 0.42; // control point → upward bow
      return { ax, ay, bx, by, cx, cy };
    };
    const bez = (t: number, p0: number, p1: number, p2: number) =>
      (1 - t) * (1 - t) * p0 + 2 * (1 - t) * t * p1 + t * t * p2;

    let t = 0, travel = 0, raf = 0;

    const drawStars = () => {
      for (const s of stars) {
        const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph));
        const col = s.deep ? rgbDeep : rgb;
        ctx.fillStyle = `rgba(${col},${a.toFixed(3)})`;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      }
    };

    const drawArc = () => {
      const { ax, ay, bx, by, cx, cy } = arc();
      // glowing line
      ctx.lineCap = "round";
      const grad = ctx.createLinearGradient(ax, ay, bx, by);
      grad.addColorStop(0, `rgba(${rgb},0.0)`);
      grad.addColorStop(0.5, `rgba(${rgb},0.5)`);
      grad.addColorStop(1, `rgba(${rgb},0.0)`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo(cx, cy, bx, by);
      ctx.stroke();

      // endpoints
      for (const [ex, ey] of [[ax, ay], [bx, by]] as const) {
        const g = ctx.createRadialGradient(ex, ey, 0, ex, ey, 26);
        g.addColorStop(0, `rgba(${rgb},0.8)`);
        g.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(ex, ey, 26, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(${rgb},0.95)`;
        ctx.beginPath(); ctx.arc(ex, ey, 3, 0, Math.PI * 2); ctx.fill();
      }

      // traveling heart/spark along the arc
      const tt = travel < 1 ? travel : 0;
      const px = bez(tt, ax, cx, bx);
      const py = bez(tt, ay, cy, by);
      const g2 = ctx.createRadialGradient(px, py, 0, px, py, 16);
      g2.addColorStop(0, `rgba(${rgb},0.95)`);
      g2.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = g2;
      ctx.beginPath(); ctx.arc(px, py, 16, 0, Math.PI * 2); ctx.fill();
      ctx.font = "16px system-ui";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("💗", px, py);
    };

    const frame = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      t += 0.016;
      travel += 0.0032; // ~5s per crossing, then a pause before looping
      if (travel > 1.6) travel = 0;
      drawArc();
      drawStars();
      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(frame);
    };

    if (reduce) {
      ctx.globalCompositeOperation = "lighter";
      drawArc(); drawStars();
      ctx.globalCompositeOperation = "source-over";
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("annapp:theme", onTheme);
    };
  }, []);

  return <canvas ref={ref} aria-hidden style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />;
}
