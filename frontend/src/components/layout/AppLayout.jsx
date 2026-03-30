import { Outlet } from "react-router-dom"
import AppFooter from "./AppFooter"
import AppNavbar from "./AppNavbar"

export default function AppLayout() {
  return (
    <div className="relative isolate min-h-screen overflow-x-hidden bg-slate-50 text-slate-950 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.14),transparent_55%)] dark:bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.16),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-28 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-800" />

      <div className="relative flex min-h-screen flex-col">
        <AppNavbar />
        <main className="flex-1">
          <Outlet />
        </main>
        <AppFooter />
      </div>
    </div>
  )
}
