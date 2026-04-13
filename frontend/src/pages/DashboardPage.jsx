import { Button, Card, CardBody, CardHeader, Chip, Spinner } from "@heroui/react";
import { CalendarDays, PencilLine, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import EventCoverImage from "../components/event/EventCoverImage";
import { useAuth } from "../context/AuthContext";
import { extractApiErrorMessage } from "../services/api";
import eventService from "../services/eventService";
import { isOrganizerRole } from "../services/authService";
import {
  formatEventDate,
  formatEventPrice,
  formatEventPriceRange,
  formatEventVenue,
  getTicketTierRemainingQuantity,
  isUpcomingEvent,
} from "../utils/eventUtils";

function FlashBanner({ message, tone = "info" }) {
  const toneClassName =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
      : "border-red-200 bg-red-50 text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300";

  return <div className={`rounded-2xl border px-4 py-3 text-sm ${toneClassName}`}>{message}</div>;
}

function StatCard({ label, value }) {
  return (
    <Card className="border border-zinc-200/80 bg-white/88 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <CardBody className="gap-2 px-5 py-4">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
          {label}
        </span>
        <span className="text-3xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-white">
          {value}
        </span>
      </CardBody>
    </Card>
  );
}

export default function DashboardPage() {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [flashState, setFlashState] = useState(null);
  const [deletingEventId, setDeletingEventId] = useState("");
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const canManageEvents = isOrganizerRole(user?.role);
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (location.state?.flashMessage) {
      setFlashState({
        message: location.state.flashMessage,
        tone: location.state.flashTone || "info",
      });

      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    let ignore = false;

    async function loadEvents() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const response = await eventService.getEvents();

        if (!ignore) {
          setEvents(response.data.data || []);
        }
      } catch (error) {
        if (ignore) {
          return;
        }

        if (error.response?.status === 401) {
          logout();
          navigate("/login", {
            replace: true,
            state: { from: `${location.pathname}${location.search}` },
          });
          return;
        }

        setErrorMessage(extractApiErrorMessage(error, "Unable to load your events right now."));
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    if (canManageEvents) {
      loadEvents();
    } else {
      setIsLoading(false);
    }

    return () => {
      ignore = true;
    };
  }, [canManageEvents, location.pathname, location.search, logout, navigate]);

  const managedEvents = useMemo(() => {
    if (isAdmin) {
      return events;
    }

    return events.filter((event) => event.organizer_id === user?.id);
  }, [events, isAdmin, user?.id]);

  const upcomingEventsCount = useMemo(
    () => managedEvents.filter((event) => isUpcomingEvent(event.event_date)).length,
    [managedEvents],
  );

  const pastEventsCount = managedEvents.length - upcomingEventsCount;

  async function handleDeleteEvent(event) {
    const hasConfirmed = window.confirm(
      `Delete "${event.title}"? This action cannot be undone.`,
    );

    if (!hasConfirmed) {
      return;
    }

    try {
      setDeletingEventId(event.id);
      setErrorMessage("");

      const response = await eventService.deleteEvent(event.id);

      setEvents((currentEvents) =>
        currentEvents.filter((currentEvent) => currentEvent.id !== event.id),
      );
      setFlashState({
        message: response.data.message || "Event deleted successfully",
        tone: "success",
      });
    } catch (error) {
      const status = error.response?.status;

      if (status === 401) {
        logout();
        navigate("/login", {
          replace: true,
          state: { from: `${location.pathname}${location.search}` },
        });
        return;
      }

      if (status === 403 || status === 404) {
        setEvents((currentEvents) =>
          currentEvents.filter((currentEvent) => currentEvent.id !== event.id),
        );
      }

      setFlashState({
        message: extractApiErrorMessage(error, "Unable to delete this event."),
        tone: "error",
      });
    } finally {
      setDeletingEventId("");
    }
  }

  if (!canManageEvents) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12 md:py-16">
        <Card className="border border-zinc-200/80 bg-white/88 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <CardBody className="gap-4 px-6 py-8">
            <h1 className="text-3xl font-semibold tracking-[-0.03em] text-zinc-950 dark:text-white">
              Dashboard
            </h1>
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Signed in as {user?.first_name} {user?.last_name}
            </p>
            <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
              Organizer tools are available for organizer and admin accounts. Your attendee flow is
              currently centered around public event discovery.
            </p>
            <div>
              <Button
                as={RouterLink}
                to="/events"
                radius="full"
                className="bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
              >
                Browse events
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
      <div className="space-y-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-zinc-200/70 bg-white/72 px-6 py-10 shadow-[0_24px_70px_rgba(148,163,184,0.14)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_24px_70px_rgba(2,6,23,0.4)] md:px-8 md:py-12">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-8 top-0 h-48 w-48 rounded-full bg-sky-200/40 blur-3xl dark:bg-sky-500/10" />
            <div className="absolute right-0 top-10 h-56 w-56 rounded-full bg-indigo-200/35 blur-3xl dark:bg-indigo-500/10" />
          </div>

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-400">
                <CalendarDays size={14} />
                {isAdmin ? "Admin event control" : "Organizer workspace"}
              </div>
              <div>
                <h1 className="text-4xl font-semibold tracking-[-0.05em] text-zinc-950 dark:text-white">
                  {isAdmin ? "Event supervision" : "My events"}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                  {isAdmin
                    ? "Review, update, and manage every event on the platform."
                    : "Create events, keep details current, and manage your published schedule from one place."}
                </p>
              </div>
            </div>

            <Button
              as={RouterLink}
              to="/create-event"
              radius="full"
              startContent={<Plus size={15} />}
              className="bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
            >
              Create Event
            </Button>
          </div>
        </section>

        {flashState?.message ? (
          <FlashBanner message={flashState.message} tone={flashState.tone} />
        ) : null}

        {errorMessage ? <FlashBanner message={errorMessage} tone="error" /> : null}

        <section className="grid gap-4 md:grid-cols-3">
          <StatCard label="Total events" value={managedEvents.length} />
          <StatCard label="Upcoming" value={upcomingEventsCount} />
          <StatCard label="Past" value={pastEventsCount} />
        </section>

        <section>
          {isLoading ? (
            <Card className="border border-zinc-200/80 bg-white/88 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
              <CardBody className="flex flex-row items-center justify-center gap-3 px-6 py-12 text-zinc-600 dark:text-zinc-400">
                <Spinner size="sm" color="default" />
                <span className="text-sm">Loading events...</span>
              </CardBody>
            </Card>
          ) : managedEvents.length === 0 ? (
            <Card className="border border-dashed border-zinc-300 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
              <CardBody className="gap-4 px-6 py-10 text-center">
                <h2 className="text-2xl font-semibold tracking-[-0.03em] text-zinc-950 dark:text-white">
                  {isAdmin ? "No events yet" : "No events yet"}
                </h2>
                <p className="mx-auto max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
                  {isAdmin
                    ? "There are no events in the system yet."
                    : "You have not published any events yet. Create one to start managing registrations."}
                </p>
                {!isAdmin ? (
                  <div>
                    <Button
                      as={RouterLink}
                      to="/create-event"
                      radius="full"
                      startContent={<Plus size={15} />}
                      className="bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                    >
                      Create your first event
                    </Button>
                  </div>
                ) : null}
              </CardBody>
            </Card>
          ) : (
            <div className="grid gap-5 xl:grid-cols-2">
              {managedEvents.map((event) => {
                const canManageThisEvent = isAdmin || event.organizer_id === user?.id;

                return (
                  <Card
                    key={event.id}
                    className="border border-zinc-200/80 bg-white/84 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70 dark:border-white/10 dark:bg-white/[0.04] dark:hover:shadow-black/20"
                  >
                    <CardHeader className="flex flex-col items-start gap-3 px-6 pt-6">
                      <div className="flex w-full flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          {event.image_url ? (
                            <EventCoverImage
                              src={event.image_url}
                              alt={`${event.title} cover`}
                              className="h-20 w-24 shrink-0 rounded-2xl border border-zinc-200/80 dark:border-white/10"
                            />
                          ) : null}

                          <div className="min-w-0 space-y-1">
                            <h2 className="text-xl font-semibold tracking-[-0.03em] text-zinc-950 dark:text-white">
                              {event.title}
                            </h2>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                              {event.category} in {event.city || "TBD"}
                            </p>
                          </div>
                        </div>

                        <Chip
                          variant="flat"
                          className="border border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-white/10 dark:bg-white/10 dark:text-zinc-200"
                        >
                          {formatEventPriceRange(event)}
                        </Chip>
                      </div>
                    </CardHeader>

                    <CardBody className="gap-5 px-6 pb-6">
                      <p className="line-clamp-3 text-sm text-zinc-600 dark:text-zinc-400">
                        {event.description}
                      </p>

                      <div className="grid gap-3 text-sm text-zinc-600 dark:text-zinc-400 sm:grid-cols-2">
                        <div className="rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                            Event date
                          </p>
                          <p className="mt-2 font-medium text-zinc-900 dark:text-zinc-100">
                            {formatEventDate(event.event_date)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                            Capacity
                          </p>
                          <p className="mt-2 font-medium text-zinc-900 dark:text-zinc-100">
                            {event.capacity} seats
                          </p>
                        </div>

                        <div className="rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03] sm:col-span-2">
                          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                            Venue
                          </p>
                          <p className="mt-2 font-medium text-zinc-900 dark:text-zinc-100">
                            {formatEventVenue(event)}
                          </p>
                        </div>

                        {isAdmin ? (
                          <div className="rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03] sm:col-span-2">
                            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                              Organizer
                            </p>
                            <p className="mt-2 font-medium text-zinc-900 dark:text-zinc-100">
                              {[event.first_name, event.last_name].filter(Boolean).join(" ") ||
                                event.organizer_email ||
                                "Organizer"}
                            </p>
                          </div>
                        ) : null}

                        {Array.isArray(event.ticket_tiers) && event.ticket_tiers.length > 0 ? (
                          <div className="rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03] sm:col-span-2">
                            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                              Ticket tiers
                            </p>
                            <div className="mt-3 grid gap-2">
                              {event.ticket_tiers.map((tier) => (
                                <div
                                  key={tier.id}
                                  className="flex flex-col gap-1 rounded-xl bg-zinc-50/90 px-3 py-2 dark:bg-white/[0.04] sm:flex-row sm:items-center sm:justify-between"
                                >
                                  <div>
                                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                                      {tier.name}{" "}
                                      {tier.is_active === false ? (
                                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                          (inactive)
                                        </span>
                                      ) : null}
                                    </p>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                      {formatEventPrice(tier.price)}
                                    </p>
                                  </div>
                                  <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                                    {Number(tier.sold_quantity) || 0} sold |{" "}
                                    {getTicketTierRemainingQuantity(tier)} left | {tier.capacity} cap
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                        <Button
                          as={RouterLink}
                          to={`/events/${event.id}`}
                          variant="bordered"
                          radius="full"
                          className="border-zinc-200 bg-white/70 font-medium text-zinc-950 dark:border-white/10 dark:bg-white/5 dark:text-white"
                        >
                          View
                        </Button>

                        {canManageThisEvent ? (
                          <>
                            <Button
                              as={RouterLink}
                              to={`/events/${event.id}/edit`}
                              radius="full"
                              variant="bordered"
                              startContent={<PencilLine size={15} />}
                              className="border-zinc-200 bg-white/70 font-medium text-zinc-950 dark:border-white/10 dark:bg-white/5 dark:text-white"
                            >
                              Edit
                            </Button>
                            <Button
                              radius="full"
                              color="danger"
                              variant="flat"
                              startContent={<Trash2 size={15} />}
                              isLoading={deletingEventId === event.id}
                              onPress={() => handleDeleteEvent(event)}
                              className="bg-red-50 font-medium text-red-600 dark:bg-red-500/10 dark:text-red-300"
                            >
                              Delete
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
