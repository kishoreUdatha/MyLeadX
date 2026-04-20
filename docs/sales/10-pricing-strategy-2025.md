# MyLeadX Pricing Strategy Document
## Comprehensive Pricing, Costs & Revenue Analysis

**Document Version:** 1.0
**Date:** April 2025
**Confidential - Internal Use Only**

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Third-Party Costs Analysis](#2-third-party-costs-analysis)
3. [Fixed Operating Costs](#3-fixed-operating-costs)
4. [Subscription Plans](#4-subscription-plans)
5. [Wallet System (Pay-As-You-Go)](#5-wallet-system-pay-as-you-go)
6. [White-Label & Reseller Pricing](#6-white-label--reseller-pricing)
7. [Feature Comparison Matrix](#7-feature-comparison-matrix)
8. [Profit & Revenue Analysis](#8-profit--revenue-analysis)
9. [Competitor Analysis](#9-competitor-analysis)
10. [Implementation Roadmap](#10-implementation-roadmap)
11. [Payment Terms & Billing](#11-payment-terms--billing)
12. [Free Trial & Freemium](#12-free-trial--freemium)
13. [Discount Policies](#13-discount-policies)
14. [Service Level Agreement (SLA)](#14-service-level-agreement-sla)
15. [Contract Terms & Conditions](#15-contract-terms--conditions)
16. [Tax & Compliance](#16-tax--compliance)
17. [Referral & Affiliate Program](#17-referral--affiliate-program)
18. [Sales Team Commission Structure](#18-sales-team-commission-structure)
19. [Enterprise Negotiation Guidelines](#19-enterprise-negotiation-guidelines)

---

## 1. Executive Summary

### Business Model

MyLeadX operates on a **Hybrid Pricing Model**:

| Component | Type | Description |
|-----------|------|-------------|
| **Subscription** | Fixed Monthly | CRM + Voice AI features |
| **Wallet** | Pay-As-You-Go | WhatsApp, SMS, Overage |
| **Add-ons** | Optional Monthly | Extra users, numbers, storage |

### Key Differentiators

1. **All-in-One Platform**: CRM + WhatsApp + AI Voice Agents + Phone
2. **AI Voice Agents**: Only platform in India with AI calling
3. **White-Label**: Agencies can resell under their brand
4. **India-First**: INR pricing, local numbers, Indian languages

### Revenue Targets

| Year | Customers | Monthly Revenue | Annual Revenue | Net Profit |
|------|-----------|-----------------|----------------|------------|
| Year 1 | 92 | ₹7.0L | ₹84L | -₹11L |
| Year 2 | 303 | ₹29.0L | ₹3.5Cr | ₹1.3Cr |
| Year 3 | 690 | ₹80.0L | ₹9.6Cr | ₹4.9Cr |

---

## 2. Third-Party Costs Analysis

### 2.1 Plivo (Phone Numbers & Calls) - India

| Item | Cost |
|------|------|
| Local Phone Number Rental | ₹250/month |
| Outbound Call (Local) | ₹0.74/min |
| Inbound Call (Local) | ₹0.74/min |
| Browser SDK/SIP Calls | ₹0.34/min |

**Source:** [Plivo India Pricing](https://www.plivo.com/voice/pricing/in/)

### 2.2 WhatsApp Business API (Meta) - India

| Message Type | Meta Cost | Our Price | Margin |
|--------------|-----------|-----------|--------|
| Marketing | ₹0.86/msg | ₹1.20/msg | 40% |
| Utility | ₹0.12/msg | ₹0.20/msg | 67% |
| Authentication | ₹0.12/msg | ₹0.20/msg | 67% |
| Service (Reply within 24hr) | FREE | FREE | - |

**Note:** +18% GST applicable on all messages

**Source:** [WhatsApp Business Pricing](https://business.whatsapp.com/products/platform-pricing)

### 2.3 AI Voice Components

#### Option A: ElevenLabs Conversational AI (All-in-One)

| Item | Cost (USD) | Cost (INR) |
|------|------------|------------|
| Conversational AI | $0.08-0.10/min | ₹6.70-8.40/min |

*Includes: STT + LLM + TTS + Orchestration*

#### Option B: Custom Stack (Recommended)

| Component | Provider | Cost |
|-----------|----------|------|
| Speech-to-Text | Deepgram | ₹0.36/min |
| LLM | Gemini 2.5 Flash | ₹0.25/min |
| Text-to-Speech | Various | ₹0.50-2.00/min |
| **Total** | | **₹1.11-2.61/min** |

#### Total AI Voice Call Cost

| Scenario | Cost/Min |
|----------|----------|
| Custom Stack + Plivo Call | ₹1.85-3.35/min |
| ElevenLabs + Plivo Call | ₹7.44-9.14/min |

**Recommendation:** Use Custom Stack for 70% margin

**Sources:**
- [Deepgram Pricing](https://deepgram.com/pricing)
- [ElevenLabs Pricing](https://elevenlabs.io/pricing)
- [Google Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing)

### 2.4 SMS Pricing

| Provider | Cost | Our Price | Margin |
|----------|------|-----------|--------|
| MSG91 | ₹0.15/sms | ₹0.30/sms | 100% |

### 2.5 Cost Summary Table

| Item | Our Cost | Sell At | Margin |
|------|----------|---------|--------|
| Phone Number | ₹250/mo | ₹500-600/mo | 100%+ |
| AI Voice Call | ₹3.25/min | ₹10-12/min | 70% |
| Manual Call | ₹0.74/min | ₹1.50/min | 100% |
| WhatsApp Marketing | ₹0.86/msg | ₹1.20/msg | 40% |
| WhatsApp Utility | ₹0.12/msg | ₹0.20/msg | 67% |
| SMS | ₹0.15/sms | ₹0.30/sms | 100% |

---

## 3. Fixed Operating Costs

### 3.1 Monthly Fixed Costs by Stage

| Category | Lean Startup | Growth Stage | Scale |
|----------|--------------|--------------|-------|
| Infrastructure | ₹80,000 | ₹1,50,000 | ₹2,50,000 |
| Salaries | ₹5,00,000 | ₹8,00,000 | ₹12,00,000 |
| Marketing | ₹50,000 | ₹2,00,000 | ₹4,00,000 |
| Office & Ops | ₹70,000 | ₹1,50,000 | ₹2,50,000 |
| **Total** | **₹7,00,000** | **₹13,00,000** | **₹21,00,000** |

### 3.2 Infrastructure Breakdown

| Item | Monthly Cost |
|------|--------------|
| Cloud Hosting (AWS/GCP) | ₹50,000 - ₹1,50,000 |
| Database (PostgreSQL/Redis) | ₹15,000 - ₹40,000 |
| CDN & Storage | ₹10,000 - ₹25,000 |
| SSL, Domain, DNS | ₹2,000 - ₹5,000 |
| Monitoring & Logging | ₹5,000 - ₹15,000 |

### 3.3 Team Structure & Salaries

| Role | Count | Salary Range | Total |
|------|-------|--------------|-------|
| Full-Stack Developers | 2-3 | ₹80,000 - ₹1,50,000 | ₹2,40,000 - ₹4,50,000 |
| DevOps/Backend | 1 | ₹80,000 - ₹1,20,000 | ₹80,000 - ₹1,20,000 |
| Customer Support | 2 | ₹25,000 - ₹40,000 | ₹50,000 - ₹80,000 |
| Sales/BD | 1-2 | ₹40,000 - ₹70,000 | ₹40,000 - ₹1,40,000 |
| Marketing | 1 | ₹40,000 - ₹60,000 | ₹40,000 - ₹60,000 |
| Founder/Manager | 1 | ₹1,00,000 - ₹2,00,000 | ₹1,00,000 - ₹2,00,000 |

### 3.4 Marketing Budget Breakdown

| Item | Monthly Cost |
|------|--------------|
| Google/Meta Ads | ₹50,000 - ₹2,00,000 |
| Content Marketing | ₹20,000 - ₹50,000 |
| SEO & Tools | ₹10,000 - ₹30,000 |
| Events/Webinars | ₹10,000 - ₹30,000 |
| Affiliate/Referral | ₹20,000 - ₹50,000 |

### 3.5 Office & Operations

| Item | Monthly Cost |
|------|--------------|
| Office Rent (Tier 2 city) | ₹30,000 - ₹80,000 |
| Utilities & Internet | ₹10,000 - ₹20,000 |
| Software Licenses | ₹20,000 - ₹50,000 |
| Legal & Compliance | ₹10,000 - ₹25,000 |
| Accounting | ₹10,000 - ₹20,000 |
| Miscellaneous | ₹20,000 - ₹40,000 |

---

## 4. Subscription Plans

### 4.1 CRM Only Plans (Without AI Voice)

| Feature | Starter | Professional | Business |
|---------|---------|--------------|----------|
| **Monthly Price** | **₹2,499** | **₹4,999** | **₹15,999** |
| **Annual Price (per mo)** | ₹1,999 | ₹3,999 | ₹12,999 |
| Users | 5 | 10 | 30 |
| Branches | 1 | 2 | 5 |
| Leads/Month | 1,000 | 5,000 | Unlimited |
| Pipelines | 1 | 3 | 10 |
| Custom Fields | 5 | 20 | Unlimited |
| Automation | - | Basic | Advanced |
| API Access | - | - | Yes |
| Support | Email | Chat + Email | Dedicated AM |
| **Gross Margin** | **80%** | **77%** | **63%** |

### 4.2 CRM + AI Voice Plans (Core Product)

| Feature | Growth | Scale | Enterprise |
|---------|--------|-------|------------|
| **Monthly Price** | **₹9,999** | **₹24,999** | **₹74,999** |
| **Annual Price (per mo)** | ₹7,999 | ₹19,999 | ₹59,999 |
| | | | |
| **CRM Features** | | | |
| Users | 15 | 50 | 100 |
| Branches | 2 | 5 | Unlimited |
| Leads/Month | 10,000 | 50,000 | Unlimited |
| Pipelines | 5 | 15 | Unlimited |
| Automation | Yes | Advanced | Custom |
| API Access | Yes | Yes | Yes |
| | | | |
| **AI Voice Features** | | | |
| AI Agents | 2 | 5 | Unlimited |
| Phone Numbers | 2 | 5 | 15 |
| AI Minutes/Month | 500 | 1,500 | 3,500 |
| Languages | 2 | 10+ | 32 |
| Voice Cloning | - | - | Yes |
| Knowledge Base | 10 MB | 100 MB | 1 GB |
| Call Recording | 30 days | 90 days | 1 year |
| Sentiment Analysis | - | Yes | Yes |
| | | | |
| **Support** | Chat | Priority | Dedicated AM |
| **Gross Margin** | **62%** | **64%** | **62%** |

### 4.3 Add-on Pricing

| Add-on | Price |
|--------|-------|
| Extra User | ₹399/user/month |
| Extra Phone Number | ₹599/number/month |
| Extra Storage (10GB) | ₹199/month |
| Voice Cloning (per voice) | ₹2,999/month |
| Custom Integration | ₹15,000 one-time |
| Priority Support Upgrade | ₹2,999/month |

---

## 5. Wallet System (Pay-As-You-Go)

### 5.1 What Goes in Wallet

| Feature | Rate | When Charged |
|---------|------|--------------|
| WhatsApp Marketing | ₹1.20/msg | Per message sent |
| WhatsApp Utility | ₹0.20/msg | Per message sent |
| WhatsApp Auth (OTP) | ₹0.20/msg | Per message sent |
| SMS | ₹0.30/sms | Per SMS sent |
| Extra AI Voice Minutes | ₹12.00/min | Beyond plan limit |
| Manual Outbound Calls | ₹1.50/min | Per minute |
| Bulk Email Campaign | ₹0.05/email | Per email sent |

**Note:** WhatsApp Service replies (within 24hr window) = FREE

### 5.2 Wallet Recharge Options

| Amount | Bonus | Total Credits |
|--------|-------|---------------|
| ₹500 | - | ₹500 |
| ₹1,000 | +₹50 (5%) | ₹1,050 |
| ₹2,500 | +₹200 (8%) | ₹2,700 |
| ₹5,000 | +₹500 (10%) | ₹5,500 |
| ₹10,000 | +₹1,500 (15%) | ₹11,500 |

### 5.3 Wallet Features

- **Minimum Recharge:** ₹500
- **Low Balance Alert:** Configurable (default ₹100)
- **Auto-Recharge:** Optional, configurable amount
- **Usage Dashboard:** Real-time tracking
- **Detailed Reports:** Per message/call breakdown

### 5.4 Subscription vs Wallet Summary

```
SUBSCRIPTION (Fixed Monthly)
├── CRM Features (users, leads, pipelines, automation)
├── Voice AI (agents, phone numbers, included minutes)
└── Support level

WALLET (Pay-As-You-Go)
├── WhatsApp Messages (₹0.20-1.20/msg)
├── SMS (₹0.30/sms)
├── Extra AI Minutes (₹12/min)
└── Manual Calls (₹1.50/min)

ADD-ONS (Optional Monthly)
├── Extra Users (₹399/user)
├── Extra Phone Numbers (₹599/number)
└── Extra Storage (₹199/10GB)
```

---

## 6. White-Label & Reseller Pricing

### 6.1 White-Label Plans

| Feature | Partner | Agency | Enterprise |
|---------|---------|--------|------------|
| **Monthly Price** | **₹29,999** | **₹79,999** | **₹1,99,999** |
| **Setup Fee** | ₹25,000 | ₹50,000 | ₹1,00,000 |
| | | | |
| **Branding** | | | |
| Custom Logo & Colors | Yes | Yes | Yes |
| Custom Domains | 1 | 3 | Unlimited |
| Remove MyLeadX Branding | Yes | Yes | Yes |
| Custom Login Page | Yes | Yes | Yes |
| Mobile App Branding | - | Yes | Yes |
| | | | |
| **Reseller** | | | |
| Client Accounts (Tenants) | 10 | 50 | Unlimited |
| Total Users | 50 | 200 | 1,000 |
| Set Your Own Pricing | Yes | Yes | Yes |
| Partner Dashboard | Basic | Advanced | Custom |
| Billing Management | - | Yes | Yes |
| | | | |
| **Included Resources** | | | |
| AI Minutes | 2,000 | 10,000 | 50,000 |
| Phone Numbers | 10 | 30 | 100 |
| WhatsApp Messages | 10,000 | 50,000 | 2,00,000 |
| | | | |
| **Support** | Portal | Dedicated PM | Dedicated Team |

### 6.2 White-Label Wholesale Rates

| Add-on | Wholesale Cost | Suggested Resell | Your Margin |
|--------|----------------|------------------|-------------|
| Extra User | ₹199/user | ₹399-499/user | 100%+ |
| Extra AI Minutes | ₹6/min | ₹10-15/min | 67%+ |
| Extra Phone Number | ₹350/number | ₹599-799/number | 70%+ |
| Extra WhatsApp | ₹0.40/msg | ₹0.80-1.00/msg | 100%+ |

### 6.3 Partner Revenue Potential

| Partner Type | Monthly Investment | Resell At | Potential Revenue | Your Margin |
|--------------|-------------------|-----------|-------------------|-------------|
| Partner (10 clients) | ₹29,999 | ₹5,000/client | ₹50,000 | ₹20,001 |
| Agency (50 clients) | ₹79,999 | ₹4,000/client | ₹2,00,000 | ₹1,20,001 |
| Enterprise (100 clients) | ₹1,99,999 | ₹3,500/client | ₹3,50,000 | ₹1,50,001 |

---

## 7. Feature Comparison Matrix

### 7.1 Complete Feature Matrix

| Feature | Starter | Pro | Business | Growth | Scale | Enterprise |
|---------|---------|-----|----------|--------|-------|------------|
| | (CRM) | (CRM) | (CRM) | (+Voice) | (+Voice) | (+Voice) |
| **PRICE/MONTH** | ₹2,499 | ₹4,999 | ₹12,999 | ₹7,999 | ₹19,999 | ₹49,999 |
| | | | | | | |
| **CRM FEATURES** | | | | | | |
| Lead Management | Yes | Yes | Yes | Yes | Yes | Yes |
| Contact Management | Yes | Yes | Yes | Yes | Yes | Yes |
| Pipeline Management | 1 | 3 | 10 | 5 | 15 | Unlimited |
| Task Management | Yes | Yes | Yes | Yes | Yes | Yes |
| Custom Fields | 5 | 20 | Unlimited | 30 | Unlimited | Unlimited |
| Import/Export | Yes | Yes | Yes | Yes | Yes | Yes |
| Duplicate Detection | - | Yes | Yes | Yes | Yes | Yes |
| | | | | | | |
| **COMMUNICATION** | | | | | | |
| Email Integration | Yes | Yes | Yes | Yes | Yes | Yes |
| SMS Integration | - | Yes | Yes | Yes | Yes | Yes |
| Call Logging | Yes | Yes | Yes | Yes | Yes | Yes |
| Click-to-Call | - | Yes | Yes | Yes | Yes | Yes |
| | | | | | | |
| **AI VOICE AGENTS** | | | | | | |
| AI Agents | - | - | - | 2 | 5 | Unlimited |
| Phone Numbers | - | - | - | 2 | 5 | 15 |
| AI Minutes/Month | - | - | - | 500 | 2,000 | 8,000 |
| Outbound AI Calls | - | - | - | Yes | Yes | Yes |
| Inbound AI Calls | - | - | - | Yes | Yes | Yes |
| Call Recording | - | - | - | 30 days | 90 days | 1 year |
| Transcription | - | - | - | Yes | Yes | Yes |
| Voice Cloning | - | - | - | - | 1 | 5 |
| Multi-language | - | - | - | 5 | 15 | 32 |
| | | | | | | |
| **AUTOMATION** | | | | | | |
| Workflow Automation | - | Basic | Advanced | Yes | Advanced | Custom |
| Auto Lead Assignment | - | Yes | Yes | Yes | Yes | Yes |
| Triggers & Actions | - | 5 | 20 | 10 | 50 | Unlimited |
| | | | | | | |
| **ADMIN** | | | | | | |
| Users | 3 | 10 | 30 | 10 | 30 | 100 |
| Branches | 1 | 2 | 5 | 2 | 5 | Unlimited |
| Role Management | Basic | Yes | Yes | Yes | Yes | Custom |
| API Access | - | - | Yes | Yes | Yes | Yes |
| SSO/SAML | - | - | - | - | - | Yes |
| | | | | | | |
| **SUPPORT** | Email | Chat | Priority | Chat | Priority | Dedicated |

### 7.2 WhatsApp - Wallet Based (All Plans)

| Item | Rate |
|------|------|
| Marketing Messages | ₹1.20/msg |
| Utility Messages | ₹0.20/msg |
| Authentication | ₹0.20/msg |
| Service (24hr reply) | FREE |

---

## 8. Profit & Revenue Analysis

### 8.1 Unit Economics

| Plan | Price | Variable Cost | Gross Profit | Margin |
|------|-------|---------------|--------------|--------|
| Starter (CRM) | ₹2,499 | ₹800 | ₹1,699 | 68% |
| Pro (CRM) | ₹4,999 | ₹1,500 | ₹3,499 | 70% |
| Business (CRM) | ₹12,999 | ₹4,500 | ₹8,499 | 65% |
| Growth (Voice) | ₹7,999 | ₹3,000 | ₹4,999 | 62% |
| Scale (Voice) | ₹19,999 | ₹7,500 | ₹12,499 | 62% |
| Enterprise | ₹49,999 | ₹18,000 | ₹31,999 | 64% |
| Partner (WL) | ₹29,999 | ₹12,000 | ₹17,999 | 60% |
| Agency (WL) | ₹79,999 | ₹35,000 | ₹44,999 | 56% |

### 8.2 Year 1 Projection (Lean Startup)

**Fixed Costs:** ₹7,00,000/month

| Plan | Customers | Monthly Revenue |
|------|-----------|-----------------|
| Starter | 50 | ₹1,24,950 |
| Growth | 30 | ₹2,39,970 |
| Scale | 10 | ₹1,99,990 |
| Enterprise | 2 | ₹99,998 |
| **Total** | **92** | **₹6,64,908** |

| Item | Amount |
|------|--------|
| Subscription Revenue | ₹6,64,908 |
| Wallet Revenue | ₹39,600 |
| **Total Revenue** | **₹7,04,508** |
| Variable Costs | ₹97,320 |
| **Gross Profit** | **₹6,07,188** |
| Fixed Costs | ₹7,00,000 |
| **Net Profit/Loss** | **-₹92,812** |

### 8.3 Year 2 Projection (Growth Stage)

**Fixed Costs:** ₹13,00,000/month

| Plan | Customers | Monthly Revenue |
|------|-----------|-----------------|
| Starter | 150 | ₹3,74,850 |
| Growth | 100 | ₹7,99,900 |
| Scale | 40 | ₹7,99,960 |
| Enterprise | 8 | ₹3,99,992 |
| Partner | 5 | ₹1,49,995 |
| **Total** | **303** | **₹25,24,697** |

| Item | Amount |
|------|--------|
| Subscription Revenue | ₹25,24,697 |
| Wallet Revenue | ₹3,80,000 |
| **Total Revenue** | **₹29,04,697** |
| Variable Costs | ₹5,15,000 |
| **Gross Profit** | **₹23,89,697** |
| Fixed Costs | ₹13,00,000 |
| **Net Profit** | **₹10,89,697** |
| **Profit Margin** | **37.5%** |

### 8.4 Year 3 Projection (Scale)

**Fixed Costs:** ₹21,00,000/month

| Plan | Customers | Monthly Revenue |
|------|-----------|-----------------|
| Starter | 300 | ₹7,49,700 |
| Growth | 250 | ₹19,99,750 |
| Scale | 100 | ₹19,99,900 |
| Enterprise | 20 | ₹9,99,980 |
| Partner | 15 | ₹4,49,985 |
| Agency | 5 | ₹3,99,995 |
| **Total** | **690** | **₹65,99,310** |

| Item | Amount |
|------|--------|
| Subscription Revenue | ₹65,99,310 |
| Wallet Revenue | ₹14,00,000 |
| **Total Revenue** | **₹79,99,310** |
| Variable Costs | ₹18,00,000 |
| **Gross Profit** | **₹61,99,310** |
| Fixed Costs | ₹21,00,000 |
| **Net Profit** | **₹40,99,310** |
| **Profit Margin** | **51.2%** |

### 8.5 3-Year Summary

| Metric | Year 1 | Year 2 | Year 3 |
|--------|--------|--------|--------|
| Customers | 92 | 303 | 690 |
| Monthly Revenue | ₹7.0L | ₹29.0L | ₹80.0L |
| Monthly Profit | -₹0.9L | +₹10.9L | +₹41.0L |
| **Annual Revenue** | **₹84L** | **₹3.5Cr** | **₹9.6Cr** |
| **Annual Profit** | **-₹11L** | **₹1.3Cr** | **₹4.9Cr** |
| Profit Margin | -13% | 37% | 51% |

### 8.6 Break-Even Analysis

| Scenario | Fixed Costs | Customers Needed |
|----------|-------------|------------------|
| Lean Startup | ₹7,00,000/mo | ~100 mixed |
| Growth Stage | ₹13,00,000/mo | ~180 mixed |
| Scale | ₹21,00,000/mo | ~300 mixed |

**Break-even Point:** Month 14-16 (~120-150 customers)

### 8.7 Key Metrics to Track

| Metric | Target |
|--------|--------|
| Monthly Customer Acquisition | 15-25 new |
| Churn Rate | < 5% monthly |
| Average Revenue Per Customer | ₹10,000-12,000 |
| Customer Acquisition Cost (CAC) | < ₹15,000 |
| Lifetime Value (LTV) | > ₹1,50,000 |
| LTV:CAC Ratio | > 10:1 |

---

## 9. Competitor Analysis

### 9.1 Competitor Pricing Models

| Company | Type | Subscription | Usage-Based |
|---------|------|--------------|-------------|
| WATI | WhatsApp | ₹3,200+/mo | Message markup (20%) |
| Interakt | WhatsApp | ₹2,499+/mo | Message markup (12-39%) |
| Freshworks | CRM + Phone | $9-59/user | Phone credits |
| LeadSquared | CRM | $25-100/user | Lead limits |
| Zoho CRM | CRM | $14-52/user | Add-ons |
| HubSpot | CRM + Marketing | $20-3,600/mo | Contact overage |
| Twilio | Communications | None | All pay-per-use |

### 9.2 Competitive Comparison

| Feature | WATI | Interakt | Freshworks | **MyLeadX** |
|---------|------|----------|------------|-------------|
| CRM | - | Basic | Yes | **Yes (Full)** |
| WhatsApp | Yes | Yes | - | **Yes** |
| AI Voice Agents | - | - | - | **Yes (Unique)** |
| Phone Calls | - | - | Yes | **Yes** |
| Automation | Basic | Basic | Yes | **Yes** |
| White-Label | - | - | - | **Yes (Unique)** |
| India Focus | Yes | Yes | Global | **Yes** |

### 9.3 MyLeadX Competitive Advantages

1. **All-in-One Platform**
   - Others: Single-purpose (WhatsApp OR CRM OR Calls)
   - MyLeadX: CRM + WhatsApp + AI Voice + Phone

2. **AI Voice Agents**
   - No competitor in India offers AI voice agents
   - This is the BIGGEST differentiator

3. **White-Label**
   - Agencies can resell under their brand
   - Creates partner ecosystem and recurring revenue

4. **India-First**
   - Pricing in INR
   - Local phone numbers (Plivo/Exotel)
   - Indian language support

5. **Competitive Pricing**
   - Starter at ₹2,499 vs WATI ₹3,200
   - Includes more features at every tier

### 9.4 Positioning Strategy

| Segment | Competitor | Our Pitch |
|---------|------------|-----------|
| WhatsApp Only | WATI, Interakt | "Get CRM + AI calling FREE with WhatsApp" |
| CRM Only | Zoho, LeadSquared | "Get WhatsApp + AI calls included" |
| Call Centers | Exotel, Knowlarity | "AI agents handle calls, humans close deals" |
| Agencies | None | "White-label CRM + AI under your brand" |

---

## 10. Implementation Roadmap

### 10.1 Phase 1: Foundation (Month 1-2)

- [ ] Implement subscription management system
- [ ] Build wallet/credits system
- [ ] Create billing dashboard
- [ ] Set up payment gateway (Razorpay)
- [ ] Usage tracking and metering

### 10.2 Phase 2: Pricing Pages (Month 2-3)

- [ ] Public pricing page
- [ ] Plan comparison page
- [ ] ROI calculator
- [ ] Checkout flow
- [ ] Invoice generation

### 10.3 Phase 3: White-Label (Month 3-4)

- [ ] Multi-tenant architecture
- [ ] Custom branding settings
- [ ] Partner dashboard
- [ ] Reseller billing
- [ ] Custom domain support

### 10.4 Phase 4: Optimization (Month 4-6)

- [ ] Usage analytics
- [ ] Churn prediction
- [ ] Upsell automation
- [ ] A/B testing pricing
- [ ] Enterprise custom quotes

---

## 11. Payment Terms & Billing

### 11.1 Accepted Payment Methods

| Method | Availability | Processing Fee |
|--------|--------------|----------------|
| UPI (GPay, PhonePe, Paytm) | All plans | Free |
| Credit/Debit Cards | All plans | 2% |
| Net Banking | All plans | Free |
| Bank Transfer (NEFT/RTGS) | Growth+ plans | Free |
| Cheque | Enterprise only | Free |
| International Cards | All plans | 3% + forex |

### 11.2 Billing Cycle

| Plan Type | Billing | Due Date |
|-----------|---------|----------|
| Monthly Subscription | 1st of month | Net 7 |
| Yearly Subscription | Anniversary date | Net 15 |
| Wallet Recharge | Immediate | Prepaid |
| Enterprise | Custom | Net 30 |

### 11.3 Invoice & Tax

| Item | Details |
|------|---------|
| GST | 18% on all services |
| GSTIN | Will be provided on invoice |
| HSN/SAC Code | 998314 (IT Services) |
| Invoice Format | GST-compliant e-invoice |
| Invoice Delivery | Email + Dashboard |

### 11.4 Refund Policy

| Scenario | Refund |
|----------|--------|
| Cancellation within 7 days (new customers) | 100% refund |
| Cancellation after 7 days | No refund (use remaining period) |
| Unused Wallet Balance | 100% refundable |
| Annual plan cancellation | Pro-rata refund (minus 20% discount) |
| Service outage (SLA breach) | Credit as per SLA |
| Billing error | Full correction + 5% goodwill credit |

### 11.5 Late Payment

| Days Overdue | Action |
|--------------|--------|
| 1-7 days | Reminder email |
| 8-14 days | Warning + feature restriction |
| 15-30 days | Account suspension |
| 30+ days | Account termination + data deletion notice |
| Reconnection fee | ₹500 (after suspension) |

---

## 12. Free Trial & Freemium

### 12.1 Free Trial

| Feature | Details |
|---------|---------|
| Duration | **14 days** |
| Credit Card Required | No |
| Full Access | Yes (Growth plan features) |
| AI Minutes Included | 50 minutes |
| WhatsApp Messages | 100 messages |
| Users | Up to 5 |
| Data Retained | 30 days after trial ends |

### 12.2 Trial Conversion Incentives

| Action | Incentive |
|--------|-----------|
| Convert within trial | 10% off first month |
| Convert to annual | 25% off (vs 20% standard) |
| Refer during trial | Extra 7 days trial |
| Book demo call | 100 bonus AI minutes |

### 12.3 Freemium Option (Optional - Future)

| Feature | Free Forever |
|---------|--------------|
| Users | 2 |
| Leads | 500/month |
| AI Minutes | 0 (upgrade to unlock) |
| WhatsApp | View only (no sending) |
| Pipelines | 1 |
| Reports | Basic only |
| Support | Community forum |
| Branding | "Powered by MyLeadX" |

**Purpose:** Lead generation funnel for paid conversions

---

## 13. Discount Policies

### 13.1 Standard Discounts

| Discount Type | Amount | Conditions |
|---------------|--------|------------|
| Annual Payment | **20% off** | Pay yearly upfront |
| 2-Year Commitment | **30% off** | Pay 2 years upfront |
| 3-Year Commitment | **40% off** | Pay 3 years upfront |

### 13.2 Segment-Based Discounts

| Segment | Discount | Verification Required |
|---------|----------|----------------------|
| Startups (< 2 years old) | 30% off | Incorporation certificate |
| Non-Profit / NGO | 40% off | 80G/12A certificate |
| Educational Institutions | 35% off | AISHE code / UGC recognition |
| Government | 25% off | Government ID / tender |
| Incubator/Accelerator Startups | 50% off (6 months) | Incubator letter |

### 13.3 Volume Discounts (Multi-Year)

| Total Contract Value | Additional Discount |
|---------------------|---------------------|
| ₹5L - ₹10L | 5% extra |
| ₹10L - ₹25L | 10% extra |
| ₹25L - ₹50L | 15% extra |
| ₹50L+ | Custom negotiation |

### 13.4 Referral Discounts

| Referral Type | Referrer Gets | Referee Gets |
|---------------|---------------|--------------|
| Customer refers Customer | 1 month free | 10% off first year |
| Partner refers Customer | 15% recurring commission | 10% off |
| Affiliate | 20% commission (first year) | 15% off |

### 13.5 Promotional Discounts (Time-Limited)

| Promotion | Discount | Validity |
|-----------|----------|----------|
| Launch Offer | 50% off (first 100 customers) | Until filled |
| Diwali/Festive | 25% off annual plans | Festive week |
| End of Quarter | 15% extra | Last week of quarter |
| Product Hunt Launch | 30% off | 48 hours |

### 13.6 Discount Stacking Rules

| Rule | Policy |
|------|--------|
| Maximum combined discount | 50% (never below cost) |
| Stacking allowed | Annual + Segment OR Annual + Volume |
| Stacking NOT allowed | Segment + Volume + Promotional |
| Approval required | Any discount > 30% needs manager approval |
| Documentation | All discounts must be documented in CRM |

---

## 14. Service Level Agreement (SLA)

### 14.1 Uptime Commitment

| Plan | Uptime SLA | Monthly Downtime Allowed |
|------|------------|--------------------------|
| Starter | 99.0% | 7.2 hours |
| Growth | 99.5% | 3.6 hours |
| Scale | 99.9% | 43 minutes |
| Enterprise | 99.95% | 22 minutes |

**Exclusions:** Scheduled maintenance (notified 48hrs in advance), force majeure, third-party outages (AWS, Plivo, Meta)

### 14.2 Uptime Credit

| Uptime Achieved | Credit (% of monthly fee) |
|-----------------|---------------------------|
| 99.0% - 99.9% | 10% |
| 98.0% - 99.0% | 25% |
| 95.0% - 98.0% | 50% |
| Below 95.0% | 100% |

**Claim Process:** Submit ticket within 7 days of incident. Credit applied to next invoice.

### 14.3 Support Response Times

| Priority | Description | Starter | Growth | Scale | Enterprise |
|----------|-------------|---------|--------|-------|------------|
| P1 - Critical | System down, no workaround | 4 hrs | 2 hrs | 1 hr | 15 min |
| P2 - High | Major feature broken | 8 hrs | 4 hrs | 2 hrs | 1 hr |
| P3 - Medium | Feature issue with workaround | 24 hrs | 12 hrs | 8 hrs | 4 hrs |
| P4 - Low | Questions, minor issues | 48 hrs | 24 hrs | 12 hrs | 8 hrs |

**Support Hours:**
- Starter/Growth: Mon-Fri, 9 AM - 6 PM IST
- Scale: Mon-Sat, 9 AM - 9 PM IST
- Enterprise: 24/7/365

### 14.4 Support Channels

| Channel | Starter | Growth | Scale | Enterprise |
|---------|---------|--------|-------|------------|
| Email | ✓ | ✓ | ✓ | ✓ |
| Help Center | ✓ | ✓ | ✓ | ✓ |
| Live Chat | - | ✓ | ✓ | ✓ |
| Phone | - | - | ✓ | ✓ |
| Dedicated Slack | - | - | - | ✓ |
| Dedicated CSM | - | - | - | ✓ |
| Quarterly Reviews | - | - | - | ✓ |

### 14.5 Data & Security SLA

| Item | Commitment |
|------|------------|
| Data Backup | Daily automated backups |
| Backup Retention | 30 days |
| Data Recovery (RTO) | < 4 hours |
| Data Loss (RPO) | < 1 hour |
| Encryption | AES-256 at rest, TLS 1.3 in transit |
| Data Center | AWS Mumbai (ap-south-1) |
| Compliance | SOC 2 Type II (in progress), ISO 27001 (planned) |
| Data Export | Available anytime via API or dashboard |
| Data Deletion | Within 30 days of account termination |

### 14.6 AI Voice Quality SLA

| Metric | Target | Measurement |
|--------|--------|-------------|
| Call Connection Rate | > 98% | Successfully connected / attempted |
| Audio Quality (MOS) | > 4.0 | Mean Opinion Score |
| Transcription Accuracy | > 95% | Word Error Rate |
| AI Response Latency | < 1.5 sec | Time to first response |
| Call Drop Rate | < 2% | Dropped / connected |

### 14.7 Maintenance Windows

| Type | Timing | Notice |
|------|--------|--------|
| Scheduled Maintenance | Sunday 2-6 AM IST | 48 hours |
| Emergency Maintenance | As needed | Best effort (email + in-app) |
| Feature Updates | Continuous deployment | Release notes |
| Major Upgrades | Quarterly | 2 weeks |

---

## 15. Contract Terms & Conditions

### 15.1 Subscription Agreement

| Term | Details |
|------|---------|
| Agreement Type | Online click-through (self-serve) OR signed MSA (Enterprise) |
| Governing Law | Laws of India, Courts of Bangalore |
| Agreement Start | Upon first payment or trial activation |
| Agreement Term | Monthly: Month-to-month / Annual: 12 months |

### 15.2 Minimum Commitment

| Plan Type | Minimum Term | Early Termination |
|-----------|--------------|-------------------|
| Monthly Plans | 1 month | Cancel anytime (no refund for current month) |
| Annual Plans | 12 months | Pro-rata refund minus discount received |
| Enterprise | As per contract | As per contract terms |
| White-Label | 6 months minimum | 3 months notice required |

### 15.3 Auto-Renewal Policy

| Item | Policy |
|------|--------|
| Monthly Plans | Auto-renew every month |
| Annual Plans | Auto-renew at anniversary |
| Renewal Notice | 30 days before renewal (email) |
| Price Changes | 60 days notice before any price increase |
| Opt-out | Cancel before renewal date via dashboard |

### 15.4 Cancellation Process

| Step | Details |
|------|---------|
| 1. Request | Submit via Dashboard > Settings > Cancel Subscription |
| 2. Confirmation | Email confirmation within 24 hours |
| 3. Exit Interview | Optional feedback survey |
| 4. Data Export | 30 days to download all data |
| 5. Account Status | Access continues until period end |
| 6. Data Deletion | Automatic after 30 days post-expiry |

### 15.5 Plan Changes

| Change Type | Policy |
|-------------|--------|
| Upgrade (Monthly) | Immediate, pro-rata charge |
| Upgrade (Annual) | Immediate, pro-rata charge |
| Downgrade (Monthly) | Effective next billing cycle |
| Downgrade (Annual) | Effective at renewal |
| Add Users/Add-ons | Immediate, pro-rata charge |
| Remove Users/Add-ons | Effective next billing cycle |

### 15.6 Account Suspension & Termination

| Scenario | Action |
|----------|--------|
| Payment Failure | 3 retry attempts over 7 days |
| Continued Non-Payment | Suspension after 14 days |
| Terms Violation | Immediate suspension + review |
| Illegal Activity | Immediate termination |
| Account Recovery | ₹500 reconnection fee + outstanding dues |
| Data After Termination | Deleted after 30 days |

### 15.7 Acceptable Use Policy

| Prohibited Use |
|----------------|
| Spam or unsolicited bulk messaging |
| Illegal content or activities |
| Harassment or abusive communications |
| Reselling without White-Label agreement |
| Reverse engineering or scraping |
| Exceeding API rate limits intentionally |
| Sharing login credentials |

**Violation Consequences:** Warning → Temporary Suspension → Permanent Termination

---

## 16. Tax & Compliance

### 16.1 Tax Structure (India)

| Tax Type | Rate | Applicability |
|----------|------|---------------|
| GST (CGST + SGST) | 18% | All services (intra-state) |
| GST (IGST) | 18% | All services (inter-state) |
| TDS (Section 194J) | 10% | If customer deducts TDS |
| TDS (Section 194O) | 1% | E-commerce transactions |

### 16.2 Invoice Details

| Field | Details |
|-------|---------|
| Seller Name | MyLeadX Technologies Pvt. Ltd. |
| GSTIN | [To be updated] |
| PAN | [To be updated] |
| SAC Code | 998314 (IT Services) |
| Place of Supply | As per customer's state |
| Invoice Format | GST-compliant tax invoice |

### 16.3 TDS Handling

| Scenario | Process |
|----------|---------|
| Customer deducts TDS | Provide Form 16A quarterly |
| TDS Certificate | Upload via Dashboard > Billing > TDS |
| Credit Adjustment | Applied within 30 days of certificate upload |
| TDS Rate | 10% u/s 194J (technical services) |

### 16.4 Compliance Certifications

| Certification | Status | Timeline |
|---------------|--------|----------|
| GST Registration | ✓ Active | - |
| PAN Verification | ✓ Active | - |
| ISO 27001 | 🔄 Planned | Q4 2025 |
| SOC 2 Type II | 🔄 In Progress | Q3 2025 |
| GDPR Compliance | ✓ Framework Ready | - |
| HIPAA | 🔄 Planned | 2026 |

### 16.5 Data Residency

| Region | Data Center | Customer Data |
|--------|-------------|---------------|
| India (Default) | AWS Mumbai (ap-south-1) | All Indian customers |
| Singapore | AWS Singapore (ap-southeast-1) | APAC customers (on request) |
| EU | AWS Frankfurt (eu-central-1) | EU customers (Enterprise only) |

### 16.6 Export & International Billing

| Item | Details |
|------|---------|
| Export of Services | Zero-rated GST (with LUT) |
| International Invoicing | USD/EUR available |
| Currency Conversion | At prevailing RBI rate |
| Wire Transfer | Available for Enterprise |
| Payment Gateway | Razorpay (India), Stripe (International) |

### 16.7 Audit & Records

| Item | Retention Period |
|------|------------------|
| Invoices | 8 years |
| Payment Records | 8 years |
| Customer Agreements | 8 years post-termination |
| Call Recordings | As per plan (30 days - 1 year) |
| System Logs | 90 days |

---

## 17. Referral & Affiliate Program

### 17.1 Customer Referral Program

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CUSTOMER REFERRAL PROGRAM                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  YOU REFER A FRIEND                                                 │
│  ─────────────────                                                  │
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│  │   YOU GET   │    │ FRIEND GETS│    │  CONDITION  │             │
│  │  1 MONTH    │───▶│   10% OFF   │───▶│ Friend pays │             │
│  │   FREE      │    │ FIRST YEAR │    │ first month │             │
│  └─────────────┘    └─────────────┘    └─────────────┘             │
│                                                                     │
│  UNLIMITED REFERRALS - NO CAP ON REWARDS                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 17.2 Referral Rewards Table

| Your Plan | Referral Converts To | Your Reward |
|-----------|---------------------|-------------|
| Any | Starter | 15 days free |
| Any | Growth | 1 month free |
| Any | Scale | 2 months free |
| Any | Enterprise | 3 months free |

### 17.3 Referral Process

| Step | Action |
|------|--------|
| 1. Get Link | Dashboard > Referrals > Copy Unique Link |
| 2. Share | Share with friends, colleagues, network |
| 3. Track | Monitor signups in Referral Dashboard |
| 4. Earn | Reward credited when referee pays first invoice |
| 5. Redeem | Auto-applied to next billing cycle |

### 17.4 Affiliate Program

**For:** Bloggers, Influencers, Consultants, Agencies

| Tier | Monthly Referrals | Commission | Cookie Duration |
|------|-------------------|------------|-----------------|
| Bronze | 1-5 | 15% | 30 days |
| Silver | 6-15 | 20% | 60 days |
| Gold | 16-30 | 25% | 90 days |
| Platinum | 31+ | 30% | 120 days |

**Commission Basis:** First year subscription value (recurring for 12 months)

### 17.5 Affiliate Payout

| Item | Details |
|------|---------|
| Minimum Payout | ₹5,000 |
| Payout Frequency | Monthly (15th of each month) |
| Payout Method | Bank Transfer / UPI |
| Payout Delay | 45 days (to account for refunds) |
| Tax Deduction | 10% TDS on commission |

### 17.6 Affiliate Terms

| Rule | Policy |
|------|--------|
| Self-referral | Not allowed |
| Coupon Stacking | Affiliate code + Annual discount only |
| Brand Bidding | Not allowed (no ads on "MyLeadX" keywords) |
| Spam/Misleading | Immediate termination |
| Cookie Override | Last click attribution |

### 17.7 Partner Program (For Agencies)

| Partner Tier | Annual Revenue | Benefits |
|--------------|----------------|----------|
| **Registered** | < ₹5L | 15% recurring commission, Partner badge |
| **Silver** | ₹5L - ₹15L | 20% commission, Co-marketing, Priority support |
| **Gold** | ₹15L - ₹40L | 25% commission, Dedicated PM, Lead sharing |
| **Platinum** | > ₹40L | 30% commission, Custom terms, Joint ventures |

### 17.8 Partner Benefits

| Benefit | Registered | Silver | Gold | Platinum |
|---------|------------|--------|------|----------|
| Commission Rate | 15% | 20% | 25% | 30% |
| Partner Badge | ✓ | ✓ | ✓ | ✓ |
| Partner Directory | - | ✓ | ✓ | ✓ |
| Co-marketing | - | ✓ | ✓ | ✓ |
| Lead Sharing | - | - | ✓ | ✓ |
| Dedicated PM | - | - | ✓ | ✓ |
| Beta Access | - | - | ✓ | ✓ |
| Custom Integration | - | - | - | ✓ |
| Revenue Share on Deals | - | - | - | ✓ |

### 17.9 Referral Code Examples

| Code Type | Format | Example |
|-----------|--------|---------|
| Customer Referral | REF-[USERID] | REF-ABC123 |
| Affiliate | AFF-[NAME] | AFF-TECHBLOG |
| Partner | PTR-[COMPANY] | PTR-ACMEAGENCY |
| Campaign | [CAMPAIGN]-[YEAR] | PRODUCTHUNT-2025 |

---

## 18. Sales Team Commission Structure

### 18.1 Sales Team Roles

| Role | Responsibilities | Target Segment |
|------|------------------|----------------|
| **SDR (Sales Dev Rep)** | Lead qualification, demo booking | All inbound leads |
| **AE (Account Executive)** | Demo, negotiation, closing | SMB & Mid-Market |
| **Sr. AE** | Complex deals, multi-stakeholder | Mid-Market & Enterprise |
| **Enterprise AE** | Strategic accounts, custom deals | Enterprise only |
| **Channel Manager** | Partner recruitment, enablement | Partners & Resellers |
| **Sales Manager** | Team management, forecasting | Team oversight |

### 18.2 Base Salary Ranges

| Role | Base Salary (Annual) | Variable (OTE) | Total OTE |
|------|---------------------|----------------|-----------|
| SDR | ₹3.5L - ₹5L | ₹1L - ₹2L | ₹4.5L - ₹7L |
| AE | ₹6L - ₹10L | ₹4L - ₹8L | ₹10L - ₹18L |
| Sr. AE | ₹10L - ₹15L | ₹8L - ₹12L | ₹18L - ₹27L |
| Enterprise AE | ₹15L - ₹25L | ₹12L - ₹20L | ₹27L - ₹45L |
| Channel Manager | ₹8L - ₹12L | ₹4L - ₹8L | ₹12L - ₹20L |
| Sales Manager | ₹15L - ₹22L | ₹6L - ₹12L | ₹21L - ₹34L |

### 18.3 Commission Structure - New Business

| Deal Size (ACV) | SDR | AE | Manager Override |
|-----------------|-----|-----|------------------|
| < ₹50,000 | ₹500 flat | 8% | 1% |
| ₹50,000 - ₹2L | ₹1,000 flat | 10% | 1.5% |
| ₹2L - ₹5L | ₹2,000 flat | 12% | 2% |
| ₹5L - ₹15L | ₹3,500 flat | 14% | 2.5% |
| ₹15L - ₹50L | ₹5,000 flat | 15% | 3% |
| > ₹50L | ₹10,000 flat | 16% | 3.5% |

**ACV = Annual Contract Value**

### 18.4 Commission Accelerators

| Quota Attainment | Commission Multiplier |
|------------------|----------------------|
| 0% - 50% | 0.5x (reduced) |
| 50% - 80% | 0.8x |
| 80% - 100% | 1.0x (standard) |
| 100% - 120% | 1.25x (accelerated) |
| 120% - 150% | 1.5x |
| 150%+ | 2.0x (super accelerator) |

### 18.5 Commission - Renewals & Upsells

| Type | AE Commission | CSM Commission |
|------|---------------|----------------|
| Renewal (same value) | 3% | 2% |
| Upsell (additional ACV) | 8% | 4% |
| Expansion (new users/modules) | 10% | 5% |
| Multi-year renewal | 5% of total | 3% of total |

### 18.6 Commission - Channel/Partner Sales

| Scenario | AE Commission | Channel Manager |
|----------|---------------|-----------------|
| Partner-sourced, AE-closed | 5% | 8% |
| Partner-sourced, Partner-closed | 0% | 5% + partner commission |
| AE-sourced, Partner-involved | 8% | 3% |
| White-label deal | 3% | 10% |

### 18.7 Quota Setting

| Role | Monthly Quota | Quarterly Quota | Annual Quota |
|------|---------------|-----------------|--------------|
| SDR | 20 qualified meetings | 60 meetings | 240 meetings |
| AE | ₹3L new ACV | ₹9L new ACV | ₹36L new ACV |
| Sr. AE | ₹6L new ACV | ₹18L new ACV | ₹72L new ACV |
| Enterprise AE | ₹12L new ACV | ₹36L new ACV | ₹1.44Cr new ACV |
| Channel Manager | ₹8L partner revenue | ₹24L partner revenue | ₹96L partner revenue |

### 18.8 Commission Payout Schedule

| Component | Payout Timing |
|-----------|---------------|
| Base Salary | Monthly (last working day) |
| Commission (< ₹5L deal) | Monthly with salary |
| Commission (> ₹5L deal) | 50% on signing, 50% on payment received |
| Accelerators | Quarterly true-up |
| Annual Bonus | Within 30 days of fiscal year end |

### 18.9 Clawback Policy

| Scenario | Clawback |
|----------|----------|
| Customer cancels within 30 days | 100% commission clawback |
| Customer cancels 31-90 days | 50% commission clawback |
| Customer downgrades within 90 days | Pro-rata clawback |
| Fraudulent deal / Policy violation | 100% clawback + disciplinary action |
| Employee leaves within 90 days of deal | 50% clawback |

### 18.10 SPIFs (Special Incentives)

| SPIF Type | Reward | Duration |
|-----------|--------|----------|
| First deal of the month | ₹5,000 bonus | Monthly |
| Largest deal of quarter | ₹25,000 bonus | Quarterly |
| 3 Enterprise deals in quarter | Weekend trip | Quarterly |
| Annual top performer | International trip + ₹1L | Annual |
| New product launch push | 2x commission | Launch period |
| End of quarter push | 1.5x on deals closed in last week | Last week |

---

## 19. Enterprise Negotiation Guidelines

### 19.1 Negotiation Authority Matrix

| Discount Level | Approval Required | Response Time |
|----------------|-------------------|---------------|
| 0% - 10% | AE (self-approval) | Immediate |
| 11% - 20% | Sales Manager | 4 hours |
| 21% - 30% | VP Sales | 24 hours |
| 31% - 40% | CEO + Finance | 48 hours |
| 41% - 50% | CEO + Board (rare) | 1 week |
| > 50% | Not allowed | - |

### 19.2 Standard vs. Negotiable Terms

| Term | Standard | Negotiable | Max Flexibility |
|------|----------|------------|-----------------|
| Payment Terms | Net 15 | Net 30 | Net 60 (Enterprise) |
| Billing Frequency | Monthly/Annual | Quarterly | Custom |
| Contract Length | 12 months | 24-36 months | 5 years max |
| Price per User | List price | Volume discount | -40% max |
| Implementation Fee | ₹25,000 | Waive on 2yr+ | Full waive |
| Support Level | Per plan | Upgrade free | Dedicated CSM |
| SLA Uptime | 99.9% | 99.95% | 99.99% (custom infra) |

### 19.3 Volume Discount Matrix

| Users | Discount |
|-------|----------|
| 1-10 | 0% (list price) |
| 11-25 | 5% |
| 26-50 | 10% |
| 51-100 | 15% |
| 101-250 | 20% |
| 251-500 | 25% |
| 500+ | 30% + custom |

### 19.4 Multi-Year Discount Matrix

| Contract Term | Additional Discount | Payment Options |
|---------------|---------------------|-----------------|
| 1 year | 0% (baseline) | Monthly / Annual |
| 2 years | 10% extra | Annual / Bi-annual |
| 3 years | 20% extra | Annual / Upfront |
| 5 years | 30% extra | Annual / Upfront |

**Note:** Multi-year discounts stack with volume discounts (max combined: 50%)

### 19.5 Deal Qualification Checklist

Before offering significant discounts, verify:

| Checkpoint | Requirement |
|------------|-------------|
| ☐ Budget Confirmed | Customer has confirmed budget availability |
| ☐ Decision Maker | Talking to economic buyer |
| ☐ Timeline | Decision expected within 30 days |
| ☐ Competition | Know competitive alternatives |
| ☐ Champion | Internal advocate identified |
| ☐ Business Case | Clear ROI established |
| ☐ Technical Fit | POC/Demo completed successfully |
| ☐ Legal Ready | Procurement/legal process understood |

### 19.6 Competitor Response Guidelines

| Competitor | Our Position | Max Discount to Win |
|------------|--------------|---------------------|
| Zoho CRM | Feature parity + AI Voice | 15% |
| Freshsales | AI Voice advantage | 10% |
| LeadSquared | Similar, focus on AI | 20% |
| WATI/Interakt | CRM + AI Voice bundle | 10% |
| HubSpot | Cost advantage | 15% |
| Salesforce | Significant cost advantage | 25% |
| Local/Small vendors | Feature + support advantage | 5% |

### 19.7 Non-Discount Negotiation Levers

Before offering discounts, try these value-adds:

| Lever | Value | Cost to Us |
|-------|-------|------------|
| Extended trial | 30 days → 60 days | Low |
| Free implementation | Worth ₹25K-50K | Medium |
| Extra users (10-20%) | Perceived high value | Low |
| Free AI minutes (500+) | Worth ₹6K | Low |
| Priority support upgrade | Worth ₹3K/mo | Low |
| Custom training sessions | 2-4 hours | Medium |
| Dedicated CSM (temporary) | 3 months | Medium |
| Beta feature access | Exclusive feeling | Zero |
| Case study participation | Marketing value | Zero |
| Advisory board seat | Prestige | Zero |

### 19.8 Red Lines (Non-Negotiable)

| Term | Policy | Reason |
|------|--------|--------|
| Discount > 50% | Never | Below cost |
| Unlimited users | Never | Unscalable |
| Perpetual license | Never | SaaS model |
| Source code access | Never | IP protection |
| Custom SLA > 99.99% | Never | Unrealistic |
| Unlimited AI minutes | Never | Variable cost |
| Retroactive pricing | Never | Sets bad precedent |
| MFN (Most Favored Nation) | Avoid | Limits flexibility |
| Right to audit | Avoid | Operational burden |
| Unlimited liability | Never | Legal risk |

### 19.9 Enterprise Deal Checklist

| Stage | Required Documents |
|-------|-------------------|
| **Discovery** | ☐ Meeting notes, ☐ Org chart, ☐ Budget range |
| **Demo** | ☐ Demo recording, ☐ Use case document |
| **Proposal** | ☐ Custom proposal, ☐ ROI calculator |
| **Negotiation** | ☐ Discount approval form, ☐ Legal redlines |
| **Closing** | ☐ Signed contract, ☐ PO received |
| **Handoff** | ☐ Implementation plan, ☐ CSM intro |

### 19.10 Deal Desk Process

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ENTERPRISE DEAL DESK FLOW                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. AE submits Deal Desk Request                                    │
│     └── Deal size, discount requested, justification                │
│                                                                     │
│  2. Deal Desk Review (within 4 hours)                               │
│     └── Validate discount, suggest alternatives                     │
│                                                                     │
│  3. Approval Chain (based on discount %)                            │
│     └── Manager → VP → CEO (as needed)                              │
│                                                                     │
│  4. Custom Contract Generation                                      │
│     └── Legal review for non-standard terms                         │
│                                                                     │
│  5. Final Approval & Signature                                      │
│     └── DocuSign sent to customer                                   │
│                                                                     │
│  6. CRM Update & Commission Calculation                             │
│     └── Salesforce updated, commission logged                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 19.11 Quarterly Deal Review

| Metric | Target | Action if Below |
|--------|--------|-----------------|
| Average Discount | < 15% | Review AE discounting habits |
| Discount Distribution | Normal curve | Identify outliers |
| Win Rate at List | > 30% | Assess pricing competitiveness |
| Multi-year % | > 40% | Push longer commitments |
| Upsell Rate | > 25% | Improve expansion plays |
| Time to Close | < 45 days | Streamline process |

---

## Appendix A: Sample Customer Invoice

```
┌────────────────────────────────────────────────────────────┐
│  INVOICE - ABC Company                     March 2025      │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Subscription: Growth Plan                    ₹7,999.00    │
│                                                            │
│  Add-ons:                                                  │
│    Extra Users (3)                              ₹897.00    │
│    Extra Phone Number (1)                       ₹500.00    │
│                                                            │
│  Usage (from Wallet):                                      │
│    WhatsApp Marketing (450 msgs)                ₹540.00    │
│    WhatsApp Utility (1,200 msgs)                ₹240.00    │
│    SMS (300)                                     ₹90.00    │
│    Extra AI Minutes (150 mins)                ₹1,800.00    │
│                                                            │
│  ─────────────────────────────────────────────────────────│
│  Subtotal                                    ₹12,066.00    │
│  GST (18%)                                    ₹2,171.88    │
│  ─────────────────────────────────────────────────────────│
│  TOTAL                                       ₹14,237.88    │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Appendix B: Quick Reference Card

```
╔══════════════════════════════════════════════════════════════════════════╗
║                     MyLeadX Pricing Quick Reference                       ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  CRM ONLY                          CRM + AI VOICE                        ║
║  ─────────                         ──────────────                        ║
║  Starter    ₹2,499/mo              Growth      ₹7,999/mo                 ║
║  Pro        ₹4,999/mo              Scale       ₹19,999/mo                ║
║  Business   ₹12,999/mo             Enterprise  ₹49,999/mo                ║
║                                                                          ║
║  WHITE-LABEL / RESELLER                                                  ║
║  ──────────────────────                                                  ║
║  Partner    ₹29,999/mo   (10 clients)                                    ║
║  Agency     ₹79,999/mo   (50 clients)                                    ║
║  Enterprise ₹1,99,999/mo (unlimited)                                     ║
║                                                                          ║
║  WALLET RATES                                                            ║
║  ────────────                                                            ║
║  WhatsApp Marketing    ₹1.20/msg                                         ║
║  WhatsApp Utility      ₹0.20/msg                                         ║
║  SMS                   ₹0.30/sms                                         ║
║  Extra AI Minutes      ₹12/min                                           ║
║                                                                          ║
║  YEARLY DISCOUNT: 20% OFF                                                ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

**Document Prepared By:** MyLeadX Strategy Team
**Last Updated:** April 2025
**Next Review:** July 2025

---

*This document is confidential and intended for internal use only. Pricing and features are subject to change based on market conditions and business requirements.*
