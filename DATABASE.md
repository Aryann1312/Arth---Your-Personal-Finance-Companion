# MongoDB Database Architecture & Stakeholder Query Guide

> **Database Guarantee**: All user accounts, activity timelines, calculation snapshots, gold historical datasets, and API audit logs are persisted in MongoDB with optimized compound indexes and an automated 12-month TTL retention policy.

---

## 1. Collections & Schema Definitions

```
                     ┌──────────────────┐
                     │      users       │
                     └────────┬─────────┘
                              │ 1:N
            ┌─────────────────┴─────────────────┐
            │                                   │
            ▼                                   ▼
┌───────────────────────┐           ┌───────────────────────┐
│    activity_events    │           │  saved_calculations   │
│   (12-Month TTL)      │           │  (Gold Loan & EMI)    │
└───────────────────────┘           └───────────────────────┘

┌───────────────────────┐           ┌───────────────────────┐
│      gold_prices      │           │   live_price_cache    │
│  (5Y Daily Records)   │           │  (15-min TTL Cache)   │
└───────────────────────┘           └───────────────────────┘

┌───────────────────────┐           ┌───────────────────────┐
│       fetch_log       │           │   lender_reference    │
│  (Provider Audit)     │           │  (RBI Lender Presets) │
└───────────────────────┘           └───────────────────────┘
```

---

### Collection 1: `users`
Stores user profile credentials, assigned roles, and authentication timestamps.

| Field | Type | Modifiers / Rules | Description |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Primary Key | MongoDB generated unique identifier |
| `name` | String | required, trimmed | Full legal name of user |
| `email` | String | required, unique, lowercase | Authenticated user email address |
| `password` | String | required | Salted `bcryptjs` hash (10 rounds) |
| `role` | String | enum: `['user', 'admin']` | RBAC authorization role |
| `createdAt` | Date | default: `Date.now` | Account creation timestamp |
| `lastLoginAt`| Date | optional | Last successful authentication timestamp |

**Indexes**:
- `{ email: 1 }` (Unique)

---

### Collection 2: `activity_events`
Stores user interaction events, debounced calculation parameters, screen views, and device metadata.

| Field | Type | Description |
| :--- | :--- | :--- |
| `_id` | ObjectId | Event unique identifier |
| `userId` | ObjectId | Foreign key referencing `users._id` |
| `sessionId` | String | Client session identifier |
| `module` | String | Enum: `['gold', 'gold-loan', 'emi', 'auth', 'history', 'profile', 'admin']` |
| `action` | String | Action type (e.g., `'calculate_settled'`, `'save_calculation'`, `'view_range'`) |
| `screen` | String | Screen name (e.g., `'GoldOverviewScreen'`, `'EMICalculator'`) |
| `inputs` | Object | Debounced user inputs (amount, rate, tenure, weight, purity) |
| `resultSummary` | Object | Key calculation outputs (monthly EMI, eligible loan, pure weight) |
| `deviceInfo` | Object | Client device details (platform, osVersion, isTablet, screenWidth) |
| `timestamp` | Date | UTC timestamp (Default: `Date.now`) |

**Indexes & Retention Policy**:
- `{ timestamp: 1 }` with `expireAfterSeconds: 31536000` (Automatic **12-Month TTL Purge**).
- `{ userId: 1, timestamp: -1 }` (High-performance user timeline index).
- `{ module: 1, timestamp: -1 }` (Analytics aggregation index).

---

### Collection 3: `saved_calculations`
Persisted calculation records saved by users for future retrieval.

| Field | Type | Description |
| :--- | :--- | :--- |
| `userId` | ObjectId | Foreign key referencing `users._id` |
| `type` | String | Enum: `['gold-loan', 'emi']` |
| `label` | String | User-provided or auto-generated calculation title |
| `inputs` | Object | Calculation parameters (principal, rate, tenure, prepayments) |
| `results` | Object | Calculation outputs (EMI, interest, pure weight, eligible loan) |
| `createdAt` | Date | Timestamp of saving |

**Indexes**:
- `{ userId: 1, createdAt: -1 }`

---

### Collection 4: `gold_prices`
Historical daily gold market observations.

| Field | Type | Description |
| :--- | :--- | :--- |
| `observationDate` | String | Date string format: `YYYY-MM-DD` |
| `price` | Number | Price in Indian Rupees |
| `currency` | String | Default: `'INR'` |
| `unit` | String | Enum: `['gram', '10g', 'troy_oz']` |
| `purity` | String | Enum: `['24K', '22K', '18K']` |
| `basis` | String | Enum: `['observed', 'derived']` |
| `source` | String | Provider identifier (`'wgc-goldhub'`, `'metals-live'`, `'rbi-dbie'`) |
| `sourceUrl` | String | Provider documentation / data source URL |
| `retrievalTimestamp` | Date | Retrieval timestamp |

**Indexes**:
- `{ source: 1, observationDate: 1, currency: 1, unit: 1, purity: 1, basis: 1 }` (Compound Unique)
- `{ observationDate: 1, purity: 1, unit: 1 }`

---

### Collection 5: `live_price_cache`
In-memory/MongoDB fallback cache for the latest live gold spot price.

| Field | Type | Description |
| :--- | :--- | :--- |
| `cacheKey` | String | Unique cache identifier (`'INR_LIVE_24K'`) |
| `rate24KPerGram` | Number | 24K per gram price (INR) |
| `rate22KPerGram` | Number | 22K per gram price (INR) |
| `rate24KPer10g` | Number | 24K per 10g price (INR) |
| `rate22KPer10g` | Number | 22K per 10g price (INR) |
| `isStale` | Boolean | True if served from stale fallback |
| `updatedAt` | Date | Cache refresh timestamp |

---

### Collection 6: `fetch_log`
Audit log recording every external API request, latency, and failure.

| Field | Type | Description |
| :--- | :--- | :--- |
| `timestamp` | Date | Request timestamp |
| `provider` | String | External provider name |
| `status` | String | `'success'` or `'failure'` |
| `httpStatus` | Number | HTTP response code (e.g. 200, 429, 500) |
| `error` | String | Error description if request failed |
| `responseTimeMs` | Number | Upstream network latency in ms |

---

### Collection 7: `lender_reference`
Reference table of verified regulatory lender presets.

| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | String | Lender institution name |
| `minRate` / `maxRate` | Number | Published annual interest rate range |
| `processingFee` | String | Published fee policy |
| `ltvPercent` | Number | Published lender LTV (capped by RBI tier) |
| `isIllustrative` | Boolean | Distinguishes illustrative presets from live verified offers |
| `verifiedOn` / `expiresAt` | Date | Audit verification and expiration dates |

---

## 2. Example Stakeholder Queries (MongoDB Atlas / mongosh)

### 1. View User Engagement Timeline
Inspect a specific user's complete chronological activity:
```javascript
db.activity_events.find({
  userId: ObjectId("671a1b2c3d4e5f6789012345")
}).sort({ timestamp: -1 }).pretty();
```

### 2. Daily Calculation Volume Breakdown
Aggregate calculations per day for the last 30 days:
```javascript
db.activity_events.aggregate([
  {
    $match: {
      action: { $in: ["calculate_settled", "save_calculation"] },
      timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    }
  },
  {
    $group: {
      _id: {
        day: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
        module: "$module"
      },
      count: { $sum: 1 }
    }
  },
  { $sort: { "_id.day": -1, count: -1 } }
]);
```

### 3. Check 5-Year Gold Price Extremes
Find the historical All-Time High and Low for 24K gold per gram:
```javascript
db.gold_prices.aggregate([
  { $match: { purity: "24K", unit: "gram", currency: "INR" } },
  {
    $group: {
      _id: null,
      maxPrice: { $max: "$price" },
      minPrice: { $min: "$price" },
      totalObservations: { $sum: 1 }
    }
  }
]);
```

### 4. Audit External API Failures & Latency
Identify external provider timeout or rate limit incidents:
```javascript
db.fetch_log.find({ status: "failure" })
  .sort({ timestamp: -1 })
  .limit(20)
  .pretty();
```
