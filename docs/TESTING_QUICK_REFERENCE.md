# Testing Quick Reference

Quick reference for running tests in the Cuts.ae API.

## Test Commands

### Standard Tests

```bash
npm test                    # All tests with coverage
npm run test:watch          # Watch mode
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests only
npm run test:security       # Security tests
```

### E2E Tests (Playwright)

```bash
npm run test:e2e            # Run all E2E tests
npm run test:e2e:ui         # Interactive UI mode
npm run test:e2e:headed     # Run with visible browser
npm run test:e2e:report     # View HTML report
```

### Property-Based Tests

```bash
npm run test:property       # Run all property tests
npm run test:property -- --verbose  # Verbose output
```

### Mutation Tests

```bash
npm run test:mutation       # Run mutation testing (slow!)
npm run test:mutation:report  # View mutation report
```

### Performance Tests

```bash
npm run test:load           # Load testing
npm run test:stress         # Stress testing
npm run test:spike          # Spike testing
npm run test:endurance      # Endurance testing
```

### Combined Tests

```bash
npm run test:all            # Run standard + E2E + property tests
```

## Test File Locations

```
api/
├── src/__tests__/
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   ├── security/           # Security tests
│   └── property/           # Property-based tests
└── e2e/                    # E2E tests (Playwright)
    ├── helpers/            # Test utilities
    └── *.spec.ts           # E2E test files
```

## Configuration Files

- `jest.config.js` - Jest configuration
- `playwright.config.ts` - Playwright configuration
- `stryker.conf.json` - Mutation testing configuration

## Environment Setup

1. Ensure API server is running: `npm run dev`
2. Database must be accessible
3. Environment variables in `.env.test`

## Coverage Reports

- **Location**: `coverage/`
- **HTML Report**: `coverage/lcov-report/index.html`
- **Mutation Report**: `stryker-report/mutation-report.html`
- **E2E Report**: `playwright-report/index.html`

## Common Issues

### E2E Tests Failing

```bash
# Check API is running
curl http://localhost:45000/health

# Check environment
cat .env.test

# View detailed report
npm run test:e2e:report
```

### Tests Timing Out

```bash
# Increase timeout in test file
test('my test', async () => {
  // test code
}, 60000);  // 60 second timeout
```

### Database Issues

```bash
# Reset test database
npm run db:reset:test

# Check database connection
psql -h localhost -U your_user -d cuts_test
```

## Test Types at a Glance

| Test Type | Speed | Coverage | When to Run |
|-----------|-------|----------|-------------|
| Unit | Fast | Individual functions | Every commit |
| Integration | Medium | API endpoints | Every commit |
| E2E | Slow | Full workflows | Before merge |
| Property | Medium | Edge cases | Before commit |
| Mutation | Very slow | Test quality | Weekly |
| Security | Fast | Vulnerabilities | Every commit |
| Performance | Slow | Load handling | Before release |

## Recommended Workflow

**During Development:**
```bash
npm run test:watch
```

**Before Commit:**
```bash
npm test
npm run test:property
npm run test:security
```

**Before Merge/Release:**
```bash
npm run test:all
npm run test:e2e
```

**Periodic (Weekly):**
```bash
npm run test:mutation
npm run test:load
```

## Writing Tests

### E2E Test Template

```typescript
import { test, expect } from '@playwright/test';
import { ApiClient } from './helpers/api-client';

test.describe('Feature Name', () => {
  let client: ApiClient;

  test.beforeAll(async ({ request }) => {
    client = new ApiClient(request, 'http://localhost:45000');
  });

  test('should do something', async () => {
    const { response, body } = await client.someMethod();
    expect(response.ok()).toBeTruthy();
    expect(body).toBeDefined();
  });
});
```

### Property Test Template

```typescript
import * as fc from 'fast-check';

test('property description', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 0, max: 100 }),
      (value) => {
        // Property that should always be true
        expect(value).toBeGreaterThanOrEqual(0);
      }
    ),
    { numRuns: 100 }
  );
});
```

## CI/CD Integration

Tests run automatically on:
- Push to main branch
- Pull requests
- Scheduled (mutation tests weekly)

## Getting Help

- Check test logs for errors
- Review test reports (HTML)
- See `docs/ADVANCED_TESTING_GUIDE.md` for detailed documentation
- Check Playwright traces for E2E failures

## Performance Benchmarks

Typical test run times:
- Unit tests: 5-10 seconds
- Integration tests: 15-30 seconds
- Property tests: 10-20 seconds
- E2E tests: 2-5 minutes
- Mutation tests: 30-60 minutes
- All tests: 3-10 minutes

## Key Metrics

Target coverage thresholds:
- Line coverage: 70%
- Branch coverage: 70%
- Function coverage: 70%
- Statement coverage: 70%
- Mutation score: 60-80%
