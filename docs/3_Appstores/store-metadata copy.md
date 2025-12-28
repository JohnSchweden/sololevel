Preparing an app for beta testing can feel like a mountain of paperwork before you even get to the code. Whether you are using **TestFlight** or **Google Play Console**, having your metadata and assets ready in advance will save you from "Review Rejected" notifications.

Below is a comprehensive requirements list and pre-submission checklist.

---

## 1. Cross-Platform General Requirements

These items are required for both stores. It’s best to keep these in a shared "Launch Folder."

* **App Name:** Up to 30 characters (keep it consistent).
* **Privacy Policy URL:** A hosted link (cannot be a raw PDF; must be a web page).
* **Support URL:** A way for testers to contact you or view FAQs.
* **App Icon:** 1024x1024px (PNG, no transparency).
* **Contact Info:** Name, email, and phone number for the primary developer/admin.
* **Demo Account Credentials:** If your app has a login, you **must** provide a working test account for the reviewers.

---

## 2. iOS (TestFlight) Specific Requirements

Apple distinguishes between **Internal Testers** (up to 100 team members) and **External Testers** (up to 10,000 users).

| Requirement | Specification |
| --- | --- |
| **Bundle ID** | A unique identifier (e.g., `com.company.appname`). |
| **Signing & Certificates** | Distribution Certificate and App Store Provisioning Profile. |
| **Beta App Review** | External testing requires a mini-review by Apple (takes 24–48 hours). |
| **Export Compliance** | Information on whether your app uses encryption (HTTPS is standard). |
| **What to Test** | A brief note (visible to testers) explaining what features to focus on. |
| **Build Format** | `.ipa` file uploaded via Xcode or Transporter. |

---

## 3. Google Play (Internal & Closed Beta) Requirements

Google has two main beta tiers: **Internal** (instant, for 100 people) and **Closed** (requires review, for specific email lists).

| Requirement | Specification |
| --- | --- |
| **Package Name** | A unique identifier (e.g., `com.company.appname`). |
| **AAB Format** | Google now requires `.aab` (Android App Bundle), not `.apk`. |
| **Data Safety Form** | A detailed survey on how you collect/share user data (mandatory). |
| **20 Tester Rule** | **Note:** New personal accounts created after Nov 2023 must have 20 testers opted-in for 14 days before moving to Production. |
| **Target API Level** | Must target a recent Android version (usually the latest or one version back). |
| **Store Listing** | Short description (80 chars) and Full description (4000 chars). |

---

## 4. Pre-Submission Checklist

### **Individual Platform Checks**

* [ ] **iOS:** Have you incremented the **Build Number** (not just the Version Number)?
* [ ] **iOS:** Is the "App Store Icon" in the Xcode project set to 1024px?
* [ ] **Android:** Have you opted into **Google Play App Signing**?
* [ ] **Android:** Is the `versionCode` in your `build.gradle` higher than the last upload?

### **Cross-Platform Checklist (The "Don't Forget" List)**

* [ ] **Functionality:** Does the app crash immediately on launch in a "Release" environment?
* [ ] **Connectivity:** If the app requires an API, are the production servers live and reachable?
* [ ] **Assets:** Are screenshots high quality and not showing "debug" banners?
* [ ] **Permissions:** Does the app ask for permissions (Camera, Location) only when needed?
* [ ] **Legal:** Does your Privacy Policy specifically mention data collection for "Beta Testing"?

---

### **A Quick Note on Testing Tracks**

> **Pro Tip:** If you are in a rush, use the **Google Play Internal Testing** track. It bypasses the standard review process and makes the app available to your designated testers within minutes. On iOS, **Internal TestFlight** is also instant once the build finishes processing.

**Would you like me to help you draft the "Data Safety" disclosures or a template for your App Store description?**