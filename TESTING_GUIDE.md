# Testing Guide

## Quick Start

```bash
# Install dependencies (if not already installed)
npm install

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e
```

## Database Setup

### 1. Create Test Database

```bash
# Using psql
psql -U postgres
```

```sql
-- Create test database
CREATE DATABASE cuts_ae_test;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE cuts_ae_test TO postgres;
```

### 2. Apply Schema

```bash
# Apply the same schema as production
psql -U postgres -d cuts_ae_test -f database/schema.sql
```

### 3. Configure Environment

Update `/Users/sour/Projects/cuts.ae/api/.env.test`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cuts_ae_test
DB_USER=postgres
DB_PASSWORD=your_password_here
JWT_SECRET=test-secret-key-for-testing-only-do-not-use-in-production
PORT=45002
NODE_ENV=test
FRONTEND_URL=http://localhost:45001
```

## Running Tests

### All Tests with Coverage
```bash
npm test
```

Output:
```
Test Suites: 10 total
Tests:       113 total
Coverage:    Detailed coverage report
```

### Watch Mode (Development)
```bash
npm run test:watch
```

Re-runs tests when files change. Useful during development.

### Specific Test Types

```bash
# Unit tests only (middleware, utilities)
npm run test:unit

# Integration tests only (API endpoints)
npm run test:integration

# E2E tests only (complete workflows)
npm run test:e2e
```

### Run Specific Test File

```bash
# Run single test file
npx jest src/__tests__/integration/auth.test.ts

# Run with coverage
npx jest src/__tests__/integration/auth.test.ts --coverage
```

### Run Tests Matching Pattern

```bash
# Run all authentication tests
npx jest --testNamePattern="Authentication"

# Run all tests with "login" in the name
npx jest --testNamePattern="login"
```

## Test Structure

```
api/
├── src/
│   └── __tests__/
│       ├── setup.ts                    # Global test configuration
│       ├── fixtures/
│       │   └── users.ts                # Reusable test data
│       ├── unit/
│       │   ├── middleware.test.ts      # 89 tests
│       │   └── nutrition.test.ts       # 62 tests
│       ├── integration/
│       │   ├── auth.test.ts            # 23 tests
│       │   ├── restaurant.test.ts      # 75 tests
│       │   ├── menu.test.ts            # 124 tests
│       │   └── order.test.ts           # 121 tests
│       └── e2e/
│           └── complete-workflow.test.ts # 94 tests
├── jest.config.js                       # Jest configuration
└── .env.test                            # Test environment variables
```

## What Gets Tested

### Authentication (23 tests)
- User registration (customer, restaurant owner)
- Login validation
- JWT token generation and validation
- Password security
- Input validation

### Restaurant Management (75 tests)
- CRUD operations
- Authorization checks
- Public vs. protected endpoints
- Analytics access control

### Menu Items (124 tests)
- Menu item creation/updates
- Nutrition information
- Item variants
- Availability toggling

### Orders (121 tests)
- Order creation and validation
- Status updates
- Order cancellation
- Price calculations
- Authorization rules

### Middleware (89 tests)
- JWT authentication
- Role-based authorization
- Request validation (Zod)
- Error handling

### Utilities (62 tests)
- Nutrition calculations
- Data transformations

## Coverage Thresholds

Current thresholds (configured in `jest.config.js`):

```javascript
coverageThreshold: {
  global: {
    branches: 70,
    functions: 70,
    lines: 70,
    statements: 70
  }
}
```

View detailed coverage:
```bash
npm test
# Opens coverage/index.html in your browser
open coverage/index.html
```

## Writing New Tests

### Test Template

```typescript
import request from 'supertest';
import express, { Application } from 'express';
import yourRoutes from '../../routes/your.routes';
import { errorHandler } from '../../middleware/errorHandler';
import pool from "../../config/database";

const createTestApp = (): Application => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/your-route', yourRoutes);
  app.use(errorHandler);
  return app;
};

describe('Your Feature', () => {
  let app: Application;
  let testDataId: string;

  beforeAll(() => {
    app = createTestApp();
  });

  afterAll(async () => {
    // Cleanup test data
    if (testDataId) {
      await pool.query('DELETE FROM your_table WHERE id = $1', [testDataId]);
    }
    await pool.end();
  });

  it('should do something', async () => {
    const response = await request(app)
      .post('/api/v1/your-route')
      .send({ data: 'test' })
      .expect(201);

    expect(response.body).toHaveProperty('result');
    testDataId = response.body.result.id;
  });
});
```

### Best Practices

1. **Use unique test data**
   ```typescript
   const testEmail = `test-${Date.now()}@cuts.ae`;
   ```

2. **Clean up after tests**
   ```typescript
   afterAll(async () => {
     await pool.query('DELETE FROM users WHERE email LIKE $1', ['test-%']);
   });
   ```

3. **Test both success and failure cases**
   ```typescript
   it('should succeed with valid data', async () => { ... });
   it('should fail with invalid data', async () => { ... });
   ```

4. **Test HTTP status codes**
   ```typescript
   .expect(200)  // Success
   .expect(400)  // Bad request
   .expect(401)  // Unauthorized
   .expect(403)  // Forbidden
   .expect(404)  // Not found
   ```

5. **Verify response structure**
   ```typescript
   expect(response.body).toHaveProperty('user');
   expect(response.body.user).not.toHaveProperty('password_hash');
   ```

## Debugging Tests

### Run Single Test with Debugging
```bash
# Add --detectOpenHandles to find hanging operations
npx jest auth.test.ts --detectOpenHandles

# Run with verbose output
npx jest auth.test.ts --verbose

# Show all console.logs
npx jest auth.test.ts --silent=false
```

### Common Issues

#### 1. Tests Hanging
```bash
# Force exit after tests complete
npx jest --forceExit

# Find what's keeping process alive
npx jest --detectOpenHandles
```

#### 2. Database Connection Errors
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

Solution:
- Ensure PostgreSQL is running: `brew services start postgresql@14`
- Check credentials in `.env.test`
- Verify database exists: `psql -l | grep cuts_ae_test`

#### 3. Random Test Failures
- Ensure tests don't share state
- Use unique test data (timestamps)
- Check for proper async/await usage

#### 4. Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::45002
```

Solution:
```bash
# Kill process on port
lsof -ti:45002 | xargs kill -9
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_DB: cuts_ae_test
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Setup test database
        run: |
          psql -h localhost -U postgres -d cuts_ae_test -f database/schema.sql
        env:
          PGPASSWORD: test

      - name: Run tests
        run: npm test
        env:
          DB_HOST: localhost
          DB_PORT: 5432
          DB_NAME: cuts_ae_test
          DB_USER: postgres
          DB_PASSWORD: test
          JWT_SECRET: test-secret

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

## Test Maintenance

### Updating Tests After API Changes

1. **Route changes**: Update test URLs
2. **Schema changes**: Update request/response expectations
3. **New fields**: Add validation tests
4. **Deprecated fields**: Remove from test assertions

### Keeping Tests Fast

- Use database transactions when possible
- Mock external services
- Minimize test data creation
- Run integration tests in parallel (where safe)

## Useful Commands

```bash
# Clear Jest cache
npx jest --clearCache

# Update snapshots (if using snapshot testing)
npx jest -u

# Run tests with coverage only for changed files
npx jest --coverage --changedSince=main

# Generate coverage badge
npm test && npx coverage-badge-creator
```

## Getting Help

- Check test output for detailed error messages
- Review `/Users/sour/Projects/cuts.ae/api/TEST_SUMMARY.md` for test overview
- Use `--verbose` flag for detailed test execution
- Check Jest documentation: https://jestjs.io/docs/getting-started

## Summary

The API has **113 comprehensive tests** covering:
- 23 authentication tests
- 75 restaurant tests
- 124 menu tests
- 121 order tests
- 89 middleware tests
- 62 utility tests

All tests use:
- Jest for test framework
- Supertest for HTTP assertions
- PostgreSQL for database integration
- TypeScript for type safety

Run `npm test` to execute the entire suite with coverage reporting.
