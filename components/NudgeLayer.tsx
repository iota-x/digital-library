"use client";
import { useEffect } from "react";
import { useToast } from "@/components/Toaster";
import { useUserData } from "@/lib/userStore";
import { onPartnerSSE } from "@/lib/sseClient";
import { buzz, heartBump } from "@/lib/haptics";

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
    return onPartnerSSE((d) => {
      switch (d.type) {
        case "reaction:nudge": {
          const name = (d.name as string) || "they";
          const emoji = (d.emoji as string) || "🩷";
          const date = (d.date as string) || "";
          heartBump();
          buzz("double");
          toaster.toast({
            id: `nudge-reaction-${date}`,
            variant: "info",
            title: `${name} reacted ${emoji}`,
            message: date ? `to your memory from ${date}` : "to one of your memories",
            durationMs: 6000,
            action: date
              ? { label: "view", onClick: () => { window.location.href = `/journal?date=${date}`; } }
              : undefined,
          });
          break;
        }
        case "daily:answered": {
          const name = (d.name as string) || "they";
          buzz("tap");
          toaster.toast({
            id: "nudge-daily",
            variant: "info",
            title: "today's question 💭",
            message: `${name} answered — add yours to reveal both`,
            durationMs: 7000,
            action: { label: "answer", onClick: () => { window.location.href = "/#daily"; } },
          });
          break;
        }
        case "daily:reveal": {
          heartBump();
          toaster.toast({
            id: "nudge-daily",
            variant: "success",
            title: "you can both see it now 💌",
            message: "today's answers are unlocked",
            durationMs: 7000,
            action: { label: "reveal", onClick: () => { window.location.href = "/#daily"; } },
          });
          break;
        }
        case "watch:start": {
          const name = (d.name as string) || "they";
          const title = (d.title as string) || "something";
          buzz("double");
          toaster.toast({
            id: "nudge-watch",
            variant: "info",
            title: `${name} hit play 🍿`,
            message: `started "${title}" — join them?`,
            durationMs: 8000,
            action: { label: "join", onClick: () => { window.location.href = "/shared#watch-together"; } },
          });
          break;
        }
        case "watch:rated": {
          const name = (d.name as string) || "they";
          toaster.toast({
            id: "nudge-watch",
            variant: "info",
            title: `${name} rated it ⭐`,
            message: "drop yours to reveal both scores",
            durationMs: 7000,
            action: { label: "rate", onClick: () => { window.location.href = "/shared#watch-together"; } },
          });
          break;
        }
        case "watch:reveal": {
          heartBump();
          toaster.toast({
            id: "nudge-watch",
            variant: "success",
            title: "ratings are in 🎬",
            message: "see how you both scored it",
            durationMs: 7000,
            action: { label: "see", onClick: () => { window.location.href = "/shared#watch-together"; } },
          });
          break;
        }
      }
    });
  }, [hasPartner, toaster]);

  return null;
}
