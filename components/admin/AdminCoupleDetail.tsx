"use client";
import { useEffect, useState } from "react";
import { card, muted, pill, shortDate, relativeTime } from "./adminStyles";

interface Member {
  id: string; name: string; email: string; role: string;
  emailVerified: boolean; createdAt: string | null; lastSeenAt: string | null;
}
interface Section { name: string; label: string; tsField: string; count: number; items: Record<string, unknown>[] }
interface Detail {
  couple: Record<string, unknown> & { id: string };
  members: Member[];
  sections: Section[];
  events: { type: string; at: string; email?: string; ip?: string }[];
}

/** Best-effort renderer for an arbitrary content doc — surfaces photos, audio,
 *  and the common text fields; falls back to a JSON dump for unknown shapes. */
function ContentItem({ item, tsField }: { item: Record<string, unknown>; tsField: string }) {
  const photos = Array.isArray(item.photos) ? (item.photos as string[]) : [];
  const imageUrl = typeof item.imageUrl === "string" ? item.imageUrl : null;
  const audioUrl = typeof item.url === "string" ? item.url : null;
  const text = ["text", "letter", "title", "questionText", "label", "from"]
    .map((k) => (typeof item[k] === "string" ? `${k}: ${item[k]}` : null))
    .filter(Boolean) as string[];
  const ts = item[tsField];
  const known = new Set(["_id", "coupleId", "photos", "imageUrl", "url", tsField]);
  const rest = Object.fromEntries(Object.entries(item).filter(([k]) => !known.has(k) && !text.some((t) => t.startsWith(`${k}:`))));

  return (
    <div style={{ border: "1px solid color-mix(in srgb, var(--text,#333) 9%, transparent)", borderRadius: 10, padding: "0.6rem 0.75rem" }}>
      <div style={{ ...muted, fontSize: "0.72rem", marginBottom: 4 }}>{typeof ts === "string" ? shortDate(ts) : ""}</div>
      {text.map((t, i) => <div key={i} style={{ fontSize: "0.86rem", whiteSpace: "pre-wrap" }}>{t}</div>)}
      {audioUrl && <audio controls src={audioUrl} style={{ width: "100%", marginTop: 6 }} />}
      {imageUrl && <img src={imageUrl} alt="" style={{ maxWidth: 160, borderRadius: 8, marginTop: 6 }} />}
      {photos.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
          {photos.map((p, i) => <img key={i} src={p} alt="" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8 }} />)}
        </div>
      )}
      {Object.keys(rest).length > 0 && (
        <pre style={{ ...muted, fontSize: "0.72rem", margin: "6px 0 0", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {JSON.stringify(rest, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default function AdminCoupleDetail({ coupleId, onClose }: { coupleId: string; onClose: () => void }) {
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    setData(null); setError(null);
    fetch(`/api/admin/couple?id=${encodeURIComponent(coupleId)}`)
      .then((r) => r.json())
      .then((d) => (d.ok ? setData(d) : setError(d.error ?? "Failed")))
      .catch(() => setError("Network error"));
  }, [coupleId]);

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", justifyContent: "flex-end" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(640px, 100%)", height: "100%", overflowY: "auto",
          background: "var(--cream, #fff)", padding: "1.25rem", boxShadow: "-8px 0 28px rgba(0,0,0,0.18)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.2rem" }}>Couple detail</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--text)" }}>×</button>
        </div>

        {error && <p style={muted}>Couldn’t load: {error}</p>}
        {!data && !error && <p style={muted}>Loading…</p>}

        {data && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={card}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>
                {[data.couple.person1Name, data.couple.person2Name].filter(Boolean).join(" & ") || "Unnamed couple"}
              </div>
              <div style={{ ...muted, fontSize: "0.8rem" }}>
                Joined {shortDate(data.couple.createdAt as string)} · start date {String(data.couple.startDate ?? "—")}
                <br />invite {String(data.couple.inviteCode ?? "—")} · referral {String(data.couple.referralCode ?? "—")} ({String(data.couple.referralCount ?? 0)} referred)
                {data.couple.referredBy ? <> · referred by another couple</> : null}
              </div>
            </div>

            <div style={card}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Members</div>
              {data.members.map((m) => (
                <div key={m.id} style={{ marginBottom: 8, fontSize: "0.85rem" }}>
                  <strong>{m.name}</strong> <span style={pill()}>{m.role}</span>{" "}
                  {m.emailVerified ? null : <span style={pill("var(--muted,#888)")}>unverified</span>}
                  <div style={muted}>{m.email}</div>
                  <div style={muted}>joined {shortDate(m.createdAt)} · last seen {relativeTime(m.lastSeenAt)}</div>
                </div>
              ))}
            </div>

            {data.sections.filter((s) => s.count > 0).map((s) => (
              <div key={s.name} style={card}>
                <button
                  onClick={() => setOpen(open === s.name ? null : s.name)}
                  style={{ all: "unset", cursor: "pointer", display: "flex", justifyContent: "space-between", width: "100%", fontWeight: 600 }}
                >
                  <span>{s.label}</span>
                  <span style={muted}>{s.count} {open === s.name ? "▲" : "▼"}</span>
                </button>
                {open === s.name && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                    {s.items.map((it, i) => <ContentItem key={i} item={it} tsField={s.tsField} />)}
                  </div>
                )}
              </div>
            ))}

            <div style={card}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Recent account events</div>
              {data.events.length === 0 && <span style={muted}>No login/auth events yet.</span>}
              {data.events.map((e, i) => (
                <div key={i} style={{ fontSize: "0.82rem", ...muted }}>
                  {relativeTime(e.at)} — {e.type.replace("_", " ")}{e.ip ? ` · ${e.ip}` : ""}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
