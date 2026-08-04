// routes/authRoutes.js
const express = require("express");
const { signup, login, me, updateSignatures } = require("../controllers/authController");
const { changePassword } = require("../controllers/changePasswordController");
const { signupValidation, loginValidation, changePasswordValidation } = require("../middleware/AuthValidation");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

router.post("/signup", signupValidation, signup);
router.post("/login", loginValidation, login);
router.post("/change-password", requireAuth, changePasswordValidation, changePassword);
router.get("/me", requireAuth, me);
router.put("/me/signatures", requireAuth, updateSignatures);

module.exports = router;
