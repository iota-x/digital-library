import { createResourceStore } from "@/lib/createResourceStore";

/* ── BucketList ───────────────────────────────────────────────── */
export interface BucketItem {
  _id: string;
  text: string;
  category: "dates" | "travel" | "experiences" | "firsts" | "other";
  completed: boolean;
  addedAt: string;
  completedAt?: string | null;
}
export const BucketStore = createResourceStore<BucketItem>({
  storageKey:    "bucket_cache_v1",
  endpoint:      "/api/bucketlist",
  sseEventTypes: ["bucketlist:"],
});

/* ── VoiceNotes ───────────────────────────────────────────────── */
export interface VNote {
  id: string;
  url: string;
  from: string;
  label: string;
  createdAt: string;
}
export const VoiceNoteStore = createResourceStore<VNote>({
  storageKey:    "voicenote_cache_v1",
  endpoint:      "/api/voicenotes",
  sseEventTypes: ["voicenote:"],
});

/* ── Watchlist ───────────────────────────────────────────────── */
export interface WatchItem {
  _id: string;
  title: string;
  type: "movie" | "tv" | "anime" | "manga" | "kdrama" | "documentary" | "other";
  status: "plan-to-watch" | "watching" | "completed" | "dropped";
  rating?: number | null;
  notes?: string;
  coverImage?: string;
  addedAt: string;
}
export const WatchlistStore = createResourceStore<WatchItem>({
  storageKey:    "watchlist_cache_v1",
  endpoint:      "/api/watchlist",
  // No SSE events for watchlist yet; falls back to focus/visibility/poll
});
