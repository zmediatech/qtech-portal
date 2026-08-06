// routes/userRoutes.js
const express = require('express');
const {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    loginUser,
    changePassword
} = require('../controllers/userController');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const { auditAction } = require('../middleware/auditTrail');

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users
// @access  Public
router.get('/', requireAuth, requireRole('admin'), getAllUsers);

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Public
router.get('/:id', requireAuth, requireRole('admin'), getUserById);

// @route   POST /api/users/register
// @desc    Register a new user
// @access  Public
router.post('/register', requireAuth, requireRole('admin'), auditAction('user.create', (req) => ({
    name: req.body?.name,
    email: req.body?.email,
    role: req.body?.role,
})), createUser);

// @route   POST /api/users/login
// @desc    Login user
// @access  Public
router.post('/login', loginUser);

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private
router.put('/:id', requireAuth, requireRole('admin'), auditAction('user.update', (req) => ({
    userId: req.params.id,
    name: req.body?.name,
    email: req.body?.email,
    role: req.body?.role,
})), updateUser);

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private
router.delete('/:id', requireAuth, requireRole('admin'), auditAction('user.delete', (req) => ({
    userId: req.params.id,
})), deleteUser);

// @route   PUT /api/users/:id/change-password
// @desc    Change user password
// @access  Private
router.put('/:id/change-password', requireAuth, changePassword);

module.exports = router;
