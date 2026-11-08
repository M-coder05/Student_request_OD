# Smart Student Service Portal

Smart Student Service Portal is a modern full-stack web application designed to unify and streamline campus service workflows. Students can easily register, submit and track Leave, On-Duty (OD), Bonafide Certificate, and Complaint requests, as well as manage their student profile and credentials. Administrators have access to an administrative suite featuring real-time request metrics, status workflows with audit remarks, student account controls (enable/disable), and complete audit logging—all governed by role-based access control and demo isolation.

**Live Application:** [https://smart-student-service-portal.onrender.com](https://smart-student-service-portal.onrender.com)

---

## Features

- **Student Registration & Authentication:** Secure registration and credential validation using bcrypt hashing, with JSON Web Tokens (JWT) stored client-side for authenticated sessions.
- **Unified Student Dashboard:** Real-time metrics overview displaying status bucket counters for Total, Pending, In Progress, Approved, Resolved, and Rejected requests.
- **Comprehensive Request Modules:**
  - **Leave Application:** Multi-day academic leave submissions with reason tracking.
  - **On-Duty (OD) Application:** Formal OD registration for symposiums, workshops, and sports events.
  - **Bonafide Certificate:** Document requests for loans, passports, scholarships, and academic verification.
  - **Complaint Registration:** Student grievance reporting across academic, infrastructure, hostel, and canteen categories.
- **Real-Time Request Tracking:** Filterable status desk allowing students to filter their submitted requests by category and resolution state.
- **Profile & Password Management:** Personal contact detail updates and password changes with demo account protection.
- **Comprehensive Admin Suite:**
  - **Dashboard Metrics:** Aggregated status statistics across all request categories and student accounts.
  - **Student Directory:** Searchable and sortable registry of all enrolled students.
  - **Account Management:** Role-aware account toggling (enable/disable) with confirmation safeguards.
  - **Request Review Workflow:** Filterable, paginated request management allowing administrators to update statuses and append official remarks.
  - **Request Details Modal:** Interactive modal displaying detailed application information and a chronological status history timeline.
  - **Audit Activity Log:** Chronological administrative activity tracking recording every account update and status change.
- **Guided Demo Mode:** One-click demo access for recruiters and reviewers with isolated student and administrator sample sessions.
- **Security & Performance:** Express rate limiting, Helmet Content Security Policy (CSP), CORS protection, and SPA client routing fallbacks.

---

## Tech Stack

- **Frontend:** React (v18), Vite, React Router (v6), Vanilla CSS (custom design system)
- **Backend:** Node.js, Express (v4), Mongoose (v8)
- **Database:** MongoDB / MongoDB Atlas
- **Security & Utilities:** JSON Web Tokens (`jsonwebtoken`), `bcryptjs`, `helmet`, `express-rate-limit`, `cors`, `morgan`

---

## Project Structure

```
Smart-Student-Service-Portal/
├── backend/
│   ├── config/
│   │   ├── db.js             # MongoDB connection setup
│   │   └── demo.js           # Demo mode configuration & helpers
│   ├── controllers/
│   │   ├── adminController.js     # Admin metrics, users, requests & audit logs
│   │   ├── authController.js      # Register, login, and demo auth
│   │   ├── bonafideController.js  # Bonafide certificate requests
│   │   ├── complaintController.js # Student complaint reporting
│   │   ├── leaveController.js     # Academic leave requests
│   │   ├── odController.js        # On-duty request submissions
│   │   └── studentController.js   # Student profile & dashboard aggregations
│   ├── middleware/
│   │   ├── adminMiddleware.js     # Admin role verification
│   │   ├── authMiddleware.js      # JWT authentication guard
│   │   └── errorMiddleware.js     # Global error handling
│   ├── models/
│   │   ├── AuditLog.js            # Administrative actions audit trail
│   │   ├── AllowedStudent.js      # Optional registration allowlist
│   │   ├── BonafideRequest.js     # Bonafide certificate model
│   │   ├── Complaint.js           # Student complaint model
│   │   ├── LeaveRequest.js        # Leave request model
│   │   ├── ODRequest.js           # On-duty request model
│   │   └── User.js                # User accounts & roles model
│   ├── routes/
│   │   ├── adminRoutes.js         # /api/admin endpoints
│   │   ├── authRoutes.js          # /api/auth endpoints
│   │   ├── bonafideRoutes.js      # /api/bonafide endpoints
│   │   ├── complaintRoutes.js     # /api/complaints endpoints
│   │   ├── leaveRoutes.js         # /api/leave endpoints
│   │   ├── odRoutes.js            # /api/od endpoints
│   │   ├── requestsRoutes.js      # /api/requests endpoints
│   │   └── studentRoutes.js       # /api/student endpoints
│   ├── utils/
│   │   ├── parseDate.js           # Date validation and parsing helper
│   │   └── requestStats.js        # Status bucket aggregation helper
│   ├── seedAdmin.js               # Super admin seeding script
│   ├── seedDemo.js                # Demo student & admin seeding script
│   ├── scripts/seedAllowedStudents.js # Import allowed register numbers from CSV
│   └── server.js                  # Main Express application & Vite SPA server
├── client/
│   ├── index.html                 # Single page application HTML shell
│   ├── package.json               # Client dependencies and build scripts
│   ├── vite.config.js             # Vite configuration with API proxy
│   └── src/
│       ├── api/
│       │   └── client.js          # Fetch wrapper with Bearer token handling
│       ├── components/
│       │   ├── AdminRoute.jsx     # Route guard for admin roles
│       │   ├── DemoBanner.jsx     # Sticky demo notification banner
│       │   ├── DemoLogin.jsx      # Guided demo login panel
│       │   ├── Modal.jsx          # Reusable modal container
│       │   ├── Navbar.jsx         # Public navigation bar with mobile menu
│       │   ├── Pagination.jsx     # Reusable pagination controls
│       │   ├── ProtectedRoute.jsx # Route guard for student authentication
│       │   ├── StatusBadge.jsx    # Styled status badge
│       │   └── StudentHeader.jsx  # Student internal navigation bar
│       ├── context/
│       │   ├── AuthContext.jsx    # Auth state, login, and user persistence
│       │   └── ToastContext.jsx   # Global toast notification provider
│       ├── pages/
│       │   ├── Admin.jsx          # Admin management suite
│       │   ├── AdminLogin.jsx     # Administrator credentials sign-in
│       │   ├── Bonafide.jsx       # Bonafide request form
│       │   ├── Complaint.jsx      # Grievance registration form
│       │   ├── Dashboard.jsx      # Student dashboard & metrics
│       │   ├── Home.jsx           # Landing page with interactive preview
│       │   ├── Leave.jsx          # Academic leave request form
│       │   ├── Login.jsx          # Student sign-in page
│       │   ├── NotFound.jsx       # 404 error page
│       │   ├── OD.jsx             # On-duty request form
│       │   ├── Profile.jsx        # Student profile & password settings
│       │   ├── Register.jsx       # Student registration page
│       │   └── Status.jsx         # Request tracking and filtering desk
│       ├── styles/
│       │   └── style.css          # Portal design system stylesheet
│       ├── App.jsx                # Application routes configuration
│       └── main.jsx               # React DOM entry point
├── .env.example                   # Environment variable template
├── .gitignore                     # Git ignore rules
├── package.json                   # Root package definition & deployment scripts
└── README.md                      # Project documentation
```

---

## Prerequisites

- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher
- **MongoDB**: Local MongoDB instance or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster

---

## Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/Smart-Student-Service-Portal.git
   cd Smart-Student-Service-Portal
   ```

2. **Install root and client dependencies:**
   ```bash
   npm install
   npm run client:install
   ```

3. **Configure Environment Variables:**
   Copy the example environment template:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and fill in your connection string and security keys.
   Set `FRONTEND_URL=http://localhost:3000` for local password-reset and notification links.

---

## Environment Variables

| Variable | Required / Optional | Description | Example Placeholder |
|---|---|---|---|
| `PORT` | Optional | Express server port (default: 5000) | `5000` |
| `NODE_ENV` | Optional | Application runtime environment | `development` or `production` |
| `MONGO_URI` | **Required** | MongoDB database connection URI | `mongodb+srv://<user>:<password>@cluster.mongodb.net/<dbname>` |
| `JWT_SECRET` | **Required** | Secret key used to sign and verify JWT tokens | `your_super_secret_jwt_key` |
| `JWT_EXPIRES_IN` | Optional | Token expiration lifespan (default: 7d) | `7d` |
| `DEMO_MODE` | Optional | Enables or disables guided demo login (`true`/`false`) | `true` |
| `DEMO_STUDENT_PASSWORD` | Optional | Password for seeded demo student | `sample_student_password` |
| `DEMO_ADMIN_PASSWORD` | Optional | Password for seeded demo admin | `sample_admin_password` |
| `SUPER_ADMIN_NAME` | Optional | Display name for permanent super admin | `Portal Owner` |
| `SUPER_ADMIN_REGISTER_NUMBER`| Optional | Identification number for super admin | `SUPER-ADMIN-01` |
| `SUPER_ADMIN_EMAIL` | **Required** | Email for permanent super admin account | `owner@example.com` |
| `SUPER_ADMIN_PASSWORD` | **Required** | Password for permanent super admin (min 12 chars) | `your_secure_password_123` |
| `SUPER_ADMIN_PHONE` | Optional | Contact phone number for super admin | `0000000000` |
| `CORS_ORIGIN` | Optional | Allowed CORS origin (leave empty for same-origin) | `http://localhost:3000` |
| `FRONTEND_URL` | Optional | Frontend base URL used in notification emails and password-reset links (defaults to the Vite dev server at `http://localhost:3000`) | `http://localhost:3000` |
| `PASSWORD_RESET_EMAIL` | Optional | Enables single-use password reset links by email (`true`/`false`; default `false`) | `false` |
| `RESEND_API_KEY` | Optional | Resend API key for email notifications; omit to log email previews locally | `re_replace_with_your_resend_api_key` |
| `MAIL_FROM` | Optional | Sender address from a domain verified with Resend | `Smart Student Service Portal <notifications@example.com>` |
| `COLLEGE_NAME` | Optional | Institution name printed on bonafide certificates | `Your College Name` |
| `SIGNATORY_NAME` | Optional | Name printed in the certificate signatory block | `College Principal` |
| `SIGNATORY_TITLE` | Optional | Title printed in the certificate signatory block | `Principal` |
| `CLOUDINARY_CLOUD_NAME` | Optional outside production | Cloudinary cloud name for private request attachments | `your-cloud-name` |
| `CLOUDINARY_API_KEY` | Optional outside production | Cloudinary API key for server-side private uploads | `your-api-key` |
| `CLOUDINARY_API_SECRET` | Optional outside production | Cloudinary API secret; keep it only in the server environment | `your-api-secret` |
| `APPT_MIN_NOTICE_HOURS` | Optional | Minimum advance notice for an appointment (default: 2 hours) | `2` |
| `APPOINTMENTS_ENABLED` | Optional | Enables appointment booking for real student accounts; defaults to `false` (demo accounts remain enabled) | `false` |
| `APPOINTMENT_BOOKABLE_ROLES` | Optional | Comma-separated student-bookable staff roles (`faculty`, `hod`, `principal`; defaults to `faculty,hod`) | `faculty,hod` |
| `APPT_MAX_ACTIVE` | Optional | Maximum active appointments per student per week (default: 2) | `2` |
| `APPT_CANCEL_BEFORE_HOURS` | Optional | Minimum hours before start when a student may cancel (default: 2) | `2` |
| `APPT_PENDING_EXPIRE_HOURS` | Optional | Pending appointment request age before lazy expiry (default: 72 hours) | `72` |
| `APPT_PRINCIPAL_PURPOSE_MIN_LENGTH` | Optional | Minimum purpose length for Principal appointments (default: 30 characters) | `30` |

---

Request submissions and status changes create in-app notifications and send email through Resend when configured. `backend/utils/mailer.js` reads `RESEND_API_KEY` and `MAIL_FROM` from the environment; keep the real values in the root `.env`, not in source code. The `onboarding@resend.dev` test sender is restricted to your own Resend account email. To deliver to students, verify a domain you control in Resend, then set `MAIL_FROM` in `.env` to an address on that domain, for example `Smart Student Service Portal <notifications@your-domain.edu>`. Use the same `MAIL_FROM` setting for a local test:

Service requests accept up to 3 optional attachments, each at most 5 MB, in PDF, JPG or PNG format. The server verifies each file signature and stores only private storage identifiers in MongoDB, not public URLs. Configure all three `CLOUDINARY_*` variables to use authenticated Cloudinary assets. Outside production, the server uses `backend/uploads/` when Cloudinary is not configured; this directory is git-ignored. Uploads are disabled in production unless Cloudinary is fully configured. Demo accounts cannot upload files.

```sh
npm run test:email -- student@example.edu
```

The test script sends one real email to the supplied address and requires both `RESEND_API_KEY` and `MAIL_FROM`. Without `RESEND_API_KEY`, normal application email previews are logged locally; password-reset links are never included in console logs, and demo accounts never send real email.

## Database Seeding

Run the seed scripts to prepare your database accounts:

1. **Seed Permanent Super Administrator:**
   ```bash
   npm run seed:admin
   ```
   Creates or updates the super administrator account specified in your `.env` file.

2. **Seed Guided Demo Accounts:**
   ```bash
   npm run seed:demo
   ```
   Initializes the demo student (`student.demo@example.com`), demo admin (`admin.demo@example.com`), sandboxed Principal/HOD/faculty accounts, and weekday appointment availability.

Appointment staff are active `User` records with a `faculty`, `hod`, or `principal` role. A permanent **Super Admin** creates and manages real staff accounts from **Admin dashboard → Staff management**; regular admins and demo accounts cannot manage or view real staff through that page. Add each staff member's name, work email, unique employee ID, phone, role and (for faculty/HOD) department. Principal department is optional. Staff accounts do not use student year or semester fields.

When an account is created, the Super Admin receives a random temporary password once. Share it with the staff member securely; it is not stored in plain text and cannot be viewed again. Staff sign in on the regular login page using their work email and temporary password, then must set a new password before accessing the portal. Staff can then configure weekly appointment slots under **My availability** and process requests from **Appointment requests**. To issue a replacement credential, the Super Admin uses **Reset password** in Staff management; the new temporary password is shown once and must be changed at the next sign-in. Disabling a staff account prevents login and removes them from new appointment bookings while preserving their existing appointments for admin review.

Students and staff can use **Forgot password?** on the regular login page to submit a recovery request. Administrators review student requests under **Admin dashboard → Password reset requests**; staff requests are visible only to the Super Admin. Before issuing a temporary password, the administrator must verify the account holder's identity in person. The temporary password is shown once, shared securely, and must be changed at the next sign-in. If `PASSWORD_RESET_EMAIL=true`, active non-demo accounts can instead use the emailed, single-use link, which expires after 30 minutes. Configure `FRONTEND_URL`, `RESEND_API_KEY`, and `MAIL_FROM` to deliver reset emails; the email flow is disabled by default.

The MongoDB integration tests use a newly generated database name and drop only that database when each test finishes. They refuse to run with `NODE_ENV=production` and require `TEST_MONGO_URI`; use a local throwaway MongoDB server, never production:

```powershell
$env:NODE_ENV = "test"
$env:TEST_MONGO_URI = "mongodb://127.0.0.1:27017/student_service_portal_test"
npm run test:password-reset
npm run test:request-attachments
node backend/scripts/testAppointmentsMongo.js
node backend/scripts/testStaffManagementMongo.js
Remove-Item Env:\TEST_MONGO_URI
Remove-Item Env:\NODE_ENV
```

---

## Running the Application

### Development Mode

Run the Express backend:
```bash
npm run dev
```

In a separate terminal, launch the Vite React frontend:
```bash
cd client
npm run dev
```
The React development server runs at `http://localhost:3000` and proxies all `/api` requests to `http://localhost:5000`.

### Production Build & Run

1. Build the React frontend:
   ```bash
   npm run build
   ```
2. Start the production Express server:
   ```bash
   npm start
   ```
Visit `http://localhost:5000` in your browser. Express serves the compiled React application directly.

---

## Demo Mode

The application includes a guided demo mode for reviewers and recruiters:
- When `DEMO_MODE=true` is enabled in `.env` and demo accounts are seeded via `npm run seed:demo`, demo panels appear on the Home and Login pages.
- Users can click **Login as Student Demo** or **Login as Admin Demo** to instantly access sample sessions.
- In demo sessions, a prominent sticky top banner reminds users they are in **DEMO MODE**. Clicking **Exit demo** clears the session and returns to the home page.
- Modifying profiles or changing passwords is restricted for demo accounts to preserve consistency for subsequent reviewers.

---

## API Reference

All backend endpoints are prefixed with `/api`.

### Authentication (`/api/auth`)
| Method | Endpoint | Auth Required | Permitted Roles | Purpose |
|---|---|---|---|---|
| `POST` | `/api/auth/register` | No | Public | Register a new student account |
| `POST` | `/api/auth/login` | No | Public | Sign in using register number or email |
| `GET` | `/api/auth/demo/config` | No | Public | Check demo mode availability and roles |
| `POST` | `/api/auth/demo/login` | No | Public | Authenticate as student or admin demo |
| `GET` | `/api/auth/me` | Yes (Bearer) | Any authenticated user | Fetch currently authenticated user |

### Student Services (`/api/student`)
| Method | Endpoint | Auth Required | Permitted Roles | Purpose |
|---|---|---|---|---|
| `GET` | `/api/student/dashboard` | Yes (Bearer) | `student` | Get request status bucket counters |
| `GET` | `/api/student/profile` | Yes (Bearer) | `student` | Retrieve user profile information |
| `PUT` | `/api/student/profile` | Yes (Bearer) | `student` (non-demo) | Update contact details and department |
| `PUT` | `/api/student/change-password` | Yes (Bearer) | `student` (non-demo) | Update student password |

### Service Requests
| Method | Endpoint | Auth Required | Permitted Roles | Purpose |
|---|---|---|---|---|
| `POST` | `/api/leave` | Yes (Bearer) | `student` | Submit a leave request; multipart form data may include `attachments` |
| `GET` | `/api/leave/my` | Yes (Bearer) | `student` | Retrieve user's leave requests |
| `GET` | `/api/leave/:id` | Yes (Bearer) | `student` | Get details of a specific leave request |
| `DELETE` | `/api/leave/:id/attachments/:attachmentId` | Yes (Bearer) | Pending request owner | Remove an attachment while the request is Pending |
| `POST` | `/api/od` | Yes (Bearer) | `student` | Submit an OD request; multipart form data may include `attachments` |
| `GET` | `/api/od/my` | Yes (Bearer) | `student` | Retrieve user's OD requests |
| `GET` | `/api/od/:id` | Yes (Bearer) | `student` | Get details of a specific OD request |
| `DELETE` | `/api/od/:id/attachments/:attachmentId` | Yes (Bearer) | Pending request owner | Remove an attachment while the request is Pending |
| `POST` | `/api/bonafide` | Yes (Bearer) | `student` | Submit a bonafide request; multipart form data may include `attachments` |
| `GET` | `/api/bonafide/my` | Yes (Bearer) | `student` | Retrieve user's bonafide requests |
| `GET` | `/api/bonafide/:id` | Yes (Bearer) | `student` | Get details of a specific bonafide request |
| `DELETE` | `/api/bonafide/:id/attachments/:attachmentId` | Yes (Bearer) | Pending request owner | Remove an attachment while the request is Pending |
| `POST` | `/api/complaints` | Yes (Bearer) | `student` | Submit a complaint; multipart form data may include `attachments` |
| `GET` | `/api/complaints/my` | Yes (Bearer) | `student` | Retrieve user's complaints |
| `GET` | `/api/complaints/:id` | Yes (Bearer) | `student` | Get details of a specific complaint |
| `DELETE` | `/api/complaints/:id/attachments/:attachmentId` | Yes (Bearer) | Pending request owner | Remove an attachment while the request is Pending |
| `GET` | `/api/requests/my` | Yes (Bearer) | `student` | Retrieve aggregated list of all user requests |
| `GET` | `/api/attachments/:requestType/:requestId/:attachmentId` | Yes (Bearer) | Request owner, admin or super_admin | Download a private attachment; administrator downloads are audited |

### Appointments & Availability
| Method | Endpoint | Auth Required | Permitted Roles | Purpose |
|---|---|---|---|---|
| `GET` | `/api/config/features` | No | Public | Return public feature flags such as appointment availability |
| `GET` | `/api/appointments/staff?role=&department=` | Yes (Bearer) | `student` | List bookable faculty, HODs or Principals in the selected department |
| `GET` | `/api/appointments/staff/:id/slots?date=YYYY-MM-DD` | Yes (Bearer) | `student` | List free slots in Asia/Kolkata time |
| `POST` | `/api/appointments` | Yes (Bearer) | `student` | Request an appointment |
| `GET` | `/api/appointments/mine` | Yes (Bearer) | `student` | List the signed-in student's appointments |
| `PATCH` | `/api/appointments/:id/cancel` | Yes (Bearer) | Appointment owner | Cancel before the configured cutoff |
| `GET` | `/api/appointments/:id/calendar` | Yes (Bearer) | Approved appointment owner | Download an `.ics` calendar entry |
| `GET` | `/api/appointments/staff-queue` | Yes (Bearer) | `faculty`, `hod`, `principal`, administrators | List addressed requests; administrators may review all permitted records |
| `PATCH` | `/api/appointments/:id/decision` | Yes (Bearer) | Addressed staff, administrators | Approve, reject or reschedule a pending request |
| `PATCH` | `/api/appointments/:id/complete` | Yes (Bearer) | Addressed staff, administrators | Mark an approved appointment completed |
| `PATCH` | `/api/appointments/:id/no-show` | Yes (Bearer) | Addressed staff, administrators | Mark an approved appointment no-show |
| `GET` / `PUT` | `/api/availability/me` | Yes (Bearer) | `faculty`, `hod`, `principal` | Read or replace weekly availability |
| `GET` / `POST` | `/api/availability/me/blackouts` | Yes (Bearer) | `faculty`, `hod`, `principal` | List or add blackout dates |
| `DELETE` | `/api/availability/me/blackouts/:id` | Yes (Bearer) | `faculty`, `hod`, `principal` | Remove a blackout date |

### Administration (`/api/admin`)
| Method | Endpoint | Auth Required | Permitted Roles | Purpose |
|---|---|---|---|---|
| `GET` | `/api/admin/dashboard` | Yes (Bearer) | `admin`, `super_admin`, `demo_admin` | Retrieve system-wide stats and bucket totals |
| `GET` | `/api/admin/students` | Yes (Bearer) | `admin`, `super_admin`, `demo_admin` | Search, sort, and paginate student accounts |
| `GET` | `/api/admin/users` | Yes (Bearer) | `admin`, `super_admin`, `demo_admin` | Search and paginate all registered users |
| `PATCH`| `/api/admin/users/:id/access` | Yes (Bearer) | `admin`, `super_admin`, `demo_admin` | Enable or disable user account access |
| `GET` | `/api/admin/requests` | Yes (Bearer) | `admin`, `super_admin`, `demo_admin` | Search, filter, sort, and paginate all requests |
| `GET` | `/api/admin/requests/:id`| Yes (Bearer) | `admin`, `super_admin`, `demo_admin` | Get request details with status history |
| `PATCH`| `/api/admin/requests/:id/status`| Yes (Bearer) | `admin`, `super_admin`, `demo_admin` | Update request status and append remark |
| `GET` | `/api/admin/activity` | Yes (Bearer) | `admin`, `super_admin`, `demo_admin` | Fetch recent administrative audit logs |

### Health Check
| Method | Endpoint | Auth Required | Permitted Roles | Purpose |
|---|---|---|---|---|
| `GET` | `/api/health` | No | Public | Server uptime and health status verification |

---

## User Roles & Permissions

- **`student`**: Can submit and view their own leave, OD, bonafide, and complaint requests, track resolution states, and modify their own profile.
- **`faculty`**, **`hod`**, **`principal`**: Can publish availability and manage only appointments addressed to their account.
- **`admin`**: Can access the administrative suite, view all requests, update statuses, record official remarks, and view student records.
- **`super_admin`**: Full portal ownership. Can manage all administrative workflows, toggle account statuses (enable/disable), and manage admin access.
- **`demo_admin`**: Isolated administrator role restricted to reviewing and managing sample data in demo mode.

Students can book faculty or HOD appointments by default; Principal bookings can be enabled by adding `principal` to `APPOINTMENT_BOOKABLE_ROLES`. Seeded demo staff and demo student appointments are isolated from real accounts, and demo emails are logged rather than delivered.

Appointment booking is hidden and unavailable to real student accounts by default. After real staff accounts have been created and configured with availability, set `APPOINTMENTS_ENABLED=true` in the server environment and restart the server to enable it; use `APPOINTMENT_BOOKABLE_ROLES` to choose which of faculty, HOD, and Principal students may book (default: `faculty,hod`). Demo accounts remain enabled regardless of the booking flag. The public `GET /api/config/features` endpoint exposes the configured availability to the client; staff appointment-management routes remain available while student booking is disabled.

---

## Deployment on Render

To deploy this application on [Render](https://render.com) as a Web Service:

1. **Create Web Service:** Connect your GitHub repository.
2. **Environment:** Node
3. **Build Command:**
   ```bash
   npm install && npm --prefix client install && npm --prefix client run build
   ```
4. **Start Command:**
   ```bash
   npm start
   ```
5. **Environment Variables:**
   Add all required variables in the Render dashboard:
   - `NODE_ENV`: `production`
   - `MONGO_URI`: Your MongoDB Atlas connection string
   - `JWT_SECRET`: A secure random secret key
   - `SUPER_ADMIN_EMAIL`: Your super admin email
   - `SUPER_ADMIN_PASSWORD`: Your super admin password
   - `DEMO_MODE`: `true`
   - `DEMO_STUDENT_PASSWORD`: Demo student password
   - `DEMO_ADMIN_PASSWORD`: Demo admin password
6. **MongoDB Atlas Network Access:**
   Ensure your MongoDB Atlas cluster has **Network Access** configured to allow connections from anywhere (`0.0.0.0/0`), as Render dynamically assigns outbound IP addresses.
7. **Free Tier Notice:**
   Render's free tier services spin down after periods of inactivity. The initial request after idle may take 30–60 seconds to spin up the container.

---

## Security Notes

- **Credential Safeguards:** `.env` files are excluded from source control via `.gitignore`. Never commit API keys or database passwords.
- **Rate Limiting:** Protects `/api/auth` endpoints from brute-force authentication attacks using `express-rate-limit`.
- **HTTP Security Headers:** Configured with `helmet` to enforce strict Content Security Policies (CSP), frameguarding, and XSS filtering.
- **Generic Authentication Responses:** Login errors intentionally return generic messages to avoid revealing whether an email or register number exists.
- **Demo Account Protections:** Modification endpoints (profile updates and password changes) reject demo account modifications with a `403 Forbidden` response.

## Security Measures

- **JWT authentication with database lookup:** Every authenticated request verifies its JWT and reloads the account from MongoDB.
- **Role-based admin routes:** Administrative endpoints require an authorized administrator role.
- **Per-user query scoping:** Students can only access requests associated with their own account.
- **Password hashing:** Passwords are hashed with bcrypt before storage.
- **Helmet and CSP:** Helmet sets security headers and a Content Security Policy.
- **Rate limiting:** Authentication and password-change endpoints have request limits.
- **Input validation and sanitization:** Request inputs are validated, trimmed where appropriate, and bounded by text-length limits.
- **Registration allowlist:** Registration can be restricted to a seeded register-number allowlist by setting `ENFORCE_ALLOWLIST=true`. Import CSV entries with `node backend/scripts/seedAllowedStudents.js <csv-path>`.
- **Token invalidation on password change:** Existing JWTs are rejected after a password update; the change-password response provides a replacement token.

---

## Troubleshooting

- **"Demo accounts not seeded":**
  If demo login buttons state accounts are not ready, run `npm run seed:demo` in your terminal to initialize the demo user accounts and sample requests.
- **MongoDB Connection or Authentication Errors:**
  Confirm that your `MONGO_URI` is correct, user credentials have database read/write permissions, and your IP address is whitelisted in MongoDB Atlas Network Access.
- **404 on Page Refresh in Production:**
  Express contains an SPA catch-all handler (`app.get('*', ...)`) that serves `client/dist/index.html` for any client routes (e.g. `/dashboard`, `/status`, `/admin`). Ensure the frontend build was generated (`npm run client:build`) and `client/dist` exists.
- **Icons or Fonts Blocked by CSP:**
  Helmet is pre-configured to allow Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`), Font Awesome (`cdnjs.cloudflare.com`), and Boxicons (`unpkg.com`). If you introduce additional CDN resources, add their origins to the `style-src` and `font-src` directives in `backend/server.js`.

---

## License & Author

- **License:** [MIT](LICENSE)
- **Author:** Mohammed Musharaff S
