// backend/scripts/seedSyntheticData.js
// Run with: node scripts/seedSyntheticData.js
// Safe to run multiple times — checks for existing synthetic users first

require('dotenv').config({ path: '../../.env' });
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');
const { User, Athlete, Performance } = require('../models');

// ── Config ────────────────────────────────────────────────────────────────────
const TOTAL_ATHLETES   = 200;
const SYNTHETIC_COACHES = 4; // extra coaches beyond your real one
const YOUR_COACH_EMAIL  = 'olu@gmail.com'; // ← change to your actual coach email

// ── Data pools ────────────────────────────────────────────────────────────────
const POSITIONS = [
  'Goalkeeper', 'Centre-Back', 'Full-Back',
  'Defensive-Midfielder', 'Central-Midfielder', 'Attacking-Midfielder',
  'Winger', 'Centre-Forward'
];

const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced', 'professional'];

const TEAM_NAMES = [
  'Nottingham Rangers', 'Derby City FC', 'Leicester Athletic',
  'Sheffield United', 'Coventry Rovers', 'Birmingham Lions',
  'Stoke City Juniors', 'Wolverhampton FC', 'Burton Albion',
  'Mansfield Town', 'Chesterfield FC', 'Lincoln City'
];

const FIRST_NAMES_M = [
  'James', 'Oliver', 'Harry', 'George', 'Noah', 'Charlie', 'Jack', 'Theo',
  'Alfie', 'Freddie', 'Archie', 'Oscar', 'Henry', 'Leo', 'William', 'Mason',
  'Ethan', 'Logan', 'Lucas', 'Isaac', 'Mohammed', 'Adam', 'Rayan', 'Kai',
  'Liam', 'Sebastian', 'Max', 'Dylan', 'Tyler', 'Jamie'
];

const FIRST_NAMES_F = [
  'Olivia', 'Amelia', 'Isla', 'Ava', 'Mia', 'Isabella', 'Sophia', 'Grace',
  'Lily', 'Freya', 'Emily', 'Poppy', 'Ella', 'Evie', 'Maya', 'Hannah',
  'Jessica', 'Chloe', 'Charlotte', 'Layla', 'Zara', 'Sofia', 'Ruby', 'Aria',
  'Scarlett', 'Imogen', 'Alice', 'Florence', 'Millie', 'Sienna'
];

const LAST_NAMES = [
  'Smith', 'Jones', 'Williams', 'Taylor', 'Brown', 'Davies', 'Evans',
  'Wilson', 'Thomas', 'Roberts', 'Johnson', 'Walker', 'Wright', 'Robinson',
  'Thompson', 'White', 'Hughes', 'Edwards', 'Green', 'Hall', 'Lewis',
  'Harris', 'Clarke', 'Patel', 'Jackson', 'Wood', 'Turner', 'Martin',
  'Cooper', 'Hill', 'Ward', 'Morris', 'Moore', 'Clark', 'Lee', 'King',
  'Baker', 'Harrison', 'Morgan', 'Allen', 'James', 'Scott', 'Phillips'
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const rand   = (min, max)  => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.floor(rand(min, max + 1));
const pick   = (arr)       => arr[Math.floor(Math.random() * arr.length)];
const clamp  = (v, min, max) => Math.min(Math.max(v, min), max);

// Birth quarter distribution simulating RAE bias:
// Q1 overrepresented (35%), Q4 underrepresented (15%)
const getRandomDOB = () => {
  const r = Math.random();
  let month;
  if      (r < 0.35) month = randInt(1, 3);   // Q1 Jan-Mar
  else if (r < 0.62) month = randInt(4, 6);   // Q2 Apr-Jun
  else if (r < 0.85) month = randInt(7, 9);   // Q3 Jul-Sep
  else               month = randInt(10, 12); // Q4 Oct-Dec

  const year = randInt(1995, 2007); // ages ~18-30
  const day  = randInt(1, 28);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

// Position-specific metric base ranges (0-100 scale)
// Higher skill level multiplies these upward
const POSITION_METRIC_BASES = {
  'Goalkeeper':           { technique: [55,75], speed: [45,65], passes_completed: [30,55], sprint_count: [20,40], distance_covered: [40,60], pass_accuracy: [60,82], goals: [0,3]  },
  'Centre-Back':          { technique: [58,78], speed: [50,70], passes_completed: [55,78], sprint_count: [35,60], distance_covered: [50,72], pass_accuracy: [62,84], goals: [2,8]  },
  'Full-Back':            { technique: [60,78], speed: [62,82], passes_completed: [55,75], sprint_count: [60,82], distance_covered: [65,85], pass_accuracy: [60,80], goals: [3,10] },
  'Defensive-Midfielder': { technique: [62,80], speed: [55,74], passes_completed: [68,88], sprint_count: [55,75], distance_covered: [62,80], pass_accuracy: [66,86], goals: [3,12] },
  'Central-Midfielder':   { technique: [65,82], speed: [58,76], passes_completed: [70,90], sprint_count: [58,78], distance_covered: [65,82], pass_accuracy: [65,85], goals: [5,18] },
  'Attacking-Midfielder': { technique: [68,85], speed: [60,80], passes_completed: [65,85], sprint_count: [55,75], distance_covered: [60,78], pass_accuracy: [64,84], goals: [8,22] },
  'Winger':               { technique: [65,84], speed: [70,90], passes_completed: [55,75], sprint_count: [68,88], distance_covered: [68,86], pass_accuracy: [58,78], goals: [6,20] },
  'Centre-Forward':       { technique: [63,82], speed: [65,85], passes_completed: [48,68], sprint_count: [58,78], distance_covered: [58,76], pass_accuracy: [56,76], goals: [10,30] },
};

const SKILL_MULTIPLIERS = {
  beginner:     0.65,
  intermediate: 0.80,
  advanced:     0.92,
  professional: 1.00,
};

// RAE bias: Q1 athletes get a slight performance boost (simulating selection bias)
const getRAEMultiplier = (dob) => {
  const month = new Date(dob).getMonth() + 1;
  if (month <= 3)  return rand(1.03, 1.08); // Q1 advantage
  if (month <= 6)  return rand(1.00, 1.04); // Q2 slight advantage
  if (month <= 9)  return rand(0.97, 1.02); // Q3 neutral
  return               rand(0.93, 0.99);   // Q4 slight disadvantage
};

const generateMetrics = (position, skillLevel, dob, sessionType) => {
  const bases  = POSITION_METRIC_BASES[position] || POSITION_METRIC_BASES['Central-Midfielder'];
  const skillM = SKILL_MULTIPLIERS[skillLevel] || 0.80;
  const raeM   = getRAEMultiplier(dob);
  const noise  = () => rand(0.88, 1.12); // session-to-session variation

  const base = (key) => {
    const [min, max] = bases[key];
    return clamp(rand(min, max) * skillM * raeM * noise(), 0, 100);
  };

  if (sessionType === 'assessment') {
    // Coach assessment — returns composite-style metrics
    const tech = base('technique');
    const spd  = base('speed');
    const pass = base('passes_completed');
    const acc  = base('pass_accuracy');

    // Scale to 1-5 then back to composite (matching submitCoachAssessment logic)
    const to5  = (v) => clamp(Math.round((v / 100) * 5), 1, 5);
    const firstTouchSuccess         = to5(tech);
    const progressivePassCompletion = to5(pass);
    const duelWinRate               = to5(clamp(tech * rand(0.85, 1.15), 0, 100));
    const offBallMovement           = to5(clamp(tech * rand(0.80, 1.20), 0, 100));
    const decisionSpeed             = to5(clamp(tech * rand(0.90, 1.10), 0, 100));
    const patternRecognition        = to5(clamp(tech * rand(0.85, 1.15), 0, 100));
    const adaptability              = to5(clamp(tech * rand(0.88, 1.12), 0, 100));
    const acceleration              = to5(spd);
    const repeatedSprintAbility     = to5(clamp(spd * rand(0.85, 1.15), 0, 100));
    const changeOfDirection         = to5(clamp(spd * rand(0.80, 1.20), 0, 100));
    const consistency               = to5(clamp(tech * rand(0.85, 1.15), 0, 100));
    const resilience                = to5(clamp(tech * rand(0.88, 1.12), 0, 100));
    const performanceUnderPressure  = to5(clamp(tech * rand(0.82, 1.18), 0, 100));

    return {
      technique:               parseFloat(((duelWinRate / 5) * 100).toFixed(1)),
      first_touch:             parseFloat(((firstTouchSuccess / 5) * 100).toFixed(1)),
      progressive_passing:     parseFloat(((progressivePassCompletion / 5) * 100).toFixed(1)),
      off_ball_movement:       parseFloat(((offBallMovement / 5) * 100).toFixed(1)),
      decision_speed:          parseFloat(((decisionSpeed / 5) * 100).toFixed(1)),
      pattern_recognition:     parseFloat(((patternRecognition / 5) * 100).toFixed(1)),
      adaptability:            parseFloat(((adaptability / 5) * 100).toFixed(1)),
      acceleration:            parseFloat(((acceleration / 5) * 100).toFixed(1)),
      repeated_sprint:         parseFloat(((repeatedSprintAbility / 5) * 100).toFixed(1)),
      change_of_direction:     parseFloat(((changeOfDirection / 5) * 100).toFixed(1)),
      consistency:             parseFloat(((consistency / 5) * 100).toFixed(1)),
      resilience:              parseFloat(((resilience / 5) * 100).toFixed(1)),
      pressure_performance:    parseFloat(((performanceUnderPressure / 5) * 100).toFixed(1)),
      technical_composite:     parseFloat((((firstTouchSuccess + progressivePassCompletion + duelWinRate + offBallMovement) / 20) * 100).toFixed(1)),
      tactical_composite:      parseFloat((((decisionSpeed + patternRecognition + adaptability) / 15) * 100).toFixed(1)),
      physical_composite:      parseFloat((((acceleration + repeatedSprintAbility + changeOfDirection) / 15) * 100).toFixed(1)),
      psychological_composite: parseFloat((((consistency + resilience + performanceUnderPressure) / 15) * 100).toFixed(1)),
    };
  }

  // Regular training/competition session
  return {
    technique:        parseFloat(base('technique').toFixed(1)),
    speed:            parseFloat(base('speed').toFixed(1)),
    passes_completed: parseFloat(clamp(base('passes_completed') * rand(0.3, 1.2), 0, 100).toFixed(1)),
    goals:            parseFloat(clamp(base('goals') * rand(0, 1.5), 0, 50).toFixed(1)),
    sprint_count:     parseFloat(clamp(base('sprint_count') * rand(0.5, 1.5), 0, 100).toFixed(1)),
    distance_covered: parseFloat(clamp(base('distance_covered') * rand(0.8, 1.2), 0, 100).toFixed(1)),
    pass_accuracy:    parseFloat(base('pass_accuracy').toFixed(1)),
  };
};

const generatePerformances = (athleteId, position, skillLevel, dob, sport) => {
  const count = randInt(6, 15);
  const perfs = [];

  for (let i = 0; i < count; i++) {
    const daysAgo = randInt(i * 10, i * 10 + 20);
    const date    = new Date();
    date.setDate(date.getDate() - daysAgo);

    // ~20% chance of being an assessment session
    const sessionType = Math.random() < 0.20 ? 'assessment' : (Math.random() < 0.3 ? 'competition' : 'training');

    perfs.push({
      athleteId,
      sport,
      performanceDate: date,
      metrics:         generateMetrics(position, skillLevel, dob, sessionType),
      sessionType,
      intensity:       pick(['low', 'medium', 'high', 'maximum']),
      duration:        randInt(45, 120),
      personalRating:  sessionType === 'assessment' ? null : randInt(5, 10),
      injuryOccurred:  Math.random() < 0.05,
      notes:           null,
      coachFeedback:   null,
    });
  }

  return perfs;
};

// ── Main seed function ────────────────────────────────────────────────────────
async function seed() {
  await sequelize.authenticate();
  console.log('✅ Database connected\n');

  // Check for existing synthetic data
  const { Op } = require('sequelize');
  const existing = await User.count({ where: { email: { [Op.like]: '%synthetic%' } } });
  if (existing > 0) {
    console.log(`⚠️  Found ${existing} existing synthetic users. Skipping — delete them first if you want a fresh seed.`);
    process.exit(0);
  }

  // ── Step 1: Find your real coach ─────────────────────────────────────────
  let realCoach = await User.findOne({ where: { email: YOUR_COACH_EMAIL } });
  if (!realCoach) {
    console.log(`⚠️  Coach email "${YOUR_COACH_EMAIL}" not found. Athletes won't be linked to your real account.`);
    console.log('   Update YOUR_COACH_EMAIL at the top of this script and re-run.\n');
  } else {
    console.log(`✅ Found real coach: ${realCoach.firstName} ${realCoach.lastName} (${realCoach.teamCode})`);
  }

  // ── Step 2: Create synthetic coaches ─────────────────────────────────────
  console.log(`\n📋 Creating ${SYNTHETIC_COACHES} synthetic coaches...`);
  const syntheticCoaches = [];
  const salt = await bcrypt.genSalt(10);
  const hashedPw = await bcrypt.hash('Password123!', salt);

  const generateTeamCode = async () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code, exists;
    do {
      code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      exists = await User.findOne({ where: { teamCode: code } });
    } while (exists);
    return code;
  };

  for (let i = 0; i < SYNTHETIC_COACHES; i++) {
    const gender    = Math.random() < 0.6 ? 'male' : 'female';
    const firstName = pick(gender === 'male' ? FIRST_NAMES_M : FIRST_NAMES_F);
    const lastName  = pick(LAST_NAMES);
    const teamCode  = await generateTeamCode();

    const coach = await User.create({
      email:     `synthetic.coach.${i + 1}@synthetic.com`,
      password:  hashedPw,
      firstName, lastName,
      role:      'coach',
      teamCode,
      isActive:  true,
    });
    syntheticCoaches.push(coach);
    console.log(`   Coach ${i + 1}: ${firstName} ${lastName} (${teamCode})`);
  }

  // All coaches available for linking (real + synthetic)
  const allCoaches = [...(realCoach ? [realCoach] : []), ...syntheticCoaches];

  // ── Step 3: Create 200 synthetic athletes ────────────────────────────────
  console.log(`\n👥 Creating ${TOTAL_ATHLETES} synthetic athletes...`);
  let created = 0;

  for (let i = 0; i < TOTAL_ATHLETES; i++) {
    const gender     = Math.random() < 0.72 ? 'male' : 'female';
    const firstName  = pick(gender === 'male' ? FIRST_NAMES_M : FIRST_NAMES_F);
    const lastName   = pick(LAST_NAMES);
    const position   = pick(POSITIONS);
    const skillLevel = pick(SKILL_LEVELS);
    const dob        = getRandomDOB();
    const teamName   = pick(TEAM_NAMES);
    const sport      = 'Football';

    // 60% of athletes linked to a coach (mix of real and synthetic)
    const linkedCoach  = Math.random() < 0.60 ? pick(allCoaches) : null;

    try {
      // Create user
      const user = await User.create({
        email:     `synthetic.athlete.${i + 1}@synthetic.com`,
        password:  hashedPw,
        firstName, lastName,
        role:      'athlete',
        isActive:  true,
      });

      // Create athlete profile
      const athlete = await Athlete.create({
        userId:     user.id,
        dateOfBirth: dob,
        gender,
        height:     parseFloat(rand(160, 195).toFixed(1)),
        weight:     parseFloat(rand(58, 95).toFixed(1)),
        primarySport: sport,
        skillLevel,
        position,
        teamName,
        coachId:    linkedCoach?.id || null,
        coachName:  linkedCoach ? `${linkedCoach.firstName} ${linkedCoach.lastName}` : null,
      });

      // Generate performances
      const perfs = generatePerformances(athlete.id, position, skillLevel, dob, sport);
      await Performance.bulkCreate(perfs);

      created++;
      if (created % 25 === 0) console.log(`   ${created}/${TOTAL_ATHLETES} athletes created...`);
    } catch (err) {
      console.error(`   ❌ Failed to create athlete ${i + 1}:`, err.message);
    }
  }

  console.log(`\n✅ Done! Created:`);
  console.log(`   ${SYNTHETIC_COACHES} synthetic coaches`);
  console.log(`   ${created} synthetic athletes`);
  console.log(`   ~${Math.round(created * 10)} performance records`);
  if (realCoach) console.log(`   Some athletes linked to your real coach account (${realCoach.teamCode})`);
  console.log('\n🚀 Your benchmarking and RAE analysis should now show meaningful distributions.');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});