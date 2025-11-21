# Performance Testing Suite

Comprehensive performance and chaos testing for the Cuts.ae API using Artillery.

## Overview

This directory contains four different types of performance tests:

1. **Load Test** - Gradual load increase to test normal scaling
2. **Stress Test** - Push system to breaking point
3. **Spike Test** - Sudden traffic bursts and recovery
4. **Endurance Test** - Sustained load to detect memory leaks

## Prerequisites

Before running tests, ensure:

1. **API Server is Running**
   ```bash
   cd /Users/sour/Projects/cuts.ae/api
   npm run dev
   ```

2. **Database is Accessible**
   - PostgreSQL must be running
   - Database must be seeded with test data

3. **Test Users Exist** (optional but recommended)
   Create test users in the database:
   - `loadtest@example.com` / `LoadTest123!`
   - `stresstest@example.com` / `StressTest123!`
   - `spiketest@example.com` / `SpikeTest123!`
   - `endurancetest@example.com` / `EnduranceTest123!`

## Running Tests

From the API directory (`/Users/sour/Projects/cuts.ae/api`):

### Load Test
Tests gradual load increase from 10 to 100 users/second over 5 minutes.

```bash
npm run test:load
```

**What it tests:**
- Gradual scaling behavior
- Response times under increasing load
- System stability during ramp-up

**Duration:** ~6 minutes

**Expected behavior:**
- Error rate < 1%
- P95 response time < 500ms
- P99 response time < 1000ms

---

### Stress Test
Pushes system to breaking point with 100 to 500 users/second.

```bash
npm run test:stress
```

**What it tests:**
- Maximum system capacity
- Failure modes under extreme load
- Recovery behavior

**Duration:** ~8 minutes

**Expected behavior:**
- Find the breaking point
- Error rate may reach 5%
- P99 response time < 2000ms

---

### Spike Test
Tests sudden traffic bursts (10 to 500 users/second in 30 seconds).

```bash
npm run test:spike
```

**What it tests:**
- Auto-scaling triggers
- Circuit breaker behavior
- System recovery after spikes

**Duration:** ~6 minutes

**Expected behavior:**
- Quick recovery after spikes
- Errors during spike are acceptable
- Normal performance between spikes

---

### Endurance Test
Sustained 50 users/second for 30 minutes to detect memory leaks.

```bash
npm run test:endurance
```

**What it tests:**
- Memory leaks
- Performance degradation over time
- Connection pool management
- Database connection leaks

**Duration:** ~35 minutes

**Expected behavior:**
- Consistent response times throughout
- No memory growth over time
- Error rate < 0.5%
- P95 < 400ms, P99 < 800ms

---

## Test Configuration

All tests are configured in YAML files with the following structure:

```yaml
config:
  target: "http://localhost:45000"
  phases: [...]           # Load phases
  variables: [...]        # Test variables
  ensure: [...]          # Performance thresholds
  plugins: [...]         # Artillery plugins
```

## Tested Endpoints

Tests cover the following endpoints:

### Public Endpoints (No Authentication)
- `GET /` - Root endpoint
- `GET /health` - Health check
- `GET /api/v1/restaurants` - List restaurants
- `GET /api/v1/restaurants/:id` - Get restaurant details
- `GET /api/v1/menu-items` - List menu items
- `GET /api/v1/menu-categories` - List categories

### Authentication Endpoints
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login

### Authenticated Endpoints
- `GET /api/v1/orders` - List orders (requires auth)
- `GET /api/v1/restaurants` - List restaurants (with auth)

## Understanding Results

### Key Metrics

**Response Time Percentiles:**
- **P50 (median)** - 50% of requests faster than this
- **P95** - 95% of requests faster than this
- **P99** - 99% of requests faster than this

**Error Rates:**
- **HTTP 200-299** - Success
- **HTTP 400-499** - Client errors
- **HTTP 500-599** - Server errors

**Request Rate:**
- **Requests per second** - Actual throughput
- **Arrival rate** - Target load

### Good Performance Indicators

1. **Stable response times** - No significant increases over time
2. **Low error rate** - < 1% for normal operations
3. **Consistent throughput** - Actual matches target arrival rate
4. **Flat memory usage** - No growth in endurance test

### Warning Signs

1. **Increasing response times** - May indicate resource exhaustion
2. **High error rate** - System overloaded or bugs
3. **Timeout errors** - Backend not responding
4. **Memory growth** - Potential memory leak

## Customizing Tests

### Change Target URL

Edit the `target` in any test file:

```yaml
config:
  target: "https://api.production.cuts.ae"
```

### Adjust Load Phases

Modify the `phases` array:

```yaml
phases:
  - duration: 60        # seconds
    arrivalRate: 10     # users per second
    rampTo: 50          # ramp to this rate
    name: "Custom phase"
```

### Update Performance Thresholds

Change the `ensure` section:

```yaml
ensure:
  maxErrorRate: 1    # Max error rate percentage
  p95: 500           # 95th percentile in ms
  p99: 1000          # 99th percentile in ms
```

### Add New Scenarios

Add to the `scenarios` array:

```yaml
scenarios:
  - name: "My custom test"
    weight: 20        # Relative weight (probability)
    flow:
      - get:
          url: "/api/v1/my-endpoint"
          expect:
            - statusCode: 200
```

## Advanced Usage

### Generate HTML Report

```bash
npm run test:load -- --output report.json
artillery report report.json
```

This creates an HTML report with detailed charts and statistics.

### Run with Custom Configuration

```bash
artillery run \
  --target http://staging.api.cuts.ae \
  --output results.json \
  performance/load-test.yml
```

### Monitor in Real-Time

Tests output real-time metrics to the console:

```
Summary report @ 14:30:15
  Scenarios launched:  600
  Scenarios completed: 598
  Requests completed:  2400
  Mean response time:  145 ms
  Error rate:          0.3%
```

### Continuous Monitoring

For production monitoring, integrate with:
- **StatsD/Graphite** - Time-series metrics
- **Datadog** - Full observability
- **New Relic** - APM integration

## Troubleshooting

### Port Already in Use
Ensure API is running on port 45000:
```bash
lsof -i :45000
```

### Connection Refused
Check if API server is running:
```bash
curl http://localhost:45000/health
```

### Database Connection Errors
Verify database is accessible:
```bash
psql -h localhost -U sour -d cuts_ae
```

### High Error Rates
- Check API logs for errors
- Verify database connection pool size
- Monitor system resources (CPU, memory)
- Check network connectivity

### Timeouts
Increase timeout in test config:
```yaml
http:
  timeout: 30  # seconds
```

## Best Practices

1. **Start Small** - Run load test before stress test
2. **Monitor Resources** - Watch CPU, memory, DB connections
3. **Run Regularly** - Include in CI/CD pipeline
4. **Baseline First** - Establish baseline metrics
5. **Test in Staging** - Never stress test production without planning
6. **Clean Data** - Reset database between tests if needed
7. **Document Results** - Track performance over time

## Integration with CI/CD

Add to your CI/CD pipeline:

```yaml
# Example GitHub Actions
- name: Performance Test
  run: |
    npm run dev &
    sleep 10
    npm run test:load
    kill %1
```

## Resources

- [Artillery Documentation](https://www.artillery.io/docs)
- [Performance Testing Best Practices](https://www.artillery.io/docs/guides/guides/best-practices)
- [Artillery Plugins](https://www.artillery.io/docs/guides/plugins/plugins-overview)

## Support

For issues or questions about performance testing:
1. Check Artillery documentation
2. Review test output and metrics
3. Examine API server logs
4. Monitor database performance

## Notes

- Tests use realistic user behavior with think times
- Authentication flows are included where applicable
- Tests verify both success and error scenarios
- Performance thresholds are based on expected load
