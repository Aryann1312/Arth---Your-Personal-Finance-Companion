# Privacy Notice & Data Governance Policy

> **Commitment to Transparency**: This document details the data governance standards, collection policies, retention schedules, and user rights implemented in the Gold & Loan Calculator application.

---

## 1. Data Collection Scope

### A. Data We Collect
1. **User Account Identity**:
   - Full name and email address.
   - Hashed passwords (salted using `bcryptjs` with 10 salt rounds; plaintext passwords are never stored, logged, or transmitted in unencrypted form).
   - Account creation and last login timestamps.
2. **Debounced Calculation & Interaction Events**:
   - Screen views and navigation flow.
   - Calculation parameters (loan principal, annual interest rate, tenure, gold weight, purity, repayment method) captured only after **inputs have settled for 1.5 seconds** or upon tapping **Save/Calculate**.
   - Result summaries (computed monthly EMI, eligible loan amount, interest saved).
   - Date comparisons in Module A.
3. **Client Device Telemetry**:
   - Operating system and platform (iOS / Android).
   - Screen geometry (compact, standard phone, tablet, orientation).

### B. Data We NEVER Collect
- ❌ Government identity identifiers (PAN, Aadhaar, Social Security).
- ❌ Bank account numbers, UPI IDs, or credit/debit card credentials.
- ❌ Real personal income, tax returns, or confidential banking statements.
- ❌ Real-time GPS location tracking.
- ❌ Keystroke-by-keystroke input logs (only debounced settled state is captured).

---

## 2. Purpose of Processing & Stakeholder Visibility

All logged events are stored in MongoDB to provide the assessment stakeholder with:
1. Complete chronological auditability of user engagement and calculation patterns.
2. In-app analytics displaying Daily Active Users (DAU), popular calculation modules, and calculation frequency.
3. Historical reference allowing users to inspect and revisit their past calculations under **My History**.

### Admin Visibility Control (`ADMIN_VIEW_RAW_INPUTS`)
The backend provides a configuration flag controlling administrator data depth:
- **`ADMIN_VIEW_RAW_INPUTS=true` (Default)**: Stakeholders and designated administrators can view exact calculation inputs entered by users to assess user behavior and usage trends.
- **`ADMIN_VIEW_RAW_INPUTS=false`**: The backend sanitizes all responses to the admin portal, masking raw input numbers and displaying only anonymized result summaries (e.g. `[Gold Loan Calculated]`).

---

## 3. Data Retention Schedule (Automated 12-Month TTL)

Activity events are governed by an automated Time-To-Live (TTL) index in MongoDB:
- **Collection**: `activity_events`
- **TTL Index**: `{ timestamp: 1 }`
- **Expiration Policy**: `expireAfterSeconds: 31536000` (Exactly **12 Months**).
- **Enforcement**: MongoDB's native background expiration thread automatically purges records older than 12 months without requiring manual cron jobs or database downtime.
- **Configurable**: The retention interval can be adjusted in the backend environment via `EVENT_RETENTION_MONTHS`.

---

## 4. User Rights & Data Sovereignty

In alignment with global privacy principles (such as GDPR and India's Digital Personal Data Protection Act):

### 1. Right to Access & Portability ("Export My Data")
Users can navigate to **Settings ➔ Export My Data** at any time. The application prompts the backend to generate a structured JSON file containing:
- The user's profile details.
- Every saved gold loan and EMI calculation.
- The complete history of logged activity events.
- Delivered securely to the device using `expo-file-system` and `expo-sharing`.

### 2. Right to Erasure ("Delete My Account and Data")
Users have full sovereignty to erase their footprint:
- Located under **Settings / Profile ➔ Delete Account**.
- Executing this action performs a **cascading atomic deletion**:
  1. Deletes the `users` record matching `userId`.
  2. Deletes all associated records in `saved_calculations`.
  3. Purges all associated logs in `activity_events`.
  4. Immediately invalidates all active JWT refresh tokens.

---

## 5. In-App Disclosures

- **Sign Up Notice**: A clear privacy disclosure is presented before account creation, requiring affirmative user consent.
- **Dedicated Privacy Screen**: A persistent, accessible Privacy Notice screen is linked directly in the bottom navigation tabs, settings, and landing page footer.
