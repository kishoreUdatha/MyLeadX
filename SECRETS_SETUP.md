# VoiceBridge - Secrets Setup Checklist

## GitHub Repository Secrets

Go to: **GitHub > Repository > Settings > Secrets and variables > Actions > New repository secret**

### Required (Deployment will fail without these)

- [ ] `DIGITALOCEAN_ACCESS_TOKEN`
  ```
  Get from: DigitalOcean > API > Tokens > Generate New Token
  Permissions: Read & Write
  ```

### Required (App will fail without these)

After first deployment, these must be added to **DigitalOcean App Settings**:

- [ ] `DATABASE_URL`
  ```
  Format: postgresql://user:password@host:25060/defaultdb?sslmode=require
  Get from: DigitalOcean > Databases > voicebridge-db > Connection Details
  ```

- [ ] `REDIS_URL`
  ```
  Format: rediss://default:password@host:25061
  Get from: DigitalOcean > Databases > voicebridge-redis > Connection Details
  ```

- [ ] `JWT_SECRET`
  ```
  Generate: openssl rand -base64 32
  Example: K7xP2mN9qR4sT6vW8yB1cD3eF5gH7jL9
  ```

- [ ] `OPENAI_API_KEY`
  ```
  Get from: https://platform.openai.com/api-keys
  Format: sk-...
  ```

- [ ] `DO_SPACES_KEY`
  ```
  Get from: DigitalOcean > API > Spaces Keys
  ```

- [ ] `DO_SPACES_SECRET`
  ```
  Get from: DigitalOcean > API > Spaces Keys
  ```

## DigitalOcean App Environment Variables

Go to: **DigitalOcean > Apps > voicebridge > Settings > App-Level Environment Variables**

### Add as Secrets (Encrypted)

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `postgresql://...` |
| `REDIS_URL` | `rediss://...` |
| `JWT_SECRET` | `<generated>` |
| `OPENAI_API_KEY` | `sk-...` |
| `DO_SPACES_KEY` | `<key>` |
| `DO_SPACES_SECRET` | `<secret>` |

### Optional Secrets (Add as needed)

#### AI Services
| Variable | Service | Get from |
|----------|---------|----------|
| `DEEPGRAM_API_KEY` | Speech-to-text | console.deepgram.com |
| `SARVAM_API_KEY` | Indian languages | sarvam.ai |
| `ELEVENLABS_API_KEY` | Premium TTS | elevenlabs.io |
| `ANTHROPIC_API_KEY` | Claude AI | console.anthropic.com |
| `GROQ_API_KEY` | Fast inference | console.groq.com |

#### Telephony (Choose one or more)
| Variable | Service | Get from |
|----------|---------|----------|
| `PLIVO_AUTH_ID` | Plivo | console.plivo.com |
| `PLIVO_AUTH_TOKEN` | Plivo | console.plivo.com |
| `PLIVO_PHONE_NUMBER` | Plivo | console.plivo.com |
| `EXOTEL_SID` | Exotel | my.exotel.com |
| `EXOTEL_API_KEY` | Exotel | my.exotel.com |
| `EXOTEL_API_TOKEN` | Exotel | my.exotel.com |
| `TWILIO_ACCOUNT_SID` | Twilio | console.twilio.com |
| `TWILIO_AUTH_TOKEN` | Twilio | console.twilio.com |

#### Payments
| Variable | Service | Get from |
|----------|---------|----------|
| `RAZORPAY_KEY_ID` | Razorpay | dashboard.razorpay.com |
| `RAZORPAY_KEY_SECRET` | Razorpay | dashboard.razorpay.com |

#### Email
| Variable | Value |
|----------|-------|
| `SMTP_USER` | your-email@gmail.com |
| `SMTP_PASS` | Gmail App Password |

#### WhatsApp
| Variable | Get from |
|----------|----------|
| `WHATSAPP_ACCESS_TOKEN` | developers.facebook.com |
| `WHATSAPP_PHONE_NUMBER_ID` | developers.facebook.com |

## Verification Checklist

After setup, verify:

- [ ] GitHub Actions can connect to DigitalOcean
  ```
  Check: Actions tab > Latest run > "Check DigitalOcean authentication" step
  ```

- [ ] App deploys successfully
  ```
  Check: DigitalOcean > Apps > voicebridge > Activity
  ```

- [ ] Health check passes
  ```
  Visit: https://<your-app>.ondigitalocean.app/api/health
  Expected: {"status":"ok"}
  ```

- [ ] Database connected
  ```
  Check: App logs for "Database connected" message
  ```

- [ ] Redis connected
  ```
  Check: App logs for "Redis connected" message
  ```

## Quick Commands

```bash
# Generate JWT secret
openssl rand -base64 32

# Generate refresh token secret
openssl rand -base64 32

# Test OpenAI key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Test database connection
psql "postgresql://user:pass@host:25060/defaultdb?sslmode=require" -c "SELECT 1"
```

## Troubleshooting

### "DIGITALOCEAN_ACCESS_TOKEN not found"
- Ensure secret is added to GitHub repository (not organization)
- Check secret name matches exactly (case-sensitive)

### "Database connection failed"
- Verify DATABASE_URL includes `?sslmode=require`
- Check database is in same region as app (BLR1)
- Verify database allows connections from App Platform

### "Redis connection failed"
- Use `rediss://` (with double s) for SSL
- Default port is 25061 for managed Redis

### "OpenAI API error"
- Verify API key starts with `sk-`
- Check OpenAI account has credits/billing enabled
