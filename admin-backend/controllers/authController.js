// controllers/authController.js
const bcrypt = require("bcryptjs");
const UserModel = require("../models/User");
const jwt = require("jsonwebtoken");
const connectDB = require("../config/db");

const signup = async (req, res) => {
  try {
    const body = req.body || {};
    const name = body.name;
    const password = body.password;
    const email = String(body.email || "").toLowerCase().trim();

    await connectDB(process.env.MONGODB_URI);

    const exists = await UserModel.findOne({ email });
    if (exists) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await UserModel.create({ name, email, password: hashed });

    res.status(201).json({
      message: "User created successfully",
      success: true,
      id: user._id,
    });
  } catch (error) {
    console.error("Error during signup:", error);
    res.status(500).json({ error: "Internal server error", success: false });
  }
};

const login = async (req, res) => {
  try {
    const body = req.body || {};
    const email = String(body.email || "").toLowerCase().trim();
    const password = body.password;
    const errorMsg = "auth failed email or password is wrong";

    await connectDB(process.env.MONGODB_URI);

    const user = await UserModel.findOne({ email });
    if (!user) return res.status(403).json({ message: errorMsg, success: false });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(403).json({ message: errorMsg, success: false });

    const token = jwt.sign(
      { email: user.email, _id: user._id },
      process.env.JWT_SECRET || "secret-123",
      { expiresIn: "24h" }
    );

    res.status(200).json({
      message: "login success",
      success: true,
      token,
      user: { email: user.email, name: user.name, id: user._id },
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ error: "Internal server error", success: false });
  }
};



module.exports = { signup, login };

// 
