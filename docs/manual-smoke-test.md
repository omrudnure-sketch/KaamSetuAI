# KaamSetu AI — Post-Deployment Smoke Test Checklist

Follow this step-by-step checklist after deploying the frontend to Vercel and the backend to Render to verify live functionality.

---

## 1. System Health & Connectivity Check
- [ ] **Backend Health Endpoint:** Open `https://<your-render-url>/api/health` in your browser.
  - **Expected:** HTTP 200 with JSON: `{"status":"healthy","database":"connected",...}`
- [ ] **Frontend Home Page:** Navigate to `https://kaamsetuai.vercel.app`.
  - **Expected:** Landing page loads with navigation bar, language switcher, and role options.
- [ ] **Browser Console:** Open browser DevTools (`F12` -> Console).
  - **Expected:** No unhandled runtime exceptions or CORS policy errors.

---

## 2. Worker Flow (Registration, Profile & Jobs)
- [ ] **Worker Registration:**
  - Click **Register** -> Select **I am a Worker**.
  - Enter Name, unique Phone/Email, password, and preferred language (e.g., Hindi or Marathi).
  - Submit form.
  - **Expected:** HTTP 201 Created. Automatically redirected to Worker Dashboard with session saved.
- [ ] **Worker Profile Completion:**
  - Navigate to **Worker Profile**.
  - Add primary skills (e.g., Plumbing, Carpentry), daily wage (e.g., ₹750), city (e.g., Mumbai).
  - Save profile.
  - **Expected:** Profile completion badge increases and changes persist on page refresh.
- [ ] **Browse Marketplace Jobs:**
  - Navigate to `/worker/jobs`.
  - **Expected:** Available open jobs load without `Unauthorized: Authentication token missing` error.
- [ ] **Apply to a Job:**
  - Click on an open job and submit an application with proposed wage.
  - **Expected:** Application status shows "Applied" / "Pending".

---

## 3. Employer Flow (Registration, Job Posting & Hiring)
- [ ] **Employer Registration:**
  - Open an Incognito browser window or log out.
  - Register as an **Employer** with Company/Business name and contact details.
  - **Expected:** Redirected to Employer Dashboard.
- [ ] **Post a Job:**
  - Click **Post Job**.
  - Enter Title (e.g., "Site Electrician Needed"), Category, Wage Amount, Duration, Workers Needed.
  - Publish Job.
  - **Expected:** Job appears in Active Jobs list with status `open`.
- [ ] **Review Applications & Propose Agreement:**
  - Open the job's applicants tab.
  - Select an applicant and initiate hiring agreement with agreed wage.
  - **Expected:** Hiring agreement status changes to `pending_worker`.

---

## 4. Hiring Confirmation & Project Lifecycle
- [ ] **Worker Agreement Confirmation:**
  - Log back in as Worker.
  - View received hiring agreement under agreements/invitations.
  - Click **Confirm Terms**.
  - **Expected:** Agreement status changes to `confirmed`. A new project is automatically generated.
- [ ] **Project Start & Operations:**
  - Navigate to active project details.
  - As Worker: Record **Daily Attendance Check-In** (GPS location).
    - **Expected:** Check-in records time successfully without "Invalid project ID format".
  - As Worker: Submit **Daily Progress Update** (e.g., 25% completed).
    - **Expected:** Progress bar updates immediately.
  - As Worker: Record **Check-Out**.
    - **Expected:** Check-out timestamp recorded.

---

## 5. Project Extension & Payment Ledger
- [ ] **Request Project Extension:**
  - Submit an extension request (e.g., 2 additional days).
  - Counterpart approves the extension.
  - **Expected:** Project expected end date updates automatically.
- [ ] **Wage Payment:**
  - Employer records a wage payment transaction.
  - **Expected:** Entry appears on the Project Payment Ledger.

---

## 6. Completion, Reviews & Communication
- [ ] **Project Completion:**
  - Request and confirm completion.
  - **Expected:** Project status updates to `completed`.
- [ ] **Mutual Reviews:**
  - Worker submits a 5-star review for Employer.
  - Employer submits a 5-star review for Worker.
  - **Expected:** Reviews published on user profiles.
- [ ] **Direct Messaging:**
  - Open chat between the project worker and employer.
  - Send a message.
  - **Expected:** Message appears in real-time, recipient receives in-app notification.

---

## 7. Admin Intelligence, Analytics & Reports
- [ ] **Admin Login:**
  - Log in with Admin credentials.
- [ ] **Admin Analytics (`/admin/analytics`):**
  - Select date range filter: **7 Days**, **30 Days**, **Year**.
  - Click each tab: **Overview**, **Hiring Funnel**, **User Demographics**, **Projects**, **Payments**, **Skill Demand vs. Supply**, **Attendance**.
  - **Expected:** All 8 tabs load real telemetry without `"Failed to load analytics data from server"` error. Shortage gap and wages calculate properly under Skill Demand.
- [ ] **Admin Reports (`/admin/reports`):**
  - Switch between report categories: **Workers**, **Employers**, **Jobs**, **Projects**, **Attendance**, **Payments**, **Disputes**.
  - **Expected:** Real tabular rows display with pagination without `"Failed to fetch report data"` error.
- [ ] **CSV Export:**
  - Click **Export CSV** on any report.
  - **Expected:** CSV file downloads immediately with sanitized formula protection (`'=1+1` escaped).

---

## 8. Role-Based Security Validation
- [ ] **Cross-Role Access Protection:**
  - As Worker: Attempt to navigate to `/employer/jobs` or `/admin/analytics`.
  - **Expected:** Redirected or denied with 403 Forbidden.
- [ ] **Expired / Missing Token Handling:**
  - Clear localStorage / auth cookie in browser DevTools.
  - Refresh a protected page (`/worker/jobs`).
  - **Expected:** Redirected to login with clean prompt: `"Your session has expired. Please log in again."`.

---

## 9. Cross-Browser, Device & Responsive Layout Validation
- [ ] **Fresh Browser / Incognito Profile:**
  - Open a brand-new Private / Incognito window or launch a separate browser (e.g. Firefox, Safari, Edge).
  - Open `https://kaamsetuai.vercel.app/login`.
  - **Expected:** Form renders completely clean with **zero** red error alerts (no `"Unauthorized: Authentication token missing"`).
- [ ] **Mobile Viewport (Smartphones / 375px - 414px width):**
  - Open browser DevTools Device Toolbar (`Ctrl+Shift+M` or `Cmd+Shift+M`) set to iPhone or Pixel.
  - Navigate between Home, Jobs, Projects, and Profile.
  - **Expected:** Fixed mobile bottom navigation bar displays properly with active tab icons; text wraps responsively without horizontal overflowing.
- [ ] **Tablet Viewport (iPads / 768px - 1024px width):**
  - Test portrait and landscape orientation.
  - **Expected:** Bento grid cards collapse smoothly from 2-column to 1-column layouts; top navbar is accessible.
- [ ] **Desktop Viewport (1280px+ width):**
  - Test desktop navigation drawer, AI assistant trigger, and language switcher (English, Marathi, Hindi).
  - **Expected:** Crisp typography, smooth modal animations, and sticky header backdrop blur.
- [ ] **Different Networks & Render Cold Starts:**
  - If backend is sleeping on Render free tier (takes ~30-45s to wake up), wait for the request to complete without client-side timeout (client timeout is configured to 60s).
  - **Expected:** Displays loading state or retry prompt rather than abrupt crash.
