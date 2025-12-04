// routes/feeRecordRoutes.js
const express = require('express');
const {
  listFeeRecords,
  getFeeRecord,
  createFeeRecord,
  updateFeeRecord,
  deleteFeeRecord,
  cleanupOrphanedRecords,      // NEW
  getOrphanedRecordsCount,     // NEW
  feeDashboardTotals,
  deleteStudentWithCascade
} = require('../controllers/feeRecordController.js'); // ✅ matches your filename

const router = express.Router();

// List and dashboard routes
router.get('/', listFeeRecords);
router.get('/dashboard', feeDashboardTotals);

// NEW: Cleanup routes - IMPORTANT: These must come before /:id routes
router.post('/cleanup', cleanupOrphanedRecords);
router.get('/orphaned-count', getOrphanedRecordsCount);

// Individual record routes
router.get('/:id', getFeeRecord);
router.post('/', createFeeRecord);
router.patch('/:id', updateFeeRecord);
router.delete('/:id', deleteFeeRecord);
router.delete('/:id/cascade', deleteStudentWithCascade);
module.exports = router;
