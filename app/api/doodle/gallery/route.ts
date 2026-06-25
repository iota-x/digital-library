import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCol } from "@/lib/mongo";
import { withAuth } from "@/lib/apiHandler";
import { broadcastToCouple } from "@/lib/sseBroadcast";
import { v, parseBody, badRequest } from "@/lib/validate";
import { READ_CACHE_HEADERS } from "@/lib/cacheHeaders";
import { senderDisplayName } from "@/lib/displayName";

/**
 * Doodle gallery — instead of one ephemeral board, each finished canvas can be
 * saved as a snapshot (a flattened PNG uploaded to Cloudinary) so the couple
 * keeps a little gallery of everything they've drawn together.
 *
 * Documents: { coupleId, imageUrl, userId, name, createdAt }.
 */
const MAX_ITEMS = 200;

const SaveBody = v.object({
  imageUrl: v.string({ max: 2048, pattern: /^https:\/\/.+/ }),
});

export const GET = withAuth(async (_req, session) => {
  const col = await getCol("doodleGallery");
  const docs = await col
    .find({ coupleId: session.coupleId })
    .sort({ createdAt: -1 })
    .limit(MAX_ITEMS)
    .toArray();
  return NextResponse.json(
    docs.map((d) => ({ id: d._id.toString(), imageUrl: d.imageUrl, name: d.name ?? "", createdAt: d.createdAt })),
    { headers: READ_CACHE_HEADERS },
  );
});

export const POST = withAuth(
  async (req, session) => {
    const parsed = await parseBody(req, SaveBody);
    if (!parsed.ok) return badRequest(parsed.error);

    const col = await getCol("doodleGallery");
    const who = await senderDisplayName(session);
    const res = await col.insertOne({
      coupleId: session.coupleId,
      imageUrl: parsed.value.imageUrl,
      userId: session.userId,
      name: who,
      createdAt: new Date().toISOString(),
    });
    broadcastToCouple(session.coupleId, { type: "doodle:saved", userId: session.userId, name: who });
    return NextResponse.json({ ok: true, id: res.insertedId.toString() }, { status: 201 });
  },
  { rateLimit: { scope: "doodle:gallery", max: 40, windowMs: 60_000 } },
);

export const DELETE = withAuth(
  async (req, session) => {
    const { id } = (await req.json().catch(() => ({}))) as { id?: string };
    if (!id) return badRequest("id required");
    const col = await getCol("doodleGallery");
    await col.deleteOne({ _id: new ObjectId(id), coupleId: session.coupleId });
    return NextResponse.json({ ok: true });
  },
  { rateLimit: { scope: "doodle:gallery:delete", max: 40, windowMs: 60_000 } },
);
