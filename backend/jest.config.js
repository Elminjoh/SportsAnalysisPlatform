module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/tests/unit/**/*.test.js',
    '**/tests/integration/**/*.test.js'
  ],
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  testTimeout: 30000,
  verbose: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/seeders/**',
    '!src/config/seedSports.js'
  ]
};