# KaamSetu AI — Test Data & Testing Toolkit

Comprehensive local and staging test suite for **KaamSetu AI**, providing safe, deterministic sample data, non-destructive seeding and cleanup tools, and end-to-end testing scenarios.

---

## 1. Architecture & Technology Stack

- **Frontend**: React (Vite, JavaScript, Vanilla CSS, Lucide icons)
- **Backend**: Node.js, Express (ES Modules, REST API)
- **Database**: Supabase PostgreSQL (managed relational database)
- **Authentication**: JWT & HTTP-Only cookies with bcrypt password hashing
- **Deployment**: Vercel (Frontend) & Render (Backend)

> [!NOTE]
> All scripts and fixtures use pure **JavaScript (ESM)** and **JSON**. No TypeScript is used.
> No mock/in-memory databases or MongoDB models are used; all operations interact with the actual Supabase schema via the application's Supabase service-role client and PostgreSQL connection pool.

---

## 2. Directory Structure

```text
testing/
├── README.md                           # Comprehensive documentation & test checklist
├── package.json                        # Native ESM script runners and dependency bridges
├── data/                               # 16 Coherent fictional JSON test fixtures
│   ├── sample-users.json               # 13 Users (8 workers, 4 employers, 1 super admin)
│   ├── sample-worker-profiles.json     # 8 Worker profiles (Pune, Solapur, Sangli, Kolhapur)
│   ├── sample-employer-profiles.json   # 4 Employer enterprise & contractor profiles
│   ├── sample-jobs.json                # 16 Fictional jobs covering 15 distinct categories
│   ├── sample-applications.json        # 6 Applications (pending, selected, rejected)
│   ├── sample-invitations.json         # 4 Direct job invitations (pending, accepted, declined)
│   ├── sample-projects.json            # 4 Projects with embedded hiring agreements & worker assignments
│   ├── sample-attendance.json          # 6 Daily attendance logs (present, checked-out, missed)
│   ├── sample-progress-updates.json    # 5 Daily milestone progress updates
│   ├── sample-extensions.json          # 2 Project extension requests (pending & approved)
│   ├── sample-payments.json            # 5 Wage ledger transactions (paid, partial, pending)
│   ├── sample-reviews.json             # 2 Mutual 5-star ratings and reviews
│   ├── sample-messages.json            # 2 Direct messaging conversations with 5 messages
│   ├── sample-notifications.json       # 5 Real-time notifications (unread and read)
│   ├── sample-complaints.json          # 1 Attendance grievance filed by employer
│   └── sample-disputes.json            # 1 Escalated dispute under admin investigation
├── scripts/
│   ├── seed-test-data.js               # Safe, idempotent, non-destructive seeder
│   └── cleanup-test-data.js            # Reverse-dependency cascade test data remover
└── reports/
    └── .gitkeep                        # Output directory for JSON audit trail reports
```

---

## 3. Database Schema & Entity Mappings

The test fixtures directly map to tables defined in `supabase/schema.sql` and the live Supabase PostgreSQL instance:

| Table | Primary Key | Key Foreign Keys & Enums | Description |
| :--- | :--- | :--- | :--- |
| `users` | `id` (UUID) | `role` (`worker`, `employer`, `admin`), `preferred_language` (`en`, `mr`, `hi`) | Base user authentication credentials |
| `worker_profiles` | `id` (UUID) | `user_id` -> `users.id` | Skills, experience, daily wage, location, completion % |
| `employer_profiles` | `id` (UUID) | `user_id` -> `users.id` | Business type, company name, contact info |
| `jobs` | `id` (UUID) | `employer_id` -> `users.id`, `status` (`open`, `in_progress`, `completed`, `cancelled`) | Job postings across 15+ trade categories |
| `job_applications` | `id` (UUID) | `job_id` -> `jobs.id`, `worker_id` -> `users.id`, `status` (`pending`, `selected`, `rejected`) | Worker applications with cover notes |
| `job_invitations` | `id` (UUID) | `job_id` -> `jobs.id`, `worker_id` -> `users.id`, `employer_id` -> `users.id` | Direct invitations (`pending`, `accepted`, `declined`) |
| `hiring_agreements` | `id` (UUID) | `job_id`, `employer_id`, `worker_id`, `status` (`pending`, `confirmed`, `completed`) | Mutual binding contracts between worker & employer |
| `projects` | `id` (UUID) | `hiring_agreement_id`, `employer_id`, `status` (`active`, `completed`) | Active and completed execution units |
| `project_workers` | `id` (UUID) | `project_id` -> `projects.id`, `worker_id` -> `users.id` | Worker roster assigned to projects |
| `attendances` | `id` (UUID) | `project_id`, `worker_id`, `status` (`present`, `absent`, `half_day`) | Daily check-in/out timestamps |
| `progress_updates` | `id` (UUID) | `project_id`, `worker_id` | Milestone completion percentages and summaries |
| `project_extensions`| `id` (UUID) | `project_id`, `requested_by`, `status` (`pending`, `approved`, `rejected`) | Requests for additional project timeline |
| `payments` | `id` (UUID) | `project_id`, `payer_id`, `payee_id`, `status` (`pending`, `completed`, `failed`) | Wage ledger records with mock references |
| `reviews` | `id` (UUID) | `project_id`, `reviewer_id`, `reviewee_id` | Mutual ratings (1-5) and testimonials |
| `conversations` | `id` (UUID) | `participant_a`, `participant_b`, `related_project_id` | Chat thread between two linked users |
| `messages` | `id` (UUID) | `conversation_id`, `sender_id`, `is_read` (boolean) | Real-time chat messages |
| `notifications` | `id` (UUID) | `user_id` -> `users.id`, `type`, `is_read` | In-app alerts |
| `complaints` | `id` (UUID) | `filed_by`, `against_user`, `project_id`, `status` (`open`, `resolved`) | Formal complaints filed by participants |
| `disputes` | `id` (UUID) | `complaint_id`, `claimant_id`, `respondent_id`, `assigned_admin_id` | Escalated disputes under administrative review |

---

## 4. Test Accounts & Safe Credentials

All seeded test accounts use deterministic UUIDs and reserved example email addresses (`@example.com`).

### Credentials Policy
- **No plaintext passwords or secrets** are stored in JSON fixtures.
- Passwords are dynamically generated at runtime using `bcrypt.hash(..., 10)`.
- Default test password: **`TestPass123!`** (Can be customized via `TEST_USER_PASSWORD` env variable).

### Key Test Personas

#### Worker Accounts
| Email | Name | Trade / Category | City | Languages |
| :--- | :--- | :--- | :--- | :--- |
| `worker01@example.com` | Ramesh Patil | Construction & Masonry | Pune | Marathi, Hindi, English |
| `worker02@example.com` | Santosh Shinde | Painting & Waterproofing | Solapur | Marathi, Hindi |
| `worker03@example.com` | Vikas Jadhav | Electrical & Wiring | Pune | Marathi, English |
| `worker04@example.com` | Ganesh Kadam | Plumbing & Piping | Sangli | Marathi, Hindi |
| `worker05@example.com` | Sunil Chavan | Carpentry & Furniture | Kolhapur | Marathi, Hindi |
| `worker06@example.com` | Rahul Pawar | Farm & Agriculture Work | Solapur | Marathi, Hindi |
| `worker07@example.com` | Amit Kamble | Loading & Unloading | Pune | Marathi, Hindi |
| `worker08@example.com` | Aniket More | Housekeeping & Cleaning | Pune | Marathi, English, Hindi |

#### Employer Accounts
| Email | Contact Person | Business / Company | City |
| :--- | :--- | :--- | :--- |
| `employer01@example.com` | Rajesh Deshmukh | Deshmukh Infrastructure & Builders | Pune |
| `employer02@example.com` | Sunita Kulkarni | Kulkarni Residential Projects | Solapur |
| `employer03@example.com` | Mohan Joshi | Joshi Renovations & Interiors | Sangli |
| `employer04@example.com` | Pravin Salunkhe | Salunkhe Agro Logistics | Kolhapur |

#### Administrator Account
| Email | Name | Role | Permissions |
| :--- | :--- | :--- | :--- |
| `admin01@example.com` | Anand Kulkarni | `admin` (`super_admin`) | Full platform oversight, complaints, disputes, verification |

---

## 5. Safe Seeding Guide (`seed-test-data.js`)

The seed script is strictly non-destructive, idempotent, and protected by multi-level safety guards.

### Safety Mechanisms
1. **Explicit Opt-in**: Must supply `--allow-seed` or `ALLOW_TEST_DATA_SEED=true`.
2. **Production Safeguard**: Will abort immediately if executed against production (`NODE_ENV=production`), unless explicitly confirmed with `--confirm-production` or `CONFIRM_PRODUCTION_SEED=true`.
3. **Idempotent Batch Querying**: Pre-checks existing records in batches. Will never insert duplicate rows or fail with unique constraint violations.
4. **Preservation Guarantee**: Never drops, truncates, or modifies pre-existing user or employer data.
5. **Deterministic UUID Namespaces**:
   - Users: `a1000000-...` (Workers), `a2000000-...` (Employers), `a3000000-...` (Admin)
   - Jobs: `b0000000-...`
   - Applications: `c0000000-...`
   - Invitations: `d0000000-...`
   - Projects: `f0000000-...`
6. **Audit Reporting**: Automatically writes a JSON audit report of created and skipped records to `testing/reports/seed-report-<timestamp>.json`.

### How to Run

```bash
# 1. Preview changes safely without writing to the database (Dry Run)
node testing/scripts/seed-test-data.js --dry-run
# OR via npm script:
npm run test:seed:dry-run

# 2. Seed test fixtures locally into development / staging database
node testing/scripts/seed-test-data.js --allow-seed
# OR via npm script:
npm run test:seed

# 3. Seed with custom test password
TEST_USER_PASSWORD="CustomPassword123!" node testing/scripts/seed-test-data.js --allow-seed

# 4. In non-test environments (requires dual confirmation)
CONFIRM_PRODUCTION_SEED=true node testing/scripts/seed-test-data.js --allow-seed --confirm-production
```

---

## 6. Safe Cleanup Guide (`cleanup-test-data.js`)

The cleanup script cleanly removes test data without affecting any organic, real-world users or projects.

### Safety Mechanisms
1. **Targeted Deletion**: Only deletes records matching the exact fixture UUIDs.
2. **Reverse Foreign-Key Dependency Order**:
   - `disputes` -> `complaints` -> `notifications` -> `messages` -> `conversations` -> `reviews` -> `payments` -> `project_extensions` -> `progress_updates` -> `attendances` -> `project_workers` -> `projects` -> `hiring_agreements` -> `job_applications` -> `job_invitations` -> `jobs` -> `worker_profiles` -> `employer_profiles` -> `users`.
3. **Explicit Confirmation**: Requires `--confirm` or `CONFIRM_CLEANUP=true`.
4. **Zero Collateral Damage**: Never issues broad `DELETE FROM` queries without specific ID filters.

### How to Run

```bash
# 1. Preview records targeted for deletion (Dry Run)
node testing/scripts/cleanup-test-data.js --dry-run
# OR via npm script:
npm run test:cleanup:dry-run

# 2. Execute targeted test data cleanup
node testing/scripts/cleanup-test-data.js --confirm
# OR via npm script:
npm run test:cleanup
```

---

## 7. Testing Scenarios Checklist

Use this checklist to systematically verify all frontend and backend application workflows:

### Scenario 1: Registration & Login
- **Role**: Worker (`worker01@example.com`) / Employer (`employer01@example.com`)
- **Action**:
  1. Navigate to `/login`.
  2. Enter email `worker01@example.com` and password `TestPass123!`.
  3. Submit login form.
- **Expected Result**: User authenticated successfully. Redirected to `/worker/dashboard` with worker navigation options. JWT stored in `sessionStorage`/auth context.

### Scenario 2: Worker & Employer Profiles
- **Role**: Worker (`worker01@example.com`) / Employer (`employer01@example.com`)
- **Sample Record**: Worker Profile `a1000000-0000-4000-8000-000000000001`
- **Action**: Navigate to `/worker/profile` or `/employer/profile`. Inspect skills, daily wage (₹750), location (Pune, Hadapsar), and profile completion rate (95%).
- **Expected Result**: Profile details render accurately without blank fields; edit profile form pre-fills properly.

### Scenario 3: Job Search & Filtering
- **Role**: Worker (`worker02@example.com`)
- **Sample Record**: Jobs `b0000000-0000-4000-8000-000000000001` through `016`
- **Action**:
  1. Navigate to `/worker/jobs`.
  2. Filter by Category: "Painting", Location: "Solapur", Wage Range: "₹800+".
- **Expected Result**: Returns "Exterior Building Painting & Waterproofing" (`b0000000-0000-4000-8000-000000000003`). Irrelevant jobs filtered out.

### Scenario 4: Job Posting & Editing
- **Role**: Employer (`employer01@example.com`)
- **Sample Record**: Job `b0000000-0000-4000-8000-000000000001`
- **Action**: Navigate to `/employer/post-job`. Enter title, trade category, location, daily wage, duration, and worker count. Submit form.
- **Expected Result**: Job successfully posted. Appears under `/employer/jobs` with `open` status.

### Scenario 5: Job Applications & Invitations
- **Role**: Worker (`worker01@example.com`) & Employer (`employer01@example.com`)
- **Sample Record**: Application `c0000000-0000-4000-8000-000000000001`, Invitation `d0000000-0000-4000-8000-000000000001`
- **Action**:
  1. Worker views `/worker/applications` to check status of pending application for Commercial Renovation.
  2. Employer views applicant list under `/employer/applications` and reviews cover note.
- **Expected Result**: Pending application displays correctly; employer can view worker profile and accept or reject.

### Scenario 6: Hiring Confirmation & Agreement
- **Role**: Worker (`worker01@example.com`) & Employer (`employer01@example.com`)
- **Sample Record**: Hiring Agreement `ea000000-0000-4000-8000-000000000001`
- **Action**: Navigate to agreement details page. Review agreed wage (₹800/day), terms, and mutual confirmation status.
- **Expected Result**: Agreement shows `confirmed` status with mutual timestamps.

### Scenario 7: Project Creation & Worker Assignment
- **Role**: Employer (`employer01@example.com`)
- **Sample Record**: Project `f1000000-0000-4000-8000-000000000001`
- **Action**: Open active project dashboard. Inspect assigned worker roster (`Ramesh Patil`).
- **Expected Result**: Project status is `active`; assigned worker profile is linked with agreed wage rate.

### Scenario 8: Attendance & Daily Progress
- **Role**: Worker (`worker01@example.com`) / Employer (`employer01@example.com`)
- **Sample Record**: Attendance `ec000000-0000-4000-8000-000000000001`, Progress Update `ed000000-0000-4000-8000-000000000001`
- **Action**:
  1. View project attendance log. Verify check-in (08:30) and check-out (17:30).
  2. View milestone progress updates (20% Foundation completed).
- **Expected Result**: Times render in local IST format. Attendance marked `present`; progress progress bar reflects percentage.

### Scenario 9: Mutually Approved Extensions
- **Role**: Employer (`employer01@example.com`) / Worker (`worker01@example.com`)
- **Sample Record**: Extension `ee000000-0000-4000-8000-000000000001`
- **Action**: Check extension request tab. Verify +3 days requested due to rain and approved by employer.
- **Expected Result**: New expected end date updated; status displays `approved`.

### Scenario 10: Payment Ledger & Wage Status
- **Role**: Employer (`employer01@example.com`) / Worker (`worker01@example.com`)
- **Sample Record**: Payments `ef000000-0000-4000-8000-000000000001` & `002`
- **Action**: Navigate to project payments page. Review ₹2,400 completed wage ledger payment and ₹4,000 pending milestone.
- **Expected Result**: Completed payment shows green badge with mock transaction reference (`TXN-TEST-1001`); pending payment shows pending badge.

### Scenario 11: Reviews & Ratings
- **Role**: Worker (`worker01@example.com`) & Employer (`employer01@example.com`)
- **Sample Record**: Review `ba000000-0000-4000-8000-000000000001`
- **Action**: Open completed project `f1000000-0000-4000-8000-000000000004` (Apartment Painting). Check review section.
- **Expected Result**: 5-star rating displayed with comment: *"Exceptional finish on waterproofing and exterior painting."*

### Scenario 12: Chat & Notifications
- **Role**: Employer (`employer01@example.com`) & Worker (`worker01@example.com`)
- **Sample Record**: Conversation `ca000000-0000-4000-8000-000000000001`, Notification `bc000000-0000-4000-8000-000000000001`
- **Action**:
  1. Navigate to `/chat`. Select conversation with Ramesh Patil.
  2. Click notification bell on top header.
- **Expected Result**: Past 3 chat messages displayed in order. Notification badge displays unread count; clicking marks notification as read.

### Scenario 13: Complaints & Disputes
- **Role**: Employer (`employer02@example.com`) / Worker (`worker06@example.com`)
- **Sample Record**: Complaint `bd000000-0000-4000-8000-000000000001`, Dispute `be000000-0000-4000-8000-000000000001`
- **Action**: Navigate to complaints tab under project `f1000000-0000-4000-8000-000000000003`.
- **Expected Result**: Shows complaint for unannounced absence; status shows escalated to dispute under administrative review.

### Scenario 14: Admin Dashboard & Oversight
- **Role**: Admin (`admin01@example.com`, password `TestPass123!`)
- **Sample Record**: Dispute `be000000-0000-4000-8000-000000000001`
- **Action**:
  1. Log in with admin credentials.
  2. Navigate to `/admin/dashboard` or `/admin/disputes`.
- **Expected Result**: Admin sees platform-wide statistics, active complaints, and can review/resolve the escalated dispute.

### Scenario 15: AI Features & Multilingual Support
- **Role**: Any Worker or Employer
- **Action**:
  1. Switch language toggle in navbar between **English**, **मराठी (Marathi)**, and **हिंदी (Hindi)**.
  2. Test AI Voice Job Creation or AI match suggestions.
- **Expected Result**: UI text dynamically updates in selected language; UI elements and font hierarchy remain clean and readable.

### Scenario 16: Authentication, Authorization & Session Expiry
- **Role**: Worker (`worker01@example.com`)
- **Action**:
  1. Attempt to access `/employer/dashboard` as a worker.
  2. Clear session storage token and refresh protected route `/worker/jobs`.
- **Expected Result**: Accessing employer route redirects or shows 403 Forbidden. Cleared token redirects smoothly to `/login` without application crash.

### Scenario 17: Mobile Layout & Page Refresh
- **Role**: Mobile viewport (375px - 414px)
- **Action**:
  1. Open developer tools and toggle iPhone/Android responsive viewport.
  2. Navigate between Job Search, Chat, and Attendance. Refresh page while on `/worker/jobs`.
- **Expected Result**: Bottom navigation / hamburger menu functions smoothly. No horizontal scrollbars or truncated cards. State persists cleanly after page refresh.

---

## 8. Verification & Validation Commands

Run these automated verification commands from the project root:

```bash
# Validate JSON fixture syntax
node -e "const fs = require('fs'); fs.readdirSync('testing/data').forEach(f => { if(f.endsWith('.json')) JSON.parse(fs.readFileSync('testing/data/' + f)) }); console.log('✓ All JSON fixtures are 100% valid');"

# Validate JavaScript syntax
node -c testing/scripts/seed-test-data.js
node -c testing/scripts/cleanup-test-data.js

# Test seeder dry run (zero writes)
npm run test:seed:dry-run

# Test cleanup dry run (zero writes)
npm run test:cleanup:dry-run
```

---

## 9. Safety & Privacy Compliance Notes

- **Zero Real PII**: All phone numbers use dummy formats (`+91 98220 00001` - `00013`). All email addresses use the IANA reserved domain `@example.com`.
- **Zero Third-Party Cost**: Scripts create mock payment ledger rows and mock notifications without invoking real payment gateways (Razorpay/Stripe) or SMS/Email dispatchers (Twilio/SendGrid).
- **Zero Data Loss**: Seed operations never delete or overwrite existing records. Cleanup operations strictly filter by deterministic test UUIDs.
