import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCol } from "@/lib/mongo";

async function col() {
  return getCol("watchlist");
}

export async function GET() {
  try {
    const c = await col();
    const items = await c
      .find({})
      .sort({ addedAt: -1 })
      .toArray();

    const serialized = items.map((item) => ({
      ...item,
      _id: item._id.toString(),
    }));

    return NextResponse.json(serialized);
  } catch {
    return NextResponse.json({ error: "Failed to fetch watchlist" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
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
      ...(coverImage !== undefined && { coverImage: coverImage as string }),
      ...(notes !== undefined && { notes: notes as string }),
      ...(rating !== undefined && { rating: rating as number }),
      addedAt: new Date().toISOString(),
    };

    const c = await col();
    const result = await c.insertOne(doc);

    return NextResponse.json({ ok: true, _id: result.insertedId.toString() }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to insert item" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { _id, ...fields } = body;

    if (!_id) {
      return NextResponse.json({ error: "_id is required" }, { status: 400 });
    }

    // Remove _id from the fields to update if accidentally included
    delete fields._id;

    const c = await col();
    const result = await c.updateOne(
      { _id: new ObjectId(_id as string) },
      { $set: fields }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { _id } = body as { _id: string };

    if (!_id) {
      return NextResponse.json({ error: "_id is required" }, { status: 400 });
    }

    const c = await col();
    const result = await c.deleteOne({ _id: new ObjectId(_id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}
