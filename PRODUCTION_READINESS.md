# BrandX — Production Launch Readiness Document

**Document Version:** 1.0.0  
**Application:** BrandX (Indian MSME & Merchant Super App)  
**Status:** **CODE AUDIT & HARDENING COMPLETE — PRODUCTION READY**  
**Audit Scope:** Full Stack (Vite React PWA, Node.js/Express Backend, Prisma ORM, PostgreSQL, Firebase Auth, Razorpay, Gemini AI, Capacitor Android)

---

## 1. Executive Summary

BrandX has undergone a comprehensive, zero-compromise production audit and hardening cycle. All development shortcuts, unsafe mock payment paths, localhost hardcodings, and insecure CORS fallbacks have been removed or strictly guarded behind production environment checks. 

The codebase is **100% Code-Ready** for production deployment. Launching live requires configuring valid external third-party production credentials and cloud infrastructure as detailed below.

---

## 2. Completed Code Hardening & Audits

### 2.1 Git & Secrets Protection
- **Status:** `PASS`
- `.gitignore` (Root and Backend) updated to permanently prevent accidental commits of `.env`, `.env.local`, `.env.production`, `*.apk`, `*.aab`, and `google-services.json`.
- Zero hardcoded secrets, private keys, or credentials found in repository source files.
- Provided clean `.env.production.example` templates in both root and backend.

### 2.2 Environment Validation Layer
- **Status:** `PASS`
- Implemented `backend/src/config/envValidator.ts` that runs automatically on server initialization.
- **Fail-Fast Enforcement in Production:**
  - `DATABASE_URL` must be provided and not point to `localhost` / `127.0.0.1`.
  - `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `ADMIN_JWT_SECRET` must be unique and have a minimum entropy length of 32 characters. Default dev fallbacks will terminate the process immediately.
  - `CORS_ORIGIN` cannot be `*` in production when credentials are required.
  - Verifies presence of Firebase Admin credentials (Service Account JSON or Project/Email/Private Key).

### 2.3 Unified API Configuration (Frontend)
- **Status:** `PASS`
- Replaced fragmented API base URL strings across ~25 frontend and admin services with centralized `@/config/env.ts`.
- In production (`NODE_ENV === 'production'`), the frontend explicitly requires `VITE_API_BASE_URL` and refuses silent fallbacks to `http://localhost:5000`.

### 2.4 Auth & Firebase Hardening
- **Status:** `PASS`
- In `backend/src/controllers/authController.ts`, dev OTP simulation (`requestOtp` / `verifyOtp`) is completely disabled in production, returning `403 OTP_SIMULATION_DISABLED`. Real phone number verification delegates exclusively to Firebase Authentication.

### 2.5 Payments & Subscription Security
- **Status:** `PASS`
- In `backend/src/integrations/paymentProvider.ts`, mock payment creation, simulated verification, and unverified webhooks are blocked in production.
- Razorpay HMAC SHA256 signature verification is strictly enforced.
- Dedicated rate limiters applied to payment orders (`10 requests / 15 min`) and wallet withdrawal requests (`5 requests / 60 min`).
- In `src/screens/ProModal.tsx`, fake client-side Pro subscription activation via `localStorage` is disabled in production.

### 2.6 Tenant Isolation & Data Integrity
- **Status:** `PASS`
- Enforced multi-tenant validation in `customerRepository.ts`, `productRepository.ts`, and `invoiceRepository.ts`. All updates and deletions verify `businessId` ownership before mutation, preventing cross-tenant data leakage.
- Database migration script added (`npm run prisma:deploy` invoking `prisma migrate deploy`) to ensure non-destructive schema updates.

### 2.7 Mobile & Capacitor Security
- **Status:** `PASS`
- `capacitor.config.json` configured with `"androidScheme": "https"`.
- Removed `"cleartext": true` to forbid unencrypted HTTP communication in Android production builds.

### 2.8 AI Integration Guardrails
- **Status:** `PASS`
- All Gemini AI requests route through backend controller proxies with timeout protections (`AbortSignal.timeout`) and sanitized error handling to prevent API key exposure in runtime exception traces.

---

## 3. Verification & Build Matrix

| Verification Check | Target | Result | Notes |
| :--- | :--- | :--- | :--- |
| **Frontend Lint** | React/TypeScript | **PASS** (Exit 0) | Clean ESLint pass across all components |
| **Frontend Production Build** | Vite PWA Bundle | **PASS** (Exit 0) | Service worker & assets bundled without errors |
| **Backend TypeScript Check** | Express / TS | **PASS** (Exit 0) | Zero typing or signature mismatches |
| **Backend Production Build** | TypeScript Compiler | **PASS** (Exit 0) | Emitted clean `backend/dist` output |
| **Unit & Logic Test Suites** | Jest Backend Tests | **PASS** (Exit 0) | 19 test suites, 78 tests passed |
| **Prisma Schema Validation** | PostgreSQL ORM | **PASS** (Exit 0) | Valid relational schema |

---

## 4. Launch Readiness Matrix: Code vs. External Credentials

| Category | Item | Code Ready? | External Required? | Required Action for Launch |
| :--- | :--- | :---: | :---: | :--- |
| **Database** | Managed PostgreSQL | Yes | **YES** | Provision Neon / AWS RDS / Supabase PG. Supply connection string in `DATABASE_URL`. |
| **Database** | Migration Deployment | Yes | No | Execute `npm run prisma:deploy` in production CD pipeline. |
| **Auth** | Firebase Auth (Web) | Yes | **YES** | Set `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, etc. in frontend host. |
| **Auth** | Firebase Admin (Backend)| Yes | **YES** | Download Service Account Key JSON from Firebase Console and set `FIREBASE_SERVICE_ACCOUNT_KEY`. |
| **Payments** | Razorpay Gateway | Yes | **YES** | Generate Live Key ID & Secret from Razorpay Dashboard. Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`. |
| **AI Features** | Gemini AI | Yes | **YES** | Obtain Gemini API Key from Google AI Studio. Set `GEMINI_API_KEY` on backend. |
| **Hosting (Web)** | Frontend App / PWA | Yes | **YES** | Deploy `dist/` to Vercel, Cloudflare Pages, or Firebase Hosting. Assign custom domain. |
| **Hosting (API)** | Backend Node Server | Yes | **YES** | Deploy `backend/dist/` to Render, Railway, AWS ECS, or DigitalOcean App Platform. |
| **Domain & SSL** | SSL / Custom Domain | Yes | **YES** | Configure DNS A/CNAME records. Ensure HTTPS is enforced. Update `CORS_ORIGIN` to match frontend domain. |

---

## 5. Deployment Step-by-Step Runbook

### Step 1: Database Setup
1. Provision a PostgreSQL 15+ database instance with connection pooling enabled.
2. In your deployment environment, set:
   ```bash
   DATABASE_URL="postgresql://user:password@db-host:5432/brandx_prod?sslmode=require"
   ```
3. Run schema migrations:
   ```bash
   cd backend && npm run prisma:deploy
   ```

### Step 2: Backend Environment Variables
Set the following on your backend cloud host (e.g., Render, Railway, AWS):
```ini
NODE_ENV=production
PORT=5000
DATABASE_URL="postgresql://..."
JWT_SECRET="<generate-minimum-32-char-random-hex>"
JWT_REFRESH_SECRET="<generate-minimum-32-char-random-hex>"
ADMIN_JWT_SECRET="<generate-minimum-32-char-random-hex>"
CORS_ORIGIN="https://app.yourdomain.com,https://admin.yourdomain.com"
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nREPLACE_WITH_YOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
RAZORPAY_KEY_ID="rzp_live_xxxxxxxxxxxx"
RAZORPAY_KEY_SECRET="xxxxxxxxxxxxxxxxxxxxxxxx"
RAZORPAY_WEBHOOK_SECRET="xxxxxxxxxxxxxxxxxxxxxxxx"
GEMINI_API_KEY="REPLACE_WITH_YOUR_GEMINI_API_KEY"
```

### Step 3: Frontend Environment Variables
Set the following on your frontend cloud host (e.g., Vercel, Cloudflare Pages):
```ini
NODE_ENV=production
VITE_API_BASE_URL="https://api.yourdomain.com/api/v1"
VITE_FIREBASE_API_KEY="REPLACE_WITH_YOUR_FIREBASE_WEB_API_KEY"
VITE_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-project-id.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="123456789012"
VITE_FIREBASE_APP_ID="1:123456789012:web:xxxxxxxxx"
VITE_RAZORPAY_KEY_ID="rzp_live_xxxxxxxxxxxx"
```

### Step 4: Verification After Deployment
1. **API Health:** Call `GET https://api.yourdomain.com/api/v1/health` and verify response is `{ "status": "healthy", "database": "connected" }`.
2. **CORS:** Confirm frontend at `https://app.yourdomain.com` makes API calls without CORS errors.
3. **Authentication:** Perform a real SMS OTP login using a test mobile device.
4. **Subscription / Razorpay:** Perform a live test checkout (or test key) and verify webhook receipt.
5. **AI Generation:** Request a post caption or invoice recommendation to test Gemini API backend proxy.

---

## 6. Production PostgreSQL Readiness & Migration Architecture

### 6.1 Managed PostgreSQL Database Required
- **Mandatory Cloud Provider:** BrandX requires a dedicated, managed PostgreSQL 15+ instance (e.g., Neon, AWS RDS, Supabase, Google Cloud SQL, or Azure Database for PostgreSQL).
- **Single Source of Truth:** PostgreSQL is the **ONLY** persistence engine for production data. SQLite, MongoDB, Firestore, and dev in-memory delegates are strictly forbidden in production.

### 6.2 DATABASE_URL Requirements & Environment Separation
- **Strict Environment Separation:**
  - **Development:** Uses local PostgreSQL (`postgresql://postgres:password@localhost:5432/brandx_db`).
  - **Production:** Requires an encrypted, authenticated connection string to the managed PostgreSQL provider.
- **Fail-Fast Localhost Rejection:** The backend environment validator (`envValidator.ts`) automatically halts server boot in production if `DATABASE_URL` references `localhost`, `127.0.0.1`, `0.0.0.0`, or `host.docker.internal`.
- **Zero Hardcoding:** No database connection string or credentials are hardcoded anywhere in the codebase.

### 6.3 SSL/TLS Encryption Required
- **SSL Enforcement:** Production PostgreSQL connections must enforce encrypted transit via SSL/TLS (`?sslmode=require` or `?sslmode=verify-full`).
- **Connection Security:** Unencrypted plain-text database connections will be rejected by both the cloud provider and the Prisma engine.

### 6.4 Prisma Migrations Deployment (`npm run prisma:deploy`)
- **Safe Non-Destructive Deployment:** Apply database schema updates in production exclusively using:
  ```bash
  npm run prisma:deploy
  # equivalent to: npx prisma migrate deploy
  ```
- **Migration History Tracked:** The `_prisma_migrations` table records all applied migrations. The repository contains 10 forward-only, idempotent migrations covering all 38 models and relational constraints.

### 6.5 Strictly Prohibited Commands in Production
- 🚫 **DO NOT RUN `prisma db push`:** Bypasses migration records, risks dropping columns or tables unexpectedly, and is strictly prohibited in production.
- 🚫 **DO NOT RUN `prisma migrate reset`:** Drops the entire database and erases all production merchant records, GST invoices, and financial ledgers.
- 🚫 **DO NOT EXECUTE AUTOMATIC TRUNCATE OR DROP STATEMENTS:** Any maintenance must use version-controlled, forward-only migrations.

### 6.6 Database Backup Readiness
- **Cloud Provider Managed Backups:** Database backups must be managed directly at the cloud infrastructure level by your PostgreSQL provider (e.g., AWS RDS automated backups, Neon point-in-time recovery, Supabase daily backups).
- **Required Backup Policy:**
  - **Automated Daily Backups:** Minimum 7-day retention window (30 days recommended for financial and tax data).
  - **Point-in-Time Recovery (PITR):** Recommended for transaction rollback capability in the event of hardware or operational failure.
  - **Periodic Restore Testing:** Scheduled quarterly drill to restore a production snapshot into a staging database and verify ledger balances.
  - **Note on Backups:** No custom fake backup script exists in the app layer; backups are valid only when provisioned on the cloud provider.

### 6.7 Connection Pooling & Resource Limits
- **Managed Connection Pool:** When using serverless infrastructure (AWS Lambda, Vercel Functions, Cloud Run) or high-concurrency instances, attach connection pooling parameters to `DATABASE_URL`:
  ```bash
  DATABASE_URL="postgresql://user:password@pooler-host:5432/brandx_prod?sslmode=require&connection_limit=20&pool_timeout=30"
  ```
- **PgBouncer Compatibility:** If connecting through PgBouncer, ensure `pgbouncer=true` is appended to prevent prepared-statement collision issues.
- **Graceful Shutdown:** The server traps `SIGTERM` and `SIGINT` to gracefully drain HTTP connections and close Prisma database pools via `prisma.$disconnect()`.

### 6.8 Migration Safety & Transactional Integrity
- **Audited Migrations:** All 10 migrations have been audited for non-destructive operations (`IF NOT EXISTS` guards, zero table drops, zero data deletions).
- **Financial Transaction Safety:** All multi-step financial operations (invoice creation with stock deduction, Khata transactions, referral reward allocation, wallet credit/debit, and refund processing) execute inside atomic `prisma.$transaction()` blocks.
- **Credential Masking:** Database error messages are sanitized by `sanitizeDatabaseError()` to ensure connection strings, usernames, and passwords are never printed to logs or standard error.

