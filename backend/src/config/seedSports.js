const { Sport } = require('../models');

const sportsData = [
  {
    name: 'Football',
    category: 'Team Sport',
    keyMetrics: {
      physical: ['sprint_speed_100m', 'endurance_12min', 'agility', 'vertical_jump'],
      technical: ['passing_accuracy', 'dribbling_score', 'shooting_accuracy', 'first_touch'],
      tactical: ['decision_making', 'positioning', 'vision'],
      mental: ['concentration', 'composure']
    },
    description: 'Association Football (Soccer)'
  },
  {
    name: 'Athletics',
    category: 'Individual Sport',
    keyMetrics: {
      sprint: ['100m_time', '200m_time', 'reaction_time'],
      distance: ['1500m_time', '5000m_time', 'marathon_time'],
      jumps: ['long_jump_distance', 'high_jump_height', 'triple_jump_distance'],
      throws: ['shot_put_distance', 'javelin_distance', 'discus_distance']
    },
    description: 'Track and Field Events'
  },
  {
    name: 'Basketball',
    category: 'Team Sport',
    keyMetrics: {
      shooting: ['field_goal_percentage', 'three_point_percentage', 'free_throw_percentage'],
      physical: ['vertical_jump', 'sprint_speed', 'agility'],
      game: ['points_per_game', 'assists', 'rebounds', 'steals', 'blocks'],
      advanced: ['player_efficiency_rating', 'true_shooting_percentage']
    },
    description: 'Basketball'
  }
];

const seedSports = async () => {
  try {
    console.log('Seeding sports data...');
    
    for (const sportData of sportsData) {
      const [sport, created] = await Sport.findOrCreate({
        where: { name: sportData.name },
        defaults: sportData
      });
      
      if (created) {
        console.log(`✓ Created sport: ${sportData.name}`);
      } else {
        console.log(`- Sport already exists: ${sportData.name}`);
      }
    }
    
    console.log('✓ Sports seeding completed');
    return true;
  } catch (error) {
    console.error('Error seeding sports:', error);
    return false;
  }
};

module.exports = seedSports;