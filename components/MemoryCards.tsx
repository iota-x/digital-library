"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { useEscKey } from "@/lib/useEscKey";
import { useUserData, updateSettings } from "@/lib/userStore";
import { DEFAULT_MEMORY_CARDS, type MemoryCardEntry } from "@/lib/themes";
import { useIsMobile } from "@/lib/useIsMobile";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { SERIF, SANS, SCRIPT } from "@/lib/typography";

// Stable card rotations — applied to whichever cards we render
const ROTATIONS = [-2, 1.5, -1, 2, -2.5, 1, -1.8, 2.2, -1.4, 1.6];

// Personal seed for Ankit & Juhi — used when they haven't edited anything yet
const ANKIT_JUHI_MEMORIES: MemoryCardEntry[] = [
  { title: "The Beginning 🌸", body: "So it all started when we met on that one valorant swift LMAO, but it was so much more than that for me personally. You've literally become the person I care the most about in this world. I think of you even more than I think of myself at times. You have that effect on me, you're just magical I genuinely want to immerse myself in this beautiful journey of ours ♡ " },
  { title: "Your voice 💗",     body: "Aapki voice toh is something I can most definitely say is my weakness, it is literally so cute and hot at the same time. I just can't explain how much I get turned on just listening to you on a daily basis <3 There are times when so sound soooooo cutee and ofc there are times when you sound so fuckin hot omg. But anyways, I feel blessed listening to you daily its like im so lucky that I get to listen to you daily? and like always? im literally so lucky and blessed to have you MWAHHHH" },
  { title: "us at 2 am 🌷",    body: "Our late night calls are something which kinda grew on me so much that at this point its a non-negotiable in our books! I can safely say its the best part of my day or one of the best parts truly, listening to you while you're almost asleep or very eepy is so fuckin cute omg and we do talk some crazy stuff out there. It all feels like a dream to me sometimes and is a very good dream which genuinely came true and im legit so grateful and proud of myself that I made it true? Our late night talks are very comfy and something I look forward to the whole day cuz I can't wait to talk to you while we're both so comfy on our beds and sharing our deep thoughts or resolving stuff or doing stuff or sending reels or laughing ahahah we're so cute together like frfr. " },
  { title: "comfort core 🤍",  body: "It is hard for me to become comfortable around someone but it was so easy with you? like it literally just took me 2 weeks to get so much comfy around you and it just keeps getting better each day, I think at this point even you are very comfortable around me. Cuz once I do remember u saying that maybe when im more comfortable for turning on ur camera while you were making something in the kitchen which was truly understandable but yeah I think ab toh aap very comfy and maybe can do that too but regardless you're my comfort zone <33 I look forward to being very very very comfortable around you and want nothing less from you. I will do my best for you to be the most comfortable around me like you wouldn't even have to think before doing something which im sure will happen or already happens ehehehe. I love youuuuuu <33" },
  { title: "home 💕",          body: "You have become my home the place where I go with all my problems, no matter how I feel or how I am, I will always come to you <33 You're literally very caring and the comfort I have found around you or just the way you have loved me feels nothing less than home its the best feeling I have ever experienced and im very grateful to you for showing me what it feels like to be loved this way. I'm very unware of stuff which happens around this time and im very thankful to you being so patient with me like truly im very dumb in these matters and situations but you have always welcomed me to have questions I could always come up to you regarding anything and never felt like oh maybe I shouldn't ask her? Because yeah you were always so kind and patient with me and im again very grateful to you for this <333 and can't thank you enough Juhiiii <333" },
  { title: "still you 🌸",     body: "In the end it all comes down to YOU. You my love, are so magnificent and I adore you so so so much, I want us to experience everything together and have a very very beautiful journey together and forever, lets promise to always stay together okay? I love youu ain't enough but yeah I LOVE YOUUU SOOOOO FRICKIN MUCHHHH you have to stay w me cuz u got no other choice remember? MWAHHHH <333" },
];

function isAnkitJuhi(name?: string|null, partner?: string|null): boolean {
  const names = [name?.trim().toLowerCase(), partner?.trim().toLowerCase()];
  return names.includes("ankit") && names.includes("juhi");
}

/* Each card is a different kind of "paper" — sticky note, polaroid, sealed
   letter, etc. Variants stay readable in light + dark across every theme. */
interface Decor { emoji: string; pos: "top-center" | "top-left" | "top-right"; rotate: number }
interface Variant {
  bg: string;
  border: string;
  extraStyle?: React.CSSProperties;
  decor: Decor;
  titleColor?: string;
}

const CARD_VARIANTS: Variant[] = [
  { bg: "var(--cream)", border: "1px solid rgba(var(--pink-rgb),.45)",
    extraStyle: { backgroundImage: "repeating-linear-gradient(transparent, transparent 26px, rgba(var(--pink-deep-rgb),.12) 27px)", borderTop: "4px solid var(--pink)" },
    decor: { emoji: "📌", pos: "top-center", rotate: 0 } },
  { bg: "linear-gradient(135deg, rgba(var(--pink-rgb),.32) 0%, rgba(var(--pink-rgb),.18) 100%)",
    border: "1px solid rgba(var(--pink-rgb),.5)",
    decor: { emoji: "🎀", pos: "top-right", rotate: 18 }, titleColor: "var(--pink-deep)" },
  { bg: "var(--cream)", border: "1px solid rgba(var(--pink-deep-rgb),.35)",
    extraStyle: { borderLeft: "5px solid var(--pink-deep)" },
    decor: { emoji: "🌸", pos: "top-left", rotate: -12 } },
  { bg: "linear-gradient(160deg, rgba(var(--pink-mid-rgb),.55) 0%, rgba(var(--pink-rgb),.32) 100%)",
    border: "1.5px double rgba(var(--pink-deep-rgb),.6)",
    decor: { emoji: "⭐", pos: "top-right", rotate: -8 }, titleColor: "var(--pink-deep)" },
  { bg: "rgba(var(--pink-rgb),.14)", border: "1.5px dashed rgba(var(--pink-rgb),.6)",
    decor: { emoji: "🩹", pos: "top-center", rotate: -4 } },
  { bg: "linear-gradient(135deg, rgba(var(--pink-deep-rgb),.32) 0%, rgba(var(--pink-rgb),.18) 100%)",
    border: "1px solid rgba(var(--pink-deep-rgb),.5)",
    extraStyle: { borderTop: "4px solid rgba(var(--pink-deep-rgb),.6)" },
    decor: { emoji: "💌", pos: "top-right", rotate: 14 }, titleColor: "var(--pink-deep)" },
];

interface EditorState {
  index: number | "new";
  title: string;
  body: string;
  isPrompt: boolean;  // body is just a question — clear it on focus
}

export default function MemoryCards() {
  const ref = useRef(null);
  const inView = useInView(ref, { once:true, margin:"-80px" });
  const userData = useUserData();
  const isMobile = useIsMobile();

  // Seed source — Ankit & Juhi get their personal memories as starter, others
  // get the generic question prompts. Either can edit on the spot.
  const seed = useMemo<MemoryCardEntry[]>(() =>
    isAnkitJuhi(userData?.name, userData?.partnerName)
      ? ANKIT_JUHI_MEMORIES
      : DEFAULT_MEMORY_CARDS,
    [userData?.name, userData?.partnerName]
  );

  // Local mirror of saved cards so optimistic UI is instant
  const [cards, setCards] = useState<MemoryCardEntry[]>(() => {
    const saved = userData?.settings?.memoryCards;
    return saved && saved.length > 0 ? saved : seed;
  });

  // Stay in sync when settings change from elsewhere (settings panel, partner edit)
  useEffect(() => {
    const saved = userData?.settings?.memoryCards;
    if (saved && saved.length > 0) setCards(saved);
  }, [userData?.settings?.memoryCards]);

  const [editor, setEditor] = useState<EditorState | null>(null);
  const [saving, setSaving] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  useFocusTrap(editorRef, { active: editor !== null, onEscape: () => setEditor(null) });
  useEscKey(() => setEditor(null), editor !== null);

  const persist = async (next: MemoryCardEntry[]) => {
    if (!userData?.settings) return;
    const settings = { ...userData.settings, memoryCards: next };
    setSaving(true);
    try {
      await fetch("/api/couples/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      updateSettings(settings);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (i: number) => {
    const c = cards[i];
    // If the card is still showing the prompt seed (not user-edited), treat
    // body as a placeholder the user should overwrite, not append to.
    const savedFromUser = userData?.settings?.memoryCards;
    const isPrompt = !savedFromUser || savedFromUser.length === 0;
    setEditor({ index: i, title: c.title, body: isPrompt ? "" : c.body, isPrompt });
  };
  const openNew = () => setEditor({ index: "new", title: "", body: "", isPrompt: false });

  const saveEditor = async () => {
    if (!editor) return;
    const trimmedTitle = editor.title.trim() || "untitled 🌸";
    const trimmedBody  = editor.body.trim();
    let next: MemoryCardEntry[];
    if (editor.index === "new") {
      next = [...cards, { title: trimmedTitle, body: trimmedBody }];
    } else {
      next = cards.map((c, idx) => idx === editor.index ? { title: trimmedTitle, body: trimmedBody } : c);
    }
    setCards(next);
    setEditor(null);
    await persist(next);
  };

  const removeCard = async (i: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = cards.filter((_, idx) => idx !== i);
    setCards(next);
    await persist(next);
  };

  return (
    <section
      id="memories"
      ref={ref}
      style={{
        width:"100%",
        minHeight:"100vh",
        display:"flex",
        flexDirection:"column",
        alignItems:"center",
        justifyContent:"center",
        padding:"clamp(4rem,10vh,7rem) clamp(1rem,4vw,2.5rem)",
        background:"var(--cream)",
      }}
    >
      <motion.h2
        initial={{ opacity:0, y:30 }}
        animate={inView ? { opacity:1, y:0 } : {}}
        transition={{ duration:0.7 }}
        style={{
          fontFamily:"var(--font-playfair)", fontStyle:"italic",
          fontSize:"clamp(1.6rem,4vw,2.6rem)",
          color:"var(--pink-deep)", textAlign:"center", marginBottom:"0.4rem",
        }}
      >
        little love notes 🌸
      </motion.h2>
      <motion.p
        initial={{ opacity:0 }}
        animate={inView ? { opacity:1 } : {}}
        transition={{ duration:0.7, delay:0.2 }}
        style={{
          fontFamily:"var(--font-caveat)", fontSize:"clamp(1rem,2.5vw,1.25rem)",
          color:"var(--muted)", textAlign:"center",
          margin:"0 auto clamp(2rem,5vh,3.5rem)", maxWidth:480,
        }}
      >
        tap a card to write your answer · ✕ removes · + adds a new one
      </motion.p>

      <div style={{
        display:"grid",
        gridTemplateColumns:"repeat(auto-fill, minmax(min(260px,100%), 1fr))",
        gap:"clamp(1rem,2.5vw,1.8rem)",
        maxWidth:1100,
        margin:"0 auto",
        width:"100%",
      }}>
        {cards.map((m, i) => {
          const variant  = CARD_VARIANTS[i % CARD_VARIANTS.length];
          const rotation = ROTATIONS[i % ROTATIONS.length];
          const decorStyle: React.CSSProperties =
            variant.decor.pos === "top-center"
              ? { top:-14, left:"50%", transform:`translateX(-50%) rotate(${variant.decor.rotate}deg)` }
              : variant.decor.pos === "top-left"
                ? { top:-12, left:14, transform:`rotate(${variant.decor.rotate}deg)` }
                : { top:-12, right:14, transform:`rotate(${variant.decor.rotate}deg)` };
          const savedFromUser = userData?.settings?.memoryCards;
          const isPrompt = !savedFromUser || savedFromUser.length === 0;
          return (
            <motion.div
              key={i}
              onClick={() => openEdit(i)}
              initial={{ opacity:0, y:50, rotate:rotation }}
              animate={inView ? { opacity:1, y:0, rotate:rotation } : {}}
              transition={{ duration:0.5, delay:i * 0.08 }}
              whileHover={isMobile ? undefined : { scale:1.04, rotate:0, zIndex:10, boxShadow:`8px 8px 32px rgba(var(--pink-deep-rgb),.22)` }}
              style={{
                background: variant.bg,
                border: variant.border,
                borderRadius: 6,
                padding: "clamp(1.3rem,3vw,2rem) clamp(1rem,2.5vw,1.6rem) clamp(1rem,2.5vw,1.4rem)",
                minHeight: "clamp(170px,20vw,210px)",
                cursor: "pointer",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxShadow: "4px 4px 18px rgba(var(--pink-deep-rgb),.12)",
                transition: "box-shadow .2s",
                ...variant.extraStyle,
              }}
            >
              <span aria-hidden style={{
                position:"absolute", fontSize:"1.5rem",
                filter:"drop-shadow(0 2px 4px rgba(0,0,0,.25))",
                ...decorStyle,
              }}>{variant.decor.emoji}</span>
              <button
                onClick={e => removeCard(i, e)}
                aria-label="remove this card"
                style={{
                  position:"absolute", top:6, right:8,
                  width:30, height:30, borderRadius:"50%",
                  background:"rgba(255,255,255,.55)", border:"1px solid rgba(var(--pink-deep-rgb),.25)",
                  color:"var(--pink-deep)", fontSize:"0.9rem", cursor:"pointer",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  opacity:0.7, transition:"opacity .15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "0.7")}
              >✕</button>
              <h3 style={{
                fontFamily:"var(--font-caveat)", fontWeight:600,
                fontSize:"clamp(1.05rem,2.5vw,1.25rem)",
                marginBottom:"0.5rem", color: variant.titleColor ?? "var(--text)",
              }}>
                {m.title}
              </h3>
              <p style={{
                fontFamily:"var(--font-caveat)",
                fontSize:"clamp(0.88rem,2vw,1rem)",
                lineHeight:1.55, flex:1,
                color: isPrompt ? "var(--muted)" : "var(--text)",
                fontStyle: isPrompt ? "italic" : "normal",
                opacity: isPrompt ? 0.85 : 1,
              }}>
                {m.body.length > 0
                  ? (m.body.length > 90 ? m.body.slice(0,90)+"…" : m.body)
                  : "tap to answer…"}
              </p>
              <span style={{
                fontFamily:"var(--font-lato)", fontSize:"0.72rem",
                marginTop:"0.7rem", color:"var(--pink-deep)", opacity:0.75,
              }}>
                {isPrompt ? "tap to write yours ✨" : "tap to edit ✨"}
              </span>
            </motion.div>
          );
        })}

        {/* + add card tile */}
        <motion.button
          onClick={openNew}
          initial={{ opacity:0, y:50 }}
          animate={inView ? { opacity:1, y:0 } : {}}
          transition={{ duration:0.5, delay:cards.length * 0.08 }}
          whileHover={isMobile ? undefined : { scale:1.04 }}
          aria-label="add a new memory card"
          style={{
            background: "transparent",
            border: "2px dashed rgba(var(--pink-deep-rgb),.4)",
            borderRadius: 6,
            padding: "clamp(1.3rem,3vw,2rem)",
            minHeight: "clamp(170px,20vw,210px)",
            cursor: "pointer",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: "0.5rem",
            fontFamily: SCRIPT, color: "var(--pink-deep)",
          }}
        >
          <span aria-hidden style={{ fontSize: "2rem" }}>＋</span>
          <span style={{ fontSize: "1.05rem" }}>add a card</span>
        </motion.button>
      </div>

      {/* Editor modal */}
      <AnimatePresence>
        {editor !== null && (
          <motion.div
            style={{
              position:"fixed", inset:0, zIndex:2000,
              display:"flex", alignItems:"center", justifyContent:"center",
              padding:"clamp(0.8rem,3vw,1.5rem)",
              background:"rgba(var(--pink-deep-rgb),.35)",
              backdropFilter:"blur(10px)",
              WebkitBackdropFilter:"blur(10px)",
            }}
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            onClick={() => setEditor(null)}
          >
            <motion.div
              ref={editorRef}
              className="memory-modal mobile-sheet"
              role="dialog" aria-modal="true" aria-labelledby="mc-edit-title"
              style={{
                background: "var(--cream)",
                border: "1px solid var(--pink-mid)",
                borderRadius: 24,
                padding: "clamp(1.8rem,4.5vw,2.4rem)",
                maxWidth: 520, width:"100%",
                position:"relative",
                boxShadow:`0 24px 60px rgba(var(--pink-deep-rgb),.28)`,
                maxHeight: "85dvh",
                overflowY: "auto",
                display:"flex", flexDirection:"column", gap:"1rem",
              }}
              initial={{ scale:0.92, y:30 }}
              animate={{ scale:1, y:0 }}
              exit={{ scale:0.92, y:30 }}
              transition={{ type:"spring", stiffness:240, damping:24 }}
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setEditor(null)}
                aria-label="close editor"
                style={{
                  position:"absolute", top:14, right:16, fontSize:"1.1rem",
                  background:"var(--cream)", border:"1px solid var(--pink-mid)",
                  borderRadius:"50%", width:34, height:34,
                  cursor:"pointer", color:"var(--muted)", lineHeight:1,
                  display:"flex", alignItems:"center", justifyContent:"center",
                }}
              >✕</button>
              <h2 id="mc-edit-title" style={{
                fontFamily:SERIF, fontStyle:"italic",
                fontSize:"clamp(1.3rem,3.5vw,1.6rem)",
                color:"var(--pink-deep)", margin:0,
              }}>
                {editor.index === "new" ? "a new little memory" : "edit this card"}
              </h2>

              <label style={{ display:"flex", flexDirection:"column", gap:"0.35rem" }}>
                <span style={{ fontFamily:SANS, fontSize:"0.7rem", color:"var(--muted)", letterSpacing:"0.14em", textTransform:"uppercase" }}>title</span>
                <input
                  autoFocus
                  value={editor.title}
                  onChange={e => setEditor(s => s ? { ...s, title: e.target.value } : s)}
                  placeholder="give it a name 🌸"
                  style={{
                    padding:"0.7rem 0.9rem", borderRadius:10,
                    border:"1px solid var(--pink-mid)", outline:"none",
                    background:"rgba(255,255,255,.7)",
                    fontFamily:SCRIPT, fontSize:"1.1rem", color:"var(--text)", fontWeight:600,
                  }}
                />
              </label>

              <label style={{ display:"flex", flexDirection:"column", gap:"0.35rem" }}>
                <span style={{ fontFamily:SANS, fontSize:"0.7rem", color:"var(--muted)", letterSpacing:"0.14em", textTransform:"uppercase" }}>your answer</span>
                <textarea
                  value={editor.body}
                  onChange={e => setEditor(s => s ? { ...s, body: e.target.value } : s)}
                  placeholder={editor.isPrompt ? cards[editor.index as number]?.body ?? "write your memory…" : "write your memory…"}
                  rows={8}
                  style={{
                    padding:"0.8rem 0.9rem", borderRadius:12,
                    border:"1px solid var(--pink-mid)", outline:"none",
                    background:"rgba(255,255,255,.7)",
                    fontFamily:SCRIPT, fontSize:"1.05rem", color:"var(--text)",
                    lineHeight:1.6, resize:"vertical", minHeight: 140,
                  }}
                />
              </label>

              <div style={{ display:"flex", gap:"0.6rem", justifyContent:"flex-end", marginTop:"0.4rem" }}>
                <button
                  onClick={() => setEditor(null)}
                  style={{
                    padding:"0.55rem 1.1rem", borderRadius:50,
                    background:"transparent", border:"1px solid var(--pink-mid)",
                    color:"var(--muted)", fontFamily:SANS, fontSize:"0.85rem", cursor:"pointer",
                  }}
                >cancel</button>
                <button
                  onClick={saveEditor}
                  disabled={saving}
                  style={{
                    padding:"0.55rem 1.3rem", borderRadius:50,
                    background:"linear-gradient(135deg,var(--pink),var(--pink-deep))",
                    border:"none", color:"#fff",
                    fontFamily:SANS, fontSize:"0.85rem", fontWeight:700, cursor: saving ? "wait" : "pointer",
                    boxShadow:"0 4px 14px rgba(var(--pink-deep-rgb),.35)",
                  }}
                >{saving ? "saving…" : "save 🌸"}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
