import { Suspense, lazy } from "react";
import { Spinner } from "@heroui/react";
import { Route, Routes } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import ProtectedRoute from "./ProtectedRoute";

const HomePage = lazy(() => import("../pages/HomePage"));
const EventsPage = lazy(() => import("../pages/EventsPage"));
const EventDetailsPage = lazy(() => import("../pages/EventDetailsPage"));
const LoginPage = lazy(() => import("../pages/LoginPage"));
const RegisterPage = lazy(() => import("../pages/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("../pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("../pages/ResetPasswordPage"));
const PrivacyPolicyPage = lazy(() => import("../pages/PrivacyPolicyPage"));
const TermsOfServicePage = lazy(() => import("../pages/TermsOfServicePage"));
const DashboardPage = lazy(() => import("../pages/DashboardPage"));
const CreateEventPage = lazy(() => import("../pages/CreateEventPage"));
const EditEventPage = lazy(() => import("../pages/EditEventPage"));
const EventAttendeesPage = lazy(() => import("../pages/EventAttendeesPage"));
const EventCheckInPage = lazy(() => import("../pages/EventCheckInPage"));
const MyBookingsPage = lazy(() => import("../pages/MyBookingsPage"));
const MyMessagesPage = lazy(() => import("../pages/MyMessagesPage"));
const BookingStatusPage = lazy(() => import("../pages/BookingStatusPage"));
const BookingTicketsPage = lazy(() => import("../pages/BookingTicketsPage"));
const AdminAnalyticsPage = lazy(() => import("../pages/AdminAnalyticsPage"));
const AdminTransactionsPage = lazy(() => import("../pages/AdminTransactionsPage"));
const AdminUsersPage = lazy(() => import("../pages/AdminUsersPage"));
const OrganizerInboxPage = lazy(() => import("../pages/OrganizerInboxPage"));

function RouteLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-6 py-16">
      <div className="flex items-center gap-3 rounded-full border border-zinc-200/80 bg-white/88 px-5 py-3 text-sm text-zinc-600 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300">
        <Spinner size="sm" color="default" />
        Loading page...
      </div>
    </div>
  );
}

export default function AppRouter() {
  return (
    <Suspense fallback={<RouteLoader />}>
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
            <Route path="/bookings/:id/tickets" element={<BookingTicketsPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["attendee"]} />}>
            <Route path="/my-bookings" element={<MyBookingsPage />} />
            <Route path="/my-messages" element={<MyMessagesPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["organizer"]} />}>
            <Route path="/dashboard/inbox" element={<OrganizerInboxPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["organizer", "admin"]} />}>
            <Route path="/create-event" element={<CreateEventPage />} />
            <Route path="/events/:id/edit" element={<EditEventPage />} />
            <Route path="/events/:id/attendees" element={<EventAttendeesPage />} />
            <Route path="/events/:id/check-in" element={<EventCheckInPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
            <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
            <Route path="/admin/transactions" element={<AdminTransactionsPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
