import { Routes, Route } from "react-router-dom"
import AppLayout from "../components/layout/AppLayout"
import HomePage from "../pages/HomePage"
import EventsPage from "../pages/EventsPage"
import EventDetailsPage from "../pages/EventDetailsPage"
import LoginPage from "../pages/LoginPage"
import RegisterPage from "../pages/RegisterPage"
import DashboardPage from "../pages/DashboardPage"
import CreateEventPage from "../pages/CreateEventPage"
import EditEventPage from "../pages/EditEventPage"
import MyBookingsPage from "../pages/MyBookingsPage"
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

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
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
