const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Athlete = sequelize.define('Athlete', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  dateOfBirth: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  gender: {
    type: DataTypes.ENUM('male', 'female', 'other'),
    allowNull: false
  },
  height: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Height in cm'
  },
  weight: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Weight in kg'
  },
  primarySport: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  skillLevel: {
    type: DataTypes.ENUM('beginner', 'intermediate', 'advanced', 'professional'),
    defaultValue: 'intermediate'
  },
  teamName: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  position: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  coachName: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  coachId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    onDelete: 'SET NULL',
    comment: 'Links athlete to their coach via team code'
  },
  injuryHistory: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Array of past injuries with dates and details'
  },
  medicalNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  emergencyContact: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Emergency contact information (name, phone, relationship)'
  }
}, {
  timestamps: true,
  tableName: 'Athletes'
});

module.exports = Athlete;