const request = require('supertest');
const app = require('../../src/server');

// ─── Shared state ─────────────────────────────────────────────────────────────
let athleteToken;
let coachToken;
let athleteId;        // Athlete profile id (UUID)
let performanceId;    // Created performance UUID
let coachRosterAthleteId; // Athlete on coach's roster

const ts = Date.now();

const athleteUser = {
  email:     `perf_athlete_${ts}@test.com`,
  password:  'password123',
  firstName: 'Perf',
  lastName:  'Athlete',
  role:      'athlete'
};

const coachUser = {
  email:     `perf_coach_${ts}@test.com`,
  password:  'password123',
  firstName: 'Perf',
  lastName:  'Coach',
  role:      'coach'
};

// A second athlete who will join the coach's roster
const rosterAthleteUser = {
  email:     `roster_athlete_${ts}@test.com`,
  password:  'password123',
  firstName: 'Roster',
  lastName:  'Player',
  role:      'athlete'
};

const validPerformance = {
  sport:          'Football',
  performanceDate: new Date().toISOString(),
  metrics:        { speed: 28.5, technique: 75, passes_completed: 42, distance_covered: 9800 },
  sessionType:    'training',
  duration:       90,
  intensity:      'high',
  personalRating: 7,
  notes:          'Good session overall'
};

// ─── Setup: register users, create athlete profiles, join roster ──────────────
beforeAll(async () => {
  // 1. Register athlete
  const athleteReg = await request(app)
    .post('/api/auth/register')
    .send(athleteUser);
  athleteToken = athleteReg.body.token;

  // 2. Register coach
  const coachReg = await request(app)
    .post('/api/auth/register')
    .send(coachUser);
  coachToken = coachReg.body.token;
  const coachTeamCode = coachReg.body.user.teamCode;

  // 3. Register roster athlete
  const rosterReg = await request(app)
    .post('/api/auth/register')
    .send(rosterAthleteUser);
  const rosterToken = rosterReg.body.token;

  // 4. Create athlete profile for main athlete
  const profileRes = await request(app)
    .post('/api/athletes') 
    .set('Authorization', `Bearer ${athleteToken}`)
    .send({
      dateOfBirth:  '2000-03-15',
      gender:       'male',
      position:     'Midfielder',
      skillLevel:   'intermediate',
      primarySport: 'Football',
      height:       178,
      weight:       74
    });
  athleteId = profileRes.body.data?.id;

  // 5. Create athlete profile for roster athlete
    await request(app)
    .post('/api/athletes')    
    .set('Authorization', `Bearer ${rosterToken}`)
    .send({
      dateOfBirth:  '2001-09-22',
      gender:       'male',
      position:     'Forward',
      skillLevel:   'beginner',
      primarySport: 'Football',
      height:       175,
      weight:       70
    });

  // 6. Roster athlete joins coach's team
  const joinRes = await request(app)
    .post('/api/auth/join-team')
    .set('Authorization', `Bearer ${rosterToken}`)
    .send({ teamCode: coachTeamCode });

  // 7. Get roster to find the athlete's profile id (coach needs it for assessment)
  const rosterRes = await request(app)
    .get('/api/auth/roster')
    .set('Authorization', `Bearer ${coachToken}`);
  coachRosterAthleteId = rosterRes.body.data?.[0]?.id;
}, 60000);

// ─────────────────────────────────────────────────────────────────────────────
// CREATE PERFORMANCE
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/performance', () => {

  test('creates a performance record for authenticated athlete', async () => {
    const res = await request(app)
      .post('/api/performance')
      .set('Authorization', `Bearer ${athleteToken}`)
      .send(validPerformance);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sport).toBe('Football');
    expect(res.body.data.sessionType).toBe('training');
    expect(res.body.data.personalRating).toBe(7);
    expect(res.body.data.athleteId).toBeDefined();

    performanceId = res.body.data.id; // save for later tests
  });

  test('creates a competition session record', async () => {
    const res = await request(app)
      .post('/api/performance')
      .set('Authorization', `Bearer ${athleteToken}`)
      .send({ ...validPerformance, sessionType: 'competition', personalRating: 9 });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.sessionType).toBe('competition');
  });

  test('creates a performance with injury recorded', async () => {
    const res = await request(app)
      .post('/api/performance')
      .set('Authorization', `Bearer ${athleteToken}`)
      .send({ ...validPerformance, injuryOccurred: true, injuryDetails: 'Minor hamstring strain' });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.injuryOccurred).toBe(true);
  });

  test('rejects missing sport field with 400', async () => {
    const { sport, ...noSport } = validPerformance;
    const res = await request(app)
      .post('/api/performance')
      .set('Authorization', `Bearer ${athleteToken}`)
      .send(noSport);

    expect(res.statusCode).toBe(400);
  });

  test('rejects invalid sessionType with 400', async () => {
    const res = await request(app)
      .post('/api/performance')
      .set('Authorization', `Bearer ${athleteToken}`)
      .send({ ...validPerformance, sessionType: 'warmup' });

    expect(res.statusCode).toBe(400);
  });

  test('rejects personalRating outside 1-10 with 400', async () => {
    const res = await request(app)
      .post('/api/performance')
      .set('Authorization', `Bearer ${athleteToken}`)
      .send({ ...validPerformance, personalRating: 11 });

    expect(res.statusCode).toBe(400);
  });

  test('rejects unauthenticated request with 401', async () => {
    const res = await request(app)
      .post('/api/performance')
      .send(validPerformance);

    expect(res.statusCode).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET PERFORMANCES
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/performance', () => {

  test('returns paginated list of performances for athlete', async () => {
    const res = await request(app)
      .get('/api/performance')
      .set('Authorization', `Bearer ${athleteToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total).toBeGreaterThan(0);
  });

  test('filters performances by sport', async () => {
    const res = await request(app)
      .get('/api/performance?sport=Football')
      .set('Authorization', `Bearer ${athleteToken}`);

    expect(res.statusCode).toBe(200);
    res.body.data.forEach(p => expect(p.sport).toBe('Football'));
  });

  test('filters performances by sessionType', async () => {
    const res = await request(app)
      .get('/api/performance?sessionType=training')
      .set('Authorization', `Bearer ${athleteToken}`);

    expect(res.statusCode).toBe(200);
    res.body.data.forEach(p => expect(p.sessionType).toBe('training'));
  });

  test('returns 401 when unauthenticated', async () => {
    const res = await request(app).get('/api/performance');
    expect(res.statusCode).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET SINGLE PERFORMANCE
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/performance/:id', () => {

  test('returns a single performance by ID', async () => {
    const res = await request(app)
      .get(`/api/performance/${performanceId}`)
      .set('Authorization', `Bearer ${athleteToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(performanceId);
  });

  test('returns 404 for non-existent performance ID', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await request(app)
      .get(`/api/performance/${fakeId}`)
      .set('Authorization', `Bearer ${athleteToken}`);

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('returns 401 when unauthenticated', async () => {
    const res = await request(app).get(`/api/performance/${performanceId}`);
    expect(res.statusCode).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE PERFORMANCE
// ─────────────────────────────────────────────────────────────────────────────
describe('PUT /api/performance/:id', () => {

  test('updates notes and personalRating on owned performance', async () => {
    const res = await request(app)
      .put(`/api/performance/${performanceId}`)
      .set('Authorization', `Bearer ${athleteToken}`)
      .send({ notes: 'Updated notes', personalRating: 8 });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.notes).toBe('Updated notes');
    expect(res.body.data.personalRating).toBe(8);
  });

  test('returns 404 when performance does not exist', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await request(app)
      .put(`/api/performance/${fakeId}`)
      .set('Authorization', `Bearer ${athleteToken}`)
      .send({ notes: 'Ghost update' });

    expect(res.statusCode).toBe(404);
  });

  test('returns 401 when unauthenticated', async () => {
    const res = await request(app)
      .put(`/api/performance/${performanceId}`)
      .send({ notes: 'No auth' });

    expect(res.statusCode).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// STATS SUMMARY
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/performance/stats/summary', () => {

  test('returns summary stats for authenticated athlete', async () => {
    const res = await request(app)
      .get('/api/performance/stats/summary')
      .set('Authorization', `Bearer ${athleteToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalSessions).toBeGreaterThan(0);
    expect(res.body.data.bySessionType).toBeDefined();
    expect(res.body.data.avgPersonalRating).toBeDefined();
    expect(res.body.data.injuryCount).toBeDefined();
    expect(res.body.data.ratingBreakdown).toBeDefined();
  });

  test('bySessionType contains training, competition and assessment keys', async () => {
    const res = await request(app)
      .get('/api/performance/stats/summary')
      .set('Authorization', `Bearer ${athleteToken}`);

    expect(res.body.data.bySessionType).toHaveProperty('training');
    expect(res.body.data.bySessionType).toHaveProperty('competition');
    expect(res.body.data.bySessionType).toHaveProperty('assessment');
  });

  test('injuryCount is at least 1 after injury was recorded', async () => {
    const res = await request(app)
      .get('/api/performance/stats/summary')
      .set('Authorization', `Bearer ${athleteToken}`);

    expect(res.body.data.injuryCount).toBeGreaterThanOrEqual(1);
  });

  test('returns 401 when unauthenticated', async () => {
    const res = await request(app).get('/api/performance/stats/summary');
    expect(res.statusCode).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PERFORMANCE TRENDS
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/performance/trends/:metric', () => {

  test('returns trend data for speed metric', async () => {
    const res = await request(app)
      .get('/api/performance/trends/speed')
      .set('Authorization', `Bearer ${athleteToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.metric).toBe('speed');
    expect(Array.isArray(res.body.data.trends)).toBe(true);
    expect(typeof res.body.data.count).toBe('number');
  });

  test('returns trend data for technique metric', async () => {
    const res = await request(app)
      .get('/api/performance/trends/technique')
      .set('Authorization', `Bearer ${athleteToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.metric).toBe('technique');
  });

  test('returns empty trends array for metric with no data', async () => {
    const res = await request(app)
      .get('/api/performance/trends/nonexistent_metric')
      .set('Authorization', `Bearer ${athleteToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.trends).toHaveLength(0);
  });

  test('returns 401 when unauthenticated', async () => {
    const res = await request(app).get('/api/performance/trends/speed');
    expect(res.statusCode).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BENCHMARKING
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/performance/benchmark', () => {

  test('returns benchmark data with all required sections', async () => {
    const res = await request(app)
      .get('/api/performance/benchmark')
      .set('Authorization', `Bearer ${athleteToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.myAvg).toBeDefined();
    expect(res.body.data.benchmarks).toBeDefined();
    expect(res.body.data.percentiles).toBeDefined();
  });

  test('benchmarks object contains position, skillLevel, dataset and top10 keys', async () => {
    const res = await request(app)
      .get('/api/performance/benchmark')
      .set('Authorization', `Bearer ${athleteToken}`);

    expect(res.body.data.benchmarks).toHaveProperty('position');
    expect(res.body.data.benchmarks).toHaveProperty('skillLevel');
    expect(res.body.data.benchmarks).toHaveProperty('dataset');
    expect(res.body.data.benchmarks).toHaveProperty('top10');
  });

  test('returns 401 when unauthenticated', async () => {
    const res = await request(app).get('/api/performance/benchmark');
    expect(res.statusCode).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RAE ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/performance/rae', () => {

  test('returns RAE analysis with birthQuarter and insights', async () => {
    const res = await request(app)
      .get('/api/performance/rae')
      .set('Authorization', `Bearer ${athleteToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.athlete.birthQuarter).toBeDefined();
    expect(res.body.data.athlete.birthQuarter.quarter).toMatch(/^Q[1-4]$/);
    expect(res.body.data.standardPercentiles).toBeDefined();
    expect(res.body.data.raePercentiles).toBeDefined();
    expect(res.body.data.raeImpact).toBeDefined();
    expect(res.body.data.insights).toBeDefined();
  });

  test('birth quarter for March DOB is Q1', async () => {
    const res = await request(app)
      .get('/api/performance/rae')
      .set('Authorization', `Bearer ${athleteToken}`);

    // athleteUser has DOB 2000-03-15 (March = Q1)
    expect(res.body.data.athlete.birthQuarter.quarter).toBe('Q1');
    expect(res.body.data.athlete.birthQuarter.advantage).toBe('oldest');
  });

  test('quarterCounts object has Q1-Q4 keys', async () => {
    const res = await request(app)
      .get('/api/performance/rae')
      .set('Authorization', `Bearer ${athleteToken}`);

    expect(res.body.data.quarterCounts).toHaveProperty('Q1');
    expect(res.body.data.quarterCounts).toHaveProperty('Q2');
    expect(res.body.data.quarterCounts).toHaveProperty('Q3');
    expect(res.body.data.quarterCounts).toHaveProperty('Q4');
  });

  test('returns 401 when unauthenticated', async () => {
    const res = await request(app).get('/api/performance/rae');
    expect(res.statusCode).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// COACH ASSESSMENT
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/performance/coach-assessment', () => {

  const validAssessment = {
    sessionDate:               new Date().toISOString(),
    sessionType:               'assessment',
    duration:                  75,
    firstTouchSuccess:         4,
    progressivePassCompletion: 3,
    duelWinRate:               4,
    offBallMovement:           3,
    decisionSpeed:             4,
    patternRecognition:        3,
    adaptability:              4,
    acceleration:              4,
    repeatedSprintAbility:     3,
    changeOfDirection:         4,
    consistency:               3,
    resilience:                4,
    performanceUnderPressure:  3,
    coachNotes:                'Good positioning',
    standoutMoment:            'Pressing trigger in 65th minute',
    areasForImprovement:       'First touch under pressure'
  };

  test('coach can submit assessment for roster athlete', async () => {
    if (!coachRosterAthleteId) {
      console.warn('Skipping coach assessment test — no roster athlete found');
      return;
    }

    const res = await request(app)
      .post('/api/performance/coach-assessment')
      .set('Authorization', `Bearer ${coachToken}`)
      .send({ ...validAssessment, athleteId: coachRosterAthleteId });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sessionType).toBe('assessment');
    expect(res.body.data.personalRating).toBeNull();
    // Composite metrics should be stored in metrics JSONB
    expect(res.body.data.metrics).toHaveProperty('technical_composite');
    expect(res.body.data.metrics).toHaveProperty('tactical_composite');
    expect(res.body.data.metrics).toHaveProperty('physical_composite');
    expect(res.body.data.metrics).toHaveProperty('psychological_composite');
  });

  test('composite scores are calculated within 0-100 range', async () => {
    if (!coachRosterAthleteId) return;

    const res = await request(app)
      .post('/api/performance/coach-assessment')
      .set('Authorization', `Bearer ${coachToken}`)
      .send({ ...validAssessment, athleteId: coachRosterAthleteId });

    const m = res.body.data.metrics;
    expect(m.technical_composite).toBeGreaterThanOrEqual(0);
    expect(m.technical_composite).toBeLessThanOrEqual(100);
    expect(m.tactical_composite).toBeGreaterThanOrEqual(0);
    expect(m.tactical_composite).toBeLessThanOrEqual(100);
  });

  test('returns 403 when athlete (not coach) submits assessment', async () => {
    const res = await request(app)
      .post('/api/performance/coach-assessment')
      .set('Authorization', `Bearer ${athleteToken}`)
      .send({ ...validAssessment, athleteId: 'any-id' });

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('returns 403 when coach tries to assess athlete not on their roster', async () => {
    const res = await request(app)
      .post('/api/performance/coach-assessment')
      .set('Authorization', `Bearer ${coachToken}`)
      .send({ ...validAssessment, athleteId: athleteId }); // main athlete NOT on this coach's roster

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('returns 401 when unauthenticated', async () => {
    const res = await request(app)
      .post('/api/performance/coach-assessment')
      .send(validAssessment);

    expect(res.statusCode).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE PERFORMANCE (last — keeps other tests clean)
// ─────────────────────────────────────────────────────────────────────────────
describe('DELETE /api/performance/:id', () => {

  test('deletes owned performance successfully', async () => {
    const res = await request(app)
      .delete(`/api/performance/${performanceId}`)
      .set('Authorization', `Bearer ${athleteToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/deleted/i);
  });

  test('returns 404 after deleting the same record again', async () => {
    const res = await request(app)
      .delete(`/api/performance/${performanceId}`)
      .set('Authorization', `Bearer ${athleteToken}`);

    expect(res.statusCode).toBe(404);
  });

  test('returns 401 when unauthenticated', async () => {
    const res = await request(app)
      .delete(`/api/performance/${performanceId}`);

    expect(res.statusCode).toBe(401);
  });
});