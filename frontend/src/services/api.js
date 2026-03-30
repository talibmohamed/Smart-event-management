import axios from "axios"
import { readStoredSession } from "./authStorage"

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
})

api.interceptors.request.use((config) => {
  const { token } = readStoredSession()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export function extractApiErrorMessage(error, fallbackMessage = "Something went wrong. Please try again.") {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message || fallbackMessage
  }

  return fallbackMessage
}

export default api
