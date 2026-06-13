"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;
const SERIF = `"Georgia","Times New Roman",serif`;
const SANS  = `var(--font-lato),"Inter",system-ui,sans-serif`;
const SCRIPT = `var(--font-caveat),"Caveat",cursive`;

const WAVE_HEIGHTS = [12,20,35,50,44,38,28,50,42,30,22,40,50,36,28,20,44,50,38,25,18,42,50,40,30];

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec < 10 ? "0" : ""}${sec}`;
}
function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface VNote { id: string; url: string; from: string; label: string; createdAt: string; }

function NotePlayer({ note, onDelete }: { note: VNote; onDelete: (id: string) => void }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [timeStr, setTimeStr] = useState("0:00");

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => {
      if (a.duration) {
        setProgress(a.currentTime / a.duration * 100);
        setTimeStr(fmt(a.currentTime));
      }
    };
    const onEnd = () => { setPlaying(false); setProgress(0); setTimeStr("0:00"); };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    return () => { a.removeEventListener("timeupdate", onTime); a.removeEventListener("ended", onEnd); };
  }, []);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const a = audioRef.current;
    if (!a?.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    a.currentTime = ((e.clientX - rect.left) / rect.width) * a.duration;
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{
        background: "rgba(255,255,255,.85)",
        border: "1.5px solid #f9a8d4",
        borderRadius: 20,
        padding: "1.4rem 1.6rem",
        boxShadow: "0 4px 24px rgba(244,114,182,.15)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.7rem", marginBottom: "0.9rem" }}>
        <span style={{ fontSize: "1.4rem" }}>🎙️</span>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontFamily: SERIF, fontStyle: "italic", fontSize: "0.95rem", color: "#4a1628" }}>
            {note.label || (note.from ? `from ${note.from}` : "a voice note")}
          </p>
          <p style={{ margin: "0.1rem 0 0", fontFamily: SANS, fontSize: "0.72rem", color: "rgba(190,24,93,.5)" }}>
            {note.from && note.label ? `from ${note.from} · ` : ""}{fmtDate(note.createdAt)}
          </p>
        </div>
        <button
          onClick={() => onDelete(note.id)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(190,24,93,.3)", fontSize: "1rem", padding: "2px 4px" }}
          title="delete"
        >×</button>
      </div>

      {/* Mini waveform */}
      <div style={{ display: "flex", alignItems: "center", gap: 3, height: 36, marginBottom: "0.8rem" }}>
        {WAVE_HEIGHTS.map((h, i) => (
          <motion.div key={i}
            style={{ width: 4, borderRadius: 2, background: "linear-gradient(to top,#f9a8d4,#be185d)" }}
            animate={playing
              ? { height: [h * 0.5, h, h * 0.5], opacity: [0.5, 1, 0.5] }
              : { height: h * 0.35, opacity: 0.35 }}
            transition={{ duration: 0.9, delay: i * 0.04, repeat: playing ? Infinity : 0, ease: "easeInOut" }}
          />
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
        <motion.button onClick={toggle}
          whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.93 }}
          style={{
            width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
            background: "linear-gradient(135deg,#f472b6,#be185d)", border: "none",
            cursor: "pointer", fontSize: "1rem", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 16px rgba(236,72,153,.35)",
          }}>
          {playing ? "⏸" : "▶"}
        </motion.button>
        <div onClick={seek} style={{ flex: 1, height: 7, background: "#fce7f3", borderRadius: 7, cursor: "pointer", overflow: "hidden" }}>
          <div style={{ height: "100%", background: "linear-gradient(to right,#f9a8d4,#be185d)", borderRadius: 7, width: `${progress}%`, transition: "width 0.1s" }} />
        </div>
        <span style={{ fontFamily: SANS, fontSize: "0.72rem", color: "rgba(190,24,93,.5)", flexShrink: 0, minWidth: 32 }}>{timeStr}</span>
      </div>
      <audio ref={audioRef} src={note.url} preload="metadata" />
    </motion.div>
  );
}

export default function VoiceNote() {
  const [notes, setNotes] = useState<VNote[]>([]);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const [from, setFrom] = useState("");
  const [label, setLabel] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  useEffect(() => {
    fetch("/api/voicenotes").then(r => r.json()).then((data: VNote[]) => {
      setNotes(data);
      if (data.length > 0) {
        const lastSeen = localStorage.getItem("vn_last_seen") || "0";
        const newest = data[0]?.createdAt || "0";
        setHasNew(newest > lastSeen);
      }
    }).catch(() => {});
  }, []);

  // Mark as seen when this section comes into view
  useEffect(() => {
    if (!inView || notes.length === 0) return;
    localStorage.setItem("vn_last_seen", new Date().toISOString());
    setHasNew(false);
  }, [inView, notes.length]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4" });
      chunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.start(100);
      mediaRef.current = recorder;
      setRecording(true);
      setRecSecs(0);
      timerRef.current = setInterval(() => setRecSecs(s => s + 1), 1000);
    } catch {
      alert("Microphone access denied. Please allow mic access and try again.");
    }
  }, []);

  const stopAndUpload = useCallback(async () => {
    const recorder = mediaRef.current;
    if (!recorder) return;
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);

    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
      recorder.stream.getTracks().forEach(t => t.stop());
      setUploading(true);

      try {
        const fd = new FormData();
        fd.append("file", blob, "voicenote.webm");
        fd.append("upload_preset", PRESET);
        fd.append("resource_type", "video");
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/video/upload`, { method: "POST", body: fd });
        const data = await res.json();
        if (!data.secure_url) throw new Error("Upload failed");

        await fetch("/api/voicenotes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: data.secure_url, from, label }),
        });

        const updated = await fetch("/api/voicenotes").then(r => r.json());
        setNotes(updated);
        setFrom(""); setLabel(""); setShowForm(false);
        setSaved(true); setTimeout(() => setSaved(false), 3000);
      } catch (e) {
        alert("Upload failed — check your internet and try again.");
        console.error(e);
      } finally {
        setUploading(false);
      }
    };
    recorder.stop();
  }, [from, label]);

  async function deleteNote(id: string) {
    await fetch("/api/voicenotes", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setNotes(n => n.filter(x => x.id !== id));
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
        padding: "clamp(4rem,8vh,7rem) clamp(1rem,4vw,3rem)",
        background: "linear-gradient(160deg,#fff5f9,#fce7f3)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7 }}
        style={{ maxWidth: 540, width: "100%" }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem", marginBottom: "0.8rem" }}>
            <div style={{ width: 40, height: 1, background: "linear-gradient(90deg,transparent,rgba(190,24,93,.4))" }} />
            <motion.span style={{ fontSize: "2rem" }} animate={{ y: [-3, 3, -3] }} transition={{ repeat: Infinity, duration: 3 }}>🎙️</motion.span>
            <div style={{ width: 40, height: 1, background: "linear-gradient(90deg,rgba(190,24,93,.4),transparent)" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.6rem" }}>
            <h2 style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "clamp(1.8rem,4vw,2.6rem)", color: "#be185d", margin: "0 0 0.3rem", fontWeight: 400 }}>
              voice notes, just for us
            </h2>
            <AnimatePresence>
              {hasNew && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}
                  style={{ fontFamily: SANS, fontSize: "0.62rem", fontWeight: 700, background: "linear-gradient(135deg,#f472b6,#be185d)", color: "#fff", borderRadius: 20, padding: "0.18rem 0.6rem", letterSpacing: "0.06em", boxShadow: "0 2px 10px rgba(190,24,93,.35)", alignSelf: "flex-start", marginTop: "0.5rem", whiteSpace: "nowrap" }}>
                  ✨ new
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <p style={{ fontFamily: SANS, fontSize: "0.85rem", color: "rgba(190,24,93,.55)", margin: 0 }}>
            record a little something — it lives here forever 💗
          </p>
        </div>

        {/* Saved toast */}
        <AnimatePresence>
          {saved && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ background: "rgba(190,24,93,.08)", border: "1px solid rgba(190,24,93,.25)", borderRadius: 12, padding: "0.8rem 1.2rem", marginBottom: "1.2rem", textAlign: "center", fontFamily: SANS, fontSize: "0.88rem", color: "#be185d" }}>
              🎙️ Voice note saved!
            </motion.div>
          )}
        </AnimatePresence>

        {/* Record card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.15 }}
          style={{ background: "#fff", border: "2px solid #f9a8d4", borderRadius: 24, padding: "2rem 1.8rem", marginBottom: "1.5rem", boxShadow: "0 8px 40px rgba(244,114,182,.18)" }}
        >
          {!showForm && !recording && !uploading && (
            <motion.button
              onClick={() => setShowForm(true)}
              whileHover={{ scale: 1.02, y: -2, boxShadow: "0 10px 32px rgba(190,24,93,.22)" }}
              whileTap={{ scale: 0.97 }}
              style={{ width: "100%", padding: "1.1rem", border: "1.5px dashed rgba(190,24,93,.4)", borderRadius: 16, background: "rgba(252,231,243,.3)", cursor: "pointer", fontFamily: SERIF, fontStyle: "italic", fontSize: "1.05rem", color: "#be185d", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.6rem" }}
            >
              🎙️ record a new voice note
            </motion.button>
          )}

          <AnimatePresence>
            {showForm && !recording && !uploading && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
                <p style={{ fontFamily: SANS, fontSize: "0.68rem", color: "rgba(190,24,93,.5)", letterSpacing: "0.16em", textTransform: "uppercase", margin: "0 0 0.35rem" }}>from</p>
                <input value={from} onChange={e => setFrom(e.target.value)} placeholder="your name"
                  style={{ width: "100%", padding: "0.7rem 1rem", border: "1px solid rgba(190,24,93,.2)", borderRadius: 10, fontFamily: SANS, fontSize: "0.9rem", color: "#4a1628", outline: "none", background: "rgba(252,231,243,.3)", boxSizing: "border-box", marginBottom: "0.9rem" }} />
                <p style={{ fontFamily: SANS, fontSize: "0.68rem", color: "rgba(190,24,93,.5)", letterSpacing: "0.16em", textTransform: "uppercase", margin: "0 0 0.35rem" }}>label (optional)</p>
                <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. good morning, goodnight, i miss you…"
                  style={{ width: "100%", padding: "0.7rem 1rem", border: "1px solid rgba(190,24,93,.2)", borderRadius: 10, fontFamily: SANS, fontSize: "0.9rem", color: "#4a1628", outline: "none", background: "rgba(252,231,243,.3)", boxSizing: "border-box", marginBottom: "1.2rem" }} />
                <div style={{ display: "flex", gap: "0.7rem" }}>
                  <motion.button onClick={startRecording}
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    style={{ flex: 1, padding: "0.95rem", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#f472b6,#be185d)", color: "#fff", fontFamily: SANS, fontSize: "0.95rem", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 18px rgba(190,24,93,.3)" }}>
                    start recording 🎙️
                  </motion.button>
                  <button onClick={() => setShowForm(false)}
                    style={{ padding: "0.95rem 1rem", borderRadius: 12, border: "1px solid rgba(190,24,93,.25)", background: "transparent", color: "rgba(190,24,93,.6)", fontFamily: SANS, fontSize: "0.88rem", cursor: "pointer" }}>
                    cancel
                  </button>
                </div>
              </motion.div>
            )}

            {recording && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ textAlign: "center" }}>
                {/* Live waveform */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, height: 52, marginBottom: "1rem" }}>
                  {WAVE_HEIGHTS.map((h, i) => (
                    <motion.div key={i}
                      style={{ width: 5, borderRadius: 3, background: "linear-gradient(to top,#f9a8d4,#be185d)" }}
                      animate={{ height: [h * 0.4, h, h * 0.4], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 0.7 + i * 0.03, delay: i * 0.04, repeat: Infinity, ease: "easeInOut" }}
                    />
                  ))}
                </div>
                <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1, repeat: Infinity }}
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(190,24,93,.08)", padding: "0.4rem 1rem", borderRadius: 20, marginBottom: "1.2rem" }}>
                  <span style={{ width: 8, height: 8, background: "#be185d", borderRadius: "50%", display: "inline-block" }} />
                  <span style={{ fontFamily: SANS, fontSize: "0.88rem", color: "#be185d", fontWeight: 600 }}>recording · {fmt(recSecs)}</span>
                </motion.div>
                <br />
                <motion.button onClick={stopAndUpload}
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  style={{ padding: "0.9rem 2.5rem", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#f472b6,#be185d)", color: "#fff", fontFamily: SANS, fontSize: "0.95rem", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 18px rgba(190,24,93,.3)" }}>
                  stop & save ⏹
                </motion.button>
              </motion.div>
            )}

            {uploading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: "center", padding: "1.5rem 0" }}>
                <motion.span animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                  style={{ display: "inline-block", fontSize: "1.8rem", marginBottom: "0.6rem" }}>🌀</motion.span>
                <p style={{ fontFamily: SANS, fontSize: "0.9rem", color: "#be185d", margin: 0 }}>uploading your voice…</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Notes list */}
        <AnimatePresence>
          {notes.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
              <p style={{ fontFamily: SANS, fontSize: "0.68rem", color: "rgba(190,24,93,.45)", letterSpacing: "0.16em", textTransform: "uppercase", margin: "0 0 0.2rem" }}>
                saved ({notes.length})
              </p>
              {notes.map(n => <NotePlayer key={n.id} note={n} onDelete={deleteNote} />)}
            </motion.div>
          )}
        </AnimatePresence>

        {notes.length === 0 && !showForm && !recording && (
          <div style={{ textAlign: "center", padding: "2rem 0" }}>
            <p style={{ fontFamily: SCRIPT, fontSize: "1.1rem", color: "rgba(190,24,93,.4)", lineHeight: 1.8, margin: 0 }}>
              because hearing your voice is my favourite thing.<br />
              <strong style={{ color: "#be185d" }}>so i thought maybe you should hear mine too.</strong>
            </p>
          </div>
        )}
      </motion.div>
    </section>
  );
}
