import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import StaffRoute from './components/StaffRoute';
import PasswordChangeRoute from './components/PasswordChangeRoute';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminLogin from './pages/AdminLogin';
import Dashboard from './pages/Dashboard';
import Leave from './pages/Leave';
import OD from './pages/OD';
import Bonafide from './pages/Bonafide';
import Complaint from './pages/Complaint';
import Status from './pages/Status';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import NotFound from './pages/NotFound';
import VerifyCertificate from './pages/VerifyCertificate';
import BookAppointment from './pages/BookAppointment';
import MyAppointments from './pages/MyAppointments';
import MyAvailability from './pages/MyAvailability';
import AppointmentRequests from './pages/AppointmentRequests';
import AppointmentSchedule from './pages/AppointmentSchedule';
import StaffManagement from './pages/StaffManagement';
import SetPassword from './pages/SetPassword';
import ServerWakeupLoader from './components/ServerWakeupLoader';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <ServerWakeupLoader />
          <Routes>
            <Route element={<PasswordChangeRoute />}>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/verify/:code" element={<VerifyCertificate />} />
            <Route path="/set-password" element={<SetPassword />} />

            {/* Protected Student Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/leave" element={<Leave />} />
              <Route path="/od" element={<OD />} />
              <Route path="/bonafide" element={<Bonafide />} />
              <Route path="/complaint" element={<Complaint />} />
              <Route path="/status" element={<Status />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/appointments/book" element={<BookAppointment />} />
              <Route path="/appointments" element={<MyAppointments />} />
            </Route>

            <Route element={<StaffRoute />}>
              <Route path="/appointments/availability" element={<MyAvailability />} />
            </Route>
            <Route element={<StaffRoute adminAllowed />}>
              <Route path="/appointments/requests" element={<AppointmentRequests />} />
              <Route path="/appointments/today" element={<AppointmentSchedule />} />
            </Route>

            {/* Protected Admin Routes */}
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/staff" element={<StaffManagement />} />
            </Route>

            {/* 404 Catch-All */}
            <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
