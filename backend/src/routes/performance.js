const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const performanceController = require('../controllers/performanceController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// @route   POST /api/performance
// @desc    Create performance record
// @access  Private
router.post('/',
  [
    body('sport')
      .trim()
      .notEmpty()
      .withMessage('Sport is required'),
    body('metrics')
      .isObject()
      .withMessage('Metrics must be an object'),
    body('sessionType')
      .optional()
      .isIn(['training', 'competition', 'assessment'])
      .withMessage('Invalid session type'),
    body('intensity')
      .optional()
      .isIn(['low', 'medium', 'high', 'maximum'])
      .withMessage('Invalid intensity level'),
    body('duration')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Duration must be a positive number'),
    body('personalRating')
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage('Personal rating must be between 1 and 10')
  ],
  performanceController.createPerformance
);

// @route   GET /api/performance
// @desc    Get all performances for current user
// @access  Private
router.get('/', performanceController.getMyPerformances);

// @route   GET /api/performance/stats/summary
// @desc    Get performance statistics
// @access  Private
router.get('/stats/summary', performanceController.getPerformanceStats);

// @route   GET /api/performance/trends/:metric
// @desc    Get performance trends for a specific metric
// @access  Private
router.get('/trends/:metric', performanceController.getPerformanceTrends);

router.get('/benchmark', performanceController.getBenchmark);

router.get('/rae', performanceController.getRAEAnalysis);

router.post('/coach-assessment', performanceController.submitCoachAssessment);

// @route   GET /api/performance/:id
// @desc    Get single performance record
// @access  Private
router.get('/:id', performanceController.getPerformanceById);

// @route   PUT /api/performance/:id
// @desc    Update performance record
// @access  Private
router.put('/:id', performanceController.updatePerformance);

// @route   DELETE /api/performance/:id
// @desc    Delete performance record
// @access  Private
router.delete('/:id', performanceController.deletePerformance);

module.exports = router;