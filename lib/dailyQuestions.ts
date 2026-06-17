/**
 * The daily-question bank + a deterministic per-day picker.
 *
 * Both partners must see the *same* question on the same day. We pick by the
 * date's day-number so the choice is stable and identical for the couple,
 * with no shared state needed. The server computes "today" (UTC) as the
 * single source of truth so the two devices never disagree on the date.
 */
export const DAILY_QUESTIONS: string[] = [
  "what's a tiny thing I did recently that made you smile?",
  "where in the world do you most want us to wake up together?",
  "what song instantly reminds you of me?",
  "what's something you're proud of me for lately?",
  "if we had a completely free day tomorrow, how would you spend it with me?",
  "what's your favourite memory of us from this month?",
  "what's one thing you want us to try together that we never have?",
  "when did you feel closest to me this week?",
  "what's a small habit of mine you secretly love?",
  "what does a perfect lazy morning with me look like?",
  "what's something you've never told me but want to?",
  "what's the first thing you noticed about me?",
  "what meal would you want us to cook together?",
  "what's a moment you wish you could relive with me?",
  "what made you laugh the hardest with me?",
  "what do you find yourself missing most when we're apart?",
  "what's a dream you have for us five years from now?",
  "what's something I do that makes you feel safe?",
  "what's your favourite photo of us and why?",
  "if you could give us one more 'first', what would it be?",
  "what's a little tradition you'd like us to start?",
  "what's something kind you saw me do that I might not know you noticed?",
  "what part of your day do you most want to share with me?",
  "what's a place that already feels like 'ours'?",
  "what's something about our future that excites you most?",
  "what comfort do I give you that's hard to put into words?",
  "what would you want to whisper to me at 2am tonight?",
  "what's a tiny adventure we could have this weekend?",
  "what's the bravest thing loving me has asked of you?",
  "what's a side of me only you get to see?",
  "what would 'us, at our happiest' look like on an ordinary day?",
  "what's something you forgive me for without me even asking?",
];

/**
 * Minutes the app's shared "day" is offset from UTC. Pinned to IST (UTC+5:30)
 * so the daily question / answer streak / archive roll over at *IST midnight*
 * for both partners — matching the local-date calendar — instead of at 00:00
 * UTC (5:30 AM IST), which left the two out of sync in the early morning.
 *
 * It's a fixed zone (not each device's local time) on purpose: "today" is
 * shared between two people and computed server-side, so it must be the same
 * instant for both. Change this single constant to re-anchor the daily day.
 */
export const APP_TZ_OFFSET_MIN = 330; // IST = UTC + 5:30

/** YYYY-MM-DD in the app timezone (IST) — the canonical 'today' both partners
 *  share. Shifting the instant then reading the UTC date yields the IST date. */
export function todayKey(d: Date = new Date()): string {
  return new Date(d.getTime() + APP_TZ_OFFSET_MIN * 60_000).toISOString().slice(0, 10);
}

/** Stable question index for a given YYYY-MM-DD key. */
export function questionIndexForDate(dateKey: string): number {
  const ms = Date.parse(`${dateKey}T00:00:00Z`);
  if (Number.isNaN(ms)) return 0;
  const days = Math.floor(ms / 86_400_000);
  const n = DAILY_QUESTIONS.length;
  return ((days % n) + n) % n;
}

export function questionForDate(dateKey: string): { id: number; text: string } {
  const id = questionIndexForDate(dateKey);
  return { id, text: DAILY_QUESTIONS[id] };
}
