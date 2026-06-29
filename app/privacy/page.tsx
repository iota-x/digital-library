import Link from "next/link";
import type { Metadata } from "next";
import { SERIF, SANS, SCRIPT } from "@/lib/typography";

export const metadata: Metadata = {
  title: "Privacy — just for us",
  description: "How your little world is kept private: end-to-end encryption, what we store, and what we genuinely can't read.",
  robots: { index: true, follow: true },
};

/** Where to reach a human about privacy. The app owner's address. */
const CONTACT_EMAIL = "ishu2000pandey@gmail.com";
const UPDATED = "June 2026";

/* On-brand section + prose helpers — same soft palette as the rest of the app,
 * driven by CSS vars so custom accent themes propagate (see theming memory). */
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

export default function PrivacyPolicy() {
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
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "0.5rem" }}>
          <div style={{ fontSize: "2.6rem" }} aria-hidden>🔒</div>
          <h1 style={{
            fontFamily: SERIF, fontStyle: "italic", fontWeight: 400,
            fontSize: "clamp(1.8rem,5vw,2.4rem)", color: "var(--pink-deep)", margin: "0.3rem 0 0",
          }}>
            your privacy, kept close
          </h1>
          <p style={{ fontFamily: SCRIPT, fontSize: "1.1rem", color: "var(--muted)", margin: "0.4rem 0 0" }}>
            this little world is yours — here&apos;s exactly how we keep it that way
          </p>
          <p style={{ fontFamily: SANS, fontSize: "0.75rem", color: "var(--muted)", margin: "0.6rem 0 0", letterSpacing: "0.04em" }}>
            last updated {UPDATED}
          </p>
        </div>

        <Section emoji="💗" title="the short version">
          <p style={{ margin: 0 }}>
            Everything you <em>write</em> here — journal entries, daily answers, love-jar notes,
            voice-note labels, lists, and time-capsule letters — is <strong>end-to-end encrypted on
            your own device</strong> before it ever reaches us. We store only scrambled ciphertext.
            We literally <strong>cannot read your words</strong>, and neither can anyone who somehow
            got hold of our database. The key that unlocks it is derived from your password and never
            leaves your device.
          </p>
        </Section>

        <Section emoji="🔐" title="what end-to-end encryption means here">
          <p style={{ margin: "0 0 0.6rem" }}>
            When you save text, your device turns it into unreadable ciphertext using a key only you
            and your partner hold. That key is built from your password right on your phone or
            computer — it&apos;s never sent to our servers in a form we could use.
          </p>
          <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
            <li>We store ciphertext. We don&apos;t have your password (it&apos;s hashed with bcrypt) or your key.</li>
            <li>Because of this, <strong>we can&apos;t recover your content for you</strong> if all access is lost — that&apos;s the trade-off for real privacy (see &ldquo;forgot password&rdquo; below).</li>
            <li>Your two devices share one couple-key so you both see the same decrypted memories.</li>
          </ul>
        </Section>

        <Section emoji="📦" title="what we actually store">
          <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
            <li><strong>Account info:</strong> your name, email, and relationship start date (so the app works and we can email you verification / reset codes).</li>
            <li><strong>Your content, encrypted:</strong> the text fields listed above, stored only as ciphertext.</li>
            <li><strong>Photos &amp; voice recordings:</strong> see the honest note below.</li>
            <li><strong>Basic usage data:</strong> anonymous page views and error logs, auto-deleted on a rolling basis, used only to keep the app working.</li>
          </ul>
        </Section>

        <Section emoji="📸" title="an honest note about photos &amp; voice recordings">
          <p style={{ margin: 0 }}>
            Photos and voice recordings are stored with our media provider (Cloudinary) so they can be
            resized, thumbnailed, and load quickly — which means those <strong>files themselves are not
            end-to-end encrypted</strong>. They sit behind unguessable links and aren&apos;t public, but
            we won&apos;t pretend they&apos;re mathematically sealed the way your text is. Only the
            words you type get the full end-to-end treatment.
          </p>
        </Section>

        <Section emoji="✨" title="AI features">
          <p style={{ margin: 0 }}>
            Quizzes and games are generated from just your names — <strong>no</strong> private content
            is involved. The one feature that uses your content is the optional personalized
            &ldquo;ideas&rdquo; suggestions: your device decrypts the relevant items and sends them to
            our AI provider (Anthropic) to generate suggestions for that moment. We never store that
            content in readable form, and you can simply not use that feature if you&apos;d rather it
            never leave your device.
          </p>
        </Section>

        <Section emoji="🔑" title="forgot password — and why you won't lose your memories">
          <p style={{ margin: "0 0 0.6rem" }}>
            Because we can&apos;t read your data, a new password alone can&apos;t magically unlock it.
            So there are two safety nets, and as long as one holds, <strong>you lose nothing</strong>:
          </p>
          <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
            <li><strong>Your recovery key:</strong> a one-time code we show you at sign-up. Save it somewhere safe — it can restore access on its own.</li>
            <li><strong>Your partner:</strong> if you lose the recovery key too, your partner&apos;s device (which still holds the key) can securely re-grant you access — without ever learning your password.</li>
          </ul>
          <p style={{ margin: "0.6rem 0 0" }}>
            The only way content is truly lost is if <em>both</em> of you forget your passwords
            <em> and</em> lose both recovery keys. That&apos;s the unavoidable cost of us not being
            able to read your data.
          </p>
        </Section>

        <Section emoji="🚫" title="what we never do">
          <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
            <li>No ads, no trackers for advertisers, no selling or sharing your data.</li>
            <li>No reading your content — by design, we can&apos;t.</li>
            <li>No feeds, no followers. It&apos;s just the two of you.</li>
          </ul>
        </Section>

        <Section emoji="🗑️" title="deleting your data">
          <p style={{ margin: 0 }}>
            You can ask us to delete your account and all associated data at any time — just email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "var(--pink-deep)", fontWeight: 600 }}>{CONTACT_EMAIL}</a>{" "}
            from your account&apos;s email address. Since most content is encrypted, deleting the keys
            and records makes it permanently unreadable.
          </p>
        </Section>

        <Section emoji="💌" title="questions?">
          <p style={{ margin: 0 }}>
            This is a small, personal app made with love. If anything here is unclear, reach out at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "var(--pink-deep)", fontWeight: 600 }}>{CONTACT_EMAIL}</a>.
          </p>
        </Section>

        {/* Footer */}
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
