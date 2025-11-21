# Testing Guide - Cuts.ae API

Complete testing suite for the Cuts.ae API including unit, integration, E2E, property-based, mutation, and performance tests.

## Quick Start

```bash
# Run all standard tests with coverage
npm test

# Run E2E tests
npm run test:e2e

# Run property-based tests
npm run test:property

# Run everything
npm run test:all
```

## Test Types

### 1. Unit Tests
**Location**: `src/__tests__/unit/`
**Command**: `npm run test:unit`
**Purpose**: Test individual functions and modules in isolation

### 2. Integration Tests
**Location**: `src/__tests__/integration/`
**Command**: `npm run test:integration`
**Purpose**: Test API endpoints with database

### 3. E2E Tests (Playwright)
**Location**: `e2e/`
**Command**: `npm run test:e2e`
**Purpose**: Test complete user workflows from start to finish

**What's Tested**:
- Complete customer order journey (registration → order → delivery)
- Admin management operations
- Order cancellation flows
- Authentication and authorization
- Multi-step business processes

**Features**:
- Real API calls (not mocked)
- Complete database integration
- Reusable API client
- Test data generators
- HTML reports

### 4. Property-Based Tests (fast-check)
**Location**: `src/__tests__/property/`
**Command**: `npm run test:property`
**Purpose**: Test mathematical properties and invariants with random inputs

**What's Tested**:
- Order calculations (total = subtotal + fees)
- Price precision and rounding
- String sanitization (SQL injection, XSS)
- Email and phone validation
- Date/time operations
- Business rule invariants

**Features**:
- 3,000+ random test scenarios
- Automatic edge case discovery
- Shrinking to minimal failing cases
- Documents business rules

### 5. Mutation Tests (Stryker)
**Location**: Tests all source code
**Command**: `npm run test:mutation`
**Purpose**: Verify test suite quality by introducing code mutations

**What's Tested**:
- Controllers
- Authentication middleware
- RBAC middleware
- Utility functions

**Features**:
- Ensures tests catch bugs
- Identifies weak tests
- HTML reports showing mutations
- Mutation score metrics

### 6. Security Tests
**Location**: `src/__tests__/security/`
**Command**: `npm run test:security`
**Purpose**: Test for security vulnerabilities

**What's Tested**:
- SQL injection prevention
- XSS prevention
- CSRF protection
- Authentication bypass attempts
- Rate limiting

### 7. Performance Tests (Artillery)
**Commands**:
- `npm run test:load` - Load testing
- `npm run test:stress` - Stress testing
- `npm run test:spike` - Spike testing
- `npm run test:endurance` - Endurance testing

## All Available Commands

```bash
# Standard tests
npm test                    # All tests with coverage
npm run test:watch          # Watch mode for development
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests only

# E2E tests
npm run test:e2e            # Run all E2E tests
npm run test:e2e:ui         # Interactive UI mode
npm run test:e2e:headed     # Run with visible browser
npm run test:e2e:report     # View HTML report

# Advanced tests
npm run test:property       # Property-based tests
npm run test:mutation       # Mutation tests (slow!)
npm run test:mutation:report # View mutation report
npm run test:security       # Security tests

# Combined
npm run test:all            # All test types

# Performance
npm run test:load           # Load testing
npm run test:stress         # Stress testing
npm run test:spike          # Spike testing
npm run test:endurance      # Endurance testing
```

## Test Coverage

Current test coverage targets:
- Line coverage: 70%
- Branch coverage: 70%
- Function coverage: 70%
- Statement coverage: 70%
- Mutation score: 60-80%

## Documentation

- **Comprehensive Guide**: `docs/ADVANCED_TESTING_GUIDE.md`
- **Quick Reference**: `docs/TESTING_QUICK_REFERENCE.md`
- **E2E Guide**: `e2e/README.md`
- **Implementation Summary**: `ADVANCED_TESTING_SUMMARY.md`

## Prerequisites

### For All Tests
- Node.js installed
- Dependencies installed: `npm install`

### For E2E Tests
- API server running: `npm run dev`
- PostgreSQL database accessible
- Environment variables in `.env.test`

### For Mutation Tests
- All unit/integration tests passing
- Adequate disk space (reports can be large)
- Time (mutation tests take 30-60 minutes)

## Recommended Workflow

### During Development
```bash
npm run test:watch
```
- Runs tests continuously as you code
- Fast feedback on changes
- Unit and integration tests only

### Before Commit
```bash
npm test
npm run test:property
npm run test:security
```
- Full test suite with coverage
- Property tests for edge cases
- Security vulnerability checks
- Takes 1-2 minutes

### Before Merge/Release
```bash
npm run test:all
npm run test:e2e
```
- All test types
- Complete E2E workflows
- Takes 5-10 minutes

### Periodic (Weekly)
```bash
npm run test:mutation
npm run test:load
```
- Verify test quality
- Performance benchmarks
- Takes 30-90 minutes

## Test Structure

```
api/
├── e2e/                           # E2E tests (Playwright)
│   ├── helpers/
│   │   ├── api-client.ts          # API client wrapper
│   │   └── test-data.ts           # Test data generators
│   ├── customer-order-flow.spec.ts
│   ├── admin-management-flow.spec.ts
│   └── order-cancellation-flow.spec.ts
│
├── src/__tests__/
│   ├── unit/                      # Unit tests
│   ├── integration/               # Integration tests
│   ├── security/                  # Security tests
│   └── property/                  # Property-based tests
│       ├── order-calculations.property.test.ts
│       ├── string-sanitization.property.test.ts
│       └── date-time.property.test.ts
│
├── playwright.config.ts           # Playwright configuration
├── stryker.conf.json              # Stryker configuration
└── jest.config.js                 # Jest configuration
```

## Example Tests

### E2E Test Example
```typescript
test('Customer creates and tracks order', async () => {
  // Register customer
  const { body } = await client.register(customerData);
  expect(body.token).toBeDefined();

  // Create order
  const order = await client.createOrder(orderData);
  expect(order.status).toBe('pending');

  // Track order
  const tracked = await client.getOrder(order.id);
  expect(tracked).toBeDefined();
});
```

### Property Test Example
```typescript
test('Total equals subtotal plus fees', () => {
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

## Reports

After running tests, view reports:

- **Coverage**: Open `coverage/lcov-report/index.html`
- **E2E**: Run `npm run test:e2e:report`
- **Mutation**: Run `npm run test:mutation:report`

## CI/CD

Tests run automatically in GitHub Actions:
- Unit/integration tests: Every commit
- E2E tests: Pull requests
- Mutation tests: Weekly schedule
- Performance tests: Before releases

## Troubleshooting

### Tests Failing
1. Check API server is running
2. Verify database is accessible
3. Check environment variables
4. Review test logs

### E2E Tests Timeout
1. Increase timeout in `playwright.config.ts`
2. Check API response times
3. Verify database performance

### Property Tests Failing
1. Note the seed value (for reproduction)
2. Review the counterexample
3. Verify the property is correct
4. Check for edge cases

## Performance Benchmarks

Typical test run times:
- Unit tests: 5-10 seconds
- Integration tests: 15-30 seconds
- Property tests: 10-20 seconds
- E2E tests: 2-5 minutes
- Mutation tests: 30-60 minutes
- All tests: 3-10 minutes

## Getting Help

For detailed information, see:
- `docs/ADVANCED_TESTING_GUIDE.md` - Comprehensive guide
- `docs/TESTING_QUICK_REFERENCE.md` - Quick command reference
- `e2e/README.md` - E2E testing guide
- `ADVANCED_TESTING_SUMMARY.md` - Implementation summary

## Test Statistics

- **Total Tests**: 200+ test cases
- **Property Tests**: 30+ properties × 100 runs = 3,000+ scenarios
- **E2E Tests**: 20 complete workflow tests
- **Coverage**: 70%+ across all metrics
- **Files Tested**: 50+ source files
- **Test Code**: ~3,300 lines of tests and documentation

## Contributing

When adding new features:
1. Write unit tests first (TDD)
2. Add integration tests for APIs
3. Consider property tests for calculations
4. Add E2E tests for new workflows
5. Ensure all tests pass
6. Check coverage meets thresholds

## License

Same as main project
