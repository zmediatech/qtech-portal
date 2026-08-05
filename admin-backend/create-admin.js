require("dotenv").config();

const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const UserModel = require("./models/User");

async function main() {
  const uri = process.env.MONGODB_URI;
  const name = process.env.ADMIN_NAME || "SuperAdmin";
  const email = (process.env.ADMIN_EMAIL || "superadmin@gmail.com").toLowerCase().trim();
  const plainPassword = 'super@ADMIN099'
  process.env.ADMIN_PASSWORD ||
    crypto.randomBytes(8).toString("base64url") + "A1!";

  try {
    await connectDB(uri);

    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    const user = await UserModel.findOneAndUpdate(
      { email },
      {
        name,
        email,
        password: hashedPassword,
        role: "admin",
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    console.log("Admin account ready:");
    console.log(`Name: ${user.name}`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${plainPassword}`);
    console.log(`MongoDB ID: ${user._id}`);
  } catch (error) {
    console.error("Failed to create admin account:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => { });
  }
}

main();
