import Link from "next/link";
import { SERIF, SANS, SCRIPT } from "@/lib/typography";

/**
 * Custom 404 — keeps the soft, on-brand tone instead of Next's default page.
 */
export default function NotFound() {
  return (
    <main style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", textAlign: "center",
      padding: "2rem", gap: "0.4rem",
      background: "linear-gradient(160deg,var(--rose) 0%,var(--pink-light) 50%,var(--rose) 100%)",
    }}>
      <div style={{ fontSize: "3.4rem" }} aria-hidden>🌸</div>
      <h1 style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "clamp(1.8rem,5vw,2.6rem)", color: "var(--pink-deep)", margin: "0.2rem 0 0", fontWeight: 400 }}>
        this page wandered off
      </h1>
      <p style={{ fontFamily: SANS, fontSize: "0.95rem", color: "var(--text)", margin: "0.4rem 0 0", maxWidth: 360, lineHeight: 1.55 }}>
        We couldn&apos;t find what you were looking for — but everything we&apos;ve made together is still right here.
      </p>
      <Link href="/" style={{
        marginTop: "1.4rem", fontFamily: SANS, fontSize: "0.95rem", fontWeight: 700, color: "#fff",
        background: "linear-gradient(135deg,var(--pink),var(--pink-deep))",
        borderRadius: 50, padding: "0.8rem 1.7rem", textDecoration: "none",
        boxShadow: "0 6px 22px rgba(var(--pink-deep-rgb),.32)",
      }}>
        take me home
      </Link>
      <p style={{ fontFamily: SCRIPT, fontSize: "1rem", color: "var(--muted)", marginTop: "1rem" }}>
        always us 💗
      </p>
    </main>
  );
}
