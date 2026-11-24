const { Performance, Athlete, User } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

// @desc    Create performance record
// @route   POST /api/performance
// @access  Private
exports.createPerformance = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    // Get athlete profile for current user
    const athlete = await Athlete.findOne({ where: { userId: req.user.id } });
    if (!athlete) {
      return res.status(404).json({ 
        success: false, 
        message: 'Please create an athlete profile first' 
      });
    }

    const { sport, performanceDate, metrics, sessionType, duration, intensity, location, conditions, notes, coachFeedback, personalRating, injuryOccurred, injuryDetails } = req.body;

    console.log('Creating performance with data:', {
    athleteId: athlete.id,
    sport,
    performanceDate: performanceDate || new Date(),
    metrics,
    sessionType: sessionType || 'training',
    duration,
    intensity,
    location,
    conditions,
    notes,
    coachFeedback,
    personalRating,
    injuryOccurred: injuryOccurred || false,
    injuryDetails
  });

  const performance = await Performance.create({
    athleteId: athlete.id,
    sport,
    performanceDate: performanceDate || new Date(),
    metrics: metrics || {},  // Ensure metrics is always an object
    sessionType: sessionType || 'training',
    duration: duration || null,
    intensity: intensity || null,
    location: location || null,
    conditions: conditions || null,
    notes: notes || null,
    coachFeedback: coachFeedback || null,
    personalRating: personalRating || null,
    injuryOccurred: injuryOccurred || false,
    injuryDetails: injuryDetails || null
  });

    res.status(201).json({
      success: true,
      message: 'Performance record created successfully',
      data: performance
    });
  } catch (error) {
    console.error('Create performance error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating performance record',
      error: error.message 
    });
  }
};

// @desc    Get all performances for current user
// @route   GET /api/performance
// @access  Private
// @desc    Get all performances for current user (or a roster athlete if coach)
// @route   GET /api/performance
// @access  Private
exports.getMyPerformances = async (req, res) => {
  try {
    const { page = 1, limit = 20, sport, sessionType, startDate, endDate, athleteId } = req.query;
    const offset = (page - 1) * limit;

    let athlete;

    // Coaches can pass ?athleteId= to view a roster player's performances
    if (athleteId && req.user.role === 'coach') {
      athlete = await Athlete.findOne({
        where: { id: athleteId, coachId: req.user.id }  // must be on their roster
      });
      if (!athlete) {
        return res.status(403).json({
          success: false,
          message: 'This athlete is not on your roster'
        });
      }
    } else {
      // Normal athlete fetching their own performances
      athlete = await Athlete.findOne({ where: { userId: req.user.id } });
      if (!athlete) {
        return res.status(404).json({
          success: false,
          message: 'Athlete profile not found'
        });
      }
    }

    // Build query filters
    const where = { athleteId: athlete.id };
    if (sport) where.sport = sport;
    if (sessionType) where.sessionType = sessionType;
    if (startDate && endDate) {
      where.performanceDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const performances = await Performance.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['performanceDate', 'DESC']]
    });

    res.json({
      success: true,
      data: performances.rows,
      pagination: {
        total: performances.count,
        page: parseInt(page),
        pages: Math.ceil(performances.count / limit)
      }
    });
  } catch (error) {
    console.error('Get performances error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching performances',
      error: error.message
    });
  }
};

// @desc    Get single performance by ID
// @route   GET /api/performance/:id
// @access  Private
exports.getPerformanceById = async (req, res) => {
  try {
    const performance = await Performance.findByPk(req.params.id, {
      include: [{
        model: Athlete,
        as: 'athlete',
        include: [{
          model: User,
          as: 'user',
          attributes: { exclude: ['password'] }
        }]
      }]
    });

    if (!performance) {
      return res.status(404).json({ 
        success: false, 
        message: 'Performance record not found' 
      });
    }

    // Check if user owns this performance
    const athlete = await Athlete.findOne({ where: { userId: req.user.id } });
    if (performance.athleteId !== athlete?.id && !['coach', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to view this performance' 
      });
    }

    res.json({
      success: true,
      data: performance
    });
  } catch (error) {
    console.error('Get performance error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching performance',
      error: error.message 
    });
  }
};

// @desc    Update performance record
// @route   PUT /api/performance/:id
// @access  Private
exports.updatePerformance = async (req, res) => {
  try {
    const performance = await Performance.findByPk(req.params.id);

    if (!performance) {
      return res.status(404).json({ 
        success: false, 
        message: 'Performance record not found' 
      });
    }

    // Check if user owns this performance
    const athlete = await Athlete.findOne({ where: { userId: req.user.id } });
    if (performance.athleteId !== athlete?.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to update this performance' 
      });
    }

    const { sport, performanceDate, metrics, sessionType, duration, intensity, location, conditions, notes, coachFeedback, personalRating, injuryOccurred, injuryDetails } = req.body;

    await performance.update({
      sport: sport || performance.sport,
      performanceDate: performanceDate || performance.performanceDate,
      metrics: metrics || performance.metrics,
      sessionType: sessionType || performance.sessionType,
      duration: duration !== undefined ? duration : performance.duration,
      intensity: intensity || performance.intensity,
      location: location !== undefined ? location : performance.location,
      conditions: conditions !== undefined ? conditions : performance.conditions,
      notes: notes !== undefined ? notes : performance.notes,
      coachFeedback: coachFeedback !== undefined ? coachFeedback : performance.coachFeedback,
      personalRating: personalRating !== undefined ? personalRating : performance.personalRating,
      injuryOccurred: injuryOccurred !== undefined ? injuryOccurred : performance.injuryOccurred,
      injuryDetails: injuryDetails !== undefined ? injuryDetails : performance.injuryDetails
    });

    res.json({
      success: true,
      message: 'Performance record updated successfully',
      data: performance
    });
  } catch (error) {
    console.error('Update performance error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating performance',
      error: error.message 
    });
  }
};

// @desc    Delete performance record
// @route   DELETE /api/performance/:id
// @access  Private
exports.deletePerformance = async (req, res) => {
  try {
    const performance = await Performance.findByPk(req.params.id);

    if (!performance) {
      return res.status(404).json({ 
        success: false, 
        message: 'Performance record not found' 
      });
    }

    // Check if user owns this performance
    const athlete = await Athlete.findOne({ where: { userId: req.user.id } });
    if (performance.athleteId !== athlete?.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to delete this performance' 
      });
    }

    await performance.destroy();

    res.json({
      success: true,
      message: 'Performance record deleted successfully'
    });
  } catch (error) {
    console.error('Delete performance error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting performance',
      error: error.message 
    });
  }
};

// @desc    Get performance statistics
// @route   GET /api/performance/stats/summary
// @access  Private
exports.getPerformanceStats = async (req, res) => {
  try {
    const { sport, startDate, endDate } = req.query;

    const athlete = await Athlete.findOne({ where: { userId: req.user.id } });
    if (!athlete) {
      return res.status(404).json({ 
        success: false, 
        message: 'Athlete profile not found' 
      });
    }

    const where = { athleteId: athlete.id };
    if (sport) where.sport = sport;
    if (startDate && endDate) {
      where.performanceDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const performances = await Performance.findAll({
      where,
      order: [['performanceDate', 'DESC']]
    });

    const totalSessions = performances.length;

    const bySessionType = {
      training:    performances.filter(p => p.sessionType === 'training').length,
      competition: performances.filter(p => p.sessionType === 'competition').length,
      assessment:  performances.filter(p => p.sessionType === 'assessment').length
    };

    // ── Composite-aware average rating ─────────────────────────────────────
    // For each session: use personalRating if available, otherwise derive a
    // 1-10 score from the coach composite metrics (which are stored 0-100).
    const COACH_COMPOSITES = [
      'technical_composite',
      'tactical_composite',
      'physical_composite',
      'psychological_composite'
    ];

    const getSessionScore = (p) => {
      if (p.personalRating != null) return p.personalRating;

      // Coach assessment — average available composites, then scale 0-100 → 1-10
      const vals = COACH_COMPOSITES
        .map(k => p.metrics?.[k])
        .filter(v => v != null && !isNaN(v));

      if (vals.length === 0) return null;
      const avg100 = vals.reduce((a, b) => a + b, 0) / vals.length;
      return parseFloat(((avg100 / 100) * 9 + 1).toFixed(2)); // scale to 1-10
    };

    const scoredSessions = performances
      .map(getSessionScore)
      .filter(v => v != null);

    const avgPersonalRating = scoredSessions.length
      ? (scoredSessions.reduce((a, b) => a + b, 0) / scoredSessions.length).toFixed(2)
      : '0.00';

    // Track how many were composite-derived vs self-reported (useful for frontend tooltip)
    const selfReportedCount = performances.filter(p => p.personalRating != null).length;
    const compositeCount    = scoredSessions.length - selfReportedCount;

    const totalDuration = performances
      .filter(p => p.duration)
      .reduce((sum, p) => sum + p.duration, 0);

    const injuryCount = performances.filter(p => p.injuryOccurred).length;

    res.json({
      success: true,
      data: {
        totalSessions,
        bySessionType,
        avgPersonalRating,
        ratingBreakdown: {
          selfReported: selfReportedCount,
          coachDerived: compositeCount,
          total:        scoredSessions.length
        },
        totalDuration,
        injuryCount,
        lastSession: performances[0] || null,
        dateRange: {
          start: startDate || null,
          end:   endDate   || null
        }
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching performance statistics',
      error: error.message 
    });
  }
};

// @desc    Get performance trends (for a specific metric over time)
// @route   GET /api/performance/trends/:metric
// @access  Private
exports.getPerformanceTrends = async (req, res) => {
  try {
    const { metric } = req.params;
    const { sport, startDate, endDate, limit = 50 } = req.query;

    const athlete = await Athlete.findOne({ where: { userId: req.user.id } });
    if (!athlete) {
      return res.status(404).json({ 
        success: false, 
        message: 'Athlete profile not found' 
      });
    }

    const where = { athleteId: athlete.id };
    if (sport) where.sport = sport;
    if (startDate && endDate) {
      where.performanceDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const performances = await Performance.findAll({
      where,
      order: [['performanceDate', 'ASC']],
      limit: parseInt(limit)
    });

    // Extract the specific metric from JSONB
    const trends = performances
      .filter(p => p.metrics && p.metrics[metric] !== undefined)
      .map(p => ({
        date: p.performanceDate,
        value: p.metrics[metric],
        sessionType: p.sessionType
      }));

    res.json({
      success: true,
      data: {
        metric,
        trends,
        count: trends.length
      }
    });
  } catch (error) {
    console.error('Get trends error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching performance trends',
      error: error.message 
    });
  }
};

// @desc    Get benchmarking data for current athlete
// @route   GET /api/performance/benchmark
// @access  Private
exports.getBenchmark = async (req, res) => {
  try {
    // const { sequelize } = require('../config/database');

    // Get current athlete + their performances
    const athlete = await Athlete.findOne({ where: { userId: req.user.id } });
    if (!athlete) {
      return res.status(404).json({ success: false, message: 'Athlete profile not found' });
    }

    const myPerformances = await Performance.findAll({ where: { athleteId: athlete.id } });
    if (myPerformances.length === 0) {
      return res.status(404).json({ success: false, message: 'No performance data found' });
    }

    // Helper — average a metric across performances
    const avgMetric = (perfs, key) => {
      const vals = perfs.map(p => p.metrics?.[key]).filter(v => v != null && !isNaN(v));
      return vals.length ? parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)) : 0;
    };

    const METRICS = ['speed', 'technique', 'passes_completed', 'goals', 'sprint_count', 'distance_covered', 'pass_accuracy'];

    // My averages
    const myAvg = {};
    METRICS.forEach(m => { myAvg[m] = avgMetric(myPerformances, m); });

    // ── 1. Same position benchmark ──────────────────────────────────────────
    const samePositionAthletes = await Athlete.findAll({
      where: { position: athlete.position },
      attributes: ['id']
    });
    const samePositionIds = samePositionAthletes.map(a => a.id);
    const samePositionPerfs = await Performance.findAll({
      where: { athleteId: { [Op.in]: samePositionIds } }
    });
    const positionAvg = {};
    METRICS.forEach(m => { positionAvg[m] = avgMetric(samePositionPerfs, m); });

    // ── 2. Same skill level benchmark ───────────────────────────────────────
    const sameSkillAthletes = await Athlete.findAll({
      where: { skillLevel: athlete.skillLevel },
      attributes: ['id']
    });
    const sameSkillIds = sameSkillAthletes.map(a => a.id);
    const sameSkillPerfs = await Performance.findAll({
      where: { athleteId: { [Op.in]: sameSkillIds } }
    });
    const skillAvg = {};
    METRICS.forEach(m => { skillAvg[m] = avgMetric(sameSkillPerfs, m); });

    // ── 3. Full dataset average ─────────────────────────────────────────────
    const allPerfs = await Performance.findAll();
    const datasetAvg = {};
    METRICS.forEach(m => { datasetAvg[m] = avgMetric(allPerfs, m); });

    // ── 4. Top performers (top 10% by technique) ────────────────────────────
    const allAthletes = await Athlete.findAll({ attributes: ['id'] });
    const athleteMetricMap = {};
    for (const a of allAthletes) {
      const perfs = allPerfs.filter(p => p.athleteId === a.id);
      if (perfs.length > 0) {
        athleteMetricMap[a.id] = avgMetric(perfs, 'technique');
      }
    }
    const sortedByTechnique = Object.entries(athleteMetricMap)
      .sort((a, b) => b[1] - a[1]);
    const topCount  = Math.max(1, Math.floor(sortedByTechnique.length * 0.1));
    const topIds    = sortedByTechnique.slice(0, topCount).map(([id]) => id);
    const topPerfs  = allPerfs.filter(p => topIds.includes(p.athleteId));
    const topAvg    = {};
    METRICS.forEach(m => { topAvg[m] = avgMetric(topPerfs, m); });

    // ── 5. Percentile rankings ──────────────────────────────────────────────
    const percentiles = {};
    METRICS.forEach(metric => {
      const allVals = Object.entries(athleteMetricMap)
        .map(([id]) => avgMetric(allPerfs.filter(p => p.athleteId === id), metric))
        .filter(v => v > 0)
        .sort((a, b) => a - b);

      const myVal   = myAvg[metric];
      const below   = allVals.filter(v => v <= myVal).length;
      percentiles[metric] = allVals.length
        ? Math.round((below / allVals.length) * 100)
        : 0;
    });

    res.json({
      success: true,
      data: {
        athlete: {
          position:   athlete.position,
          skillLevel: athlete.skillLevel,
          totalSessions: myPerformances.length
        },
        myAvg,
        benchmarks: {
          position:  { label: `${athlete.position} Average`,      avg: positionAvg, count: samePositionAthletes.length },
          skillLevel:{ label: `${athlete.skillLevel} Level Average`, avg: skillAvg, count: sameSkillAthletes.length },
          dataset:   { label: 'All Athletes Average',             avg: datasetAvg,  count: allAthletes.length },
          top10:     { label: 'Top 10% Performers',               avg: topAvg,      count: topCount }
        },
        percentiles
      }
    });
  } catch (error) {
    console.error('Benchmark error:', error);
    res.status(500).json({ success: false, message: 'Error fetching benchmark data', error: error.message });
  }
};

// @desc    Relative Age Effect (RAE) analysis
// @route   GET /api/performance/rae
// @access  Private
exports.getRAEAnalysis = async (req, res) => {
  try {
    const athlete = await Athlete.findOne({ where: { userId: req.user.id } });
    if (!athlete) {
      return res.status(404).json({ success: false, message: 'Athlete profile not found' });
    }
    if (!athlete.dateOfBirth) {
      return res.status(400).json({ success: false, message: 'Date of birth required for RAE analysis' });
    }

    // ── Helper: get birth quarter ──────────────────────────────────────────
    const getBirthQuarter = (dob) => {
      const month = new Date(dob).getMonth() + 1; // 1-12
      if (month <= 3)  return { quarter: 'Q1', label: 'Jan–Mar', advantage: 'oldest' };
      if (month <= 6)  return { quarter: 'Q2', label: 'Apr–Jun', advantage: 'older' };
      if (month <= 9)  return { quarter: 'Q3', label: 'Jul–Sep', advantage: 'younger' };
      return              { quarter: 'Q4', label: 'Oct–Dec', advantage: 'youngest' };
    };

    const METRICS = ['speed', 'technique', 'passes_completed', 'goals', 'sprint_count', 'distance_covered', 'pass_accuracy'];

    const avgMetric = (perfs, key) => {
      const vals = perfs.map(p => p.metrics?.[key]).filter(v => v != null && !isNaN(v));
      return vals.length ? parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)) : 0;
    };

    // ── My data ────────────────────────────────────────────────────────────
    const myQuarter   = getBirthQuarter(athlete.dateOfBirth);
    const myPerfs     = await Performance.findAll({ where: { athleteId: athlete.id } });
    const myAvg       = {};
    METRICS.forEach(m => { myAvg[m] = avgMetric(myPerfs, m); });

    // ── Fetch all athletes with DOB ────────────────────────────────────────
    const allAthletes = await Athlete.findAll({
      where: { dateOfBirth: { [Op.ne]: null } },
      attributes: ['id', 'dateOfBirth', 'position']
    });

    // Group athlete IDs by birth quarter
    const quarterGroups = { Q1: [], Q2: [], Q3: [], Q4: [] };
    allAthletes.forEach(a => {
      const q = getBirthQuarter(a.dateOfBirth).quarter;
      quarterGroups[q].push(a.id);
    });

    // Fetch all performances once
    const allPerfs = await Performance.findAll();

    // ── Per-quarter averages ───────────────────────────────────────────────
    const quarterStats = {};
    for (const [q, ids] of Object.entries(quarterGroups)) {
      const qPerfs = allPerfs.filter(p => ids.includes(p.athleteId));
      const qAvg   = {};
      METRICS.forEach(m => { qAvg[m] = avgMetric(qPerfs, m); });
      quarterStats[q] = { avg: qAvg, count: ids.length };
    }

    // ── RAE-adjusted percentiles (vs same quarter only) ────────────────────
    const sameQuarterIds   = quarterGroups[myQuarter.quarter];
    const sameQuarterPerfs = allPerfs.filter(p => sameQuarterIds.includes(p.athleteId));

    // Build per-athlete averages for same quarter
    const sameQuarterAthleteAvgs = {};
    sameQuarterIds.forEach(id => {
      const ap = sameQuarterPerfs.filter(p => p.athleteId === id);
      if (ap.length > 0) {
        sameQuarterAthleteAvgs[id] = {};
        METRICS.forEach(m => { sameQuarterAthleteAvgs[id][m] = avgMetric(ap, m); });
      }
    });

    const raePercentiles = {};
    METRICS.forEach(metric => {
      const vals = Object.values(sameQuarterAthleteAvgs)
        .map(a => a[metric])
        .filter(v => v > 0)
        .sort((a, b) => a - b);
      const myVal = myAvg[metric];
      const below = vals.filter(v => v <= myVal).length;
      raePercentiles[metric] = vals.length ? Math.round((below / vals.length) * 100) : 0;
    });

    // ── Standard percentiles (vs everyone) for comparison ─────────────────
    const allAthleteAvgs = {};
    allAthletes.forEach(a => {
      const ap = allPerfs.filter(p => p.athleteId === a.id);
      if (ap.length > 0) {
        allAthleteAvgs[a.id] = {};
        METRICS.forEach(m => { allAthleteAvgs[a.id][m] = avgMetric(ap, m); });
      }
    });

    const standardPercentiles = {};
    METRICS.forEach(metric => {
      const vals = Object.values(allAthleteAvgs)
        .map(a => a[metric])
        .filter(v => v > 0)
        .sort((a, b) => a - b);
      const myVal = myAvg[metric];
      const below = vals.filter(v => v <= myVal).length;
      standardPercentiles[metric] = vals.length ? Math.round((below / vals.length) * 100) : 0;
    });

    // ── RAE bias score: how much does quarter advantage inflate rankings? ──
    // Positive = standard percentile is higher than RAE-adjusted (inflated by age advantage)
    // Negative = standard percentile is lower (penalised by age disadvantage — hidden gem)
    const raeImpact = {};
    METRICS.forEach(m => {
      raeImpact[m] = standardPercentiles[m] - raePercentiles[m];
    });

    const avgImpact = parseFloat(
      (Object.values(raeImpact).reduce((a, b) => a + b, 0) / METRICS.length).toFixed(1)
    );

    // ── Hidden gem detection ───────────────────────────────────────────────
    // Q4 athletes performing above their quarter average are flagged
    const isHiddenGem = myQuarter.quarter === 'Q4' &&
      Object.values(raePercentiles).filter(p => p >= 60).length >= 3;

    const isOverrated = myQuarter.quarter === 'Q1' &&
      Object.values(raeImpact).filter(v => v > 10).length >= 3;

    res.json({
      success: true,
      data: {
        athlete: {
          dateOfBirth:  athlete.dateOfBirth,
          birthQuarter: myQuarter,
          totalSessions: myPerfs.length,
          position:     athlete.position,
        },
        myAvg,
        standardPercentiles,
        raePercentiles,
        raeImpact,
        avgRaeImpact:  avgImpact,
        quarterStats,
        quarterCounts: {
          Q1: quarterGroups.Q1.length,
          Q2: quarterGroups.Q2.length,
          Q3: quarterGroups.Q3.length,
          Q4: quarterGroups.Q4.length,
        },
        insights: {
          isHiddenGem,
          isOverrated,
          quarterAdvantage: myQuarter.advantage,
          summary: isHiddenGem
            ? 'You are a potential hidden gem — performing above average for your birth quarter despite being one of the youngest in your selection year.'
            : isOverrated
            ? 'Your rankings may be partially inflated by relative age advantage. Your RAE-adjusted scores give a fairer picture of your true ability.'
            : `As a ${myQuarter.label} born athlete, your RAE-adjusted percentiles provide a fairer comparison against peers of similar maturity.`
        }
      }
    });
  } catch (error) {
    console.error('RAE analysis error:', error);
    res.status(500).json({ success: false, message: 'Error performing RAE analysis', error: error.message });
  }
};

// @desc    Coach submits a missing metrics assessment for a player
// @route   POST /api/performance/coach-assessment
// @access  Private (coach only)
exports.submitCoachAssessment = async (req, res) => {
  try {
    if (req.user.role !== 'coach') {
      return res.status(403).json({ success: false, message: 'Only coaches can submit assessments' });
    }

    const {
      athleteId,
      sessionDate,
      sessionType,
      duration,
      // Technical proxies (1-5 scale)
      firstTouchSuccess,
      progressivePassCompletion,
      duelWinRate,
      offBallMovement,
      // Tactical proxies (1-5 scale)
      decisionSpeed,
      patternRecognition,
      adaptability,
      // Physical proxies (1-5 scale)
      acceleration,
      repeatedSprintAbility,
      changeOfDirection,
      // Psychological indicators (1-5 scale)
      consistency,
      resilience,
      performanceUnderPressure,
      // Additional
      coachNotes,
      standoutMoment,
      areasForImprovement
    } = req.body;

    // Verify the athlete belongs to this coach
    const athlete = await Athlete.findOne({
      where: { id: athleteId, coachId: req.user.id }
    });
    if (!athlete) {
      return res.status(403).json({
        success: false,
        message: 'This athlete is not on your roster'
      });
    }

    // Package all proxy indicators into the metrics JSONB field
    const metrics = {
      // Technical (scaled to 0-100 for consistency with other metrics)
      technique:             parseFloat(((duelWinRate / 5) * 100).toFixed(1)),
      first_touch:           parseFloat(((firstTouchSuccess / 5) * 100).toFixed(1)),
      progressive_passing:   parseFloat(((progressivePassCompletion / 5) * 100).toFixed(1)),
      off_ball_movement:     parseFloat(((offBallMovement / 5) * 100).toFixed(1)),
      // Tactical
      decision_speed:        parseFloat(((decisionSpeed / 5) * 100).toFixed(1)),
      pattern_recognition:   parseFloat(((patternRecognition / 5) * 100).toFixed(1)),
      adaptability:          parseFloat(((adaptability / 5) * 100).toFixed(1)),
      // Physical
      acceleration:          parseFloat(((acceleration / 5) * 100).toFixed(1)),
      repeated_sprint:       parseFloat(((repeatedSprintAbility / 5) * 100).toFixed(1)),
      change_of_direction:   parseFloat(((changeOfDirection / 5) * 100).toFixed(1)),
      // Psychological
      consistency:           parseFloat(((consistency / 5) * 100).toFixed(1)),
      resilience:            parseFloat(((resilience / 5) * 100).toFixed(1)),
      pressure_performance:  parseFloat(((performanceUnderPressure / 5) * 100).toFixed(1)),
      // Composite scores
      technical_composite:   parseFloat((((firstTouchSuccess + progressivePassCompletion + duelWinRate + offBallMovement) / 20) * 100).toFixed(1)),
      tactical_composite:    parseFloat((((decisionSpeed + patternRecognition + adaptability) / 15) * 100).toFixed(1)),
      physical_composite:    parseFloat((((acceleration + repeatedSprintAbility + changeOfDirection) / 15) * 100).toFixed(1)),
      psychological_composite: parseFloat((((consistency + resilience + performanceUnderPressure) / 15) * 100).toFixed(1)),
    };

    const performance = await Performance.create({
      athleteId:       athlete.id,
      sport:           athlete.primarySport || 'Football',
      performanceDate: sessionDate ? new Date(sessionDate) : new Date(),
      metrics,
      sessionType:     sessionType || 'assessment',
      intensity:       'medium',
      duration:        duration || null,
      notes:           areasForImprovement || null,
      coachFeedback:   [
        standoutMoment      ? `Standout: ${standoutMoment}`        : null,
        areasForImprovement ? `Improve:  ${areasForImprovement}`   : null,
        coachNotes          ? `Notes: ${coachNotes}`               : null,
      ].filter(Boolean).join(' | ') || null,
      personalRating:  null,
      injuryOccurred:  false,
    });

    res.status(201).json({
      success: true,
      message: 'Assessment submitted successfully',
      data: performance
    });
  } catch (error) {
    console.error('Coach assessment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting assessment',
      error: error.message
    });
  }
};