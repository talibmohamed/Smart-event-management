import { Button, Card, CardBody, CardHeader, Chip, Select, SelectItem, Spinner } from "@heroui/react";
import { ArrowLeft, CalendarDays, Mail, Ticket, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { extractApiErrorMessage } from "../services/api";
import eventService from "../services/eventService";
import { formatBookingAmount } from "../utils/bookingUtils";
import { formatEventDate } from "../utils/eventUtils";

const STATUS_FILTERS = [
  { value: "confirmed", label: "Confirmed" },
  { value: "pending_payment", label: "Pending payment" },
  { value: "cancelled", label: "Cancelled" },
  { value: "all", label: "All" },
];

function getStatusTone(status) {
  if (status === "confirmed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300";
  }

  if (status === "pending_payment") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300";
  }

  return "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-white/10 dark:bg-white/10 dark:text-zinc-300";
}

function getPaymentTone(paymentStatus) {
  if (paymentStatus === "paid") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300";
  }

  if (paymentStatus === "unpaid") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300";
  }

  if (["failed", "expired"].includes(paymentStatus)) {
    return "border-red-200 bg-red-50 text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300";
  }

  return "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-white/10 dark:bg-white/10 dark:text-zinc-300";
}

function formatPersonName(attendee = {}) {
  return [attendee.first_name, attendee.last_name].filter(Boolean).join(" ") || "Attendee";
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

function AttendeeItems({ attendee }) {
  if (!Array.isArray(attendee.items) || attendee.items.length === 0) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Ticket details are unavailable for this attendee.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {attendee.items.map((item) => (
        <div
          key={item.ticket_tier_id}
          className="flex flex-col gap-1 rounded-xl bg-zinc-50/90 px-3 py-2 dark:bg-white/[0.04] sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="font-medium text-zinc-900 dark:text-zinc-100">
              {item.ticket_tier_name || "Ticket tier"}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {item.quantity} x {formatBookingAmount(item.unit_price, "eur")}
            </p>
          </div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {formatBookingAmount(item.total_price, "eur")}
          </p>
        </div>
      ))}
    </div>
  );
}

function ErrorState({ title, message }) {
  return (
    <Card className="border border-zinc-200/80 bg-white/88 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <CardBody className="gap-4 px-6 py-10 text-center">
        <h1 className="text-3xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-white">
          {title}
        </h1>
        <p className="mx-auto max-w-xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          {message}
        </p>
        <div className="flex justify-center">
          <Button
            as={RouterLink}
            to="/dashboard"
            radius="full"
            className="bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
          >
            Back to dashboard
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

export default function EventAttendeesPage() {
  const { id } = useParams();
  const [statusFilter, setStatusFilter] = useState("confirmed");
  const [event, setEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [errorStatus, setErrorStatus] = useState(null);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function handleStatusSelectionChange(keys) {
    const selectedKey = Array.from(keys)[0];

    if (selectedKey) {
      setStatusFilter(selectedKey);
    }
  }

  useEffect(() => {
    let ignore = false;

    async function loadAttendees() {
      try {
        setIsLoading(true);
        setErrorMessage("");
        setErrorStatus(null);

        const response = await eventService.getEventAttendees(id, statusFilter);
        const payload = response.data.data || {};

        if (!ignore) {
          setEvent(payload.event || null);
          setAttendees(payload.attendees || []);
        }
      } catch (error) {
        if (ignore) {
          return;
        }

        const status = error.response?.status;

        if (status === 401) {
          logout();
          navigate("/login", {
            replace: true,
            state: { from: `${location.pathname}${location.search}` },
          });
          return;
        }

        if (status === 400) {
          setErrorMessage(extractApiErrorMessage(error, "Invalid attendee status filter."));
          setErrorStatus(status);
          setStatusFilter("confirmed");
          return;
        }

        setAttendees([]);
        setErrorStatus(status || "network");
        setErrorMessage(extractApiErrorMessage(error, "Unable to load attendees right now."));
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadAttendees();

    return () => {
      ignore = true;
    };
  }, [id, location.pathname, location.search, logout, navigate, statusFilter]);

  const attendeeStats = useMemo(() => {
    return attendees.reduce(
      (stats, attendee) => {
        const quantity = Number(attendee.total_quantity);
        const price = Number(attendee.total_price);

        return {
          totalBookings: stats.totalBookings + 1,
          totalTickets: stats.totalTickets + (Number.isFinite(quantity) ? quantity : 0),
          totalRevenue: stats.totalRevenue + (Number.isFinite(price) ? price : 0),
        };
      },
      { totalBookings: 0, totalTickets: 0, totalRevenue: 0 },
    );
  }, [attendees]);

  if (errorStatus === 403) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12 md:py-16">
        <ErrorState
          title="Access denied"
          message={errorMessage || "You can only view attendees for events you manage."}
        />
      </div>
    );
  }

  if (errorStatus === 404) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12 md:py-16">
        <ErrorState
          title="Event not found"
          message={errorMessage || "This event does not exist or is no longer available."}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
      <div className="space-y-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-zinc-200/70 bg-white/72 px-6 py-10 shadow-[0_24px_70px_rgba(148,163,184,0.14)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_24px_70px_rgba(2,6,23,0.4)] md:px-8 md:py-12">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-8 top-0 h-48 w-48 rounded-full bg-sky-200/40 blur-3xl dark:bg-sky-500/10" />
            <div className="absolute right-0 top-10 h-56 w-56 rounded-full bg-emerald-200/35 blur-3xl dark:bg-emerald-500/10" />
          </div>

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <Button
                as={RouterLink}
                to="/dashboard"
                radius="full"
                variant="light"
                startContent={<ArrowLeft size={15} />}
                className="px-0 text-zinc-600 dark:text-zinc-300"
              >
                Back to dashboard
              </Button>

              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-400">
                <UsersRound size={14} />
                Attendee management
              </div>

              <div>
                <h1 className="text-4xl font-semibold tracking-[-0.05em] text-zinc-950 dark:text-white">
                  {event?.title || "Event attendees"}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                  Review attendee identity, booking state, payment state, and ticket tier details
                  for this event.
                </p>
              </div>
            </div>

            <div className="w-full max-w-xs">
              <label
                htmlFor="attendee-status"
                className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400"
              >
                Status filter
              </label>
              <Select
                aria-label="Status filter"
                selectedKeys={[statusFilter]}
                onSelectionChange={handleStatusSelectionChange}
                radius="lg"
                variant="bordered"
                classNames={{
                  trigger:
                    "h-12 rounded-2xl border border-zinc-200 bg-white/88 px-4 shadow-none transition-colors data-[hover=true]:bg-white data-[open=true]:border-zinc-400 data-[open=true]:ring-2 data-[open=true]:ring-zinc-950/10 dark:border-white/10 dark:bg-white/[0.06] dark:data-[hover=true]:bg-white/[0.08] dark:data-[open=true]:border-white/30",
                  value: "text-sm font-medium text-zinc-900 dark:text-zinc-50",
                  selectorIcon: "text-zinc-500 dark:text-zinc-400",
                  popoverContent:
                    "rounded-2xl border border-zinc-200 bg-white/95 p-1 shadow-xl shadow-slate-200/70 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/95 dark:shadow-black/30",
                  listbox: "gap-1",
                }}
              >
                {STATUS_FILTERS.map((filter) => (
                  <SelectItem
                    key={filter.value}
                    textValue={filter.label}
                    className="rounded-xl text-zinc-800 data-[hover=true]:bg-zinc-100 data-[selectable=true]:focus:bg-zinc-100 data-[selected=true]:bg-zinc-950 data-[selected=true]:text-white dark:text-zinc-100 dark:data-[hover=true]:bg-white/10 dark:data-[selectable=true]:focus:bg-white/10 dark:data-[selected=true]:bg-white dark:data-[selected=true]:text-zinc-950"
                  >
                    {filter.label}
                  </SelectItem>
                ))}
              </Select>
            </div>
          </div>
        </section>

        {errorMessage && errorStatus !== 400 ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            {errorMessage}
          </div>
        ) : null}

        {errorMessage && errorStatus === 400 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
            {errorMessage}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <StatCard label="Bookings" value={attendeeStats.totalBookings} />
          <StatCard label="Tickets" value={attendeeStats.totalTickets} />
          <StatCard label="Total value" value={formatBookingAmount(attendeeStats.totalRevenue, "eur")} />
        </section>

        {isLoading ? (
          <Card className="border border-zinc-200/80 bg-white/88 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <CardBody className="flex flex-row items-center justify-center gap-3 px-6 py-14 text-zinc-600 dark:text-zinc-400">
              <Spinner size="sm" color="default" />
              <span className="text-sm">Loading attendees...</span>
            </CardBody>
          </Card>
        ) : attendees.length === 0 ? (
          <Card className="border border-dashed border-zinc-300 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            <CardBody className="gap-4 px-6 py-12 text-center">
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-zinc-950 dark:text-white">
                No attendees match this filter
              </h2>
              <p className="mx-auto max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
                Try another booking status, or check again after attendees complete their bookings.
              </p>
            </CardBody>
          </Card>
        ) : (
          <section className="space-y-4">
            <div className="hidden overflow-hidden rounded-[1.75rem] border border-zinc-200/80 bg-white/84 shadow-sm dark:border-white/10 dark:bg-white/[0.04] lg:block">
              <div className="grid grid-cols-[1.2fr_0.9fr_0.8fr_0.8fr_1.4fr] gap-4 border-b border-zinc-200/80 px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                <span>Attendee</span>
                <span>Booking</span>
                <span>Status</span>
                <span>Total</span>
                <span>Tickets</span>
              </div>

              {attendees.map((attendee) => (
                <div
                  key={attendee.booking_id}
                  className="grid grid-cols-[1.2fr_0.9fr_0.8fr_0.8fr_1.4fr] gap-4 border-b border-zinc-200/70 px-5 py-5 last:border-b-0 dark:border-white/10"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-950 dark:text-white">
                      {formatPersonName(attendee.attendee)}
                    </p>
                    <a
                      href={`mailto:${attendee.attendee?.email || ""}`}
                      className="mt-1 inline-flex max-w-full items-center gap-2 truncate text-sm text-zinc-600 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
                    >
                      <Mail size={14} />
                      {attendee.attendee?.email || "Email unavailable"}
                    </a>
                  </div>

                  <div className="text-sm text-zinc-600 dark:text-zinc-400">
                    <div className="flex items-center gap-2">
                      <CalendarDays size={14} />
                      <span>{formatEventDate(attendee.booking_date)}</span>
                    </div>
                    <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
                      ID {attendee.booking_id}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Chip variant="flat" className={`border capitalize ${getStatusTone(attendee.status)}`}>
                      {attendee.status?.replace("_", " ") || "Unknown"}
                    </Chip>
                    <Chip
                      variant="flat"
                      className={`border capitalize ${getPaymentTone(attendee.payment_status)}`}
                    >
                      {attendee.payment_status?.replace("_", " ") || "Unknown"}
                    </Chip>
                  </div>

                  <div>
                    <p className="font-semibold text-zinc-950 dark:text-white">
                      {formatBookingAmount(attendee.total_price, "eur")}
                    </p>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {attendee.total_quantity} ticket{attendee.total_quantity === 1 ? "" : "s"}
                    </p>
                  </div>

                  <AttendeeItems attendee={attendee} />
                </div>
              ))}
            </div>

            <div className="grid gap-4 lg:hidden">
              {attendees.map((attendee) => (
                <Card
                  key={attendee.booking_id}
                  className="border border-zinc-200/80 bg-white/84 shadow-sm dark:border-white/10 dark:bg-white/[0.04]"
                >
                  <CardHeader className="flex flex-col items-start gap-3 px-5 pt-5">
                    <div className="flex w-full items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-lg font-semibold tracking-[-0.02em] text-zinc-950 dark:text-white">
                          {formatPersonName(attendee.attendee)}
                        </h2>
                        <a
                          href={`mailto:${attendee.attendee?.email || ""}`}
                          className="mt-1 inline-flex max-w-full items-center gap-2 truncate text-sm text-zinc-600 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
                        >
                          <Mail size={14} />
                          {attendee.attendee?.email || "Email unavailable"}
                        </a>
                      </div>

                      <Chip variant="flat" className={`border capitalize ${getStatusTone(attendee.status)}`}>
                        {attendee.status?.replace("_", " ") || "Unknown"}
                      </Chip>
                    </div>
                  </CardHeader>

                  <CardBody className="gap-4 px-5 pb-5">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                          Booked on
                        </p>
                        <p className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {formatEventDate(attendee.booking_date)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                          Total
                        </p>
                        <p className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {formatBookingAmount(attendee.total_price, "eur")} /{" "}
                          {attendee.total_quantity} ticket{attendee.total_quantity === 1 ? "" : "s"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03] sm:col-span-2">
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                          Payment
                        </p>
                        <Chip
                          variant="flat"
                          className={`mt-3 border capitalize ${getPaymentTone(attendee.payment_status)}`}
                        >
                          {attendee.payment_status?.replace("_", " ") || "Unknown"}
                        </Chip>
                      </div>

                      <div className="rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03] sm:col-span-2">
                        <div className="mb-3 flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                          <Ticket size={14} />
                          Tickets
                        </div>
                        <AttendeeItems attendee={attendee} />
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
