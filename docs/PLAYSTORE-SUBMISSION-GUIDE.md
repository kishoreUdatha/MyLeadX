# MyLeadX - Google Play Store Submission Guide

## Pre-Submission Checklist

- [x] AAB file generated: `telecaller-app/android/app/build/outputs/bundle/prodRelease/app-prod-release.aab`
- [x] Privacy Policy created and hosted
- [x] Terms of Service created and hosted
- [x] App icon designed (512x512)
- [x] Feature graphic designed (1024x500)
- [x] Store listing content prepared

---

## Step 1: Enable GitHub Pages (Host Legal Documents)

1. Go to your GitHub repository: https://github.com/kishoreUdatha/MyLeadX
2. Click **Settings** (gear icon)
3. Scroll down to **Pages** in the left sidebar
4. Under "Source", select **Deploy from a branch**
5. Select **main** branch and **/docs** folder
6. Click **Save**

After a few minutes, your documents will be live at:
- **Privacy Policy**: https://kishoreudatha.github.io/MyLeadX/privacy-policy.html
- **Terms of Service**: https://kishoreudatha.github.io/MyLeadX/terms-of-service.html
- **Landing Page**: https://kishoreudatha.github.io/MyLeadX/

---

## Step 2: Convert Assets to PNG

1. Open locally: `docs/convert-to-png.html` in your browser
2. Click "Download PNG" for each asset
3. Save the files:
   - `myleadx-app-icon.png` (512x512)
   - `myleadx-feature-graphic.png` (1024x500)

---

## Step 3: Create Google Play Developer Account

1. Go to https://play.google.com/console
2. Sign in with your Google account
3. Pay the one-time $25 registration fee
4. Complete identity verification (may take 24-48 hours)
5. Accept the Developer Distribution Agreement

---

## Step 4: Create App in Play Console

1. Click **Create app**
2. Fill in the details:
   - **App name**: MyLeadX
   - **Default language**: English (United States)
   - **App or game**: App
   - **Free or paid**: Free
3. Accept the declarations and click **Create app**

---

## Step 5: Set Up Store Listing

### Main Store Listing

Navigate to **Grow > Store presence > Main store listing**

#### App Details
- **App name**: MyLeadX
- **Short description** (80 chars max):
```
Smart CRM for telecallers - manage leads, track calls & boost conversions
```

- **Full description** (4000 chars max):
```
MyLeadX is the ultimate mobile CRM designed specifically for telecallers and sales teams. Transform your calling workflow with powerful lead management, intelligent call tracking, and real-time performance analytics.

KEY FEATURES:

ONE-TAP CALLING
- Instant dial directly from lead cards
- Automatic call duration tracking
- Seamless transition between calls

SMART LEAD MANAGEMENT
- View all assigned leads in one place
- Filter by status, date, or priority
- Quick search to find any lead instantly
- Add notes and alternate contacts

CALL OUTCOME TRACKING
- Mark calls as Interested, Not Interested, Callback, Converted, and more
- Schedule follow-up reminders
- Add detailed notes for each interaction
- Capture alternate phone numbers

CALLBACK MANAGEMENT
- Never miss a follow-up
- Smart reminders for scheduled callbacks
- View all pending callbacks in dedicated section
- One-tap reschedule

PERFORMANCE DASHBOARD
- Daily call statistics at a glance
- Track your conversion rate
- Monitor leads contacted vs pending
- Boost your productivity

TEAM COLLABORATION
- Sync with your organization's CRM
- Real-time lead updates
- Secure data handling

WHY TELECALLERS LOVE MYLEADX:
- Simple, intuitive interface
- Works offline - sync when online
- Fast and lightweight app
- Dark mode support
- Designed by telecallers, for telecallers

Perfect for:
- Sales teams
- Telecallers
- Business development teams
- Lead generation agencies
- Call centers

Download MyLeadX today and transform your telecalling experience!
```

#### Graphics
- **App icon**: Upload `myleadx-app-icon.png` (512x512)
- **Feature graphic**: Upload `myleadx-feature-graphic.png` (1024x500)
- **Screenshots**: Upload 2-8 phone screenshots (you'll need to capture these from the app)

---

## Step 6: App Content

Navigate to **Policy > App content**

### Privacy Policy
- Enter URL: `https://kishoreudatha.github.io/MyLeadX/privacy-policy.html`

### App Access
- Select: **All functionality is available without special access**

### Ads
- Select: **No, my app does not contain ads**

### Content Rating
1. Click **Start questionnaire**
2. Enter your email
3. Select category: **Utility, Productivity, Communication, or Other**
4. Answer questions (mostly "No" for a CRM app)
5. Submit to receive your rating

### Target Audience
- Select: **18 and over** (business app)

### News Apps
- Select: **No, my app is not a news app**

### Data Safety
Fill out the data safety form:
- **Does your app collect or share user data?**: Yes
- **Data types collected**:
  - Personal info: Name, Email, Phone number
  - App activity: App interactions
  - Device or other IDs
- **Is all data encrypted in transit?**: Yes
- **Do you provide a way for users to request data deletion?**: Yes (contact support@myleadx.ai)

---

## Step 7: App Releases

Navigate to **Release > Production**

### Create New Release
1. Click **Create new release**
2. Under "App bundles", click **Upload** and select your AAB file:
   ```
   telecaller-app/android/app/build/outputs/bundle/prodRelease/app-prod-release.aab
   ```
3. Wait for upload and processing

### Release Details
- **Release name**: 1.0.0
- **Release notes**:
```
Initial release of MyLeadX - Smart CRM for Telecallers

Features:
• One-tap calling with automatic duration tracking
• Smart lead management with filters and search
• Call outcome tracking with 8 disposition types
• Callback scheduling and reminders
• Performance dashboard with daily stats
• Offline support with background sync
• Dark mode support

Transform your telecalling workflow with MyLeadX!
```

4. Click **Review release**
5. Click **Start rollout to Production**

---

## Step 8: App Screenshots (Required)

You need 2-8 screenshots. Here's how to capture them:

### Using Android Emulator or Device:
1. Run the app on emulator: `npx react-native run-android --variant=prodRelease`
2. Navigate to key screens:
   - Dashboard (home screen)
   - Lead list
   - Lead detail
   - Call outcome screen
   - Callback list
   - Settings
3. Take screenshots:
   - **Emulator**: Click camera icon in emulator toolbar
   - **Device**: Volume Down + Power button

### Screenshot Requirements:
- **Phone**: JPEG or PNG, 16:9 ratio, min 320px, max 3840px
- **Recommended**: 1080x1920 or 1440x2560

---

## Step 9: Review and Submit

1. Go to **Publishing overview**
2. Check that all sections show green checkmarks
3. Fix any issues shown in red
4. Click **Send for review**

---

## Timeline

- **Review time**: Usually 1-7 days for new apps
- **Common rejection reasons**:
  - Missing privacy policy
  - Insufficient screenshots
  - Incomplete data safety form
  - App crashes during review

---

## Post-Submission

### If Rejected:
1. Read the rejection email carefully
2. Fix the issues mentioned
3. Resubmit

### After Approval:
1. Your app will be live on Play Store
2. Share the link: `https://play.google.com/store/apps/details?id=com.crmleads.telecaller`

---

## Support

For any issues during submission:
- **Google Play Help**: https://support.google.com/googleplay/android-developer/
- **App Support**: support@myleadx.ai

---

## Quick Links

| Document | URL |
|----------|-----|
| Privacy Policy | https://kishoreudatha.github.io/MyLeadX/privacy-policy.html |
| Terms of Service | https://kishoreudatha.github.io/MyLeadX/terms-of-service.html |
| Landing Page | https://kishoreudatha.github.io/MyLeadX/ |
| Play Console | https://play.google.com/console |
