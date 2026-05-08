# Partner Admission Application Portal - Deployment Guide

## Overview

This document covers the deployment and configuration of the Partner Admission Application & Payment Tracking Portal, including all backend services, frontend applications, and required integrations.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [Database Setup](#database-setup)
4. [Backend Deployment](#backend-deployment)
5. [Frontend Deployment](#frontend-deployment)
6. [Integration Setup](#integration-setup)
7. [Testing](#testing)
8. [Monitoring](#monitoring)

---

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+ (for sessions & caching)
- AWS S3 or compatible storage (for documents)
- Razorpay account (for payments)
- SMS gateway (MSG91, Twilio, etc.)
- WhatsApp Business API (optional)

---

## Environment Variables

### Backend (.env)

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/voicebridge?schema=public"
REDIS_URL="redis://localhost:6379"

# JWT Secrets
JWT_SECRET="your-main-jwt-secret-min-32-chars"
JWT_PARTNER_SECRET="your-partner-portal-jwt-secret"
JWT_STUDENT_SECRET="your-student-portal-jwt-secret"

# App Configuration
NODE_ENV="production"
PORT=3000
FRONTEND_URL="https://app.yourcrm.com"
PARTNER_PORTAL_URL="https://partner.yourcrm.com"

# OTP Configuration
DEFAULT_OTP="123456"  # Remove in production
SKIP_OTP_DELIVERY="false"  # Set to true for testing
OTP_EXPIRY_MINUTES=10

# Razorpay
RAZORPAY_KEY_ID="rzp_live_xxxxx"
RAZORPAY_KEY_SECRET="your-razorpay-secret"
RAZORPAY_WEBHOOK_SECRET="your-webhook-secret"

# SMS Gateway (MSG91)
MSG91_AUTH_KEY="your-msg91-auth-key"
MSG91_SENDER_ID="YOURCO"
MSG91_TEMPLATE_IDS_OTP="template-id-for-otp"

# WhatsApp (Interakt/Wati/Meta)
WHATSAPP_API_URL="https://api.interakt.ai/v1/public/message/"
WHATSAPP_API_KEY="your-whatsapp-api-key"

# Email (SendGrid/SES)
SENDGRID_API_KEY="SG.xxxxx"
EMAIL_FROM="noreply@yourcrm.com"
EMAIL_FROM_NAME="Your CRM"

# File Storage (AWS S3)
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret"
AWS_REGION="ap-south-1"
AWS_S3_BUCKET="voicebridge-documents"
AWS_S3_URL="https://voicebridge-documents.s3.ap-south-1.amazonaws.com"

# Application Defaults
DEFAULT_PARTNER_PASSWORD="Welcome@123"
COMMISSION_APPROVAL_REQUIRED="true"
AUTO_NOTIFY_STATUS_CHANGES="true"
```

### Frontend (.env)

```bash
VITE_API_URL="https://api.yourcrm.com/api"
VITE_RAZORPAY_KEY_ID="rzp_live_xxxxx"
VITE_PARTNER_PORTAL_URL="https://partner.yourcrm.com"
VITE_STUDENT_PORTAL_URL="https://yourcrm.com"
```

---

## Database Setup

### 1. Run Migrations

```bash
cd backend
npx prisma migrate deploy
```

### 2. Generate Prisma Client

```bash
npx prisma generate
```

### 3. Seed Initial Data (Optional)

```bash
npx prisma db seed
```

### Key Tables Created

| Table | Purpose |
|-------|---------|
| `AdmissionPartner` | Partner accounts & hierarchy |
| `PartnerApplication` | Student applications |
| `PartnerApplicationDocument` | Uploaded documents |
| `PartnerApplicationPayment` | Payment records |
| `PartnerWallet` | Partner wallet balances |
| `PartnerWalletTransaction` | Wallet transaction history |
| `PartnerPayout` | Payout requests |
| `PartnerCommission` | Commission records |
| `ApplicationPaymentLink` | Payment link tokens |
| `ApplicationStatusHistory` | Status change audit |
| `PartnerIncentiveScheme` | Incentive programs |
| `PartnerAchievement` | Partner badges/achievements |

---

## Backend Deployment

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  api:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - db
      - redis

  db:
    image: postgres:14
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_PASSWORD=${DB_PASSWORD}

  redis:
    image: redis:6-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### PM2 Deployment

```bash
# ecosystem.config.js
module.exports = {
  apps: [{
    name: 'voicebridge-api',
    script: 'dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};

# Deploy
pm2 start ecosystem.config.js --env production
```

---

## Frontend Deployment

### Build for Production

```bash
cd frontend
npm run build
```

### Nginx Configuration

```nginx
# Partner Portal (partner.yourcrm.com)
server {
    listen 80;
    server_name partner.yourcrm.com;

    location / {
        root /var/www/voicebridge/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Integration Setup

### 1. Razorpay Webhook

Configure webhook URL in Razorpay Dashboard:
```
https://api.yourcrm.com/api/pay/razorpay-webhook
```

Events to subscribe:
- `payment.captured`
- `payment.failed`
- `order.paid`

### 2. SMS Templates (MSG91)

Create templates for:
- OTP verification
- Application status updates
- Payment confirmations
- Document verification results

### 3. WhatsApp Templates

Register templates for:
- Application confirmation
- Status updates
- Payment reminders
- Document requests

---

## Testing

### Run Unit Tests

```bash
cd backend
npm run test
```

### Run Integration Tests

```bash
npm run test:integration
```

### API Testing (Postman Collection)

Import the Postman collection from `docs/postman/partner-portal.json`

### Test Scenarios

1. **Partner Registration Flow**
   - Admin creates partner
   - Partner receives credentials
   - Partner logs in and sets password

2. **Application Submission Flow**
   - Partner submits application
   - Documents uploaded
   - Admin verifies documents
   - Student receives tracking link

3. **Payment Flow**
   - Payment link generated
   - Student pays via Razorpay
   - Payment auto-verified
   - Commission calculated

4. **Commission Payout Flow**
   - Commission approved
   - Partner requests payout
   - Admin processes payout
   - Wallet updated

---

## Monitoring

### Health Check Endpoint

```
GET /api/health
```

### Metrics to Monitor

- Application submission rate
- Payment success rate
- Document verification queue
- Partner wallet balances
- Commission payout pending

### Alerts to Configure

- Payment failures > 5%
- Document verification backlog > 100
- API response time > 2s
- Error rate > 1%

---

## API Endpoints Summary

### Partner Portal (`/api/admission-partner-portal`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /login | Partner authentication |
| GET | /dashboard | Dashboard stats |
| GET | /applications | List applications |
| POST | /applications | Submit application |
| GET | /wallet | Wallet balance |
| POST | /wallet/request-payout | Request payout |

### Student Portal (`/api/student-portal`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /send-otp | Send OTP |
| POST | /verify-otp | Verify & get application |
| GET | /application | Get application status |

### Admin (`/api/partner-applications`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | / | List all applications |
| GET | /:id | Application details |
| PATCH | /:id/status | Update status |
| PATCH | /:id/documents/:docId/verify | Verify document |

### Payments (`/api/application-payments`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | / | Record payment |
| PATCH | /:id/verify | Verify payment |
| POST | /approve-commissions | Approve commissions |
| PATCH | /payouts/:id/process | Process payout |

### Payment Links (`/api/pay`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /:token | Get payment link details |
| POST | /:token/create-order | Create Razorpay order |
| POST | /:token/verify | Verify payment |
| POST | /razorpay-webhook | Razorpay webhook |

---

## Support

For deployment assistance or issues, contact:
- Technical Support: tech@yourcompany.com
- Documentation: https://docs.yourcrm.com
