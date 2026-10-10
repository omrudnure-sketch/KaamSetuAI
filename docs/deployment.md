# KaamSetu AI — Production Deployment & Operations Guide

This document outlines the deployment, infrastructure configuration, monitoring, and disaster recovery procedures for **KaamSetu AI**.

---

## 1. Architecture Overview

- **Frontend**: Single Page Application built with React 19 + Vite.
  - Recommended Hosting: **Vercel**
  - Routing: HTML5 client-side routing with SPA rewrite rules (`vercel.json`)
  - Languages: English, Marathi, Hindi (Worker UI); English only (Employer & Admin UIs)
  - Database Client: Direct HTTP calls to Express backend; optional `@supabase/supabase-js` using `VITE_SUPABASE_ANON_KEY` for client-safe operations.
- **Backend**: Express JavaScript API with Socket.IO realtime engine.
  - Recommended Hosting: **Render** (Node.js Web Service)
  - Runtime: Node.js 20+ LTS
  - Port: Dynamically assigned via `process.env.PORT`
- **Database**: **Supabase** (Managed PostgreSQL)
  - Direct connection pooling via `pg` (`DATABASE_URL`).
  - Server-side administrative data access via `@supabase/supabase-js` (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).
  - Automated backups, point-in-time recovery, and Row Level Security (RLS).
- **AI Engine**: Google Gemini API (`@google/genai`)
  - Features: Job description draft generation, profile summaries, admin assistant analytics, risk flag explanations.
  - Fallback: Graceful deterministic fallback on quota exhaustion (HTTP 429) without service disruption.

---

## 2. Environment Variables Specification

> **SECURITY NOTICE**: Never commit `.env` files or hardcode secrets into the source code. All production variables must be configured via the hosting dashboard.

### Backend Environment Variables (`backend/.env` & Render Dashboard)

| Variable | Required | Description | Example / Recommended Value |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | **Yes** | Runtime environment mode | `production` |
| `PORT` | **Yes** | Server listening port | `10000` (Render assigns automatically) |
| `DATABASE_URL` | **Yes** | Supabase PostgreSQL connection pooler URI (Transaction pooler, port 6543) | `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `SUPABASE_URL` | **Yes** | Supabase project API base URL | `https://[your-project-ref].supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Supabase administrative service role secret key (Server-only!) | `eyJhbGciOi...` |
| `JWT_SECRET` | **Yes** | Cryptographic key for token signing (min 32 chars) | Generated using `openssl rand -hex 32` |
| `JWT_EXPIRES_IN` | Optional | JWT token validity duration | `7d` |
| `CLIENT_URL` | **Yes** | Allowed CORS origins (comma-separated if multiple) | `https://kaamsetu.vercel.app` |
| `GEMINI_API_KEY` | Optional | API key for Google Gemini model | `AIzaSy...` (kept securely on backend only) |

> [!CAUTION]
> **NEVER** expose `SUPABASE_SERVICE_ROLE_KEY` to Vite or frontend environments. It bypasses Row Level Security and must remain restricted to the Express backend runtime.

### Frontend Environment Variables (`frontend/.env` & Vercel Dashboard)

| Variable | Required | Description | Example / Recommended Value |
| :--- | :---: | :--- | :--- |
| `VITE_API_URL` | **Yes** | Public backend API URL | `https://kaamsetu-ai-backend.onrender.com/api` |
| `VITE_SOCKET_URL` | **Yes** | Public backend Socket.IO URL | `https://kaamsetu-ai-backend.onrender.com` |
| `VITE_SUPABASE_URL` | Optional | Supabase project URL | `https://[your-project-ref].supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Optional | Supabase public anonymous key (Safe for browser) | `eyJhbGciOi...` |

---

## 3. Local Verification & Build Commands

### Root Workspace Commands

```bash
# Install dependencies across root, frontend and backend
npm run install:all

# Run complete automated backend test suites (8 suites including Supabase regression test)
npm run test

# Run frontend production build
npm run build
```

### Backend Direct Commands

```bash
cd backend

# Execute complete test suite
node tests/runAllTests.js

# Execute database migration regression test only
node tests/database-migration.test.js

# Execute security hardening tests only
node tests/security-hardening.test.js

# Execute end-to-end 20-step workflow
node tests/e2e-workflow.test.js

# Production start
npm start
```

### Frontend Direct Commands

```bash
cd frontend

# Run Vite build
npm run build

# Preview built artifacts locally
npm run preview
```

---

## 4. Database Setup (Supabase)

1. **Access Supabase Dashboard**:
   - Open your project at [https://supabase.com/dashboard](https://supabase.com/dashboard).
2. **Execute Database Migration Schema**:
   - Navigate to the **SQL Editor** tab in the Supabase Dashboard.
   - Click **New Query**.
   - Copy and paste the entire contents of `supabase/schema.sql`.
   - Click **Run** to execute the migration.
   - This creates all 22 core tables (`users`, `worker_profiles`, `jobs`, `hiring_agreements`, `projects`, etc.), custom ENUM types, relational constraints, foreign keys, and indexes.
3. **Obtain Connection Details**:
   - Go to **Project Settings > Database**:
     - Copy the **Connection String (URI)** under "Transaction Pooler" (port 6543) for `DATABASE_URL`.
   - Go to **Project Settings > API**:
     - Copy **Project URL** for `SUPABASE_URL`.
     - Copy **service_role secret key** for `SUPABASE_SERVICE_ROLE_KEY`.
     - Copy **anon public key** for `VITE_SUPABASE_ANON_KEY` (if used by frontend).

---

## 5. Backend Deployment (Render)

1. Log in to [Render](https://render.com) and click **New > Web Service**.
2. Connect your GitHub repository: `https://github.com/omrudnure-sketch/KaamSetuAI`.
3. Configure service details:
   - **Name**: `kaamsetu-ai-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node src/server.js`
   - **Health Check Path**: `/api/health`
4. Add Environment Variables in the Render dashboard:
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = `<Your Supabase Transaction Pooler connection string>`
   - `SUPABASE_URL` = `https://<your-project-ref>.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = `<Your Supabase Service Role secret key>`
   - `JWT_SECRET` = `<Generated 64-character random hex>`
   - `CLIENT_URL` = `https://<your-vercel-frontend-domain>.vercel.app`
   - `GEMINI_API_KEY` = `<Your Gemini API Key>`
5. Deploy Web Service.
6. Verify deployment by checking:
   - `GET https://kaamsetu-ai-backend.onrender.com/api/health` -> Returns `{"success": true, "status": "healthy"}`
   - `GET https://kaamsetu-ai-backend.onrender.com/api/health/ready` -> Returns `{"success": true, "status": "ready", "services": {"database": "connected", "engine": "postgresql_supabase"}}`

---

## 6. Frontend Deployment (Vercel)

1. Log in to [Vercel](https://vercel.com) and click **Add New > Project**.
2. Import your GitHub repository: `KaamSetuAI`.
3. Configure project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add Environment Variables:
   - `VITE_API_URL` = `https://<your-backend-app>.onrender.com/api`
   - `VITE_SOCKET_URL` = `https://<your-backend-app>.onrender.com`
   - `VITE_SUPABASE_URL` = `https://<your-project-ref>.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `<Your public anon key>`
5. Click **Deploy**.
6. Verify SPA Client Routing:
   - The included `frontend/vercel.json` ensures that direct browser requests or page refreshes on paths like `/admin/analytics` or `/worker/jobs` are routed directly to `index.html`.

---

## 7. Health & Readiness Monitoring

The platform provides two monitoring endpoints:

- **Liveness Health Check (`GET /api/health`)**:
  - Responds with HTTP 200 and uptime information.
  - Used by Render and uptime monitors (UptimeRobot, BetterStack) to verify that the Express HTTP server process is running.
- **Readiness Check (`GET /api/health/ready`)**:
  - Verifies that Supabase / PostgreSQL database connection is active and responsive (`SELECT 1`).
  - Returns HTTP 200 when ready with engine information (`postgresql_supabase` or `supabase_client`).
  - Returns HTTP 503 if disconnected.
  - Discloses zero credentials, connection strings, or internal infrastructure details.

---

## 8. Backup and Disaster Recovery Procedure

### Database Backup
1. **Automated Daily Backups**:
   - Supabase automatically takes daily backups of PostgreSQL databases.
2. **Point-in-Time Recovery (PITR)**:
   - Available in Supabase Pro projects under **Database > Backups > Point in time**.
3. **Local Logical Backup (via `pg_dump`)**:
   ```bash
   pg_dump "postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres" -F c -b -v -f "./backups/kaamsetu_$(date +%Y%m%d).dump"
   ```

### Database Restoration
1. In Supabase Dashboard, select **Backups** and restore to any snapshot.
2. Or restore from local logical dump:
   ```bash
   pg_restore --clean --if-exists -d "postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres" "./backups/<backup-file>.dump"
   ```

---

## 9. Rollback Plan

If a newly deployed version introduces critical issues:

1. **Frontend Rollback (Vercel)**:
   - Navigate to **Vercel Dashboard > Deployments**.
   - Locate the previous successful deployment and click **Instant Rollback**.
2. **Backend Rollback (Render)**:
   - Navigate to **Render Dashboard > Web Service > Deploys**.
   - Click on the previous working deploy and select **Rollback to this deploy**.
3. **Database Rollback**:
   - If schema or data anomalies occurred, restore the Supabase snapshot taken prior to deployment.
4. **Credential Rotation**:
   - If `JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, or `GEMINI_API_KEY` is suspected of being compromised, update the variable in the Render Dashboard and trigger a manual redeploy. All existing JWT sessions will be invalidated safely.

---

## 10. Post-Deployment Verification (Smoke Tests Checklist)

Run these checks on the live production URL:

- [ ] HTTPS is enforced across frontend and backend.
- [ ] `GET /api/health` returns status `200` with status `healthy`.
- [ ] `GET /api/health/ready` returns status `200` with `database: connected` and `engine: postgresql_supabase`.
- [ ] Worker registration & login works smoothly.
- [ ] Employer registration & login works smoothly.
- [ ] Worker profile language switcher works (English, Marathi, Hindi).
- [ ] Employer and Admin interfaces remain English-only.
- [ ] Employer posts a job; worker can search and view job listing.
- [ ] Real-time Socket.IO chat connection establishes without transport errors.
- [ ] Admin dashboard renders real analytics with zero demo data.
- [ ] Development routes (`/api/auth/test`, `/api/auth/worker-only`) return 404 in production mode.
