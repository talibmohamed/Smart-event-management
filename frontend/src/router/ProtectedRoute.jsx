import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { getPostAuthPath } from "../services/authService"

export default function ProtectedRoute({ allowedRoles = [] }) {
  const location = useLocation()
  const { user, isAuthenticated, isBootstrapping } = useAuth()

  if (isBootstrapping) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        <div className="rounded-3xl border border-slate-200/80 bg-white/90 px-6 py-10 text-center text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
          Checking your session...
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to={getPostAuthPath(user?.role)} replace />
  }

  return <Outlet />
}
