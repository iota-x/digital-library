"use client";
import { useEffect, useRef, type RefObject } from "react";

/**
 * Drives a <canvas> RAF loop that:
 *   • sizes itself to its rendered box (ResizeObserver)
 *   • pauses the RAF loop entirely when the canvas leaves the viewport
 *     (the previous pattern only gated the draw call, so the loop kept
 *      running off-screen, burning a frame every ~16ms for nothing)
 *   • resumes immediately when scrolled back into view
 *
 * `setup` is called on mount + every resize so the consumer can lay out
 * particles in the new box. `draw` runs once per visible frame.
 */
export interface CanvasParticlesOptions {
  setup?: (width: number, height: number) => void;
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
}

export function useCanvasParticles(
  ref: RefObject<HTMLCanvasElement | null>,
  opts: CanvasParticlesOptions,
) {
  // Stash the callbacks in refs so they can be swapped without tearing
  // down/rebuilding the observers + RAF state on every parent render.
  const setupRef = useRef(opts.setup);
  const drawRef  = useRef(opts.draw);
  setupRef.current = opts.setup;
  drawRef.current  = opts.draw;

  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;

    let raf = 0;
    let running = false;

    const resize = () => {
      const w = canvas.offsetWidth || canvas.parentElement?.clientWidth || window.innerWidth;
      const h = canvas.offsetHeight || canvas.parentElement?.clientHeight || window.innerHeight;
      if (canvas.width !== w)  canvas.width  = w;
      if (canvas.height !== h) canvas.height = h;
      setupRef.current?.(canvas.width, canvas.height);
    };
    resize();

    const loop = () => {
      drawRef.current(ctx, canvas.width, canvas.height);
      raf = requestAnimationFrame(loop);
    };
    const start = () => { if (running) return; running = true; raf = requestAnimationFrame(loop); };
    const stop  = () => { if (!running) return; running = false; cancelAnimationFrame(raf); };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) start(); else stop(); },
      { threshold: 0 },
    );
    io.observe(canvas);

    return () => { stop(); ro.disconnect(); io.disconnect(); };
  }, [ref]);
}
