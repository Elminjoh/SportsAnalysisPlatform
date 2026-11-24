const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register',
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    body('firstName')
      .trim()
      .notEmpty()
      .withMessage('First name is required'),
    body('lastName')
      .trim()
      .notEmpty()
      .withMessage('Last name is required'),
    body('role')
      .optional()
      .isIn(['athlete', 'coach', 'analyst', 'admin'])
      .withMessage('Invalid role')
  ],
  authController.register
);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login',
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],
  authController.login
);

// @route   GET /api/auth/me
// @desc    Get current logged-in user
// @access  Private
router.get('/me', protect, authController.getMe);

// @route   POST /api/auth/join-team
// @desc    Athlete joins a coach's roster using team code
// @access  Private (athlete only)
router.post('/join-team',
  protect,
  [
    body('teamCode')
      .trim()
      .notEmpty()
      .withMessage('Team code is required')
      .isLength({ min: 8, max: 8 })
      .withMessage('Team code must be 8 characters')
  ],
  authController.joinTeam
);

// @route   GET /api/auth/roster
// @desc    Get coach's full player roster
// @access  Private (coach only)
router.get('/roster', protect, authController.getRoster);

// @route   PUT /api/auth/updatepassword
// @desc    Update user password
// @access  Private
router.put('/updatepassword', protect, authController.updatePassword);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', protect, authController.logout);

module.exports = router;