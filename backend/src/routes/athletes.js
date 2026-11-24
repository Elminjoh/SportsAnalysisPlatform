const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const athleteController = require('../controllers/athleteController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// @route   POST /api/athletes
// @desc    Create athlete profile
// @access  Private
router.post('/',
  [
    body('dateOfBirth')
      .isDate()
      .withMessage('Valid date of birth is required'),
    body('gender')
      .isIn(['male', 'female', 'other'])
      .withMessage('Gender must be male, female, or other'),
    body('primarySport')
      .trim()
      .notEmpty()
      .withMessage('Primary sport is required'),
    body('skillLevel')
      .optional()
      .isIn(['beginner', 'intermediate', 'advanced', 'professional'])
      .withMessage('Invalid skill level'),
    body('height')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Height must be a positive number'),
    body('weight')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Weight must be a positive number')
  ],
  athleteController.createAthleteProfile
);

// @route   GET /api/athletes/me
// @desc    Get current user's athlete profile
// @access  Private
router.get('/me', athleteController.getMyProfile);

// @route   PUT /api/athletes/me
// @desc    Update current user's athlete profile
// @access  Private
router.put('/me', athleteController.updateMyProfile);

// @route   DELETE /api/athletes/me
// @desc    Delete current user's athlete profile
// @access  Private
router.delete('/me', athleteController.deleteMyProfile);

// @route   GET /api/athletes
// @desc    Get all athletes (for coaches/admins)
// @access  Private (coach/admin)
router.get('/', authorize('coach', 'admin'), athleteController.getAllAthletes);

// @route   GET /api/athletes/:id
// @desc    Get athlete by ID
// @access  Private
router.get('/:id', athleteController.getAthleteById);

module.exports = router;