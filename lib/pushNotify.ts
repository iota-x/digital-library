import webpush from "web-push";
import { getCol } from "@/lib/mongo";
import { serverEnv, publicEnv } from "@/lib/env";
import { log } from "@/lib/log";

webpush.setVapidDetails(
  serverEnv.VAPID_SUBJECT,
  publicEnv.VAPID_PUBLIC_KEY,
  serverEnv.VAPID_PRIVATE_KEY,
);

export async function sendPushToCouple(coupleId: string, payload: { title: string; body: string; icon?: string }) {
  try {
    const col = await getCol("pushSubscriptions");
    const subs = await col.find({ coupleId }).toArray();
    const msg = JSON.stringify({ ...payload, icon: payload.icon ?? "/favicon.svg" });
    await Promise.allSettled(
      subs.map(s => webpush.sendNotification(s.subscription, msg).catch(() =>
        col.deleteOne({ _id: s._id })
      ))
    );
  } catch (err) { log.error({ msg: "sendPushToCouple failed", err, coupleId }); }
}

/** Push to everyone in the couple EXCEPT the given userId — for "self
 *  triggered" events (a reaction, a heart) where notifying the sender is
 *  noise. Sender still gets the in-app SSE update. */
export async function sendPushToOtherInCouple(coupleId: string, exceptUserId: string, payload: { title: string; body: string; icon?: string }) {
  try {
    const col = await getCol("pushSubscriptions");
    const subs = await col.find({ coupleId, userId: { $ne: exceptUserId } }).toArray();
    const msg = JSON.stringify({ ...payload, icon: payload.icon ?? "/favicon.svg" });
    await Promise.allSettled(
      subs.map(s => webpush.sendNotification(s.subscription, msg).catch(() =>
        col.deleteOne({ _id: s._id })
      ))
    );
  } catch (err) { log.error({ msg: "sendPushToOtherInCouple failed", err, coupleId, exceptUserId }); }
}

export async function sendPushToUser(userId: string, payload: { title: string; body: string; icon?: string }) {
  try {
    const col = await getCol("pushSubscriptions");
    const sub = await col.findOne({ userId });
    if (!sub) return;
    const msg = JSON.stringify({ ...payload, icon: payload.icon ?? "/favicon.svg" });
    await webpush.sendNotification(sub.subscription, msg).catch(() =>
      col.deleteOne({ _id: sub._id })
    );
  } catch (err) { log.error({ msg: "sendPushToUser failed", err, userId }); }
}
