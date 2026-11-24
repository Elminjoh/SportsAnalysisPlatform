const request = require('supertest');
const app = require('../../src/server');

// ─── Shared state across tests ───────────────────────────────────────────────
let athleteToken;
let coachToken;
let coachTeamCode;

const timestamp = Date.now(); // unique suffix so re-runs don't clash on email

const athleteUser = {
  email:     `athlete_${timestamp}@test.com`,
  password:  'password123',
  firstName: 'Test',
  lastName:  'Athlete',
  role:      'athlete'
};

const coachUser = {
  email:     `coach_${timestamp}@test.com`,
  password:  'password123',
  firstName: 'Test',
  lastName:  'Coach',
  role:      'coach'
};

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRATION
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/register', () => {

  test('registers a new athlete and returns a JWT token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(athleteUser);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(athleteUser.email);
    expect(res.body.user.role).toBe('athlete');
    expect(res.body.user).not.toHaveProperty('password');

    athleteToken = res.body.token; // save for later tests
  });

  test('registers a coach and returns a teamCode', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(coachUser);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.role).toBe('coach');
    expect(res.body.user.teamCode).toBeDefined();
    expect(res.body.user.teamCode).toHaveLength(8);

    coachToken    = res.body.token;
    coachTeamCode = res.body.user.teamCode;
  });

  test('rejects duplicate email with 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(athleteUser); // same email as first test

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already exists/i);
  });

  test('rejects missing firstName with 400 validation error', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: `x_${timestamp}@test.com`, password: 'password123', lastName: 'X' });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });

  test('rejects invalid email format with 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...athleteUser, email: 'not-an-email' });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('rejects short password (< 6 chars) with 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...athleteUser, email: `short_${timestamp}@test.com`, password: '123' });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('rejects invalid role value with 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...athleteUser, email: `role_${timestamp}@test.com`, role: 'superuser' });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {

  test('logs in with correct credentials and returns a token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: athleteUser.email, password: athleteUser.password });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(athleteUser.email);

    athleteToken = res.body.token; // refresh token
  });

  test('rejects wrong password with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: athleteUser.email, password: 'wrongpassword' });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid/i);
  });

  test('rejects non-existent email with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@nowhere.com', password: 'password123' });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('rejects missing password field with 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: athleteUser.email });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('rejects malformed email with 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'notanemail', password: 'password123' });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/me  (protected route)
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/auth/me', () => {

  test('returns current user when valid token is supplied', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${athleteToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe(athleteUser.email);
    expect(res.body.user).not.toHaveProperty('password');
  });

  test('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('returns 401 when token is malformed', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer this.is.not.a.real.token');

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('returns 401 when Bearer prefix is missing', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', athleteToken); // no "Bearer " prefix

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/logout', () => {

  test('logs out authenticated user successfully', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${athleteToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/logged out/i);
  });

  test('returns 401 when logging out without a token', async () => {
    const res = await request(app).post('/api/auth/logout');

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/auth/updatepassword
// ─────────────────────────────────────────────────────────────────────────────
describe('PUT /api/auth/updatepassword', () => {

  test('updates password when current password is correct', async () => {
    // Re-login to get a fresh token after possible earlier logout
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: athleteUser.email, password: athleteUser.password });
    const freshToken = loginRes.body.token;

    const res = await request(app)
      .put('/api/auth/updatepassword')
      .set('Authorization', `Bearer ${freshToken}`)
      .send({ currentPassword: athleteUser.password, newPassword: 'newpassword123' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();

    // Restore original password so other tests aren't broken
    await request(app)
      .put('/api/auth/updatepassword')
      .set('Authorization', `Bearer ${res.body.token}`)
      .send({ currentPassword: 'newpassword123', newPassword: athleteUser.password });
  });

  test('rejects wrong current password with 401', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: athleteUser.email, password: athleteUser.password });

    const res = await request(app)
      .put('/api/auth/updatepassword')
      .set('Authorization', `Bearer ${loginRes.body.token}`)
      .send({ currentPassword: 'wrongpassword', newPassword: 'newpassword123' });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/roster  (coach only)
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/auth/roster', () => {

  test('returns roster array for authenticated coach', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: coachUser.email, password: coachUser.password });

    const res = await request(app)
      .get('/api/auth/roster')
      .set('Authorization', `Bearer ${loginRes.body.token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(typeof res.body.count).toBe('number');
  });

  test('returns 403 when an athlete tries to access roster', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: athleteUser.email, password: athleteUser.password });

    const res = await request(app)
      .get('/api/auth/roster')
      .set('Authorization', `Bearer ${loginRes.body.token}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/api/auth/roster');
    expect(res.statusCode).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /health', () => {

  test('returns 200 with status OK', async () => {
    const res = await request(app).get('/health');

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('OK');
    expect(res.body.timestamp).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 404 HANDLER
// ─────────────────────────────────────────────────────────────────────────────
describe('Unknown routes', () => {

  test('returns 404 for completely unknown route', async () => {
    const res = await request(app).get('/api/doesnotexist');

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/not found/i);
  });
});