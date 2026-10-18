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
```

## Run MongoDB

Start MongoDB locally or use MongoDB Atlas.

## Create admin user

```bash
npm run seed:admin
```

Admin credentials created by the script can be customized in the file.

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

Demo access is intended for local evaluation only and is disabled automatically when `NODE_ENV=production`. Copy the demo variables from `.env.example` into your local `.env`, then seed the reserved demo accounts and sample requests:

```bash
npm run seed:demo
npm start
```

The login pages show the credentials only after the server confirms that each demo account exists. Their one-click buttons use the normal JWT authentication flow. The student demo can submit requests; the admin demo can review and update only requests belonging to the demo student. Re-running `npm run seed:demo` resets those demo requests without deleting or changing other users' records.

Demo sign-in details for local evaluation:

- Student: `student.demo@example.com` / `StudentDemo@123`
- Admin: `admin.demo@example.com` / `AdminDemo@123`

To walk through the workflow, sign in as the student and submit a leave, OD, bonafide, or complaint request. Then exit the demo, sign in as the admin, update that request's status, and sign back in as the student to confirm the recorded status. Never use these accounts in a production deployment.

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
- GET /api/admin/requests
- PATCH /api/admin/requests/:id/status
```
