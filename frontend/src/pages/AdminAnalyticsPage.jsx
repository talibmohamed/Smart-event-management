import { ThemeProvider, createTheme } from "@mui/material/styles";
import { BarChart } from "@mui/x-charts/BarChart";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Input,
  Select,
  SelectItem,
} from "@heroui/react";
import { BarChart3, CalendarRange, Trophy, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import adminAnalyticsService from "../services/adminAnalyticsService";
import { extractApiErrorMessage } from "../services/api";

const METRIC_OPTIONS = [
  { value: "bookings_created", label: "Bookings created" },
  { value: "revenue", label: "Revenue" },
  { value: "users_created", label: "Users created" },
  { value: "events_created", label: "Events created" },
];

const EVENT_SORT_OPTIONS = [
  { value: "revenue", label: "Revenue" },
  { value: "bookings", label: "Bookings" },
];

const ORGANIZER_SORT_OPTIONS = [
  { value: "revenue", label: "Revenue" },
  { value: "events", label: "Events" },
  { value: "bookings", label: "Bookings" },
];

function toDateInputValue(date) {
  return date.toISOString().slice(0, 10);
}

function getDefaultRange() {
  const to = new Date();
  const from = new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000);

  return {
    from: toDateInputValue(from),
    to: toDateInputValue(to),
  };
}

function formatInteger(value) {
  return new Intl.NumberFormat("en-US").format(Number(value || 0));
}

function formatCents(value, currency = "eur") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "eur",
    minimumFractionDigits: 2,
  }).format(Number(value || 0) / 100);
}

function formatDate(value) {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function getSelectClassNames() {
  return {
    trigger:
      "h-12 rounded-2xl border border-zinc-200 bg-white/88 px-4 shadow-none data-[hover=true]:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:data-[hover=true]:bg-white/[0.08]",
    value: "text-sm font-medium text-zinc-900 dark:text-zinc-50",
    popoverContent:
      "rounded-2xl border border-zinc-200 bg-white/95 p-1 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/95",
  };
}

function SectionError({ message }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
      {message}
    </div>
  );
}

function LoadingBlock({ label = "Loading..." }) {
  return (
    <Card className="border border-zinc-200/80 bg-white/88 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <CardBody className="px-6 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
        {label}
      </CardBody>
    </Card>
  );
}

function SummaryCard({ label, value }) {
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

function useScopedMuiTheme() {
  const [mode, setMode] = useState(() =>
    document.documentElement.classList.contains("dark") ? "dark" : "light",
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setMode(document.documentElement.classList.contains("dark") ? "dark" : "light");
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return useMemo(() => {
    const styles = getComputedStyle(document.documentElement);
    const readColor = (name, fallback) => styles.getPropertyValue(name).trim() || fallback;
    const readMuiColor = (name, fallback) => {
      const value = readColor(name, fallback);

      return /^(#|rgb\(|rgba\(|hsl\(|hsla\(|color\()/i.test(value) ? value : fallback;
    };
    const isDark = mode === "dark";

    return createTheme({
      palette: {
        mode,
        background: {
          default: isDark ? readMuiColor("--color-zinc-950", "#09090c") : "#ffffff",
          paper: isDark ? readMuiColor("--color-zinc-950", "#09090c") : "#ffffff",
        },
        text: {
          primary: isDark ? readMuiColor("--color-zinc-100", "#f4f4f5") : readMuiColor("--color-zinc-950", "#09090b"),
          secondary: isDark ? readMuiColor("--color-zinc-400", "#a1a1aa") : readMuiColor("--color-zinc-500", "#71717a"),
        },
        primary: {
          main: readMuiColor("--color-sky-500", "#0ea5e9"),
        },
        divider: isDark ? "rgba(255,255,255,0.10)" : "rgba(24,24,27,0.10)",
      },
      typography: {
        fontFamily:
          '"Inter Variable", Inter, system-ui, -apple-system, "Segoe UI", sans-serif',
      },
      shape: {
        borderRadius: 18,
      },
    });
  }, [mode]);
}

function AnalyticsChart({ points, metric }) {
  const theme = useScopedMuiTheme();
  const metricLabel = METRIC_OPTIONS.find((option) => option.value === metric)?.label || metric;

  if (!points.length) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500 dark:border-white/10 dark:text-zinc-400">
        No points returned for this range.
      </div>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <div className="rounded-3xl border border-zinc-200/80 bg-white/80 p-2 dark:border-white/10 dark:bg-white/[0.03]">
        <BarChart
          height={320}
          dataset={points}
          xAxis={[
            {
              scaleType: "band",
              dataKey: "date",
              tickLabelStyle: {
                fontSize: 11,
              },
            },
          ]}
          yAxis={[
            {
              tickLabelStyle: {
                fontSize: 11,
              },
            },
          ]}
          series={[
            {
              dataKey: "value",
              label: metricLabel,
              color: "#0ea5e9",
              valueFormatter: (value) =>
                metric === "revenue" ? formatCents(value, "eur") : formatInteger(value),
            },
          ]}
          grid={{ horizontal: true }}
          margin={{ top: 24, right: 20, bottom: 54, left: 70 }}
          slotProps={{
            legend: {
              hidden: true,
            },
          }}
        />
      </div>
    </ThemeProvider>
  );
}

export default function AdminAnalyticsPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const defaultRange = useMemo(getDefaultRange, []);
  const [summary, setSummary] = useState(null);
  const [summaryError, setSummaryError] = useState("");
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [metric, setMetric] = useState("bookings_created");
  const [dateRange, setDateRange] = useState(defaultRange);
  const [timeseries, setTimeseries] = useState([]);
  const [timeseriesError, setTimeseriesError] = useState("");
  const [isTimeseriesLoading, setIsTimeseriesLoading] = useState(true);
  const [eventSort, setEventSort] = useState("revenue");
  const [topEvents, setTopEvents] = useState([]);
  const [topEventsError, setTopEventsError] = useState("");
  const [isTopEventsLoading, setIsTopEventsLoading] = useState(true);
  const [organizerSort, setOrganizerSort] = useState("revenue");
  const [topOrganizers, setTopOrganizers] = useState([]);
  const [topOrganizersError, setTopOrganizersError] = useState("");
  const [isTopOrganizersLoading, setIsTopOrganizersLoading] = useState(true);

  function handleAuthError(error) {
    if (error.response?.status === 401) {
      logout();
      navigate("/login", {
        replace: true,
        state: { from: `${location.pathname}${location.search}` },
      });
      return true;
    }

    return false;
  }

  useEffect(() => {
    let ignore = false;

    async function loadSummary() {
      try {
        setIsSummaryLoading(true);
        setSummaryError("");
        const response = await adminAnalyticsService.getSummary();

        if (!ignore) {
          setSummary(response.data.data);
        }
      } catch (error) {
        if (!ignore && !handleAuthError(error)) {
          setSummaryError(extractApiErrorMessage(error, "Unable to load analytics summary."));
        }
      } finally {
        if (!ignore) {
          setIsSummaryLoading(false);
        }
      }
    }

    loadSummary();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadTimeseries() {
      try {
        setIsTimeseriesLoading(true);
        setTimeseriesError("");
        const response = await adminAnalyticsService.getTimeseries({
          metric,
          from: dateRange.from,
          to: dateRange.to,
        });

        if (!ignore) {
          setTimeseries(response.data.data?.points || []);
        }
      } catch (error) {
        if (!ignore && !handleAuthError(error)) {
          setTimeseries([]);
          setTimeseriesError(extractApiErrorMessage(error, "Unable to load timeseries."));
        }
      } finally {
        if (!ignore) {
          setIsTimeseriesLoading(false);
        }
      }
    }

    loadTimeseries();

    return () => {
      ignore = true;
    };
  }, [dateRange.from, dateRange.to, metric]);

  useEffect(() => {
    let ignore = false;

    async function loadTopEvents() {
      try {
        setIsTopEventsLoading(true);
        setTopEventsError("");
        const response = await adminAnalyticsService.getTopEvents({
          sortBy: eventSort,
          limit: 10,
        });

        if (!ignore) {
          setTopEvents(response.data.data?.items || []);
        }
      } catch (error) {
        if (!ignore && !handleAuthError(error)) {
          setTopEvents([]);
          setTopEventsError(extractApiErrorMessage(error, "Unable to load top events."));
        }
      } finally {
        if (!ignore) {
          setIsTopEventsLoading(false);
        }
      }
    }

    loadTopEvents();

    return () => {
      ignore = true;
    };
  }, [eventSort]);

  useEffect(() => {
    let ignore = false;

    async function loadTopOrganizers() {
      try {
        setIsTopOrganizersLoading(true);
        setTopOrganizersError("");
        const response = await adminAnalyticsService.getTopOrganizers({
          sortBy: organizerSort,
          limit: 10,
        });

        if (!ignore) {
          setTopOrganizers(response.data.data?.items || []);
        }
      } catch (error) {
        if (!ignore && !handleAuthError(error)) {
          setTopOrganizers([]);
          setTopOrganizersError(extractApiErrorMessage(error, "Unable to load top organizers."));
        }
      } finally {
        if (!ignore) {
          setIsTopOrganizersLoading(false);
        }
      }
    }

    loadTopOrganizers();

    return () => {
      ignore = true;
    };
  }, [organizerSort]);

  const summaryCards = summary
    ? [
        { label: "Total users", value: formatInteger(summary.users.total) },
        { label: "Upcoming events", value: formatInteger(summary.events.upcoming) },
        { label: "Confirmed bookings", value: formatInteger(summary.bookings.confirmed) },
        {
          label: "Total revenue",
          value: formatCents(summary.revenue.totalCents, summary.revenue.currency),
        },
        { label: "New users 30d", value: formatInteger(summary.users.newLast30Days) },
        {
          label: "Revenue 30d",
          value: formatCents(summary.revenue.last30DaysCents, summary.revenue.currency),
        },
      ]
    : [];

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
      <div className="space-y-8">
        <section className="relative overflow-hidden rounded-section border border-zinc-200/70 bg-white/72 px-6 py-10 shadow-elev-2 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] md:px-8 md:py-12">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-10 top-0 h-56 w-56 rounded-full bg-sky-200/40 blur-3xl dark:bg-sky-500/10" />
            <div className="absolute right-0 top-10 h-56 w-56 rounded-full bg-emerald-200/35 blur-3xl dark:bg-emerald-500/10" />
          </div>
          <div className="relative space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-400">
              <BarChart3 size={14} />
              Platform analytics
            </div>
            <div>
              <h1 className="text-4xl font-semibold tracking-[-0.05em] text-zinc-950 dark:text-white">
                Quickseat performance
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                Platform-wide users, events, bookings, revenue trends, and top leaderboards.
                Backend computes every number; this page only renders the API results.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
            <UsersRound size={16} />
            Summary
          </div>
          {isSummaryLoading ? (
            <LoadingBlock label="Loading summary..." />
          ) : summaryError ? (
            <SectionError message={summaryError} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {summaryCards.map((card) => (
                <SummaryCard key={card.label} label={card.label} value={card.value} />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <Card className="border border-zinc-200/80 bg-white/88 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <CardHeader className="flex flex-col items-start gap-4 px-5 pt-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  <CalendarRange size={16} />
                  Time series
                </div>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  Daily UTC buckets. Missing days are returned as zero by the backend.
                </p>
              </div>
              <div className="grid w-full gap-3 sm:grid-cols-3 lg:w-auto">
                <Select
                  aria-label="Metric"
                  selectedKeys={[metric]}
                  onSelectionChange={(keys) => setMetric(Array.from(keys)[0] || "bookings_created")}
                  radius="lg"
                  variant="bordered"
                  classNames={getSelectClassNames()}
                >
                  {METRIC_OPTIONS.map((option) => (
                    <SelectItem key={option.value} textValue={option.label}>
                      {option.label}
                    </SelectItem>
                  ))}
                </Select>
                <Input
                  aria-label="From date"
                  type="date"
                  value={dateRange.from}
                  onValueChange={(value) => setDateRange((current) => ({ ...current, from: value }))}
                  radius="lg"
                  variant="bordered"
                  classNames={{
                    inputWrapper:
                      "h-12 rounded-2xl border border-zinc-200 bg-white/88 shadow-none dark:border-white/10 dark:bg-white/[0.06]",
                  }}
                />
                <Input
                  aria-label="To date"
                  type="date"
                  value={dateRange.to}
                  onValueChange={(value) => setDateRange((current) => ({ ...current, to: value }))}
                  radius="lg"
                  variant="bordered"
                  classNames={{
                    inputWrapper:
                      "h-12 rounded-2xl border border-zinc-200 bg-white/88 shadow-none dark:border-white/10 dark:bg-white/[0.06]",
                  }}
                />
              </div>
            </CardHeader>
            <CardBody>
              {isTimeseriesLoading ? (
                <div className="rounded-2xl border border-zinc-200/80 px-4 py-20 text-center text-sm text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                  Loading chart...
                </div>
              ) : timeseriesError ? (
                <SectionError message={timeseriesError} />
              ) : (
                <AnalyticsChart points={timeseries} metric={metric} />
              )}
            </CardBody>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Card className="border border-zinc-200/80 bg-white/88 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <CardHeader className="flex flex-col items-start gap-4 px-5 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  <Trophy size={16} />
                  Top events
                </div>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  Confirmed bookings and confirmed paid revenue.
                </p>
              </div>
              <Select
                aria-label="Top events sort"
                selectedKeys={[eventSort]}
                onSelectionChange={(keys) => setEventSort(Array.from(keys)[0] || "revenue")}
                radius="lg"
                variant="bordered"
                className="w-full sm:w-48"
                classNames={getSelectClassNames()}
              >
                {EVENT_SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} textValue={option.label}>
                    {option.label}
                  </SelectItem>
                ))}
              </Select>
            </CardHeader>
            <CardBody>
              {isTopEventsLoading ? (
                <LoadingBlock label="Loading top events..." />
              ) : topEventsError ? (
                <SectionError message={topEventsError} />
              ) : topEvents.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                  No events yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {topEvents.map((event, index) => (
                    <div
                      key={event.eventId}
                      className="rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-zinc-950 dark:text-white">
                            {index + 1}. {event.title}
                          </p>
                          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            {event.organizerName || "Organizer"} | {formatDate(event.eventDate)}
                          </p>
                        </div>
                        <Chip className="border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300">
                          {formatCents(event.revenueCents, event.currency)}
                        </Chip>
                      </div>
                      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                        {formatInteger(event.bookingsCount)} confirmed bookings
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Card className="border border-zinc-200/80 bg-white/88 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <CardHeader className="flex flex-col items-start gap-4 px-5 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  <Trophy size={16} />
                  Top organizers
                </div>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  Ranked by platform activity.
                </p>
              </div>
              <Select
                aria-label="Top organizers sort"
                selectedKeys={[organizerSort]}
                onSelectionChange={(keys) => setOrganizerSort(Array.from(keys)[0] || "revenue")}
                radius="lg"
                variant="bordered"
                className="w-full sm:w-48"
                classNames={getSelectClassNames()}
              >
                {ORGANIZER_SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} textValue={option.label}>
                    {option.label}
                  </SelectItem>
                ))}
              </Select>
            </CardHeader>
            <CardBody>
              {isTopOrganizersLoading ? (
                <LoadingBlock label="Loading top organizers..." />
              ) : topOrganizersError ? (
                <SectionError message={topOrganizersError} />
              ) : topOrganizers.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                  No organizers yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {topOrganizers.map((organizer, index) => (
                    <div
                      key={organizer.organizerId}
                      className="rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-zinc-950 dark:text-white">
                            {index + 1}. {organizer.name || "Organizer"}
                          </p>
                          <p className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
                            {organizer.email}
                          </p>
                        </div>
                        <Chip className="border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                          {formatCents(organizer.revenueCents, organizer.currency)}
                        </Chip>
                      </div>
                      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                        {formatInteger(organizer.eventsCount)} events |{" "}
                        {formatInteger(organizer.bookingsCount)} confirmed bookings
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </section>
      </div>
    </div>
  );
}
