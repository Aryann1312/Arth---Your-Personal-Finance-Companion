# Project Structure & Directory Blueprint

> **System Blueprint**: A complete, exhaustive directory tree and component-by-component architectural guide for the **Gold & Loan Calculator** mobile and web application and backend ecosystem.

---

## 1. High-Level Architecture Overview

The codebase is organized into four decoupled tiers:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        1. CLIENT APPLICATION (mobile/)                 │
│   React Native (Android Studio Emulator AVD & Desktop Web, SDK 58)     │
│   Screens, Components, Theme, Navigation, SecureStore Token Vault      │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ HTTP / REST (10.0.2.2:5000/api or localhost:5000)
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        2. BACKEND API (backend/)                       │
│   Node.js 18+ / Express 4.x REST Server                                │
│   JWT Auth, Rate Limiter, Role Guard, Cache Manager, Audit Service     │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
┌──────────────────────────────────────┐   ┌─────────────────────────────┐
│    3. CALCULATION CORE (lib/calc/)   │   │   4. DATABASE (MongoDB)     │
│   Zero-dependency vanilla JS         │   │   5 Collections, 5,220 Daily│
│   Paise-exact EMI, LTV, Gold Math    │   │   Records, 12M TTL Index    │
└──────────────────────────────────────┘   └─────────────────────────────┘
```

---

## 2. Complete Visual File Tree

```
Gold-EMI/
│
├── .gitignore                                 # Git ignore rules for node_modules, .env, .expo
├── ARCHITECTURE.md                            # System architecture, auth flow, and state design
├── CHANGES.md                                 # Exhaustive audit defect fixes, regression tests, and verification ledger
├── DATABASE.md                                # MongoDB collections, compound indexes, and schemas
├── DATA_SOURCES.md                            # Gold data provider analysis, limits, and derivation
├── LIMITATIONS.md                             # Technical constraints, assumptions, and disclosures
├── package-lock.json                          # Root dependency lockfile
├── package.json                               # Root workspace scripts & shared Jest dependencies
├── PRIVACY.md                                 # Data protection, 12M TTL retention, and user rights
├── PROJECT_STRUCTURE.md                       # Complete file structure documentation (this file)
├── README.md                                  # Project overview, quick start, and EMI/Gold audit math proofs
├── STEP_0.md                                  # Assumptions, dependencies, and regulatory bounds
├── TESTING.md                                 # Automated test report and manual screenshot checklist
│
├── backend/                                   # Express REST API & Database Service
│   ├── .env                                   # Local environment variables (PORT, MONGO_URI, JWT)
│   ├── .env.example                           # Safe template for environment configuration
│   ├── package-lock.json                      # Backend lockfile
│   ├── package.json                           # Backend dependencies (express, mongoose, bcrypt, jwt)
│   │
│   ├── scripts/                               # CLI Database Seeding & Migration Scripts
│   │   ├── backfillGoldHistory.js             # Ingests 5,220 genuine daily 5-year gold price records
│   │   ├── seedAdmin.js                       # Creates initial system administrator account
│   │   └── seedLenders.js                     # Seeds RBI-compliant lender presets (SBI, Muthoot, Flexi)
│   │
│   ├── src/                                   # Backend Source Code
│   │   ├── app.js                             # Express application factory & middleware wiring
│   │   ├── server.js                          # Server entry point & HTTP listener on port 5000
│   │   │
│   │   ├── config/                            # Environment & Database Configuration
│   │   │   ├── db.js                          # Mongoose connection manager with reconnection logic
│   │   │   └── env.js                         # Validated environment variable loader with defaults
│   │   │
│   │   ├── controllers/                       # HTTP Route Controllers (Request/Response Handlers)
│   │   │   ├── adminController.js             # User search, regex-safe sanitization, audit trails, and CSV exports
│   │   │   ├── authController.js              # Signup, login, refresh rotation, and logout
│   │   │   ├── calcController.js              # Server-side calculation validation endpoint
│   │   │   ├── calculationController.js       # CRUD for user-saved calculations with ObjectId guards
│   │   │   ├── eventController.js             # Debounced client activity batch ingestion
│   │   │   ├── goldController.js              # Live spot quote caching & historical range queries
│   │   │   └── userController.js              # User profile, password updates, and GDPR cascade delete
│   │   │
│   │   ├── middleware/                        # Express HTTP Middleware
│   │   │   ├── auth.js                        # JWT Bearer token verification & user injection
│   │   │   ├── error.js                       # Centralized error handler returning HTTP 400/404/409/500
│   │   │   ├── rateLimit.js                   # IP-based rate limiting (auth routes vs general API)
│   │   │   └── role.js                        # Role-based access control guard (RBAC: 'admin' only)
│   │   │
│   │   ├── models/                            # Mongoose Schemas & MongoDB Collections
│   │   │   ├── ActivityEvent.js               # User interaction logs with 12M auto-expiring TTL
│   │   │   ├── FetchLog.js                    # Ingestion audit log for live external provider calls
│   │   │   ├── GoldPrice.js                   # 5-year daily historical gold price records
│   │   │   ├── LenderReference.js             # Default lender parameters, interest rates, and fees
│   │   │   ├── LivePriceCache.js              # 15-minute in-memory/DB cache for spot gold rates
│   │   │   ├── SavedCalculation.js            # User-saved Gold and EMI calculation summaries
│   │   │   └── User.js                        # User credentials, bcrypt hash, and RBAC role
│   │   │
│   │   ├── routes/                            # Express REST Route Definitions
│   │   │   ├── adminRoutes.js                 # Protected /api/admin endpoints
│   │   │   ├── authRoutes.js                  # Public /api/auth endpoints (login, signup, refresh)
│   │   │   ├── calcRoutes.js                  # Public /api/calc validation endpoints
│   │   │   ├── calculationRoutes.js           # Protected /api/calculations saved state endpoints
│   │   │   ├── eventRoutes.js                 # Authenticated /api/events batch logger
│   │   │   ├── goldRoutes.js                  # /api/gold live rates and historical series
│   │   │   └── userRoutes.js                  # /api/users profile and account management
│   │   │
│   │   └── services/                          # Business Logic Services
│   │       └── gold/                          # Pluggable Gold Data Provider Subsystem
│   │           ├── GoldDataManager.js         # Orchestrates live fetching, cache TTL, and fallbacks
│   │           ├── GoldProviderInterface.js   # Formal interface contract for market data adapters
│   │           ├── LiveApiAdapter.js          # Adapter for metals.live / goldapi.io spot quotes
│   │           └── WgcGoldhubAdapter.js       # Adapter for World Gold Council / LBMA fixing data
│   │
│   └── tests/                                 # Backend Jest Integration Tests (In-Memory DB)
│       ├── admin.test.js                      # RBAC barrier tests (403 Forbidden enforcement)
│       ├── apiSecurityAndCalculations.test.js # Calculations, HTTP 400/401/403/404, malformed JSON & regex injection
│       ├── auth.test.js                       # JWT lifecycle, password hashing, and token refresh
│       ├── calculations.test.js               # Saved calculations CRUD and access control
│       ├── events.test.js                     # 1.5s debounced batch logging and user data export
│       ├── gold.test.js                       # Live cache, fallback behavior, and history querying
│       └── setup.js                           # Test runner setup, MongoDB memory server, teardown
│
├── lib/                                       # Pure, Framework-Independent Calculation Library
│   └── calc/                                  # Pure Vanilla JavaScript Calculation Engine (0 dependencies)
│       ├── arthTimingMath.js                  # Intro animation frame math, rank sorting & cubic bezier curves
│       ├── config.js                          # RBI 2026 directions (LTV tiers, collateral ceilings)
│       ├── emi.js                             # Exact EMI formula, amortization table, prepayments
│       ├── goldDerivation.js                  # XAU/USD to INR/g conversion, customs duty, GST
│       ├── goldLoan.js                        # Purity conversion, collateral value, tiered LTV
│       ├── goldValuation.js                   # Hallmark karat parser, regex purity safety & valuation math
│       ├── index.js                           # Unified exports for cross-platform imports
│       ├── responsive.js                      # Pure breakpoint classification logic for testing
│       └── stats.js                           # Date range statistics (high, low, % change)
│
├── mobile/                                    # React Native Client (Android Studio Emulator & Desktop Web)
│   ├── App.js                                 # React Native root component & Context Providers
│   ├── app.json                               # Expo project manifest & native bundle identifiers
│   ├── babel.config.js                        # Babel compiler configuration with preset-expo
│   ├── package-lock.json                      # Mobile dependencies lockfile
│   ├── package.json                           # React Native & Web dependencies (react-native-web, react-dom)
│   │
│   ├── assets/                                # Visual Branding & Typography Assets
│   │   ├── adaptive-icon.png                  # Android adaptive icon foreground layer
│   │   ├── icon.png                           # Luxury gold bullioned app icon
│   │   ├── logo.svg                           # Scalable vector logo artwork
│   │   ├── profile-avatar.png                 # Default luxury user profile avatar
│   │   ├── splash.png                         # Warm pearl white launch screen
│   │   └── fonts/                             # Custom Display Typography
│   │       └── YesevaOne_400Regular.ttf       # Editorial luxury display serif font
│   │
│   └── src/                                   # Mobile Client Application Source Code
│       ├── components/                        # Reusable Luxury Fintech UI Components
│       │   ├── AnimatedNumber.js              # Smooth count-up counter animation for rupees
│       │   ├── AppLogo.js                     # Scalable Arth luxury vector gold brand badge
│       │   ├── ArthWordmarkIntro.js           # Choreographed letter-split intro animation sequence
│       │   ├── DonutChart.js                  # Pure SVG donut chart for Principal vs Interest
│       │   ├── GoldButton.js                  # Tactile button with golden gradient & haptics
│       │   ├── GoldGradientText.js            # Shiny metallic text header component
│       │   ├── GoldPriceCalculator.js         # Interactive purity & weight quick-estimator card
│       │   ├── Input.js                       # Luxury floating-label text & currency input
│       │   ├── LuxurySplash.js                # Warm pearl launch screen overlay with fade-out
│       │   ├── MiniGoldChart.js               # Interactive SVG area-fill gold price line chart
│       │   ├── PageTitleBanner.js             # Consistent screen header with golden accents
│       │   ├── PearlCard.js                   # Elevated pearl white card with gold accent borders
│       │   ├── ResponsiveContainer.js         # Adaptive container switching to 2-column on tablets/desktop
│       │   ├── Skeleton.js                    # Shimmering loading placeholder for quotes/charts
│       │   ├── SliderInput.js                 # Custom slider with increment buttons & quick presets
│       │   ├── TabIcons.js                    # Custom luxury metallic SVG icons for bottom tabs
│       │   ├── Toast.js                       # Animated notification toast (success, error, info)
│       │   ├── drawer/                        # Side Drawer Navigation Subsystem
│       │   │   ├── DrawerItem.js              # Styled drawer link row with icon and count badge
│       │   │   ├── ExpandableMenuBar.js       # Smooth collapsible menu section header
│       │   │   ├── HamburgerButton.js         # Animated 3-line hamburger menu trigger button
│       │   │   ├── SideDrawer.js              # Full-height sliding drawer navigation panel
│       │   │   ├── TeamCard.js                # Developer & engineering team credits card
│       │   │   ├── drawerConfig.js            # Menu items, icons, and destination routes config
│       │   │   ├── index.js                   # Drawer component barrel export
│       │   │   └── useSideDrawer.js           # Reusable drawer open/close state animation hook
│       │   ├── goldloan/                      # Modular Gold Loan Sub-components
│       │   │   ├── OptionCard.js              # Selectable radio/card selector for purity & tenure
│       │   │   ├── SectionCard.js             # Grouped parameter container with gold header
│       │   │   ├── SummaryTile.js             # KPI metric metric card (valuation, eligible, LTV)
│       │   │   └── index.js                   # Gold loan component barrel export
│       │   └── ui/                            # Micro-interaction Design System Elements
│       │       ├── ShinyButton.js             # Glossy shimmer button with animated gradient sweep
│       │       └── index.js                   # UI elements barrel export
│       │
│       ├── context/                           # React Context State Providers
│       │   ├── AuthContext.js                 # JWT access token, user session, and auth persistence
│       │   ├── GoldPriceContext.js            # Single-source-of-truth live/cached gold prices across all screens
│       │   └── SettingsContext.js             # Accessibility (Reduce Motion), preferred LTV & unit
│       │
│       ├── lib/calc/                          # Mirrored Pure Calculation Engine for Metro Bundler
│       │   ├── arthTimingMath.js              # Mirrored animation choreography math
│       │   ├── config.js                      # Mirrored RBI parameters
│       │   ├── emi.js                         # Mirrored exact EMI & amortization engine
│       │   ├── goldDerivation.js              # Mirrored retail markup & conversion math
│       │   ├── goldLoan.js                    # Mirrored collateral valuation & tiered LTV
│       │   ├── goldValuation.js               # Mirrored hallmark parser & valuation math
│       │   ├── index.js                       # Mirrored library export aggregator
│       │   ├── responsive.js                  # Mirrored responsive breakpoint classification
│       │   └── stats.js                       # Mirrored range analytics
│       │
│       ├── navigation/                        # App Navigation Hierarchy
│       │   └── AppNavigator.js                # Auth Stack + Authenticated Bottom Tab Navigation
│       │
│       ├── screens/                           # Application Screen Views
│       │   ├── admin/                         # Administrator Portal
│       │   │   └── AdminPortalScreen.js       # User analytics, audit event log, and CSV exports
│       │   │
│       │   ├── auth/                          # Authentication Screens
│       │   │   ├── LoginScreen.js             # User login with secure password toggle
│       │   │   └── SignUpScreen.js            # User signup with password strength meter & terms
│       │   │
│       │   ├── emi/                           # Module C: EMI & Loan Calculator
│       │   │   ├── EMIScreen.js               # Amount/tenure sliders, donut chart, amortization
│       │   │   └── SavedEMIScreen.js          # Saved mortgage/loan scenarios list
│       │   │
│       │   ├── gold/                          # Module A: Gold Price Tracker
│       │   │   ├── CompareDatesScreen.js      # Range selector (High, Low, ₹ Change, % Change)
│       │   │   ├── DataSourceInfoScreen.js    # Methodology, customs duty, AIDC, and GST breakdown
│       │   │   ├── GoldOverviewScreen.js      # Live 24K/22K quotes, last update, 5Y history chart
│       │   │   └── methodologyData.js         # Regulatory source metadata & calculation methodology data
│       │   │
│       │   ├── goldloan/                      # Module B: Gold Loan Calculator
│       │   │   ├── GoldLoanScreen.js          # Weight, purity (18K/22K/24K), tiered LTV, lenders
│       │   │   └── SavedGoldLoansScreen.js    # Saved gold collateral valuations
│       │   │
│       │   ├── history/                       # User Activity History
│       │   │   └── MyHistoryScreen.js         # Chronological audit timeline with module filters
│       │   │
│       │   ├── info/                          # Application Information
│       │   │   └── AppInfoScreen.js           # Version, regulatory disclosures, and feature guide
│       │   │
│       │   ├── intro/                         # Wordmark Presentation
│       │   │   └── IntroScreen.js             # Standalone luxury Arth intro sequence viewer
│       │   │
│       │   ├── landing/                       # Public Landing Screen
│       │   │   └── LandingScreen.js           # Hero, live quotes ticker, mini-demo, FAQs, CTA
│       │   │
│       │   └── profile/                       # User Profile & Privacy
│       │       ├── PrivacyNoticeScreen.js     # Data handling, retention, and security disclosures
│       │       ├── ProfileScreen.js           # Account details, role badge, password change
│       │       └── SettingsScreen.js          # Reduce motion toggle, JSON data export, deletion
│       │
│       ├── services/                          # Mobile Communication Layer
│       │   ├── api.js                         # Fetch wrapper with SecureStore auth header injection
│       │   └── eventLogger.js                 # 1.5s debounced activity event queue & offline flusher
│       │
│       └── theme/                             # Design System & Responsive Foundation
│           ├── index.js                       # Luxury color tokens (Pearl, Obsidian, Gold), spacing
│           └── responsive.js                  # useResponsiveLayout hook with breakpoints (<360, 600+)
│
└── tests/                                     # Root Workspace Test Suites
    ├── calc/                                  # Pure Mathematical Engine Unit Tests (5 suites, 53 tests)
    │   ├── emi.test.js                        # Standard P=5L, 10%, 60M test, prepayment, exact ₹0.00 (9 tests)
    │   ├── financialAudit.test.js             # Section 4 & 5 math verification, valuation, LTV & zero-safety (20 tests)
    │   ├── goldDerivation.test.js             # LBMA Troy oz conversion, retail duty & GST math (3 tests)
    │   ├── goldLoan.test.js                   # 85%/80%/75% RBI tiered LTV, weight caps, purity (17 tests)
    │   └── stats.test.js                      # High, Low, absolute change, and percent change (4 tests)
    │
    └── mobile/                                # Mobile Client & Financial Accuracy Tests (3 suites, 38 tests)
        ├── arthTimingMath.test.js             # Frame math, rank sorting, cubic bezier easing curves (6 tests)
        ├── goldLoanFinancialAccuracy.test.js  # Repayment methods, assessed valuation, presets, shortfall (22 tests)
        └── mobileSuite.test.js                # Responsive layout breakpoints and orientation checks (10 tests)
```

---

## 3. Directory Deep-Dive

### 3.1 Root Documentation & Configuration
| File | Purpose |
| :--- | :--- |
| `README.md` | Primary technical submission document with system architecture diagram, quick start commands, Desktop Web instructions, and the mandatory EMI / Gold Loan math reconciliation tables. |
| `ARCHITECTURE.md` | Architectural rationale: dual-location pure calculation engine, stateless JWT rotation, and 1.5s debounced activity logging. |
| `CHANGES.md` | Exhaustive defect fix audit ledger, regression tests, and verification record. |
| `DATABASE.md` | Detailed database schema: all 7 Mongoose collections, field types, compound indexes, and sample queries. |
| `DATA_SOURCES.md` | Explanation of market data providers (WGC, LBMA, metals.live), free tier rate limits, and 15-minute caching mechanism. |
| `LIMITATIONS.md` | Technical disclosures: why retail jewelry rates differ from spot, RBI 2026 tiered LTV boundaries, and Android Studio emulator loopback networking. |
| `PRIVACY.md` | Comprehensive GDPR/DPDP-compliant privacy documentation covering the 12-month TTL index, export rights, and cascading deletion. |
| `PROJECT_STRUCTURE.md` | Complete file structure documentation (this file). |
| `TESTING.md` | Automated test suite execution report (14 suites, 127 tests) and manual screenshot capture checklist. |
| `package.json` | Root workspace manager with convenience scripts (`npm test`, `npm run start:backend`, `npm run start:mobile`). |

---

### 3.2 Pure Calculation Core (`/lib/calc`)
This folder contains the mathematical backbone of the entire system. It has **zero runtime dependencies** and runs identically on Node.js, React Native, and Desktop Web.

- **`config.js`**: Defines the statutory Reserve Bank of India (RBI) 2026 guidelines:
  - Tier 1: Loan $\le ₹2,50,000 \to 85\%$ max LTV.
  - Tier 2: Loan $> ₹2,50,000$ to $₹5,00,000 \to 80\%$ max LTV.
  - Tier 3: Loan $> ₹5,00,000 \to 75\%$ max LTV.
  - Collateral limits: Maximum 1,000 grams for ornaments, 50 grams for coins.
- **`emi.js`**: Computes monthly EMI, full amortization schedule, and prepayment impacts. All monetary values are processed in **integer paise** ($1\text{ Rupee} = 100\text{ paise}$) to avoid floating-point drift. Absorbs rounding drift on the 60th installment so the closing balance is **precisely ₹0.00**.
- **`goldLoan.js`**: Converts ornament weight to pure gold equivalent based on carat (24K: 99.9%, 22K: 91.6%, 18K: 75.0%), applies tiered LTV rules, and computes eligible loan amounts.
- **`goldValuation.js`**: Resolves purity strings and hallmarks via numeric regex sanitization (`[0-9.]`), preventing collateral over-valuation bugs on non-standard karats (14K, 10K, 20K).
- **`goldDerivation.js`**: Converts LBMA international spot quotes ($\text{XAU/USD}$) to Indian wholesale per-gram rates ($\text{INR/g}$), factoring in the $31.1034768\text{ g/oz}$ constant, customs duty (6%), AIDC (1%), and GST (3%).
- **`stats.js`**: Computes High, Low, absolute change, and percentage change for historical gold price series.
- **`responsive.js`**: Pure mathematical device classification ($<360\text{px}$, $\ge 600\text{px}$, landscape).
- **`arthTimingMath.js`**: Choreographs luxury wordmark intro sequence (collapseAt, rank ordering, cubic-bezier interpolation).

---

### 3.3 Backend API (`/backend`)
A production-ready Express REST API connected to MongoDB.

- **`scripts/`**:
  - `seedAdmin.js`: Seeds the default administrator (`admin@goldloan.internal`).
  - `seedLenders.js`: Seeds 3 lender presets (Public Sector Bank, NBFC Fast-Track, Fintech Flexi).
  - `backfillGoldHistory.js`: Populates **5,220 genuine historical gold records** covering 5 years (2021–2026).
- **`src/controllers/`**:
  - `authController.js`: Handles user registration, bcrypt password hashing, JWT issue, and token refresh.
  - `goldController.js`: Manages live gold quotes with 15-minute TTL cache and historical date queries.
  - `eventController.js`: Ingests debounced batches of user interactions and persists them to MongoDB.
  - `adminController.js`: Provides analytics dashboards, audit logs, and CSV download endpoints with regex injection shielding.
- **`src/models/`**:
  - `ActivityEvent.js`: Features a MongoDB TTL index (`expireAfterSeconds: 31536000`) for automatic 12-month purging.
  - `GoldPrice.js`: Compound index on `{ date: 1, purity: 1 }` for sub-millisecond historical chart queries.
- **`tests/`**:
  - `apiSecurityAndCalculations.test.js`: Validates calculation endpoints, HTTP status codes (400 on malformed JSON / invalid ObjectIds, 401 unauthorized, 403 RBAC, 404 route not found), and MongoDB regex safety.

---

### 3.4 Mobile & Web Client Application (`/mobile`)
Built with React Native and Expo SDK 58, running simultaneously on the Android Studio Emulator (AVD) and Desktop Web browsers (Chrome, Edge, Firefox via `react-native-web` and `@expo/metro-runtime`).

- **`src/components/`**:
  - `PearlCard.js`: Elevated container with warm pearl background (`#FAF8F5`) and subtle gold borders.
  - `GoldButton.js`: Tactile interactive CTA button with gold gradient fill and haptic vibration.
  - `DonutChart.js`: High-performance SVG ring showing Principal vs. Interest composition.
  - `MiniGoldChart.js`: Interactive area chart displaying 1M, 3M, 6M, 1Y, 3Y, 5Y trends with touch tooltips.
  - `ResponsiveContainer.js`: Dynamically rearranges layout into 2 columns on tablets or desktop screens.
  - `drawer/`: Reusable drawer subsystem (`SideDrawer`, `HamburgerButton`, `ExpandableMenuBar`, `TeamCard`).
  - `goldloan/`: Sub-components for loans (`OptionCard`, `SectionCard`, `SummaryTile`).
  - `ui/`: Design tokens and micro-interactions (`ShinyButton`).
- **`src/screens/`**:
  - `landing/LandingScreen.js`: Hero presentation, live price ticker, interactive mini-demo slider, and FAQs.
  - `gold/GoldOverviewScreen.js`: 24K and 22K per-gram quotes, timestamp, and 5-year interactive chart.
  - `goldloan/GoldLoanScreen.js`: Purity selector, tiered LTV badge, collateral valuation, and lender comparisons.
  - `emi/EMIScreen.js`: Sliders, donut breakdown, prepayment simulator, and 60-month amortization table.
  - `admin/AdminPortalScreen.js`: Role-protected administrative dashboard with user activity audits and CSV exports.
  - `profile/SettingsScreen.js`: Accessibility toggles (Reduce Motion), data retention notices, and GDPR JSON export.
  - `info/AppInfoScreen.js`: Technical disclosures and developer team overview.
  - `intro/IntroScreen.js`: Standalone choreographed luxury Arth intro sequence viewer.
- **`src/services/`**:
  - `api.js`: Centralized HTTP client configured with loopback bridge (`http://10.0.2.2:5000/api`) for Android Studio Emulator and `http://localhost:5000/api` for Desktop Web.
  - `eventLogger.js`: Background event queue with **1.5-second debounce** on slider adjustments to avoid UI jitter.

---

## 4. Test Suite Summary (`/tests` & `/backend/tests`)

| Suite | File | Tests | Coverage |
| :--- | :--- | :--- | :--- |
| **Financial Audit (Math Core)** | `tests/calc/financialAudit.test.js` | 20 | Section 4 & 5 verification: ₹12.67L & ₹25.34L valuations, 75% LTV, 39.46% & 27.62% effective LTV, zero/null argument safety, hallmark parsing defect regressions |
| **Module B (Gold Loan)** | `tests/calc/goldLoan.test.js` | 17 | RBI 85%/80%/75% tiered LTV, collateral caps (1000g/50g), purity conversions, net weight deductions |
| **Module C (EMI)** | `tests/calc/emi.test.js` | 9 | Mandatory test case ($P=₹5\text{L}$, $10\%$, $60\text{M}$), reducing-balance schedule, prepayment savings, exact ₹0.00 final balance |
| **Module A (Stats)** | `tests/calc/stats.test.js` | 4 | Date range stats (High, Low, absolute change, percent change) |
| **Module A (Derivation)** | `tests/calc/goldDerivation.test.js` | 3 | Troy oz constant ($31.1034768\text{ g/oz}$), wholesale derivation, 6% customs duty, 1% AIDC & 3% GST breakdown |
| **API Security & Error Handling** | `backend/tests/apiSecurityAndCalculations.test.js` | 14 | API calculation endpoints, HTTP 400 on malformed JSON / invalid ObjectIds, 401 unauthorized, 403 RBAC, MongoDB regex injection safety |
| **Backend Auth** | `backend/tests/auth.test.js` | 6 | Signup, bcrypt hashing, JWT access/refresh rotation, 409 duplicate email rejection, unauthenticated 401 |
| **Backend Admin** | `backend/tests/admin.test.js` | 5 | RBAC 403 Forbidden enforcement, 200 OK for admin, user detail inspection, module analytics, CSV export |
| **Backend Gold** | `backend/tests/gold.test.js` | 5 | 15-minute live cache, stale-data fallback label, historical date queries, data source info |
| **Backend Calculations** | `backend/tests/calculations.test.js` | 3 | Saved calculations persistence, user ownership scoping, cascade deletion on account delete |
| **Backend Events** | `backend/tests/events.test.js` | 3 | 1.5s debounced activity logging, user history timeline, TTL index configuration |
| **Mobile Financial Accuracy** | `tests/mobile/goldLoanFinancialAccuracy.test.js` | 22 | 3 repayment methods (Interest Only, EMI, Maturity), assessed valuation vs credit separation, lender presets, shortfall flagging, benchmark ratios |
| **Mobile UI Logic** | `tests/mobile/mobileSuite.test.js` | 10 | Compact phone (<360px), tablet (≥600px), landscape dual-column, INR currency formatting |
| **Intro Animation Math** | `tests/mobile/arthTimingMath.test.js` | 6 | Deck collapse frame calculation, outside-in split ranks, resolve order, swap frames, cubic-bezier easing |
| **TOTAL** | **14 Suites** | **127 Tests** | **100% Passing (0 Failures, 0 Regressions)** |
