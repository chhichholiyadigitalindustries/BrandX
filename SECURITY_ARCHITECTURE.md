# BRANDX — DEFENSE-IN-DEPTH SECURITY ARCHITECTURE (INTERNAL)

**Classification: Internal Engineering Documentation Only**  
*Confidential — Do NOT publish to public marketing pages, terms of service, or privacy center.*

---

## 1. Security Philosophy

BrandX employs a **Defense-in-Depth Zero-Trust Architecture** structured across three independent, interlocking security rings:

- **Layer 1: Identity & Access Security**
- **Layer 2: Application & Data Security**
- **Layer 3: Platform, Admin & Infrastructure Security**

### Core Principles

1. **Zero Implicit Trust:** Every incoming network request—whether from a browser client, mobile application, external webhook, or internal micro-service—is treated as untrusted until verified, authenticated, and authorized.
2. **Server-Side Authority:** The backend database and server processes are the sole source of truth. The backend **never trusts**:
   - `userId` from request body or client headers.
   - `businessId` from unverified request parameters.
   - User `role` or permission levels asserted by the client.
   - `isPro` or subscription status passed from browser storage or request payloads.
3. **Fail-Closed Default:** If an authentication token is malformed, a database query encounters an unexpected state, a rate limit is exceeded, or an environment variable is missing, the system aborts execution and denies access.
4. **Least Privilege:** Users, administrators, and services operate strictly within the minimum privileges required to perform their explicit function.

---

## 2. Layer 1 — Identity & Access Security

### 2.1 Dual-Engine Authentication Lifecycle

BrandX implements a dual-engine authentication pipeline:

- **Firebase Authentication:** Handles phone OTP verification (SMS) and Google/Firebase OAuth.
- **BrandX Core Backend:** Verifies Firebase ID Tokens using Firebase Admin SDK, provisions/resolves the tenant identity in PostgreSQL, and issues cryptographically signed BrandX session tokens.

```text
[Client / Mobile App]
        │
   (Firebase OTP)
        ▼
[Firebase ID Token]
        │
   (Bearer Header)
        ▼
[BrandX Backend /api/v1/auth/firebase]
        │
        ├── 1. verifyFirebaseIdToken(token) via Firebase Admin
        ├── 2. Lookup/provision User record in Neon PostgreSQL
        ├── 3. Resolve Business membership & subscription status
        ├── 4. Generate Short-Lived Access Token + Refresh Token
        ▼
[Authorized API Operations]
```

### 2.2 Session Security & Token Lifecycle

- **Access Tokens:** Short-lived JWTs (default: 7 days in dev/test, configurable to minutes/hours in high-security production deployments) signed with HMAC-SHA256 (`JWT_SECRET`, min 32 characters).
- **Refresh Tokens:** Issued with separate cryptographically secure secrets (`JWT_REFRESH_SECRET`) and tracked in the `UserSession` table.
- **Session Revocation:** Logout invalidates the active `UserSession` record via `refreshTokenHash` matching or by purging user sessions across devices.
- **Client Storage Policy:** Sensitive keys, JWT signing secrets, database credentials, and service account tokens are strictly forbidden in `localStorage`, `sessionStorage`, cookies, or URL parameters.

### 2.3 OTP Security & Anti-Abuse Engine

Managed via `backend/src/services/otpSecurityService.ts`:

- **60-Second Resend Cooldown:** Any request for an OTP to the same mobile number within 60 seconds is immediately rejected with HTTP 429 (`OTP_RATE_LIMITED`).
- **Maximum 5 Verification Attempts:** Consecutive invalid OTP attempts increment a failure counter.
- **15-Minute Temporary Account Lockout:** Upon the 5th consecutive failed attempt, the account is locked for 900 seconds (15 minutes), rejecting all subsequent attempts with HTTP 429 (`ACCOUNT_LOCKED_TEMPORARILY`).
- **Zero-Logging Policy:** Plaintext OTP values are never output to server logs, database audit tables, or API response payloads.
- **Production Simulation Shield:** Direct OTP simulation endpoints are locked down and disabled when `NODE_ENV=production`.

### 2.4 Password Security Policy

- Passwords are validated using `strongPasswordSchema`:
  - Minimum 8 characters.
  - At least one uppercase letter (`[A-Z]`).
  - At least one lowercase letter (`[a-z]`).
  - At least one numerical digit (`\d`).
  - At least one special symbol (`[^A-Za-z0-9]`).
- Password hashes use **bcrypt** with a salt work factor of 10.
- Password reset endpoints are throttled via `passwordResetRateLimiter` (5 attempts per 15 minutes) to defeat enumeration and brute-force attacks.

### 2.5 Sensitive Action Re-Authentication

- High-risk operations (such as changing admin passwords or updating platform roles) require providing and verifying the `currentPassword` before accepting new credentials.

---

## 3. Layer 2 — Application & Data Security

### 3.1 Strict Tenant Isolation (Zero IDOR / BOLA)

Every multi-tenant resource belongs exclusively to an authenticated `businessId`:

- **Customer Directory:** `customerRepository.findById(customerId, businessId)` scopes all reads, updates, and deletions to the caller's authorized business. Cross-tenant access throws HTTP 404.
- **Khata Ledger:** `khataService.addTransaction(businessId, userId, { customerId, ... })` verifies customer ownership before writing ledger entries.
- **Product Master:** `productService.getProduct(productId, businessId)` enforces tenant isolation for inventory, SKUs, barcodes, and pricing.
- **GST Invoices:** `invoiceService.getInvoice(invoiceId, businessId)` prevents cross-business invoice inspection or tampering.
- **Digital Dukaan & Visiting Cards:** `storeService.getStoreById(id, businessId)` and `cardService.getCardById(id, businessId)` reject mismatched business identifiers.

### 3.2 Mass Assignment Protection

Request payloads are never blindly spread into Prisma ORM mutations (`data: req.body` is strictly prohibited).  
All controllers and services utilize **explicit allowlists** to construct database payloads:

- System properties (`id`, `ownerId`, `businessId`, `createdAt`, `updatedAt`) are assigned by server logic.
- Privileged properties (`isPro`, `role`, `balance`, `currentBalance`) are rejected if injected by callers.

### 3.3 Input Validation & Secure Data Types

All incoming requests are filtered through **Zod schemas** (`backend/src/validators/index.ts`):

- **Monetary Fields:** Selling price, purchase price, discount values, and invoice rates must be non-negative (`z.number().nonnegative()`) or positive. Negative monetary manipulation and `NaN` injection are rejected.
- **Tax & Discount Limits:** GST rates (`0%` to `100%`) and discount percentages (`0%` to `100%`) enforce strict boundary checking.
- **GSTIN & UPI Validation:** 15-character GSTIN regex and structured UPI ID formats are validated before acceptance.
- **Phone Numbers:** 10-digit Indian mobile numbers (`/^[6-9]\d{9}$/`) are enforced.

### 3.4 Defense-in-Depth Security Headers

Configured via `helmet` and custom middleware in `backend/src/app.ts`:

- **HTTP Strict Transport Security (HSTS):** `max-age=31536000; includeSubDomains; preload` enabled in production.
- **X-Content-Type-Options:** `nosniff` prevents MIME-type sniffing.
- **Frame Protection:** `X-Frame-Options: DENY` protects against clickjacking.
- **Referrer Policy:** `strict-origin-when-cross-origin`.
- **Permissions Policy:** Restricts browser camera, microphone, geolocation, and payment hardware access on API surfaces (`camera=(), microphone=(), geolocation=(), payment=()`).

### 3.5 Cross-Origin Resource Sharing (CORS)

- Production enforces an explicit origin allowlist (`config.corsOrigin`).
- Wildcards (`*`) with `credentials: true` are blocked.
- Unknown origins in production are rejected with a CORS error.
- Non-origin requests (e.g. mobile apps, curl) are handled safely without exposing browser cookie vectors.

### 3.6 CSRF Protection

- BrandX uses `Authorization: Bearer <Token>` headers rather than ambient browser session cookies for API operations.
- Because browser fetch requests do not automatically attach Bearer headers across cross-origin sites, traditional Cross-Site Request Forgery (CSRF) vectors are mitigated by architectural design.

### 3.7 Error Security & Production Sanitization

- In production, unhandled errors return generic messages (`An internal server error occurred. Please try again or contact support.`).
- Stack traces, database table structures, Prisma internal error codes, filesystem paths, and database connection strings are stripped from responses in `errorMiddleware.ts`.
- Database connection strings containing passwords (`postgresql://user:pass@host/db`) are automatically masked (`postgresql://***:***@host/db`) even in development diagnostics.

---

## 4. Layer 3 — Platform, Admin & Infrastructure Security

### 4.1 Granular Admin RBAC Matrix

Administrative access is enforced server-side via `adminAuthMiddleware.ts`:

| Role | Dashboard | Users & Shops | Content / CMS | Referrals & Config | Financials & Revenue | Refunds | Admin Team Mgmt | Audit Logs |
| --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **SUPER_ADMIN** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **ADMIN** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **MANAGER** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **ACCOUNTANT / FINANCE** | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| **CONTENT_MANAGER** | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **SUPPORT** | ❌ | ❌ | Read-Only | ❌ | ❌ | ❌ | ❌ | ❌ |

### 4.2 Privilege Escalation Prevention

- Customer access tokens attempting to access `/api/v1/admin/*` endpoints are intercepted and rejected with HTTP 403 (`FORBIDDEN_ADMIN_ACCESS`).
- Non-super admins attempting to modify admin roles, create admin users, or inspect system audit logs are rejected with HTTP 403 (`FORBIDDEN_ROLE`).
- No admin can modify their own role or elevate another user's permissions without active `SUPER_ADMIN` privileges.

### 4.3 Production Database Infrastructure

- **Provider:** Neon Serverless PostgreSQL (`ep-lingering-glade-a1m349r5-pooler.ap-southeast-1.aws.neon.tech`).
- **Transport Security:** SSL connection required (`sslmode=require`).
- **Connection Management:** Connection pooling configured with bounded pool sizes and connection timeouts.
- **Destructive Operations Disabled:** `prisma migrate reset` and `prisma db push` are strictly forbidden on production databases.

### 4.4 AI Security Architecture

```text
[BrandX Frontend]
       │
  (HTTPS API)
       ▼
[BrandX Backend API]
       │
  ├── 1. Authenticate User & Business
  ├── 2. Verify AI Quota (aiQuotaService)
  ├── 3. Enforce Rate Limiting (aiRateLimiter)
  ├── 4. Validate Prompt Size & Sanitize Inputs
       ▼
[Google Gemini 2.5 Flash API] (Server-side API key only)
```

- Direct browser calls to Gemini are strictly prohibited; the `GEMINI_API_KEY` never leaves the backend environment.
- Daily usage limits are enforced per tier (`freeDailyLimit: 20`, `proDailyLimit: 200`).
- Sensitive customer PII and internal accounting balances are omitted from generative prompts.

---

## 5. Authentication Architecture

1. **Frontend Authentication:** Firebase Phone OTP / Email auth executes on the client device.
2. **ID Token Issuance:** Firebase returns a signed JWT ID token.
3. **Backend Handshake:** Client sends ID token to `POST /api/v1/auth/firebase`.
4. **Token Verification:** Backend verifies the token signature against Google's public key cache.
5. **Identity Mapping:** The `firebaseUid` is resolved against the `User` table in PostgreSQL.
6. **Session Creation:** A new session record is recorded in `UserSession`, and BrandX access and refresh tokens are returned to the client.

---

## 6. Authorization Architecture

Every protected route executes a sequential pipeline:

1. `requireAuth`: Verifies access token, checks user active status, rejects suspended accounts.
2. `requireBusinessAccess` / `businessAuthMiddleware`: Resolves active business ownership.
3. `requireSubscription` / `requirePro`: Checks server-authoritative Pro status where required.
4. `requireRoles`: On admin endpoints, verifies that the authenticated admin user's role is in the authorized role list.

---

## 7. Tenant Isolation Matrix

Tenant isolation is enforced at the database repository layer through compound lookups:

- `Customer`: WHERE `id` = :id AND `businessId` = :businessId
- `Product`: WHERE `id` = :id AND `businessId` = :businessId
- `Invoice`: WHERE `id` = :id AND `businessId` = :businessId
- `KhataTransaction`: WHERE `customerId` = :customerId AND `businessId` = :businessId
- `DigitalStore`: WHERE `id` = :id AND `businessId` = :businessId
- `DigitalCard`: WHERE `id` = :id AND `businessId` = :businessId

Changing IDs in URL parameters, query strings, request bodies, or headers can never breach another tenant's data boundary.

---

## 8. Admin RBAC & Separation of Duties

- **Financial Segregation:** Content managers and marketing operators have zero visibility into payments, revenue summaries, withdrawal requests, or subscription transactions.
- **Operational Segregation:** Accountants and financial officers cannot alter content assets, update user accounts, or modify system settings.
- **Platform Segregation:** Only `SUPER_ADMIN` can view audit trails or provision administrative accounts.

---

## 9. AI Security & Abuse Mitigation

- **Rate Limiting:** Dedicated `aiRateLimiter` restricts request frequency.
- **Quota Limits:** Database-tracked daily counters in `AIUsage` prevent resource exhaustion.
- **Input Sanitization:** User prompts are sanitized to prevent prompt injection or exfiltration attacks.
- **Isolated Storage:** AI generation logs record anonymized token counts and status without persisting customer financial ledger data.

---

## 10. Payment Security Architecture

- **Deferred Provider:** Razorpay payment gateway integration is architecturally decoupled.
- **Server-Authoritative Pro State:** The client cannot activate Pro subscription by manipulating client storage, flags, or request bodies.
- **Webhook Signature Verification:** Webhook listeners enforce HMAC-SHA256 signature verification over the raw body before processing payment confirmations.
- **Idempotency:** Payment transaction records prevent duplicate crediting or double activation.

---

## 11. Secret Management & Isolation

- **Backend Only Secrets:**
  - `DATABASE_URL` (Neon PostgreSQL)
  - `JWT_SECRET` (BrandX token signing)
  - `JWT_REFRESH_SECRET`
  - `ADMIN_JWT_SECRET`
  - `FIREBASE_PRIVATE_KEY` / Service Account
  - `GEMINI_API_KEY`
- **Frontend Safe Variables:**
  - `VITE_FIREBASE_API_KEY`
  - `VITE_FIREBASE_AUTH_DOMAIN`
  - `VITE_FIREBASE_PROJECT_ID`
  - `VITE_API_URL`
- **Zero Bundle Contamination:** Automated bundle audits confirm that no private keys, JWT secrets, database connection strings, or Gemini keys enter the Vite production build.

---

## 12. Audit Logging & Security Telemetry

Audit records in PostgreSQL (`AuditLog` table) capture:

- `timestamp`: UTC timestamp of event.
- `actorId`: ID of the authenticated user or admin.
- `actorType`: `USER`, `ADMIN`, or `SYSTEM`.
- `action`: Standardized event string (e.g., `LOGIN_SUCCESS`, `ADMIN_PASSWORD_CHANGED`, `ROLE_UPDATED`, `WITHDRAWAL_PAID`).
- `entity` & `entityId`: Target resource modified.
- `ipAddress`: Remote client IP address.
- `userAgent`: Client user-agent string.
- `details`: Safe JSON metadata (never containing passwords, OTPs, or API secrets).

---

## 13. File & Upload Security

- Supported formats: JPEG, PNG, WebP, PDF.
- File size restrictions enforced on upload endpoints.
- Path traversal protection: Storage paths are resolved using normalized filenames without `../` sequences.
- Static media is served from designated `/uploads` routes with strict Content-Type headers.

---

## 14. Database Security

- Parameterized queries via Prisma ORM eliminate SQL injection vulnerabilities.
- Neon PostgreSQL enforces TLS/SSL encrypted in-transit connections.
- Transactional operations (e.g. Khata balances, wallet coin deductions, and withdrawal reversals) execute within atomic database transactions with row-level locking (`FOR UPDATE`) to prevent race conditions.

---

## 15. Dependency Security

- Dependencies are audited using `npm audit`.
- Direct dependencies maintain pinned, stable releases.
- Transitive dependencies with moderate advisory notices (such as `uuid` buffer bounds check in Google Cloud Storage SDK) have been audited: BrandX does not use buffer-based UUID parsing, rendering the specific exploit vector non-applicable.

---

## 16. Security Testing & Verification

The BrandX test suite verifies all three security grades:

- **Grade 1 (Identity & Access):** 20 automated test assertions covering authentication rejection, invalid/expired tokens, OTP cooldown, OTP lockout, password policy, account enumeration, and sensitive re-auth.
- **Grade 2 (Application & Data):** 13 automated test assertions covering IDOR/BOLA across customers, khata, products, invoices, stores, cards, mass assignment protection, monetary bounds, and security headers.
- **Grade 3 (Platform & Admin):** 10 automated test assertions covering customer-to-admin blocks, content manager financial blocks, accountant user management blocks, privilege escalation prevention, and authoritative subscription enforcement.
- **Status:** **100% Pass Rate across all 43 Security Grading checks + all 15 master unit test suites.**

---

## 17. Incident Response Considerations

1. **Compromised Secret:** Rotate `JWT_SECRET` and `ADMIN_JWT_SECRET` immediately in production environment variables; all existing sessions terminate upon restart.
2. **Account Abuse:** Lock the targeted account via `/api/v1/admin/users/:userId/status` (`SUSPENDED`).
3. **Emergency Session Purge:** Delete active records in `UserSession` table to force platform-wide re-authentication.
4. **Audit Trail Review:** Query `AuditLog` table by `actorId` or `ipAddress` to trace actions performed during the incident window.

---
*End of Internal Security Architecture Document.*
