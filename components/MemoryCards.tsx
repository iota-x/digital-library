"use client";
import { useState, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { useEscKey } from "@/lib/useEscKey";

const MEMORIES = [
  { title:"The Beginning 🌸",   body:"So it all started when we met on that one valorant swift LMAO, but it was so much more than that for me personally. You've literally become the person I care the most about in this world. I think of you even more than I think of myself at times. You have that effect on me, you're just magical I genuinely want to immerse myself in this beautiful journey of ours ♡ ", color:"#ffd6e0", rotation:-2 },
  { title:"Your voice 💗",   body:"Aapki voice toh is something I can most definitely say is my weakness, it is literally so cute and hot at the same time. I just can't explain how much I get turned on just listening to you on a daily basis <3 There are times when so sound soooooo cutee and ofc there are times when you sound so fuckin hot omg. But anyways, I feel blessed listening to you daily its like im so lucky that I get to listen to you daily? and like always? im literally so lucky and blessed to have you MWAHHHH",   color:"#ffc8dd", rotation:1.5 },
  { title:"us at 2 am 🌷", body:"Our late night calls are something which kinda grew on me so much that at this point its a non-negotiable in our books! I can safely say its the best part of my day or one of the best parts truly, listening to you while you're almost asleep or very eepy is so fuckin cute omg and we do talk some crazy stuff out there. It all feels like a dream to me sometimes and is a very good dream which genuinely came true and im legit so grateful and proud of myself that I made it true? Our late night talks are very comfy and something I look forward to the whole day cuz I can't wait to talk to you while we're both so comfy on our beds and sharing our deep thoughts or resolving stuff or doing stuff or sending reels or laughing ahahah we're so cute together like frfr. ",    color:"#ffb3c6", rotation:-1 },
  { title:"comfort core 🤍",  body:"It is hard for me to become comfortable around someone but it was so easy with you? like it literally just took me 2 weeks to get so much comfy around you and it just keeps getting better each day, I think at this point even you are very comfortable around me. Cuz once I do remember u saying that maybe when im more comfortable for turning on ur camera while you were making something in the kitchen which was truly understandable but yeah I think ab toh aap very comfy and maybe can do that too but regardless you're my comfort zone <33 I look forward to being very very very comfortable around you and want nothing less from you. I will do my best for you to be the most comfortable around me like you wouldn't even have to think before doing something which im sure will happen or already happens ehehehe. I love youuuuuu <33",   color:"#ff8fab", rotation:2, dark:true },
  { title:"home 💕",  body:"You have become my home the place where I go with all my problems, no matter how I feel or how I am, I will always come to you <33 You're literally very caring and the comfort I have found around you or just the way you have loved me feels nothing less than home its the best feeling I have ever experienced and im very grateful to you for showing me what it feels like to be loved this way. I'm very unware of stuff which happens around this time and im very thankful to you being so patient with me like truly im very dumb in these matters and situations but you have always welcomed me to have questions I could always come up to you regarding anything and never felt like oh maybe I shouldn't ask her? Because yeah you were always so kind and patient with me and im again very grateful to you for this <333 and can't thank you enough Juhiiii <333",    color:"var(--pink-mid)", rotation:-2.5 },
  { title:"still you 🌸",   body:"In the end it all comes down to YOU. You my love, are so magnificent and I adore you so so so much, I want us to experience everything together and have a very very beautiful journey together and forever, lets promise to always stay together okay? I love youu ain't enough but yeah I LOVE YOUUU SOOOOO FRICKIN MUCHHHH you have to stay w me cuz u got no other choice remember? MWAHHHH <333",    color:"var(--pink-light)", rotation:1 },
];

export default function MemoryCards() {
  const [active, setActive] = useState<number | null>(null);
  const ref = useRef(null);
  const inView = useInView(ref, { once:true, margin:"-80px" });
  useEscKey(() => setActive(null), active !== null);

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
        padding:"6rem 2rem",
        background:"var(--cream)",
      }}
    >
      <motion.h2
        initial={{ opacity:0, y:30 }}
        animate={inView ? { opacity:1, y:0 } : {}}
        transition={{ duration:0.7 }}
        style={{ fontFamily:"var(--font-playfair)", fontSize:"clamp(1.8rem,4vw,2.8rem)", color:"var(--pink-deep)", textAlign:"center" }}
      >
        our little memories 🌸
      </motion.h2>
      <motion.p
        initial={{ opacity:0 }}
        animate={inView ? { opacity:1 } : {}}
        transition={{ duration:0.7, delay:0.2 }}
        style={{ fontFamily:"var(--font-caveat)", fontSize:"1.3rem", color:"var(--muted)", textAlign:"center", margin:"0.5rem 0 3.5rem" }}
      >
        click to read the whole thing 💌
      </motion.p>

      <div style={{
        display:"grid",
        gridTemplateColumns:"repeat(auto-fill, minmax(260px, 1fr))",
        gap:"2rem",
        maxWidth:1100,
        width:"100%",
      }}>
        {MEMORIES.map((m, i) => (
          <motion.div
            key={i}
            onClick={() => setActive(i)}
            initial={{ opacity:0, y:50, rotate:m.rotation }}
            animate={inView ? { opacity:1, y:0, rotate:m.rotation } : {}}
            transition={{ duration:0.5, delay:i * 0.08 }}
            whileHover={{ scale:1.05, rotate:0, boxShadow:"8px 8px 32px rgba(0,0,0,.16)", zIndex:10 }}
            className="dk-mem-card"
            style={{
              background:m.color,
              borderRadius:4,
              padding:"2rem 1.8rem 1.5rem",
              minHeight:200,
              cursor:"pointer",
              position:"relative",
              display:"flex",
              flexDirection:"column",
              justifyContent:"space-between",
              boxShadow:"4px 4px 18px rgba(0,0,0,.10)",
            }}
          >
            <span style={{ position:"absolute", top:-14, left:"50%", transform:"translateX(-50%)", fontSize:"1.5rem" }}>📌</span>
            <h3 style={{ fontFamily:"var(--font-caveat)", fontWeight:600, fontSize:"1.3rem", marginBottom:"0.5rem", color:m.dark?"#fff":"var(--text)" }}>
              {m.title}
            </h3>
            <p style={{ fontFamily:"var(--font-caveat)", fontSize:"1.05rem", lineHeight:1.55, flex:1, color:m.dark?"var(--pink-light)":"var(--muted)" }}>
              {m.body.length > 80 ? m.body.slice(0,80)+"…" : m.body}
            </p>
            <span style={{ fontFamily:"var(--font-lato)", fontSize:"0.78rem", marginTop:"0.8rem", color:m.dark?"#ffd6e0":"var(--pink)" }}>
              tap to read more ✨
            </span>
          </motion.div>
        ))}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {active !== null && (
          <motion.div
            style={{
              position:"fixed", inset:0, zIndex:2000,
              display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem",
              background:"rgba(61,31,43,.55)",
            }}
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            onClick={() => setActive(null)}
          >
            <motion.div
              className="dk-mem-modal"
              style={{
                background:"#fff",
                borderRadius:24,
                padding:"3rem 2.5rem",
                maxWidth:500,
                width:"100%",
                position:"relative",
                boxShadow:"0 24px 60px rgba(var(--pink-deep-rgb),.25)",
              }}
              initial={{ scale:0.85, y:40 }}
              animate={{ scale:1, y:0 }}
              exit={{ scale:0.85, y:40 }}
              transition={{ type:"spring", stiffness:200, damping:22 }}
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setActive(null)}
                style={{ position:"absolute", top:14, right:18, fontSize:"1.4rem", background:"none", border:"none", cursor:"pointer", color:"var(--muted)", lineHeight:1 }}
              >✕</button>
              <h2 style={{ fontFamily:"var(--font-playfair)", fontSize:"1.6rem", color:"var(--pink-deep)", marginBottom:"1rem" }}>
                {MEMORIES[active].title}
              </h2>
              <p style={{ fontFamily:"var(--font-caveat)", fontSize:"1.2rem", color:"var(--text)", lineHeight:1.7 }}>
                {MEMORIES[active].body}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}