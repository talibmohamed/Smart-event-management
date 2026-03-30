import { Button, Divider, Link } from "@heroui/react"
import { CalendarDays } from "lucide-react"
import { Link as RouterLink } from "react-router-dom"

const productLinks = [
  { href: "/events", label: "Browse Events" },
  { href: "/create-event", label: "Create Event" },
  { href: "/dashboard", label: "Dashboard" },
]

const accountLinks = [
  { href: "/login", label: "Login" },
  { href: "/register", label: "Create Account" },
]

export default function AppFooter() {
  return (
    <footer className="border-t border-slate-200/80 bg-white/70 backdrop-blur-md transition-colors dark:border-slate-800 dark:bg-slate-950/70">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-10 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <CalendarDays size={22} />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Eventify
              </p>
              <h2 className="text-xl font-semibold">Smart event operations, one clean workspace.</h2>
            </div>
          </div>
          <p className="max-w-md text-sm leading-6 text-slate-600 dark:text-slate-400">
            Manage launches, meetups, workshops, and registrations with a focused interface built for organizers and attendees.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button as={RouterLink} to="/events" color="primary">
              Explore events
            </Button>
            <Button as={RouterLink} to="/create-event" variant="bordered">
              New event
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Product
          </h3>
          <div className="flex flex-col gap-3">
            {productLinks.map((item) => (
              <Link
                key={item.href}
                as={RouterLink}
                to={item.href}
                color="foreground"
                className="w-fit text-sm text-slate-600 transition-colors hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-100"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Account
          </h3>
          <div className="flex flex-col gap-3">
            {accountLinks.map((item) => (
              <Link
                key={item.href}
                as={RouterLink}
                to={item.href}
                color="foreground"
                className="w-fit text-sm text-slate-600 transition-colors hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-100"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <Divider className="bg-slate-200/80 dark:bg-slate-800" />

      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-4 text-sm text-slate-500 dark:text-slate-400 md:flex-row md:items-center md:justify-between">
        <p>2026 Eventify. Built for clean event workflows.</p>
        <p>HeroUI layout shell with light and dark themes.</p>
      </div>
    </footer>
  )
}
