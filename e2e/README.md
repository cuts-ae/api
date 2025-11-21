# E2E Tests

End-to-End tests for the Cuts.ae API using Playwright.

## Overview

These tests verify complete user workflows from start to finish, simulating real-world scenarios across the entire application.

## Test Files

### customer-order-flow.spec.ts

Tests the complete customer journey:
1. Restaurant owner creates account and sets up restaurant
2. Restaurant owner adds menu items
3. Customer registers and logs in
4. Customer browses restaurants and menu
5. Customer creates an order
6. Customer views order details
7. Restaurant owner receives and updates order
8. Order progresses through all statuses

**Key Scenarios:**
- User registration and authentication
- Restaurant and menu management
- Order creation with calculations
- Order tracking through delivery lifecycle

### admin-management-flow.spec.ts

Tests admin operations:
1. Admin registration/login
2. Viewing all users
3. Viewing all restaurants
4. System-wide operations
5. Access control verification

**Key Scenarios:**
- Admin authentication
- Cross-user visibility
- Role-based access control
- System management operations

### order-cancellation-flow.spec.ts

Tests order cancellation scenarios:
1. Customer creates order
2. Customer cancels order (when allowed)
3. Attempt to cancel at different statuses
4. Verify cancellation rules

**Key Scenarios:**
- Cancelling orders in pending/confirmed status
- Preventing cancellation after pickup
- Authorization checks
- Status validation

## Helpers

### api-client.ts

Reusable API client with methods for:
- Authentication (register, login)
- Restaurant operations
- Menu management
- Order operations
- Token management

### test-data.ts

Test data generators for:
- User data (customer, restaurant owner, admin)
- Restaurant data
- Menu items
- Orders
- Delivery addresses

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI (interactive mode)
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# View test report
npm run test:e2e:report

# Run specific test file
npx playwright test customer-order-flow

# Run specific test
npx playwright test -g "Customer creates an order"
```

## Prerequisites

1. **API Server**: Must be running on port 45000
   ```bash
   cd /Users/sour/Projects/cuts.ae/api
   npm run dev
   ```

2. **Database**: PostgreSQL must be running and accessible
   - Database: `cuts_test` (or configured in .env.test)
   - User must have permissions

3. **Environment Variables**: Create `.env.test` with:
   ```
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=cuts_test
   DB_USER=your_user
   DB_PASSWORD=your_password
   JWT_SECRET=test_secret_key
   API_URL=http://localhost:45000
   ```

## Configuration

Tests are configured in `playwright.config.ts`:

- **Test Directory**: `./e2e`
- **Timeout**: 60 seconds per test
- **Workers**: 1 (serial execution to avoid DB conflicts)
- **Base URL**: http://localhost:45000
- **Reporter**: HTML, JSON, and list

## Test Structure

Each test follows this pattern:

```typescript
test.describe('Feature Name', () => {
  let client: ApiClient;

  test.beforeAll(async ({ request }) => {
    // Setup - create API client
    client = new ApiClient(request, baseURL);
  });

  test('Step 1: Description', async () => {
    // Arrange - prepare test data
    const data = generateTestData();

    // Act - perform action
    const { response, body } = await client.someAction(data);

    // Assert - verify results
    expect(response.ok()).toBeTruthy();
    expect(body).toMatchObject(expectedData);
  });

  // More test steps...
});
```

## Best Practices

1. **Use Descriptive Names**: Test names should clearly describe what is being tested
2. **Test Complete Flows**: Verify entire workflows, not just individual endpoints
3. **Use Test Data Generators**: Keep test data consistent and realistic
4. **Clean Up**: Tests should not leave data that affects other tests
5. **Independent Tests**: Each test should be able to run independently
6. **Verify State**: Check that actions produce expected state changes
7. **Test Error Cases**: Include negative test cases

## Debugging

### View Test Report

```bash
npm run test:e2e:report
```

The HTML report shows:
- Test results (pass/fail)
- Test duration
- Request/response details
- Error messages and stack traces

### Run in Headed Mode

```bash
npm run test:e2e:headed
```

This shows the browser (even though we're testing an API) and can help with debugging.

### Enable Debug Logging

```bash
DEBUG=pw:api npm run test:e2e
```

### Run Single Test

```bash
npx playwright test -g "Customer creates an order"
```

## Common Issues

### API Not Running

**Error**: `connect ECONNREFUSED 127.0.0.1:45000`

**Solution**:
```bash
# Start API server
cd /Users/sour/Projects/cuts.ae/api
npm run dev
```

### Database Connection Issues

**Error**: `connection refused` or `database does not exist`

**Solution**:
1. Check PostgreSQL is running
2. Verify database exists
3. Check credentials in `.env.test`

### Tests Timeout

**Error**: `Test timeout of 60000ms exceeded`

**Solution**:
1. Check API server is responding
2. Check database is accessible
3. Increase timeout in test or config

### Authentication Failures

**Error**: `401 Unauthorized`

**Solution**:
1. Check JWT_SECRET in `.env.test`
2. Verify token is being set correctly
3. Check token expiration

## Test Data

Tests use unique data for each run to avoid conflicts:
- Emails: `test-{timestamp}-{random}@cuts.ae`
- Restaurant names: `Test Restaurant {timestamp}`
- Order numbers: Generated by API

This ensures tests can run multiple times without cleanup.

## Performance

Typical test run times:
- Customer Order Flow: 30-60 seconds
- Admin Management Flow: 20-30 seconds
- Order Cancellation Flow: 30-45 seconds
- **Total**: 2-3 minutes

Run with single worker to prevent database conflicts.

## CI/CD

Tests run automatically in GitHub Actions:
- On push to main branch
- On pull requests
- Report uploaded as artifact

## Extending Tests

To add new E2E tests:

1. Create new test file in `e2e/` directory
2. Use `*.spec.ts` naming convention
3. Import helpers from `e2e/helpers/`
4. Follow existing test structure
5. Add to test suite documentation

Example:
```typescript
import { test, expect } from '@playwright/test';
import { ApiClient } from './helpers/api-client';
import { generateCustomerData } from './helpers/test-data';

test.describe('New Feature Flow', () => {
  // Your tests here
});
```

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [API Testing with Playwright](https://playwright.dev/docs/api-testing)
- [Best Practices](https://playwright.dev/docs/best-practices)
