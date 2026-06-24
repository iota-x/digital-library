import { MongoClient } from "mongodb";
import { readFileSync } from "node:fs";
import { webcrypto } from "node:crypto";
if (!globalThis.crypto) globalThis.crypto = webcrypto;

function envFromFile(path) {
  try {
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const m = line.match(/^\s*MONGODB_URI\s*=\s*(.+?)\s*$/);
      if (m) return m[1].replace(/^["']|["']$/g, "");
    }
  } catch {}
  return null;
}

const uri = process.env.MONGODB_URI || envFromFile(".env") || envFromFile(".env.local");
if (!uri) { console.error("MONGODB_URI not set"); process.exit(1); }

const EMAILS = ["ishu2000pandey@gmail.com", "meomeolala66@gmail.com"];

const client = new MongoClient(uri);
try {
  await client.connect();
  const couples = client.db("anniversary").collection("couples");
  const couple = await couples.findOne({
    $or: [
      { person1Email: { $in: EMAILS } },
      { person2Email: { $in: EMAILS } },
    ],
  });
  if (!couple) { console.error("Couple not found for", EMAILS); process.exit(2); }

  const res = await couples.updateOne(
    { _id: couple._id },
    { $set: { referralCount: 999 } },
  );
  const after = await couples.findOne({ _id: couple._id });
  console.log("Couple:", couple._id.toString(), "| person1:", couple.person1Email, "| person2:", couple.person2Email ?? "(none)");
  console.log("matched:", res.matchedCount, "modified:", res.modifiedCount);
  console.log("referralCount now:", after.referralCount, "| referralCode:", after.referralCode ?? "(will be generated on next visit)");
} finally {
  await client.close();
}
