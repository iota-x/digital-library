import { MongoClient } from "mongodb";
import { serverEnv } from "@/lib/env";
import { ensureIndexes } from "@/lib/ensureIndexes";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClient: MongoClient | undefined;
}

export function getClient(): MongoClient {
  if (!global._mongoClient) {
    global._mongoClient = new MongoClient(serverEnv.MONGODB_URI, {
      // keep connections alive — critical for serverless/Next.js
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 10000,
    });
  }
  return global._mongoClient;
}

export async function getDb(db = "anniversary") {
  const client = getClient();
  await client.connect(); // no-op if already connected — safe to call every time
  const database = client.db(db);
  // Kick off one-time index creation (fire-and-forget — never blocks the
  // request). Guarded internally so it only runs once per process.
  if (db === "anniversary") void ensureIndexes(database);
  return database;
}

export async function getCol(col: string, db = "anniversary") {
  const db_ = await getDb(db);
  return db_.collection(col);
}