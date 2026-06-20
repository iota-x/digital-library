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

    // Side bands — particles live in the margins beside the phone (the centre
    // ~36% is left clear). `wide` lets the softest bokeh roam a little further in.
    const bandX = (wide = false) => {
      const edge = wide ? 0.40 : 0.32;
      const onLeft = Math.random() < 0.5;
      const t = Math.random();
      return onLeft ? t * W * edge : W * (1 - edge + t * edge);
    };

    interface P { x: number; y: number; baseX: number; vy: number; phase: number; sway: number; amp: number; r: number; a: number; deep: boolean; bokeh: boolean; trail: { x: number; y: number }[] }
    const COUNT = Math.max(40, Math.min(80, Math.round((W * H) / 26000)));
    const make = (seedY?: number): P => {
      const bokeh = Math.random() < 0.28;
      return {
        x: 0, y: seedY ?? Math.random() * H, baseX: bandX(bokeh),
        vy: bokeh ? 0.12 + Math.random() * 0.25 : 0.3 + Math.random() * 0.7,
        phase: Math.random() * Math.PI * 2,
        sway: 0.4 + Math.random() * 0.9,
        amp: bokeh ? 14 + Math.random() * 30 : 8 + Math.random() * 22,
        r: bokeh ? 5 + Math.random() * 9 : 1.5 + Math.random() * 2.6,
        a: bokeh ? 0.06 + Math.random() * 0.08 : 0.4 + Math.random() * 0.5,
        deep: Math.random() < 0.4,
        bokeh,
        trail: [],
      };
    };
    const ps: P[] = Array.from({ length: COUNT }, () => make());

    let t = 0, raf = 0;
    const TRAIL = 16;

    const drawParticle = (p: P) => {
      const col = p.deep ? rgbDeep : rgb;
      if (!p.bokeh) {
        // trail
        for (let i = 1; i < p.trail.length; i++) {
          const f = i / p.trail.length;
          ctx.strokeStyle = `rgba(${col},${(p.a * f * 0.55).toFixed(3)})`;
          ctx.lineWidth = p.r * f;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(p.trail[i - 1].x, p.trail[i - 1].y);
          ctx.lineTo(p.trail[i].x, p.trail[i].y);
          ctx.stroke();
        }
      }
      // glowing head (soft, larger for bokeh)
      const rad = p.bokeh ? p.r : p.r * 4;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
      g.addColorStop(0, `rgba(${col},${p.a})`);
      g.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, Math.PI * 2); ctx.fill();
    };

    const frame = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      t += 0.016;
      for (const p of ps) {
        p.y -= p.vy;
        p.x = p.baseX + Math.sin(t * p.sway + p.phase) * p.amp;
        if (!p.bokeh) {
          p.trail.push({ x: p.x, y: p.y });
          if (p.trail.length > TRAIL) p.trail.shift();
        }
        if (p.y < -40) { Object.assign(p, make(H + 40)); }
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
