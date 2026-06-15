import webpush from "web-push";
import { getCol } from "@/lib/mongo";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
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
  } catch {}
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
  } catch {}
}
