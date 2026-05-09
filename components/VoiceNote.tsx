"use client";
import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";

const WAVE_HEIGHTS = [12,20,35,50,44,38,28,50,42,30,22,40,50,36,28,20,44,50,38,25,18,42,50,40,30];

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec < 10 ? "0" : ""}${sec}`;
}

export default function VoiceNote() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [timeStr, setTimeStr] = useState("0:00 / 0:00");
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else          { a.play();  setPlaying(true);  }
  }

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => {
      if (a.duration) {
        setProgress(a.currentTime / a.duration * 100);
        setTimeStr(`${fmt(a.currentTime)} / ${fmt(a.duration)}`);
      }
    };
    const onEnd = () => setPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    return () => { a.removeEventListener("timeupdate", onTime); a.removeEventListener("ended", onEnd); };
  }, []);

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const a = audioRef.current;
    if (!a?.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    a.currentTime = ((e.clientX - rect.left) / rect.width) * a.duration;
  }

  return (
    <section
      id="voicenote"
      ref={ref}
      style={{
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "6rem 2rem",
        background: "linear-gradient(160deg,#fff5f9,#fce7f3)",
      }}
    >
      <motion.h2
        initial={{ opacity: 0, y: 30 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7 }}
        style={{
          fontFamily: "var(--font-playfair)",
          fontSize: "clamp(1.8rem,4vw,2.8rem)",
          color: "var(--pink-deep)",
          textAlign: "center",
          marginBottom: "3rem",
        }}
      >
        a voice note, just for you MY LOVEE 🎀
      </motion.h2>

      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
        transition={{ duration: 0.7, delay: 0.2, type: "spring", stiffness: 100 }}
        style={{
          background: "#fff",
          border: "2px solid #f9a8d4",
          borderRadius: 32,
          padding: "3.5rem",
          maxWidth: 480,
          width: "100%",
          boxShadow: "0 12px 48px rgba(244,114,182,.22)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "4rem", marginBottom: "0.4rem" }}>🎵💖</div>
        <p style={{ fontFamily: "var(--font-playfair)", fontSize: "1.2rem", color: "var(--pink-deep)", marginBottom: "0.3rem" }}>
          from me, to you 💗
        </p>
        <p style={{ fontFamily: "var(--font-lato)", fontSize: "0.85rem", color: "var(--muted)", marginBottom: "2rem" }}>
          {timeStr}
        </p>

        {/* Waveform */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, height: 60, marginBottom: "1.5rem" }}>
          {WAVE_HEIGHTS.map((h, i) => (
            <motion.div
              key={i}
              style={{ width: 5, borderRadius: 3, background: "linear-gradient(to top,#f9a8d4,var(--pink-deep))" }}
              animate={playing
                ? { height: [h * 0.5, h, h * 0.5], opacity: [0.6, 1, 0.6] }
                : { height: h * 0.4, opacity: 0.45 }
              }
              transition={{ duration: 0.9, delay: i * 0.04, repeat: playing ? Infinity : 0, ease: "easeInOut" }}
            />
          ))}
        </div>

        {/* Controls row */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
          {/* Progress bar */}
          <div
            onClick={seek}
            style={{
              flex: 1,
              height: 8,
              background: "#fce7f3",
              borderRadius: 8,
              cursor: "pointer",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <motion.div
              style={{
                height: "100%",
                borderRadius: 8,
                background: "linear-gradient(to right,var(--pink),var(--pink-deep))",
                width: `${progress}%`,
              }}
              transition={{ duration: 0.1 }}
            />
          </div>

          {/* Play button */}
          <motion.button
            onClick={toggle}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              flexShrink: 0,
              background: "linear-gradient(135deg,var(--pink),var(--pink-deep))",
              border: "none",
              cursor: "pointer",
              fontSize: "1.3rem",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 22px rgba(236,72,153,.38)",
            }}
          >
            {playing ? "⏸" : "▶"}
          </motion.button>
        </div>

        {/* Drop your voice note in /public/voicenote.mp3 */}
        <audio ref={audioRef} src="/voicenote.mp3" />

        <p style={{ fontFamily: "var(--font-caveat)", fontSize: "1.15rem", color: "var(--muted)", lineHeight: 1.8 }}>
          because hearing your voice is my favourite thing.<br />
          <strong style={{ color: "var(--pink-deep)" }}>so i thought maybe you should hear mine too.</strong>
          <br /><br />
          recorded with love &lt;3
        </p>
      </motion.div>
    </section>
  );
}