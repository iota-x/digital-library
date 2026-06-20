"use client";
import { useEffect, useRef } from "react";

/**
 * Theme-coloured particle trails drifting up the left/right margins of the
 * Wrapped page — fills the empty space beside the centred phone with gentle
 * motion that matches the aesthetic. Canvas-based for smooth trails; reads the
 * couple's accent from CSS vars and re-reads on theme change. Respects
 * prefers-reduced-motion (renders a soft static scatter instead).
 */
export default function WrappedParticles() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let rgb = "244,114,182";
    let rgbDeep = "190,24,93";
    const readColors = () => {
      const cs = getComputedStyle(document.documentElement);
      rgb = (cs.getPropertyValue("--pink-rgb").trim() || rgb);
      rgbDeep = (cs.getPropertyValue("--pink-deep-rgb").trim() || rgbDeep);
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

    // Side bands — particles live only in the margins beside the phone.
    const bandX = () => {
      // left third or right third of the screen
      const onLeft = Math.random() < 0.5;
      const t = Math.random();
      return onLeft ? t * W * 0.26 : W * (0.74 + t * 0.26);
    };

    interface P { x: number; y: number; baseX: number; vy: number; phase: number; sway: number; amp: number; r: number; a: number; deep: boolean; trail: { x: number; y: number }[] }
    const COUNT = Math.max(14, Math.min(30, Math.round(W / 60)));
    const make = (seedY?: number): P => ({
      x: 0, y: seedY ?? Math.random() * H, baseX: bandX(),
      vy: 0.25 + Math.random() * 0.55,
      phase: Math.random() * Math.PI * 2,
      sway: 0.4 + Math.random() * 0.8,
      amp: 8 + Math.random() * 22,
      r: 1.4 + Math.random() * 2.4,
      a: 0.35 + Math.random() * 0.5,
      deep: Math.random() < 0.4,
      trail: [],
    });
    const ps: P[] = Array.from({ length: COUNT }, () => make());

    let t = 0, raf = 0;
    const TRAIL = 14;

    const drawParticle = (p: P) => {
      const col = p.deep ? rgbDeep : rgb;
      // trail
      for (let i = 1; i < p.trail.length; i++) {
        const f = i / p.trail.length;
        ctx.strokeStyle = `rgba(${col},${(p.a * f * 0.5).toFixed(3)})`;
        ctx.lineWidth = p.r * f;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(p.trail[i - 1].x, p.trail[i - 1].y);
        ctx.lineTo(p.trail[i].x, p.trail[i].y);
        ctx.stroke();
      }
      // glowing head
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
      g.addColorStop(0, `rgba(${col},${p.a})`);
      g.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2); ctx.fill();
    };

    const frame = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      t += 0.016;
      for (const p of ps) {
        p.y -= p.vy;
        p.x = p.baseX + Math.sin(t * p.sway + p.phase) * p.amp;
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > TRAIL) p.trail.shift();
        if (p.y < -30) { Object.assign(p, make(H + 30)); }
        drawParticle(p);
      }
      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(frame);
    };

    if (reduce) {
      // static soft scatter, no animation
      ctx.globalCompositeOperation = "lighter";
      for (const p of ps) { p.y = Math.random() * H; p.x = p.baseX; drawParticle(p); }
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

  return (
    <canvas ref={ref} aria-hidden
      style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />
  );
}
