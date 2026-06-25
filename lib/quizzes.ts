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
  {
    id: "tastes",
    title: "same taste, or chaos?",
    emoji: "🍿",
    blurb: "the little everyday picks — bet you'll match more than you think",
    questions: [
      { id: "pizza", text: "the perfect pizza is…", options: ["loaded with everything 🍕", "classic margherita 🧀", "pineapple, fight me 🍍", "whatever's cheesiest 🤤"] },
      { id: "coffee", text: "morning drink of choice?", options: ["strong coffee ☕", "milky chai 🫖", "something cold & sweet 🧋", "just water, calm down 💧"] },
      { id: "music", text: "road-trip soundtrack?", options: ["throwback hits 📻", "sad-but-pretty songs 🥲", "loud sing-alongs 🎶", "true crime podcast 🎙️"] },
      { id: "weather", text: "best weather to be lazy in?", options: ["rainy & grey 🌧️", "sunny & warm ☀️", "cosy & snowy ❄️", "windy beach day 🌬️"] },
      { id: "snacktime", text: "midnight snack run is for…", options: ["something salty 🍟", "something sweet 🍫", "ice cream, obviously 🍦", "leftovers, no shame 🍱"] },
      { id: "vacay", text: "ideal vacation pace?", options: ["packed itinerary 🗺️", "do absolutely nothing 🏖️", "a bit of both ⚖️", "wherever the day goes 🍃"] },
      { id: "show", text: "what we actually watch?", options: ["comfort re-runs 📺", "the new hyped thing 🍿", "documentaries 🎥", "we just scroll forever 📱"] },
    ],
  },
  {
    id: "who-more",
    title: "who's more likely to…",
    emoji: "🫵",
    blurb: "point the finger — see if your stories match",
    questions: [
      { id: "cry-happy", text: "cry happy tears first?", options: ["me 😭", "them 🥹", "both, instantly 💧", "neither, we're rocks 🗿"] },
      { id: "overpack", text: "overpack for a trip?", options: ["me 🧳", "them 🎒", "both, hopeless 😅", "neither, light travellers 🪶"] },
      { id: "say-sorry", text: "say sorry first after a tiff?", options: ["me 🙇", "them 🤲", "we race to it 🏃", "we just hug it out 🤗"] },
      { id: "spend", text: "spend on a random treat?", options: ["me 💸", "them 🛍️", "both, oops 😬", "neither, savers 🐷"] },
      { id: "plan-surprise", text: "plan a surprise?", options: ["me 🎉", "them 🎁", "both, secretly 🤫", "neither, we tell everything 📢"] },
      { id: "fall-asleep", text: "fall asleep during a movie?", options: ["me 😴", "them 💤", "both by the credits 🛌", "neither, night owls 🦉"] },
      { id: "get-lost", text: "get us hopelessly lost?", options: ["me 🧭", "them 🗺️", "both, no signal 📵", "neither, we're pros 🚗"] },
    ],
  },
  {
    id: "our-story",
    title: "our story so far",
    emoji: "📖",
    blurb: "remember-when questions — answer privately, then compare",
    questions: [
      { id: "first-word", text: "what was our very first conversation about?", options: ["something random 🎲", "a shared interest 🎯", "pure flirting 😏", "honestly, no idea 🤔"] },
      { id: "first-date-feel", text: "how did our first date actually feel?", options: ["butterflies 🦋", "instantly easy 🛋️", "a little awkward 😅", "like coming home 🏡"] },
      { id: "turning-point", text: "the moment it got serious was…", options: ["a deep late-night talk 🌙", "a tiny everyday thing 🍃", "getting through something hard 💪", "we just knew 💞"] },
      { id: "nickname-origin", text: "our nicknames came from…", options: ["an inside joke 😂", "totally random 🎲", "something sweet 🥰", "we don't even remember 🤷"] },
      { id: "best-trip", text: "our best memory so far is…", options: ["a trip we took ✈️", "a quiet day at home 🏠", "a big celebration 🎉", "too many to pick 💕"] },
      { id: "song-ours", text: "the song that's most 'us'?", options: ["the slow one 🎵", "the silly one 🤪", "the one from a moment 🎶", "we have a whole playlist 🎧"] },
    ],
  },
  {
    id: "future-us",
    title: "the future we're picturing",
    emoji: "🔮",
    blurb: "dream a little — see how aligned your daydreams are",
    questions: [
      { id: "home-type", text: "our someday home is…", options: ["cosy & small 🏡", "big & full of people 🏘️", "somewhere with a view 🌄", "wherever we both are 💞"] },
      { id: "weekend-future", text: "future weekends look like…", options: ["slow & quiet 🍃", "always an adventure 🗺️", "friends & family over 🫂", "a mix of everything 🎨"] },
      { id: "tradition", text: "a tradition we should start?", options: ["yearly trip somewhere new ✈️", "a special date night 🕯️", "cook the same meal 🍲", "a silly little ritual 🎈"] },
      { id: "grow-old", text: "growing old, we'll be the couple who…", options: ["still travels everywhere 🌍", "bickers adorably 😂", "hosts everyone 🍷", "naps together a lot 😴"] },
      { id: "next-year", text: "one thing for us this year?", options: ["a trip together ✈️", "a new shared hobby 🎨", "more slow days 🌿", "just more of this 💗"] },
      { id: "legacy", text: "what we hope people say about us?", options: ["'goals' 💑", "'so much fun' 🎉", "'so kind together' 🤍", "'still obsessed' 😍"] },
    ],
  },
  {
    id: "soft-spicy",
    title: "soft & a little flirty",
    emoji: "🔥",
    blurb: "tasteful but cheeky — answer honestly, no peeking",
    questions: [
      { id: "attract", text: "what first drew you to me?", options: ["the smile 😁", "the energy ⚡", "the eyes 👀", "the whole vibe ✨"] },
      { id: "fav-feature", text: "my most attractive feature?", options: ["eyes 👁️", "smile 😊", "laugh 😄", "the way I look at you 🥰"] },
      { id: "best-look", text: "I look best when I'm…", options: ["all dressed up 👗", "comfy & relaxed 🧦", "first thing in the morning ☀️", "laughing 😂"] },
      { id: "flirt-style", text: "our flirting style is…", options: ["cheesy lines 🧀", "playful teasing 😏", "soft & sweet 🥰", "all of the above 💞"] },
      { id: "perfect-night", text: "the perfect 'just us' night?", options: ["candles & slow music 🕯️", "blanket fort & movies 🛋️", "dancing in the kitchen 💃", "no plans, just close 🤍"] },
      { id: "miss-touch", text: "apart, I miss most…", options: ["holding hands 🤝", "the hugs 🤗", "lazy cuddles 🛌", "just being close 💗"] },
    ],
  },
];

export function getQuizPack(id: string): QuizPack | null {
  return QUIZ_PACKS.find((p) => p.id === id) ?? null;
}
