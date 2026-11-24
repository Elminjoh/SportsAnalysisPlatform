const { sequelize } = require('./src/config/database');
const seedSports = require('./src/config/seedSports');

module.exports = async () => {
  await sequelize.sync({ alter: true });
  await seedSports();
};