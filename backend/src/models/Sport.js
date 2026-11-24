const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Sport = sequelize.define('Sport', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  keyMetrics: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
    comment: 'Sport-specific performance metrics (e.g., speed, endurance, technique)'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  timestamps: true,
  tableName: 'Sports'
});

module.exports = Sport;