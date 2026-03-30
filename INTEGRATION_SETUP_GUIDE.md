# Integration Setup Guide

Complete step-by-step guide to set up all integrations for your CRM.

---

## Quick Start (Recommended Order)

| Priority | Integration | Time | Cost |
|----------|-------------|------|------|
| 1 | Gmail SMTP | 5 min | Free |
| 2 | Razorpay | 10 min | Free to setup |
| 3 | OpenAI | 5 min | Pay-as-you-go |
| 4 | Plivo or Twilio | 10 min | Free trial |
| 5 | Facebook Ads | 15 min | Free |
| 6 | LinkedIn Ads | 15 min | Free |

---

## 1. Gmail SMTP (Email)

### Steps:

1. **Enable 2-Step Verification**
   - Go to: https://myaccount.google.com/security
   - Click "2-Step Verification" → Turn ON
   - Complete phone verification

2. **Create App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Select app: "Mail"
   - Select device: "Other (Custom name)"
   - Enter name: "CRM Lead Generation"
   - Click "Generate"
   - **Copy the 16-character password** (shown only once!)

3. **Add to .env**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=abcd efgh ijkl mnop
SMTP_FROM=your_email@gmail.com
```

### Test:
```bash
curl -X POST http://localhost:3000/api/campaigns \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","type":"EMAIL","content":"Hello","subject":"Test Email"}'
```

---

## 2. Razorpay (Payments)

### Steps:

1. **Sign Up**
   - Go to: https://dashboard.razorpay.com/signup
   - Enter email, phone, password
   - Verify email and phone

2. **Get Test Credentials**
   - Login to dashboard
   - Go to: Settings → API Keys
   - Click "Generate Test Key"
   - **Copy Key ID and Key Secret**

3. **Add to .env**
```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
```

4. **For Production** (requires KYC):
   - Complete KYC with PAN, Aadhaar, Bank details
   - Wait for approval (1-2 days)
   - Generate Live Keys

### Test:
```bash
curl -X GET http://localhost:3000/api/payments \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Webhook Setup:
- URL: `https://yourdomain.com/api/payments/webhook`
- Events: `payment.captured`, `payment.failed`

---

## 3. OpenAI (AI Chatbot)

### Steps:

1. **Sign Up**
   - Go to: https://platform.openai.com/signup
   - Sign up with Google/Microsoft/Email

2. **Add Payment Method**
   - Go to: https://platform.openai.com/account/billing
   - Add credit card (required even for free tier)

3. **Create API Key**
   - Go to: https://platform.openai.com/api-keys
   - Click "Create new secret key"
   - Name it: "CRM Lead Generation"
   - **Copy the key immediately** (shown only once!)

4. **Add to .env**
```env
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Pricing:
- GPT-3.5: ~$0.002 per 1K tokens
- GPT-4: ~$0.03 per 1K tokens
- Free trial: $5 credit

### Test:
```bash
curl -X POST http://localhost:3000/api/chatbot/session \
  -H "Content-Type: application/json" \
  -d '{"organizationId":"YOUR_ORG_ID"}'
```

---

## 4. Plivo (SMS & Voice) - Recommended for India

### Steps:

1. **Sign Up**
   - Go to: https://console.plivo.com/accounts/register/
   - Enter email, password
   - Verify email and phone

2. **Get Credentials**
   - Login to console
   - Dashboard shows **Auth ID** and **Auth Token**
   - Copy both

3. **Buy Phone Number**
   - Go to: Phone Numbers → Buy Numbers
   - Select country (India/US)
   - Choose number type (Local/Toll-free)
   - Buy number (~$0.80/month for US)

4. **Add to .env**
```env
PLIVO_AUTH_ID=MAXXXXXXXXXXXXXXXXXX
PLIVO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PLIVO_PHONE_NUMBER=+1234567890
SMS_PROVIDER=plivo
VOICE_PROVIDER=plivo
```

### Webhook Setup:
- SMS: `https://yourdomain.com/api/plivo/webhook/sms`
- Voice: `https://yourdomain.com/api/plivo/webhook/call-status`

### Test:
```bash
curl -X GET http://localhost:3000/api/plivo/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 5. Twilio (SMS, WhatsApp, Voice)

### Steps:

1. **Sign Up**
   - Go to: https://www.twilio.com/try-twilio
   - Enter email, name, password
   - Verify email and phone

2. **Get Credentials**
   - Dashboard shows **Account SID** and **Auth Token**
   - Copy both

3. **Get Phone Number**
   - Click "Get a Trial Number"
   - Or go to: Phone Numbers → Buy a Number

4. **Setup WhatsApp Sandbox** (for testing)
   - Go to: Messaging → Try it Out → Send a WhatsApp Message
   - Follow sandbox instructions
   - Send "join <sandbox-word>" to the WhatsApp number

5. **Add to .env**
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
SMS_PROVIDER=twilio
VOICE_PROVIDER=twilio
```

### Webhook Setup:
- SMS: `https://yourdomain.com/api/twilio/webhook/sms`
- WhatsApp: `https://yourdomain.com/api/twilio/webhook/whatsapp`
- Voice: `https://yourdomain.com/api/twilio/webhook/call-status`

### Test:
```bash
curl -X GET http://localhost:3000/api/twilio/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 6. Facebook Ads (Lead Capture)

### Steps:

1. **Create Facebook Developer Account**
   - Go to: https://developers.facebook.com/
   - Click "Get Started"
   - Accept terms

2. **Create App**
   - Click "My Apps" → "Create App"
   - Select "Business" type
   - Enter app name: "CRM Lead Generation"
   - Create app

3. **Get Credentials**
   - Go to: Settings → Basic
   - Copy **App ID** and **App Secret**

4. **Add Products**
   - Click "Add Product"
   - Add "Webhooks"
   - Add "Marketing API"

5. **Configure Webhook**
   - Go to: Webhooks → Page
   - Click "Subscribe to this object"
   - Callback URL: `https://yourdomain.com/api/ads/facebook/webhook`
   - Verify Token: `your-custom-token` (create any string)
   - Subscribe to: `leadgen`

6. **Add to .env**
```env
FACEBOOK_APP_ID=123456789012345
FACEBOOK_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FACEBOOK_VERIFY_TOKEN=your-custom-token
```

### Connect Facebook Page:
1. Create a Facebook Page for your business
2. Go to your app → Settings → Basic → Add Platform → Website
3. Go to Facebook Login → Settings → Add your domain to Valid OAuth Redirect URIs

### Test:
```bash
curl -X GET http://localhost:3000/api/ads/campaigns?platform=FACEBOOK \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 7. LinkedIn Ads (Lead Capture)

### Steps:

1. **Create LinkedIn Developer App**
   - Go to: https://www.linkedin.com/developers/apps
   - Click "Create App"
   - Fill in:
     - App name: "CRM Lead Generation"
     - LinkedIn Page: (select your company page)
     - App logo: (upload logo)
   - Accept terms → Create

2. **Get Credentials**
   - Go to: Auth tab
   - Copy **Client ID** and **Client Secret**

3. **Request Marketing API Access**
   - Go to: Products tab
   - Find "Marketing Developer Platform"
   - Click "Request Access"
   - Fill business justification
   - Wait for approval (1-2 weeks)

4. **Add OAuth Redirect URL**
   - Go to: Auth tab
   - Add redirect URL: `https://yourdomain.com/api/ads/linkedin/callback`

5. **Add to .env**
```env
LINKEDIN_CLIENT_ID=xxxxxxxxxxxx
LINKEDIN_CLIENT_SECRET=xxxxxxxxxxxxxxxx
```

### Test:
```bash
curl -X GET http://localhost:3000/api/ads/campaigns?platform=LINKEDIN \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 8. AWS S3 (File Storage) - Optional

### Steps:

1. **Create AWS Account**
   - Go to: https://aws.amazon.com/
   - Sign up with email

2. **Create S3 Bucket**
   - Go to: S3 Console
   - Click "Create bucket"
   - Name: `crm-lead-generation-files`
   - Region: `ap-south-1` (Mumbai)
   - Uncheck "Block all public access" (if you need public URLs)
   - Create bucket

3. **Create IAM User**
   - Go to: IAM Console → Users → Add User
   - Name: `crm-s3-user`
   - Access type: Programmatic access
   - Attach policy: `AmazonS3FullAccess`
   - Create user
   - **Download credentials CSV**

4. **Add to .env**
```env
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_BUCKET_NAME=crm-lead-generation-files
AWS_REGION=ap-south-1
```

---

## Verify All Integrations

Run this after setting up:

```bash
# Login and get token
TOKEN=$(curl -s http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"admin123"}' \
  | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

# Check all integrations
echo "=== Twilio ===" && curl -s http://localhost:3000/api/twilio/status -H "Authorization: Bearer $TOKEN"
echo "=== Plivo ===" && curl -s http://localhost:3000/api/plivo/status -H "Authorization: Bearer $TOKEN"
echo "=== Payments ===" && curl -s http://localhost:3000/api/payments -H "Authorization: Bearer $TOKEN" | head -c 100
echo "=== Ads ===" && curl -s http://localhost:3000/api/ads/campaigns -H "Authorization: Bearer $TOKEN" | head -c 100
echo "=== Campaigns ===" && curl -s http://localhost:3000/api/campaigns -H "Authorization: Bearer $TOKEN" | head -c 100
```

---

## Webhook URLs Summary

| Integration | Webhook URL |
|-------------|-------------|
| **Twilio SMS** | `https://yourdomain.com/api/twilio/webhook/sms` |
| **Twilio WhatsApp** | `https://yourdomain.com/api/twilio/webhook/whatsapp` |
| **Twilio Voice** | `https://yourdomain.com/api/twilio/webhook/call-status` |
| **Plivo SMS** | `https://yourdomain.com/api/plivo/webhook/sms` |
| **Plivo Voice** | `https://yourdomain.com/api/plivo/webhook/call-status` |
| **Razorpay** | `https://yourdomain.com/api/payments/webhook` |
| **Facebook** | `https://yourdomain.com/api/ads/facebook/webhook` |
| **LinkedIn** | `https://yourdomain.com/api/ads/linkedin/webhook` |

---

## Troubleshooting

### Common Issues:

1. **"Twilio/Plivo is not configured"**
   - Check if credentials are in .env
   - Restart backend after adding credentials

2. **Email not sending**
   - Gmail: Make sure 2FA is enabled and using App Password
   - Check SMTP_PORT is 587 (not 465)

3. **Payment failing**
   - Use test card: `4111 1111 1111 1111`
   - Expiry: Any future date
   - CVV: Any 3 digits

4. **Webhook not receiving**
   - Use ngrok for local testing: `ngrok http 3000`
   - Update webhook URL with ngrok URL

### Test with ngrok:
```bash
# Install ngrok
npm install -g ngrok

# Start tunnel
ngrok http 3000

# Use the https URL for webhooks
# Example: https://abc123.ngrok.io/api/plivo/webhook/sms
```

---

## Support

- Twilio Docs: https://www.twilio.com/docs
- Plivo Docs: https://www.plivo.com/docs/
- Razorpay Docs: https://razorpay.com/docs/
- OpenAI Docs: https://platform.openai.com/docs
- Facebook Docs: https://developers.facebook.com/docs/
- LinkedIn Docs: https://docs.microsoft.com/en-us/linkedin/
