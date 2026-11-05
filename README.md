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
| `FRONTEND_URL` | Optional | Frontend base URL used in notification emails | `http://localhost:3000` |
| `RESEND_API_KEY` | Optional | Resend API key for email notifications; omit to log email previews locally | `re_replace_with_your_resend_api_key` |
| `MAIL_FROM` | Optional | Sender address from a domain verified with Resend | `Smart Student Service Portal <notifications@example.com>` |
| `COLLEGE_NAME` | Optional | Institution name printed on bonafide certificates | `Your College Name` |
| `SIGNATORY_NAME` | Optional | Name printed in the certificate signatory block | `College Principal` |
| `SIGNATORY_TITLE` | Optional | Title printed in the certificate signatory block | `Principal` |

---

Request submissions and status changes create in-app notifications and send email through Resend when configured. `backend/utils/mailer.js` reads `RESEND_API_KEY` and `MAIL_FROM` from the environment; keep the real values in the root `.env`, not in source code. The `onboarding@resend.dev` test sender is restricted to your own Resend account email. To deliver to students, verify a domain you control in Resend, then set `MAIL_FROM` in `.env` to an address on that domain, for example `Smart Student Service Portal <notifications@your-domain.edu>`. Use the same `MAIL_FROM` setting for a local test:

```sh
npm run test:email -- student@example.edu
```

The test script sends one real email to the supplied address and requires both `RESEND_API_KEY` and `MAIL_FROM`. Without `RESEND_API_KEY`, normal application email previews are logged locally; demo accounts never send real email.

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
   Initializes the demo student (`student.demo@example.com`) with sample request records and the demo admin (`admin.demo@example.com`).

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
| `POST` | `/api/leave` | Yes (Bearer) | `student` | Submit a new academic leave request |
| `GET` | `/api/leave/my` | Yes (Bearer) | `student` | Retrieve user's leave requests |
| `GET` | `/api/leave/:id` | Yes (Bearer) | `student` | Get details of a specific leave request |
| `POST` | `/api/od` | Yes (Bearer) | `student` | Submit an on-duty (OD) request |
| `GET` | `/api/od/my` | Yes (Bearer) | `student` | Retrieve user's OD requests |
| `GET` | `/api/od/:id` | Yes (Bearer) | `student` | Get details of a specific OD request |
| `POST` | `/api/bonafide` | Yes (Bearer) | `student` | Submit a bonafide certificate request |
| `GET` | `/api/bonafide/my` | Yes (Bearer) | `student` | Retrieve user's bonafide requests |
| `GET` | `/api/bonafide/:id` | Yes (Bearer) | `student` | Get details of a specific bonafide request |
| `POST` | `/api/complaints` | Yes (Bearer) | `student` | Submit a new student complaint |
| `GET` | `/api/complaints/my` | Yes (Bearer) | `student` | Retrieve user's complaints |
| `GET` | `/api/complaints/:id` | Yes (Bearer) | `student` | Get details of a specific complaint |
| `GET` | `/api/requests/my` | Yes (Bearer) | `student` | Retrieve aggregated list of all user requests |

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
- **`admin`**: Can access the administrative suite, view all requests, update statuses, record official remarks, and view student records.
- **`super_admin`**: Full portal ownership. Can manage all administrative workflows, toggle account statuses (enable/disable), and manage admin access.
- **`demo_admin`**: Isolated administrator role restricted to reviewing and managing sample data in demo mode.

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
