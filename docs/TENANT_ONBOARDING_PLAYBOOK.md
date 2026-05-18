# Tenant Onboarding Playbook — Meta + WhatsApp from Zero (Direct Meta)

For tenants who have **no Meta Developer Account, no Facebook Page setup, no Instagram Business, and no WhatsApp Business** — this playbook walks you through onboarding them end-to-end using a **single Meta Developer App** that powers Facebook Lead Ads, Instagram Lead Ads, AND WhatsApp Cloud API.

**No third-party services. No BSPs. No subscriptions to anyone but Meta.**

**Audience:** MyLeadX team member running the onboarding call.
**Tenant should be present** with their admin/founder for the duration of the call.

---

## Before the call — tenant should have ready

Send this checklist to the tenant **at least 24 hours ahead** so they have everything ready:

- [ ] **GST certificate** (PDF or photo) — for Meta Business Verification
- [ ] **Business PAN card** (PDF or photo)
- [ ] **Business address proof** (utility bill, lease, or printed letterhead)
- [ ] **Authorized signatory ID** (Aadhaar / Passport)
- [ ] **Business email address** that they can check during the call (for OTPs)
- [ ] **A dedicated phone number for WhatsApp Cloud API** — **STRONG RECOMMENDATION: get a fresh SIM card (~₹200, 30 min at any mobile shop) that has never been on any WhatsApp app.** Reasons below in the dedicated section. If they refuse a fresh SIM and want to reuse an existing number, that number must currently NOT be installed on any WhatsApp app (consumer or Business app) — and any existing chats on it will be permanently lost.
- [ ] **Laptop with Chrome/Firefox** and a stable internet connection
- [ ] **Personal Facebook account** that will admin everything (or willing to create one)
- [ ] **3 hours of uninterrupted time** with their admin/founder available
- [ ] **Their MyLeadX admin login** working (you confirm this beforehand)

If they don't have any of the above, the call can't complete. **Confirm all bullets in writing before scheduling.**

---

## ⚠️ Critical: WhatsApp phone number sourcing (read before scheduling)

The **single most common cause of onboarding-call failure** is the WhatsApp phone number being already registered on WhatsApp consumer or WhatsApp Business app. Meta's Cloud API requires a phone number that's not currently on any WhatsApp app — this is a hard rule, no workarounds.

### Three scenarios — each handled differently

**Scenario A — They have a number never used on WhatsApp** ⭐ **Cleanest**

A dedicated business landline they've never put on WhatsApp, or a fresh SIM. Register it in Cloud API during Phase 5. Zero conflicts. 30 minutes to live.

**Scenario B — They use "WhatsApp Business app" (consumer Play Store app)**

Their current customer chats live in that app. They have two choices:

- **Option B-1 (recommended):** Get a NEW SIM (~₹200, 30 min). Use that for Cloud API. Keep their existing WhatsApp Business app for legacy chats. Slowly migrate customers over time.
- **Option B-2:** Delete the WhatsApp Business app from the phone, wait for the number to be released, register it in Cloud API. **All existing chat history lost.** Not recommended during admission season — they lose past leads' chat context.

**Scenario C — They want to reuse a personal/business owner's WhatsApp number**

Same options as Scenario B, plus the added problem of mixing personal + business chats. **Strongly discourage this.** Get a fresh SIM.

### Strong recommendation for admission season

**Get a fresh SIM specifically for WhatsApp Business Cloud API.**

| Why fresh SIM | Detail |
|---|---|
| Costs ~₹200, takes 30 min | Any mobile shop. Many operators have ₹500/month business plans with unlimited messaging. |
| Zero conflict with existing systems | Their current WhatsApp Business app keeps working for legacy chats during the transition. |
| Number dedicated to MyLeadX traffic | Easier to track lead quality, reply rate, ROI. |
| Easy to retire if they ever stop using MyLeadX | Just deactivate the SIM. No data to migrate back. |
| **Avoids #1 cause of stuck onboarding calls** | "OTP fails because the number is on WhatsApp" is the most common phase-5 failure. |

### Worst-case fallback if the tenant doesn't bring a fresh SIM

If they insist on reusing their existing WhatsApp Business app number:

1. **Confirm in writing 24h before the call** that they're prepared to lose their chat history
2. **Have them uninstall the WhatsApp Business app from the phone 24-48h before the call** — Meta sometimes takes time to release the number
3. **If Phase 5 fails because Meta says "number is already in use"**: pause the call. Tenant goes to mobile shop now. Resume same evening.

### What to tell the tenant TODAY

Forward them this exact text:

> "Before tomorrow's call, please get a fresh SIM card (any operator, ~₹200) that you'll use exclusively for your business's WhatsApp through MyLeadX. The number must never have been used on WhatsApp before. Bring the SIM activated and inserted in a phone that can receive an OTP during the call. This avoids the #1 cause of setup delays. If you absolutely cannot get a new SIM, please reply and we'll discuss alternatives."

---

## Setup model

**One Meta Developer App handles all three channels.** Same App ID, same App Secret, same Business Manager — used for Facebook Lead Ads, Instagram Lead Ads, and WhatsApp Cloud API.

| Channel | What MyLeadX needs from tenant |
|---|---|
| Facebook Lead Ads | App ID, App Secret, Verify Token, Page Access Token, Page ID |
| Instagram Lead Ads | Same as above (Instagram leads flow through the FB Page webhook automatically when IG is linked) |
| WhatsApp Cloud API | Access Token, Phone Number ID, Business Account ID (WABA ID), App Secret |

The tenant fills all these into MyLeadX's existing wizards. We already built them.

**Cost to tenant**:
- Meta Developer App: free
- WhatsApp Cloud API: free first 1,000 conversations/month, then ~₹0.30–0.85 per 24h conversation
- Facebook/Instagram ad spend: whatever they were already paying

---

## Onboarding call agenda (~3 hrs)

| Phase | Duration | Who drives |
|---|---|---|
| Phase 1 — Meta Developer App | 30 min | You walking them through |
| Phase 2 — Facebook Page check | 10 min | Them |
| Phase 3 — Instagram Business connect | 10 min | Them |
| Phase 4 — Generate Page Access Token | 15 min | Them |
| Phase 5 — WhatsApp Cloud API setup (incl. 5.0 phone preflight) | 45 min — only 20-25 min if Business Verification already done from ads | You + them |
| Phase 6 — Connect everything in MyLeadX | 20 min | You driving |
| Phase 7 — WhatsApp templates submission | 15 min | You + them |
| Phase 8 — Pipeline + automation setup | 20 min | You configuring |
| Phase 9 — End-to-end test | 15 min | Both |
| Buffer for issues | 30 min | — |

**Note:** Phases 5, 7, and the test will be partially blocked if Meta business verification is pending (1-4 hours typical, sometimes up to 2-7 days). Plan for split-session if needed: get all credentials today, finish testing tomorrow.

---

## Phase 1 — Create Meta Developer Account & App (30 min)

**1.1** Tenant opens https://developers.facebook.com → **Get Started**

**1.2** Logs in with the Facebook account that admins their Facebook Page (NOT a personal-only account)

**1.3** Accepts the Developer Policy → enters their business phone for verification → enters OTP

**1.4** Creates app: **My Apps → Create App**
- Use case: **Other**
- App type: **Business**
- App name: **"[Tenant Name] CRM"** (e.g., "Bright Future College CRM")
- Contact email: tenant's business email
- Business Portfolio: pick existing OR "Create new business portfolio"

**1.5** Once app is created, copy these (they're shown on the dashboard):
- **App ID** (16 digits — visible at top)
- **App Secret** (App Settings → Basic → "Show" → enter password)

**1.6** Add products to the app (left sidebar → "Add Product"):
- **Webhooks**
- **Facebook Login for Business**
- **Lead Ads**
- **Instagram Graph API**
- **WhatsApp** ← critical, this is what enables Cloud API for the same app

**1.7** Make up a **Verify Token**: any random string, e.g., `[tenantname]_verify_2026`. Tenant writes it down — they'll paste it twice (once in Meta, once in MyLeadX).

**Checkpoint:** Tenant has noted down App ID, App Secret, and Verify Token. ✅

---

## Phase 2 — Facebook Page check (10 min)

**Most tenants already have one.** If not:

**2.1** Open https://facebook.com/pages/create → pick **Business**

**2.2** Page name = exact business name. Category = matches their industry (e.g., "Educational Institution")

**2.3** Add a profile picture + cover photo

**2.4** Note the **Page ID**:
- Open the Page → click "About" → scroll to "Page ID" near the bottom → copy
- Or visit `https://facebook.com/pg/[pagename]/about` and look for the ID

**Checkpoint:** Page ID written down. ✅

---

## Phase 3 — Instagram Business Account + connect (10 min)

**3.1** On the Instagram app → tenant logs into their business IG account

**3.2** **Settings → Account → Switch to Professional Account** → pick **Business**

**3.3** Connect to Facebook Page:
- Settings → Account → Linked Accounts → Facebook → Connect
- Picks the Facebook Page from Phase 2

**Critical:** Instagram Lead Ads use the Facebook Page's tokens. There's nothing separate to copy for IG — once it's linked to the FB Page, IG leads flow through the same webhook.

**Checkpoint:** Instagram Business linked to Facebook Page. ✅

---

## Phase 4 — Generate Page Access Token (15 min)

**This is the gnarliest step. Use System User for permanent token.**

**4.1** Tenant opens https://business.facebook.com/settings/system-users (logged in as same business account)

**4.2** Click **Add** → name "MyLeadX Integration" → role **Admin** → create

**4.3** Click the new system user → **Add Assets** → pick their Facebook Page → enable all permissions → save

**4.4** **Generate New Token**:
- Pick their App (from Phase 1)
- Token expiration: **Never**
- Permissions (check all of these):
  - `pages_show_list`
  - `leads_retrieval`
  - `pages_manage_metadata`
  - `pages_read_engagement`
  - `instagram_basic`
  - `instagram_manage_messages` (optional, for IG DMs)
  - `whatsapp_business_messaging` ← required for WhatsApp Cloud API
  - `whatsapp_business_management` ← required for template submission

**4.5** Copy the long token string (starts with `EAA...`) → save it. **This single token is used for BOTH Facebook/Instagram leads AND WhatsApp messaging.** No separate WhatsApp token needed.

**Checkpoint:** Page Access Token saved. ✅

---

## Phase 5 — WhatsApp Cloud API setup (45 min)

This uses the **same Meta App** from Phase 1, the **same Business Manager** they already use for ads, and the **same System User token** generated in Phase 4 (with WhatsApp scopes checked). No third-party signup. No new Business Verification if they've already verified for ads.

**Big win for tenants already running ads:** Meta Business Verification carries over automatically. If they've been running ads at any meaningful volume, their Business Manager is already verified. WhatsApp Cloud API picks this up — they skip the 24-72h Business Verification wait entirely and start at messaging tier 1 (1,000 unique recipients/day) on Day 0.

### 5.0 — Phone number preflight (5 min)

Before opening Meta's WhatsApp setup wizard:

- [ ] Tenant has the fresh SIM (or chosen number) ready and active
- [ ] Tenant has confirmed the number is NOT on any WhatsApp app
- [ ] Phone is in front of them and can receive SMS/calls during the call (for the OTP)
- [ ] If they brought a fresh SIM but the phone is currently using a different SIM, do the SIM swap NOW (before starting Meta's flow)

If any of the above isn't ready → pause and resolve. Don't proceed into Meta's wizard with a missing number — Meta won't let them back out cleanly mid-flow.

**5.1** In Meta Developer App → left sidebar → **WhatsApp → Getting Started**

**5.2** Meta gives a test phone number (`+1 555 ...`) that can be used immediately for development. Skip this — we want the tenant's real business number.

**5.3** Click **Add phone number** → starts the registration flow:
- Display Name: the tenant's business name as they want it to appear on WhatsApp (e.g., "Bright Future College")
- Category: pick matching industry
- Phone Number: tenant's business phone (must NOT have WhatsApp app installed)
- Verification method: SMS or Voice call → tenant enters OTP

**5.4** **Two-step verification PIN** — Meta forces this:
- Choose a 6-digit PIN, tenant writes it down (used if the number is ever re-verified)

**5.5** **Business Verification** — two cases:

**Case A — Tenant has been running Meta ads at any meaningful volume**
- Their Business Manager is already verified → Meta auto-detects this when WhatsApp Cloud API is enabled
- WhatsApp messaging tier 1 (1,000 unique recipients/day) unlocks immediately
- **Skip the rest of step 5.5. No upload, no wait.**

**Case B — Tenant has never run ads (or ads were too small to trigger verification)**
- Meta opens Business Manager → "Business Verification"
- Tenant uploads GST cert, PAN, address proof, signatory ID
- Submits → Meta reviews
- **Typical time: 1-4 hours. Worst case: up to 7 days.**
- During this time, the tenant CAN send template messages to phone numbers that have opted-in, but is rate-limited to 250 unique recipients per day (still plenty for admission-season Day 0)

**5.6** While business verification pends, capture these values (they're available immediately):
- **Phone Number ID** (15-digit number, in WhatsApp → API Setup, right under the registered phone number)
- **WhatsApp Business Account ID (WABA ID)** (top of the API Setup page, separate from Phone Number ID)

**5.7** If business verification takes longer than 1 hour, split the session: get all credentials saved into MyLeadX (Phase 6) and test with the tenant's own phone number as recipient. Continue testing tomorrow once verification completes.

**Checkpoint:** Phone Number ID + WABA ID saved. Phone OTP verified. Business verification submitted. ✅

---

## Phase 6 — Connect everything in MyLeadX (20 min)

### 6a — Facebook + Instagram

**6a.1** You log into MyLeadX as the tenant's admin → Settings → Ad Integrations → **Facebook Setup**

**6a.2** The wizard opens with the "First time here?" panel — close it (we already did the setup)

**6a.3** Paste in **Step 1**:
- App ID: (from Phase 1.5)
- App Secret: (from Phase 1.5)
- Verify Token: (the random string they wrote down)
- Click **Save for Webhook Setup**
- Paste their **Page Access Token** (from Phase 4.5) → click **Test Connection**

**6a.4** Wizard moves to **Step 2 — Select Page**:
- Their Facebook Page should appear in the list → click it
- Their existing Lead Forms (if any) appear below → select all relevant ones

**6a.5** **Step 3 — Field Mapping**: auto-mapping handles common fields. Confirm `firstName`, `phone`, `email` are mapped.

**6a.6** **Step 4 — Webhook Setup**:
- Wizard shows the webhook URL: `https://api.myleadx.ai/api/ads/facebook/webhook`
- Tenant copies it → goes back to Meta App → Webhooks product → Page → Add Subscription
- Pastes URL + Verify Token → Meta validates → subscribes to `leadgen` field
- Then in Meta Webhooks → Page section, subscribes their Page to the App
- Back in MyLeadX → **Complete Setup**

**Checkpoint:** Facebook & Instagram leads will now flow to MyLeadX. ✅

### 6b — WhatsApp (Meta Cloud API direct)

**6b.1** MyLeadX → Settings → **WhatsApp**

**6b.2** "First time setting up WhatsApp?" panel guides them → they pick **Meta Cloud API** (the "Official & Free" option, marked Recommended)

**6b.3** Form fields:
- WhatsApp Number: their business phone with country code (e.g., `+919876543210`)
- Access Token: same token from Phase 4.5 (works for both Lead Ads and WhatsApp because we requested both scopes)
- Phone Number ID: from Phase 5.6
- Business Account ID: from Phase 5.6 (WABA ID — required for template submission)
- App Secret: from Phase 1.5 (used to verify incoming webhook signatures)
- Click **Save**

**6b.4** Click **Test Connection** — should show "Connection verified successfully"

**6b.5** Configure WhatsApp webhook in Meta Developer App:
- Meta App → WhatsApp → Configuration → Webhook
- Callback URL: `https://api.myleadx.ai/api/whatsapp/webhook`
- Verify Token: `WHATSAPP_VERIFY_TOKEN` value from MyLeadX environment (or whatever the tenant chose during setup)
- Subscribe to fields: `messages`, `message_template_status_update`
- Save

**Checkpoint:** WhatsApp send/receive works through MyLeadX, direct Meta API. ✅

---

## Phase 7 — WhatsApp templates submission (15 min)

**7.1** MyLeadX → Settings → **WhatsApp Template Builder**

**7.2** Create 3 starter templates (you guide):

**Template 1 — Welcome Lead**
```
Name: welcome_lead
Category: Marketing
Language: en
Body: Hi {{firstName}}, thanks for your interest in {{course}} at {{orgName}}. Our counselor will contact you within 1 hour. - {{orgName}}
Sample values: firstName=Rahul, course=Engineering, orgName=ABC College
```

**Template 2 — Counseling Reminder**
```
Name: counseling_reminder
Category: Utility
Body: Hi {{firstName}}, this is a reminder that your counseling session is scheduled for {{date}} at {{time}}. Please reply YES to confirm. - {{orgName}}
```

**Template 3 — College Visit Invite**
```
Name: campus_visit_invite
Category: Marketing
Body: Hi {{firstName}}, we'd love to host you for a campus visit at {{orgName}} on {{date}}. Reply VISIT to book your slot. - {{orgName}}
```

**7.3** For each template → click **Submit to Meta** → confirm the dialog

**7.4** Templates show status **Pending**. Meta typically approves within 24 hours. The webhook handler we built auto-updates status to APPROVED when Meta's `message_template_status_update` event fires. Hourly sync job is a safety net. Tenant can also click **Refresh from Meta** manually.

**Checkpoint:** 3 templates submitted directly to Meta. ✅

---

## Phase 8 — Configure pipeline + automations (20 min)

You drive in MyLeadX → Settings:

**8.1** **Lead Stages** — confirm or create:
- NEW → CONTACTED → COUNSELING_BOOKED → VISIT_SCHEDULED → ADMITTED / LOST

**8.2** **Lead Sources** — should include AD_FACEBOOK, AD_INSTAGRAM (likely default)

**8.3** **Auto-assignment rule** — round-robin between their counselors (or whatever they prefer)

**8.4** **CRM Automation** rules:
- New lead from AD_FACEBOOK/AD_INSTAGRAM → send `welcome_lead` template via WhatsApp
- Lead reaches COUNSELING_BOOKED → send `counseling_reminder` 1 hour before scheduledAt
- Lead idle 48h after COUNSELING_BOOKED with no reply → escalate

**8.5** **AI agent script** (if they're using AI counseling):
- Welcome flow, FAQ answers, qualification questions, handoff trigger

**Checkpoint:** Pipeline + automations live. ✅

---

## Phase 9 — End-to-end test (15 min)

**9.1** Tenant runs a small test ad: ₹500 budget, 1-2 hour run, very narrow audience (their own team members)

**9.2** Tenant or team-member fills out the Lead Ad form on Facebook from their phone

**9.3** **Within 30 seconds**, verify in MyLeadX:
- Lead appears in their pipeline with source `AD_FACEBOOK`
- Auto-assignment fires → counselor gets push notification on telecaller app
- Welcome WhatsApp template sends → check the test phone receives it
- Reply on WhatsApp → message appears in MyLeadX lead conversation

**9.4** If anything misses, debug in this order:
1. Meta webhook not firing → check Meta App → Webhooks → Test (Meta has a "Test" button per subscribed field)
2. Lead not appearing → check FacebookIntegration row exists, signature verification passing
3. WhatsApp not sending → check Meta WhatsApp Manager → Phone Numbers → Insights, see if outbound failed
4. Template rejected → check the rejection reason in Meta WhatsApp Manager → Message Templates

**Checkpoint:** End-to-end works. ✅

---

# Final Checklist (post-onboarding)

Print this. Tenant signs off each line before you end the call.

## Meta side

- [ ] Meta Developer Account created and verified
- [ ] App created: `[Tenant Name] CRM`
- [ ] App ID, App Secret, Verify Token noted somewhere safe
- [ ] Webhooks, Facebook Login for Business, Lead Ads, Instagram, WhatsApp products added
- [ ] System User created with Admin role
- [ ] Permanent Page Access Token generated (expiry: Never) with all required scopes including whatsapp_business_messaging + whatsapp_business_management
- [ ] Facebook Page exists and is connected to Business Manager
- [ ] Instagram Business Account linked to Facebook Page
- [ ] Page subscribed to App's webhook for `leadgen` field
- [ ] WhatsApp phone number registered and OTP-verified in Meta
- [ ] Two-step verification PIN saved by tenant
- [ ] WhatsApp Business Account ID (WABA ID) and Phone Number ID saved
- [ ] Business Verification submitted (may be pending for hours/days)
- [ ] WhatsApp webhook configured (URL + verify token + `messages` and `message_template_status_update` subscriptions)

## MyLeadX side

- [ ] Facebook integration saved (`FacebookIntegration` row exists)
- [ ] WhatsApp settings saved with provider = Meta Cloud API
- [ ] WhatsApp test connection passes
- [ ] 3 welcome/reminder/invite templates created and submitted to Meta
- [ ] Lead pipeline stages defined
- [ ] Auto-assignment rule active
- [ ] CRM automation rules active (welcome message on NEW)
- [ ] (Optional) AI agent script configured
- [ ] Counselors invited as MyLeadX users with telecaller role
- [ ] Counselors have the mobile app installed and logged in
- [ ] Test lead end-to-end verified (or scheduled for retest once Meta business verification completes)

## Handoff to tenant

- [ ] Tenant signs in independently after the call (verify their login works without your help)
- [ ] Tenant has the link to your support email/Slack/WhatsApp
- [ ] Schedule a 30-min follow-up call in 3 days to check first-week metrics
- [ ] Send tenant a copy of this completed checklist as confirmation
- [ ] If Business Verification still pending: schedule retest of WhatsApp templates 24h later

---

## Common issues + quick fixes

| Issue | Fix |
|---|---|
| "Test Connection" fails on Facebook | Token missing `leads_retrieval`. Re-generate via System User with ALL required permissions. |
| Meta webhook validation fails | Verify Token mismatch. Make sure the same exact string is in Meta and MyLeadX. |
| No Lead Forms appear in dropdown | They haven't created any forms in Meta Ads Manager yet. Create one form first, then refresh. |
| WhatsApp phone OTP fails | Their business phone is currently registered on WhatsApp consumer or Business app. They need to uninstall WhatsApp from that phone first, OR use a different number. |
| WhatsApp send fails with "phone number not registered" | Phone Number ID is wrong, or the recipient never messaged this number first (free-form sends only work in 24h window). Use a template message instead. |
| Business Verification stuck | Meta needs additional docs. Check Business Manager → Security Center → Business Verification for the exact field they're asking for. Typical: GST in a clearer scan, or address mismatch. |
| Template stuck PENDING for 48+ hours | Click "Refresh from Meta" in MyLeadX. If still pending, check Meta WhatsApp Manager — sometimes Meta needs the tenant to confirm something there. |
| AI agent / Instagram lead not flowing | Make sure Instagram Business is linked to FB Page AND ad set targets IG placement. |
| Token says "expired" after 60 days | They generated a USER token instead of a SYSTEM USER token. Re-do Phase 4 via Business Settings → System Users → Generate New Token. |

---

## If something goes wrong during the call

Fastest fallback if Phase 5 (WhatsApp setup) blocks waiting on Meta business verification:
- Complete Phases 1-4 and 6a (Facebook/Instagram fully working)
- Save partial credentials for WhatsApp into MyLeadX where possible
- Schedule a follow-up call 4-24 hours later once Meta verification completes
- Tenant can start their ad campaign immediately; WhatsApp automation activates once verification is done

Support escalation order:
- **MyLeadX engineering**: internal Slack channel
- **Meta support**: business.facebook.com → Help Center → "Get Help" (slow but works for verification issues)
- **Meta Developer Community Forum**: developers.facebook.com/community (active for technical issues)

---

## What to do TODAY (before the call)

1. **Send the tenant the "Before the call" checklist by email/WhatsApp** — give them the rest of today to gather docs
2. **Send the tenant the WhatsApp SIM-card message** from the "Phone number sourcing" section above — get them to a mobile shop TODAY to buy + activate a fresh SIM. The 30 minutes saved tomorrow easily pays for the ₹200 SIM cost.
3. **Confirm in writing** that they have all 9 prerequisites — especially the **fresh SIM** activated and ready
4. **Pre-create their organization in MyLeadX** so the admin login is ready when you start the call
5. **Confirm Page Admin access**: ask "Who has Admin access to your Facebook Page and Business Manager? That person must be on tomorrow's call." If it's an outside agency, get the tenant added as Admin themselves before the call (takes 2 min once the current admin approves).
6. **Block 3.5 hours on your calendar** (give yourself 30 min after the call to write any tickets for issues found)
7. **Print this playbook** + the final checklist so you can mark things off as you go

### Sample message to send the tenant today

```
Hi [Tenant Name],

For tomorrow's MyLeadX onboarding call, please prepare these 4 things today:

1. DOCUMENTS (PDF or photo, on laptop):
   - GST certificate
   - PAN card
   - Business address proof
   - Signatory ID (Aadhaar/Passport)

2. FRESH WHATSAPP SIM (~₹200):
   - Go to any mobile shop today and buy a new SIM card
   - Activate it
   - This will be your business's official WhatsApp number for MyLeadX-driven leads
   - Important: don't install any WhatsApp app on this number before our call

3. PAGE ADMIN ACCESS:
   - The Facebook account with Admin rights on your Page must be on the call
   - If a marketing agency admins your Page, please get added as Admin yourself by tonight

4. RESERVE 3 HOURS:
   - Your admin/founder + me, uninterrupted
   - Have your laptop with Chrome ready
   - Have the fresh SIM in a phone that can receive OTPs

Reply "Confirmed" when all 4 are ready. See you tomorrow!
```
