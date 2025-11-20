// Test setup file
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Mock uuid module
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123')
}));

// Set test timeout
jest.setTimeout(10000);

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};

// Global test utilities
export const cleanupDatabase = async () => {
  // Add cleanup logic if needed
};

beforeAll(async () => {
  // Setup that runs once before all tests
});

afterAll(async () => {
  // Cleanup that runs once after all tests
  await cleanupDatabase();
});
