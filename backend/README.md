# BRANDX — Complete Production-Ready Backend

> **All-in-One Business Super App for Indian Vyaparis, Retailers & MSMEs**
>
> Scalable, secure, and production-ready REST API built with Node.js, Express, TypeScript, PostgreSQL & Prisma ORM.

---

## 🏛️ Architecture & Folder Structure

```text
backend/
├── prisma/
│   ├── schema.prisma        # Complete PostgreSQL relational schema
│   └── seed.ts              # Development seed data with demo vyaparis & admin
├── src/
│   ├── config/              # Environment config & Prisma client singleton
│   ├── controllers/         # HTTP request handlers
│   ├── services/            # Core business logic layer
│   ├── repositories/        # Multi-tenant data access layer
│   ├── routes/              # Express route definitions (/api/v1/...)
│   ├── middleware/          # JWT auth, Admin auth, RBAC, Zod validation, error handler, rate limiter
│   ├── validators/          # Zod validation schemas
│   ├── integrations/        # Gemini AI, Razorpay/Cashfree PG, Local/S3 storage, SMS/WhatsApp
│   ├── utils/               # GST calculator, Khata balance engine, JWT, hash, logger, response formatter
│   ├── types/               # TypeScript type definitions & Express declaration merging
│   ├── app.ts               # Express app setup, helmet, cors, parsers
│   └── server.ts            # Server entrypoint & graceful shutdown
├── tests/
│   ├── gstCalculations.test.ts
│   ├── khataCalculations.test.ts
│   ├── authAndIsolation.test.ts
│   ├── payments.test.ts
│   └── runAllTests.ts
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🚀 Quick Start & Installation

### 1. Prerequisites

- **Node.js**: `v18.x` or `v20.x` or `v22.x`
- **PostgreSQL**: `v14+` database instance (local, Supabase, Neon, AWS RDS, or Render Postgres)

### 2. Install Dependencies

```bash
cd backend
npm install
```

### 3. Setup Environment Variables

Copy `.env.example` to `.env` and configure your database and secrets:

```bash
cp .env.example .env
```

Key environment variables:

```ini
NODE_ENV=development
PORT=5000
API_PREFIX=/api/v1
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/brandx_db?schema=public"
JWT_SECRET=your_jwt_access_secret_key_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here
ADMIN_JWT_SECRET=your_admin_secret_key_here
GEMINI_API_KEY=your_gemini_api_key_here
PAYMENT_PROVIDER_KEY=rzp_test_placeholder_key
PAYMENT_PROVIDER_SECRET=rzp_test_placeholder_secret
```

### 4. Database Setup (Prisma)

Generate Prisma client and run migrations:

```bash
# Generate Prisma TypeScript Client
npm run prisma:generate

# Run Database Migrations
npm run prisma:migrate

# Seed Demo Indian Vyapari & Admin Data
npm run prisma:seed
```

### 5. Run Development Server

```bash
npm run dev
```

The server will start at: `http://localhost:5000/api/v1`

---

## 🧪 Running Automated Tests

Run unit tests for GST calculations, Digital Khata balancing, JWT authentication, and payment abstraction:

```bash
npm test
```

---

## 📡 API Route Catalog

Base URL: `http://localhost:5000/api/v1`

### 1. 🔐 Authentication (`/api/v1/auth`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Register new vyapari & shop |
| `POST` | `/api/v1/auth/login` | Mobile/Email & password login |
| `POST` | `/api/v1/auth/refresh-token` | Rotate JWT access token |
| `POST` | `/api/v1/auth/request-otp` | Request OTP for mobile login |
| `POST` | `/api/v1/auth/verify-otp` | Verify OTP and authenticate |

### 2. 👤 User & Business (`/api/v1/users`, `/api/v1/businesses`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/users/me` | Current user profile |
| `PATCH` | `/api/v1/users/me` | Update profile (name, email, language) |
| `GET` | `/api/v1/businesses` | List user's businesses |
| `GET` | `/api/v1/businesses/:id` | Get business profile & settings |
| `POST` | `/api/v1/businesses` | Create new business profile |
| `PATCH` | `/api/v1/businesses/:id` | Update business & UPI details |
| `PATCH` | `/api/v1/businesses/:id/settings` | Update invoice/thermal print settings |

### 3. 👥 Customers & Digital Khata (`/api/v1/customers`, `/api/v1/khata`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/customers` | Search & list khata customers |
| `POST` | `/api/v1/customers` | Add customer to khata |
| `PATCH` | `/api/v1/customers/:id` | Update customer details |
| `DELETE` | `/api/v1/customers/:id` | Delete customer |
| `POST` | `/api/v1/khata/transactions` | Add Udhar (Give) or Jama (Receive) |
| `GET` | `/api/v1/khata/customers/:id/statement` | Customer ledger statement & running balance |
| `GET` | `/api/v1/khata/summary` | Aggregate Udhar due & Jama received |
| `POST` | `/api/v1/khata/reminders` | Send WhatsApp payment reminder |

### 4. 🧾 GST Invoices & Item Master (`/api/v1/invoices`, `/api/v1/products`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/products` | Search catalog items & stock |
| `POST` | `/api/v1/products` | Add product with HSN/SAC code |
| `GET` | `/api/v1/invoices` | List invoices with status/date filters |
| `GET` | `/api/v1/invoices/:id` | Full invoice details with GST breakdown |
| `POST` | `/api/v1/invoices` | Create GST invoice (auto-numbered & recalculated) |
| `POST` | `/api/v1/invoices/:id/payments` | Record partial or full payment on bill |

### 5. 🏪 Digital Dukaan & NFC Card (`/api/v1/store`, `/api/v1/card`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/store/public/:slug` | Public customer storefront |
| `GET` | `/api/v1/store/me` | Owner store settings |
| `PATCH` | `/api/v1/store/me` | Update storefront branding |
| `POST` | `/api/v1/store/items` | Add product to online showcase |
| `GET` | `/api/v1/card/public/:slug` | Public Digital Visiting Card |
| `GET` | `/api/v1/card/public/:slug/vcard` | Downloadable `.vcf` vCard |

### 6. 🌅 Daily Status & Festive CMS (`/api/v1/content`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/content/today` | Today's Suvichar poster & greetings |
| `GET` | `/api/v1/content/calendar` | 365-day festive calendar feed |
| `GET` | `/api/v1/content/festivals` | Upcoming Indian festival schedule |
| `GET` | `/api/v1/content/posters` | Poster templates library |

### 7. 🤖 AI Biz Copilot (`/api/v1/ai`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/ai/chat` | AI Copilot conversational assistant |
| `POST` | `/api/v1/ai/generate` | Marketing captions, review replies, voice-to-bill |

### 8. 👑 Subscriptions & Payments (`/api/v1/subscriptions`, `/api/v1/webhooks`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/subscriptions/plans` | List pricing plans (Free, Pro, Annual) |
| `GET` | `/api/v1/subscriptions/my-subscription` | User's active subscription status |
| `POST` | `/api/v1/subscriptions/orders` | Create PG payment order |
| `POST` | `/api/v1/subscriptions/verify-payment` | Server-side signature & payment verification |
| `POST` | `/api/v1/webhooks/payment` | Gateway webhook handler |

### 9. 🛡️ Admin Portal (`/api/v1/admin`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/admin/auth/login` | Admin login (`admin@brandx.in`) |
| `GET` | `/api/v1/admin/overview` | Executive P&L, users, invoices & revenue stats |
| `GET` | `/api/v1/admin/users` | Platform vyapari directory |
| `PATCH` | `/api/v1/admin/users/:userId/status` | Suspend/activate user account |
| `GET` | `/api/v1/admin/businesses` | All verified shop profiles |
| `GET` | `/api/v1/admin/subscribers` | Pro subscribers audit list |
| `GET` | `/api/v1/admin/payments` | Payment transactions ledger |
| `GET` | `/api/v1/admin/refunds` | Refund requests & dispute audit |
| `POST` | `/api/v1/admin/content/daily` | Publish today's morning Suvichar |
| `POST` | `/api/v1/admin/content/posters` | Add template to poster library |

---

## 🔒 Security Principles

- **Zero Client Payment Secrets**: Secret gateway keys and Gemini API keys are held strictly in backend `.env`.
- **Multi-Tenant Data Isolation**: Every customer, invoice, and khata query is strictly scoped by `businessId` and validated against `req.user.id`.
- **No Sensitive Card/UPI Data**: Only safe masked identifiers (e.g. `UPI: r***@okhdfcbank` or `Card: **** 4821`) are persisted.
- **Backend-Authoritative GST Calculation**: GST rates and invoice totals are calculated and validated on the backend.
