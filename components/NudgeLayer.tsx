"use client";
import { useEffect } from "react";
import { useToast } from "@/components/Toaster";
import { useUserData } from "@/lib/userStore";
import { onPartnerSSE } from "@/lib/sseClient";
import { buzz, heartBump } from "@/lib/haptics";
import { addNotification } from "@/lib/notificationStore";

/**
 * In-app "live nudge" hub.
 *
 * Listens to the shared SSE relay for partner-originated events and surfaces
 * a gentle toast while the app is open. (Push notifications cover the
 * app-closed case from the server side; this is the in-app counterpart so a
 * reaction / answer / watch-invite lands immediately without a refetch.)
 *
 * `onPartnerSSE` already filters out the local user's own events, so we only
 * ever toast for things the *other* person did.
 */
export default function NudgeLayer() {
  const user = useUserData();
  const toaster = useToast();
  const hasPartner = !!user?.partnerName;

  useEffect(() => {
    if (!hasPartner) return;

    // Single sink: fire the transient toast AND record a persistent
    // notification (the bell feed) from one descriptor, so the two never
    // drift. `emoji` is what shows in the feed; `href` is where both the
    // toast action and the feed row navigate to.
    const push = (opts: {
      id: string; type: string; emoji: string; title: string; message: string;
      href?: string; actionLabel?: string;
      variant?: "info" | "success" | "warn" | "error"; durationMs?: number;
    }) => {
      toaster.toast({
        id: opts.id,
        variant: opts.variant ?? "info",
        title: opts.title,
        message: opts.message,
        durationMs: opts.durationMs ?? 6000,
        action: opts.href && opts.actionLabel
          ? { label: opts.actionLabel, onClick: () => { window.location.href = opts.href!; } }
          : undefined,
      });
      addNotification({ id: opts.id, type: opts.type, emoji: opts.emoji, title: opts.title, message: opts.message, href: opts.href });
    };

    return onPartnerSSE((d) => {
      switch (d.type) {
        case "reaction:nudge": {
          const name = (d.name as string) || "they";
          const emoji = (d.emoji as string) || "🩷";
          const date = (d.date as string) || "";
          heartBump();
          buzz("double");
          push({
            id: `nudge-reaction-${date}`, type: d.type, emoji,
            title: `${name} reacted ${emoji}`,
            message: date ? `to your memory from ${date}` : "to one of your memories",
            href: date ? `/journal?date=${date}` : undefined,
            actionLabel: date ? "view" : undefined,
          });
          break;
        }
        case "memory:new":
        case "memory:added": {
          const name = (d.name as string) || "they";
          const date = (d.date as string) || "";
          const added = d.type === "memory:added";
          heartBump();
          buzz("double");
          push({
            id: date ? `nudge-memory-${date}` : "nudge-memory", type: d.type, emoji: "💗",
            title: added ? `${name} added to your journal 💗` : `${name} added a memory 💗`,
            message: date ? `${date} — tap to add on it or react` : "tap to add on it or react",
            href: date ? `/journal?date=${date}` : "/journal",
            actionLabel: "view", durationMs: 7000,
          });
          break;
        }
        case "daily:answered": {
          const name = (d.name as string) || "they";
          buzz("tap");
          push({
            id: "nudge-daily", type: d.type, emoji: "💭",
            title: "today's question 💭",
            message: `${name} answered — add yours to reveal both`,
            href: "/daily", actionLabel: "answer", durationMs: 7000,
          });
          break;
        }
        case "daily:reveal": {
          heartBump();
          push({
            id: "nudge-daily", type: d.type, emoji: "💌", variant: "success",
            title: "you can both see it now 💌",
            message: "today's answers are unlocked",
            href: "/daily", actionLabel: "reveal", durationMs: 7000,
          });
          break;
        }
        case "quiz:answered": {
          const name = (d.name as string) || "they";
          buzz("tap");
          push({
            id: "nudge-quiz", type: d.type, emoji: "🎮",
            title: "a quiz is waiting 🎮",
            message: `${name} played one — play it too to reveal your score`,
            href: "/play", actionLabel: "play", durationMs: 7000,
          });
          break;
        }
        case "quiz:new": {
          const title = (d.title as string) || "a new quiz";
          heartBump();
          buzz("double");
          push({
            id: "nudge-quiz", type: d.type, emoji: "🎮",
            title: "a fresh quiz is ready 🎮",
            message: `today's "${title}" — play it together`,
            href: "/play", actionLabel: "play", durationMs: 8000,
          });
          break;
        }
        case "quiz:reveal": {
          heartBump();
          push({
            id: "nudge-quiz", type: d.type, emoji: "💞", variant: "success",
            title: "your quiz results are in 💞",
            message: "see how in sync you are",
            href: "/play", actionLabel: "reveal", durationMs: 7000,
          });
          break;
        }
        case "doodle:nudge": {
          const name = (d.name as string) || "they";
          heartBump();
          buzz("double");
          push({
            id: "nudge-doodle", type: d.type, emoji: "🎨",
            title: `${name} drew you something 🎨`,
            message: "come see what's on the canvas",
            href: "/#doodle", actionLabel: "open",
            durationMs: 8000,
          });
          break;
        }
        case "watch:start": {
          const name = (d.name as string) || "they";
          const title = (d.title as string) || "something";
          buzz("double");
          push({
            id: "nudge-watch", type: d.type, emoji: "🍿",
            title: `${name} hit play 🍿`,
            message: `started "${title}" — join them?`,
            href: "/shared#watch-together", actionLabel: "join", durationMs: 8000,
          });
          break;
        }
        case "watch:rated": {
          const name = (d.name as string) || "they";
          push({
            id: "nudge-watch", type: d.type, emoji: "⭐",
            title: `${name} rated it ⭐`,
            message: "drop yours to reveal both scores",
            href: "/shared#watch-together", actionLabel: "rate", durationMs: 7000,
          });
          break;
        }
        case "watch:reveal": {
          heartBump();
          push({
            id: "nudge-watch", type: d.type, emoji: "🎬", variant: "success",
            title: "ratings are in 🎬",
            message: "see how you both scored it",
            href: "/shared#watch-together", actionLabel: "see", durationMs: 7000,
          });
          break;
        }
      }
    });
  }, [hasPartner, toaster]);

  return null;
}
