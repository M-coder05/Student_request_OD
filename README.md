# Smart Student Service Portal

A complete full-stack Student Service Portal with frontend + backend + MongoDB + JWT authentication.

## Features

- Student registration and login
- JWT-based authentication
- Dashboard with real MongoDB stats
- Leave request system
- OD request system
- Bonafide certificate request system
- Complaint system
- Request tracking
- Admin login and dashboard
- Admin request approval/rejection workflow

## Project Structure

```bash
Smart-Student-Service-Portal/
├── frontend/
│   ├── index.html
│   ├── register.html
│   ├── login.html
│   ├── dashboard.html
│   ├── leave.html
│   ├── od.html
│   ├── bonafide.html
│   ├── complaint.html
│   ├── status.html
│   ├── profile.html
│   ├── admin-login.html
│   └── admin.html
├── css/
│   └── style.css
├── js/
│   ├── api.js
│   ├── auth.js
│   ├── dashboard.js
│   ├── leave.js
│   ├── od.js
│   ├── bonafide.js
│   ├── complaint.js
│   ├── status.js
│   ├── profile.js
│   └── admin.js
├── backend/
│   ├── server.js
│   ├── seedAdmin.js
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── studentController.js
│   │   ├── leaveController.js
│   │   ├── odController.js
│   │   ├── bonafideController.js
│   │   ├── complaintController.js
│   │   └── adminController.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   ├── adminMiddleware.js
│   │   └── errorMiddleware.js
│   ├── models/
│   │   ├── User.js
│   │   ├── LeaveRequest.js
│   │   ├── ODRequest.js
│   │   ├── BonafideRequest.js
│   │   └── Complaint.js
│   └── routes/
│       ├── authRoutes.js
│       ├── studentRoutes.js
│       ├── leaveRoutes.js
│       ├── odRoutes.js
│       ├── bonafideRoutes.js
│       ├── complaintRoutes.js
│       └── adminRoutes.js
├── .env
├── .env.example
├── package.json
└── README.md
```

## Installation

```bash
npm install
```

## Environment

Create `.env` file:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/smartStudentPortal
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d
DEMO_MODE=true
DEMO_STUDENT_PASSWORD=choose_a_demo_student_password
DEMO_ADMIN_PASSWORD=choose_a_demo_admin_password
SUPER_ADMIN_NAME=Portal Owner
SUPER_ADMIN_REGISTER_NUMBER=SUPER-ADMIN-01
SUPER_ADMIN_EMAIL=owner@example.com
SUPER_ADMIN_PASSWORD=choose_a_unique_password_at_least_12_characters
SUPER_ADMIN_PHONE=0000000000
```

Keep `.env` out of version control. Generate a long random `JWT_SECRET` and a unique Super Admin password; never put either value in frontend files or commit them to the repository.

## Run MongoDB

Start MongoDB locally or use MongoDB Atlas.

## Create the Permanent Super Admin

Set `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` in `.env` before running the seed. The password must be at least 12 characters and is hashed with bcrypt before storage in MongoDB.

```bash
npm run seed:admin
```

This creates or updates the database-backed `super_admin` account. The account and role persist across restarts and deployments that retain the same database. Re-running this command updates its password from the current environment value. Existing data is not deleted. The Super Admin cannot be disabled through the admin API. The seeder also disables the exact legacy `admin@portal.com` / `ADMIN001` bootstrap account if present; its record and related data are retained.

## Start backend

```bash
npm start
```

## Development mode

```bash
npm run dev
```

## Stop the server

In the VS Code terminal where `npm start` or `npm run dev` is running, press `Ctrl+C`. If Windows asks whether to terminate the batch job, enter `Y` and press Enter. This stops the portal server at `http://localhost:5000`.

MongoDB is a separate process or service and will keep running. Stop it separately using the terminal or service manager where you started MongoDB.

## Demo accounts

Demo access is opt-in through `DEMO_MODE=true`. Configure distinct demo passwords, then seed the reserved demo accounts and sample requests:

```bash
npm run seed:demo
npm start
```

The login pages show demo emails and one-click login only after the server confirms that each account exists. Passwords are never returned by the API or shown in frontend code. The demo administrator uses the separate `demo_admin` role and can only review sample data belonging to the demo student. Re-running `npm run seed:demo` resets that sample student's requests without changing other users' records. The backend enforces this isolation even when callers bypass the UI. Set `DEMO_MODE=false` (or omit it) to disable demo sign-in, including in production.

Demo account identifiers (passwords remain private in `.env`):

- Student email: `student.demo@example.com` (`DEMO_STUDENT_PASSWORD`)
- Admin email: `admin.demo@example.com` (`DEMO_ADMIN_PASSWORD`)

To walk through the workflow, use Student Demo to submit a request, then Admin Demo to update it and inspect its status history. Demo changes stay within sample records and may be reset by rerunning the seed.

The login page links to a separate administrator screen with Permanent Super Admin Login and Admin Demo Login. Admin APIs reload account state from MongoDB per request. Status changes and account enable/disable actions are recorded in an audit log.

## Access app

Open the static frontend files in your browser or serve via a local static server.

## API Documentation

### Auth

- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me

### Student

- GET /api/student/profile
- PUT /api/student/profile
- PUT /api/student/change-password
- GET /api/student/dashboard

### Requests

- POST /api/leave
- GET /api/leave/my
- POST /api/od
- GET /api/od/my
- POST /api/bonafide
- GET /api/bonafide/my
- POST /api/complaints
- GET /api/complaints/my
- GET /api/requests/my

### Admin

- GET /api/admin/dashboard
- GET /api/admin/students
- GET /api/admin/users
- PATCH /api/admin/users/:id/access
- GET /api/admin/requests
- GET /api/admin/activity
- PATCH /api/admin/requests/:id/status
```
