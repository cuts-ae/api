# GitHub Actions CI/CD Setup Guide

## Overview

All Cuts.ae repositories now have automated CI/CD pipelines with GitHub Actions. Tests run automatically on every push and pull request to ensure code quality.

## Repositories with CI/CD

1. **API** (https://github.com/cuts-ae/api) - Comprehensive testing with PostgreSQL
2. **Web** (https://github.com/cuts-ae/web) - Build and lint verification
3. **Restaurant** (https://github.com/cuts-ae/restaurant) - Build and lint verification
4. **Admin** (https://github.com/cuts-ae/admin) - Build and lint verification
5. **Support** (https://github.com/cuts-ae/support) - Build and lint verification

## API Repository Testing

### What Runs on Every Push

1. **Linting** - ESLint checks for code quality
2. **Unit Tests** - 1,500+ tests covering controllers, middleware, validators, services
3. **Integration Tests** - Full HTTP request/response testing for all endpoints
4. **Coverage Reports** - Generates coverage summary and uploads to Codecov

### Test Visibility

On GitHub:
1. Go to https://github.com/cuts-ae/api/actions
2. Click on any workflow run
3. Expand "Run unit tests" or "Run integration tests" to see all test results
4. Each test file shows individual test results with pass/fail status

### Test Results Display

The GitHub Actions workflow displays:
- **Test Suites**: Number of test files run
- **Tests**: Total number of individual tests
- **Coverage**: Statement, Branch, Function, and Line coverage percentages
- **Failed Tests**: Detailed error messages for any failures

Example output:
```
Test Suites: 29 passed, 29 total
Tests:       1,522 passed, 1,522 total
Snapshots:   0 total
Time:        45.234 s

Coverage summary:
  Statements   : 85.23% ( 1234/1448 )
  Branches     : 78.45% ( 456/581 )
  Functions    : 92.11% ( 789/857 )
  Lines        : 84.67% ( 1198/1415 )
```

### PostgreSQL Service

The API workflow includes a PostgreSQL 15 service container:
- Automatically starts before tests
- Health checks ensure database is ready
- Tests run against a clean test database
- Database is destroyed after tests complete

### Coverage Reporting

Coverage is reported in multiple ways:
1. **Console Output**: Text summary in GitHub Actions logs
2. **HTML Report**: Generated in `coverage/` directory
3. **Codecov**: Uploaded to Codecov for historical tracking (if configured)
4. **PR Comments**: Coverage summary posted to pull requests

## Frontend Repositories Testing

### What Runs on Every Push

1. **Dependency Installation** - npm ci for clean install
2. **Linting** - ESLint checks
3. **Type Checking** - TypeScript compiler checks (no emit)
4. **Build** - Next.js production build
5. **Tests** - Any configured tests (if present)

### Build Verification

The workflows verify that:
- All TypeScript types are correct
- No linting errors exist
- The application builds successfully for production
- Environment variables are properly configured

## Viewing Test Results

### On GitHub Web Interface

1. Navigate to the repository (e.g., https://github.com/cuts-ae/api)
2. Click the "Actions" tab
3. Click on any workflow run to see details
4. Expand individual steps to see output

### On Pull Requests

When you create a pull request:
1. GitHub Actions runs automatically
2. Status checks appear at the bottom of the PR
3. Green checkmark = all tests passed
4. Red X = tests failed (click for details)
5. Coverage summary is posted as a comment (API only)

### Via Status Badges

You can add badges to README files:

```markdown
![API Tests](https://github.com/cuts-ae/api/workflows/API%20Tests/badge.svg)
![Web Build](https://github.com/cuts-ae/web/workflows/Web%20Tests/badge.svg)
```

## Workflow Configuration Files

All workflows are in `.github/workflows/test.yml`:

- **API**: `/api/.github/workflows/test.yml` - Full test suite with PostgreSQL
- **Web**: `/web/.github/workflows/test.yml` - Build and lint
- **Restaurant**: `/restaurant/.github/workflows/test.yml` - Build and lint
- **Admin**: `/admin/.github/workflows/test.yml` - Build and lint
- **Support**: `/support/.github/workflows/test.yml` - Build and lint

## Running Tests Locally

Before pushing, you can run the same tests locally:

### API Tests

```bash
cd api

# Run all tests
npm test

# Run unit tests only
npm test -- --testPathIgnorePatterns=integration

# Run integration tests only
npm test -- --testPathPatterns=integration

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- auth.controller.test.ts

# Watch mode for development
npm run test:watch
```

### Frontend Builds

```bash
cd web  # or restaurant, admin, support

# Run linter
npm run lint

# Type check
npx tsc --noEmit

# Build for production
npm run build

# Run tests (if configured)
npm test
```

## Troubleshooting

### Tests Failing on GitHub but Passing Locally

1. **Environment Variables**: GitHub Actions uses `.env.test` - check the workflow file
2. **Node Version**: Workflow uses Node 20.x - verify with `node --version`
3. **PostgreSQL**: Ensure tests aren't relying on local database state
4. **Timing Issues**: Tests have 30s timeout, may need adjustment for slower CI

### Build Failures

1. **TypeScript Errors**: Run `npx tsc --noEmit` locally
2. **Lint Errors**: Run `npm run lint` and fix issues
3. **Missing Dependencies**: Ensure `package-lock.json` is committed
4. **Environment Variables**: Check workflow file has required vars

### Coverage Threshold Failures

The API has coverage thresholds set in `jest.config.js`:
```javascript
coverageThreshold: {
  global: {
    branches: 70,
    functions: 70,
    lines: 70,
    statements: 70
  }
}
```

If coverage drops below these values, tests will fail.

## Customizing Workflows

### Adding More Tests

Edit `.github/workflows/test.yml` in the repository:

```yaml
- name: Run custom tests
  run: npm run test:custom
```

### Changing Node Version

Update the matrix strategy:

```yaml
strategy:
  matrix:
    node-version: [18.x, 20.x, 21.x]
```

### Adding Database Migrations

Add a step before tests:

```yaml
- name: Run migrations
  run: npm run migrate
  env:
    DATABASE_URL: postgresql://postgres:postgres@localhost:5432/cuts_test
```

### Deploying on Success

Add deployment steps after tests pass:

```yaml
- name: Deploy to production
  if: github.ref == 'refs/heads/main' && github.event_name == 'push'
  run: npm run deploy
  env:
    DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
```

## GitHub Secrets

For sensitive data in workflows, use GitHub Secrets:

1. Go to repository Settings
2. Click "Secrets and variables" → "Actions"
3. Click "New repository secret"
4. Add secrets like:
   - `DATABASE_URL_PRODUCTION`
   - `DEPLOY_KEY`
   - `API_TOKEN`

Reference in workflows with `${{ secrets.SECRET_NAME }}`

## Test Report Artifacts

The API workflow can save test artifacts:

```yaml
- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: test-results
    path: coverage/
```

Download artifacts from the workflow run page.

## Performance

### API Tests
- **Duration**: ~45-60 seconds
- **Parallelization**: Uses `maxWorkers=2` for faster runs
- **Caching**: npm dependencies cached between runs

### Frontend Builds
- **Duration**: ~30-45 seconds per portal
- **Caching**: npm and Next.js build cache enabled
- **Type Checking**: Runs in parallel with linting

## Next Steps

1. **Add E2E Tests**: Playwright or Cypress for API
2. **Add Visual Regression**: Percy or Chromatic for frontends
3. **Add Performance Tests**: Lighthouse CI for web vitals
4. **Add Security Scans**: Snyk or Dependabot
5. **Add Deployment**: Auto-deploy on main branch push

## Support

For issues with CI/CD:
- Check workflow logs in GitHub Actions tab
- Review `TESTING_PROGRESS.md` in API repository
- Check individual test files in `src/__tests__/`

---

**Generated with Claude Code (https://claude.com/claude-code)**

Last Updated: 2025-11-20
