# Advanced Testing Guide

This guide covers the advanced testing suite implemented for the Cuts.ae API, including End-to-End (E2E) testing, mutation testing, and property-based testing.

## Table of Contents

1. [Overview](#overview)
2. [End-to-End Testing with Playwright](#end-to-end-testing-with-playwright)
3. [Mutation Testing with Stryker](#mutation-testing-with-stryker)
4. [Property-Based Testing with fast-check](#property-based-testing-with-fast-check)
5. [Running Tests](#running-tests)
6. [CI/CD Integration](#cicd-integration)
7. [Best Practices](#best-practices)

## Overview

The Cuts.ae API uses a comprehensive testing strategy:

- **Unit Tests**: Test individual functions and modules in isolation
- **Integration Tests**: Test API endpoints and database interactions
- **E2E Tests**: Test complete user workflows across the entire system
- **Property-Based Tests**: Test mathematical properties and invariants
- **Mutation Tests**: Verify test suite effectiveness by introducing code mutations
- **Security Tests**: Test for common vulnerabilities (XSS, SQL injection, etc.)
- **Performance Tests**: Load, stress, and endurance testing with Artillery

## End-to-End Testing with Playwright

### What is E2E Testing?

E2E tests verify that complete user workflows function correctly from start to finish. Unlike unit or integration tests that test individual components, E2E tests simulate real user scenarios across the entire application.

### Technology

We use **Playwright** for E2E testing because it:
- Provides a robust API for HTTP requests
- Supports parallel test execution
- Offers excellent reporting and debugging tools
- Works well for API testing (not just browser automation)

### Test Structure

E2E tests are located in the `e2e/` directory:

```
e2e/
├── helpers/
│   ├── api-client.ts          # Reusable API client wrapper
│   └── test-data.ts            # Test data generators
├── customer-order-flow.spec.ts       # Customer order journey
├── admin-management-flow.spec.ts     # Admin operations
└── order-cancellation-flow.spec.ts   # Order cancellation scenarios
```

### Example E2E Test

```typescript
test('Complete customer order flow', async () => {
  // Step 1: Register customer
  const customerData = generateCustomerData();
  const { response, body } = await customerClient.register(customerData);
  expect(response.ok()).toBeTruthy();

  // Step 2: Browse restaurants
  const { body: restaurants } = await customerClient.getRestaurants();
  expect(restaurants.restaurants.length).toBeGreaterThan(0);

  // Step 3: Create order
  const orderData = generateOrderData(menuItemId, restaurantId);
  const { body: order } = await customerClient.createOrder(orderData);
  expect(order.order.status).toBe('pending');

  // Step 4: Track order progress
  const { body: updatedOrder } = await customerClient.getOrder(orderId);
  expect(updatedOrder.order).toBeDefined();
});
```

### What E2E Tests Cover

1. **Customer Order Flow**
   - Customer registration and login
   - Browsing restaurants and menu items
   - Creating an order with calculations
   - Viewing order details
   - Tracking order status through delivery

2. **Admin Management Flow**
   - Admin authentication
   - Viewing all users and restaurants
   - System-wide operations
   - Access control verification

3. **Order Cancellation Flow**
   - Cancelling orders at different statuses
   - Validation of cancellation rules
   - Authorization checks

### Running E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests with UI (interactive mode)
npm run test:e2e:ui

# Run E2E tests in headed mode (see browser)
npm run test:e2e:headed

# View test report
npm run test:e2e:report
```

### Configuration

E2E tests are configured in `playwright.config.ts`:

```typescript
export default defineConfig({
  testDir: './e2e',
  timeout: 60 * 1000,
  fullyParallel: false,  // Run serially to avoid DB conflicts
  workers: 1,            // Single worker for consistency
  use: {
    baseURL: process.env.API_URL || 'http://localhost:45000',
  },
});
```

### Prerequisites for E2E Tests

1. Database must be running and accessible
2. API server should be started (`npm run dev`)
3. Test environment variables configured in `.env.test`

## Mutation Testing with Stryker

### What is Mutation Testing?

Mutation testing evaluates the quality of your test suite by introducing small changes (mutations) to your code and checking if your tests catch them. If tests still pass after mutations, it indicates weak test coverage.

### Technology

We use **Stryker** for mutation testing because it:
- Supports TypeScript and Jest
- Provides detailed mutation reports
- Integrates with existing test infrastructure
- Helps identify gaps in test coverage

### How Mutation Testing Works

1. **Stryker mutates your code** - Changes operators, removes conditions, etc.
2. **Runs your test suite** - Checks if tests fail with mutations
3. **Generates report** - Shows which mutations were caught (killed) or missed (survived)

### Example Mutations

Original code:
```typescript
if (price > 0) {
  return price * quantity;
}
```

Mutations Stryker might create:
- `price >= 0` (boundary mutation)
- `price < 0` (conditional mutation)
- `price * 1` (arithmetic mutation)
- Remove entire if statement (block removal)

### What Mutation Tests Cover

Stryker is configured to test critical business logic:
- Controllers (`src/controllers/*.ts`)
- Authentication middleware (`src/middleware/auth.ts`)
- RBAC middleware (`src/middleware/rbac.ts`)
- Utility functions (`src/utils/*.ts`)

### Running Mutation Tests

```bash
# Run mutation testing (WARNING: This can take a long time!)
npm run test:mutation

# View mutation test report
npm run test:mutation:report
```

### Configuration

Mutation testing is configured in `stryker.conf.json`:

```json
{
  "mutate": [
    "src/controllers/*.ts",
    "src/middleware/auth.ts",
    "src/middleware/rbac.ts",
    "src/utils/*.ts"
  ],
  "thresholds": {
    "high": 80,
    "low": 60,
    "break": 50
  }
}
```

### Interpreting Results

- **Mutation Score**: Percentage of mutations killed by tests
- **Killed**: Mutation was detected by tests (good)
- **Survived**: Mutation was not detected (indicates weak tests)
- **No Coverage**: Code not covered by tests
- **Timeout**: Test took too long (might indicate infinite loop)

### Best Practices for Mutation Testing

1. **Start small** - Run on critical files first
2. **Set realistic thresholds** - 80% is excellent, 60% is good
3. **Don't aim for 100%** - Some mutations are false positives
4. **Run periodically** - Not on every commit (too slow)
5. **Focus on high-value code** - Order calculations, auth, payments

## Property-Based Testing with fast-check

### What is Property-Based Testing?

Property-based testing verifies that certain properties (invariants) hold true for all possible inputs, rather than testing specific examples. The framework generates hundreds of random inputs to find edge cases.

### Technology

We use **fast-check** for property-based testing because it:
- Integrates seamlessly with Jest
- Generates diverse random inputs
- Provides shrinking (simplifies failing cases)
- Supports custom generators

### Example: Traditional vs Property-Based Testing

**Traditional Test:**
```typescript
test('order total calculation', () => {
  expect(calculateTotal(100, 10, 5)).toBe(115);
  expect(calculateTotal(50, 10, 2.5)).toBe(62.5);
});
```

**Property-Based Test:**
```typescript
test('total should equal subtotal + fees', () => {
  fc.assert(
    fc.property(
      fc.float({ min: 0, max: 10000 }),
      fc.float({ min: 0, max: 100 }),
      (subtotal, deliveryFee) => {
        const total = subtotal + deliveryFee;
        expect(total).toBeGreaterThanOrEqual(subtotal);
      }
    ),
    { numRuns: 100 }
  );
});
```

### What Property Tests Cover

1. **Order Calculations** (`order-calculations.property.test.ts`)
   - Total = subtotal + delivery fee + service fee
   - Service fee scales linearly
   - Item total = price × quantity
   - Order total >= individual item totals
   - Price precision (2 decimal places)
   - Discount calculations
   - Quantity invariants
   - Commutative and associative properties

2. **String Sanitization** (`string-sanitization.property.test.ts`)
   - SQL injection prevention
   - XSS prevention
   - Email validation
   - Phone number validation
   - String length limits
   - Case insensitivity
   - Whitespace handling
   - Unicode and emoji support

3. **Date/Time Operations** (`date-time.property.test.ts`)
   - Date ordering (earlier < later)
   - Timestamp operations
   - Date arithmetic (add/subtract)
   - Scheduled order times
   - Operating hours validation
   - Delivery time estimates
   - Order lifecycle timestamps
   - ISO 8601 format consistency
   - Timezone handling

### Running Property-Based Tests

```bash
# Run property-based tests
npm run test:property

# Run with verbose output
npm run test:property -- --verbose

# Run specific property test file
npm run test:property -- order-calculations
```

### Example Property Tests

**Order Calculations:**
```typescript
test('Total should always equal subtotal + fees', () => {
  fc.assert(
    fc.property(
      fc.float({ min: 0, max: 10000, noNaN: true }),
      fc.float({ min: 0, max: 100, noNaN: true }),
      fc.float({ min: 0, max: 0.2, noNaN: true }),
      (subtotal, deliveryFee, serviceFeeRate) => {
        const serviceFee = subtotal * serviceFeeRate;
        const total = subtotal + deliveryFee + serviceFee;

        // Properties that should always be true
        expect(total).toBeGreaterThanOrEqual(subtotal);
        expect(total).toBeCloseTo(subtotal + deliveryFee + serviceFee, 2);
      }
    ),
    { numRuns: 100 }  // Test with 100 random inputs
  );
});
```

**String Validation:**
```typescript
test('Valid emails should always pass validation', () => {
  fc.assert(
    fc.property(
      fc.emailAddress(),
      (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        expect(emailRegex.test(email)).toBe(true);

        // Email should contain exactly one @
        const atCount = (email.match(/@/g) || []).length;
        expect(atCount).toBe(1);
      }
    )
  );
});
```

**Date Ordering:**
```typescript
test('Earlier dates should always be less than later dates', () => {
  fc.assert(
    fc.property(
      fc.date(),
      fc.date(),
      (date1, date2) => {
        const time1 = date1.getTime();
        const time2 = date2.getTime();

        if (time1 < time2) {
          expect(date1 < date2).toBe(true);
        }
      }
    )
  );
});
```

### Benefits of Property-Based Testing

1. **Finds edge cases** - Tests inputs you wouldn't think to test
2. **Less maintenance** - One property test replaces many example tests
3. **Better coverage** - Tests hundreds of scenarios automatically
4. **Documents invariants** - Makes business rules explicit
5. **Regression prevention** - Continuously tests with new random inputs

## Running Tests

### All Test Commands

```bash
# Standard Jest tests with coverage
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# E2E tests (Playwright)
npm run test:e2e
npm run test:e2e:ui          # Interactive mode
npm run test:e2e:headed      # See browser
npm run test:e2e:report      # View report

# Property-based tests
npm run test:property

# Mutation tests
npm run test:mutation
npm run test:mutation:report

# Security tests
npm run test:security

# Run all test types
npm run test:all

# Performance tests
npm run test:load
npm run test:stress
npm run test:spike
npm run test:endurance
```

### Recommended Testing Workflow

**During Development:**
```bash
npm run test:watch  # Continuous testing
```

**Before Commit:**
```bash
npm test            # Unit + integration with coverage
npm run test:property  # Property tests
```

**Before Release:**
```bash
npm run test:all    # All test types
npm run test:e2e    # Full E2E suite
npm run test:mutation  # Mutation testing (if time allows)
```

**In CI/CD:**
```bash
npm test            # Fast tests
npm run test:e2e    # E2E tests
npm run test:security  # Security tests
# Mutation tests run weekly (too slow for every commit)
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Advanced Tests

on: [push, pull_request]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/

  property-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:property

  mutation-tests:
    runs-on: ubuntu-latest
    if: github.event_name == 'schedule'  # Weekly only
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:mutation
      - uses: actions/upload-artifact@v3
        with:
          name: mutation-report
          path: stryker-report/
```

## Best Practices

### E2E Testing Best Practices

1. **Test complete workflows** - Not just individual endpoints
2. **Use realistic data** - Generate data that resembles production
3. **Clean up after tests** - Don't leave test data in database
4. **Run serially** - Avoid race conditions in database
5. **Test error scenarios** - Not just happy paths
6. **Verify state changes** - Check that actions have correct effects

### Mutation Testing Best Practices

1. **Focus on critical code** - Authentication, payments, calculations
2. **Set realistic thresholds** - 80% is excellent
3. **Review survivors** - Understand why mutations weren't caught
4. **Run periodically** - Weekly or before releases
5. **Ignore equivalent mutants** - Some mutations don't change behavior
6. **Use with code review** - Helps identify weak tests

### Property-Based Testing Best Practices

1. **Identify invariants** - What should always be true?
2. **Start simple** - Test basic properties first
3. **Use appropriate generators** - Match your domain
4. **Set sufficient runs** - 100-1000 depending on complexity
5. **Combine with examples** - Use both property and example tests
6. **Document properties** - Explain what each property tests

### General Testing Best Practices

1. **Test pyramid** - Many unit tests, fewer integration, few E2E
2. **Fast feedback** - Run fast tests first
3. **Deterministic tests** - Should pass consistently
4. **Isolated tests** - Each test independent
5. **Descriptive names** - Clear what is being tested
6. **Maintainable tests** - Easy to update when requirements change

## Troubleshooting

### E2E Tests Failing

- Check if API server is running
- Verify database is accessible
- Check environment variables in `.env.test`
- Review Playwright report for details

### Mutation Tests Taking Too Long

- Reduce scope (test fewer files)
- Increase timeout in `stryker.conf.json`
- Use fewer workers (`maxConcurrentTestRunners`)
- Run on specific files only

### Property Tests Failing

- Check the seed (fast-check prints it)
- Use same seed to reproduce: `fc.assert(..., { seed: 1234 })`
- Review shrunk example (simplified failing case)
- Verify your property is actually true

## Conclusion

This advanced testing suite provides comprehensive coverage:

- **E2E tests** verify complete user workflows work correctly
- **Mutation tests** ensure your test suite is effective
- **Property tests** catch edge cases and verify invariants

Together, these tests provide high confidence in code quality and help prevent regressions.

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Stryker Mutator Documentation](https://stryker-mutator.io/)
- [fast-check Documentation](https://fast-check.dev/)
- [Property-Based Testing Guide](https://fsharpforfunandprofit.com/pbt/)
