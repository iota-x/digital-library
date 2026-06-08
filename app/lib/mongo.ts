import { MongoClient } from "mongodb";

const globalWithMongo = global as typeof global & {
  _mongoClient?: MongoClient;
};

export function getClient() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is not configured");
  }

  if (!globalWithMongo._mongoClient) {
    globalWithMongo._mongoClient = new MongoClient(uri);
  }

  return globalWithMongo._mongoClient;
}

export async function getDb(db = "anniversary") {
  const client = getClient();

  if (!(client as any).topology?.isConnected?.()) {
    await client.connect();
  }

  return client.db(db);
}

export async function getCol(col: string, db = "anniversary") {
  const database = await getDb(db);
  return database.collection(col);
}