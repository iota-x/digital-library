"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { SERIF, SANS } from "@/lib/typography";
import { NAV_GROUPS } from "@/lib/nav";

/**
 * "Everything in here" — a labelled, grouped map of the app's surfaces, shown
 * on the home page. With this many features a flat nav doesn't tell you what
 * lives where; this does, one cluster at a time. Driven by the same `lib/nav`
 * config as the navbar/menu/palette, so it never drifts out of sync.
 */
export default function Explore() {
  return (
    <section style={{ width: "100%", padding: "clamp(2rem,5vh,3.5rem) clamp(1rem,4vw,2rem)", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 880 }}>
        <p style={{ fontFamily: SANS, fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(var(--pink-deep-rgb), .5)", textAlign: "center", margin: "0 0 0.3rem" }}>
          everything in here
        </p>
        <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "clamp(1.3rem,3.5vw,1.7rem)", color: "var(--pink-deep)", textAlign: "center", margin: "0 0 1.4rem" }}>
          your little world, mapped out 🌸
        </p>

        {NAV_GROUPS.map((g) => (
          <div key={g.title} style={{ marginBottom: "1.4rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", marginBottom: "0.7rem" }}>
              <span style={{ fontFamily: SANS, fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--pink-deep)" }}>{g.title}</span>
              <span style={{ flex: 1, height: 1, background: "linear-gradient(90deg,rgba(var(--pink-deep-rgb),.25),transparent)" }} />
            </div>
            <div style={{ display: "grid", gap: "0.7rem", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
              {g.items.map((a) => (
                <Link key={a.href} href={a.href} style={{ textDecoration: "none" }}>
                  <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}
                    style={{
                      height: "100%",
                      background: "var(--cream)",
                      border: "1px solid rgba(var(--pink-rgb), .3)",
                      borderRadius: 18, padding: "1rem 1.1rem",
                      display: "flex", gap: "0.8rem", alignItems: "flex-start",
                      boxShadow: "0 6px 22px rgba(var(--pink-deep-rgb), .07)",
                    }}>
                    <span aria-hidden style={{ fontSize: "1.5rem", lineHeight: 1 }}>{a.emoji}</span>
                    <div>
                      <p style={{ fontFamily: SANS, fontSize: "0.9rem", fontWeight: 700, color: "var(--pink-deep)", margin: "0 0 0.2rem" }}>{a.label}</p>
                      <p style={{ fontFamily: SANS, fontSize: "0.76rem", color: "var(--muted)", margin: 0, lineHeight: 1.4 }}>{a.desc}</p>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
