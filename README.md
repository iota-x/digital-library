# Us 💗

A private, two-person anniversary app — a little shared world for a couple. It
holds your story, your memories, and a handful of small daily rituals that keep
you close, even apart.

> Built for one couple, but couple-agnostic: dates, names, theme, and which
> sections show are all per-couple settings.

## Features

Pages are organised into three clusters, mirrored across the nav (see
[Navigation](#navigation)). The single source of truth is `lib/nav.ts`.

### Every day

- **Home** (`/`) — live "days together" timer, on-this-day flashbacks, memory
  cards, voice notes, a love-letter finale, and an **Explore** map of the whole
  app so you always know what lives where.
- **Question of the day** (`/daily`) — a daily prompt you each answer privately;
  it reveals once you both do, with a shared answer streak and a keepsake
  archive. Auto-opens the first time you open the app each day.
- **Journal** (`/journal`) — a shared calendar of moods, notes & photos, a
  journaling streak, "surprise me" random-memory draw, monthly recaps, and an
  "us by the numbers" stats panel.

### Together

- **Play** (`/play`) — a games & quizzes hub: a "how in sync are you?"
  compatibility quiz (with **AI-generatable packs**), truth-or-dare,
  would-you-rather, a private **weekly relationship check-in** with an 8-week
  trend, and date-night / reconnect idea cards.
- **Across the miles** (`/together`) — long-distance widgets: a two-timezone
  clock, a one-tap "thinking of you" buzz (push + live reaction), a countdown to
  your next visit, and **watch-together** (start a show in sync).
- **Shared** (`/shared`) — date-night ideas, a bucket list, a "song a day"
  playlist, a watchlist, and a "reasons I love you" jar you draw from.

### Looking back

- **Memories** (`/map`) — a polaroid memory lane, a pin map of places that are
  yours, and a printable PDF export.
- **Our story** (`/timeline`) — a written timeline of your milestones + a mood
  "star chart" graph.
- **Time capsule** (`/capsule`) — write letters that unlock on a future date.
- **Us, Wrapped** (`/wrapped`) — a Spotify-Wrapped-style recap computed from
  your own data (days together, memories, top mood, quiz sync, …), shown as
  swipeable story cards with a **shareable Instagram-story image**.

### Always on

- **Live togetherness** — real-time presence ("you're both here"), a shared
  doodle canvas, and tap-to-send reactions (hearts, kisses, hugs…), all over
  Server-Sent Events, plus web-push so a nudge lands even when the app's closed.
- **PWA** — installable, offline-tolerant (queued writes), home-screen
  "days together" widget, dark mode, and per-couple themes.

## Navigation

With this many surfaces, navigation is deliberately two-tier and driven from a
single config (`lib/nav.ts`):

- **Quick access** — the few most-used destinations (Home, Question, Journal,
  Play) sit in the desktop top bar and a floating mobile **dock**.
- **The menu** — one "menu" button (and the dock's "more") opens a full-screen
  `NavMenu` overlay: a days-together header, every destination as a grouped card
  (each with a one-line "what's here"), and quick actions (customize, dark mode,
  sign out). This replaced the old cramped dropdowns.
- **Explore** — the home page renders the same grouped map so newcomers see
  every area at a glance.
- **⌘K** — a command palette searches every destination plus your own entries
  (journal days, bucket-list items, letters…).

Change a destination once in `lib/nav.ts` and every surface updates.

## Tech stack

- **Next.js 15** (App Router, RSC) + **React 18** + **TypeScript**
- **MongoDB** (`mongodb` driver) for persistence
- **Cloudinary** for image/video uploads
- **web-push** (VAPID) for notifications, **Server-Sent Events** for live sync
- **Leaflet** for the memory map, **framer-motion** for animation
- **jsPDF** for the exportable memory book, **Resend** for transactional email
- Optional **Redis** (Upstash) for cross-instance rate limiting
- Optional **Claude** (`@anthropic-ai/sdk`) — personalises date/reconnect ideas
  and generates quiz packs; unset → a built-in deterministic content library
- **Vitest** for tests

## Getting started

```bash
npm install
cp .env.example .env        # fill in the Required vars (see below)
npm run dev                 # http://localhost:3000
```

`npm test` runs the Vitest suite. `npm run build` / `npm start` for production.

## Environment

See `.env.example` for the full list. The **required** ones (the app throws on
first access without them — see `lib/env.ts`): `JWT_SECRET`, `MONGODB_URI`,
`CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `VAPID_SUBJECT`,
`VAPID_PRIVATE_KEY`, plus public `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` and
`NEXT_PUBLIC_VAPID_PUBLIC_KEY`. Everything else (email, Spotify, Redis, weather,
reminders, AI) degrades to a silent no-op / deterministic fallback when unset.

Set `ANTHROPIC_API_KEY` to turn on AI personalisation for date/reconnect ideas
and generated quiz packs (optionally `ANTHROPIC_MODEL`, default
`claude-opus-4-8`). Without it those features use the built-in content library.

## Scheduled reminders (optional)

`/api/cron/reminders` sends push reminders for upcoming anniversaries and
birthdays. It's guarded by `CRON_SECRET` and meant to be hit once a day by an
external scheduler:

```
GET https://<your-app>/api/cron/reminders?secret=$CRON_SECRET
```

On Vercel, add a Cron Job pointing at that path; or use cron-job.org / a GitHub
Action passing the `x-cron-secret` header. Sends are de-duplicated per
(couple, occasion, days-out), so running it more than once a day is safe.

## Project layout

```
app/            App Router pages + API route handlers (app/api/**)
components/     UI — one feature per component
lib/            data stores, auth, mongo, push/SSE, helpers (+ *.test.ts)
public/         PWA manifest, service worker, icons, gifs
```

Conventions worth knowing: API handlers wrap with `withAuth` (session + error
logging + optional rate limit); list features use the SWR-style
`createResourceStore`; live events go through `broadcastToCouple` (SSE) and
`sendPushToOtherInCouple` (push). Mongo indexes are declared in
`lib/ensureIndexes.ts`.
