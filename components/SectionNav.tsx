"use client";
import { useEffect, useRef, useState } from "react";
import { SANS } from "@/lib/typography";

/**
 * A slim, sticky "jump to" bar for long pages. Keeps every section on the page
 * but makes a long scroll navigable: tap a chip to glide to that section, and
 * the active chip highlights as you scroll (via IntersectionObserver). Hidden
 * when there's only one section. Sits just under the fixed navbar.
 */

export interface Section { id: string; label: string; emoji?: string }

export default function SectionNav({ sections }: { sections: Section[] }) {
  const [active, setActive] = useState(sections[0]?.id ?? "");
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter((e): e is HTMLElement => !!e);
    if (els.length < 2) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActive(top.target.id);
      },
      { rootMargin: "-120px 0px -55% 0px", threshold: 0 },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [sections]);

  // Keep the active chip scrolled into view within the (horizontally scrollable) bar.
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const chip = row.querySelector<HTMLElement>(`[data-id="${active}"]`);
    chip?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [active]);

  if (sections.length < 2) return null;

  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div style={{
      position: "sticky", top: 60, zIndex: 400,
      background: "rgba(var(--cream-rgb,255,245,248),0.85)",
      backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
      borderBottom: "1px solid rgba(var(--pink-deep-rgb),.12)",
    }}>
      <div ref={rowRef} style={{
        display: "flex", gap: "0.4rem", overflowX: "auto", padding: "0.5rem clamp(0.8rem,3vw,1.5rem)",
        scrollbarWidth: "none", maxWidth: 980, margin: "0 auto",
      }}>
        {sections.map((s) => {
          const on = active === s.id;
          return (
            <button key={s.id} data-id={s.id} onClick={() => go(s.id)} style={{
              flexShrink: 0, display: "inline-flex", alignItems: "center", gap: "0.35rem",
              padding: "0.32rem 0.85rem", borderRadius: 50, cursor: "pointer",
              border: `1px solid rgba(var(--pink-mid-rgb,249,168,212),${on ? "0" : ".4"})`,
              background: on ? "linear-gradient(135deg,var(--pink),var(--pink-deep))" : "rgba(255,255,255,0.5)",
              color: on ? "#fff" : "rgba(var(--pink-deep-rgb,190,24,93),0.75)",
              fontFamily: SANS, fontSize: "0.72rem", fontWeight: on ? 700 : 600,
              whiteSpace: "nowrap", transition: "background .2s, color .2s",
            }}>
              {s.emoji && <span aria-hidden>{s.emoji}</span>}{s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
