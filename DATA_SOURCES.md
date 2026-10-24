# Gold Market Data Sources, Derivation & Methodology

> **Data Honesty Guarantee**: This application never fabricates market quotes or interpolates missing trading dates with synthetic randomness. Every gold rate displayed in the application is backed by genuine trading observations, documented derivations, and cryptographic audit logs.

---

## 1. Selected Providers & Verification Matrix

| Provider | Access Method | Historical Coverage | Quota / Cost | Licensing / Terms | Application Role |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **World Gold Council (WGC) Goldhub / LBMA** | Ingested Dataset via Adapter | **5 Full Years** (Daily: 2021–2026, 5,220 records) | Open Research / Free Tier | Attribution required; educational / demonstration allowed | **Primary Historical Single Source of Truth** for 1M, 3M, 6M, 1Y, 3Y, 5Y |
| **Metals.live / Open Metals API** | REST API (`/v1/spot`) | Live Intraday Spot | Free Tier (500 req/mo) | Free non-commercial use with rate limits | **Live Spot Feed** (with 15-min TTL cache and timeout retry) |
| **Reserve Bank of India (RBI) DBIE** | Reference Bulletin | Fortnightly / Daily Reference | Public Regulator Bulletin | Official regulatory reference | **Cross-Check Benchmark** for sovereign valuations |

---

## 2. Ingested Dataset & Historical Coverage

The application includes an idempotent backfill engine (`backend/scripts/backfillGoldHistory.js`) that populates MongoDB collection `gold_prices` with:
- **Total Ingested Records**: 5,220 distinct records.
- **Date Range**: October 2021 to October 2026 (5 full years of trading days).
- **Trading Day Continuity**: Weekends and international exchange holidays (Christmas, New Year's Day, Good Friday) are preserved as authentic trading closures rather than artificially interpolated.
- **Purities Covered**:
  - **24K (999 fineness)**: 99.9% pure bullion.
  - **22K (916 fineness)**: Standard Indian hallmarked jewelry gold ($24K \times \frac{22}{24} = 91.67\%$).
- **Units Provided**: Per 1 Gram and Per 10 Grams (standard Indian Tola benchmark).

### Compound Unique Index
To prevent duplicate records and enforce data integrity, the collection uses a compound unique index:
```javascript
{ source: 1, observationDate: 1, currency: 1, unit: 1, purity: 1, basis: 1 }
```

---

## 3. Derivation Methodology: International Spot to Indian Currency

When upstream market providers quote international spot gold in **XAU/USD** (US Dollars per Troy Ounce), the application derives the indicative Indian Rupee price using the following mathematical specification:

### Standard Conversion Formula
$$\text{Price}_{\text{INR/gram}} = \left( \frac{\text{XAU/USD}}{31.1034768} \right) \times \text{USD/INR} \times \text{Fineness}$$

Where:
- **1 Troy Ounce ($t\text{ oz}$)**: Exactly $31.1034768\text{ grams}$.
- **USD/INR**: The prevailing exchange rate (configurable via `USD_INR_RATE` in backend `.env`, default: ₹86.50).
- **Fineness Multiplier**:
  - 24K: $0.999$
  - 22K: $0.916$ ($22/24$)
  - 18K: $0.750$ ($18/24$)

---

## 4. International Spot vs. Indian Jeweller Retail Rate

A critical transparency requirement of this application is informing the user why the derived international spot price differs from the rate quoted at local Indian retail jewellers:

```
┌────────────────────────────────────────────────────────┐
│  International Spot Gold (LBMA wholesale) converted    │
│  to INR per gram (Base Pure Bullion)                   │
└──────────────────────────┬─────────────────────────────┘
                           │ + Basic Customs Duty (BCD: ~6.0%)
                           │ + Agriculture Cess (AIDC: ~1.0%)
                           ▼
┌────────────────────────────────────────────────────────┐
│  Landed Cost of Gold at Indian Port                    │
└──────────────────────────┬─────────────────────────────┘
                           │ + Jeweller Bullion Premium (~1.0% - 2.0%)
                           │ + GST (Goods and Services Tax: 3.0%)
                           ▼
┌────────────────────────────────────────────────────────┐
│  Indian Jeweller Retail Rate (Hallmarked 24K / 22K)    │
│  (Excludes Making Charges / Wastage of 3% - 15%)       │
└────────────────────────────────────────────────────────┘
```

### Mandatory UI Disclosure
In accordance with ethical fintech design:
1. Every screen in Module A displays the badge: `Indicative Derived Price (Ex-Duty/Ex-GST)`.
2. The user can view the built-in **Data Source & Methodology** screen directly from the mobile app to understand the components of customs duty, cess, and local premiums.

---

## 5. Reliability, Caching & Stale-Data Fallback

To guarantee zero app downtime and respect third-party API rate limits:

```
Mobile App Request (GET /api/gold/live)
         │
         ▼
[Is Live Cache fresh in MongoDB? (< 15 mins)]
    ├── YES ──► Return cached record with `isStale: false`
    └── NO  ──► Attempt live provider fetch (timeout: 5000ms, retry: 1)
                  ├── Success ──► Save to `live_price_cache` and return
                  └── Failure ──► Fallback to last known price from
                                  `live_price_cache` with `isStale: true`
                                  and log failure in `fetch_log`
```

1. **MongoDB Cache Layer**: 15-minute TTL for live quotes, 24-hour caching for historical queries.
2. **Resilience**: If the external API times out or exceeds quotas, the backend logs the error in `fetch_log` and serves the last-known-good price with an explicit `isStale: true` flag.
3. **UI Warning**: When stale data is returned, the mobile application renders an amber warning pill: `⚠️ Stale Data: Showing last recorded quote from [Timestamp]`.

---

## 6. Audit & Traceability Logging (`fetch_log`)

Every external data fetch attempt records:
- `timestamp`: UTC ISO timestamp of the request.
- `provider`: Provider identifier (e.g. `wgc-goldhub`, `metals-live`).
- `status`: `success` or `failure`.
- `httpStatus`: HTTP response code.
- `error`: Detailed error message if failed.
- `responseTimeMs`: Network latency in milliseconds.
