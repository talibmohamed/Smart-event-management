import { Routes, Route } from "react-router-dom"
import AppLayout from "../components/layout/AppLayout"
import HomePage from "../pages/HomePage"
import EventsPage from "../pages/EventsPage"
import EventDetailsPage from "../pages/EventDetailsPage"
import LoginPage from "../pages/LoginPage"
import RegisterPage from "../pages/RegisterPage"
import ForgotPasswordPage from "../pages/ForgotPasswordPage"
import ResetPasswordPage from "../pages/ResetPasswordPage"
import PrivacyPolicyPage from "../pages/PrivacyPolicyPage"
import TermsOfServicePage from "../pages/TermsOfServicePage"
import DashboardPage from "../pages/DashboardPage"
import CreateEventPage from "../pages/CreateEventPage"
import EditEventPage from "../pages/EditEventPage"
import MyBookingsPage from "../pages/MyBookingsPage"
import BookingStatusPage from "../pages/BookingStatusPage"
import ProtectedRoute from "./ProtectedRoute"

export default function AppRouter() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/:id" element={<EventDetailsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/terms-of-service" element={<TermsOfServicePage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/bookings/:id/payment-success" element={<BookingStatusPage />} />
          <Route path="/bookings/:id/payment-cancelled" element={<BookingStatusPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["attendee"]} />}>
          <Route path="/my-bookings" element={<MyBookingsPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["organizer", "admin"]} />}>
          <Route path="/create-event" element={<CreateEventPage />} />
          <Route path="/events/:id/edit" element={<EditEventPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
