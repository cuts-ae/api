# Performance Metrics Guide

## Understanding Artillery Metrics

### Response Time Metrics

**Response Time Percentiles:**
- **min** - Fastest response time recorded
- **max** - Slowest response time recorded
- **median (p50)** - 50% of requests faster than this value
- **p95** - 95% of requests faster than this value
- **p99** - 99% of requests faster than this value

**What They Mean:**
- **P50 (Median)** - Typical user experience
- **P95** - Most users' experience (excludes outliers)
- **P99** - Worst-case for 99% of users
- **Max** - Absolute worst case

**Good Targets:**
- P50: < 100ms
- P95: < 500ms
- P99: < 1000ms
- Max: < 3000ms

### Throughput Metrics

**Requests:**
- **Total requests** - All HTTP requests made
- **Requests per second** - Throughput rate
- **Successful requests** - HTTP 2xx responses
- **Failed requests** - HTTP 4xx/5xx responses

**Scenarios:**
- **Launched** - Virtual users started
- **Completed** - Virtual users finished
- **Abandoned** - Virtual users that timed out

### Error Metrics

**Error Rate:**
```
Error Rate = (Failed Requests / Total Requests) × 100
```

**Error Thresholds:**
- **< 0.1%** - Excellent
- **0.1% - 1%** - Good
- **1% - 5%** - Acceptable under stress
- **> 5%** - Problem detected

**HTTP Status Codes:**
- **200-299** - Success
- **300-399** - Redirects (usually OK)
- **400-499** - Client errors (bad requests)
- **500-599** - Server errors (system problems)

## Reading Test Output

### Real-Time Output

```
Summary report @ 14:30:15
  Scenarios launched:  600
  Scenarios completed: 598
  Requests completed:  2400
  Mean response time:  145 ms
  Response time (msec):
    min: 15
    max: 850
    median: 120
    p95: 380
    p99: 650
  Scenario duration:
    min: 450
    max: 5200
    median: 2100
  Codes:
    200: 2350
    401: 25
    404: 15
    500: 10
```

**Analysis:**
- 598/600 scenarios completed (99.7% completion rate) - GOOD
- 2400 requests made
- Mean 145ms, median 120ms - GOOD
- P95 380ms < 500ms threshold - GOOD
- P99 650ms < 1000ms threshold - GOOD
- 2350/2400 successful (97.9% success) - GOOD
- 10 server errors (0.4% error rate) - ACCEPTABLE

### Warning Signs

**Increasing Response Times:**
```
Summary @ 14:30:15 - p95: 380ms
Summary @ 14:31:15 - p95: 520ms  ⚠️
Summary @ 14:32:15 - p95: 850ms  ⚠️⚠️
Summary @ 14:33:15 - p95: 1200ms ❌
```
This indicates system degradation or resource exhaustion.

**High Error Rates:**
```
Codes:
  200: 1500
  500: 900  ❌ (37.5% error rate)
```
System is overloaded or has bugs.

**Timeouts:**
```
Scenarios launched:  600
Scenarios completed: 450  ❌ (75% completion)
```
Many scenarios didn't complete - system unresponsive.

## Test-Specific Expectations

### Load Test (10-100 users/sec)

**Expected Metrics:**
- Completion rate: > 99%
- Error rate: < 1%
- P95: < 500ms throughout
- P99: < 1000ms throughout
- Response times stay flat or increase slightly

**Red Flags:**
- Response times increase significantly
- Error rate > 1%
- Timeouts occur
- Completion rate < 95%

### Stress Test (100-500 users/sec)

**Expected Metrics:**
- Completion rate: > 90% (some failures OK)
- Error rate: < 5% average
- P95: < 1000ms
- P99: < 2000ms
- System finds breaking point

**Red Flags:**
- Complete system failure
- Error rate > 10%
- Cascading failures
- No recovery after load decreases

### Spike Test (10 → 500 → 10 users/sec)

**Expected Metrics:**
- Normal periods: < 1% errors, P95 < 500ms
- Spike periods: < 10% errors acceptable
- Recovery: Back to normal within 30 seconds
- No lasting degradation

**Red Flags:**
- System doesn't recover
- Performance worse after spike
- Cascading failures
- Complete unavailability during spike

### Endurance Test (50 users/sec × 30 min)

**Expected Metrics:**
- Consistent response times (no upward trend)
- Flat memory usage
- Error rate: < 0.5%
- P95: < 400ms throughout
- No degradation over time

**Red Flags:**
- Response times increase over time
- Memory usage grows continuously
- Error rate increases over time
- Connection pool exhaustion

## System Monitoring

### What to Monitor During Tests

**API Server:**
```bash
# CPU usage
top -pid $(pgrep -f "node.*api")

# Memory usage
ps aux | grep node

# Open connections
lsof -p $(pgrep -f "node.*api") | wc -l
```

**Database:**
```sql
-- Active connections
SELECT count(*) FROM pg_stat_activity;

-- Long-running queries
SELECT pid, now() - query_start as duration, query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC;

-- Locks
SELECT * FROM pg_locks WHERE NOT granted;
```

**System Resources:**
```bash
# Overall system
htop

# Network connections
netstat -an | grep ESTABLISHED | wc -l

# Disk I/O
iostat -x 1
```

### Healthy System Indicators

**During Load Test:**
- CPU: 40-70% (has headroom)
- Memory: Stable, not growing
- DB Connections: < 50% of pool
- Response times: Flat
- No errors in logs

**During Stress Test:**
- CPU: 70-90% (approaching limits)
- Memory: Stable or slight growth
- DB Connections: < 80% of pool
- Response times: Acceptable degradation
- Some errors expected

**During Endurance Test:**
- CPU: Consistent (40-60%)
- Memory: Absolutely flat
- DB Connections: Stable number
- Response times: Perfectly flat
- Minimal errors

## Interpreting Results

### Excellent Performance
```
✓ Error rate: 0.1%
✓ P50: 80ms
✓ P95: 250ms
✓ P99: 450ms
✓ Throughput: Matches target load
✓ No timeouts
```
System handles load easily, has capacity for growth.

### Good Performance
```
✓ Error rate: 0.5%
✓ P50: 120ms
✓ P95: 480ms
✓ P99: 900ms
✓ Throughput: Matches target load
~ Occasional slow requests
```
System meets requirements, minor optimization possible.

### Acceptable Performance
```
~ Error rate: 2%
~ P50: 200ms
✓ P95: 650ms (within threshold)
~ P99: 1200ms (slightly over)
✓ Throughput: Mostly matches target
~ Some timeouts under peak
```
System works but needs optimization for production.

### Poor Performance
```
❌ Error rate: 8%
❌ P50: 500ms
❌ P95: 2000ms
❌ P99: 5000ms
❌ Throughput: 50% of target
❌ Many timeouts
```
System cannot handle load, major issues exist.

## Common Bottlenecks

### Database
**Symptoms:**
- Slow response times
- High P99
- Database CPU at 100%

**Solutions:**
- Add indexes
- Optimize queries
- Increase connection pool
- Add read replicas

### Memory
**Symptoms:**
- Increasing response times
- Growing memory usage
- Eventually OOM errors

**Solutions:**
- Fix memory leaks
- Increase heap size
- Improve garbage collection
- Reduce in-memory caching

### CPU
**Symptoms:**
- Consistent high CPU
- Slow processing
- Queue buildup

**Solutions:**
- Optimize algorithms
- Scale horizontally
- Add caching
- Reduce computation

### Network
**Symptoms:**
- Timeouts
- Connection refused
- High latency

**Solutions:**
- Increase connection limits
- Optimize payload sizes
- Add load balancer
- Use connection pooling

## Action Items by Metric

### If Error Rate > Threshold

1. **Check logs** for error patterns
2. **Identify** which endpoints fail
3. **Determine** error types (4xx vs 5xx)
4. **Fix** bugs or increase capacity
5. **Re-test** to verify fix

### If Response Time > Threshold

1. **Profile** slow endpoints
2. **Check** database query times
3. **Review** external API calls
4. **Optimize** slow code paths
5. **Add** caching if appropriate

### If Completion Rate < 95%

1. **Check** for timeouts
2. **Review** timeout settings
3. **Increase** timeouts if appropriate
4. **Fix** hanging operations
5. **Scale** resources if needed

### If Memory Grows

1. **Take** heap snapshots
2. **Identify** memory leaks
3. **Fix** resource cleanup
4. **Verify** garbage collection
5. **Monitor** after fixes

## Benchmarking Tips

1. **Establish Baseline** - Run tests before changes
2. **One Change at a Time** - Isolate variables
3. **Multiple Runs** - Average results
4. **Document Everything** - Keep records
5. **Track Over Time** - Spot trends
6. **Test Realistic Scenarios** - Match production patterns
7. **Monitor System** - Not just Artillery output
8. **Test Different Times** - Database load varies
9. **Clean State** - Reset between tests
10. **Share Results** - Team visibility

## Further Reading

- Artillery Metrics: https://www.artillery.io/docs/guides/guides/metrics
- Performance Testing: https://martinfowler.com/articles/practical-test-pyramid.html
- SLOs and SLIs: https://sre.google/sre-book/service-level-objectives/
