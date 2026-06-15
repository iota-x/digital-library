"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SERIF  = `"Georgia","Times New Roman",serif`;
const SANS   = `var(--font-lato),"Inter",system-ui,sans-serif`;
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

interface Pin { id: string; lat: number; lng: number; title: string; note: string; date: string; addedAt: string; }

function fmtDate(d: string) {
  if (!d) return "";
  const dt = new Date(d + "T12:00:00");
  return `${MONTHS[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;
}

export default function MemoryMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<any>(null);
  const markersRef   = useRef<Map<string, any>>(new Map());
  const LRef         = useRef<any>(null);

  const [pins,    setPins]    = useState<Pin[]>([]);
  const [adding,  setAdding]  = useState<{ lat: number; lng: number } | null>(null);
  const [title,   setTitle]   = useState("");
  const [note,    setNote]    = useState("");
  const [date,    setDate]    = useState("");
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [active,  setActive]  = useState<Pin | null>(null);
  const [hint,    setHint]    = useState(true);

  // Load pins
  useEffect(() => {
    fetch("/api/memoryplaces").then(r => r.json()).then(setPins).catch(() => {});
  }, []);

  const makeIcon = useCallback((L: any) => L.divIcon({
    className: "",
    html: `<div style="font-size:1.8rem;line-height:1;filter:drop-shadow(0 3px 8px rgba(var(--pink-deep-rgb),.55));transform:translate(-50%,-100%);cursor:pointer;user-select:none">💗</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -4],
  }), []);

  const addMarker = useCallback((L: any, map: any, pin: Pin) => {
    if (markersRef.current.has(pin.id)) return;
    const marker = L.marker([pin.lat, pin.lng], { icon: makeIcon(L) }).addTo(map);
    marker.on("click", () => setActive(pin));
    markersRef.current.set(pin.id, marker);
  }, [makeIcon]);

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let destroyed = false;
    (async () => {
      const [leafletCss, L] = await Promise.all([
        import("leaflet/dist/leaflet.css" as any),
        import("leaflet"),
      ]);
      if (destroyed || !containerRef.current) return;
      const Lmod = (L as any).default ?? L;
      LRef.current = Lmod;

      const map = Lmod.map(containerRef.current, {
        center: [22, 78], zoom: 4, zoomControl: false,
        attributionControl: true,
      });
      mapRef.current = map;

      Lmod.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>', maxZoom: 19 }
      ).addTo(map);

      Lmod.control.zoom({ position: "bottomright" }).addTo(map);

      map.on("click", (e: any) => {
        setAdding({ lat: e.latlng.lat, lng: e.latlng.lng });
        setTitle(""); setNote(""); setDate("");
        setHint(false);
      });

      // Add existing pins
      setPins(prev => { prev.forEach(p => addMarker(Lmod, map, p)); return prev; });
    })();

    return () => { destroyed = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } markersRef.current.clear(); };
  }, [addMarker]);

  // Sync new pins to map markers
  useEffect(() => {
    if (!mapRef.current || !LRef.current) return;
    pins.forEach(p => addMarker(LRef.current, mapRef.current, p));
  }, [pins, addMarker]);

  const savePin = async () => {
    if (!title.trim() || !adding) return;
    setSaving(true);
    try {
      const res = await fetch("/api/memoryplaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...adding, title, note, date }),
      });
      const { id } = await res.json();
      const newPin: Pin = { id, ...adding, title, note, date, addedAt: new Date().toISOString() };
      setPins(p => [...p, newPin]);
      setAdding(null); setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const deletePin = async (id: string) => {
    await fetch("/api/memoryplaces", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    const marker = markersRef.current.get(id);
    if (marker && mapRef.current) mapRef.current.removeLayer(marker);
    markersRef.current.delete(id);
    setPins(p => p.filter(x => x.id !== id));
    setActive(null);
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "calc(100vh - 64px)" }}>
      {/* Map container */}
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {/* Tap hint */}
      <AnimatePresence>
        {hint && pins.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ delay: 1 }}
            style={{
              position: "absolute", bottom: "5rem", left: "50%", transform: "translateX(-50%)",
              zIndex: 800, background: "rgba(255,245,249,.92)", border: "1px solid rgba(var(--pink-deep-rgb),.2)",
              borderRadius: 50, padding: "0.6rem 1.4rem", backdropFilter: "blur(12px)",
              boxShadow: "0 4px 20px rgba(var(--pink-deep-rgb),.15)", pointerEvents: "none",
            }}>
            <p style={{ fontFamily: SANS, fontSize: "0.82rem", color: "var(--pink-deep)", margin: 0, whiteSpace: "nowrap" }}>
              💗 tap anywhere on the map to pin a memory
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pin count badge */}
      {pins.length > 0 && (
        <div style={{
          position: "absolute", top: "1rem", right: "1rem", zIndex: 800,
          background: "rgba(255,245,249,.92)", border: "1px solid rgba(var(--pink-deep-rgb),.2)",
          borderRadius: 50, padding: "0.4rem 1rem", backdropFilter: "blur(12px)",
          boxShadow: "0 2px 12px rgba(var(--pink-deep-rgb),.15)",
        }}>
          <p style={{ fontFamily: SANS, fontSize: "0.78rem", color: "var(--pink-deep)", margin: 0 }}>
            💗 {pins.length} place{pins.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      {/* Saved toast */}
      <AnimatePresence>
        {saved && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ position: "absolute", bottom: "2rem", left: "50%", transform: "translateX(-50%)", zIndex: 900, background: "rgba(var(--pink-deep-rgb),.9)", borderRadius: 50, padding: "0.55rem 1.4rem", color: "#fff", fontFamily: SANS, fontSize: "0.85rem", boxShadow: "0 4px 20px rgba(var(--pink-deep-rgb),.4)" }}>
            💗 pinned!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add pin modal */}
      <AnimatePresence>
        {adding && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setAdding(null)}
              style={{ position: "absolute", inset: 0, zIndex: 850, background: "rgba(6,1,4,.45)", backdropFilter: "blur(2px)" }} />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92 }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
              style={{
                position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
                zIndex: 900, background: "rgba(255,245,249,.97)",
                borderRadius: 24, padding: "1.8rem", width: "min(92vw,380px)",
                boxShadow: "0 24px 70px rgba(0,0,0,.35)", border: "1px solid rgba(var(--pink-deep-rgb),.18)",
              }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.3rem" }}>
                <span style={{ fontSize: "1.5rem" }}>📍</span>
                <h3 style={{ fontFamily: SERIF, fontStyle: "italic", color: "var(--pink-deep)", margin: 0, fontSize: "1.25rem", fontWeight: 400 }}>
                  pin this place
                </h3>
              </div>

              <p style={{ fontFamily: SANS, fontSize: "0.68rem", color: "rgba(var(--pink-deep-rgb),.5)", letterSpacing: "0.16em", textTransform: "uppercase", margin: "0 0 0.3rem" }}>place name</p>
              <input
                autoFocus value={title} onChange={e => setTitle(e.target.value)}
                onKeyDown={e => e.key === "Enter" && savePin()}
                placeholder="our favourite café, where we first met…"
                style={{ width: "100%", padding: "0.72rem 1rem", border: "1px solid rgba(var(--pink-deep-rgb),.2)", borderRadius: 10, fontFamily: SANS, fontSize: "0.9rem", color: "#4a1628", outline: "none", background: "rgba(var(--pink-light-rgb),.3)", boxSizing: "border-box", marginBottom: "0.9rem" }}
              />

              <p style={{ fontFamily: SANS, fontSize: "0.68rem", color: "rgba(var(--pink-deep-rgb),.5)", letterSpacing: "0.16em", textTransform: "uppercase", margin: "0 0 0.3rem" }}>date (optional)</p>
              <input
                type="date" value={date} onChange={e => setDate(e.target.value)}
                style={{ width: "100%", padding: "0.72rem 1rem", border: "1px solid rgba(var(--pink-deep-rgb),.2)", borderRadius: 10, fontFamily: SANS, fontSize: "0.9rem", color: "#4a1628", outline: "none", background: "rgba(var(--pink-light-rgb),.3)", boxSizing: "border-box", marginBottom: "0.9rem" }}
              />

              <p style={{ fontFamily: SANS, fontSize: "0.68rem", color: "rgba(var(--pink-deep-rgb),.5)", letterSpacing: "0.16em", textTransform: "uppercase", margin: "0 0 0.3rem" }}>memory (optional)</p>
              <textarea
                value={note} onChange={e => setNote(e.target.value)}
                placeholder="what happened here…"
                rows={3}
                style={{ width: "100%", padding: "0.72rem 1rem", border: "1px solid rgba(var(--pink-deep-rgb),.2)", borderRadius: 10, fontFamily: SERIF, fontStyle: "italic", fontSize: "0.92rem", color: "#4a1628", outline: "none", background: "rgba(var(--pink-light-rgb),.3)", boxSizing: "border-box", resize: "none", lineHeight: 1.7, marginBottom: "1.2rem" }}
              />

              <div style={{ display: "flex", gap: "0.7rem" }}>
                <motion.button onClick={savePin} disabled={saving || !title.trim()}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  style={{ flex: 1, padding: "0.9rem", borderRadius: 12, border: "none", cursor: "pointer", background: "linear-gradient(135deg,var(--pink),var(--pink-deep))", color: "#fff", fontFamily: SANS, fontSize: "0.92rem", fontWeight: 700, opacity: !title.trim() ? 0.45 : 1, boxShadow: "0 4px 18px rgba(var(--pink-deep-rgb),.3)" }}>
                  {saving ? "saving…" : "pin it 💗"}
                </motion.button>
                <button onClick={() => setAdding(null)}
                  style={{ padding: "0.9rem 1rem", borderRadius: 12, border: "1px solid rgba(var(--pink-deep-rgb),.25)", background: "transparent", color: "rgba(var(--pink-deep-rgb),.6)", fontFamily: SANS, fontSize: "0.88rem", cursor: "pointer" }}>
                  cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* View pin modal */}
      <AnimatePresence>
        {active && !adding && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setActive(null)}
              style={{ position: "absolute", inset: 0, zIndex: 850, background: "rgba(6,1,4,.4)", backdropFilter: "blur(2px)" }} />
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
              style={{
                position: "absolute", bottom: "2rem", left: "50%", transform: "translateX(-50%)",
                zIndex: 900, background: "rgba(255,245,249,.97)",
                borderRadius: 24, padding: "1.6rem", width: "min(92vw,380px)",
                boxShadow: "0 16px 50px rgba(0,0,0,.3)", border: "1px solid rgba(var(--pink-deep-rgb),.18)",
              }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.7rem" }}>
                <span style={{ fontSize: "1.6rem", flexShrink: 0 }}>💗</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontFamily: SERIF, fontStyle: "italic", color: "var(--pink-deep)", margin: "0 0 0.2rem", fontSize: "1.15rem", fontWeight: 400 }}>{active.title}</h3>
                  {active.date && (
                    <p style={{ fontFamily: SANS, fontSize: "0.78rem", color: "rgba(var(--pink-deep-rgb),.5)", margin: "0 0 0.5rem" }}>{fmtDate(active.date)}</p>
                  )}
                  {active.note && (
                    <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.92rem", color: "#4a1628", lineHeight: 1.75, margin: "0 0 0.8rem" }}>"{active.note}"</p>
                  )}
                </div>
                <button onClick={() => setActive(null)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(var(--pink-deep-rgb),.3)", fontSize: "1.1rem", padding: 0, flexShrink: 0 }}>✕</button>
              </div>
              <button onClick={() => deletePin(active.id)}
                style={{ fontFamily: SANS, fontSize: "0.75rem", color: "rgba(var(--pink-deep-rgb),.4)", background: "none", border: "none", cursor: "pointer", padding: "0.3rem 0 0", display: "block" }}>
                remove pin
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
