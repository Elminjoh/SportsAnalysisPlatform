const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Performance = sequelize.define('Performance', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  athleteId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Athletes',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  sport: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  performanceDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  metrics: {
    type: DataTypes.JSONB,
    allowNull: false,
    comment: 'Sport-specific performance metrics (e.g., {speed: 11.5, endurance: 2750, technique: 85})'
  },
  sessionType: {
    type: DataTypes.ENUM('training', 'competition', 'assessment'),
    defaultValue: 'training'
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Duration in minutes'
  },
  intensity: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'maximum'),
    allowNull: true
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  conditions: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Weather, temperature, venue conditions, etc.'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  coachFeedback: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  personalRating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 10
    },
    comment: 'Athlete self-rating 1-10'
  },
  injuryOccurred: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  injuryDetails: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  timestamps: true,
  tableName: 'Performances',
  indexes: [
    {
      fields: ['athleteId']
    },
    {
      fields: ['sport']
    },
    {
      fields: ['performanceDate']
    },
    {
      fields: ['sessionType']
    }
  ]
});

module.exports = Performance;