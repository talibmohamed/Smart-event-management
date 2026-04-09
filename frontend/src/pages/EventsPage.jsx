import { Card, CardBody, Chip, Spinner } from "@heroui/react";
import { CalendarDays, MapPin, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import EventCard from "../components/event/EventCard";
import EventFilters from "../components/event/EventFilters";
import { extractApiErrorMessage } from "../services/api";
import eventService from "../services/eventService";
import {
  buildEventFilterSearchParams,
  countActiveEventFilters,
  DEFAULT_EVENT_FILTERS,
  getEventFilterOptions,
  getFilteredAndSortedEvents,
  parseEventFilterParams,
  PRICE_FILTER_OPTIONS,
  sanitizeEventFilters,
  SORT_OPTIONS,
  TIME_FILTER_OPTIONS,
} from "../utils/eventFilters";
import { isUpcomingEvent } from "../utils/eventUtils";

function areFiltersEqual(left, right) {
  return (
    left.q === right.q &&
    left.category === right.category &&
    left.city === right.city &&
    left.price === right.price &&
    left.time === right.time &&
    left.sort === right.sort
  );
}

export default function EventsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [allEvents, setAllEvents] = useState([]);
  const [filters, setFilters] = useState(() => parseEventFilterParams(searchParams));
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadEvents() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const response = await eventService.getEvents();

        if (!ignore) {
          setAllEvents(response.data.data || []);
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(
            extractApiErrorMessage(error, "Unable to load events right now."),
          );
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadEvents();

    return () => {
      ignore = true;
    };
  }, []);

  const filterOptions = useMemo(() => getEventFilterOptions(allEvents), [allEvents]);

  useEffect(() => {
    const nextFilters = sanitizeEventFilters(parseEventFilterParams(searchParams), filterOptions);

    setFilters((currentFilters) =>
      areFiltersEqual(currentFilters, nextFilters) ? currentFilters : nextFilters,
    );
  }, [filterOptions, searchParams]);

  useEffect(() => {
    const nextParams = buildEventFilterSearchParams(filters);
    const currentParams = searchParams.toString();
    const nextQueryString = nextParams.toString();

    if (currentParams !== nextQueryString) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [filters, searchParams, setSearchParams]);

  const filteredEvents = useMemo(
    () => getFilteredAndSortedEvents(allEvents, filters),
    [allEvents, filters],
  );

  const featuredCities = useMemo(() => {
    return Array.from(
      new Set(filteredEvents.map((event) => event.city).filter(Boolean)),
    ).slice(0, 3);
  }, [filteredEvents]);

  const upcomingCount = useMemo(
    () => filteredEvents.filter((event) => isUpcomingEvent(event.event_date)).length,
    [filteredEvents],
  );

  const activeFilterCount = useMemo(
    () => countActiveEventFilters(filters),
    [filters],
  );

  function handleFilterChange(field, value) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [field]: value,
    }));
  }

  function handleClearFilters() {
    setFilters(DEFAULT_EVENT_FILTERS);
  }

  return (
    <div className="mx-auto max-w-7xl px-6 pb-20 pt-12 md:pt-16">
      <section className="relative overflow-hidden rounded-[2rem] border border-zinc-200/70 bg-white/72 px-6 py-10 shadow-[0_24px_70px_rgba(148,163,184,0.14)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_24px_70px_rgba(2,6,23,0.4)] md:px-8 md:py-12">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-0 top-0 h-52 w-52 rounded-full bg-sky-200/40 blur-3xl dark:bg-sky-500/10" />
          <div className="absolute right-0 top-8 h-56 w-56 rounded-full bg-emerald-200/30 blur-3xl dark:bg-emerald-500/10" />
        </div>

        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Chip
                variant="flat"
                className="border border-zinc-200 bg-white/85 text-zinc-700 dark:border-white/10 dark:bg-white/8 dark:text-zinc-200"
              >
                Events directory
              </Chip>
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:border-white/10 dark:bg-white/6 dark:text-zinc-400">
                <Sparkles size={13} />
                Live backend data
              </div>
            </div>

            <div>
              <h1 className="text-4xl font-semibold tracking-[-0.05em] text-zinc-950 dark:text-white md:text-5xl">
                Browse what's happening next.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-400 md:text-base">
                Explore the current event catalog, compare formats, and open full event details
                before booking or managing your schedule.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="border border-zinc-200/80 bg-white/84 dark:border-white/10 dark:bg-white/[0.05]">
              <CardBody className="gap-2 px-4 py-4">
                <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  Showing
                </span>
                <span className="text-3xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-white">
                  {filteredEvents.length}
                </span>
              </CardBody>
            </Card>

            <Card className="border border-zinc-200/80 bg-white/84 dark:border-white/10 dark:bg-white/[0.05]">
              <CardBody className="gap-2 px-4 py-4">
                <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  Upcoming
                </span>
                <span className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  <CalendarDays size={15} />
                  {upcomingCount} events
                </span>
              </CardBody>
            </Card>

            <Card className="border border-zinc-200/80 bg-white/84 dark:border-white/10 dark:bg-white/[0.05]">
              <CardBody className="gap-2 px-4 py-4">
                <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  Cities
                </span>
                <span className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  <MapPin size={15} />
                  {featuredCities.join(" | ") || "TBD"}
                </span>
              </CardBody>
            </Card>
          </div>
        </div>
      </section>

      <section className="mt-6">
        <EventFilters
          filters={filters}
          categories={filterOptions.categories}
          cities={filterOptions.cities}
          priceOptions={PRICE_FILTER_OPTIONS}
          timeOptions={TIME_FILTER_OPTIONS}
          sortOptions={SORT_OPTIONS}
          activeFilterCount={activeFilterCount}
          onFilterChange={handleFilterChange}
          onClear={handleClearFilters}
        />
      </section>

      <section className="mt-6">
        {!isLoading && !errorMessage && allEvents.length > 0 ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {filteredEvents.length === 1
                ? "1 event matches your current view."
                : `${filteredEvents.length} events match your current view.`}
            </p>
            {activeFilterCount > 0 ? (
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                {activeFilterCount} active filter{activeFilterCount > 1 ? "s" : ""}
              </p>
            ) : null}
          </div>
        ) : null}

        {isLoading ? (
          <Card className="border border-zinc-200/80 bg-white/84 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <CardBody className="flex flex-row items-center justify-center gap-3 px-6 py-14 text-zinc-600 dark:text-zinc-400">
              <Spinner size="sm" color="default" />
              <span className="text-sm">Loading events...</span>
            </CardBody>
          </Card>
        ) : errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            {errorMessage}
          </div>
        ) : allEvents.length === 0 ? (
          <Card className="border border-dashed border-zinc-300 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            <CardBody className="gap-3 px-6 py-12 text-center">
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-zinc-950 dark:text-white">
                No events published yet
              </h2>
              <p className="mx-auto max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
                Once organizers publish events, they will appear here for attendees and admins to
                explore.
              </p>
            </CardBody>
          </Card>
        ) : filteredEvents.length === 0 ? (
          <Card className="border border-dashed border-zinc-300 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            <CardBody className="gap-4 px-6 py-12 text-center">
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-zinc-950 dark:text-white">
                No events match these filters
              </h2>
              <p className="mx-auto max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
                Try adjusting your search, category, city, price, or time filters to widen the
                results.
              </p>
              <div>
                <Chip
                  variant="flat"
                  className="border border-zinc-200 bg-white/85 text-zinc-700 dark:border-white/10 dark:bg-white/8 dark:text-zinc-200"
                >
                  {activeFilterCount} active filter{activeFilterCount > 1 ? "s" : ""}
                </Chip>
              </div>
            </CardBody>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
