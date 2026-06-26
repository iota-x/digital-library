<div align="center">

# Us 💗

### A private little world for two.

**Us** is a two-person relationship app — a shared space that holds your story,
your memories, and a handful of small daily rituals that keep you close, even
when you're apart. No feed, no followers, no ads. Just the two of you.

### 🌐 [**Live app → wearesocuteomg.vercel.app**](https://wearesocuteomg.vercel.app/journal)

<br/>

[![Live Demo](https://img.shields.io/badge/▶_Live_app-EC4899?style=for-the-badge&logoColor=white)](https://wearesocuteomg.vercel.app/journal)
![Next.js](https://img.shields.io/badge/Next.js_15-000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)
![Claude](https://img.shields.io/badge/Claude_(optional)-D97757?style=for-the-badge&logo=anthropic&logoColor=white)

</div>

---

> Built for one couple, but **couple-agnostic** — names, dates, theme, accent
> colour, and which sections appear are all per-couple settings. Spin it up for
> any two people.

<!-- Screenshots — drop a few PNGs in docs/ and uncomment:
<div align="center">
  <img src="docs/home.png"    width="32%" />
  <img src="docs/wrapped.png" width="32%" />
  <img src="docs/journal.png" width="32%" />
</div>
-->

## ✨ Highlights

- 🔒 **Truly private** — invite-code pairing, email-verified accounts, two people max.
- 🔴 **Live togetherness** — real-time presence ("you're both here"), tap-to-send
  reactions, a shared doodle canvas, and watch-together — over Server-Sent Events.
- 🔔 **It reaches you anywhere** — web-push notifications land even when the app is
  closed (a daily-question nudge, a "thinking of you" buzz, an anniversary reminder).
- 🤖 **AI, optionally** — personalised date ideas & quiz packs via Claude when a key
  is set; a built-in deterministic library when it isn't. Nothing breaks either way.
- 🎁 **Shareable "Us, Wrapped"** — a Spotify-Wrapped-style recap of your real data,
  rendered as story cards with a one-tap Instagram-story image.
- 🎨 **Themeable** — five built-in palettes plus any custom accent colour, full dark
  mode, all theme-defined down to the background effects.
- 📱 **Installable PWA** — offline-tolerant (queued writes), a home-screen
  "days together" widget, and app-icon badging.

## 🗺️ What's inside

Everything is grouped into three clusters, mirrored across the navigation and the
home "Explore" map. The single source of truth is [`lib/nav.ts`](lib/nav.ts).

### 💞 Every day
| Page | What's there |
|------|--------------|
| **Home** (`/`) | live "days together" timer, on-this-day flashbacks, memory cards, voice notes, a love-letter finale, and the Explore map |
| **Question of the day** (`/daily`) | a daily prompt you each answer privately; it reveals once you both do, with a shared answer streak + keepsake archive |
| **Journal** (`/journal`) | a shared calendar of moods, notes & photos, journaling streaks, "surprise me" random-memory draw, monthly recaps, and an "us by the numbers" panel |

### 🫶 Together
| Page | What's there |
|------|--------------|
| **Play** (`/play`) | a games & quizzes hub — a "how in sync are you?" compatibility quiz (with **AI-generatable packs**), truth-or-dare, would-you-rather, and a private **weekly check-in** with an 8-week trend |
| **Across the miles** (`/together`) | long-distance widgets — a two-timezone clock, a one-tap "thinking of you" buzz, a countdown to your next visit, and **watch-together** |
| **Shared** (`/shared`) | date-night ideas, a bucket list, a "song a day" playlist, a watchlist, and a "reasons I love you" jar |

### 🕰️ Looking back
| Page | What's there |
|------|--------------|
| **Memories** (`/map`) | a polaroid memory lane, a pin-map of your places, and a printable PDF memory book |
| **Our story** (`/timeline`) | a written timeline of milestones + a mood "star chart" graph |
| **Time capsule** (`/capsule`) | letters that unlock on a future date |
| **Us, Wrapped** (`/wrapped`) | your story in numbers, as swipeable story cards + a shareable image |

Plus a home-screen **widget** (`/widget`) and a command palette (**⌘K**) that
searches every destination *and* your own entries (journal days, bucket-list
items, capsule letters…).

## 🧱 Tech stack

- **Next.js 15** (App Router, RSC) · **React 18** · **TypeScript**
- **MongoDB** (`mongodb` driver) for persistence
- **Cloudinary** for image/video uploads
- **Server-Sent Events** for live sync · **web-push** (VAPID) for notifications
- **Leaflet** (memory map) · **framer-motion** (animation) · **jsPDF** (memory book)
- **Resend** (transactional email) · optional **Redis**/Upstash (cross-instance rate limiting)
- **Claude** (`@anthropic-ai/sdk`) — optional; powers personalised ideas & generated
  quiz packs, with a deterministic fallback library when no key is set
- **Vitest** for tests

## 🚀 Getting started

```bash
npm install
cp .env.example .env        # fill in the Required vars (see below)
npm run dev                 # → http://localhost:3000
```

| Script | Does |
|--------|------|
| `npm run dev` | start the dev server |
| `npm run build` / `npm start` | production build / serve |
| `npm test` | run the Vitest suite |
| `npm run test:watch` | tests in watch mode |

## 🔑 Environment

See [`.env.example`](.env.example) for the full list.

**Required** (the app throws on first access without them — see `lib/env.ts`):
`JWT_SECRET`, `MONGODB_URI`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`,
`VAPID_SUBJECT`, `VAPID_PRIVATE_KEY`, plus public
`NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` and `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.

**Optional** — everything else degrades gracefully to a silent no-op / fallback:

| Feature | Vars |
|---------|------|
| AI personalisation | `ANTHROPIC_API_KEY` (and `ANTHROPIC_MODEL`, default `claude-opus-4-8`) |
| Email (reset / notifications) | `RESEND_API_KEY`, `EMAIL_FROM` |
| Song-of-the-day | `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` |
| Cross-instance rate limiting | `REDIS_URL` |
| Daily weather snapshots | `WEATHER_LAT`, `WEATHER_LON` |
| Scheduled reminders / win-back | `CRON_SECRET` |
| Real-time error alerts | `ERROR_WEBHOOK_URL` (Discord/Slack webhook) |

> Without `ANTHROPIC_API_KEY`, the date/reconnect ideas and quiz generator use a
> built-in content library — set the key to turn on Claude personalisation.

## ⏰ Scheduled reminders (optional)

**On Vercel:** `vercel.json` schedules a single daily job — `/api/cron/daily` —
that fans out to all three sweeps below (reminders, daily-quiz, win-back). One
cron keeps you within the Hobby plan's limit. Just set `CRON_SECRET` in your
project env vars; Vercel Cron auto-sends it as a `Bearer` token, so nothing is
hardcoded. To run a sweep yourself (or from another scheduler), the individual
endpoints still work standalone:

`/api/cron/reminders` sends push reminders for upcoming anniversaries and
birthdays. Guarded by `CRON_SECRET`, meant to be hit once a day by an external
scheduler:

```
GET https://<your-app>/api/cron/reminders?secret=$CRON_SECRET
```

On Vercel, add a Cron Job pointing at that path; or use cron-job.org / a GitHub
Action passing the `x-cron-secret` header. Sends are de-duplicated per
(couple, occasion, days-out), so running it more than once a day is safe.

`/api/cron/daily-quiz` drops one fresh couple quiz a day — but only for couples
who've completed every quiz currently available to them (the 3 built-in packs
plus any earlier generated ones), so quizzes never pile up unplayed. Same guard
and scheduler setup:

```
GET https://<your-app>/api/cron/daily-quiz?secret=$CRON_SECRET
```

De-duplicated per (couple, UTC-day), which is what enforces the "one per day"
cap even if a couple blitzes through the new quiz the same day.

`/api/cron/winback` sends one gentle re-engagement push to *paired* couples
who've gone quiet (5–21 days since either partner was last seen), de-duplicated
per (couple, ISO-week) so it's at most ~one nudge a week and never nags the
long-gone. Same `CRON_SECRET` guard and scheduler setup:

```
GET https://<your-app>/api/cron/winback?secret=$CRON_SECRET
```

## 🏗️ Project layout

```
app/            App Router pages + API route handlers (app/api/**)
components/     UI — one feature per component
lib/            data stores, auth, mongo, push/SSE, AI, theming, nav (+ *.test.ts)
public/         PWA manifest, service worker, icons
```

**Conventions worth knowing**

- API handlers wrap with `withAuth` (session check + structured error logging +
  optional rate limit).
- List features use the SWR-style `createResourceStore`.
- Live events go through `broadcastToCouple` (SSE) and `sendPushToOtherInCouple`
  (push); Mongo indexes are declared in `lib/ensureIndexes.ts`.
- **Navigation** is two-tier and config-driven: edit a destination once in
  `lib/nav.ts` and the navbar, mobile dock, Explore map, and ⌘K palette all update.
- **Theming** is CSS-variable based (`--pink*`, `--cream`, …); the five presets are
  `<html>` classes and a custom accent derives the whole family per light/dark mode
  (`lib/themeColor.ts`).
- **AI is server-only and optional** (`lib/ai.ts`): every AI feature ships a
  deterministic fallback, so a missing key never breaks a page.

---

<div align="center">
<sub>made with way too much love 💗</sub>
</div>
