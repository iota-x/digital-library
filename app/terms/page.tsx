import Link from "next/link";
import type { Metadata } from "next";
import { SERIF, SANS, SCRIPT } from "@/lib/typography";

export const metadata: Metadata = {
  title: "Terms — just for us",
  description: "The simple terms for using this little app.",
  robots: { index: true, follow: true },
};

const CONTACT_EMAIL = "ishu2000pandey@gmail.com";
const UPDATED = "June 2026";

function Section({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: "2rem" }}>
      <h2 style={{
        fontFamily: SERIF, fontStyle: "italic", fontWeight: 400,
        fontSize: "clamp(1.2rem,3vw,1.5rem)", color: "var(--pink-deep)",
        margin: "0 0 0.6rem", display: "flex", alignItems: "center", gap: "0.5rem",
      }}>
        <span aria-hidden>{emoji}</span>{title}
      </h2>
      <div style={{ fontFamily: SANS, fontSize: "0.95rem", color: "var(--text)", lineHeight: 1.65 }}>
        {children}
      </div>
    </section>
  );
}

export default function Terms() {
  return (
    <main style={{
      minHeight: "100dvh",
      background: "linear-gradient(160deg,var(--rose) 0%,var(--pink-light) 50%,var(--rose) 100%)",
      padding: "clamp(1.5rem,5vw,3rem) clamp(1rem,4vw,2rem)",
    }}>
      <article style={{
        maxWidth: 720, margin: "0 auto",
        background: "rgba(255,255,255,0.7)",
        WebkitBackdropFilter: "blur(16px)", backdropFilter: "blur(16px)",
        border: "1px solid rgba(var(--pink-deep-rgb),0.18)",
        borderRadius: 24, padding: "clamp(1.5rem,5vw,2.8rem)",
        boxShadow: "0 20px 60px rgba(var(--pink-deep-rgb),0.14)",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2.6rem" }} aria-hidden>🤝</div>
          <h1 style={{
            fontFamily: SERIF, fontStyle: "italic", fontWeight: 400,
            fontSize: "clamp(1.8rem,5vw,2.4rem)", color: "var(--pink-deep)", margin: "0.3rem 0 0",
          }}>
            the simple terms
          </h1>
          <p style={{ fontFamily: SCRIPT, fontSize: "1.1rem", color: "var(--muted)", margin: "0.4rem 0 0" }}>
            a small app, made with love — here&apos;s the deal
          </p>
          <p style={{ fontFamily: SANS, fontSize: "0.75rem", color: "var(--muted)", margin: "0.6rem 0 0", letterSpacing: "0.04em" }}>
            last updated {UPDATED}
          </p>
        </div>

        <Section emoji="💗" title="using the app">
          <p style={{ margin: 0 }}>
            This is a private space for couples to keep their memories. By creating an account you
            agree to these terms and to our{" "}
            <Link href="/privacy" style={{ color: "var(--pink-deep)", fontWeight: 600 }}>Privacy Policy</Link>.
            If you don&apos;t agree, please don&apos;t use the app.
          </p>
        </Section>

        <Section emoji="🎂" title="who can use it">
          <p style={{ margin: 0 }}>
            You must be at least 16 years old (or the age of digital consent where you live) to use
            this app. It&apos;s meant for two people who both choose to be here.
          </p>
        </Section>

        <Section emoji="🙏" title="be kind, don't abuse it">
          <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
            <li>Don&apos;t upload illegal content, or anything you don&apos;t have the right to share.</li>
            <li>Don&apos;t try to break, overload, scrape, or reverse-engineer the service.</li>
            <li>Don&apos;t use it to harass anyone. Your account is for you and your partner only.</li>
          </ul>
        </Section>

        <Section emoji="🔒" title="your content & encryption">
          <p style={{ margin: 0 }}>
            What you create is <strong>yours</strong> — we claim no ownership over your words, photos,
            or memories. Your text content is end-to-end encrypted (see the{" "}
            <Link href="/privacy" style={{ color: "var(--pink-deep)", fontWeight: 600 }}>Privacy Policy</Link>),
            which means <strong>we cannot recover it for you</strong> if you and your partner both lose
            your passwords and recovery keys. Please keep your recovery key safe — that&apos;s the
            trade-off for true privacy.
          </p>
        </Section>

        <Section emoji="🌱" title="the app is provided “as is”">
          <p style={{ margin: 0 }}>
            This is a small, personal labour of love — not a big company with guarantees. It&apos;s
            provided <strong>as is</strong>, without warranties, and may change, have downtime, or
            occasionally lose its footing. To the fullest extent the law allows, we aren&apos;t liable
            for any loss arising from using it. Please keep your own copies of anything truly precious.
          </p>
        </Section>

        <Section emoji="👋" title="ending things">
          <p style={{ margin: 0 }}>
            You can delete your account and data at any time from settings (or by emailing us). We may
            suspend accounts that abuse the service or break these terms.
          </p>
        </Section>

        <Section emoji="✏️" title="changes & contact">
          <p style={{ margin: 0 }}>
            We may update these terms now and then; continued use means you accept the changes.
            Questions? Email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "var(--pink-deep)", fontWeight: 600 }}>{CONTACT_EMAIL}</a>.
          </p>
        </Section>

        <div style={{ textAlign: "center", marginTop: "2.5rem" }}>
          <Link href="/" style={{
            fontFamily: SANS, fontSize: "0.95rem", fontWeight: 700, color: "#fff",
            background: "linear-gradient(135deg,var(--pink),var(--pink-deep))",
            borderRadius: 50, padding: "0.8rem 1.7rem", textDecoration: "none",
            boxShadow: "0 6px 22px rgba(var(--pink-deep-rgb),.32)", display: "inline-block",
          }}>
            take me home
          </Link>
          <p style={{ fontFamily: SCRIPT, fontSize: "1rem", color: "var(--muted)", marginTop: "1rem" }}>
            always us 💗
          </p>
        </div>
      </article>
    </main>
  );
}
