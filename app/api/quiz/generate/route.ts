import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCol } from "@/lib/mongo";
import { withAuth } from "@/lib/apiHandler";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { buildQuizPack, insertGeneratedQuiz, coupleSlotName } from "@/lib/quizGen";

/**
 * Generate a fresh quiz pack for the couple on demand (the "make us a new quiz"
 * button) and store it under their own `coupleQuizzes`. The daily cron at
 * /api/cron/daily-quiz reuses the same generation lib for its automatic drops.
 */
export const POST = withAuth(async (req, session) => {
  const rl = await rateLimit(req, { scope: "quiz-gen", max: 8, windowMs: 60_000, identifier: session.coupleId });
  if (!rl.ok) return tooManyRequests(rl.retryAfter);

  const couplesCol = await getCol("couples");
  const couple = await couplesCol.findOne({ _id: new ObjectId(session.coupleId) });
  // Address them by nickname (when switched on) — a person's nickname sits on
  // their own person slot of the couple doc.
  const mySlot = session.role === "creator" ? "person1" : "person2";
  const partnerSlot = session.role === "creator" ? "person2" : "person1";
  // For my own name prefer the session name over the doc's generic fallback.
  const myNick = couple?.[`${mySlot}NicknameOn`] && couple?.[`${mySlot}Nickname`];
  const myName = (typeof myNick === "string" && myNick.trim()) ? myNick : session.name;
  const partnerName = coupleSlotName(couple, partnerSlot);

  const pack = await buildQuizPack({ myName, partnerName });
  const summary = await insertGeneratedQuiz(session.coupleId, pack);
  return NextResponse.json(summary);
});
