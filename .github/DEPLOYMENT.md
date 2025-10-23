# GitHub Actions Deployment Setup

This repository is configured to automatically deploy to Oracle Cloud on every push to `main` branch.

## Prerequisites

You need to add these secrets to your GitHub repository:

### Step 1: Get Your Oracle SSH Private Key

Your Oracle Cloud SSH key is located at:
```
/Users/sour/Documents/livia stuff/livia-prod-1-uksouth.key
```

Copy the **entire contents** of this file (including `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----`)

### Step 2: Add GitHub Secrets

Go to: https://github.com/cuts-ae/api/settings/secrets/actions

Click **"New repository secret"** and add the following:

#### 1. `ORACLE_SSH_KEY`
- Value: Paste the entire contents of your SSH private key
- This allows GitHub Actions to SSH into your Oracle server

#### 2. `ORACLE_HOST`
- Value: `84.8.146.121`
- This is your Oracle Cloud server's public IP

#### 3. `ORACLE_USER`
- Value: `ubuntu`
- This is the SSH username for your Oracle server

#### 4. `SUPABASE_URL`
- Value: `https://rqrzcxwcgcyzewnkxfgd.supabase.co`
- Used for running tests in CI

#### 5. `SUPABASE_ANON_KEY`
- Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxcnpjeHdjZ2N5emV3bmt4ZmdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNTIyNDMsImV4cCI6MjA3NjcyODI0M30.FDW60VKZIV8htPXXWZWXMwgjsaI6zKt-3yGI3B92RsU`

#### 6. `SUPABASE_SERVICE_KEY`
- Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxcnpjeHdjZ2N5emV3bmt4ZmdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTE1MjI0MywiZXhwIjoyMDc2NzI4MjQzfQ.5lXw4SgNW3hPF5d_APjLqiZKXM4YSup3KEH6aeQ45Ck`

## How It Works

### Workflow Triggers

The deployment workflow (`.github/workflows/deploy.yml`) runs when:
1. You push to `main` branch
2. You manually trigger it from GitHub Actions tab

### Deployment Steps

1. **Test Job:**
   - Checks out code
   - Installs dependencies
   - Runs unit tests
   - Builds TypeScript

2. **Deploy Job:** (only runs if tests pass)
   - Builds production bundle
   - Creates deployment package
   - SSHs into Oracle Cloud server
   - Backs up current version
   - Extracts new version
   - Installs production dependencies
   - Restarts API with PM2
   - Verifies health endpoint

### Manual Deployment Trigger

You can manually trigger a deployment from:
https://github.com/cuts-ae/api/actions/workflows/deploy.yml

Click "Run workflow" → Select branch → Run

## First Deployment

After setting up the secrets, push your code:

```bash
git add .
git commit -m "Initial commit with CI/CD setup"
git push -u origin main
```

Then go to https://github.com/cuts-ae/api/actions to watch the deployment.

## Rollback

If a deployment fails, you can SSH into the server and restore from backup:

```bash
ssh oracle
cd ~/cuts.ae
pm2 stop cuts-api

# List backups
ls -lt ~/backups/

# Restore a backup (replace timestamp)
tar -xzf ~/backups/cuts-api-20231223_143000.tar.gz

pm2 restart cuts-api
```

## Production URLs

- API Base: http://84.8.146.121:45000
- Health Check: http://84.8.146.121:45000/health
- API Docs: http://84.8.146.121:45000/api/v1

## Monitoring

Check logs on the server:

```bash
ssh oracle
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
pm2 logs cuts-api
pm2 monit
```
