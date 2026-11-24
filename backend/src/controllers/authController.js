const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const User = require('../models/User');
const Athlete = require('../models/Athlete');

// Generate JWT Token
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Generate unique 8-character team code for coaches
const generateTeamCode = async () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusable chars (0/O, 1/I)
  let code, exists;
  do {
    code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    exists = await User.findOne({ where: { teamCode: code } });
  } while (exists);
  return code;
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password, firstName, lastName, role } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    // Auto-generate team code if registering as coach
    const userRole   = role || 'athlete';
    const teamCode   = userRole === 'coach' ? await generateTeamCode() : null;

    const user = await User.create({
      email, password, firstName, lastName,
      role: userRole,
      teamCode
    });

    const token = signToken(user.id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id:        user.id,
        email:     user.email,
        firstName: user.firstName,
        lastName:  user.lastName,
        role:      user.role,
        teamCode:  user.teamCode  // returned so coach can share it with players
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Error registering user', error: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account is deactivated. Please contact support.' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = signToken(user.id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id:        user.id,
        email:     user.email,
        firstName: user.firstName,
        lastName:  user.lastName,
        role:      user.role,
        teamCode:  user.teamCode
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Error logging in', error: error.message });
  }
};

// @desc    Get current logged-in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id:        user.id,
        email:     user.email,
        firstName: user.firstName,
        lastName:  user.lastName,
        role:      user.role,
        teamCode:  user.teamCode,
        isActive:  user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ success: false, message: 'Error fetching user data', error: error.message });
  }
};

// @desc    Athlete joins a coach's roster using team code
// @route   POST /api/auth/join-team
// @access  Private (athlete only)
exports.joinTeam = async (req, res) => {
  try {
    const { teamCode } = req.body;
    if (!teamCode) {
      return res.status(400).json({ success: false, message: 'Team code is required' });
    }

    // Find coach by team code
    const coach = await User.findOne({
      where: { teamCode: teamCode.toUpperCase().trim(), role: 'coach' }
    });
    if (!coach) {
      return res.status(404).json({ success: false, message: 'Invalid team code — no coach found' });
    }

    // Find the athlete profile for the current user
    const athlete = await Athlete.findOne({ where: { userId: req.user.id } });
    if (!athlete) {
      return res.status(404).json({ success: false, message: 'Athlete profile not found. Please create your profile first.' });
    }

    // Link athlete to coach
    await athlete.update({
      coachId:   coach.id,
      coachName: `${coach.firstName} ${coach.lastName}`
    });

    res.json({
      success: true,
      message: `Successfully joined ${coach.firstName} ${coach.lastName}'s team!`,
      data: {
        coachName: `${coach.firstName} ${coach.lastName}`,
        teamCode:  coach.teamCode
      }
    });
  } catch (error) {
    console.error('Join team error:', error);
    res.status(500).json({ success: false, message: 'Error joining team', error: error.message });
  }
};

// @desc    Get coach's full player roster
// @route   GET /api/auth/roster
// @access  Private (coach only)
exports.getRoster = async (req, res) => {
  try {
    if (req.user.role !== 'coach') {
      return res.status(403).json({ success: false, message: 'Only coaches can access the roster' });
    }

    const { Performance } = require('../models');

    const athletes = await Athlete.findAll({
      where: { coachId: req.user.id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'firstName', 'lastName']
        },
        {
          model: Performance,
          as: 'performances'   // fetch all fields so frontend can compute scores
        }
      ]
    });

    res.json({
      success: true,
      data: athletes,
      count: athletes.length
    });
  } catch (error) {
    console.error('Get roster error:', error);
    res.status(500).json({ success: false, message: 'Error fetching roster', error: error.message });
  }
};

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide both current and new password' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long' });
    }

    const user = await User.findByPk(req.user.id);

    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    const token = signToken(user.id);

    res.json({ success: true, message: 'Password updated successfully', token });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ success: false, message: 'Error updating password', error: error.message });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error logging out', error: error.message });
  }
};