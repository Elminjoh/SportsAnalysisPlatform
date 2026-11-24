// Import all models
const User = require('./User');
const Athlete = require('./Athlete');
const Performance = require('./Performance');
const Sport = require('./Sport');

// ============================================
// DEFINE RELATIONSHIPS
// ============================================

// User <-> Athlete (One-to-One)
User.hasOne(Athlete, {
  foreignKey: 'userId',
  as: 'athleteProfile',
  onDelete: 'CASCADE'
});

Athlete.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

// Athlete <-> Performance (One-to-Many)
Athlete.hasMany(Performance, {
  foreignKey: 'athleteId',
  as: 'performances',
  onDelete: 'CASCADE'
});

Performance.belongsTo(Athlete, {
  foreignKey: 'athleteId',
  as: 'athlete'
});

// ============================================
// HELPER METHODS
// ============================================

// Get full athlete profile with user info
Athlete.prototype.getFullProfile = async function() {
  const user = await User.findByPk(this.userId, {
    attributes: { exclude: ['password'] }
  });
  
  return {
    ...this.toJSON(),
    user: user ? user.toJSON() : null
  };
};

// Get athlete's performance summary
Athlete.prototype.getPerformanceSummary = async function() {
  const performances = await Performance.findAll({
    where: { athleteId: this.id },
    order: [['performanceDate', 'DESC']],
    limit: 10
  });
  
  const totalSessions = await Performance.count({
    where: { athleteId: this.id }
  });
  
  return {
    totalSessions,
    recentPerformances: performances,
    lastSessionDate: performances.length > 0 ? performances[0].performanceDate : null
  };
};

// ============================================
// EXPORT ALL MODELS
// ============================================

module.exports = {
  User,
  Athlete,
  Performance,
  Sport
};