const { Athlete, User, Performance } = require('../models');
const { validationResult } = require('express-validator');

// @desc    Create athlete profile
// @route   POST /api/athletes
// @access  Private
exports.createAthleteProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { dateOfBirth, gender, height, weight, primarySport, skillLevel, teamName, position, coachName } = req.body;

    // Check if athlete profile already exists for this user
    const existingAthlete = await Athlete.findOne({ where: { userId: req.user.id } });
    if (existingAthlete) {
      return res.status(400).json({ 
        success: false, 
        message: 'Athlete profile already exists for this user' 
      });
    }

    // Create athlete profile
    const athlete = await Athlete.create({
      userId: req.user.id,
      dateOfBirth,
      gender,
      height,
      weight,
      primarySport,
      skillLevel: skillLevel || 'intermediate',
      teamName,
      position,
      coachName
    });

    // Get full profile with user info
    const fullProfile = await athlete.getFullProfile();

    res.status(201).json({
      success: true,
      message: 'Athlete profile created successfully',
      data: fullProfile
    });
  } catch (error) {
    console.error('Create athlete error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating athlete profile',
      error: error.message 
    });
  }
};

// @desc    Get athlete profile (current user)
// @route   GET /api/athletes/me
// @access  Private
exports.getMyProfile = async (req, res) => {
  try {
    const athlete = await Athlete.findOne({ 
      where: { userId: req.user.id },
      include: [{
        model: User,
        as: 'user',
        attributes: { exclude: ['password'] }
      }]
    });

    if (!athlete) {
      return res.status(404).json({ 
        success: false, 
        message: 'Athlete profile not found. Please create your profile first.' 
      });
    }

    // Get performance summary
    const performanceSummary = await athlete.getPerformanceSummary();

    res.json({
      success: true,
      data: {
        ...athlete.toJSON(),
        performanceSummary
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching athlete profile',
      error: error.message 
    });
  }
};

// @desc    Get athlete by ID
// @route   GET /api/athletes/:id
// @access  Private
exports.getAthleteById = async (req, res) => {
  try {
    const athlete = await Athlete.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'user',
        attributes: { exclude: ['password'] }
      }]
    });

    if (!athlete) {
      return res.status(404).json({ 
        success: false, 
        message: 'Athlete not found' 
      });
    }

    res.json({
      success: true,
      data: athlete
    });
  } catch (error) {
    console.error('Get athlete error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching athlete',
      error: error.message 
    });
  }
};

// @desc    Update athlete profile
// @route   PUT /api/athletes/me
// @access  Private
exports.updateMyProfile = async (req, res) => {
  try {
    const athlete = await Athlete.findOne({ where: { userId: req.user.id } });

    if (!athlete) {
      return res.status(404).json({ 
        success: false, 
        message: 'Athlete profile not found' 
      });
    }

    // Update fields
    const { height, weight, primarySport, skillLevel, teamName, position, coachName, medicalNotes, emergencyContact } = req.body;

    await athlete.update({
      height: height !== undefined ? height : athlete.height,
      weight: weight !== undefined ? weight : athlete.weight,
      primarySport: primarySport || athlete.primarySport,
      skillLevel: skillLevel || athlete.skillLevel,
      teamName: teamName !== undefined ? teamName : athlete.teamName,
      position: position !== undefined ? position : athlete.position,
      coachName: coachName !== undefined ? coachName : athlete.coachName,
      medicalNotes: medicalNotes !== undefined ? medicalNotes : athlete.medicalNotes,
      emergencyContact: emergencyContact !== undefined ? emergencyContact : athlete.emergencyContact
    });

    const fullProfile = await athlete.getFullProfile();

    res.json({
      success: true,
      message: 'Athlete profile updated successfully',
      data: fullProfile
    });
  } catch (error) {
    console.error('Update athlete error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating athlete profile',
      error: error.message 
    });
  }
};

// @desc    Get all athletes (for coaches/admins)
// @route   GET /api/athletes
// @access  Private (coach/admin)
exports.getAllAthletes = async (req, res) => {
  try {
    const { page = 1, limit = 10, sport, skillLevel } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (sport) where.primarySport = sport;
    if (skillLevel) where.skillLevel = skillLevel;

    const athletes = await Athlete.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'user',
        attributes: { exclude: ['password'] }
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: athletes.rows,
      pagination: {
        total: athletes.count,
        page: parseInt(page),
        pages: Math.ceil(athletes.count / limit)
      }
    });
  } catch (error) {
    console.error('Get athletes error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching athletes',
      error: error.message 
    });
  }
};

// @desc    Delete athlete profile
// @route   DELETE /api/athletes/me
// @access  Private
exports.deleteMyProfile = async (req, res) => {
  try {
    const athlete = await Athlete.findOne({ where: { userId: req.user.id } });

    if (!athlete) {
      return res.status(404).json({ 
        success: false, 
        message: 'Athlete profile not found' 
      });
    }

    await athlete.destroy();

    res.json({
      success: true,
      message: 'Athlete profile deleted successfully'
    });
  } catch (error) {
    console.error('Delete athlete error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting athlete profile',
      error: error.message 
    });
  }
};