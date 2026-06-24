"use client";
import { useEffect, useState } from "react";
import { card, muted, th, td, pill, relativeTime, shortDate } from "./adminStyles";

interface Member {
  id: string; name: string; email: string; role: string;
  emailVerified: boolean; createdAt: string | null; lastSeenAt: string | null;
}
interface CoupleRow {
  id: string; person1Name: string | null; person2Name: string | null;
  inviteCode: string | null; referralCount: number; createdAt: string | null;
  lastLogin: string | null; members: Member[]; contentTotal: number;
}
interface Resp { ok: boolean; page: number; totalPages: number; total: number; couples: CoupleRow[]; error?: string }

export default function AdminCouplesTable({ onOpenCouple }: { onOpenCouple: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Resp | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Debounce the search input into the actual query.
  useEffect(() => {
    const t = setTimeout(() => { setQuery(q); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setError(null);
    const params = new URLSearchParams({ page: String(page) });
    if (query) params.set("q", query);
    fetch(`/api/admin/couples?${params}`)
      .then((r) => r.json())
      .then((d) => (d.ok ? setData(d) : setError(d.error ?? "Failed")))
      .catch(() => setError("Network error"));
  }, [query, page]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name, email, invite or referral code…"
        style={{
          padding: "0.6rem 0.85rem", borderRadius: 10, fontSize: "0.9rem",
          border: "1px solid color-mix(in srgb, var(--text,#333) 16%, transparent)",
          background: "var(--cream,#fff)", color: "var(--text)", maxWidth: 460,
        }}
      />

      {error && <p style={muted}>Couldn’t load: {error}</p>}
      {!data && !error && <p style={muted}>Loading…</p>}

      {data && (
        <>
          <div style={{ ...muted, fontSize: "0.8rem" }}>{data.total} couple{data.total === 1 ? "" : "s"}</div>
          <div style={{ ...card, padding: 0, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Couple</th>
                  <th style={th}>Members</th>
                  <th style={th}>Joined</th>
                  <th style={th}>Last login</th>
                  <th style={th}>Content</th>
                  <th style={th}>Referrals</th>
                </tr>
              </thead>
              <tbody>
                {data.couples.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => onOpenCouple(c.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <td style={td}>
                      <strong>{[c.person1Name, c.person2Name].filter(Boolean).join(" & ") || "Unnamed"}</strong>
                      <div style={{ ...muted, fontSize: "0.74rem" }}>{c.inviteCode}</div>
                    </td>
                    <td style={td}>
                      {c.members.map((m) => (
                        <div key={m.id} style={{ fontSize: "0.8rem" }}>
                          {m.email}{" "}
                          {m.emailVerified ? null : <span style={pill("var(--muted,#888)")}>unverified</span>}
                        </div>
                      ))}
                      {c.members.length === 0 && <span style={muted}>—</span>}
                    </td>
                    <td style={td}>{shortDate(c.createdAt)}</td>
                    <td style={td}>{relativeTime(c.lastLogin)}</td>
                    <td style={td}><span style={pill()}>{c.contentTotal}</span></td>
                    <td style={td}>{c.referralCount || 0}</td>
                  </tr>
                ))}
                {data.couples.length === 0 && (
                  <tr><td style={td} colSpan={6}><span style={muted}>No couples match.</span></td></tr>
                )}
              </tbody>
            </table>
          </div>

          {data.totalPages > 1 && (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={pagerBtn(page <= 1)}>‹ Prev</button>
              <span style={{ ...muted, fontSize: "0.82rem" }}>Page {data.page} of {data.totalPages}</span>
              <button disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)} style={pagerBtn(page >= data.totalPages)}>Next ›</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function pagerBtn(disabled: boolean) {
  return {
    padding: "0.35rem 0.75rem", borderRadius: 8, fontSize: "0.82rem",
    border: "1px solid color-mix(in srgb, var(--text,#333) 16%, transparent)",
    background: "var(--cream,#fff)", color: "var(--text)",
    cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.45 : 1,
  } as const;
}
