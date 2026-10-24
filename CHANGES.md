# Technical Audit & Bug Fix Report: Gold & Loan Calculator App

## Executive Summary
This document records all root causes, architectural corrections, and verification testing for the gold price credibility, gold loan calculator, and financial formatting issues in the Gold & Loan Calculator mobile application.

All hardcoded/fabricated prices (`7850`, `7190`, `78500`, `71900`) and fallback constants have been permanently removed across the entire repository. Pricing logic has been consolidated into a single canonical backend pipeline and a single app-side store/hook (`GoldPriceContext`), ensuring zero divergence across all mobile screens.

---

## Part 1: Gold Price Accuracy and Consistency

### 1.1 Ticker Data & Freshness Window
- **Root Cause**: The ticker displayed a permanent green `"LIVE"` indicator regardless of data age, and on weekends/holidays `WgcGoldhubAdapter.fetchLivePrice()` queried only `[today, today]`, returning zero trading settlement records and silently falling back to hardcoded `7850` / `7190`.
- **Fix**:
  - Implemented a 15-minute freshness window (`cacheTtlMs = 15 * 60 * 1000`) in `GoldDataManager.js`.
  - The `"LIVE"` badge is rendered only when data was verified within 15 minutes (`isLive === true`).
  - Stale/offline cached data displays `"Last updated <time in IST>"` alongside a warning badge and settlement date.
  - In `WgcGoldhubAdapter.js`, added a 7-day lookback window so weekend queries automatically resolve to the latest Friday trading market settlement.
  - If no market records exist at all, an honest `"Market Data Unavailable"` state is returned with `price = null`.
- **Files Changed**:
  - `backend/src/services/gold/GoldDataManager.js`
  - `backend/src/services/gold/WgcGoldhubAdapter.js`
  - `mobile/src/context/GoldPriceContext.js`
  - `mobile/src/screens/landing/LandingScreen.js`
- **Tests Added/Updated**:
  - `backend/tests/gold.test.js`: Verified live vs stale data marking with `"Last updated"` status label.

---

### 1.2 Multi-Screen Price Divergence (Screenshot 2)
- **Root Cause**: Screens made decoupled API requests at different times with inconsistent local fallbacks. `LandingScreen` fell back to `7850`, `GoldOverviewScreen` fell back to `7850` or disconnected state, `GoldLoanScreen` initialized state with hardcoded `'7850'` and assigned 24K rate to 22K purity, and the historical chart's latest point did not reconcile with live store data.
- **Fix**:
  - Created ONE canonical backend endpoint `/api/gold/live` returning `{ asOf, asOfIST, source, basis, basisLabel, retailBasisLabel, currency, inrPerGram: { '24K', '22K', '18K' }, inrPer10g: { '24K', '22K', '18K' }, retailEstimatePerGram: { '24K', '22K', '18K' } }`.
  - Created ONE app-side context & hook `GoldPriceContext` (`useGoldPrice()`) providing single-source-of-truth rates across all screens.
  - Derived values (per 10g, purity factors) utilize shared `/lib/calc/config.js` constants (`24K: 1.0, 22K: 0.916, 18K: 0.750`).
  - Aligned latest historical chart point in `GoldOverviewScreen.js` with the canonical store price.
- **Files Changed**:
  - `backend/src/models/LivePriceCache.js`
  - `backend/src/services/gold/GoldDataManager.js`
  - `backend/src/services/gold/WgcGoldhubAdapter.js`
  - `mobile/src/context/GoldPriceContext.js`
  - `mobile/App.js`
  - `mobile/src/screens/landing/LandingScreen.js`
  - `mobile/src/screens/gold/GoldOverviewScreen.js`
  - `mobile/src/screens/goldloan/GoldLoanScreen.js`
- **Tests Added/Updated**:
  - `tests/mobile/mobileSuite.test.js`: Added `Canonical Gold Price Consistency Across Screens (1.2)` verifying that Landing Screen, Gold Overview Screen, and Gold Loan benchmark rate receive identical per-gram rates and 10g derivations without divergence.

---

### 1.3 Basis Labels & Provenance
- **Root Cause**: International benchmark rates (ex-duty and ex-GST) and Indian domestic retail jewellery rates were conflated without clear labeling.
- **Fix**:
  - Explicitly separated labels everywhere:
    - `"Indicative benchmark, before duty and GST"` (ex-duty/ex-GST, ~₹12,664.46 / g for 24K as of Oct 2026).
    - `"Indian retail estimate"` (including 6% Basic Customs Duty as of Union Budget July 2024, 1% local premium, and 3% domestic GST, ~₹14,228.61 / g).
  - Both cards/sections display data source (`"World Gold Council (Goldhub) & LBMA with RBI reference rates"`) and as-of settlement time in IST.
- **Files Changed**:
  - `backend/src/services/gold/WgcGoldhubAdapter.js`
  - `mobile/src/screens/landing/LandingScreen.js`
  - `mobile/src/screens/gold/GoldOverviewScreen.js`

---

### 1.4 Copy Fixes (Landing Page & FAQ)
- **Root Cause**: Landing page contained unprovable marketing claims ("audit-backed", "institutional-grade", "Institutional Precision"), vague historical coverage, missing budget dates for customs duty/GST, and an FAQ that claimed calculations were private without disclosing admin database visibility.
- **Fix**:
  - Removed "audit-backed", "institutional-grade", "Institutional Precision". Replaced with "Transparent calculations for bullion rates...", "Three dedicated calculation modules", and "Ready for Financial Clarity?".
  - Historical coverage accurately defined as 5 years of daily trading settlement data from WGC/LBMA.
  - Named authentic provider: World Gold Council (Goldhub) & LBMA benchmark with official RBI daily USD/INR reference exchange rates.
  - Added `"as of Union Budget July 2024"` to the 6% Basic Customs Duty figure and 3% GST.
  - Updated FAQ: *"Is my calculation history saved privately?"* now truthfully states: *"Calculations are tied to your account and stored in the database, where they are also visible to system administrators for audit and support purposes. You can export your data or delete your account at any time."*
- **Files Changed**:
  - `mobile/src/screens/landing/LandingScreen.js`

---

### 1.5 Status Bar Collision
- **Root Cause**: In `LandingScreen.js`, `headerShown: false` allowed the root `ScrollView` to scroll content directly underneath the mobile status bar clock, battery, and camera notch.
- **Fix**:
  - Integrated `useSafeAreaInsets()` from `react-native-safe-area-context`.
  - Added a fixed `#FAF8F5` pearl-coloured scrim with `height: insets.top` and `zIndex: 999`.
  - Added top safe-area padding to `scrollContent`: `paddingTop: insets.top + SPACING.md` ensuring zero collision while scrolling.
- **Files Changed**:
  - `mobile/src/screens/landing/LandingScreen.js`

---

## Part 2: Gold Loan Calculator Bugs

### 2.1 Wrong Interest Rate (8.75% vs 10.5%)
- **Root Cause**: In `GoldLoanScreen.js` line 42, `useState('10.5')` initialized the interest rate to 10.5 despite the default lender preset being Public Sector Bank Standard (`8.75%`). In addition, `calculateGoldLoan` in `lib/calc/goldLoan.js` defaulted `annualRate = 10.5`.
- **Fix**:
  - Initialized `annualRate` directly from `defaultPreset.defaultAnnualRate` (`8.75`).
  - Added user-editable Annual Interest Rate slider/input to lender presets.
  - When switching lender presets, `annualRate` dynamically updates to that lender's default rate.
  - Displayed prominent `"Rate used: X.XX% p.a."` badge in calculation results.
  - Updated `calculateGoldLoan` to use `lenderPreset.defaultAnnualRate` when not explicitly overridden.
- **Files Changed**:
  - `lib/calc/goldLoan.js`
  - `mobile/src/lib/calc/goldLoan.js`
  - `mobile/src/screens/goldloan/GoldLoanScreen.js`
- **Tests Added/Updated**:
  - `tests/calc/goldLoan.test.js`: Added test verifying that every lender preset in `ILLUSTRATIVE_LENDER_PRESETS` strictly drives the calculation rate, EMI, total interest, and total repayment.

---

### 2.2 Requested Loan Amount in Results
- **Root Cause**: The results panel omitted the user's requested loan amount, only showing the approved/eligible amount.
- **Fix**:
  - Added `"Requested Loan Amount"` row to results section alongside Estimated Collateral Gold Value, RBI Regulatory LTV, and Maximum Eligible Loan Limit.
  - If left blank by the user, explicitly indicates `"Not specified (Max Eligible)"`.
- **Files Changed**:
  - `lib/calc/goldLoan.js`
  - `mobile/src/lib/calc/goldLoan.js`
  - `mobile/src/screens/goldloan/GoldLoanScreen.js`

---

### 2.3 Eligibility Shortfall Warning & Calculation Basis
- **Root Cause**: When the requested loan amount exceeded eligible limits, the calculator lacked an explicit shortfall warning, did not indicate the additional gold weight required, and did not state whether calculations were based on the requested or eligible amount.
- **Fix**:
  - When `requestedLoanAmount > maxEligibleLoan`:
    - Flags `hasShortfall = true`.
    - Computes `shortfallAmount = requested - maxEligibleLoan`.
    - Calculates additional pledge weight needed in grams: `additionalWeightNeededGrams = Math.ceil((shortfallAmount / effectivePledgedRate) * 10) / 10`.
    - Generates actionable shortfall warning with recommendations to pledge additional grams or reduce the loan amount.
    - Sets `calculationBasis = 'Calculated on eligible amount'` and drives repayment and EMI strictly from `maxEligibleLoan`.
  - When `requestedLoanAmount <= maxEligibleLoan`:
    - Calculates on requested amount with `calculationBasis = 'Calculated on requested amount'` and hides shortfall warning.
  - Visually separates collateral value from approved loan amount with disclaimers.
- **Files Changed**:
  - `lib/calc/goldLoan.js`
  - `mobile/src/lib/calc/goldLoan.js`
  - `mobile/src/screens/goldloan/GoldLoanScreen.js`
- **Tests Added/Updated**:
  - `tests/calc/goldLoan.test.js`: Added shortfall boundary tests verifying both above-limit shortfall detection and within-limit approval behavior.

---

### 2.4 Currency Formatting
- **Root Cause**: Ad-hoc currency strings were used across screens, resulting in missing `₹` on the landing mini-demo EMI (caused by `AnimatedNumber.js` passing `includeSymbol = false` without a prefix) and unformatted 500000-style chips (`"200000"`, `"500000"`).
- **Fix**:
  - Consolidated all currency formatting into canonical `formatINR` in `lib/calc/responsive.js` and `mobile/src/theme/responsive.js`:
    - Built on `Intl en-IN`.
    - `₹` symbol with no space (`₹5,88,161.25`).
    - Defaults to 2 decimal places.
    - Accurately formats zero (`₹0.00`), large numbers (`₹1,00,00,000.00`), negatives (`-₹5,88,161.25`), and non-numeric/NaN/null (`₹0.00`).
  - Implemented `formatCompactINR` for chip styling (`₹2L`, `₹5L`, `₹10L`, `₹50K`, `₹1Cr`).
  - Fixed `AnimatedNumber.js` to automatically supply `₹` when `isCurrency = true` and `prefix` is not passed.
  - Updated `SliderInput.js` to format currency chips with `formatCompactINR` and show Indian grouped helper text.
- **Files Changed**:
  - `lib/calc/responsive.js`
  - `mobile/src/theme/responsive.js`
  - `mobile/src/components/AnimatedNumber.js`
  - `mobile/src/components/SliderInput.js`
- **Tests Added/Updated**:
  - `tests/mobile/mobileSuite.test.js`: Verified `formatINR(588161.25) === '₹5,88,161.25'`, zero, negatives, NaN, and `formatCompactINR` chips.

---

### 2.5 Benchmark Rate Ignores Purity
- **Root Cause**: Switching purity between 24K, 22K, and 18K in `GoldLoanScreen.js` did not update the benchmark rate input, which remained fixed at the 24K rate. `calculateGoldLoan` then multiplied 24K rate by `grossWeight * purityFactor`. If a user entered a manual rate for 22K, purity was applied twice!
- **Fix**:
  - Updated `PURITY_FACTORS` to `{ '24K': 1.0, '22K': 0.916, '18K': 0.750 }` guaranteeing exact `0.75 : 0.916 : 1.0` value ratio.
  - Benchmark rate for selected purity dynamically resolves to `24K rate * purityFactor`.
  - Purity is applied exactly ONCE in `calculateGoldLoan`: `assessedGoldValue = Math.round(weight * ratePerGramSelectedPurity * 100) / 100`.
  - Manual override applies to selected purity; switching purity clears override, resets to benchmark, and displays a toast notification.
  - Displayed `"Rate used for <purity>: ₹... / g"` in results.
- **Files Changed**:
  - `lib/calc/config.js`
  - `mobile/src/lib/calc/config.js`
  - `lib/calc/goldLoan.js`
  - `mobile/src/lib/calc/goldLoan.js`
  - `mobile/src/screens/goldloan/GoldLoanScreen.js`
- **Tests Added/Updated**:
  - `tests/calc/goldLoan.test.js`: Added test asserting `18K : 22K : 24K = 0.75 : 0.916 : 1.0` ratio for identical weight.
  - `tests/calc/goldDerivation.test.js`: Updated 24K factor assertion to 1.0.

---

## Automated Jest Test Results Output

```text
> gold-loan-calculator-suite@1.0.0 test
> node --experimental-vm-modules ./node_modules/jest/bin/jest.js --testPathPattern="(tests/calc|backend/tests|tests/mobile)" --runInBand

(node:31232) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
PASS backend/tests/gold.test.js
PASS backend/tests/admin.test.js
PASS backend/tests/auth.test.js
PASS backend/tests/calculations.test.js
PASS backend/tests/events.test.js
PASS tests/mobile/mobileSuite.test.js
PASS tests/calc/goldLoan.test.js
PASS tests/mobile/arthTimingMath.test.js
PASS tests/calc/stats.test.js
PASS tests/calc/goldDerivation.test.js
PASS tests/calc/emi.test.js

Test Suites: 11 passed, 11 total
Tests:       71 passed, 71 total
Snapshots:   0 total
Time:        12.932 s
Ran all test suites matching /(tests\calc|backend\tests|tests\mobile)/i.
```

---

## Manual Verification Checklist & Screenshot Guide

1. **Landing Ticker**:
   - Status badge shows `"LIVE"` only within 15 minutes of provider fetch.
   - 24K and 22K rates formatted with `₹` and no space (`₹12,664.46`, `₹11,600.65`).
   - Basis label clearly states: *"Indicative benchmark, before duty and GST"*.
   - Source states: *"World Gold Council (Goldhub) & LBMA with RBI reference rates"*.
   - As-of date/time displayed in IST.
2. **Gold Prices Overview Screen**:
   - Both benchmark card and retail estimate card rendered side-by-side.
   - Purity selector toggles between 24K, 22K, and 18K.
   - Historical chart's latest data point matches the live benchmark rate.
3. **Gold Loan Screen (Purity & Rates)**:
   - Selecting 24K, 22K, 18K updates benchmark rate to ₹12,664.46, ₹11,600.65, and ₹9,498.35.
   - Manual override toggle allows custom per-gram entry; switching purity resets override and displays toast notification.
   - Assessed gold value ratios for equal weight match 0.75 : 0.916 : 1.0.
4. **Gold Loan Screen (Lender Selection & Rate Driving)**:
   - Selecting Public Sector Bank Standard drives annual rate to `8.75% p.a.`.
   - Results section displays `"Rate used: 8.75% p.a."`.
   - Monthly interest, EMI, and total repayment strictly driven by selected lender rate.
   - Custom rate slider allows manual editing and immediately updates calculation.
5. **Gold Loan Screen (Shortfall & Requested Amount)**:
   - Requested amount field populated (e.g. ₹5,00,000 with collateral eligible for ₹1.55L).
   - Results show `"Requested Loan Amount: ₹5,00,000.00"`.
   - Warning banner displays shortfall amount and additional gold weight needed in grams.
   - Label states `"Calculated on eligible amount"`.
   - When requested amount is within limit (e.g. ₹1,00,000), warning disappears and calculation basis updates to `"Calculated on requested amount"`.
6. **Landing Mini-Demo Formatting**:
   - Monthly installment displays `₹` prefix with comma grouping (`₹10,623.52`).
   - Principal slider chips display compact Indian notation (`₹2L`, `₹5L`, `₹10L`).

---

## Final Self-Audit: Constraints & Verifiability

1. **Live Weekday Trading vs Weekend Settled Prices**:
   - The London Bullion Market Association (LBMA) and RBI publish settlements only on official business banking days (Monday through Friday). On Saturdays, Sundays, and market holidays, the live endpoint returns the most recent verified Friday market close with a stale warning indicator and exact IST timestamp, rather than inventing synthetic real-time market movements.
2. **Indian Domestic Retail Gold Rates**:
   - Domestic retail jewellery spot rates in India vary across cities (e.g. Mumbai vs Chennai vs Delhi) due to local transport costs, jewellers' associations premiums (0.5%–1.5%), and refining charges. In accordance with Section 1.3, this figure is clearly presented as an `"Indian retail estimate"` derived from the LBMA benchmark + 6% Basic Customs Duty (Union Budget July 2024) + 1% indicative market premium + 3% GST, rather than claiming to be a single live national OTC retail feed.
3. **No Unrelated Code Modifications**:
   - All alterations were strictly confined to price derivation, gold loan computation, currency formatting, landing copy disclaimers, and the safe-area status bar scrim. No unrelated authentication, navigation, or theme code was modified.

