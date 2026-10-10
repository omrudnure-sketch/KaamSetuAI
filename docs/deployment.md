# KaamSetu AI — Production Deployment & Operations Guide

This document outlines the deployment, infrastructure configuration, monitoring, and disaster recovery procedures for **KaamSetu AI**.

---

## 1. Architecture Overview

- **Frontend**: Single Page Application built with React 19 + Vite.
  - Recommended Hosting: **Vercel**
  - Routing: HTML5 client-side routing with SPA rewrite rules (`vercel.json`)
  - Languages: English, Marathi, Hindi (Worker UI); English only (Employer & Admin UIs)
- **Backend**: Express JavaScript API with Socket.IO realtime engine.
  - Recommended Hosting: **Render** (Node.js Web Service)
  - Runtime: Node.js 20+ LTS
  - Port: Dynamically assigned via `process.env.PORT`
- **Database**: **MongoDB Atlas**
  - Dedicated production cluster with TLS encryption and automated daily snapshots.
- **AI Engine**: Google Gemini API (`@google/genai`)
  - Features: Job description draft generation, profile summaries, admin assistant analytics, risk flag explanations.
  - Fallback: Graceful deterministic fallback on quota exhaustion (HTTP 429) without service disruption.

---

## 2. Environment Variables Specification

> **SECURITY NOTICE**: Never commit `.env` files or hardcode secrets into the source code. All production variables must be configured via the hosting dashboard.

### Backend Environment Variables (`backend/.env`)

| Variable | Required | Description | Example / Recommended Value |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | **Yes** | Runtime environment mode | `production` |
| `PORT` | **Yes** | Server listening port | `10000` (Render assigns automatically) |
| `MONGODB_URI` / `MONGO_URI` | **Yes** | MongoDB Atlas connection string | `mongodb+srv://<user>:<password>@cluster0.mongodb.net/kaamsetu_prod?retryWrites=true&w=majority` |
| `JWT_SECRET` | **Yes** | Cryptographic key for token signing (min 32 chars) | Generated using `openssl rand -hex 32` |
| `CLIENT_URL` | **Yes** | Allowed CORS origins (comma-separated if multiple) | `https://kaamsetu.vercel.app` |
| `GEMINI_API_KEY` | Optional | API key for Google Gemini model | `AIzaSy...` (kept securely on backend only) |

### Frontend Environment Variables (`frontend/.env`)

| Variable | Required | Description | Example / Recommended Value |
| :--- | :---: | :--- | :--- |
| `VITE_API_URL` | **Yes** | Public backend API URL | `https://kaamsetu-api.onrender.com/api` |
| `VITE_SOCKET_URL` | **Yes** | Public backend Socket.IO URL | `https://kaamsetu-api.onrender.com` |

---

## 3. Local Verification & Build Commands

### Root Workspace Commands

```bash
# Install dependencies across root, frontend and backend
npm run install:all

# Run complete automated backend test suites (7 suites, 100+ assertions)
npm run test

# Run frontend production build
npm run build
```

### Backend Direct Commands

```bash
cd backend

# Execute complete test suite
node tests/runAllTests.js

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

## 4. Database Setup (MongoDB Atlas)

1. **Create Dedicated Production Cluster**:
   - Create an M0/M10 cluster in MongoDB Atlas (recommended region: `ap-south-1` Mumbai for India latency).
2. **Dedicated Database User**:
   - Create a dedicated database user (e.g., `kaamsetu_app_prod`) with `readWrite` permissions on the `kaamsetu_prod` database only.
   - Do NOT use Atlas administrator credentials for application connections.
3. **Network Security & IP Access List**:
   - For Render web services, add `0.0.0.0/0` with strong database user credentials, or configure static outbound IPs if on a Render Team/Enterprise plan.
4. **Automated Backups**:
   - Verify Cloud Backup snapshots are scheduled (daily snapshots retained for 7+ days).

---

## 5. Backend Deployment (Render)

1. Log in to [Render](https://render.com) and click **New > Web Service**.
2. Connect your GitHub repository: `https://github.com/omrud/kaamsetuAI`.
3. Configure service details:
   - **Name**: `kaamsetu-ai-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node src/server.js`
   - **Health Check Path**: `/api/health`
4. Add Environment Variables in the Render dashboard:
   - `NODE_ENV` = `production`
   - `MONGODB_URI` = `<Atlas production connection string>`
   - `JWT_SECRET` = `<Generated 64-character random hex>`
   - `CLIENT_URL` = `https://<your-vercel-frontend-domain>.vercel.app`
   - `GEMINI_API_KEY` = `<Your Gemini API Key>`
5. Deploy Web Service.
6. Verify deployment by checking:
   - `GET https://kaamsetu-ai-backend.onrender.com/api/health` -> Returns `{"success": true, "status": "healthy"}`
   - `GET https://kaamsetu-ai-backend.onrender.com/api/health/ready` -> Returns `{"success": true, "status": "ready", "services": {"database": "connected"}}`

---

## 6. Frontend Deployment (Vercel)

1. Log in to [Vercel](https://vercel.com) and click **Add New > Project**.
2. Import your GitHub repository: `kaamsetuAI`.
3. Configure project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add Environment Variables:
   - `VITE_API_URL` = `https://<your-backend-app>.onrender.com/api`
   - `VITE_SOCKET_URL` = `https://<your-backend-app>.onrender.com`
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
  - Verifies that MongoDB Atlas is connected and accepting queries (`readyState === 1`).
  - Returns HTTP 200 when ready, HTTP 503 if disconnected.
  - Discloses zero credentials, connection strings, or internal infrastructure details.

---

## 8. Backup and Disaster Recovery Procedure

### Database Backup
1. MongoDB Atlas automatically retains daily Cloud Backups.
2. Manual on-demand snapshot:
   - Navigate to Atlas > **Clusters** > **Backup** > **Take Snapshot**.
3. Local logical export (using `mongodump`):
   ```bash
   mongodump --uri="<MONGODB_URI>" --out="./backups/$(date +%Y%m%d)"
   ```

### Database Restoration
1. In MongoDB Atlas, select **Restore** from any existing snapshot (Point-in-Time Restore available on paid tiers).
2. Or restore from logical dump:
   ```bash
   mongorestore --uri="<MONGODB_URI>" --drop "./backups/<backup-date>/"
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
   - If schema or data anomalies occurred, restore the Atlas snapshot taken prior to deployment.
4. **Credential Rotation**:
   - If `JWT_SECRET` or `GEMINI_API_KEY` is suspected of being compromised, update the variable in the Render Dashboard and trigger a manual redeploy. All existing JWT sessions will be invalidated safely.

---

## 10. Post-Deployment Verification (Smoke Tests Checklist)

Run these checks on the live production URL:

- [ ] HTTPS is enforced across frontend and backend.
- [ ] `GET /api/health` returns status `200` with status `healthy`.
- [ ] `GET /api/health/ready` returns status `200` with `database: connected`.
- [ ] Worker registration & login works smoothly.
- [ ] Employer registration & login works smoothly.
- [ ] Worker profile language switcher works (English, Marathi, Hindi).
- [ ] Employer and Admin interfaces remain English-only.
- [ ] Employer posts a job; worker can search and view job listing.
- [ ] Real-time Socket.IO chat connection establishes without transport errors.
- [ ] Admin dashboard renders real analytics with zero demo data.
- [ ] Development routes (`/api/auth/test`, `/api/auth/worker-only`) return 404 in production mode.
