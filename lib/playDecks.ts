/**
 * Card decks for the /play games — truth-or-dare and would-you-rather. Sweet,
 * couple-y, and doable whether you're on the same couch or far apart. Purely
 * client content; no backend.
 */

export const TRUTHS: string[] = [
  "what was your very first impression of me?",
  "what's a tiny thing I do that you secretly love?",
  "when did you realise you were falling for me?",
  "what's a moment with me you'd relive on repeat?",
  "what's something you've never told me but want to?",
  "what's your favourite photo of us, and why?",
  "what do you miss most when we're apart?",
  "what song instantly reminds you of me?",
  "what's a dream you want us to chase together?",
  "what made you smile about me today?",
  "what's the most thoughtful thing I've ever done for you?",
  "what's one thing you want more of from us?",
  "where do you most want to travel with me?",
  "what's a habit of mine you'd happily put up with forever?",
  "what does a perfect lazy day with me look like?",
];

export const DARES: string[] = [
  "send me the last photo in your camera roll, no explaining 📸",
  "do your best impression of me right now 😄",
  "text me three things you love about me — go 💌",
  "serenade me with 10 seconds of any song 🎤",
  "give me a 20-second shoulder rub (or promise one for later) 🤲",
  "show me your phone wallpaper and the story behind it 📱",
  "say something cheesy and mean it 🧀💗",
  "plan our next date in one sentence, right now 🗓️",
  "recreate our first selfie pose 🤳",
  "give me the most dramatic compliment you can 🎭",
  "do a happy dance for 10 seconds 💃",
  "voice-note me 'goodnight' in the silliest voice 🎙️",
  "describe me using only emojis ✨",
  "tell me a memory of us you think I forgot 🫶",
  "draw a tiny heart somewhere and send proof ❤️",
];

export interface Dilemma { a: string; b: string }

export const WOULD_YOU_RATHER: Dilemma[] = [
  { a: "a cosy night in 🛋️", b: "a night out together ✨" },
  { a: "breakfast in bed 🥐", b: "a sunrise walk 🌅" },
  { a: "travel the world 🌍", b: "build the perfect home 🏡" },
  { a: "always know what I'm thinking 💭", b: "always feel what I feel 💗" },
  { a: "a slow dance in the kitchen 💃", b: "a long drive with our songs 🚗" },
  { a: "relive our first date 🌸", b: "fast-forward to a future one 🔮" },
  { a: "handwritten letters 💌", b: "midnight phone calls ☎️" },
  { a: "matching tattoos 🖋️", b: "a song that's 'ours' 🎵" },
  { a: "beach holiday 🏝️", b: "mountain cabin 🏔️" },
  { a: "cook together every night 🍳", b: "try every restaurant in town 🍽️" },
  { a: "a pet we raise together 🐶", b: "a garden we grow together 🌷" },
  { a: "stargaze till 3am ✨", b: "sleep in till noon 😴" },
  { a: "be each other's hype team 📣", b: "be each other's calm 🌊" },
  { a: "surprise gifts 🎁", b: "surprise plans 🎈" },
  { a: "forehead kisses 🥹", b: "hand squeezes 🤝" },
];
