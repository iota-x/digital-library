import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getSession } from "@/lib/auth";
import { getCol } from "@/lib/mongo";
import { pickUserCrypto, pickInviteCrypto } from "@/lib/cryptoServer";

/**
 * Store E2EE key blobs for the signed-in user (and, optionally, the couple's
 * invite-wrapped data key). All values are opaque base64 — the server never
 * derives a key or reads content. Used by:
 *  - register follow-up: upload the invite-wrapped CDK after the code is known
 *  - password reset via recovery key: re-upload the user's re-wrapped blobs
 *  - re-grant init/complete: rotate the user's key material
 *
 * Body: {
 *   user?:  <user key blobs>,   // whitelisted by pickUserCrypto
 *   invite?: { inviteSalt, inviteWrappedCDK },
 *   needsRegrant?: boolean,     // set the pending-regrant flag
 *   clearCDK?: boolean,         // drop stale data-key copies (regrant init)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { user, invite, needsRegrant, clearCDK } = body as {
      user?: unknown;
      invite?: unknown;
      needsRegrant?: boolean;
      clearCDK?: boolean;
    };

    const users = await getCol("users");
    const userId = new ObjectId(session.userId);

    const set: Record<string, unknown> = pickUserCrypto(user);
    const unset: Record<string, unknown> = {};

    if (needsRegrant === true) {
      set.needsRegrant = true;
    } else if (needsRegrant === false) {
      unset.needsRegrant = "";
    }

    // Re-grant init: the old data-key copies are unrecoverable (old password
    // gone), so clear them; the partner will re-deliver the CDK.
    if (clearCDK === true) {
      unset.wrappedCDK = "";
      unset.recoveryWrappedCDK = "";
      unset.recoveryWrappedPrivateKey = "";
      unset.recoverySalt = "";
    }

    const update: Record<string, unknown> = {};
    if (Object.keys(set).length) update.$set = set;
    if (Object.keys(unset).length) update.$unset = unset;
    if (Object.keys(update).length) await users.updateOne({ _id: userId }, update);

    const inviteCrypto = pickInviteCrypto(invite);
    if (inviteCrypto) {
      const couples = await getCol("couples");
      await couples.updateOne({ _id: new ObjectId(session.coupleId) }, { $set: inviteCrypto });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Keys error:", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
