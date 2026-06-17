import webpush from "web-push";
import { getCol } from "@/lib/mongo";
import { serverEnv, publicEnv } from "@/lib/env";
import { log } from "@/lib/log";
import type { Filter, Document } from "mongodb";

webpush.setVapidDetails(
  serverEnv.VAPID_SUBJECT,
  publicEnv.VAPID_PUBLIC_KEY,
  serverEnv.VAPID_PRIVATE_KEY,
);

interface PushPayload { title: string; body: string; icon?: string }

async function sendToFilter(filter: Filter<Document>, payload: PushPayload, ctx: Record<string, unknown>) {
  try {
    const col = await getCol("pushSubscriptions");
    const subs = await col.find(filter).toArray();
    if (subs.length === 0) return;
    const msg = JSON.stringify({ ...payload, icon: payload.icon ?? "/favicon.svg" });
    // Failed sends (gone-from-browser, 410, etc.) get pruned so the next
    // pass isn't wasted re-sending to subscriptions that will never accept.
    await Promise.allSettled(
      subs.map(s => webpush.sendNotification(s.subscription, msg).catch(() =>
        col.deleteOne({ _id: s._id })
      ))
    );
  } catch (err) { log.error({ msg: "push send failed", err, ...ctx }); }
}

export function sendPushToCouple(coupleId: string, payload: PushPayload) {
  return sendToFilter({ coupleId }, payload, { fn: "sendPushToCouple", coupleId });
}

/** Push to everyone in the couple EXCEPT the given userId — for "self
 *  triggered" events (a reaction, a heart) where notifying the sender is
 *  noise. Sender still gets the in-app SSE update. */
export function sendPushToOtherInCouple(coupleId: string, exceptUserId: string, payload: PushPayload) {
  return sendToFilter({ coupleId, userId: { $ne: exceptUserId } }, payload, { fn: "sendPushToOtherInCouple", coupleId, exceptUserId });
}

export function sendPushToUser(userId: string, payload: PushPayload) {
  return sendToFilter({ userId }, payload, { fn: "sendPushToUser", userId });
}
