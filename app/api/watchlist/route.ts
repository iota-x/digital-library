import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCol } from "@/lib/mongo";
import { withAuth } from "@/lib/apiHandler";
import { READ_CACHE_HEADERS } from "@/lib/cacheHeaders";

export const GET = withAuth(async (_req, session) => {
  const c = await getCol("watchlist");
  const items = await c
    .find({ coupleId: session.coupleId })
    .sort({ addedAt: -1 })
    .toArray();

  const serialized = items.map((item) => ({
    ...item,
    _id: item._id.toString(),
  }));

  return NextResponse.json(serialized, { headers: READ_CACHE_HEADERS });
});

export const POST = withAuth(async (req, session) => {
  const body = await req.json();
  const { title, type, status, coverImage, notes, rating } = body;

  if (!title || !type || !status) {
    return NextResponse.json(
      { error: "title, type, and status are required" },
      { status: 400 }
    );
  }

  const doc = {
    title: title as string,
    type: type as "movie" | "series" | "anime",
    status: status as "plan-to-watch" | "watching" | "completed",
    coupleId: session.coupleId,
    ...(coverImage !== undefined && { coverImage: coverImage as string }),
    ...(notes !== undefined && { notes: notes as string }),
    ...(rating !== undefined && { rating: rating as number }),
    addedAt: new Date().toISOString(),
  };

  const c = await getCol("watchlist");
  const result = await c.insertOne(doc);

  return NextResponse.json({ ok: true, _id: result.insertedId.toString() }, { status: 201 });
});

export const PUT = withAuth(async (req, session) => {
  const body = await req.json();
  const { _id, ...fields } = body;

  if (!_id) {
    return NextResponse.json({ error: "_id is required" }, { status: 400 });
  }

  delete fields._id;

  const c = await getCol("watchlist");
  const result = await c.updateOne(
    { _id: new ObjectId(_id as string), coupleId: session.coupleId },
    { $set: fields }
  );

  if (result.matchedCount === 0) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
});

export const DELETE = withAuth(async (req, session) => {
  const body = await req.json();
  const { _id } = body as { _id: string };

  if (!_id) {
    return NextResponse.json({ error: "_id is required" }, { status: 400 });
  }

  const c = await getCol("watchlist");
  const result = await c.deleteOne({ _id: new ObjectId(_id), coupleId: session.coupleId });

  if (result.deletedCount === 0) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
});
