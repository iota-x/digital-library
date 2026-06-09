import { MongoClient } from "mongodb";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClient: MongoClient | undefined;
}

export function getClient(): MongoClient {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set in .env.local");

  if (!global._mongoClient) {
    global._mongoClient = new MongoClient(uri, {
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
  return client.db(db);
}

export async function getCol(col: string, db = "anniversary") {
  const db_ = await getDb(db);
  return db_.collection(col);
}