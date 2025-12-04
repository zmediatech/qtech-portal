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

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users
// @access  Public
router.get('/', getAllUsers);

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Public
router.get('/:id', getUserById);

// @route   POST /api/users/register
// @desc    Register a new user
// @access  Public
router.post('/register', createUser);

// @route   POST /api/users/login
// @desc    Login user
// @access  Public
router.post('/login', loginUser);

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private
router.put('/:id', updateUser);

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private
router.delete('/:id', deleteUser);

// @route   PUT /api/users/:id/change-password
// @desc    Change user password
// @access  Private
router.put('/:id/change-password', changePassword);

module.exports = router;
