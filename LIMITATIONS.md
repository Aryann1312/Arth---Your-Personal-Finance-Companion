# Technical Assumptions, Limitations & Disclosures

> **Honesty Principle**: This document details the engineering assumptions, provider boundary conditions, and technical limitations of the Gold & Loan Calculator application.

---

## 1. Gold Market Data Boundaries

### A. 18K Historical Data Derivation
- **Limitation**: The London Bullion Market Association (LBMA) and global commodity exchanges do not trade an independent derivative contract for 18-karat gold. Official spot fixings are published exclusively for **24K Fine Bullion (999 fineness)**.
- **Implementation**: The application derives 18K prices using the documented mathematical fineness standard:
  $$\text{Price}_{18K} = \text{Price}_{24K} \times \left( \frac{18}{24} \right) = \text{Price}_{24K} \times 0.750$$
- **Disclosure**: In Module A, 18K rates are explicitly labelled as `Derived Purity (75.0% Fine Gold)`.

### B. International Spot vs. Indian Retail Jewelry Spread
- **Limitation**: Converted international spot quotes do not match the retail price displayed in local Indian jewelry stores (e.g., Tanishq, Malabar Gold, Kalyan Jewellers).
- **Explanation**: Indian retail prices include:
  1. Basic Customs Duty (6% post-Union Budget 2024).
  2. Agriculture Infrastructure Development Cess (AIDC: 1%).
  3. Integrated Goods & Services Tax (GST: 3%).
  4. Jeweller making charges, wastage, and hallmarking fees (ranging from 3% to 15%).
  5. Local state transportation and regional bullion association premiums.
- **Handling**: All spot quotes in the app are clearly marked as `Indicative Derived Wholesale Spot` to ensure complete honesty.

### C. Historical Range Coverage
- **Supported Ranges**: 1 Month (1M), 3 Months (3M), 6 Months (6M), 1 Year (1Y), 3 Years (3Y), and 5 Years (5Y) are backed by 5,220 genuine daily records.
- **Unsupported Ranges**: Requests for historical data beyond 5 years are disabled in the mobile UI rather than fabricating synthetic data points.

---

## 2. Regulatory & Lender Assumptions (Module B)

### A. RBI Gold Lending Directions (Effective 1 April 2026)
- The application implements the tiered Loan-to-Value (LTV) framework:
  - Loan amount $\le ₹2.5\text{ Lakh}$: Maximum LTV **85%**
  - Loan amount $> ₹2.5\text{ Lakh}$ up to $₹5.0\text{ Lakh}$: Maximum LTV **80%**
  - Loan amount $> ₹5.0\text{ Lakh}$: Maximum LTV **75%**
- Collateral limits are enforced: Maximum 1,000 grams for gold ornaments and 50 grams for gold coins per borrower.
- **Assumed Caveat**: These are statutory regulatory ceilings. A commercial bank or NBFC (e.g. SBI, Muthoot Finance) may apply more conservative internal underwriting caps.

### B. Separation of Collateral Valuation vs. Loan Approval
- The app strictly separates **"Estimated Collateral Value"** from **"Maximum Eligible Loan"**.
- Final loan sanction is always subject to stone weight deductions, carat testing/fire assay, borrower KYC, and lender discretion.

---

## 3. Android Studio Emulator & Runtime Environment

### A. Managed Workflow & Emulator Support
- All mobile packages are installed via `npx expo install` matching Expo SDK 58, configured for clean execution on the Android Studio Emulator (AVD) without manual C++ or native patching.
- Native build tools and Gradle tasks are completely encapsulated, enabling instant development iteration.

### B. Loopback Network Access on Android Studio Emulator
- The Android Emulator operates inside an isolated virtual network router. Android's internal network bridges the host machine's loopback interface (`localhost` / `127.0.0.1`) to the IP address **`10.0.2.2`**.
- The mobile app's API client (`mobile/src/services/api.js`) automatically binds to `http://10.0.2.2:5000/api` on Android platforms, ensuring direct, zero-configuration communication with the local backend server without requiring local Wi-Fi router IP configuration.

---

## 4. API Quotas & Stale-Data Fallback

- Commercial real-time market data providers (e.g. Bloomberg BVAL, Refinitiv) require paid enterprise subscriptions costing thousands of dollars per month.
- To prevent quota exhaustion on public/free tier APIs, the backend employs a **15-minute TTL cache** in MongoDB.
- If an external upstream API times out or returns an HTTP 429 error, the application activates its **graceful stale-data fallback**:
  1. The last known genuine price is served from MongoDB `live_price_cache`.
  2. The incident is logged in `fetch_log`.
  3. The mobile app renders an amber `⚠️ Stale Data` badge indicating the exact timestamp of the quote.
