/**
 * Curated date-night & reconnect suggestions — the deterministic baseline
 * behind /api/ideas. Works with zero AI; the optional Claude layer personalises
 * on top of these using the couple's own bucket list, watchlist and mood.
 */

export interface Idea { title: string; blurb: string }
export type IdeaMode = "date" | "reconnect";

export const DATE_IDEAS: Idea[] = [
  { title: "cook one dish together 🍳", blurb: "pick a recipe neither of you has tried and split the steps" },
  { title: "golden-hour walk 🌅", blurb: "no phones — just a slow loop and whatever comes up" },
  { title: "recreate your first date 💞", blurb: "same food, same playlist, tell the story again" },
  { title: "blind-pick movie night 🎬", blurb: "each writes 3 titles, draw one from a cup, no vetoes" },
  { title: "dessert crawl 🍦", blurb: "one shared treat at three different places" },
  { title: "build a tiny fort 🏕️", blurb: "blankets, fairy lights, snacks, one long talk" },
  { title: "learn a 2-minute dance 💃", blurb: "follow a clip until you both (badly) nail it" },
  { title: "photo scavenger hunt 📸", blurb: "a list of 10 silly things to find & snap on a walk" },
  { title: "plan a dream trip 🗺️", blurb: "pretend-budget a week somewhere you'll go one day" },
  { title: "candle-lit at-home dinner 🕯️", blurb: "dress up a little even if it's just pasta" },
  { title: "stargaze & wish list ✨", blurb: "lie back, name constellations, share one quiet hope each" },
  { title: "thrift a gift for each other 🎁", blurb: "20-minute budget, find something that says 'you'" },
];

export const RECONNECT_IDEAS: Idea[] = [
  { title: "highs & lows 🌗", blurb: "each share the best and hardest moment of your week" },
  { title: "phones in a basket 🧺", blurb: "one hour, fully present, see where it goes" },
  { title: "ask one new question 💭", blurb: "something you've never actually asked each other" },
  { title: "three things I appreciate 🤍", blurb: "small, specific, said out loud — take turns" },
  { title: "the 6-second hug 🫂", blurb: "long enough to actually settle — try it twice today" },
  { title: "rewatch your first photos 📷", blurb: "scroll back to the beginning and reminisce" },
  { title: "plan a 'nothing' evening 🌙", blurb: "no goals — just be near each other and unwind" },
  { title: "write a tiny note 💌", blurb: "leave it somewhere they'll find it tomorrow" },
  { title: "talk about 'us' 💗", blurb: "what's going well, and one thing to nurture together" },
  { title: "share a comfort song 🎧", blurb: "play the one that feels like you two and just listen" },
];

/** Deterministic-ish shuffle from a numeric seed (so refreshes vary). */
function shuffle<T>(arr: T[], seed: number): T[] {
  const a = arr.slice();
  let s = seed || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickIdeas(mode: IdeaMode, count: number, seed: number): Idea[] {
  const pool = mode === "date" ? DATE_IDEAS : RECONNECT_IDEAS;
  return shuffle(pool, seed).slice(0, Math.min(count, pool.length));
}
