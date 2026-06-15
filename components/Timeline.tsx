

"use client";
import { useState, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";

const EVENTS = [
  {
    q: "remember when we had our genshin night for 2days straight?",
    tag: "where it all started 🎮",
    icon: "🎮",
    color: "#ffd6e0",
    letter: `We had few genshin nights together in my server and we used to sit thru entire night me grinding on your account and u grinding on mine. During that time you shared a lot too and I remember most of it cuz I have a specific kinda memory as u have known by now for you especially lol. So I got to know so much about you in those calls about ur past and family some personal details too, thats when I thought maybe u're getting comfortable around me sharing these stuff and it made me super happy like damn shes sharing stuff so maybe she thinks atleast im decent cuz tbh I always thought u hated most of us in my server lol but anyways yeah this was something which made me think about us more posetively <33`,
  },

  {
    q: "remember when we had our 8 am valorant session?",
    tag: "where i started to feel that way🎀",
    icon: "🫠",
    color: "#ffc8dd",
    letter: `I'm ngl i remember it like yesterday, I remember every bit of it, about all the exes you yapped about and all the chaos you had in your life at that time and phase ♡ But NOW that i'm here with you istg I will make things better and show you what a person truly in love can do for you and take care of you <333, even tho it ended that way I'd still always remember the time I had spent with you, cuz it was purely so good, I love listening to you and will genuinely never get tired of it 🎀`,
  },

  {
    q: "remember when you cried for the first time on call w me?",
    tag: "the moment i wanted to hug you 🫂",
    icon: "🫂",
    color: "#ffb3c6",
    letter: `It was that time and u know it, I was genuinely very stunned and shocked and didn't know how to react and stuff but at the same time I wanted to give you a hug so much (at that time I couldn't even say it i was that shy 😭) so yeah this is something I would never forget and I'm glad it was me who was there for you at that moment cuz all i wanted for you at that time was to comfort you or give u comfort but was clearly very unable to do so, so I just listened all of it as I always did. After that day I felt more attached to you in a way that made me feel more inclined to show you that I actually care about you a lot and want to give you so much comfort and love 😭❤️`,
  },

  {
    q: "remember when I confessed?",
    tag: "the scariest & best thing 🌷",
    icon: "🌷",
    color: "#ffccd5",
    letter: `Honestly the scariest thing ever for me I wasn't ready to lose you either but i still went ahead and did that, turns out it became the best thing I ever did for myself and so fuckin glad it all worked out after that even tho i was in a function and made it seem like im still avoiding LMAO but you're so patient with me and im grateful to you for being with me. I have only wanted you AND will keep wanting YOUUU <33`,
  },

  {
    q: "remember when we first slept on call?",
    tag: "our nightly tradition 🌙",
    icon: "🌙",
    color: "#ffe0ec",
    letter: `I think it was right after the day I confessed all my feelings and how I truly feel about you and since you slept on call which did happen before too in my server but I had the perms to actually disconnect and I did say a couple times that (I think aap call pe so gaye so I dc'ed you) but that day we were in your server and that too a priv vc so couldn't dc you and I was like why not give you company and sleep in vc too (was a part of my bucket list btw i think maine aapko abhi tak nahi bataya tha hehe) and I was so glad it happened pehle din hi and I REMEMBER U STAYING IN VC SUBAH TO GIVE ME COMPANY I WAS SO HAPPY AFTER WAKING UP AND SEEING THAT GENUINELY <33.

Then it became our daily thing and now its non-negotiable btw sleep calls are mandatory or calling before sleeping is something very very important to both of us and we both hold it very dear cuz I genuinely love hearing to you like how was ur day and stuff and our usual comforting each other I think i feel so much better after listening to aapka cutesy sa voice ambsfjsbf <3333`,
  },

  {
    q: "remember when we got matching pfps?",
    tag: "we're so fuckin cute together 💖",
    icon: "🩷",
    color: "#ffc8dd",
    letter: `WAS ONE OF MY BUCKET LIST THING TO DO and when u said it khudse I was SO FRICKIN HAPPY, I wanted to say YES YES YES but had to say suree but yeah im very chalant ig I show a lot and as I get more comfortable around someone I get even more chalant ehehehe but yeah this is something i will not forget I have always wanted to do this w you idc if ppl find it cringe or nah but I wanna do every cutesy stuff with you thats why im insisted we have it everywhere ehehe because Yeah I LOVE ITTTTT <3333`,
  },

  {
    q: "remember when we first said I LOVE YOUU?",
    tag: "making us official 🩷",
    icon: "💗",
    color: "#ffd6e0",
    letter: `It took us a bit but we made it and in the end I did have the courage to say it first 😭 and you were like ILY kya hota hai and just then I knew YOU are the one and only I need in my life and ever since that day I said it so many times almost daily but NEVER enough btw it clearly isnt enough to show how much I truly love you but its a moment I will never forget and it was exactly 2 months ago that we said it for the first time ❤️`,
  },
  {
    q: "remember when we joined the steam family?",
    tag: "was so cute 😋",
    icon: "🤗",
    color: "#ffe0ec",
    letter: `It was so sweet of you to let me in on your steam id and make me ur child innit ahahaa i loved you having control over all my steam stuff like it was so cute when I had to ask you to let me download it right? sooner or later we started sharing everything...who texted us got so real and i love every single bit of it <33`

  },

  {
    q: "remember when you introduced me to your cousin?",
    tag: "roblox date 💅",
    icon: "🌟",
    color: "#ffe0ec",
    letter: `I was kinda nervous that day but i made it thru ehehehe it was very wholesome when i could understand stuff you two were talking about and you giggling all over trying to explain her in the most non obvious ways ahahahah, we had so much fun in roblox and you guys even took pictures, even tho i did not talk to her directly or could even hear her I could feel every single conversations yall were having and it made me very very happy.`
  },

  {
    q: "remember when we had our first video call?",
    tag: "experiencing you 😍",
    icon: "😳",
    color: "#ffb3c6",
    letter: `No matter how many troubles we went thru we never gave up and giving up isnt an option either like no matter how many hardships we face we will always be there for each other and I mean it when I say im always there for you no matter what, My love for you is unconditional frfr.

It took a lot but we had our first video call together and it was the cutest thing ever I was blushing so hard and even YOU ahahaaha and we smiled and giggled so so so much I can't think of anything more cute than that we were literally stuffing our faces in the pillows asjdfbefj. I ADORE U SM <333`,
  },

  {
    q: "remember when we got too comfortable around each other?",
    tag: "home started feeling like you 🏡",
    icon: "🏡",
    color: "#ffe0ec",
    letter: `I think our video call was the start of being more comfortable I could feel it and it was all a slow process but a very delightful one, we managed to get so comfortable around each other at this point we say and do a lotta stuff which goes unnoticed from our side for the stuff which we could think of oh maybe I shud mute before sneezing or wtv but now we just do it (idk is a small thing but I noticed) even me humming songs in the vc atp i can safely say im the most comfortable around you whenever we're in the vc you are my bestfriend, partner, lover and my everything 💗`,
  },
  {
    q: "remember us making our first playlist together?",
    tag: "bucket list kinda thingy 🥰",
    icon: "🎶",
    color: "#ffe0ec",
    letter: `It was one of my goals to have a shared playlist with you and since we both like music so much it can also be a very niche way to share our thoughts and express ourselves so I thought of the plan we use rn of adding one song each day and I actually try to decode every single day based on the song you add LMAO i know im very silly and i look for a lotta signs and stuff but it only comes from my caring side i swear <33`
  },

  {
    q: "remember us overthinking about stuff?",
    tag: "atleast we care to think ❤️",
    icon: "😭",
    color: "#ffe0ec",
    letter: `Its a part of it and we gotta be there for each other in these moments and i'd say we both did pretty well to stick w each other we both were there for each other countless overthinking, many thoughts, few doubts but in the end we talked it all out and hoping to do that forever and ever cuz we ain't leaving each other in these moments, whats the point of being together when not actually being there for each other right? And dw Babe i'm always there for you and im very glad you comfort me in the most beautiful ways possible it genuinely shows that you care for me so much <33`
  },
  {
    q: "remember us starting to journal stuff?",
    tag: "one of the most intimate things 👀",
    icon: "📔",
    color: "#ffe0ec",
    letter: `You saw how much I love writing and suggested this beautiful idea which im very glad u did and we've been using it so much but not enough to only talk things over it and not actually talk, but yeah whenever i miss you my mind goes towards me writing stuff about you which then transitioned to me actually journaling it followed by you doing it too honestly a very romantic thing for me 💗`
  },
  {
    q: "remember us being insecure?",
    tag: "i'd kiss all your insecurities frfr 💋",
    icon: "🫠",
    color: "#ffe0ec",
    letter: `Being insecure is not a bad thing don't worry it only shows how much you care and think about me, as u said doing things off of insecurities is not somethiing u wanna do which i totally respect and have waited for you in every single situation but yeah never think that you'll be too much for me okay? I'm here for it all and not just the goodies, my love for you is unconditional and i mean it. I LOVE YOUU JUHIII <33`
  },

  {
    q: "remember our I'd still choose you phase?",
    tag: "beautiful realization ✨",
    icon: "💖",
    color: "#ffe0ec",
    letter: `After everything happened because of the game 😭 i think we both kinda realized that I'd still choose you, understanding the phases, awkward silences, repetitive routines but we naturally keep choosing each other's company and it feels so right be with you fr I mean it you're the best thing that has ever happened to me and I would never want to lose you and i think you feel the same and I'll do my best to keep things stay as they are, so yeah cheers to our 2 months together and here's to wishing for the best forever future ahead 💖`
  },
  
  
];

/* ── single memory card ── */
function MemoryCard({ ev, idx, onOpen }: { ev: typeof EVENTS[0]; idx: number; onOpen: () => void }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const isLeft = idx % 2 === 0;

  return (
    <div
      ref={ref}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "1.5rem",
        flexDirection: isLeft ? "row" : "row-reverse",
        width: "100%",
        marginBottom: "4rem",
        position: "relative",
      }}
    >
      {/* card — takes ~45% */}
      <motion.button
        onClick={onOpen}
        initial={{ opacity: 0, x: isLeft ? -60 : 60 }}
        animate={inView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.65, ease: "easeOut" }}
        whileHover={{ y: -6, scale: 1.02, boxShadow: "0 20px 50px rgba(244,114,182,.28)" }}
        whileTap={{ scale: 0.98 }}
        className="dk-timeline-card"
        style={{
          flex: "0 0 45%",
          background: "#fff",
          border: `2px solid ${ev.color}`,
          borderRadius: 22,
          padding: "1.6rem 1.8rem",
          textAlign: isLeft ? "right" : "left",
          cursor: "pointer",
          outline: "none",
          boxShadow: "0 6px 24px rgba(244,114,182,.14)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* color blob */}
        <div style={{
          position: "absolute",
          [isLeft ? "left" : "right"]: -24,
          top: -24,
          width: 90, height: 90,
          borderRadius: "50%",
          background: ev.color,
          opacity: 0.4,
          pointerEvents: "none",
        }} />

        {/* tag pill */}
        <span style={{
          display: "inline-block",
          fontFamily: "var(--font-caveat)", fontSize: "0.85rem",
          color: "var(--pink-deep)",
          background: ev.color + "99",
          borderRadius: 50, padding: "0.18rem 0.75rem",
          marginBottom: "0.7rem",
        }}>
          {ev.tag}
        </span>

        <p style={{
          fontFamily: "var(--font-caveat)", fontWeight: 600,
          fontSize: "1.15rem", color: "var(--text)", lineHeight: 1.45,
          marginBottom: "0.9rem",
        }}>
          {ev.q}
        </p>

        <span style={{
          fontFamily: "var(--font-lato)", fontSize: "0.78rem",
          color: "var(--pink)",
          display: "flex", alignItems: "center", gap: "0.3rem",
          justifyContent: isLeft ? "flex-end" : "flex-start",
        }}>
          read the letter ✉️
        </span>
      </motion.button>

      {/* centre dot + icon */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={inView ? { scale: 1, opacity: 1 } : {}}
        transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
        style={{
          flex: "0 0 auto",
          width: 52, height: 52,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${ev.color}, var(--pink-deep))`,
          border: "3px solid #fff",
          boxShadow: `0 0 0 3px ${ev.color}, 0 6px 18px rgba(236,72,153,.25)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.3rem",
          zIndex: 2,
          flexShrink: 0,
          alignSelf: "center",
        }}
      >
        {ev.icon}
      </motion.div>

      {/* spacer to balance the other side */}
      <div style={{ flex: "0 0 45%" }} />
    </div>
  );
}

export default function Timeline() {
  const [active, setActive]   = useState<number | null>(null);
  const headerRef              = useRef(null);
  const headerInView           = useInView(headerRef, { once: true });

  function open(i: number)  { setActive(i);   document.body.style.overflow = "hidden"; }
  function close()          { setActive(null); document.body.style.overflow = "";       }

  return (
    <section
      id="timeline"
      style={{
        width: "100%", minHeight: "100vh",
        display: "flex", flexDirection: "column",
        alignItems: "center",
        padding: "6rem 2rem 8rem",
        background: "linear-gradient(180deg,var(--cream) 0%,#fff5f9 50%,var(--cream) 100%)",
        position: "relative", overflow: "hidden",
      }}
    >
      {/* bg watermark */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        fontSize: "40vw", opacity: 0.025,
        pointerEvents: "none", userSelect: "none", lineHeight: 1,
      }}>💗</div>

      {/* Header */}
      <div ref={headerRef} style={{ textAlign: "center", marginBottom: "4rem", position: "relative", zIndex: 2 }}>
        <motion.p
          initial={{ opacity: 0, y: -10 }} animate={headerInView ? { opacity: 1, y: 0 } : {}}
          style={{ fontFamily:"var(--font-caveat)", fontSize:"1rem", color:"var(--pink)", letterSpacing:"0.12em", marginBottom:"0.4rem", textTransform:"uppercase" }}
        >
          before any of this existed
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 20 }} animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.1 }}
          style={{ fontFamily:"var(--font-playfair)", fontSize:"clamp(1.8rem,4vw,2.8rem)", color:"var(--pink-deep)" }}
        >
          our story, from the start 💌
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }} animate={headerInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.25 }}
          style={{ fontFamily:"var(--font-caveat)", fontSize:"1.2rem", color:"var(--muted)", marginTop:"0.4rem" }}
        >
          moments we remembered & wrote down, long before we made this 🌙
        </motion.p>
      </div>

      {/* Timeline */}
      <div style={{ position: "relative", width: "100%", maxWidth: 820, zIndex: 2 }}>

        {/* static centre line — simple, no scroll animation that can get stuck */}
        <div style={{
          position: "absolute",
          left: "50%", top: 0, bottom: 0,
          width: 3,
          transform: "translateX(-50%)",
          background: "linear-gradient(to bottom, transparent, #f9a8d4 8%, #f9a8d4 92%, transparent)",
          borderRadius: 4,
          zIndex: 1,
        }} />

        {EVENTS.map((ev, i) => (
          <MemoryCard key={i} ev={ev} idx={i} onOpen={() => open(i)} />
        ))}

        {/* End marker */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ type: "spring", stiffness: 160 }}
          style={{
            position: "relative", left: "50%", transform: "translateX(-50%)",
            width: 56, height: 56, borderRadius: "50%",
            background: "linear-gradient(135deg,var(--pink),var(--pink-deep))",
            border: "3px solid #fff",
            boxShadow: "0 0 0 4px #f9a8d4, 0 8px 24px rgba(236,72,153,.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.5rem",
          }}
        >
          💗
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          style={{ fontFamily:"var(--font-caveat)", textAlign:"center", color:"var(--muted)", marginTop:"1rem", fontSize:"1.1rem" }}
        >
          this is where it all began 🩷
        </motion.p>
      </div>

      {/* ── LETTER DRAWER ── */}
      <AnimatePresence>
        {active !== null && (
          <>
            <motion.div
              key="dim"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={close}
              style={{ position:"fixed", inset:0, zIndex:9997, background:"rgba(61,31,43,.42)", backdropFilter:"blur(6px)" }}
            />
            <motion.div
              key="drawer"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type:"spring", stiffness:220, damping:28 }}
              className="dk-timeline-drawer"
              style={{
                position:"fixed", bottom:0, left:0, right:0, zIndex:9998,
                maxHeight:"80vh", borderRadius:"28px 28px 0 0",
                background:"#fff",
                boxShadow:"0 -12px 60px rgba(236,72,153,.22)",
                display:"flex", flexDirection:"column", overflow:"hidden",
              }}
            >
              {/* drag handle */}
              <div style={{ display:"flex", justifyContent:"center", padding:"0.9rem 0 0" }}>
                <div style={{ width:44, height:5, borderRadius:99, background:"#f9a8d4" }} />
              </div>

              {/* header */}
              <div style={{
                background: `linear-gradient(135deg,${EVENTS[active].color},#f9a8d4)`,
                padding:"1.4rem 2rem 1.2rem",
                flexShrink:0, position:"relative", overflow:"hidden",
              }}>
                <div style={{ position:"absolute", top:-30, right:-30, width:110, height:110, borderRadius:"50%", background:"rgba(255,255,255,.15)" }} />
                <div style={{ display:"flex", alignItems:"center", gap:"0.9rem" }}>
                  <span style={{ fontSize:"2rem" }}>{EVENTS[active].icon}</span>
                  <div>
                    <span style={{ fontFamily:"var(--font-caveat)", fontSize:"0.85rem", color:"rgba(255,255,255,.9)", display:"block", marginBottom:"0.2rem" }}>
                      {EVENTS[active].tag}
                    </span>
                    <h3 style={{ fontFamily:"var(--font-playfair)", fontStyle:"italic", fontSize:"clamp(1rem,3vw,1.4rem)", color:"#fff", lineHeight:1.35 }}>
                      {EVENTS[active].q}
                    </h3>
                  </div>
                </div>
              </div>

              {/* lined body */}
              <div style={{
                flex:1, overflowY:"auto", padding:"1.8rem 2rem 1.5rem",
                backgroundImage:"repeating-linear-gradient(to bottom,transparent,transparent 31px,#f9a8d418 31px,#f9a8d418 32px)",
                backgroundAttachment:"local",
              }}>
                <div style={{ display:"flex", alignItems:"center", gap:"0.6rem", marginBottom:"1.2rem" }}>
                  <motion.span animate={{ rotate:[-5,5,-5] }} transition={{ repeat:Infinity, duration:2 }} style={{ fontSize:"1.2rem" }}>💌</motion.span>
                  <div style={{ flex:1, height:1, background:"linear-gradient(to right,#f9a8d4,transparent)" }} />
                </div>
                <p style={{ fontFamily:"var(--font-caveat)", fontSize:"1.22rem", color:"var(--text)", lineHeight:"2rem", whiteSpace:"pre-wrap" }}>
                  {EVENTS[active].letter}
                </p>
                <div style={{ display:"flex", alignItems:"center", gap:"0.6rem", marginTop:"1.5rem" }}>
                  <div style={{ flex:1, height:1, background:"linear-gradient(to left,#f9a8d4,transparent)" }} />
                  <span style={{ fontFamily:"var(--font-caveat)", fontSize:"0.95rem", color:"var(--pink-deep)" }}>— with all my love 🩷</span>
                </div>
              </div>

              {/* footer */}
              <div style={{ padding:"0.8rem 2rem 1.4rem", flexShrink:0, display:"flex", justifyContent:"center", borderTop:"1px solid var(--pink-light)" }}>
                <motion.button
                  whileHover={{ scale:1.05 }} whileTap={{ scale:0.97 }}
                  onClick={close}
                  style={{
                    fontFamily:"var(--font-caveat)", fontSize:"1.1rem",
                    color:"var(--pink-deep)", background:"var(--pink-light)",
                    border:"2px solid #f9a8d4", borderRadius:50,
                    padding:"0.65rem 2.4rem", cursor:"pointer",
                  }}
                >
                  fold it back 💌
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
}