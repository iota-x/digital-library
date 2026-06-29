import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getSession } from "@/lib/auth";
import { getCol } from "@/lib/mongo";

/**
 * Partner-assisted recovery: when a user resets their password AND has lost
 * their recovery key, the data key must be re-delivered by their partner.
 *
 * GET  — what does the caller need to do / receive?
 *   { incoming: { regrantBlob } }       caller is the reset user; partner has delivered the CDK
 *   { request: { targetUserId, publicKey } }  caller is the partner; the other member is waiting
 *   {}                                   nothing pending
 *
 * POST { targetUserId, regrantBlob } — partner delivers the CDK (encrypted to
 * the reset user's public key) for the waiting member.
 *
 * The server only moves opaque blobs between the two members of one couple.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const users = await getCol("users");
    const me = await users.findOne({ _id: new ObjectId(session.userId) });

    // Reset user: a blob has been delivered for me.
    if (me && typeof me.regrantBlob === "string") {
      return NextResponse.json({ ok: true, incoming: { regrantBlob: me.regrantBlob } });
    }

    // Partner: is the other member of my couple waiting for a re-grant?
    const partner = await users.findOne({
      coupleId: session.coupleId,
      _id: { $ne: new ObjectId(session.userId) },
      needsRegrant: true,
    });
    if (partner && typeof partner.publicKey === "string" && !partner.regrantBlob) {
      return NextResponse.json({
        ok: true,
        request: { targetUserId: partner._id.toString(), publicKey: partner.publicKey },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Regrant GET error:", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const { targetUserId, regrantBlob } = await req.json().catch(() => ({})) as {
      targetUserId?: string;
      regrantBlob?: string;
    };
    if (!targetUserId || typeof regrantBlob !== "string") {
      return NextResponse.json({ ok: false, error: "missing fields" }, { status: 400 });
    }
    if (targetUserId === session.userId) {
      return NextResponse.json({ ok: false, error: "cannot re-grant to self" }, { status: 400 });
    }

    let targetId: ObjectId;
    try { targetId = new ObjectId(targetUserId); }
    catch { return NextResponse.json({ ok: false, error: "bad target" }, { status: 400 }); }

    const users = await getCol("users");
    // Only allow delivering to the *other* member of the caller's own couple who
    // is actually waiting — never to an arbitrary user.
    const result = await users.updateOne(
      { _id: targetId, coupleId: session.coupleId, needsRegrant: true },
      { $set: { regrantBlob }, $unset: { needsRegrant: "" } },
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ ok: false, error: "no pending re-grant for that member" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Regrant POST error:", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
