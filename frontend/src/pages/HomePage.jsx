import { useEffect, useMemo, useState } from "react";
import { Button, Card, CardBody, Chip } from "@heroui/react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CalendarCheck2,
  CalendarClock,
  CircleDollarSign,
  Compass,
  LayoutDashboard,
  MapPin,
  MousePointer2,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import EventCoverImage from "../components/event/EventCoverImage";
import eventService from "../services/eventService";
import {
  formatEventAvailability,
  formatEventDate,
  formatEventPriceRange,
  formatEventVenue,
  isUpcomingEvent,
} from "../utils/eventUtils";

const sectionVariant = {
  hidden: { opacity: 0, y: 34 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

const staggerVariant = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.09 },
  },
};

const cardVariant = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

const roles = [
  {
    icon: Ticket,
    label: "Attendees",
    title: "Discover and book with confidence",
    description:
      "Search upcoming experiences, see availability, pay for premium events, and manage bookings from one place.",
  },
  {
    icon: CalendarCheck2,
    label: "Organizers",
    title: "Run events without spreadsheet chaos",
    description:
      "Create events, control capacity, upload cover images, track bookings, and protect ownership workflows.",
  },
  {
    icon: ShieldCheck,
    label: "Admins",
    title: "Supervise the platform cleanly",
    description:
      "Keep visibility across event activity while role-based access keeps day-to-day operations safe.",
  },
];

const workflow = [
  {
    icon: Compass,
    title: "Discover",
    description: "Filter by category, city, price, timing, and map area.",
  },
  {
    icon: Ticket,
    title: "Book",
    description: "Reserve free events instantly or continue through Stripe Checkout for paid seats.",
  },
  {
    icon: LayoutDashboard,
    title: "Manage",
    description: "Organizers create, edit, and monitor only the events they own.",
  },
  {
    icon: BarChart3,
    title: "Supervise",
    description: "Admins retain broad oversight without weakening user permissions.",
  },
];

const productSignals = [
  { label: "Confirmed seats", value: "1,248", icon: Users },
  { label: "Live checkout", value: "Stripe", icon: CircleDollarSign },
  { label: "Map discovery", value: "France", icon: MapPin },
];

function AnimatedSection({ children, className = "" }) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <section className={className}>{children}</section>;
  }

  return (
    <motion.section
      variants={sectionVariant}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.18 }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

function ProductPreview() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="relative min-h-[34rem] overflow-hidden rounded-[2rem] border border-zinc-900/10 bg-zinc-950 p-4 text-white shadow-[0_30px_100px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_30px_100px_rgba(0,0,0,0.45)] sm:p-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(56,189,248,0.28),transparent_35%),radial-gradient(circle_at_90%_10%,rgba(139,92,246,0.22),transparent_36%),linear-gradient(145deg,rgba(255,255,255,0.08),transparent_45%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:3.2rem_3.2rem] opacity-35" />

      <motion.div
        animate={prefersReducedMotion ? undefined : { y: [0, -10, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="relative rounded-[1.5rem] border border-white/10 bg-white/10 p-5 backdrop-blur-xl"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-sky-200">
              Organizer cockpit
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Campus launch night</h2>
          </div>
          <Chip className="border border-emerald-300/30 bg-emerald-400/15 text-emerald-100" variant="flat">
            Live
          </Chip>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {productSignals.map((signal) => {
            const Icon = signal.icon;

            return (
              <div key={signal.label} className="rounded-2xl border border-white/10 bg-black/18 p-4">
                <Icon size={17} className="text-sky-200" />
                <p className="mt-3 text-xl font-semibold tracking-[-0.03em]">{signal.value}</p>
                <p className="mt-1 text-xs text-white/55">{signal.label}</p>
              </div>
            );
          })}
        </div>
      </motion.div>

      <motion.div
        animate={prefersReducedMotion ? undefined : { y: [0, 12, 0], rotate: [0, -1, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
        className="relative ml-auto mt-5 max-w-sm rounded-[1.35rem] border border-white/10 bg-white/92 p-4 text-zinc-950 shadow-2xl shadow-black/20 dark:bg-zinc-950/80 dark:text-white"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
              Booking flow
            </p>
            <p className="mt-2 text-lg font-semibold tracking-[-0.03em]">Payment required</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
            <CircleDollarSign size={18} />
          </div>
        </div>
        <div className="mt-5 space-y-3">
          <div className="h-2 rounded-full bg-zinc-200 dark:bg-white/10">
            <div className="h-2 w-[74%] rounded-full bg-gradient-to-r from-sky-400 to-violet-500" />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-500 dark:text-zinc-400">Stripe checkout</span>
            <span className="font-medium">pending</span>
          </div>
        </div>
      </motion.div>

      <motion.div
        animate={prefersReducedMotion ? undefined : { y: [0, -8, 0], rotate: [0, 1, 0] }}
        transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
        className="relative mt-5 max-w-[19rem] rounded-[1.35rem] border border-white/10 bg-black/20 p-4 backdrop-blur-xl"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-400/18 text-sky-100">
            <MapPin size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold">Paris events visible</p>
            <p className="text-xs text-white/55">Map focus prioritizes nearby cards</p>
          </div>
        </div>
      </motion.div>

      <div className="absolute bottom-5 right-5 hidden items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-medium text-white/75 backdrop-blur-xl sm:flex">
        <MousePointer2 size={14} />
        Click. Filter. Book.
      </div>
    </div>
  );
}

function FeaturedEventCard({ event }) {
  return (
    <Card className="group overflow-hidden rounded-[1.75rem] border border-zinc-200/80 bg-white/76 shadow-[0_18px_55px_rgba(148,163,184,0.14)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:bg-white/90 hover:shadow-[0_26px_70px_rgba(148,163,184,0.24)] dark:border-white/10 dark:bg-white/[0.045] dark:shadow-black/15 dark:hover:bg-white/[0.065] dark:hover:shadow-black/30">
      <div className="relative p-3 pb-0">
        {event.image_url ? (
          <EventCoverImage
            src={event.image_url}
            alt={`${event.title} cover`}
            className="h-48 w-full rounded-[1.35rem]"
            imageClassName="transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="relative h-36 overflow-hidden rounded-[1.35rem] bg-[radial-gradient(circle_at_18%_18%,rgba(14,165,233,0.34),transparent_34%),radial-gradient(circle_at_85%_15%,rgba(139,92,246,0.3),transparent_34%),linear-gradient(135deg,rgba(241,245,249,0.96),rgba(226,232,240,0.82))] dark:bg-[radial-gradient(circle_at_18%_18%,rgba(56,189,248,0.24),transparent_34%),radial-gradient(circle_at_85%_15%,rgba(139,92,246,0.22),transparent_34%),linear-gradient(135deg,rgba(39,39,42,0.92),rgba(15,23,42,0.86))]">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.06)_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-35 dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)]" />
            <div className="absolute bottom-4 left-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-white/72 text-sky-600 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10 dark:text-sky-200">
              <CalendarClock size={18} />
            </div>
          </div>
        )}

        <div className="absolute left-6 top-6 flex max-w-[calc(100%-3rem)] items-center gap-2">
          <span className="truncate rounded-full border border-white/55 bg-white/82 px-3 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-zinc-700 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/58 dark:text-zinc-200">
            {event.category || "Event"}
          </span>

          <Chip
            variant="flat"
            className="shrink-0 border border-white/55 bg-white/86 text-zinc-800 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/58 dark:text-zinc-100"
          >
            {formatEventPriceRange(event)}
          </Chip>
        </div>
      </div>

      <CardBody className="gap-5 p-5">
        <div className="space-y-3">
          <h3 className="line-clamp-2 text-[1.35rem] font-semibold leading-tight tracking-[-0.045em] text-zinc-950 dark:text-white">
            {event.title}
          </h3>
          <p className="line-clamp-2 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
            {event.description}
          </p>
        </div>

        <div className="space-y-3 border-y border-zinc-200/70 py-4 text-sm dark:border-white/10">
          <div className="flex items-start gap-3 text-zinc-700 dark:text-zinc-300">
            <CalendarClock size={16} className="mt-0.5 shrink-0 text-sky-600 dark:text-sky-300" />
            <span className="font-medium leading-6 text-zinc-900 dark:text-zinc-100">
              {formatEventDate(event.event_date)}
            </span>
          </div>

          <div className="flex items-start gap-3 text-zinc-700 dark:text-zinc-300">
            <MapPin size={16} className="mt-0.5 shrink-0 text-sky-600 dark:text-sky-300" />
            <span className="line-clamp-2 font-medium leading-6 text-zinc-900 dark:text-zinc-100">
              {formatEventVenue(event)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 rounded-full bg-zinc-100/80 px-3 py-2 text-xs font-semibold text-zinc-600 dark:bg-white/8 dark:text-zinc-300">
            <Users size={14} />
            <span>{formatEventAvailability(event)}</span>
          </div>
        </div>

        <Button
          as={Link}
          to={`/events/${event.id}`}
          radius="full"
          className="mt-1 h-11 w-full bg-zinc-950 text-white shadow-sm transition-all duration-300 group-hover:translate-x-0.5 group-hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:group-hover:bg-zinc-200"
          endContent={<ArrowRight size={15} />}
        >
          View event
        </Button>
      </CardBody>
    </Card>
  );
}

export default function HomePage() {
  const [events, setEvents] = useState([]);
  const [eventsError, setEventsError] = useState("");
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    let ignore = false;

    eventService
      .getEvents()
      .then((response) => {
        if (!ignore) {
          setEvents(Array.isArray(response.data?.data) ? response.data.data : []);
        }
      })
      .catch(() => {
        if (!ignore) {
          setEventsError("Featured events are temporarily unavailable.");
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  const featuredEvents = useMemo(() => {
    return events
      .filter((event) => isUpcomingEvent(event.event_date))
      .sort((firstEvent, secondEvent) => new Date(firstEvent.event_date) - new Date(secondEvent.event_date))
      .slice(0, 3);
  }, [events]);

  return (
    <div className="overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 pb-24 pt-10 sm:px-6 md:pt-16">
        <section className="relative min-h-[42rem] overflow-hidden rounded-[2.4rem] border border-zinc-200/70 bg-white/70 px-5 py-10 shadow-[0_32px_100px_rgba(148,163,184,0.2)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_32px_100px_rgba(0,0,0,0.42)] sm:px-8 sm:py-14 lg:px-12">
          <div className="pointer-events-none absolute inset-0">
            <motion.div
              animate={prefersReducedMotion ? undefined : { scale: [1, 1.08, 1], opacity: [0.5, 0.75, 0.5] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -left-28 top-[-9rem] h-96 w-96 rounded-full bg-sky-300/35 blur-3xl dark:bg-sky-500/14"
            />
            <motion.div
              animate={prefersReducedMotion ? undefined : { scale: [1, 1.12, 1], opacity: [0.42, 0.72, 0.42] }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
              className="absolute right-[-8rem] top-10 h-[28rem] w-[28rem] rounded-full bg-violet-300/32 blur-3xl dark:bg-violet-500/12"
            />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.05)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-45 dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)]" />
          </div>

          <div className="relative grid gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
            <motion.div
              variants={staggerVariant}
              initial="hidden"
              animate="visible"
              className="max-w-3xl"
            >
              <motion.div variants={cardVariant} className="flex flex-wrap items-center gap-3">
                <Chip
                  variant="flat"
                  className="border border-zinc-200 bg-white/85 text-zinc-700 dark:border-white/10 dark:bg-white/8 dark:text-zinc-200"
                >
                  Quickseat platform
                </Chip>
                <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:border-white/10 dark:bg-white/6 dark:text-zinc-400">
                  <Sparkles size={13} />
                  YOUR SEAT, FASTER THAN EVER
                </div>
              </motion.div>

              <motion.div variants={cardVariant} className="mt-7 space-y-5">
                <h1 className="text-5xl font-semibold leading-[0.94] tracking-[-0.075em] text-zinc-950 dark:text-white sm:text-6xl lg:text-7xl">
                  The calmer way to discover, book, and run events.
                </h1>
                <p className="max-w-2xl text-base leading-8 text-zinc-600 dark:text-zinc-400 sm:text-lg">
                  Quickseat blends a public event marketplace with organizer controls, secure bookings,
                  payments, map discovery, and admin visibility in one polished workspace.
                </p>
              </motion.div>

              <motion.div variants={cardVariant} className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button
                  as={Link}
                  to="/events"
                  radius="full"
                  size="lg"
                  className="h-13 bg-zinc-950 px-7 text-white shadow-lg shadow-zinc-950/10 dark:bg-white dark:text-zinc-950"
                  endContent={<ArrowRight size={16} />}
                >
                  Explore events
                </Button>
                <Button
                  as={Link}
                  to="/register"
                  radius="full"
                  size="lg"
                  variant="bordered"
                  className="h-13 border-zinc-200 bg-white/78 px-7 text-zinc-950 dark:border-white/10 dark:bg-white/5 dark:text-white"
                >
                  Create account
                </Button>
              </motion.div>

              <motion.div variants={cardVariant} className="mt-10 grid gap-3 sm:grid-cols-3">
                {[
                  ["Role-safe", "Organizer and admin access"],
                  ["Stripe-ready", "Paid and free bookings"],
                  ["Map-first", "Location-aware discovery"],
                ].map(([title, description]) => (
                  <div
                    key={title}
                    className="rounded-2xl border border-zinc-200/80 bg-white/62 p-4 backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
                  >
                    <p className="text-sm font-semibold text-zinc-950 dark:text-white">{title}</p>
                    <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">{description}</p>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 28, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.12 }}
            >
              <ProductPreview />
            </motion.div>
          </div>
        </section>

        <AnimatedSection className="mt-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600 dark:text-sky-300">
              Built for every role
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.055em] text-zinc-950 dark:text-white md:text-5xl">
              One interface, three clean workflows.
            </h2>
          </div>

          <motion.div
            variants={staggerVariant}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="mt-10 grid gap-5 lg:grid-cols-3"
          >
            {roles.map((role) => {
              const Icon = role.icon;

              return (
                <motion.div key={role.label} variants={cardVariant}>
                  <Card className="h-full border border-zinc-200/80 bg-white/70 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70 dark:border-white/10 dark:bg-white/[0.04] dark:hover:shadow-black/25">
                    <CardBody className="gap-6 p-6">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-100 text-zinc-800 dark:border-white/10 dark:bg-white/8 dark:text-white">
                        <Icon size={21} />
                      </div>
                      <div>
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                          {role.label}
                        </p>
                        <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-white">
                          {role.title}
                        </h3>
                        <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                          {role.description}
                        </p>
                      </div>
                    </CardBody>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatedSection>

        <AnimatedSection className="mt-20 overflow-hidden rounded-[2rem] border border-zinc-200/80 bg-zinc-950 p-6 text-white shadow-[0_30px_90px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-white/[0.04] sm:p-8 lg:p-10">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200">
                How it works
              </p>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.055em] md:text-5xl">
                From discovery to operations without breaking flow.
              </h2>
              <p className="mt-5 text-sm leading-7 text-white/62">
                The product connects public browsing, booking status, organizer management, and platform oversight
                without mixing responsibilities or weakening access control.
              </p>
              <Button
                as={Link}
                to="/create-event"
                radius="full"
                className="mt-8 bg-white text-zinc-950"
                endContent={<ArrowRight size={15} />}
              >
                Start as organizer
              </Button>
            </div>

            <motion.div
              variants={staggerVariant}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              className="grid gap-4 sm:grid-cols-2"
            >
              {workflow.map((step, index) => {
                const Icon = step.icon;

                return (
                  <motion.div
                    key={step.title}
                    variants={cardVariant}
                    className="rounded-[1.5rem] border border-white/10 bg-white/8 p-5 backdrop-blur"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-sky-100">
                        <Icon size={19} />
                      </div>
                      <span className="text-xs font-semibold text-white/35">{String(index + 1).padStart(2, "0")}</span>
                    </div>
                    <h3 className="mt-5 text-xl font-semibold tracking-[-0.035em]">{step.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-white/58">{step.description}</p>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </AnimatedSection>

        <AnimatedSection className="mt-20">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600 dark:text-sky-300">
                Featured events
              </p>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.055em] text-zinc-950 dark:text-white md:text-5xl">
                Real events, rendered with the product data.
              </h2>
              <p className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                The landing page previews upcoming events from the same API used by the Events page.
              </p>
            </div>
            <Button
              as={Link}
              to="/events"
              radius="full"
              variant="bordered"
              className="w-fit border-zinc-200 bg-white/70 text-zinc-950 dark:border-white/10 dark:bg-white/5 dark:text-white"
              endContent={<ArrowRight size={15} />}
            >
              Browse all events
            </Button>
          </div>

          {featuredEvents.length > 0 ? (
            <motion.div
              variants={staggerVariant}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.15 }}
              className="mt-10 grid gap-5 lg:grid-cols-3"
            >
              {featuredEvents.map((event) => (
                <motion.div key={event.id} variants={cardVariant}>
                  <FeaturedEventCard event={event} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="mt-10 rounded-[1.5rem] border border-zinc-200/80 bg-white/65 p-6 text-sm text-zinc-600 backdrop-blur dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-400">
              {eventsError || "Featured events will appear here once upcoming events are published."}
            </div>
          )}
        </AnimatedSection>

        <AnimatedSection className="mt-20">
          <div className="relative overflow-hidden rounded-[2rem] border border-zinc-200/80 bg-white/76 p-7 text-center shadow-[0_30px_90px_rgba(148,163,184,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_30px_90px_rgba(0,0,0,0.35)] sm:p-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(14,165,233,0.18),transparent_38%),radial-gradient(circle_at_100%_60%,rgba(139,92,246,0.14),transparent_34%)]" />
            <div className="relative mx-auto max-w-3xl">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-sky-600 shadow-sm dark:border-white/10 dark:bg-white/8 dark:text-sky-200">
                <BadgeCheck size={21} />
              </div>
              <h2 className="mt-5 text-4xl font-semibold tracking-[-0.055em] text-zinc-950 dark:text-white md:text-5xl">
                Make your next event feel organized before it even starts.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                Browse what is happening now, or create an account and start managing events with a cleaner operating system.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button
                  as={Link}
                  to="/events"
                  radius="full"
                  size="lg"
                  className="bg-zinc-950 px-7 text-white dark:bg-white dark:text-zinc-950"
                >
                  Explore events
                </Button>
                <Button
                  as={Link}
                  to="/register"
                  radius="full"
                  size="lg"
                  variant="bordered"
                  className="border-zinc-200 bg-white/70 px-7 text-zinc-950 dark:border-white/10 dark:bg-white/5 dark:text-white"
                >
                  Join Quickseat
                </Button>
              </div>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
