# VoiceBridge - CI/CD Deployment Guide

## Overview

Deployment is fully automated via GitHub Actions. Every push to `main` triggers:
1. Build & Test
2. Build Docker Images (pushed to DigitalOcean Container Registry)
3. Deploy to DigitalOcean App Platform
4. Health Check verification

## Setup (One-time)

### Step 1: Create DigitalOcean Resources

Before first deployment, create these resources in [DigitalOcean Console](https://cloud.digitalocean.com):

#### 1.1 Create Container Registry
- Go to **Container Registry > Create Registry**
- Name: `voicebridge`
- Plan: **Starter (Free - 500MB)**

#### 1.2 Create PostgreSQL Database
- Go to **Databases > Create Database**
- Engine: **PostgreSQL 15**
- Region: **Bangalore (BLR1)**
- Plan: **Basic ($15/mo)**
- Name: `voicebridge-db`

#### 1.2 Create Redis Database
- Go to **Databases > Create Database**
- Engine: **Redis 7**
- Region: **Bangalore (BLR1)**
- Plan: **Basic ($15/mo)**
- Name: `voicebridge-redis`

#### 1.3 Create Spaces Bucket
- Go to **Spaces > Create Space**
- Region: **Bangalore (BLR1)**
- Name: `voicebridge-uploads`

#### 1.4 Generate API Tokens
- Go to **API > Tokens > Generate New Token**
- Name: `github-actions`
- Scope: **Read & Write**
- Copy the token (you won't see it again)

#### 1.5 Generate Spaces Keys
- Go to **API > Spaces Keys > Generate New Key**
- Copy both Key and Secret

### Step 2: Configure GitHub Secrets

Go to **GitHub > Your Repo > Settings > Secrets and variables > Actions**

Add these secrets:

#### Required Secrets

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `DIGITALOCEAN_ACCESS_TOKEN` | DO API Token | API > Tokens |
| `DATABASE_URL` | PostgreSQL connection string | Databases > voicebridge-db > Connection Details > URI |
| `REDIS_URL` | Redis connection string | Databases > voicebridge-redis > Connection Details > URI |
| `JWT_SECRET` | Auth secret (32+ chars) | Generate: `openssl rand -base64 32` |
| `OPENAI_API_KEY` | OpenAI API key | platform.openai.com |
| `DO_SPACES_KEY` | Spaces access key | API > Spaces Keys |
| `DO_SPACES_SECRET` | Spaces secret key | API > Spaces Keys |

#### Optional Secrets (for full features)

| Secret Name | Service |
|-------------|---------|
| `DEEPGRAM_API_KEY` | Speech-to-text |
| `SARVAM_API_KEY` | Indian language AI |
| `ELEVENLABS_API_KEY` | Premium TTS |
| `PLIVO_AUTH_ID` | Voice calls |
| `PLIVO_AUTH_TOKEN` | Voice calls |
| `PLIVO_PHONE_NUMBER` | Voice calls |
| `EXOTEL_SID` | Voice calls (India) |
| `EXOTEL_API_KEY` | Voice calls (India) |
| `EXOTEL_API_TOKEN` | Voice calls (India) |
| `RAZORPAY_KEY_ID` | Payments |
| `RAZORPAY_KEY_SECRET` | Payments |
| `SMTP_USER` | Email |
| `SMTP_PASS` | Email |
| `SLACK_WEBHOOK_URL` | Deployment notifications |

### Step 3: Configure DigitalOcean App Secrets

After first deployment, add secrets in DigitalOcean Console:

1. Go to **Apps > voicebridge > Settings**
2. Click **App-Level Environment Variables**
3. Add each secret with type **Secret**

## Deployment Triggers

### Automatic Deployment
- **Push to `main`** → Deploys to Production
- **Push to `staging`** → Deploys to Staging (if configured)

### Manual Deployment
1. Go to **GitHub > Actions > CI/CD Pipeline**
2. Click **Run workflow**
3. Select environment and options
4. Click **Run workflow**

## Pipeline Stages

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Build &    │────▶│   Deploy    │────▶│   Notify    │
│    Test     │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │
      ▼                   ▼                   ▼
 - npm install       - Update spec       - Slack/Email
 - TypeScript        - Create deploy     - GitHub Summary
 - Lint              - Health check
 - Build
```

## Monitoring Deployments

### GitHub Actions
- Go to **Actions** tab to see all runs
- Click on a run to see detailed logs
- Check **Summary** for deployment URL

### DigitalOcean Console
```
Apps > voicebridge > Activity
```

### CLI (Optional)
```bash
# Install doctl
brew install doctl  # Mac
choco install doctl # Windows

# Authenticate
doctl auth init

# View logs
doctl apps logs <app-id> --type=run --follow

# List deployments
doctl apps list-deployments <app-id>
```

## Rollback

### Via GitHub
1. Go to **Actions > CI/CD Pipeline**
2. Find the last successful deployment
3. Click **Re-run all jobs**

### Via DigitalOcean Console
1. Go to **Apps > voicebridge > Activity**
2. Find previous successful deployment
3. Click **Rollback to this deployment**

## Environment Variables

All environment variables are managed as secrets:
- **GitHub Secrets** - For CI/CD pipeline
- **DigitalOcean App Secrets** - For runtime

Never commit `.env.production` with real values.

## Cost Breakdown

| Resource | Monthly Cost |
|----------|--------------|
| App Platform (API) | ~$12 |
| Static Site (Frontend) | Free |
| PostgreSQL (Basic) | $15 |
| Redis (Basic) | $15 |
| Spaces (250GB) | $5 |
| **Total** | **~$47/month** |

## Custom Domain

1. Go to **Apps > voicebridge > Settings > Domains**
2. Click **Add Domain**
3. Enter your domain: `app.yourdomain.com`
4. Add DNS record:
   ```
   Type: CNAME
   Name: app
   Value: <your-app>.ondigitalocean.app
   ```
5. SSL is auto-provisioned

## Troubleshooting

### Deployment Failed
1. Check **GitHub Actions** logs
2. Check **DigitalOcean > Apps > Activity** for build logs
3. Verify all secrets are configured

### Health Check Failed
- Check `/api/health` endpoint
- Increase `initial_delay_seconds` in `.do/app.yaml`
- Check runtime logs in DigitalOcean

### Database Connection Error
- Verify `DATABASE_URL` format includes `?sslmode=require`
- Check database is in same region (BLR1)
- Verify database firewall allows App Platform

## File Reference

| File | Purpose |
|------|---------|
| `.github/workflows/deploy-digitalocean.yml` | CI/CD pipeline |
| `.do/app.yaml` | DigitalOcean App spec |
| `.env.production` | Environment template (don't commit real values) |
| `deploy/.env.digitalocean.example` | Reference for DO variables |
