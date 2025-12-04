// controllers/studentController.js
const mongoose = require("mongoose");
const Student = require('../models/Student');
const ClassModel = require('../models/Class');
const VALID_CATEGORIES = ["Free", "Paid"];
const VALID_STATUS = ["Active", "Inactive", "Graduated"];
const VALID_FEE_STATUS = ["Paid", "Unpaid", "Partial", "Overdue"];

function parseDateMaybe(d) {
  if (!d) return undefined;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? undefined : dt;
}


/** Create */
async function createStudent(req, res) {
  try {
    let {
      regNo,
      name,
      fatherName,
      phone,
      email,
      address,
      class: classId,
      category,
      status,
      notes,
      feeStatus,
      dateOfBirth,
      admissionDate,
    } = req.body;

    // Required
    if (!regNo || !name || !phone || !classId) {
      return res
        .status(400)
        .json({ success: false, message: "regNo, name, phone and class are required" });
    }

    // ObjectId validity for class
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ success: false, message: "Invalid class id" });
    }

    // Enums / defaults
    if (category && !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, message: "Invalid category" });
    }
    if (status && !VALID_STATUS.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }
    if (feeStatus && !VALID_FEE_STATUS.includes(feeStatus)) {
      return res.status(400).json({ success: false, message: "Invalid feeStatus" });
    }

    // Normalize strings
    regNo = String(regNo).trim();
    name = String(name).trim();
    phone = String(phone).trim();
    if (fatherName) fatherName = String(fatherName).trim();
    if (email) email = String(email).trim().toLowerCase();
    if (address) address = String(address).trim();

    // Parse dates (browser will usually send YYYY-MM-DD)
    const dobParsed = parseDateMaybe(dateOfBirth);
    const admParsed = parseDateMaybe(admissionDate);

    // Ensure class exists (optional but nice)
    const cls = await ClassModel.findById(classId).select("_id");
    if (!cls) {
      return res.status(404).json({ success: false, message: "Class not found" });
    }

    const doc = await Student.create({
      regNo,
      name,
      fatherName,
      phone,
      email,
      address,
      class: classId,
      category: category || "Paid",
      status: status || "Active",
      notes,
      feeStatus: feeStatus || "Unpaid",
      dateOfBirth: dobParsed,
      admissionDate: admParsed, // Student schema already defaults this if undefined
    });

    // Safety: ensure student is in Class.students
    await ClassModel.updateOne({ _id: classId }, { $addToSet: { students: doc._id } });

    return res.status(201).json({ success: true, message: "Student created", data: doc });
  } catch (err) {
    // Duplicate keys
    if (err?.code === 11000) {
      const fields = Object.keys(err.keyPattern || {});
      const pretty =
        fields.length > 0 ? `Duplicate value for: ${fields.join(", ")}` : "Duplicate key";
      return res.status(409).json({ success: false, message: pretty });
    }
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
}

/** Read all (supports text search: ?q=..., and class filter: ?classId=...) */
// controllers/studentController.js
async function getAllStudents(req, res) {
  try {
    const { q, classId, status, category, feeStatus } = req.query;
    const filter = {};

    // text search
    if (q && q.trim()) filter.$text = { $search: q.trim() };

    // by class
    if (classId) filter.class = classId;

    // NEW: by status
    if (status) {
      const VALID_STATUSES = ["Active", "Inactive", "Graduated"];
      if (!VALID_STATUSES.includes(status))
        return res.status(400).json({ success: false, message: "Invalid status filter" });
      filter.status = status;
    }

    // NEW: by category
    if (category) {
      const VALID_CATEGORIES = ["Free", "Paid"];
      if (!VALID_CATEGORIES.includes(category))
        return res.status(400).json({ success: false, message: "Invalid category filter" });
      filter.category = category;
    }

    // NEW: by feeStatus
    if (feeStatus) {
      const VALID_FEE_STATUSES = ["Paid", "Unpaid", "Partial", "Overdue"];
      if (!VALID_FEE_STATUSES.includes(feeStatus))
        return res.status(400).json({ success: false, message: "Invalid feeStatus filter" });
      filter.feeStatus = feeStatus;
    }

    const list = await Student.find(filter)
      .populate('class', 'name')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: list.length, data: list });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
}

module.exports = { getAllStudents };


/** Read one */
async function getStudentById(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid student id" });
    }
    const doc = await Student.findById(id).populate("class", "name");
    if (!doc) return res.status(404).json({ success: false, message: "Student not found" });
    return res.status(200).json({ success: true, data: doc });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
}

async function getStudentsByClass(req, res) {
  try {
    const { classId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ success: false, message: "Invalid class id" });
    }

    // Ensure class exists (optional but nice)
    const classExists = await ClassModel.exists({ _id: classId });
    if (!classExists) {
      return res.status(404).json({ success: false, message: "Class not found" });
    }

    // Filters
    const { q, status, category, feeStatus } = req.query;
    const filter = { class: classId };

    if (q && q.trim()) filter.$text = { $search: q.trim() };

    if (status) {
      if (!VALID_STATUS.includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid status filter" });
      }
      filter.status = status;
    }

    if (category) {
      if (!VALID_CATEGORIES.includes(category)) {
        return res.status(400).json({ success: false, message: "Invalid category filter" });
      }
      filter.category = category;
    }

    if (feeStatus) {
      if (!VALID_FEE_STATUS.includes(feeStatus)) {
        return res.status(400).json({ success: false, message: "Invalid feeStatus filter" });
      }
      filter.feeStatus = feeStatus;
    }

    // Pagination & Sorting
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 200);

    const ALLOWED_SORT = new Set(["createdAt", "updatedAt", "name", "regNo"]);
    const sortBy = ALLOWED_SORT.has(String(req.query.sortBy)) ? String(req.query.sortBy) : "createdAt";
    const sortOrder = String(req.query.sortOrder).toLowerCase() === "asc" ? 1 : -1;

    const total = await Student.countDocuments(filter);
    const list = await Student.find(filter)
      .populate("class", "name")
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({
      success: true,
      count: list.length,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      data: list,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
}
/** Update
 * Use findById -> mutate -> save, so validators run and we can handle class changes safely.
 */
async function updateStudent(req, res) {
  try {
    const id = req.params.id;
    const payload = req.body;

    const doc = await Student.findById(id);
    if (!doc) return res.status(404).json({ success: false, message: 'Student not found' });

    const oldClassId = String(doc.class);

    // Assign only provided fields
    const fields = [
      'regNo', 'name', 'fatherName', 'phone', 'email', 'address',
      'class', 'category', 'status', 'notes', 'feeStatus',
      'dateOfBirth', 'admissionDate',
    ];
    fields.forEach((f) => {
      if (payload[f] !== undefined) {
        if (typeof payload[f] === 'string') {
          doc[f] = payload[f].trim();
        } else {
          doc[f] = payload[f];
        }
      }
    });

    const saved = await doc.save();

    // If class changed, keep Class.students in sync
    const newClassId = String(saved.class);
    if (oldClassId !== newClassId) {
      await ClassModel.updateOne({ _id: oldClassId }, { $pull: { students: saved._id } });
      await ClassModel.updateOne({ _id: newClassId }, { $addToSet: { students: saved._id } });
    }

    return res.status(200).json({ success: true, message: 'Student updated', data: saved });
  } catch (err) {
    if (err?.code === 11000) {
      const fields = Object.keys(err.keyPattern || {});
      const msg = `Duplicate value for: ${fields.join(', ')}`;
      return res.status(409).json({ success: false, message: msg });
    }
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
}

/** Delete */
async function deleteStudent(req, res) {
  try {
    const doc = await Student.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Student not found' });

    // Keep Class.students in sync since post('remove') won't run for findByIdAndDelete
    if (doc.class) {
      await ClassModel.updateOne({ _id: doc.class }, { $pull: { students: doc._id } });
    }

    return res.status(200).json({ success: true, message: 'Student deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
}

module.exports = {
  createStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  getStudentsByClass,
};
