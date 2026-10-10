# KaamSetu AI — High-Level Architecture Overview

## Current Architecture (Step 1 Foundation)

```
+------------------------+             +------------------------+             +------------------------+
|    React Frontend      |  HTTP/REST  |  Node.js + Express API |  PostgreSQL |    Supabase Database   |
| (Vite, React 19, CSS)  | ----------->|    (JavaScript ES)     | ----------->|    (Managed Cloud)     |
| http://localhost:5173  |             | http://localhost:5000  |             |                        |
+------------------------+             +------------------------+             +------------------------+
```

### Components Summary

1. **Frontend**: Built with React 19, Vite, React Router, Vanilla CSS design system, Axios, and Lucide React. Serves the web interface and communicates with the backend API.
2. **Backend API**: Built with Node.js and Express. Uses Helmet for security, CORS for origin management, Zod for request validation, Socket.IO for realtime chat, and centralized error handling middleware. Exposes health check endpoints (`GET /api/health`, `GET /api/health/ready`).
3. **Database Layer**: Supabase PostgreSQL database connection established via `pg` connection pool and `@supabase/supabase-js` client (`backend/src/config/supabase.js`, `backend/src/config/db.js`).

---

## Future Roadmap & Modules (Upcoming Steps)

The following modules and workflows are planned for implementation in subsequent phases:

- **Authentication & Security**: Multi-role JWT authentication, password hashing, and role-based authorization (Worker, Employer, Admin).
- **AI Engine**: Skill matching, multilingual audio/voice parsing, automated resume/profile creation, and intelligent worker-job matching.
- **Worker Interface**: Multilingual support (English, Hindi, Marathi), mobile-first responsive layout, job application, and profile management.
- **Employer Interface**: Job posting, applicant discovery, project management, and contract tracking.
- **Admin & Analytics**: Platform health monitoring, user moderation, marketplace analytics, and transaction oversight.
- **Payment & Escrow System**: Milestone-based payments and transaction auditing.
- **Real-Time Messaging**: Chat and audio notes between employers and workers.
