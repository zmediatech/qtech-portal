const mongoose = require('mongoose');
const FeeRecord = require('../models/FeeRecord'); // use your exact filename
const Student = require('../models/Student'); // Add this import

function buildListQuery({ q, status, classId, from, to }) {
  const where = {};

  if (q) {
    const trimmed = String(q).trim();
    where.$or = [
      { $text: { $search: trimmed } },
      { regNo: new RegExp(`^${trimmed}`, 'i') },
    ];
  }

  if (status && status !== 'All') where.status = status;

  if (classId && classId !== 'All' && mongoose.isValidObjectId(classId)) {
    where.classroom = classId;
  }

  if (from || to) {
    where.date = {};
    if (from) where.date.$gte = new Date(from);
    if (to)   where.date.$lte = new Date(to);
  }

  return where;
}

async function listFeeRecords(req, res) {
  try {
    const { q, status, classId, from, to, page = 1, limit = 20, sort = 'date:desc' } = req.query;
    const where = buildListQuery({ q, status, classId, from, to });

    const [sField, sDir] = String(sort).split(':');
    const sortObj = sField ? { [sField]: sDir === 'asc' ? 1 : -1 } : { date: -1 };

    const [items, total] = await Promise.all([
      FeeRecord.find(where)
        .sort(sortObj)
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit)),
      FeeRecord.countDocuments(where),
    ]);

    res.json({
      items,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    console.error('listFeeRecords error:', err);
    res.status(500).json({ error: 'Failed to fetch fee records' });
  }
}

async function getFeeRecord(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'Invalid ID' });

    const doc = await FeeRecord.findById(id);
    if (!doc) return res.status(404).json({ error: 'Fee record not found' });

    res.json(doc);
  } catch (err) {
    console.error('getFeeRecord error:', err);
    res.status(500).json({ error: 'Failed to fetch fee record' });
  }
}

async function createFeeRecord(req, res) {
  try {
    const payload = {
      student: req.body.student,
      classroom: req.body.classroom,
      regNo: req.body.regNo,
      studentName: req.body.studentName,
      className: req.body.className,
      feeType: req.body.feeType,
      amount: req.body.amount,
      date: req.body.date,
      method: req.body.method,
      status: req.body.status,
      referenceNo: req.body.referenceNo,
      notes: req.body.notes,
    };

    const doc = await FeeRecord.create(payload);
    res.status(201).json(doc);
  } catch (err) {
    console.error('createFeeRecord error:', err);
    if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Failed to create fee record' });
  }
}

async function updateFeeRecord(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'Invalid ID' });

    const allowed = [
      'student', 'classroom', 'regNo', 'studentName', 'className',
      'feeType', 'amount', 'date', 'method', 'status', 'referenceNo', 'notes',
    ];
    const update = {};
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, k)) update[k] = req.body[k];
    }

    const doc = await FeeRecord.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });

    if (!doc) return res.status(404).json({ error: 'Fee record not found' });
    res.json(doc);
  } catch (err) {
    console.error('updateFeeRecord error:', err);
    if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Failed to update fee record' });
  }
}

async function deleteFeeRecord(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'Invalid ID' });

    const doc = await FeeRecord.findByIdAndDelete(id);
    if (!doc) return res.status(404).json({ error: 'Fee record not found' });

    res.json({ 
      success: true,
      message: 'Fee record deleted successfully',
      deletedRecord: {
        id: doc._id,
        regNo: doc.regNo,
        studentName: doc.studentName,
        amount: doc.amount
      }
    });
  } catch (err) {
    console.error('deleteFeeRecord error:', err);
    res.status(500).json({ error: 'Failed to delete fee record' });
  }
}

// NEW: Cleanup orphaned records function
async function cleanupOrphanedRecords(req, res) {
  try {
    // Get all unique regNos from fee records
    const feeRecordRegNos = await FeeRecord.distinct('regNo');
    
    // Get all existing student regNos
    const existingStudents = await Student.find({}, 'regNo');
    const validRegNos = new Set(existingStudents.map(student => student.regNo));
    
    // Find orphaned regNos (regNos in fee records but not in students)
    const orphanedRegNos = feeRecordRegNos.filter(regNo => !validRegNos.has(regNo));
    
    if (orphanedRegNos.length === 0) {
      return res.json({
        message: 'No orphaned records found',
        deletedCount: 0,
        orphanedRegNos: []
      });
    }
    
    // Delete orphaned fee records
    const deleteResult = await FeeRecord.deleteMany({ 
      regNo: { $in: orphanedRegNos } 
    });
    
    console.log(`Cleaned up ${deleteResult.deletedCount} orphaned fee records for regNos:`, orphanedRegNos);
    
    res.json({
      message: `Successfully cleaned up ${deleteResult.deletedCount} orphaned fee records`,
      deletedCount: deleteResult.deletedCount,
      orphanedRegNos: orphanedRegNos
    });
    
  } catch (err) {
    console.error('cleanupOrphanedRecords error:', err);
    res.status(500).json({ 
      error: 'Failed to cleanup orphaned records',
      details: err.message 
    });
  }
}

// NEW: Get orphaned records count
async function getOrphanedRecordsCount(req, res) {
  try {
    // Get all unique regNos from fee records
    const feeRecordRegNos = await FeeRecord.distinct('regNo');
    
    // Get all existing student regNos
    const existingStudents = await Student.find({}, 'regNo');
    const validRegNos = new Set(existingStudents.map(student => student.regNo));
    
    // Find orphaned regNos
    const orphanedRegNos = feeRecordRegNos.filter(regNo => !validRegNos.has(regNo));
    
    // Count orphaned records
    const orphanedCount = await FeeRecord.countDocuments({ 
      regNo: { $in: orphanedRegNos } 
    });
    
    res.json({
      orphanedCount,
      orphanedRegNos
    });
    
  } catch (err) {
    console.error('getOrphanedRecordsCount error:', err);
    res.status(500).json({ error: 'Failed to get orphaned records count' });
  }
}

async function feeDashboardTotals(req, res) {
  try {
    const startOfThisMonth = new Date();
    startOfThisMonth.setDate(1);
    startOfThisMonth.setHours(0, 0, 0, 0);

    const [byStatus, thisMonthPaid] = await Promise.all([
      FeeRecord.aggregate([{ $group: { _id: '$status', total: { $sum: '$amount' } } }]),
      FeeRecord.aggregate([
        { $match: { status: 'Paid', date: { $gte: startOfThisMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    const map = {};
    byStatus.forEach(s => { map[s._id] = s.total; });

    res.json({
      totalCollected: map.Paid || 0,
      pending: map.Pending || 0,
      unpaid: map.Unpaid || 0,
      thisMonth: (thisMonthPaid[0] && thisMonthPaid[0].total) || 0,
    });
  } catch (err) {
    console.error('feeDashboardTotals error:', err);
    res.status(500).json({ error: 'Failed to compute dashboard totals' });
  }
}
async function deleteStudentWithCascade(req, res) {
  try {
    const { id } = req.params;
    
    // Handle both ObjectId and regNo
    let student;
    if (mongoose.isValidObjectId(id)) {
      student = await Student.findById(id);
    } else {
      // Try to find by regNo
      student = await Student.findOne({ regNo: id });
    }
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    // Store regNo for cascade delete
    const regNo = student.regNo;
    
    // Delete the student
    await Student.findByIdAndDelete(student._id);
    
    // Also delete all associated fee records
    const deletedFeeRecords = await FeeRecord.deleteMany({ regNo: regNo });
    
    console.log(`Deleted student ${regNo} and ${deletedFeeRecords.deletedCount} associated fee records`);
    
    res.json({ 
      success: true,
      message: 'Student and associated records deleted successfully',
      deletedStudent: {
        id: student._id,
        regNo: student.regNo,
        name: student.firstName + ' ' + student.lastName
      },
      deletedFeeRecords: deletedFeeRecords.deletedCount
    });
    
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ error: 'Failed to delete student' });
  }
}

module.exports = {
  listFeeRecords,
  getFeeRecord,
  createFeeRecord,
  updateFeeRecord,
  deleteFeeRecord,
  cleanupOrphanedRecords,      // NEW
  getOrphanedRecordsCount,     // NEW
  feeDashboardTotals,
    deleteStudentWithCascade     // NEW
};
