const router = require("express").Router();
const ctrl = require("../controllers/marksController");

router.get("/", ctrl.listMarks);
router.get("/:id", ctrl.getMarkById);
router.post("/", ctrl.createMark);
router.patch("/:id", ctrl.updateMark);
router.delete("/:id", ctrl.deleteMark);

module.exports = router;
