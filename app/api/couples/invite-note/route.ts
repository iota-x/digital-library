import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCol } from "@/lib/mongo";
import { withAuth } from "@/lib/apiHandler";

const MAX_NOTE = 240;

// POST — set/update the personal note the joining partner sees on the invite
// landing ("Aanya wants to start your little world together — 'hurry up 💗'").
// Creator-only; the note lives on the couple and is cleared once they pair.
export const POST = withAuth(
  async (req, session) => {
    if (session.role !== "creator") {
      return NextResponse.json({ error: "Only the account creator can set the invite note." }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const raw = typeof body?.note === "string" ? body.note : "";
    const note = raw.replace(/\s+/g, " ").trim().slice(0, MAX_NOTE);

    const couples = await getCol("couples");
    await couples.updateOne(
      { _id: new ObjectId(session.coupleId) },
      { $set: { inviteNote: note } },
    );
    return NextResponse.json({ ok: true, note });
  },
  { rateLimit: { scope: "invite:note", max: 20, windowMs: 60 * 60_000 } },
);
