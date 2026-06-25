import { ObjectId } from "mongodb";
import { getCol } from "@/lib/mongo";
import type { SessionPayload } from "@/lib/auth";

/**
 * The name to show for the acting user in couple-facing copy — push
 * notification bodies, realtime event titles, and the stored `name`/`from`
 * snapshots that those surfaces render.
 *
 * Mirrors the client `displayName()` in lib/userStore: a person is referred to
 * by the nickname their partner gave them (when switched on), otherwise their
 * account name. The nickname lives on the acting user's own person slot of the
 * couple doc. Falls back to the account name on any lookup failure so a flaky
 * DB read never blanks a notification.
 */
export async function senderDisplayName(session: SessionPayload): Promise<string> {
  try {
    const couples = await getCol("couples");
    const couple = await couples.findOne(
      { _id: new ObjectId(session.coupleId) },
      { projection: { person1Nickname: 1, person1NicknameOn: 1, person2Nickname: 1, person2NicknameOn: 1 } },
    );
    if (!couple) return session.name;
    const slot = session.role === "creator" ? "person1" : "person2";
    const nick = couple[`${slot}Nickname`];
    const on = couple[`${slot}NicknameOn`] === true;
    return on && typeof nick === "string" && nick.trim() ? nick : session.name;
  } catch {
    return session.name;
  }
}
