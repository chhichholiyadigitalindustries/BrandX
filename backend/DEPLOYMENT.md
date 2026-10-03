# BRANDX BACKEND — PRODUCTION DEPLOYMENT GUIDE (RENDER / MANAGED NODE.JS)

This document provides the canonical deployment specification for the BrandX Express + Prisma + PostgreSQL backend on managed Node.js cloud hosting platforms (such as Render, Railway, AWS ECS, or GCP Cloud Run).

---

## 1. Service Specifications

| Setting | Value | Notes |
| :--- | :--- | :--- |
| **Runtime** | `Node.js` (v20+ LTS recommended) | Standard Node.js environment |
| **Root Directory** | `backend` | If deploying from a monorepo, set Root Directory to `backend` |
| **Build Command** | `npm install && npx prisma generate && npm run build` | Generates Prisma Client and compiles TypeScript to `dist/` |
| **Pre-Deploy / Migration** | `npx prisma migrate deploy` | Applies pending Prisma migrations to Neon production database |
| **Start Command** | `npm start` (or `node dist/server.js`) | Starts compiled production server |
| **Host Binding** | `0.0.0.0` | Explicitly bound in `src/server.ts` |
| **Port Detection** | Reads `process.env.PORT` | Injected automatically by Render/hosting provider |
| **Health Check Path** | `/health` or `/api/v1/health` | Returns HTTP 200 with database liveliness check (`SELECT 1`) |

---

## 2. Required Production Environment Variables

Configure these variables in your hosting provider's dashboard (e.g., Render Environment settings).  
**NEVER commit actual secret values to git or print them in build logs.**

### Core Platform & Database
- `NODE_ENV`: Set to `production`.
- `PORT`: (Managed by hosting platform, defaults to 5000 if not injected).
- `DATABASE_URL`: Production Neon PostgreSQL connection string with pooling and SSL (`sslmode=require`).
  *Format: `postgresql://user:password@host/database?sslmode=require`*
- `CORS_ORIGIN`: Comma-separated list of authorized production frontend origins (e.g., `https://app.brandx.in,https://brandx.in`). Wildcard `*` is strictly blocked in production.

### Cryptographic Authentication Secrets
- `JWT_SECRET`: High-entropy random secret (minimum 32 characters) for signing short-lived access tokens.
- `JWT_REFRESH_SECRET`: High-entropy random secret (minimum 32 characters) for signing refresh tokens.
- `ADMIN_JWT_SECRET`: High-entropy random secret (minimum 32 characters) strictly separating administrative staff authentication from customer authentication.
- `JWT_ACCESS_EXPIRES_IN`: Access token duration (default: `15m` in production).
- `JWT_REFRESH_EXPIRES_IN`: Refresh token duration (default: `30d`).

### Firebase Authentication (Server-Side Verification)
- `FIREBASE_PROJECT_ID`: Firebase project identifier (`brandx-cdi-2026`).
- `FIREBASE_CLIENT_EMAIL`: Service account client email for Firebase Admin SDK.
- `FIREBASE_PRIVATE_KEY`: Service account private key string (with line breaks preserved as `\n`).

### AI Service (Google Gemini)
- `GEMINI_API_KEY`: Server-side API key for Google GenAI SDK. Isolated from frontend clients.
- `GEMINI_MODEL`: AI model identifier (default: `gemini-3.8-flash`).
- `GEMINI_FALLBACK_MODEL`: Controlled fallback model on 503/transient availability spikes (default: `gemini-3.7-flash`).
- `GEMINI_MAX_RETRIES`: Maximum retries for primary model with exponential backoff (default: `2`).
- `GEMINI_BASE_DELAY_MS`: Base delay for exponential backoff (default: `1000`).
- `GEMINI_MAX_DELAY_MS`: Maximum delay cap for exponential backoff (default: `8000`).
- `AI_FREE_DAILY_LIMIT`: Daily prompt ceiling for Free tier users (default: `20`).
- `AI_PRO_DAILY_LIMIT`: Daily prompt ceiling for Pro tier users (default: `100`).

### Optional / Future Integrations (Configure When Live)
- `STORAGE_DRIVER`: `local` or `s3` (set to `s3` for multi-instance cloud deployments).
- `STORAGE_BUCKET`: S3/R2 bucket name.
- `STORAGE_REGION`: S3/R2 region (e.g., `ap-south-1` or `auto`).
- `STORAGE_ACCESS_KEY`: S3/R2 access key ID.
- `STORAGE_SECRET_KEY`: S3/R2 secret access key.
- `PAYMENT_PROVIDER`: `razorpay` (default).
- `PAYMENT_KEY_ID`: Razorpay live Key ID.
- `PAYMENT_KEY_SECRET`: Razorpay live Key Secret.
- `PAYMENT_WEBHOOK_SECRET`: Razorpay live Webhook HMAC Secret.

---

## 3. Render Deployment Walkthrough

1. **Create Web Service**:
   - Link your GitHub repository.
   - Set **Root Directory** to `backend`.
   - Select **Node** as the environment.
2. **Build & Start Commands**:
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npm start`
3. **Pre-Deploy Command (Recommended)**:
   - In Render Settings -> **Pre-Deploy Command**, enter:
     ```bash
     npx prisma migrate deploy
     ```
   - This ensures all schema migrations are applied before new containers receive live traffic.
4. **Health Check**:
   - Set **Health Check Path** to `/health`.
5. **Environment Variables**:
   - Enter all required environment variables listed in Section 2 above.
   - Mark secrets as "Secret" in the Render dashboard.

---

## 4. Production Security Architecture & Guarantees

- **Fail-Fast Startup Validation**: The backend validates configuration before accepting traffic. If required secrets are missing, weak (<32 chars), or contain placeholders, the process immediately halts with code `1`.
- **Database Connection Security**: Direct connections to `localhost` or insecure plain-text protocols are prohibited in production mode.
- **Graceful Shutdown**: Listens for `SIGTERM` and `SIGINT`, drains inflight HTTP requests, and cleanly closes Prisma connection pools before exiting.
- **Credential Scrubbing**: Server logs strip passwords, database connection strings, and plaintext OTP codes.

---

## 5. Post-Deployment Verification Checklist

After deploying, run the following verification steps:

1. **Health Probe**:
   ```bash
   curl -i https://<your-backend-domain>/health
   ```
   *Expected Response*: `HTTP 200 OK` with `status: "healthy"` and `database: "connected"`.
2. **API Welcome Ping**:
   ```bash
   curl -i https://<your-backend-domain>/
   ```
   *Expected Response*: `HTTP 200 OK` with `app: "BrandX Super App API"`.
3. **CORS Origin Check**:
   ```bash
   curl -i -X OPTIONS https://<your-backend-domain>/api/v1/auth/firebase \
     -H "Origin: https://<your-frontend-domain>" \
     -H "Access-Control-Request-Method: POST"
   ```
   *Expected Response*: `HTTP 204 No Content` or `200 OK` with matching `Access-Control-Allow-Origin`.
4. **Database Migration Verification**:
   Verify logs indicate `No pending migrations to apply` or migrations applied successfully.
