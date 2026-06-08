import { MongoClient } from "mongodb";

const URI = process.env.MONGODB_URI!;
if (!URI) throw new Error("MONGODB_URI is not set in .env.local");

// Re-use the connection across hot-reloads in dev
const globalWithMongo = global as typeof global & { _mongoClient?: MongoClient };

let client: MongoClient;
if (process.env.NODE_ENV === "development") {
  if (!globalWithMongo._mongoClient) {
    globalWithMongo._mongoClient = new MongoClient(URI);
  }
  client = globalWithMongo._mongoClient;
} else {
  client = new MongoClient(URI);
}

export async function getDb(db = "anniversary") {
  await client.connect();
  return client.db(db);
}

export async function getCol(col: string, db = "anniversary") {
  const database = await getDb(db);
  return database.collection(col);
}