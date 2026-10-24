# Technical Architecture & Design Decisions

> **Architecture Purpose**: This document explains the system design, communication patterns, state management, security boundaries, and responsive layout strategies implemented across the mobile app and backend.

---

## 1. System Topology & Data Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                        React Native Mobile App                         │
│             (Android Studio Emulator, SDK 58, JavaScript)              │
│                                                                        │
│   Auth Context          Settings Context       Event Batch Logger      │
│   (JWT in SecureStore)  (Reduce Motion, LTV)   (1.5s Debounce Queue)   │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ HTTPS / JSON (Bearer Token)
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       Express 4.x REST Backend                         │
│                                                                        │
│   [Security Gate: Helmet, CORS, RateLimiter, TokenVerify, RoleGuard]   │
│                                    │                                   │
│   Controllers                      Services                            │
│   ├── authController               ├── GoldDataManager                │
│   ├── goldController               ├── ProviderAdapters (WGC/Metals)   │
│   ├── calcController               └── ActivityLoggerService           │
│   ├── adminController                                                  │
│   └── eventController                                                  │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ Mongoose ODM
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          MongoDB Database                              │
│                                                                        │
│   • users              • saved_calculations   • live_price_cache       │
│   • activity_events    • gold_prices          • fetch_log              │
│     (12M TTL Index)      (5Y Historical Daily)• lender_reference       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Shared Pure Calculation Engine (`/lib/calc`)

To guarantee identical calculation accuracy between the backend APIs and offline-capable mobile screens:
1. **Zero Framework Dependencies**: The calculation engine in `/lib/calc` contains zero React, React Native, or Node.js imports. It is 100% pure vanilla JavaScript.
2. **Paise-Level Rounding**: All currency computations are handled in integer paise ($1\text{ Rupee} = 100\text{ paise}$) to eliminate JavaScript IEEE-754 floating-point inaccuracies.
3. **Dual-Location Strategy**:
   - Primary: `/lib/calc/` (tested by root Jest test runner).
   - Mirrored: `/mobile/src/lib/calc/` (direct imports within Expo React Native project).
   - *Rationale*: React Native's Metro bundler cannot resolve relative files outside the mobile project root directory without complex symlinks that fail across operating systems. Mirroring ensures 100% compatibility across Android Studio Emulator and bundling tools.

---

## 3. Authentication & Session Architecture

```
User Launches App
       │
       ▼
[Check expo-secure-store for `refreshToken`]
       ├── Not Found ──► Direct to Auth Stack (Landing / Login / SignUp)
       └── Found ──────► Request POST /api/auth/refresh
                           ├── Success ──► Store new `accessToken` in memory
                           │               Navigate to Authenticated Bottom Tabs
                           └── Expired ──► Purge SecureStore, direct to Login
```

- **Short-Lived Access Tokens**: Signed with `JWT_ACCESS_SECRET` with an expiry of **15 minutes**. Sent via `Authorization: Bearer <token>` header.
- **Long-Lived Refresh Tokens**: Signed with `JWT_REFRESH_SECRET` with an expiry of **7 days**. Stored exclusively on device inside hardware-backed `expo-secure-store`.
- **Never In AsyncStorage**: Tokens are never saved in `AsyncStorage`, preventing token extraction via unauthorized sandbox inspection.
- **Role-Based Access Control (RBAC)**: User roles (`user` vs `admin`) are embedded in the signed JWT payload. The backend `roleGuard(['admin'])` middleware strictly enforces access, rejecting non-admins with `403 Forbidden`.

---

## 4. Debounced Event Logging & Offline Resilience

To fulfill the stakeholder requirement of recording complete user interaction history without degrading UI frame rates or flooding the database:

```
User Adjusts Calculation Sliders (Amount, Rate, Tenure)
         │
         ▼
[UI Updates Immediately at 60 fps]
         │
         ▼
[1.5-Second Settled-Input Debounce Timer]
         │
         ├── User moves slider again ──► Reset 1.5s timer
         └── 1.5s Timer Expires
               │
               ▼
Enqueue event in `mobile/src/services/eventLogger.js`
               │
               ▼
Batch flush queue to `POST /api/events/batch` in background
```

- **Debounced Logging**: Calculation inputs are only dispatched after inputs have settled for **1.5 seconds**, or immediately upon tapping **Save Calculation**.
- **Non-Blocking Execution**: Event submission runs asynchronously in background promises without blocking the Reanimated worklet thread.
- **Offline Queue**: If network connectivity drops, events accumulate in a FIFO queue and flush sequentially upon reconnection.
- **Privacy Sanitization**: Passwords, auth tokens, and sensitive payment identifiers are stripped at the serialization layer before leaving the device.

---

## 5. Responsive Layout Architecture

Every screen adapts seamlessly across:
- **Small compact phones** ($< 360\text{px}$ width)
- **Standard phones** ($390 - 430\text{px}$ width)
- **Tablets** ($\ge 600\text{px}$ width)
- **Landscape orientation** (device width $>$ height)

### Implementation Mechanism
The app provides a custom reactive hook `useResponsiveLayout`:
```javascript
export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= BREAKPOINTS.phone || (isLandscape && width >= 650);

  return {
    width,
    height,
    isLandscape,
    isTablet,
    numColumns: isTablet ? 2 : 1,
    contentMaxWidth: isTablet ? 1100 : 540,
    horizontalPadding: isTablet ? 32 : 16
  };
}
```

- **Adaptive Split Layout**: When `isTablet` is true, the `ResponsiveContainer` component switches from single-column vertical flow to a 2-column flexbox (`flexDirection: 'row'`). Calculation input sliders appear on the left, while charts and result cards render simultaneously on the right.
- **Dynamic Charts**: Chart SVG viewboxes recompute dimensions on orientation change events, guaranteeing no clipping.
