# Us 💗

A private, two-person anniversary app — a little shared world for a couple. It
holds your story, your memories, and a handful of small daily rituals that keep
you close, even apart.

> Built for one couple, but couple-agnostic: dates, names, theme, and which
> sections show are all per-couple settings.

## Features

- **Home** — live "days together" timer, on-this-day flashbacks, the daily
  question (answer privately, reveals once you both do, with a shared answer
  streak + keepsake archive), memory cards, voice notes, and a love-letter
  finale.
- **Our story** (`/timeline`) — a written timeline of your milestones + a mood
  "star chart" graph.
- **Journal** (`/journal`) — a shared calendar of moods, notes & photos, a
  journaling streak, "surprise me" random-memory draw, monthly recaps, and an
  "us by the numbers" stats panel.
- **Capsule** (`/capsule`) — write letters that unlock on a future date.
- **Shared** (`/shared`) — bucket list, a "song a day" playlist, a watchlist,
  and a "reasons I love you" jar you draw from.
- **Memories** (`/map`) — a polaroid memory lane, a pin map of places that are
  yours, and a printable PDF export.
- **Live togetherness** — real-time presence ("you're both here"), a shared
  doodle canvas, and tap-to-send reactions (hearts, kisses, hugs…), all over
  Server-Sent Events, plus web-push so a nudge lands even when the app's closed.
- **PWA** — installable, offline-tolerant (queued writes), home-screen
  "days together" widget, dark mode, and per-couple themes.

## Tech stack

- **Next.js 15** (App Router, RSC) + **React 18** + **TypeScript**
- **MongoDB** (`mongodb` driver) for persistence
- **Cloudinary** for image/video uploads
- **web-push** (VAPID) for notifications, **Server-Sent Events** for live sync
- **Leaflet** for the memory map, **framer-motion** for animation
- **jsPDF** for the exportable memory book, **Resend** for transactional email
- Optional **Redis** (Upstash) for cross-instance rate limiting
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
reminders) degrades to a silent no-op when unset.

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
