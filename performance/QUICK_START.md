# Performance Testing Quick Start

## TL;DR

```bash
# Run from /Users/sour/Projects/cuts.ae/api

# 1. Make sure API is running
npm run dev

# 2. In another terminal, run tests
npm run test:load      # 6 min - Gradual load 10-100 users/sec
npm run test:stress    # 8 min - Push to 500 users/sec
npm run test:spike     # 6 min - Sudden traffic bursts
npm run test:endurance # 35 min - Sustained load for memory leaks
```

## What Each Test Does

### Load Test (6 minutes)
- Tests: Normal scaling behavior
- Load: 10 to 100 users/second
- Use: Before releases to verify performance

### Stress Test (8 minutes)
- Tests: Breaking point and failure modes
- Load: 100 to 500 users/second
- Use: Find system limits

### Spike Test (6 minutes)
- Tests: Sudden traffic spikes and recovery
- Load: 10 users/sec with spikes to 500
- Use: Verify auto-scaling and recovery

### Endurance Test (35 minutes)
- Tests: Memory leaks and degradation
- Load: 50 users/second sustained
- Use: Before major releases

## First Time Setup

1. Ensure API is running on port 45000
2. Database should be accessible
3. (Optional) Create test users in database

## Reading Results

Real-time output shows:

```
Scenarios launched:  600     # Total virtual users
Requests completed:  2400    # Total HTTP requests
Mean response time:  145 ms  # Average latency
Error rate:          0.3%    # Failed requests
```

**Good indicators:**
- Error rate < 1%
- Response times stable
- No timeouts

**Warning signs:**
- Error rate > 5%
- Increasing response times
- Many timeouts

## Common Issues

**Connection refused:**
```bash
# Check API is running
curl http://localhost:45000/health
```

**High error rates:**
- Check API logs
- Monitor system resources
- Verify database connections

**Timeouts:**
- System may be overloaded
- Check for slow queries
- Monitor memory usage

## Next Steps

For detailed information, see [README.md](./README.md)
