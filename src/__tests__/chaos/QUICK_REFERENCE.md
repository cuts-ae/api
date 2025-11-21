# Chaos Testing Quick Reference

## Quick Start

```bash
# Run all chaos tests
npm run test:chaos

# Skip chaos tests (for regular test runs)
SKIP_CHAOS_TESTS=true npm test

# Run specific chaos test file
npx jest src/__tests__/chaos/network-chaos.chaos.test.ts
```

## Test Files at a Glance

| File | Tests | Focus Area |
|------|-------|------------|
| `network-chaos.chaos.test.ts` | 21 | Network delays, connection drops, rate limiting |
| `database-chaos.chaos.test.ts` | 31 | Connection failures, slow queries, transactions |
| `resource-exhaustion.chaos.test.ts` | 28 | Memory, CPU, concurrent requests (1000+) |
| `fault-injection.chaos.test.ts` | 33 | Random errors, invalid data, circuit breakers |

**Total: 113 chaos tests**

## Common Commands

```bash
# Run all chaos tests
npm run test:chaos

# Run with verbose output
npx jest --testPathPatterns=chaos --verbose

# Run specific test category
npx jest --testPathPatterns=chaos --testNamePattern="Network Delays"

# Run single test
npx jest --testPathPatterns=chaos --testNamePattern="should handle slow database"

# Skip chaos tests in CI
SKIP_CHAOS_TESTS=true npm test

# Enable chaos tests in CI
SKIP_CHAOS_TESTS=false npm run test:chaos
```

## Test Categories

### Network Chaos (21 tests)
- ✓ Network delays (5s timeouts)
- ✓ Connection drops
- ✓ Rate limiting (100+ concurrent)
- ✓ Intermittent failures
- ✓ Recovery testing

### Database Chaos (31 tests)
- ✓ Connection failures
- ✓ Slow queries (10s+)
- ✓ Transaction rollbacks
- ✓ Pool exhaustion (20 max)
- ✓ SQL errors

### Resource Exhaustion (28 tests)
- ✓ Memory pressure (1MB+ payloads)
- ✓ High CPU usage
- ✓ 1000+ concurrent requests
- ✓ File descriptor limits
- ✓ Memory leak detection

### Fault Injection (33 tests)
- ✓ Random errors (30% rate)
- ✓ Invalid data injection
- ✓ Circuit breaker patterns
- ✓ Graceful degradation
- ✓ Combined failures

## Expected Status Codes

| Code | Meaning | Expected During Chaos? |
|------|---------|------------------------|
| 200 | Success | ✓ (System resilient) |
| 400 | Bad Request | ✓ (Invalid input) |
| 401 | Unauthorized | ✓ (Auth failure) |
| 403 | Forbidden | ✓ (Permission denied) |
| 500 | Internal Error | ✓ (Temporary failure) |
| 503 | Unavailable | ✓ (Service degraded) |

## Success Criteria Checklist

- [ ] System doesn't crash
- [ ] Returns appropriate error codes
- [ ] Error messages are informative
- [ ] Maintains data integrity
- [ ] Recovers after chaos stops
- [ ] No memory leaks
- [ ] No lingering errors
- [ ] Degrades gracefully

## Key Metrics

| Metric | Target | Critical Threshold |
|--------|--------|--------------------|
| Availability | >99% | >95% |
| Error Rate | <5% during chaos | <20% |
| Recovery Time | <5 seconds | <30 seconds |
| Memory Growth | <50MB per 100 requests | <100MB |
| Success Rate | >90% post-recovery | >80% |

## Environment Variables

```bash
# Skip all chaos tests (default: false)
SKIP_CHAOS_TESTS=true

# JWT secret for auth tests (required)
JWT_SECRET=your-secret-key
```

## Helper Functions

```typescript
// From chaos-helpers.ts
import {
  createRandomFailureMock,      // Random failures
  createDelayedMock,             // Add delays
  createCircuitBreakerMock,      // Circuit breaker
  createDegradingMock,           // Degrading system
  createRecoveringMock,          // Recovering system
  calculateSuccessRate,          // Metrics
  calculateFailureRate,          // Metrics
  groupByStatusCode              // Analysis
} from './chaos-helpers';
```

## Troubleshooting

### Tests Timeout
```bash
# Increase timeout in jest.config.js
testTimeout: 60000  // 60 seconds

# Or for specific test
jest.setTimeout(60000);
```

### Memory Issues
```bash
# Run with garbage collection
node --expose-gc node_modules/.bin/jest --testPathPatterns=chaos
```

### Flaky Tests
```typescript
// Use seeded random for reproducibility
import { seedRandom } from './chaos-helpers';
seedRandom(12345);
```

### CI/CD Failures
```bash
# Check environment variables
echo $SKIP_CHAOS_TESTS
echo $JWT_SECRET

# Run locally first
SKIP_CHAOS_TESTS=false npm run test:chaos
```

## Common Patterns

### Test a Specific Failure
```typescript
it('should handle specific failure', async () => {
  // Setup: Inject failure
  mockPool.query.mockRejectedValue(new Error('Specific error'));

  // Execute: Make request
  const response = await request(app).get('/endpoint');

  // Verify: Check graceful handling
  expect([500, 503]).toContain(response.status);
  expect(response.body).toHaveProperty('error');

  // Recovery: Clear failure
  mockPool.query.mockResolvedValue({ rows: [{ status: 'ok' }] });

  // Verify recovery
  const recoveryResponse = await request(app).get('/endpoint');
  expect(recoveryResponse.status).toBe(200);
});
```

### Test with Delays
```typescript
it('should handle delays', async () => {
  mockPool.query.mockImplementation(() =>
    new Promise(resolve =>
      setTimeout(() => resolve({ rows: [] }), 5000)
    )
  );

  const requestPromise = request(app).get('/endpoint');

  jest.advanceTimersByTime(5000);

  const response = await requestPromise;
  expect(response.status).toBeDefined();
});
```

### Test Recovery
```typescript
it('should recover after failure', async () => {
  // Phase 1: Failure
  mockPool.query.mockRejectedValue(new Error('Failure'));
  const failResponse = await request(app).get('/endpoint');
  expect([500, 503]).toContain(failResponse.status);

  // Phase 2: Recovery
  mockPool.query.mockResolvedValue({ rows: [{ status: 'ok' }] });
  const successResponse = await request(app).get('/endpoint');
  expect(successResponse.status).toBe(200);
});
```

## CI/CD Integration

### GitHub Actions
```yaml
name: Chaos Tests
on:
  schedule:
    - cron: '0 2 * * *'
  workflow_dispatch:

jobs:
  chaos:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: SKIP_CHAOS_TESTS=false npm run test:chaos
```

### GitLab CI
```yaml
chaos-tests:
  stage: test
  script:
    - npm ci
    - SKIP_CHAOS_TESTS=false npm run test:chaos
  only:
    - schedules
  allow_failure: true
```

## Monitoring and Alerts

### Key Metrics to Monitor
- Test execution time (should be <5 minutes)
- Success rate (should be >90%)
- Memory usage during tests
- Number of failing tests over time

### Alert Thresholds
- Test execution time >10 minutes
- Success rate <80%
- Memory usage >500MB
- >20% tests failing

## Best Practices

1. **Run regularly** - Schedule nightly or weekly
2. **Monitor trends** - Track metrics over time
3. **Update scenarios** - Add new chaos based on incidents
4. **Document failures** - Record what breaks and why
5. **Fix issues** - Don't just run tests, fix what they find
6. **Review coverage** - Ensure all critical paths tested

## Resources

- Full documentation: `README.md`
- Detailed summary: `SUMMARY.md`
- Helper utilities: `chaos-helpers.ts`
- Test files: `*.chaos.test.ts`

## Support

For issues or questions:
1. Check the README.md for detailed documentation
2. Review SUMMARY.md for overview
3. Check existing tests for examples
4. Update this guide with learnings

---

**Remember**: Chaos tests are designed to find weaknesses. Failures are expected and valuable!
