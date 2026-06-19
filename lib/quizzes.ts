/**
 * Couple quiz packs — the content behind the /play "how in sync are you?" game.
 *
 * Each pack is a set of multiple-choice questions both partners answer
 * privately. When both have submitted, the /api/quiz route reveals both sets
 * and scores how many answers *matched* — a playful compatibility read, in the
 * same both-answer-then-reveal spirit as the daily question.
 *
 * Packs are deterministic and couple-agnostic (no AI required). The optional
 * Claude layer (lib/ai.ts, added later) can generate fresh packs on top of
 * these, but everything here works on its own.
 */

export interface QuizQuestion {
  /** Stable id — used as the answer key, so never renumber existing ones. */
  id: string;
  text: string;
  options: string[];
}

export interface QuizPack {
  id: string;
  title: string;
  emoji: string;
  blurb: string;
  questions: QuizQuestion[];
}

export const QUIZ_PACKS: QuizPack[] = [
  {
    id: "in-sync",
    title: "how in sync are you?",
    emoji: "💞",
    blurb: "answer privately — we'll reveal where you matched",
    questions: [
      { id: "date", text: "our perfect date night is…", options: ["cozy night in 🛋️", "dinner out ✨", "a little adventure 🌄", "anything, together 💗"] },
      { id: "travel", text: "dream trip together?", options: ["beach & sun 🏝️", "mountains & quiet 🏔️", "a big city 🌃", "road trip, no plan 🚗"] },
      { id: "morning", text: "we're more of a…", options: ["early birds ☀️", "night owls 🌙", "one of each 🐣🦉", "depends on the day 🤷"] },
      { id: "love", text: "love language we lean on most?", options: ["quality time ⏳", "words 💌", "touch 🤍", "little gifts 🎁"] },
      { id: "weekend", text: "ideal lazy weekend?", options: ["movie marathon 🎬", "brunch & a walk 🥐", "see friends 🫂", "do absolutely nothing 😌"] },
      { id: "argue", text: "we most often (playfully) argue about…", options: ["what to eat 🍕", "what to watch 📺", "who's right 😏", "we barely do 🕊️"] },
      { id: "treat", text: "our shared comfort treat?", options: ["ice cream 🍦", "pizza 🍕", "chocolate 🍫", "chai/coffee ☕"] },
      { id: "future", text: "what we daydream about most?", options: ["a home together 🏡", "travelling the world 🌍", "little adventures 🎈", "growing old together 👵🧓"] },
    ],
  },
  {
    id: "how-well",
    title: "how well do you know us?",
    emoji: "🧠",
    blurb: "pick the answer you think you'll both land on",
    questions: [
      { id: "first", text: "who said 'I love you' first?", options: ["me 🙋", "them 🫵", "kind of at the same time 💞", "still arguing about it 😅"] },
      { id: "planner", text: "who's the planner?", options: ["me 📋", "them 🗓️", "neither (chaos) 🌪️", "both, too much 😂"] },
      { id: "texter", text: "who texts back faster?", options: ["me ⚡", "them 🐢", "we're both glued 📱", "we both forget 🙈"] },
      { id: "sweet", text: "who's the secretly soft one?", options: ["me 🥹", "them 🫠", "both, equally 💗", "we'd never admit it 🤐"] },
      { id: "snack", text: "who steals the other's food?", options: ["me 😋", "them 🍟", "we share everything 🤝", "don't touch the fries 🔪"] },
      { id: "cry", text: "who cries at movies?", options: ["me 😭", "them 🥲", "both of us 🫶", "neither, stone hearts 🗿"] },
    ],
  },
  {
    id: "deep",
    title: "a little deeper",
    emoji: "🌙",
    blurb: "the softer questions — answer honestly",
    questions: [
      { id: "safe", text: "what makes you feel safest with each other?", options: ["being held 🤍", "being heard 👂", "laughing together 😄", "just their presence 🌷"] },
      { id: "grow", text: "what's grown most since we started?", options: ["our patience 🧘", "our trust 🔒", "our silliness 🤪", "all of it 💫"] },
      { id: "hard", text: "we get through hard days by…", options: ["talking it out 💬", "a long hug 🫂", "space, then us ↩️", "a little of each 🌗"] },
      { id: "miss", text: "apart, I miss most…", options: ["their voice 🎙️", "their hugs 🤗", "the little jokes 😆", "literally everything 💗"] },
      { id: "proud", text: "I'm proudest of us for…", options: ["how we communicate 🗨️", "how we show up 🙌", "how we have fun 🎉", "how far we've come 🛤️"] },
    ],
  },
];

export function getQuizPack(id: string): QuizPack | null {
  return QUIZ_PACKS.find((p) => p.id === id) ?? null;
}
