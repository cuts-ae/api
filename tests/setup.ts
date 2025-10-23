import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Global test setup
beforeAll(() => {
  console.log('=== Test Suite Starting ===');
});

afterAll(() => {
  console.log('=== Test Suite Complete ===');
});

// Set test timeout
jest.setTimeout(30000);
