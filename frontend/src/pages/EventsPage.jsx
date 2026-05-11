import { Button, Card, CardBody, Chip } from "@heroui/react";
import { Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import EventCard from "../components/event/EventCard";
import EventFilters from "../components/event/EventFilters";
import EventMap from "../components/event/EventMap";
import { EventGridSkeleton, MapPanelSkeleton } from "../components/ui/LoadingSkeletons";
import { extractApiErrorMessage } from "../services/api";
import eventService from "../services/eventService";
import {
  buildEventFilterSearchParams,
  buildEventListQueryParams,
  countActiveEventFilters,
  DEFAULT_EVENT_FILTERS,
  getEventFilterOptions,
  parseEventFilterParams,
  sanitizeEventFilters,
  SORT_OPTIONS,
  TIME_FILTER_OPTIONS,
} from "../utils/eventFilters";
import { getMappableEvents } from "../utils/mapHelpers";

const EVENTS_PAGE_SIZE = 20;
const FILTER_OPTIONS_PAGE_SIZE = 50;

function areFiltersEqual(left, right) {
  return (
    left.q === right.q &&
    left.category === right.category &&
    left.city === right.city &&
    left.priceMin === right.priceMin &&
    left.priceMax === right.priceMax &&
    left.time === right.time &&
    left.sort === right.sort
  );
}

function mergeEvents(existingEvents, nextEvents) {
  const eventMap = new Map(existingEvents.map((event) => [String(event.id), event]));

  nextEvents.forEach((event) => {
    eventMap.set(String(event.id), event);
  });

  return [...eventMap.values()];
}

export default function EventsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [filterOptions, setFilterOptions] = useState({ categories: [], cities: [] });
  const [filters, setFilters] = useState(() => parseEventFilterParams(searchParams));
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: EVENTS_PAGE_SIZE,
    total: 0,
    hasMore: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loadMoreErrorMessage, setLoadMoreErrorMessage] = useState("");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [mobileView, setMobileView] = useState("list");
  const [mapVisibleEventIds, setMapVisibleEventIds] = useState(null);
  const [prioritizeByMap, setPrioritizeByMap] = useState(false);
  const eventCardRefs = useRef({});

  useEffect(() => {
    const nextFilters = sanitizeEventFilters(parseEventFilterParams(searchParams));

    setFilters((currentFilters) =>
      areFiltersEqual(currentFilters, nextFilters) ? currentFilters : nextFilters,
    );
  }, [searchParams]);

  useEffect(() => {
    const nextParams = buildEventFilterSearchParams(filters);
    const currentParams = searchParams.toString();
    const nextQueryString = nextParams.toString();

    if (currentParams !== nextQueryString) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [filters, searchParams, setSearchParams]);

  useEffect(() => {
    let ignore = false;

    async function loadFilterOptions() {
      try {
        // Temporary bootstrap for category/city selects until a dedicated /api/events/facets endpoint exists.
        const response = await eventService.getEvents({
          page: 1,
          pageSize: FILTER_OPTIONS_PAGE_SIZE,
          sort: "title_asc",
        });

        if (!ignore) {
          setFilterOptions(getEventFilterOptions(response.data?.items || []));
        }
      } catch {
        if (!ignore) {
          setFilterOptions({ categories: [], cities: [] });
        }
      }
    }

    loadFilterOptions();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadFirstPage() {
      try {
        setIsLoading(true);
        setErrorMessage("");
        setLoadMoreErrorMessage("");

        const response = await eventService.getEvents(
          buildEventListQueryParams(filters, {
            page: 1,
            pageSize: EVENTS_PAGE_SIZE,
          }),
        );

        if (!ignore) {
          setEvents(response.data?.items || []);
          setPagination({
            page: response.data?.page || 1,
            pageSize: response.data?.pageSize || EVENTS_PAGE_SIZE,
            total: response.data?.total || 0,
            hasMore: Boolean(response.data?.hasMore),
          });
        }
      } catch (error) {
        if (!ignore) {
          setEvents([]);
          setPagination({
            page: 1,
            pageSize: EVENTS_PAGE_SIZE,
            total: 0,
            hasMore: false,
          });
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

    loadFirstPage();

    return () => {
      ignore = true;
    };
  }, [filters]);

  const mappableEvents = useMemo(() => getMappableEvents(events), [events]);
  const visibleEventIds = useMemo(
    () => (mapVisibleEventIds ? new Set(mapVisibleEventIds) : null),
    [mapVisibleEventIds],
  );
  const displayedEvents = useMemo(() => {
    if (!prioritizeByMap || !visibleEventIds) {
      return events;
    }

    const eventsInMapArea = [];
    const eventsOutsideMapArea = [];

    events.forEach((event) => {
      if (visibleEventIds.has(String(event.id))) {
        eventsInMapArea.push(event);
      } else {
        eventsOutsideMapArea.push(event);
      }
    });

    return [...eventsInMapArea, ...eventsOutsideMapArea];
  }, [events, prioritizeByMap, visibleEventIds]);
  const mapAreaEventCount = useMemo(() => {
    if (!visibleEventIds) {
      return null;
    }

    return events.filter((event) => visibleEventIds.has(String(event.id))).length;
  }, [events, visibleEventIds]);
  const activeFilterCount = useMemo(
    () => countActiveEventFilters(filters),
    [filters],
  );

  useEffect(() => {
    if (
      selectedEventId &&
      !events.some((event) => event.id === selectedEventId)
    ) {
      setSelectedEventId("");
    }
  }, [events, selectedEventId]);

  useEffect(() => {
    setMapVisibleEventIds(null);
    setPrioritizeByMap(false);
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
    setPrioritizeByMap(false);
    setLoadMoreErrorMessage("");
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

  async function handleLoadMore() {
    if (isLoadingMore || !pagination.hasMore) {
      return;
    }

    try {
      setIsLoadingMore(true);
      setLoadMoreErrorMessage("");

      const nextPage = pagination.page + 1;
      const response = await eventService.getEvents(
        buildEventListQueryParams(filters, {
          page: nextPage,
          pageSize: pagination.pageSize,
        }),
      );

      setEvents((currentEvents) => mergeEvents(currentEvents, response.data?.items || []));
      setPagination({
        page: response.data?.page || nextPage,
        pageSize: response.data?.pageSize || pagination.pageSize,
        total: response.data?.total || pagination.total,
        hasMore: Boolean(response.data?.hasMore),
      });
    } catch (error) {
      setLoadMoreErrorMessage(
        extractApiErrorMessage(error, "Unable to load more events right now."),
      );
    } finally {
      setIsLoadingMore(false);
    }
  }

  const hasNoPublishedEvents = !isLoading && !errorMessage && pagination.total === 0 && activeFilterCount === 0;
  const hasNoMatchingEvents = !isLoading && !errorMessage && pagination.total === 0 && activeFilterCount > 0;

  return (
    <div className="w-full px-3 pb-20 pt-6 sm:px-4 md:px-5 md:pt-8">
      <section className="relative overflow-hidden rounded-card border border-zinc-200/70 bg-white/72 px-4 py-8 shadow-elev-2 backdrop-blur-xl dark:border-white/10 dark:bg-white/4 dark:shadow-elev-2-dark md:px-6 md:py-10">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-0 top-0 h-52 w-52 rounded-full bg-sky-200/40 blur-3xl dark:bg-sky-500/10" />
          <div className="absolute right-0 top-8 h-56 w-56 rounded-full bg-emerald-200/30 blur-3xl dark:bg-emerald-500/10" />
        </div>

        <div className="relative space-y-4">
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
      </section>

      <section className="mt-6">
        <EventFilters
          filters={filters}
          categories={filterOptions.categories}
          cities={filterOptions.cities}
          timeOptions={TIME_FILTER_OPTIONS}
          sortOptions={SORT_OPTIONS}
          activeFilterCount={activeFilterCount}
          onFilterChange={handleFilterChange}
          onClear={handleClearFilters}
        />
      </section>

      <section className="mt-6">
        {isLoading ? (
          <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-start">
            <div className="min-h-0">
              <EventGridSkeleton count={4} />
            </div>
            <aside className="hidden lg:block lg:sticky lg:top-24">
              <div className="lg:h-[calc(100vh-7rem)]">
                <MapPanelSkeleton />
              </div>
            </aside>
          </div>
        ) : errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            {errorMessage}
          </div>
        ) : hasNoPublishedEvents ? (
          <Card className="border border-dashed border-zinc-300 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/3">
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
        ) : hasNoMatchingEvents ? (
          <Card className="border border-dashed border-zinc-300 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/3">
            <CardBody className="gap-4 px-6 py-12 text-center">
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-zinc-950 dark:text-white">
                No events match these filters
              </h2>
              <p className="mx-auto max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
                Try adjusting your search, category, city, time, or sort filters to widen the
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
          <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-zinc-200/80 bg-white/80 p-1 dark:border-white/10 dark:bg-white/4 lg:hidden">
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

            <div
              className={`flex min-h-0 flex-col gap-4 ${
                mobileView === "map" ? "hidden lg:flex" : "flex"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 px-1 md:px-2">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  <span className="font-semibold text-zinc-950 dark:text-white">
                    {events.length}
                  </span>{" "}
                  loaded of {pagination.total}
                  <span className="mx-2 text-zinc-300 dark:text-white/20">·</span>
                  {mappableEvents.length} on map
                  {activeFilterCount > 0 ? (
                    <>
                      <span className="mx-2 text-zinc-300 dark:text-white/20">·</span>
                      {activeFilterCount} {activeFilterCount === 1 ? "filter" : "filters"}
                    </>
                  ) : null}
                </p>
                <Button
                  size="sm"
                  radius="full"
                  variant={prioritizeByMap ? "solid" : "bordered"}
                  onPress={() => setPrioritizeByMap((value) => !value)}
                  className={
                    prioritizeByMap
                      ? "h-8 bg-zinc-950 text-xs font-semibold text-white dark:bg-white dark:text-zinc-950"
                      : "h-8 border-zinc-200 bg-white/80 text-xs font-semibold text-zinc-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200"
                  }
                >
                  {prioritizeByMap && mapAreaEventCount !== null
                    ? `Map area: ${mapAreaEventCount} in view`
                    : "Sort by map area"}
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                {displayedEvents.map((event) => (
                  <div
                    key={event.id}
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

              {pagination.hasMore ? (
                <div className="space-y-3 pt-2">
                  <div className="flex justify-center">
                    <Button
                      radius="full"
                      onPress={handleLoadMore}
                      isLoading={isLoadingMore}
                      className="bg-zinc-950 px-6 text-white dark:bg-white dark:text-zinc-950"
                    >
                      Load more
                    </Button>
                  </div>
                  {loadMoreErrorMessage ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                      {loadMoreErrorMessage}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <aside
              className={`${
                mobileView === "list" ? "hidden lg:block" : "block"
              } w-full self-start lg:sticky lg:top-24`}
            >
              <EventMap
                events={events}
                selectedEventId={selectedEventId}
                focusEventId={selectedEventId}
                onSelectEvent={handleMarkerSelect}
                onHoverEvent={(eventId) => handleSelectEvent(eventId)}
                onViewportEventIdsChange={handleMapViewportEventIdsChange}
                className="h-[60vh] lg:h-[calc(100vh-7rem)]"
              />
            </aside>
          </div>
        )}
      </section>
    </div>
  );
}
