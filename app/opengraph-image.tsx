import { ImageResponse } from "next/og";

export const alt = "Us — a free private app for couples 💗";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Branded social-share card. Rendered once at build/edge — no custom fonts so it
// never fails on a missing asset.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(120% 90% at 20% 0%, #ff6a88 0%, transparent 55%), radial-gradient(120% 90% at 90% 100%, #ff99ac 0%, transparent 55%), linear-gradient(135deg, #2a0815, #4a1024)",
          color: "#fff",
          fontFamily: "Georgia, serif",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 130, lineHeight: 1 }}>💗</div>
        <div style={{ fontSize: 100, fontWeight: 700, marginTop: 12, letterSpacing: -2 }}>Us</div>
        <div style={{ fontSize: 44, marginTop: 8, color: "rgba(255,255,255,0.95)" }}>
          a free, private little world for two
        </div>
        <div
          style={{
            fontSize: 28,
            marginTop: 28,
            color: "rgba(255,255,255,0.8)",
            fontFamily: "Helvetica, Arial, sans-serif",
            letterSpacing: 1,
          }}
        >
          journal · memories · love notes · time capsules · long distance
        </div>
      </div>
    ),
    { ...size, emoji: "twemoji" },
  );
}
