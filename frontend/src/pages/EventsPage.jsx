import { Button, Card, CardBody, Chip, Spinner } from "@heroui/react";
import { CalendarDays, MapPin, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import EventCard from "../components/event/EventCard";
import EventFilters from "../components/event/EventFilters";
import EventMap from "../components/event/EventMap";
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
import { getMappableEvents } from "../utils/mapHelpers";

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
  const [selectedEventId, setSelectedEventId] = useState("");
  const [mobileView, setMobileView] = useState("list");
  const [mapVisibleEventIds, setMapVisibleEventIds] = useState(null);
  const eventCardRefs = useRef({});

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
    if (isLoading) {
      return;
    }

    const nextFilters = sanitizeEventFilters(parseEventFilterParams(searchParams), filterOptions);

    setFilters((currentFilters) =>
      areFiltersEqual(currentFilters, nextFilters) ? currentFilters : nextFilters,
    );
  }, [filterOptions, isLoading, searchParams]);

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

  const mappableEvents = useMemo(() => getMappableEvents(filteredEvents), [filteredEvents]);
  const visibleEventIds = useMemo(
    () => (mapVisibleEventIds ? new Set(mapVisibleEventIds) : null),
    [mapVisibleEventIds],
  );
  const displayedEvents = useMemo(() => {
    if (!visibleEventIds) {
      return filteredEvents;
    }

    const eventsInMapArea = [];
    const eventsOutsideMapArea = [];

    filteredEvents.forEach((event) => {
      if (visibleEventIds.has(String(event.id))) {
        eventsInMapArea.push(event);
      } else {
        eventsOutsideMapArea.push(event);
      }
    });

    return [...eventsInMapArea, ...eventsOutsideMapArea];
  }, [filteredEvents, visibleEventIds]);
  const mapAreaEventCount = useMemo(() => {
    if (!visibleEventIds) {
      return null;
    }

    return filteredEvents.filter((event) => visibleEventIds.has(String(event.id))).length;
  }, [filteredEvents, visibleEventIds]);
  const isMapAreaPrioritized = Boolean(visibleEventIds);

  const featuredCities = useMemo(() => {
    return Array.from(
      new Set(displayedEvents.map((event) => event.city).filter(Boolean)),
    ).slice(0, 3);
  }, [displayedEvents]);

  const upcomingCount = useMemo(
    () => displayedEvents.filter((event) => isUpcomingEvent(event.event_date)).length,
    [displayedEvents],
  );

  const activeFilterCount = useMemo(
    () => countActiveEventFilters(filters),
    [filters],
  );

  useEffect(() => {
    if (
      selectedEventId &&
      !filteredEvents.some((event) => event.id === selectedEventId)
    ) {
      setSelectedEventId("");
    }
  }, [filteredEvents, selectedEventId]);

  useEffect(() => {
    setMapVisibleEventIds(null);
  }, [filters]);

  function handleFilterChange(field, value) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [field]: value,
    }));
  }

  function handleClearFilters() {
    setFilters(DEFAULT_EVENT_FILTERS);
    setMapVisibleEventIds(null);
  }

  function handleSelectEvent(eventId, { scrollToCard = false } = {}) {
    setSelectedEventId(eventId);

    if (!scrollToCard) {
      return;
    }

    window.requestAnimationFrame(() => {
      eventCardRefs.current[eventId]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }

  function handleMarkerSelect(eventId) {
    const canScrollToCard =
      typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;

    handleSelectEvent(eventId, { scrollToCard: canScrollToCard });
  }

  function handleMapViewportEventIdsChange(eventIds) {
    setMapVisibleEventIds(eventIds);
  }

  function handleClearMapPriority() {
    setMapVisibleEventIds(null);
  }

  return (
    <div className="w-full px-3 pb-20 pt-6 sm:px-4 md:px-5 md:pt-8">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-zinc-200/70 bg-white/72 px-4 py-10 shadow-[0_24px_70px_rgba(148,163,184,0.14)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_24px_70px_rgba(2,6,23,0.4)] md:px-6 md:py-12">
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
                  {displayedEvents.length}
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
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1 md:px-2">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {displayedEvents.length === 1
                ? "1 event matches your current view."
                : `${displayedEvents.length} events match your current view.`}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {isMapAreaPrioritized ? (
                <Button
                  size="sm"
                  radius="full"
                  variant="bordered"
                  onPress={handleClearMapPriority}
                  className="h-8 border-zinc-200 bg-white/80 text-xs font-semibold text-zinc-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-200"
                >
                  Reset map priority
                </Button>
              ) : null}
              {mapAreaEventCount !== null ? (
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  {mapAreaEventCount} prioritized
                </p>
              ) : null}
              {filteredEvents.length > 0 ? (
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  {mappableEvents.length} on map
                </p>
              ) : null}
              {activeFilterCount > 0 ? (
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  {activeFilterCount} active filter{activeFilterCount > 1 ? "s" : ""}
                </p>
              ) : null}
            </div>
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
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-zinc-200/80 bg-white/80 p-1 dark:border-white/10 dark:bg-white/[0.04] lg:hidden">
              {["list", "map"].map((view) => (
                <Button
                  key={view}
                  radius="lg"
                  variant={mobileView === view ? "solid" : "light"}
                  onPress={() => setMobileView(view)}
                  className={
                    mobileView === view
                      ? "bg-zinc-950 font-medium capitalize text-white dark:bg-white dark:text-zinc-950"
                      : "font-medium capitalize text-zinc-600 dark:text-zinc-300"
                  }
                >
                  {view}
                </Button>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.85fr)]">
              <div className={mobileView === "map" ? "hidden lg:block" : "block"}>
                <div className="columns-1 gap-6 md:columns-2 lg:columns-1 xl:columns-2">
                  {displayedEvents.map((event) => (
                    <div
                      key={event.id}
                      className="mb-6 break-inside-avoid"
                      ref={(node) => {
                        if (node) {
                          eventCardRefs.current[event.id] = node;
                        } else {
                          delete eventCardRefs.current[event.id];
                        }
                      }}
                    >
                      <EventCard
                        event={event}
                        isSelected={event.id === selectedEventId}
                        onSelect={(eventId) => handleSelectEvent(eventId)}
                        onHover={(eventId) => handleSelectEvent(eventId)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <aside
                className={`${
                  mobileView === "list" ? "hidden lg:block" : "block"
                } lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)]`}
              >
                <EventMap
                  events={filteredEvents}
                  selectedEventId={selectedEventId}
                  onSelectEvent={handleMarkerSelect}
                  onViewportEventIdsChange={handleMapViewportEventIdsChange}
                  className="h-[72vh] lg:h-full"
                />
              </aside>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
