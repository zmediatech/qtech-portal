const mongoose = require("mongoose");

async function connectDB(uri) {
  if (!uri) throw new Error("MONGODB_URI is missing");

  mongoose.set("strictQuery", true);

  let cached = global.mongooseDb;
  if (!cached) cached = global.mongooseDb = { conn: null, promise: null };

  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, { autoIndex: true }).then((conn) => conn);
  }

  cached.conn = await cached.promise;
  console.log("MongoDB connected");
  return cached.conn;
}

module.exports = connectDB;
