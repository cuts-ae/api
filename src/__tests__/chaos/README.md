# Chaos Testing Suite

This directory contains chaos engineering tests for the Cuts.ae API. These tests verify the system's resilience to various failure scenarios including network issues, database failures, resource exhaustion, and fault injection.

## Overview

Chaos testing helps identify weaknesses in the system by intentionally introducing failures and observing how the application responds. The goal is to ensure the system degrades gracefully and recovers properly from unexpected conditions.

## Test Files

### 1. network-chaos.chaos.test.ts

Tests the API's resilience to network-related failures:

- **Network Delays**: Slow responses, timeouts, and varying response times
- **Connection Drops**: Mid-request connection failures, connection resets
- **Rate Limiting**: Burst traffic, sustained high load, concurrent requests
- **Intermittent Failures**: Random failures, cascading failures, flaky connections
- **Recovery Testing**: System recovery after network issues resolve

**Key Scenarios:**
- Simulates 5-second database delays
- Tests 100+ concurrent requests
- Handles various network error codes (ECONNRESET, ETIMEDOUT, etc.)
- Verifies recovery after network issues

### 2. database-chaos.chaos.test.ts

Tests the API's resilience to database-related failures:

- **Connection Failures**: Database unavailability, timeouts, authentication errors
- **Slow Queries**: Extremely slow queries, varying query times, cascading delays
- **Transaction Rollbacks**: Failed transactions, deadlocks, constraint violations
- **Connection Pool Exhaustion**: Too many connections, connection leaks
- **Query Errors**: SQL syntax errors, constraint violations, malformed results

**Key Scenarios:**
- Simulates complete database outages
- Tests 10-second slow queries
- Handles connection pool limits (20 max connections)
- Tests transaction failures and rollbacks

### 3. resource-exhaustion.chaos.test.ts

Tests the API's resilience to resource constraints:

- **Memory Pressure**: Large payloads, memory leaks, rapid allocation/deallocation
- **High CPU Usage**: CPU-intensive operations, concurrent heavy tasks
- **Concurrent Request Load**: 1000+ simultaneous requests, sustained load
- **File Descriptor Exhaustion**: Many connections, rapid creation/destruction

**Key Scenarios:**
- Tests with 1MB+ request payloads
- Handles 1000-2000 concurrent requests
- Simulates memory allocation failures
- Tests CPU-intensive operations with 50+ concurrent requests

### 4. fault-injection.chaos.test.ts

Tests the API's resilience to injected faults:

- **Random Middleware Errors**: Database errors, authentication failures, unexpected exceptions
- **Invalid Data Injection**: Null bytes, unicode edge cases, SQL injection, prototype pollution
- **Circuit Breaker Patterns**: Failure thresholds, retry logic, fail-fast behavior
- **Graceful Degradation**: Cached responses, partial data, read-only mode

**Key Scenarios:**
- Injects random errors (30% failure rate)
- Tests with malformed tokens and invalid payloads
- Simulates cascading failures
- Verifies graceful degradation strategies

## Running the Tests

### Run All Chaos Tests

```bash
npm run test:chaos
```

### Run Specific Test File

```bash
# Network chaos tests
npx jest src/__tests__/chaos/network-chaos.chaos.test.ts

# Database chaos tests
npx jest src/__tests__/chaos/database-chaos.chaos.test.ts

# Resource exhaustion tests
npx jest src/__tests__/chaos/resource-exhaustion.chaos.test.ts

# Fault injection tests
npx jest src/__tests__/chaos/fault-injection.chaos.test.ts
```

### Skip Chaos Tests

Chaos tests are automatically skipped when the environment variable `SKIP_CHAOS_TESTS=true` is set:

```bash
SKIP_CHAOS_TESTS=true npm run test
```

This is useful for CI/CD pipelines where you may want to run chaos tests separately from regular tests.

### Run Chaos Tests Only

```bash
npm run test:chaos
```

## Test Configuration

The chaos tests use Jest with the following configurations:

- **Fake Timers**: Jest fake timers are used to control time-based operations
- **Mocked Database**: The PostgreSQL pool is mocked to simulate various failure scenarios
- **Supertest**: Used for making HTTP requests to the API
- **Test Timeout**: 30 seconds (configured in jest.config.js)

## Understanding Test Results

### Success Criteria

The chaos tests verify that the system:

1. **Doesn't Crash**: The application should handle errors gracefully without crashing
2. **Returns Appropriate Errors**: Error responses should be meaningful (400, 401, 500, 503)
3. **Maintains Data Integrity**: No data corruption or inconsistent state
4. **Recovers Properly**: System should return to normal operation after chaos stops
5. **Degrades Gracefully**: Critical features should remain available during partial outages

### Expected Behavior

- **200 OK**: Request succeeded despite chaos (system resilient)
- **400 Bad Request**: Invalid input data (expected for malformed requests)
- **401 Unauthorized**: Authentication failure (expected for invalid credentials)
- **500 Internal Server Error**: Server error (acceptable during chaos, should recover)
- **503 Service Unavailable**: Service temporarily unavailable (acceptable during outages)

### Failure Indicators

Tests fail when:

- Application crashes or becomes unresponsive
- Memory leaks are detected (excessive memory growth)
- System doesn't recover after chaos stops
- Invalid error codes are returned
- Response bodies are malformed or missing

## Best Practices

### When to Run Chaos Tests

1. **Before Production Deployment**: Verify system resilience before releases
2. **After Infrastructure Changes**: Test new database configurations, network changes
3. **Performance Testing**: Combine with load tests to validate under stress
4. **Incident Response**: Reproduce and verify fixes for production issues

### Extending Chaos Tests

To add new chaos scenarios:

1. Choose the appropriate test file based on failure type
2. Add a new `describe` or `it` block
3. Mock the specific failure scenario
4. Verify the system handles it gracefully
5. Include recovery testing

Example:

```typescript
it('should handle new chaos scenario', async () => {
  // Setup: Inject failure
  mockPool.query.mockRejectedValue(new Error('New failure type'));

  // Execute: Make request
  const response = await request(app).get('/health');

  // Verify: Check graceful handling
  expect([500, 503]).toContain(response.status);
  expect(response.body).toHaveProperty('error');

  // Recovery: Clear failure
  mockPool.query.mockResolvedValue({ rows: [{ status: 'ok' }] });

  // Verify recovery
  const recoveryResponse = await request(app).get('/health');
  expect(recoveryResponse.status).toBe(200);
});
```

## Metrics and Monitoring

The chaos tests help validate:

- **Availability**: System uptime during failures
- **Response Time**: Latency under various failure conditions
- **Error Rate**: Percentage of failed requests
- **Recovery Time**: Time to return to normal operation
- **Resource Usage**: Memory and CPU consumption under stress

## Troubleshooting

### Tests Timing Out

If chaos tests timeout:

1. Check the `testTimeout` setting in jest.config.js
2. Verify fake timers are being used correctly
3. Ensure promises are properly resolved/rejected
4. Increase timeout for specific tests if needed

### Memory Issues

If tests fail due to memory:

1. Enable garbage collection: `node --expose-gc`
2. Reduce concurrent request counts
3. Check for memory leaks in application code
4. Run tests individually to isolate issues

### Flaky Tests

If tests are inconsistent:

1. Use fixed seeds for random operations
2. Increase timeouts for network operations
3. Mock external dependencies consistently
4. Use Jest fake timers for time-based operations

## CI/CD Integration

Example CI/CD configuration:

```yaml
# .github/workflows/chaos-tests.yml
name: Chaos Tests

on:
  schedule:
    - cron: '0 2 * * *'  # Run nightly
  workflow_dispatch:      # Manual trigger

jobs:
  chaos:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:chaos
```

## Additional Resources

- [Principles of Chaos Engineering](https://principlesofchaos.org/)
- [Netflix Chaos Monkey](https://netflix.github.io/chaosmonkey/)
- [AWS Fault Injection Simulator](https://aws.amazon.com/fis/)

## Contributing

When adding new chaos tests:

1. Follow existing test structure and naming conventions
2. Document the chaos scenario being tested
3. Include recovery testing
4. Update this README with new test descriptions
5. Ensure tests are skippable with SKIP_CHAOS_TESTS
