import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCol } from "@/lib/mongo";
import { getSession } from "@/lib/auth";

async function sendUnlockEmail(capsules: { letter: string; from: string; unlockDate: string }[]) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.startsWith("re_placeholder")) return;

  const emails = [process.env.NOTIFY_EMAIL_1, process.env.NOTIFY_EMAIL_2].filter(Boolean) as string[];
  if (!emails.length) return;

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);

  for (const c of capsules) {
    const html = `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#fff5f9;padding:40px 32px;border-radius:20px">
        <div style="text-align:center;font-size:2.5rem;margin-bottom:8px">💌</div>
        <h2 style="font-family:Georgia,serif;color:#be185d;text-align:center;font-weight:400;margin:0 0 4px">
          a time capsule just unlocked
        </h2>
        <p style="text-align:center;color:#9d174d;font-size:0.85rem;margin:0 0 32px">
          from ${c.from || "someone who loves you"} · unlocked ${c.unlockDate}
        </p>
        <div style="background:#fff;border:1px solid #f9a8d4;border-radius:16px;padding:28px 24px;line-height:2;color:#4a1628;font-style:italic;white-space:pre-wrap">
          ${c.letter.replace(/</g,"&lt;").replace(/>/g,"&gt;")}
        </div>
        <p style="text-align:center;color:#be185d;font-size:0.8rem;margin-top:24px">— with love 🩷</p>
      </div>
    `;
    await resend.emails.send({
      from: "Time Capsule <onboarding@resend.dev>",
      to: emails,
      subject: `💌 A time capsule just unlocked — from ${c.from || "your love"}`,
      html,
    });
  }
}

// GET — return only capsules whose unlockDate <= today, and send emails for newly unlocked ones
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const col   = await getCol("capsules");
    const today = new Date().toISOString().slice(0, 10);
    const docs  = await col
      .find({ coupleId: session.coupleId, unlockDate: { $lte: today } }, { projection: { _id: 1, letter: 1, unlockDate: 1, from: 1, createdAt: 1, emailSent: 1, imageUrl: 1 } })
      .sort({ unlockDate: 1 })
      .toArray();

    // Send emails for capsules that haven't been notified yet
    const unnotified = docs.filter(d => !d.emailSent);
    if (unnotified.length) {
      sendUnlockEmail(unnotified.map(d => ({ letter: d.letter, from: d.from, unlockDate: d.unlockDate }))).catch(console.error);
      const ids = unnotified.map(d => d._id);
      await col.updateMany({ _id: { $in: ids } }, { $set: { emailSent: true } });
    }

    const safe = docs.map(d => ({ ...d, id: d._id.toString(), _id: undefined, emailSent: undefined, imageUrl: d.imageUrl || "" }));
    return NextResponse.json(safe);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST — create a new capsule
export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { letter, unlockDate, from, imageUrl } = await req.json();
    if (!letter || !unlockDate) return NextResponse.json({ error: "missing fields" }, { status: 400 });

    const col = await getCol("capsules");
    const res = await col.insertOne({
      letter,
      unlockDate,
      from: from || "",
      imageUrl: imageUrl || "",
      coupleId: session.coupleId,
      createdAt: new Date().toISOString(),
      emailSent: false,
    });
    return NextResponse.json({ id: res.insertedId.toString() });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE — remove a capsule by id
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { id } = await req.json();
    const col = await getCol("capsules");
    await col.deleteOne({ _id: new ObjectId(id), coupleId: session.coupleId });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
