# Step 0: Assumptions, Dependencies & Limitations

### 1. Gold Data Provider, Free-Tier Limits, Licensing & Historical Coverage
- **Architecture Strategy**: Pluggable provider adapter pattern (`IGoldDataProvider`) with three concrete data backends:
  1. **Primary Historical & Daily Ingest**: World Gold Council (WGC / Goldhub) official daily LBMA AM/PM fixing & INR conversion dataset (comprehensive 5+ years of verified daily records from 2019 to present, free for public/research use with attribution).
  2. **Live Spot API**: GoldAPI.io / Metals-Dev / Open Exchange Rates (Free tier: 100 requests/month; cost: $0 free tier, $15-50/mo for high-frequency live rates; display permission: non-commercial assessment display; cached server-side with a 15-minute TTL to stay well within free quotas).
  3. **Stale-Data & Offline Fallback**: MongoDB `live_price_cache` collection containing the last-known-good price, accompanied by a visible "Stale Data (Offline Fallback)" status badge.
- **5-Year Historical Coverage Target**:
  - Daily historical prices for 1M, 3M, 6M, 1Y, 3Y, and 5Y are backfilled into MongoDB with complete audit provenance (observation date, price, currency, unit, purity, basis, provider, retrieval timestamp).
  - Trading holidays and weekends are preserved as trading pauses (no synthetic or fabricated prices inserted).
  - Non-trading days show the last settled trading price with an explicit label.

### 2. India Price Derivation vs. Jeweller's Retail Rate
- **Derivation Formula**:
  $$\text{INR / gram (24K)} = \left(\frac{\text{XAU/USD}}{31.1034768}\right) \times \text{USD/INR} \times 0.999$$
  $$\text{INR / gram (22K)} = \text{INR / gram (24K)} \times \left(\frac{22}{24}\right) \text{ or } \times 0.916$$
- **Why Derived Price Differs from Jeweller's Retail Rate**:
  1. **Basic Customs Duty & AIDC**: India levies import tariffs (slashed to ~6% in Union Budget July 2024 from earlier 15%) on gold dore and bullion.
  2. **GST (Goods & Services Tax)**: Mandatory 3% GST levied on retail gold transactions.
  3. **IBJA & Regional Association Premiums**: India Bullion and Jewellers Association (IBJA) publishes opening/closing rates that include domestic vaulting, logistics, melting loss, and local cash-flow demand premiums.
  4. **Making Charges & Jeweller Margin**: Jewellers add 8%–25% making/wastage charges.
- **Transparency Mandate**: The application strictly labels derived international prices as *"Indicative International Spot Converted to INR (Ex-Duty & Ex-GST)"*, and provides an itemized toggle to view estimated domestic retail price with duty and GST.

### 3. Rounding Rules, Default Lender Assumptions & Expo SDK
- **Rounding Rules**:
  - Currency storage: Exact integer paise ($1\text{ INR} = 100\text{ paise}$) and high-precision decimal operations (`decimal.js` / integer math).
  - EMI schedule: Monthly interest rounded to nearest integer paise ($\text{Math.round}$). The final month's principal repayment is adjusted dynamically so the closing balance settles at exactly $\text{Rs } 0.00$.
- **Regulatory LTV & Collateral Tiers (RBI Directions)**:
  - Tier 1: Loan $\le \text{Rs } 2,50,000 \rightarrow 85\%$ max LTV.
  - Tier 2: Loan $> \text{Rs } 2,50,000$ and $\le \text{Rs } 5,00,000 \rightarrow 80\%$ max LTV.
  - Tier 3: Loan $> \text{Rs } 5,00,000 \rightarrow 75\%$ max LTV.
  - Maximum Collateral: Ornaments up to $1,000\text{ g}$ ($1\text{ kg}$) and bullion gold coins up to $50\text{ g}$ per customer.
- **Lender Assumptions (3 Illustrative Presets)**:
  - *Public Sector Bank Standard*: 8.75% p.a., 0.50% processing fee, Bullet or EMI.
  - *NBFC Fast-Track Gold Loan*: 11.50% p.a., 1.00% processing fee, Monthly Interest (bullet principal).
  - *Fintech Flexi Gold Overdraft*: 10.25% p.a., Rs 500 flat fee, Bullet.
- **Expo SDK & Runtime Version**:
  - Expo SDK 58 (React Native 0.88+) in managed workflow, 100% optimized for Android Studio Emulator (AVD) testing without custom native build complexities.

### 4. Hosting Choices for Backend and MongoDB
- **Backend**: Node.js + Express hosted on Render / Railway / Fly.io container with automatic HTTPS.
- **Database**: MongoDB Atlas M0 Free Tier (AWS Mumbai `ap-south-1` region for low latency to Indian users).

### 5. Authentication, User Data, Interaction History & Protection
- **Auth Protocol**: Stateless JWT Access Token (15-min lifespan) paired with refresh token stored in `expo-secure-store` on mobile and MongoDB session store on backend.
- **Security**: Passwords hashed with `bcryptjs` (salt rounds = 10). Helmet security headers, Express rate limiting (100 reqs/15m globally, 10 reqs/15m for auth routes), strict CORS.
- **Interaction Data Logged**:
  - `activity_events`: `userId`, `sessionId`, `module`, `action`, `screen`, `inputs`, `resultSummary`, `deviceInfo`, `timestamp`.
  - Debounced input logging (1.5 seconds settle time) prevents event flooding.
  - **Zero credential retention**: No passwords, tokens, or financial identifiers are ever recorded in analytics events.
- **Retention**: Configurable TTL index on MongoDB `activity_events` collection (default 12 months / 365 days auto-expiring).
- **Stakeholder / Admin Access**: In-app Admin Portal with role-based middleware (`role === 'admin'`). Env flag `ADMIN_VIEW_RAW_INPUTS=true` allows stakeholder inspection of input parameters; when false, only result summaries are displayed.
- **User Rights**: "Delete my account and data" cascades and deletes user document, saved calculations, and activity logs. "Export my data" provides machine-readable JSON archive.
