// // lib/mongodb.ts
// import mongoose from "mongoose";
// import { MongoClient, GridFSBucket, ObjectId } from "mongodb";

// const MONGODB_URI = process.env.MONGODB_URI!;
// if (!MONGODB_URI) {
//   throw new Error("Please set MONGODB_URI in .env.local");
// }

// let cachedMongoose: typeof mongoose | null = (global as any)._mongooseConn || null;
// let cachedClient: MongoClient | null = (global as any)._mongoClient || null;
// let cachedBucket: GridFSBucket | null = (global as any)._gridBucket || null;

// export async function dbConnect() {
//   if (!cachedMongoose) {
//     cachedMongoose = await mongoose.connect(MONGODB_URI, { bufferCommands: false });
//     (global as any)._mongooseConn = cachedMongoose;
//   }
//   return cachedMongoose;
// }

// export async function getMongoClient() {
//   if (!cachedClient) {
//     cachedClient = new MongoClient(MONGODB_URI);
//     await cachedClient.connect();
//     (global as any)._mongoClient = cachedClient;
//   }
//   return cachedClient;
// }

// export async function getGridBucket() {
//   if (!cachedBucket) {
//     const client = await getMongoClient();
//     const dbName = new URL(MONGODB_URI).pathname.replace("/", "") || "test";
//     const db = client.db(dbName);
//     cachedBucket = new GridFSBucket(db, { bucketName: "certificates" });
//     (global as any)._gridBucket = cachedBucket;
//   }
//   return cachedBucket;
// }

// export { ObjectId };
