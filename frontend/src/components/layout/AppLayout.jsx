import { Outlet } from "react-router-dom"
import AppFooter from "./AppFooter"
import AppNavbar from "./AppNavbar"

export default function AppLayout() {
  return (
    <div className="relative isolate min-h-screen overflow-x-hidden bg-[#f4f7fb] text-slate-950 transition-colors dark:bg-[#07080c] dark:text-slate-100">
      <div className="pointer-events-none absolute inset-0 opacity-90">
        <div className="absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.16),transparent_52%)] dark:bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.16),transparent_52%)]" />
        <div className="absolute left-[-8rem] top-40 h-72 w-72 rounded-full bg-sky-200/30 blur-3xl dark:bg-sky-500/10" />
        <div className="absolute right-[-10rem] top-24 h-80 w-80 rounded-full bg-indigo-200/30 blur-3xl dark:bg-indigo-500/10" />
        <div className="absolute inset-x-0 top-24 h-px bg-gradient-to-r from-transparent via-slate-300/70 to-transparent dark:via-white/10" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-[linear-gradient(to_bottom,transparent,rgba(255,255,255,0.45))] dark:bg-[linear-gradient(to_bottom,transparent,rgba(5,7,12,0.5))]" />
      </div>

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
