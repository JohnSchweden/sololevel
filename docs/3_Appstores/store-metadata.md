# Store Metadata & Submission Content

**Purpose:** Store listing text, privacy/data safety disclosures, and build configuration for iOS TestFlight and Google Play beta submissions.

**Last Updated:** 2025-12-07  
**Status:** Ready for beta submission

---

## Build Numbers

**Current Version:** `1.0.0`  
**iOS Build Number:** `1` (increment for each TestFlight upload)  
**Android Version Code:** `1` (increment for each Play Console upload)

**Increment Strategy:**
- iOS: Increment `ios.buildNumber` in `apps/expo/app.json` before each new build
- Android: Increment `android.versionCode` in `apps/expo/app.json` before each new build
- Version string (`expo.version`) can remain `1.0.0` during beta; bump to `1.0.1`, `1.1.0`, etc. for production releases

---

## Release Channel / Environment Mapping

### Production (Store Builds)
```env
EXPO_PUBLIC_SUPABASE_URL=https://<your-prod-project>.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=<production-anon-key>
AI_ANALYSIS_MODE=real
EXPO_PUBLIC_USE_MOCKS=false
```

### Staging/Beta
```env
EXPO_PUBLIC_SUPABASE_URL=https://<your-staging-project>.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=<staging-anon-key>
AI_ANALYSIS_MODE=real
EXPO_PUBLIC_USE_MOCKS=false
```

### Development/Internal
```env
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_KEY=<local-anon-key>
AI_ANALYSIS_MODE=mock
EXPO_PUBLIC_USE_MOCKS=true
```

**Note:** EAS Build automatically injects environment variables based on build profile. Configure in EAS dashboard or `eas.json` env vars.

---

## App Store Listing (iOS TestFlight / App Store)

### Basic Information
- **App Name:** Solo:Level
- **Subtitle:** Instant AI feedback on your videos
- **Bundle ID:** `ai.sololevel.app`
- **SKU:** `sololevel` (unique identifier for App Store Connect; can be any alphanumeric string)
- **Category:** Health & Fitness (Primary), Productivity (Secondary)
- **Age Rating:** 4+ (or 12+ if video content requires it)

### Description

**Short Description (30 characters):**
```
AI feedback coach for videos
```

**Full Description:**
```
Solo:Level is an AI-powered feedback coach that provides instant insights on your videos. Record or upload a short video (up to 30 seconds), and get comprehensive feedback with text highlights, audio coaching commentary, and measurable metrics.

Key Features:
• Record or upload videos directly from your device
• Instant AI analysis with multi-modal feedback (text, audio, metrics)
• Track your progress over time with history and insights
• Actionable recommendations to improve your performance
• Clean, intuitive interface designed for quick feedback loops

Perfect for:
• Presentation practice
• Public speaking improvement
• Physical activity form analysis
• Communication skills development

Get instant, actionable feedback without waiting for a human coach. Start improving today.
```

### Keywords (100 characters max)
```
ai coach,video feedback,form analysis,training,practice,presentation,public speaking,coaching
```

### Support & Marketing URLs
- **Support URL:** `https://sololevel.ai/support` (update with actual URL)
- **Marketing URL:** `https://sololevel.ai` (update with actual URL)
- **Privacy Policy URL:** `https://sololevel.ai/privacy` (REQUIRED - must be hosted before submission)

### Release Notes (Beta)
```
Initial beta release:
• Upload or record videos up to 30 seconds
• AI-powered feedback with text, audio, and metrics
• History view to track your progress
• Progress tracking and insights dashboard
• Camera and microphone permissions for video recording
```

### Screenshots Required
- **iPhone 6.7" (iPhone 14 Pro Max, 15 Pro Max):** 1290 x 2796 pixels
- **iPhone 6.5" (iPhone 11 Pro Max, XS Max):** 1242 x 2688 pixels
- **iPhone 5.5" (iPhone 8 Plus):** 1242 x 2208 pixels

**Screenshot Content Suggestions:**
1. Main recording/camera screen
2. Video analysis with feedback overlay
3. History/progress dashboard
4. Feedback panel with text and audio controls

---

## Google Play Console Listing

### Basic Information
- **App Name:** Solo:Level
- **Short Description (80 characters):**
```
Record or upload a 30s clip and get instant roast feedback with text, audio, and metrics.
```

### Full Description
```
Solo:Level is an AI-powered roast feedback coach that provides instant insights on your videos. Record or upload a short video (up to 30 seconds), and get comprehensive feedback with text highlights, audio coaching commentary, and measurable metrics.

Key Features:
• Record or upload videos directly from your device
• Instant AI analysis with multi-modal feedback (text, audio, metrics)
• Track your progress over time with history and insights
• Actionable recommendations to improve your performance
• Clean, intuitive interface designed for quick feedback loops

Perfect for:
• Presentation practice
• Public speaking improvement
• Physical activity form analysis
• Communication skills development

Get instant, actionable feedback without waiting for a human coach. Start improving today.
```

### Category
- **Primary:** Health & Fitness
- **Secondary:** Productivity

### Content Rating
- Complete Google Play content rating questionnaire
- Likely rating: Everyone or Teen (depending on video content policies)

### Support & Marketing URLs
- **Support URL:** `https://sololevel.ai/support` (update with actual URL)
- **Privacy Policy URL:** `https://sololevel.ai/privacy` (REQUIRED - must be hosted before submission)

### Release Notes (Beta)
```
Initial beta release:
• Upload or record videos up to 30 seconds
• AI-powered feedback with text, audio, and metrics
• History view to track your progress
• Progress tracking and insights dashboard
• Camera and microphone permissions for video recording
```

### Screenshots Required
- **Phone:** 1080 x 1920 pixels (minimum 2, recommended 8)
- **Tablet (7"):** 1200 x 1920 pixels (optional)
- **Tablet (10"):** 1600 x 2560 pixels (optional)
- **Feature Graphic:** 1024 x 500 pixels (required)

---

## Privacy & Data Safety Disclosures

### Data Collected

#### Personal Information
- **Email address / Authentication identifier:** Collected via Supabase Auth
  - Purpose: Account creation, authentication, user identification
  - Required: Yes
  - Shared with third parties: No (stored in Supabase, not sold)

#### User Content
- **Video recordings:** Uploaded to Supabase Storage
  - Purpose: Core app functionality (AI analysis and feedback generation)
  - Required: Yes (core feature)
  - Shared with third parties: No (processed via Supabase Edge Functions, not sold)
  - Retention: Until user deletes account or individual videos

- **Audio from videos:** Extracted and processed for analysis
  - Purpose: AI analysis and feedback generation
  - Required: Yes (core feature)
  - Shared with third parties: No
  - Retention: Until user deletes account or individual videos

#### Diagnostics & Analytics
- **Usage analytics:** (If implemented via Supabase Analytics or similar)
  - Purpose: Understanding user behavior, feature usage
  - Required: No
  - Shared with third parties: No (if using Supabase Analytics)

**Note:** No crash reporting or error tracking services are currently integrated.

### Data Usage

**App Functionality:**
- Video storage and processing for AI analysis
- User authentication and account management
- Progress tracking and history storage

**Analytics & Diagnostics:**
- Feature usage analytics (if implemented)

**No Advertising or Marketing:**
- No third-party advertising SDKs
- No cross-app tracking
- No data sold to advertisers

### Data Sharing

**Service Providers (Processors):**
- **Supabase:** Hosting, database, storage, authentication, Edge Functions
  - Purpose: Core app infrastructure
  - Data: User accounts, videos, analysis results, progress data
  - Location: United States (or as configured in Supabase project)

- **Google (Gemini AI):** Video analysis and feedback generation
  - Purpose: AI-powered video analysis and feedback
  - Data: Video content (temporary, processed and deleted after analysis)
  - Location: United States
  - Note: Videos are sent to Gemini API for analysis only; not stored by Google beyond processing

**No Data Sold:**
- We do not sell user data to third parties
- We do not share data for advertising purposes

### Data Security

- **Encryption in Transit:** All data transmitted via HTTPS/TLS
- **Storage Security:** Data stored in Supabase with Row Level Security (RLS) policies
- **Authentication:** Secure JWT-based authentication via Supabase Auth
- **Access Control:** User data isolated via RLS; only authenticated users can access their own data

**Note:** Do not claim "encrypted at rest" unless you've verified Supabase storage encryption policies for your specific plan.

### User Rights & Data Deletion

**Account Deletion:**
- Users can delete their account via in-app settings (if implemented) or by contacting support
- Account deletion removes: User profile, all video recordings, all analysis history, all progress data
- Deletion is permanent and cannot be undone

**Data Access:**
- Users can request a copy of their data by contacting support
- Data export functionality can be added in future releases

**Contact for Privacy Requests:**
- Email: `privacy@sololevel.ai` (update with actual email)
- Support URL: `https://sololevel.ai/support`

---

## iOS Export Compliance

**Question:** Does your app use encryption?

**Answer:** No (or "Uses standard encryption only")

**Rationale:**
- App uses standard HTTPS/TLS for data transmission (App Transport Security)
- No custom encryption beyond standard iOS/Android security features
- No encryption for purposes other than data transmission

**If you answer "No":**
- No further documentation required

**If you answer "Yes" (uses encryption beyond standard):**
- Complete ERN (Encryption Registration Number) process
- Provide compliance documentation

---

## Android Permissions Justification

### Required Permissions

**Camera (`android.permission.CAMERA`):**
- Purpose: Record videos for AI analysis
- Justification: Core feature - users record videos directly in the app
- Usage: Only when user initiates recording; permission requested at runtime

**Microphone (`android.permission.RECORD_AUDIO`):**
- Purpose: Record audio with video recordings
- Justification: Core feature - videos include audio for comprehensive analysis
- Usage: Only when user initiates recording; permission requested at runtime

**Read Media Video (`android.permission.READ_MEDIA_VIDEO`):**
- Purpose: Allow users to upload existing videos from device
- Justification: Core feature - users can upload videos from their gallery
- Usage: Only when user selects "Upload" option; permission requested at runtime

**Read Media Images (`android.permission.READ_MEDIA_IMAGES`):**
- Purpose: Allow users to access thumbnails/previews
- Justification: Display video thumbnails in history/gallery views
- Usage: Only when displaying video library; permission requested at runtime

**Note:** Legacy storage permissions (`WRITE_EXTERNAL_STORAGE`, `READ_EXTERNAL_STORAGE`) have been removed in favor of scoped storage permissions for Android 13+ (API 33+).

---

## Pre-Submission Checklist

> **Pro Tip:** Use **Internal TestFlight** (iOS) and **Google Play Internal Testing** tracks. These bypass review processes and make the app available to testers within minutes after build processing completes.

### iOS TestFlight (Internal Testing)
**Required for Internal Testing:**
- [x] Bundle ID matches App Store Connect: `ai.sololevel.app`
- [x] Build number incremented: `ios.buildNumber` in `apps/expo/app.json` (currently `1`)
- [x] Version string set: `expo.version` in `apps/expo/app.json` (currently `1.0.0`)
- [x] Privacy Policy URL hosted and accessible (`https://sololevel.ai/privacy` referenced in code)
- [X] Export compliance answered (requires App Store Connect - answer "No" for standard HTTPS/TLS) ITSAppUsesNonExemptEncryption set to false (NO)
- [x] TestFlight internal testing group configured (requires App Store Connect)
- [x] Build created via `eas:build:ios`
- [x] Build uploaded via `eas:submit:ios`

**How to Configure TestFlight Internal Testing:**
1. In App Store Connect, go to **TestFlight** tab
2. Click **Internal Testing** in left sidebar
3. Add testers:
   - Click **+** button to add tester email addresses directly (no confirmation needed for internal testing)
   - Or create a group first, then add testers to the group
4. Assign build to testers:
   - After uploading a build (via `eas submit -p ios`), select it from the dropdown
   - Enable it for the internal testing group/testers
5. Testers receive email invitation and can install via TestFlight app

**Optional for Internal Testing (required for External/Production):**
- [ ] Support URL configured (`https://sololevel.ai/support` referenced in code)
- [ ] Screenshots prepared (all required sizes)
- [ ] App description and keywords finalized (documented in this file)

### Google Play Console (Internal Testing)
**Required for Internal Testing:**
- [x] Package name matches Play Console: `ai.sololevel.app`
- [x] Version code incremented: `android.versionCode` in `apps/expo/app.json` (currently `1`)
- [x] Version name set: `expo.version` in `apps/expo/app.json` (currently `1.0.0`)
- [x] Privacy Policy URL hosted and accessible (`https://sololevel.ai/privacy` referenced in code)
- [x] Data Safety form completed (all sections) (requires Play Console)
- [x] Content rating questionnaire completed (requires Play Console)
- [x] Internal testing track configured (requires Play Console)
- [x] Build created via `eas:build:anroid`
- [x] Build uploaded via `eas:submit:anroid`

https://play.google.com/apps/internaltest/4701442905409277169

**How to Set Up Internal Testing:**
1. Build and submit: Run `eas build --platform android` then `eas submit --platform android` (or use `yarn eas:build:android` then `yarn eas:submit:android`)
   - This uploads the AAB to Play Console automatically (saved as draft)
2. Go to Play Console → Your app → **Release** → **Testing** → **Internal testing**
3. Click **Create new release** (or **Edit release** if one exists)
4. Select the uploaded AAB from "App bundles and APKs to add" dropdown (it will be in the list from step 1)
5. Add release notes (see "Release Notes (Beta)" section above)
6. Click **Review release** → **Start rollout to Internal testing**
7. Add testers:
   - Go to **Testers** tab → **Create email list** (or use existing list)
   - Add tester email addresses
   - **Share the opt-in URL manually** (see "How Testers Join Internal Testing" below)

**Note:** `eas submit` uploads the bundle automatically - you don't need to manually upload the file. You only need to create the release and assign the already-uploaded bundle to it.

**How Testers Join Internal Testing:**
- **IMPORTANT:** Google Play does NOT automatically send invitation emails for internal testing. You must manually share the opt-in URL.
- **Steps to share with testers:**
  1. Go to Play Console → **Release** → **Testing** → **Internal testing** → **Testers** tab
  2. Find the "Opt-in URL" (copy this link)
  3. Send the opt-in URL to your testers manually (email, Slack, etc.)
  4. Testers click the link and accept to join the testing program
- **After opt-in:** Once testers have opted in, they automatically receive email notifications when you start a rollout for NEW releases in Internal testing.
- **Existing releases:** If testers opt in AFTER a release is already rolled out, they won't get notified about that existing release, but they can access it via the Play Store link you share.

**Troubleshooting:**
- Testers not receiving emails → You need to manually share the opt-in URL (not automatic)
- Testers already opted in but not getting release emails → Check release rollout status is "In Progress" not "Draft"
- New testers added → Still need to share opt-in URL manually, then they'll get future release notifications

**Optional for Internal Testing (required for Closed Testing/Production):**
- [ ] Screenshots prepared (phone, feature graphic)
- [ ] App description finalized (documented in this file)
- [x] Permissions justified in Data Safety form (documented in this file)

**Note:** New Google Play accounts (created after Nov 2023) require 20 testers opted-in for 14 days before moving to Production.

### Both Platforms (Required)
- [x] Production Supabase environment configured (`env.prod.example` exists; verify EAS dashboard env vars)
- [x] Environment variables set for production builds (verify EAS dashboard configuration)
- [x] `expo-dev-client` removed from production plugins (not in plugins array; only in package.json deps)
- [ ] Tested release build on physical device (requires manual verification)
- [ ] All features working with production backend (requires manual verification)
- [ ] No debug/test code in production build (`/app/dev/` routes exist; verify routing protection)

---

## Next Steps After Beta Submission

1. **Monitor TestFlight/Play Console:**
   - Check for review rejections or warnings
   - Address any policy violations
   - Respond to tester feedback

2. **Prepare Production Release:**
   - Finalize store listing content based on beta feedback
   - Prepare marketing materials
   - Set up analytics tracking (if not already done)
   - Plan launch communication

3. **Privacy Policy:**
   - Host full privacy policy at declared URL
   - Ensure it matches disclosures in store listings
   - Include contact information for privacy requests

4. **Support Infrastructure:**
   - Set up support email/system
   - Prepare FAQ/documentation
   - Plan for user feedback and bug reports

---

## References

- **PRD:** `docs/spec/PRD.md`
- **TRD:** `docs/spec/TRD.md`
- **App Config:** `apps/expo/app.json`
- **EAS Config:** `apps/expo/eas.json`
- **Apple App Store Connect:** https://appstoreconnect.apple.com
- **Google Play Console:** https://play.google.com/console
