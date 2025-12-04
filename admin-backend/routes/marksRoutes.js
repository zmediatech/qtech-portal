const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/marksController");

// List with filters, pagination, sorting
router.get("/", ctrl.listMarks);

// Single
router.get("/:id", ctrl.getMarkById);

// Create
router.post("/", ctrl.createMark);

// Update
router.put("/:id", ctrl.updateMark);

// Delete
router.delete("/:id", ctrl.deleteMark);

module.exports = router;
