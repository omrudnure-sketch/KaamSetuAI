# KaamSetu AI — Environment Variables & Supabase Setup Guide

This document specifies all environment variables for deploying **KaamSetu AI** using **Supabase PostgreSQL** as the database layer, with the frontend hosted on **Vercel** and the backend API & real-time server hosted on **Render**.

---

## 1. Supabase Setup & Relational Schema Migration

Before deploying, create your Supabase project and apply the schema:

1. **Create Supabase Project**:
   - Log in to [Supabase](https://supabase.com/dashboard) and create a new project (e.g. `kaamsetu-ai`).
   - Select your nearest region (e.g., `ap-south-1` Mumbai).
   - Set a strong database password and keep it safe.
2. **Execute Schema Migration**:
   - Open your project dashboard and navigate to **SQL Editor > New query**.
   - Copy the entire contents of [`supabase/schema.sql`](file:///c:/Users/omrud/OneDrive/Desktop/kaamsetuAI/supabase/schema.sql).
   - Click **Run**. This creates all 22 relational tables, custom enum types, foreign key relationships, indexes, and Row Level Security (RLS) policies.

---

## 2. Quick Variable Matrix

| Variable Name | Target Host | Required? | Sensitive? | Exposed to Browser? | Purpose |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `VITE_API_URL` | **Vercel** (Frontend) | **Yes** | No | **Yes** | Base URL for backend Express REST API |
| `VITE_SOCKET_URL` | **Vercel** (Frontend) | **Yes** | No | **Yes** | Base URL for Socket.IO real-time engine |
| `VITE_SUPABASE_URL` | **Vercel** (Frontend) | **Yes** | No | **Yes** | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | **Vercel** (Frontend) | **Yes** | Low (Public) | **Yes** | Supabase publishable anonymous key (protected by RLS) |
| `NODE_ENV` | **Render** (Backend) | **Yes** | No | No | Production mode flag (`production`) |
| `PORT` | **Render** (Backend) | **Yes** | No | No | Server listener port (`10000`) |
| `DATABASE_URL` | **Render** (Backend) | **Yes** | **YES (High)** | **NEVER** | Direct PostgreSQL connection string to Supabase |
| `SUPABASE_URL` | **Render** (Backend) | **Yes** | No | No | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | **Render** (Backend) | **Yes** | **YES (High)** | **NEVER** | Supabase secret service_role key for admin data access |
| `SUPABASE_ANON_KEY` | **Render** (Backend) | Optional | Low | No | Supabase anon key for client SDK compatibility |
| `JWT_SECRET` | **Render** (Backend) | **Yes** | **YES (High)** | **NEVER** | Cryptographic key for user authentication tokens |
| `CLIENT_URL` | **Render** (Backend) | **Yes** | No | No | Allowed frontend origin for CORS and Socket.IO |
| `GEMINI_API_KEY` | **Render** (Backend) | Optional | **YES (High)** | **NEVER** | Google Gemini API key for AI generation |

---

## 3. Frontend Variables (Vercel)

These variables are pre-structured in [`deployment/vercel.env`](file:///c:/Users/omrud/OneDrive/Desktop/kaamsetuAI/deployment/vercel.env) and should be imported into your **Vercel Project Settings > Environment Variables**.

### `VITE_API_URL`
- **Target**: Vercel
- **Format**: `https://<your-render-backend>.onrender.com/api`
- **Purpose**: Destination for Axios client HTTP requests (Auth, AI features, Admin functions).

### `VITE_SOCKET_URL`
- **Target**: Vercel
- **Format**: `https://<your-render-backend>.onrender.com`
- **Purpose**: Destination for Socket.IO WebSocket real-time connections.

### `VITE_SUPABASE_URL`
- **Target**: Vercel
- **Format**: `https://<your-project-ref>.supabase.co`
- **Where to obtain**: Supabase Dashboard > **Project Settings > API > Project URL**.
- **Purpose**: Allows frontend components to query Supabase directly using `@supabase/supabase-js`.

### `VITE_SUPABASE_ANON_KEY`
- **Target**: Vercel
- **Format**: Long JWT string (`eyJhbGci...`)
- **Where to obtain**: Supabase Dashboard > **Project Settings > API > Project API keys > anon (public)**.
- **Security**: Publicly exposed in client bundle. Supabase Row Level Security (RLS) protects underlying data.

---

## 4. Backend Variables (Render)

These variables are pre-structured in [`deployment/render.env`](file:///c:/Users/omrud/OneDrive/Desktop/kaamsetuAI/deployment/render.env) and should be imported into your **Render Web Service > Environment**.

### `DATABASE_URL`
- **Target**: Render
- **Sensitivity**: **HIGHLY SENSITIVE (Secret)**
- **Where to obtain**:
  1. Supabase Dashboard > **Project Settings > Database**.
  2. Under **Connection string**, select **URI**.
  3. Choose **Direct connection** (port 5432) or **Transaction pooler** (port 6543).
  4. Replace `[YOUR-PASSWORD]` with the password you set during project creation.
- **Format**: `postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres`

### `SUPABASE_URL`
- **Target**: Render
- **Format**: `https://<your-project-ref>.supabase.co`
- **Where to obtain**: Supabase Dashboard > **Project Settings > API > Project URL**.

### `SUPABASE_SERVICE_ROLE_KEY`
- **Target**: Render
- **Sensitivity**: **HIGHLY SENSITIVE (Secret)**
- **Where to obtain**: Supabase Dashboard > **Project Settings > API > Project API keys > service_role (secret)**.
- **Security Rule**: **NEVER put this key in Vercel or any frontend file.** This key bypasses Row Level Security and must stay on the backend server only.

### `JWT_SECRET`
- **Target**: Render
- **Sensitivity**: **HIGHLY SENSITIVE (Secret)**
- **Where to obtain**: Generate a random 64-character hex string:
  ```bash
  openssl rand -hex 32
  ```

### `CLIENT_URL`
- **Target**: Render
- **Format**: `https://<your-project>.vercel.app` (without trailing slash).
- **Purpose**: Configures CORS allowlist and Socket.IO origin validation.

### `GEMINI_API_KEY`
- **Target**: Render
- **Sensitivity**: **HIGHLY SENSITIVE (Secret)**
- **Where to obtain**: [Google AI Studio](https://aistudio.google.com/app/apikey) (optional).

---

## 5. Dashboard Import Procedures

### Vercel
1. Open [`deployment/vercel.env`](file:///c:/Users/omrud/OneDrive/Desktop/kaamsetuAI/deployment/vercel.env) and paste your Render URL, Supabase URL, and Supabase Anon Key.
2. In Vercel > **Settings > Environment Variables**, click **Import .env** or paste the file contents.
3. Save and redeploy.

### Render
1. Open [`deployment/render.env`](file:///c:/Users/omrud/OneDrive/Desktop/kaamsetuAI/deployment/render.env) and paste your Supabase `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, and Vercel `CLIENT_URL`.
2. In Render > **Web Service > Environment**, click **Add from .env** and paste the file contents.
3. Save changes. Render will automatically restart your server.
