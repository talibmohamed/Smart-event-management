import { Link } from "@heroui/react";
import { Link as RouterLink } from "react-router-dom";
import logoUrl from "../../../logo.svg";

const footerSections = [
  {
    title: "Product",
    links: [
      { href: "/events", label: "Events" },
      { href: "/create-event", label: "Create Event" },
      { href: "/dashboard", label: "Dashboard" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/events", label: "Browse events" },
      { href: "/login", label: "Account access" },
      { href: "/forgot-password", label: "Reset password" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy-policy", label: "Privacy Policy" },
      { href: "/terms-of-service", label: "Terms of Service" },
    ],
  },
];

export default function AppFooter() {
  return (
    <footer className="border-t border-zinc-900/8 bg-white/48 backdrop-blur-xl dark:border-white/8 dark:bg-[#09090C]/48">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="max-w-md">
          <div className="mb-4 flex w-fit items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-white/60 bg-white p-1.5 shadow-sm shadow-zinc-950/5 ring-1 ring-zinc-900/5 dark:border-white/10 dark:bg-white dark:shadow-black/20 dark:ring-white/10">
              <img src={logoUrl} alt="Quickseat logo" className="h-full w-full object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-semibold tracking-[-0.03em] text-[#231538]">
                Quickseat
              </span>
              <span className="text-[0.68rem] font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                YOUR SEAT, FASTER THAN EVER
              </span>
            </div>
          </div>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
            Quickseat helps teams run events with less friction and faster seat access.
          </p>
        </div>

        <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                {section.title}
              </h3>
              <div className="mt-3 flex flex-col gap-2.5">
                {section.links.map((item) => (
                  <Link
                    key={item.href}
                    as={RouterLink}
                    to={item.href}
                    color="foreground"
                    className="w-fit text-sm text-zinc-600 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-zinc-900/8 pt-4 text-xs text-zinc-500 dark:border-white/8 dark:text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
          <p>{"\u00A9"} 2026 Quickseat</p>
          <p>YOUR SEAT, FASTER THAN EVER</p>
        </div>
      </div>
    </footer>
  );
}
