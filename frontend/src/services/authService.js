import api from "./api"

export const PUBLIC_REGISTRATION_ROLES = [
  {
    value: "attendee",
    label: "Attendee",
    description: "Browse events and manage your bookings.",
  },
  {
    value: "organizer",
    label: "Organizer",
    description: "Create events and track registrations.",
  },
]

export function isOrganizerRole(role) {
  return role === "organizer" || role === "admin"
}

export function getPostAuthPath(role) {
  return isOrganizerRole(role) ? "/dashboard" : "/events"
}

const authService = {
  login(credentials) {
    return api.post("/auth/login", credentials)
  },

  register(payload) {
    return api.post("/auth/register", payload)
  },

  forgotPassword(email) {
    return api.post("/auth/forgot-password", { email })
  },

  resetPassword(payload) {
    return api.post("/auth/reset-password", payload)
  },

  getProfile() {
    return api.get("/auth/me")
  },
}

export default authService
