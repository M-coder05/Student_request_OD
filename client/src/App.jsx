import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { FeatureProvider } from './context/FeatureContext';

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
import StaffDirectory from './pages/StaffDirectory';
import SetPassword from './pages/SetPassword';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import PasswordResetRequests from './pages/PasswordResetRequests';
import AnnouncementsAdmin from './pages/AnnouncementsAdmin';
import ServerWakeupLoader from './components/ServerWakeupLoader';
import AppointmentBookingGuard from './components/AppointmentBookingGuard';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <FeatureProvider>
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
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/reset-password/:token" element={<ResetPassword />} />

                {/* Protected Student Routes */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/leave" element={<Leave />} />
                  <Route path="/od" element={<OD />} />
                  <Route path="/bonafide" element={<Bonafide />} />
                  <Route path="/complaint" element={<Complaint />} />
                  <Route path="/status" element={<Status />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route element={<AppointmentBookingGuard />}>
                    <Route path="/appointments/book" element={<BookAppointment />} />
                    <Route path="/appointments/staff" element={<StaffDirectory />} />
                    <Route path="/appointments" element={<MyAppointments />} />
                  </Route>
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
                  <Route path="/admin/password-resets" element={<PasswordResetRequests />} />
                  <Route path="/admin/announcements" element={<AnnouncementsAdmin />} />
                </Route>

                {/* 404 Catch-All */}
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </FeatureProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
