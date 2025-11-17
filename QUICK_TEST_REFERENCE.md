# Quick Test Reference

## Run Tests

```bash
npm test                 # All tests with coverage
npm run test:watch       # Watch mode
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only
npm run test:e2e         # E2E tests only
```

## Test Count

- **Total**: 113+ test cases across 10 test suites
- **Unit Tests**: 151 tests (middleware, utilities)
- **Integration Tests**: 343 tests (auth, restaurants, menu, orders)
- **E2E Tests**: 94 tests (complete workflows)

## Coverage

Current thresholds: 70% for statements, branches, functions, and lines

## Test Files

```
src/__tests__/
├── unit/
│   ├── middleware.test.ts      (89 tests)
│   └── nutrition.test.ts       (62 tests)
├── integration/
│   ├── auth.test.ts           (23 tests)
│   ├── restaurant.test.ts     (75 tests)
│   ├── menu.test.ts           (124 tests)
│   └── order.test.ts          (121 tests)
└── e2e/
    └── complete-workflow.test.ts (94 tests)
```

## Prerequisites

1. PostgreSQL running on localhost:5432
2. Test database created: `cuts_ae_test`
3. Environment variables configured in `.env.test`
4. Dependencies installed: `npm install`

## Quick Setup

```bash
# Create test database
psql -U postgres -c "CREATE DATABASE cuts_ae_test;"

# Update .env.test with your credentials
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=cuts_ae_test
# DB_USER=postgres
# DB_PASSWORD=your_password

# Run tests
npm test
```

## Key Test Features

- Comprehensive endpoint coverage (auth, restaurants, menu, orders)
- Authentication and authorization testing
- Input validation testing
- Error handling testing
- Database integration testing
- Automatic test data cleanup
- Coverage reporting

## Troubleshooting

**Tests hang**: Check database connections are closed in `afterAll()`
**Connection refused**: Ensure PostgreSQL is running
**Port in use**: Kill process: `lsof -ti:45002 | xargs kill -9`

## Documentation

- Full details: `TEST_SUMMARY.md`
- Complete guide: `TESTING_GUIDE.md`
- Jest config: `jest.config.js`
