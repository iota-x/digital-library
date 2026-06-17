import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCol } from "@/lib/mongo";
import { withAuth } from "@/lib/apiHandler";
import { broadcastToCouple } from "@/lib/sseBroadcast";
import { READ_CACHE_HEADERS } from "@/lib/cacheHeaders";

/**
 * Map pins for the "places we've been" map (MemoryMap). One document per pin,
 * scoped to the couple. The client reads/writes `id` (string); Mongo stores
 * `_id` (ObjectId), so we translate at the boundary.
 */
interface PinDoc {
  coupleId: string;
  lat: number;
  lng: number;
  title: string;
  note: string;
  date: string;
  addedAt: string;
}

export const GET = withAuth(async (_req, session) => {
  const c = await getCol("memoryPlaces");
  const pins = await c.find({ coupleId: session.coupleId }).sort({ addedAt: 1 }).toArray();
  return NextResponse.json(
    pins.map((p) => ({
      id: p._id.toString(),
      lat: p.lat, lng: p.lng,
      title: p.title, note: p.note, date: p.date, addedAt: p.addedAt,
    })),
    { headers: READ_CACHE_HEADERS },
  );
});

export const POST = withAuth(async (req, session) => {
  const body = (await req.json().catch(() => ({}))) as Partial<PinDoc>;
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  const title = (body.title ?? "").trim().slice(0, 120);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    return NextResponse.json({ error: "valid lat/lng required" }, { status: 400 });
  }
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const c = await getCol("memoryPlaces");
  const result = await c.insertOne({
    coupleId: session.coupleId,
    lat, lng, title,
    note: (body.note ?? "").trim().slice(0, 1000),
    date: typeof body.date === "string" ? body.date.slice(0, 10) : "",
    addedAt: new Date().toISOString(),
  });
  broadcastToCouple(session.coupleId, { type: "memoryplace:add", userId: session.userId });
  return NextResponse.json({ id: result.insertedId.toString() }, { status: 201 });
}, { rateLimit: { scope: "memoryplace:add", max: 60, windowMs: 60_000 } });

export const DELETE = withAuth(async (req, session) => {
  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  if (!id || !ObjectId.isValid(id)) return NextResponse.json({ error: "id required" }, { status: 400 });

  const c = await getCol("memoryPlaces");
  await c.deleteOne({ _id: new ObjectId(id), coupleId: session.coupleId });
  broadcastToCouple(session.coupleId, { type: "memoryplace:delete", userId: session.userId });
  return NextResponse.json({ ok: true });
}, { rateLimit: { scope: "memoryplace:delete", max: 60, windowMs: 60_000 } });
