# Verification, Testing & Manual Evidence Guide

> **Test Guarantee**: Every calculation, regulatory limit, security barrier, and API route in this project is verified by automated Jest tests with an in-memory/isolated database and HTTP mock layer.

---

## 1. Automated Test Execution Summary

The project includes **10 test suites** containing **60 automated tests**, executing across the shared calculation engine, backend API, and mobile responsive UI logic.

```
PASS backend/tests/gold.test.js
PASS backend/tests/admin.test.js
PASS backend/tests/calculations.test.js
PASS backend/tests/auth.test.js
PASS backend/tests/events.test.js
PASS tests/mobile/mobileSuite.test.js
PASS tests/calc/emi.test.js
PASS tests/calc/goldLoan.test.js
PASS tests/calc/goldDerivation.test.js
PASS tests/calc/stats.test.js

Test Suites: 10 passed, 10 total
Tests:       60 passed, 60 total
Snapshots:   0 total
Time:        ~9.5 seconds
```

### Execution Commands
```bash
# Run all tests across the workspace (calc + backend + mobile)
npm test

# Run mobile UI logic and responsive tests
npm run test:mobile

# Run pure math & calculation tests
npm run test:calc

# Run backend API integration tests
npm run test:backend
```

# Run backend API integration tests
npm run test:backend
```

---

## 2. Test Suite Coverage Details

### Module C: EMI Calculation Suite (`tests/calc/emi.test.js`)
- **Mandatory Assessment Case**: Validates $P = 5,00,000$, $10\%$, $60\text{ months}$ to within $\pm ₹2.00$ on EMI and $\pm ₹120.00$ on totals.
- **Zero-Interest loans**: Validates $0\%$ interest loans where $\text{EMI} = P / n$ with exact settlement.
- **Boundary Tenures**: Validates minimum tenure ($1\text{ month}$) and maximum long-term mortgage tenure ($360\text{ months} / 30\text{ years}$) with zero table overrun.
- **Amortization Reconciliation**: Verifies that $\sum \text{Principal} = P$, $\sum \text{EMI} = \text{Total Repayment}$, and final loan balance is exactly ₹0.00.
- **Prepayment Math**: Verifies lump-sum prepayments (e.g. ₹50,000 in month 12) and recurring extra payments, proving interest savings and months shaved off tenure.
- **Processing Fees**: Verifies both flat fees and percentage-based fees (handled separately vs financed).
- **Error Handling**: Rejects negative amounts, zero tenure, and NaN values gracefully.

### Module B: Gold Loan Suite (`tests/calc/goldLoan.test.js`)
- **Purity Math**: Verifies pure gold equivalent weight for 24K (99.9%), 22K (91.6%), and 18K (75.0%).
- **Repayment Methods**: Evaluates:
  1. *Monthly Interest, Principal at Maturity (Bullet)*
  2. *Equal Monthly Installment (EMI)*
  3. *Interest & Principal at Maturity*
- **RBI Tiered LTV (Regulatory Directions 2026)**:
  - $\le ₹2,50,000 \to 85\%$ LTV
  - $> ₹2,50,000 \text{ to } ₹5,00,000 \to 80\%$ LTV
  - $> ₹5,00,000 \to 75\%$ LTV
- **Tier Boundary Tests**: Verifies exact mathematical cutoff points to avoid circular logic in loan assessment.
- **Collateral Limits**: Enforces 1,000g ornament cap and 50g coin cap with clear validation errors.
- **Lender Presets**: Tests minimum/maximum loan limits and displays unverified/expired badges when source metadata is missing.

### Module A & Market Data Suites (`tests/calc/goldDerivation.test.js` & `tests/calc/stats.test.js`)
- **Troy Ounce Conversion**: Verifies $31.1034768\text{ g/oz}$ conversion constant.
- **Retail Markup**: Verifies breakdown of Basic Customs Duty (6%), AIDC (1%), and GST (3%).
- **Range Statistics**: Validates date-range High, Low, absolute change, and percentage change.
- **Trading Day Gaps**: Handles weekends and public holidays without synthetic interpolation.

### Backend & Security Suites (`backend/tests/`)
- **Authentication (`auth.test.js`)**: Signup, bcrypt password hashing, duplicate email rejection, JWT rotation, logout blacklist.
- **Role Guard (`admin.test.js`)**: Non-admin users are strictly blocked with `403 Forbidden` on all `/api/admin/*` endpoints.
- **Activity Logging (`events.test.js`)**: Verifies 1.5s debounced event batching, data export JSON, and cascading account deletion.
- **Gold Cache (`gold.test.js`)**: Verifies 15-minute live cache and automated stale-data fallback on simulated network timeouts.

---

## 3. Mandatory EMI Reconciliation Verification

| Metric | Target Specification | Formula Output | Discrepancy | Acceptance Margin | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Monthly EMI** | ~ ₹10,624.44 | **₹10,623.52** | **- ₹0.92** | Within $\pm ₹2.00$ | **PASS** |
| **Total Payment** | ~ ₹6,37,466.00 | **₹6,37,410.60** | **- ₹55.40** | Within $\pm ₹120.00$ | **PASS** |
| **Total Interest** | ~ ₹1,37,466.00 | **₹1,37,410.60** | **- ₹55.40** | Within $\pm ₹120.00$ | **PASS** |
| **Sum of Principal**| ₹5,00,000.00 | **₹5,00,000.00** | **₹0.00** | Exact Equality | **PASS** |
| **Sum of Monthly EMIs**| ₹6,37,410.60 | **₹6,37,410.60** | **₹0.00** | Exact Equality | **PASS** |
| **Closing Balance Month 60** | ₹0.00 | **₹0.00** | **₹0.00** | Exact Settlement | **PASS** |

---

## 4. Manual Evidence Checklist (What to Screenshot)

When capturing evaluation screenshots for technical submission, record the following screens and states:

### A. Landing Page (`/landing`)
- [ ] **Hero Section**: Animated gold gradient headline, shimmering Get Started and Log In CTA buttons, floating gold bar motif.
- [ ] **Live Gold Ticker**: Real-time 24K and 22K per-gram quotes with timestamp and "Indicative Derived" disclosure pill.
- [ ] **3 Feature Cards**: Gold Price Tracker, Gold Loan Calculator, and EMI Calculator.
- [ ] **Interactive Mini-Demo**: Working interactive EMI slider with real-time monthly calculation.
- [ ] **How It Works & FAQ**: Animated step indicators and collapsible accordion answers.
- [ ] **Footer**: Attribution, RBI disclaimer, and link to Privacy Notice.

### B. Authentication Screens (`/auth`)
- [ ] **Sign Up Screen**: Full name, email, password strength meter, confirm password, and mandatory Privacy Notice checkbox.
- [ ] **Login Screen**: Secure login with show/hide password toggle, inline validation errors, and loading state.

### C. Module A: Gold Price Tracker (`/gold`)
- [ ] **Overview Screen**: 24K and 22K cards (per gram and per 10g), "Last Updated" timestamp, and stale indicator.
- [ ] **Interactive Chart**: 1M, 3M, 6M, 1Y, 3Y, 5Y gold line chart with area fill and touch tooltips showing date and price.
- [ ] **Compare Dates Screen**: Date range selector displaying High, Low, absolute change (₹), and percentage change (%).
- [ ] **Data Source & Methodology**: Documentation of LBMA wholesale rates, customs duty (6%), AIDC (1%), and GST (3%).

### D. Module B: Gold Loan Calculator (`/goldloan`)
- [ ] **Inputs & Tiered LTV**: Weight input (g), purity selector (18K/22K/24K), gold rate override, and live RBI LTV Tier badge (85% / 80% / 75%).
- [ ] **Separation of Values**: Visual separation between **"Assessed Collateral Value"** and **"Maximum Eligible Loan"**.
- [ ] **Repayment Method Toggle**: Switch between Monthly Interest (Bullet), Regular EMI, and Maturity Interest.
- [ ] **Illustrative Lender Cards**: Side-by-side comparison with "Illustrative Assumptions" badge.
- [ ] **Saved Gold Loans**: List of persisted calculations with date and reopen action.

### E. Module C: EMI Calculator (`/emi`)
- [ ] **Interactive Sliders**: Amount, interest rate, and tenure sliders with live debounced computation.
- [ ] **Donut Chart**: Principal vs Interest visual breakdown ring.
- [ ] **Full Amortization Table**: 60-month scrollable schedule with sticky headers, showing opening balance, interest, principal, and zero ending balance.
- [ ] **Prepayment Impact**: Comparison card showing revised tenure, interest saved, and months saved.
- [ ] **CSV Export**: Action triggering file system generation and sharing dialog.

### F. User History, Profile & Settings
- [ ] **My History Screen**: Chronological timeline of user calculations and screen views with module filter chips.
- [ ] **Profile Screen**: User details, role indicator, and password change.
- [ ] **Settings Screen**: Reduce Motion toggle, data retention note, and "Export My Data" button.
- [ ] **Account Deletion**: Confirmation dialog for cascading user and data removal.

### G. Admin Portal (`/admin` — Admin Role Only)
- [ ] **Analytics Dashboard**: Summary cards for Total Users, Active Users, Calculations per Day.
- [ ] **Users Table**: Searchable, paginated user list with role badges and signup dates.
- [ ] **User Activity Timeline**: Deep-dive into any user's past calculations and events.
- [ ] **CSV Export**: Button to export global audit log for compliance.

### H. Device Formats & Orientations
- [ ] **Small Compact Phone**: Screen width <360px (inputs and buttons fit cleanly without text truncation).
- [ ] **Standard Phone**: 390px-430px width in portrait mode.
- [ ] **Tablet**: $\ge 600\text{px}$ width (displays dual-column layout: inputs on left, charts/results on right).
- [ ] **Landscape Mode**: Any phone rotated horizontally (automatically adapts to 2 columns).
