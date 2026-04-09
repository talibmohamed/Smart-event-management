import { Button, Card, CardBody, Chip } from "@heroui/react";
import { CalendarCheck2, LayoutDashboard, Sparkles, Ticket } from "lucide-react";
import { Link } from "react-router-dom";

const highlights = [
  {
    icon: CalendarCheck2,
    title: "Organizer flow",
    description: "Publish events, update details, and manage everything from one clean workspace.",
  },
  {
    icon: Ticket,
    title: "Attendee flow",
    description: "Discover campus and community events with a clearer browsing experience.",
  },
  {
    icon: LayoutDashboard,
    title: "Admin oversight",
    description: "Keep visibility on platform activity without adding unnecessary operational clutter.",
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-6 pb-20 pt-12 md:pt-16">
      <section className="relative overflow-hidden rounded-[2rem] border border-zinc-200/70 bg-white/72 px-6 py-12 shadow-[0_30px_80px_rgba(148,163,184,0.15)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_30px_80px_rgba(2,6,23,0.45)] md:px-10 md:py-16">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-16 top-0 h-56 w-56 rounded-full bg-sky-200/45 blur-3xl dark:bg-sky-500/10" />
          <div className="absolute right-0 top-8 h-64 w-64 rounded-full bg-indigo-200/35 blur-3xl dark:bg-indigo-500/10" />
        </div>

        <div className="relative grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <Chip
                variant="flat"
                className="border border-zinc-200 bg-white/85 text-zinc-700 dark:border-white/10 dark:bg-white/8 dark:text-zinc-200"
              >
                SmartEvent platform
              </Chip>
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:border-white/10 dark:bg-white/6 dark:text-zinc-400">
                <Sparkles size={13} />
                Event operations
              </div>
            </div>

            <div className="space-y-4">
              <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.06em] text-zinc-950 dark:text-white md:text-6xl">
                One workspace for publishing, discovering, and managing events.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-zinc-600 dark:text-zinc-400 md:text-lg">
                SmartEvent brings organizer tools, attendee discovery, and platform oversight into
                a calmer SaaS-style interface that feels operational, not chaotic.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Button
                as={Link}
                to="/events"
                radius="full"
                size="lg"
                className="bg-zinc-950 px-6 text-white dark:bg-white dark:text-zinc-950"
              >
                Explore Events
              </Button>
              <Button
                as={Link}
                to="/create-event"
                radius="full"
                size="lg"
                variant="bordered"
                className="border-zinc-200 bg-white/80 px-6 text-zinc-950 dark:border-white/10 dark:bg-white/5 dark:text-white"
              >
                Create Event
              </Button>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[1.75rem] border border-zinc-200/80 bg-zinc-950 px-6 py-6 text-white shadow-lg shadow-zinc-950/10 dark:border-white/10 dark:bg-white/6">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/60">
                Product focus
              </p>
              <p className="mt-3 text-xl font-medium leading-8 tracking-[-0.03em]">
                Designed to feel closer to a modern product shell than a student CRUD dashboard.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-zinc-200/80 bg-white/88 px-5 py-5 dark:border-white/10 dark:bg-white/[0.05]">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  Public browsing
                </p>
                <p className="mt-3 text-sm leading-7 text-zinc-700 dark:text-zinc-300">
                  Real event discovery pages and detail views.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-zinc-200/80 bg-white/88 px-5 py-5 dark:border-white/10 dark:bg-white/[0.05]">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  Organizer tools
                </p>
                <p className="mt-3 text-sm leading-7 text-zinc-700 dark:text-zinc-300">
                  Create, edit, and manage events with owner-safe controls.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-5 md:grid-cols-3">
        {highlights.map((item) => {
          const Icon = item.icon;

          return (
            <Card
              key={item.title}
              className="border border-zinc-200/80 bg-white/78 shadow-sm dark:border-white/10 dark:bg-white/[0.04]"
            >
              <CardBody className="gap-4 p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-white/10 dark:bg-white/8 dark:text-zinc-200">
                  <Icon size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold tracking-[-0.03em] text-zinc-950 dark:text-white">
                    {item.title}
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                    {item.description}
                  </p>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
