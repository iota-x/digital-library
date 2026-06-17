import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCol } from "@/lib/mongo";
import { withAuth } from "@/lib/apiHandler";
import { broadcastToCouple } from "@/lib/sseBroadcast";
import { v, parseBody, badRequest } from "@/lib/validate";

/**
 * Set the signed-in user's avatar (the cropped square shown on their polaroid).
 *
 * Avatars live on the couple document alongside the names — person1* for the
 * creator, person2* for the partner — so both avatars are available to either
 * viewer without a second lookup. An empty string clears the avatar (falls
 * back to the gradient + initial placeholder on the client).
 *
 * Broadcasts `avatar:update` so the partner's polaroid refreshes live.
 */
const AvatarBody = v.object({
  // Cloudinary secure_url, or "" to clear. Capped + http(s)-only.
  avatarUrl: v.string({ max: 2048, pattern: /^$|^https:\/\/.+/ }),
});

export const PUT = withAuth(
  async (req, session) => {
    const parsed = await parseBody(req, AvatarBody);
    if (!parsed.ok) return badRequest(parsed.error);
    const { avatarUrl } = parsed.value;

    const field = session.role === "creator" ? "person1Avatar" : "person2Avatar";
    const col = await getCol("couples");
    await col.updateOne({ _id: new ObjectId(session.coupleId) }, { $set: { [field]: avatarUrl } });

    broadcastToCouple(session.coupleId, {
      type: "avatar:update",
      userId: session.userId,
      role: session.role,
      avatarUrl,
    });
    return NextResponse.json({ ok: true });
  },
  { rateLimit: { scope: "couples:avatar", max: 30, windowMs: 60_000 } },
);
