import { Button, Card, CardBody, CardFooter, CardHeader, Chip, Spinner } from "@heroui/react";
import { CalendarDays, CreditCard, MapPin, QrCode, Ticket, WalletCards, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import EventCoverImage from "../components/event/EventCoverImage";
import { useAuth } from "../context/AuthContext";
import { extractApiErrorMessage } from "../services/api";
import bookingService from "../services/bookingService";
import {
  formatBookingAmount,
  getBookingDisplayState,
  getBookingToneClassName,
} from "../utils/bookingUtils";
import { formatEventDate, formatEventVenue } from "../utils/eventUtils";

function BookingFlash({ message, tone = "info" }) {
  const toneClassName =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
      : "border-red-200 bg-red-50 text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300";

  return <div className={`rounded-2xl border px-4 py-3 text-sm ${toneClassName}`}>{message}</div>;
}

function getBookingStatusTone(status) {
  if (status === "confirmed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300";
  }

  if (status === "pending_payment") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300";
  }

  return "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-white/10 dark:bg-white/10 dark:text-zinc-300";
}

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [flashState, setFlashState] = useState(null);
  const [cancellingBookingId, setCancellingBookingId] = useState("");
  const [retryingBookingId, setRetryingBookingId] = useState("");
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let ignore = false;

    async function loadBookings() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const response = await bookingService.getMyBookings();

        if (!ignore) {
          setBookings(response.data.data || []);
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

        setErrorMessage(extractApiErrorMessage(error, "Unable to load your bookings right now."));
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadBookings();

    return () => {
      ignore = true;
    };
  }, [location.pathname, location.search, logout, navigate]);

  const confirmedCount = useMemo(
    () => bookings.filter((booking) => booking.status === "confirmed").length,
    [bookings],
  );
  const pendingCount = useMemo(
    () => bookings.filter((booking) => booking.status === "pending_payment").length,
    [bookings],
  );
  const cancelledCount = useMemo(
    () => bookings.filter((booking) => booking.status === "cancelled").length,
    [bookings],
  );

  async function handleCancelBooking(booking) {
    const hasConfirmed = window.confirm(
      `Cancel your booking for "${booking.title}"?`,
    );

    if (!hasConfirmed) {
      return;
    }

    try {
      setCancellingBookingId(booking.id);
      setFlashState(null);
      setErrorMessage("");

      const response = await bookingService.cancelBooking(booking.id);
      const updatedBooking = response.data.data;

      setBookings((currentBookings) =>
        currentBookings.map((currentBooking) =>
          currentBooking.id === booking.id
            ? {
                ...currentBooking,
                status: updatedBooking.status,
                payment_status: updatedBooking.payment_status,
                amount_paid: updatedBooking.amount_paid,
                currency: updatedBooking.currency,
                items: updatedBooking.items || currentBooking.items,
                total_quantity: updatedBooking.total_quantity ?? currentBooking.total_quantity,
                total_price: updatedBooking.total_price ?? currentBooking.total_price,
              }
            : currentBooking,
        ),
      );
      setFlashState({
        message: response.data.message || "Booking cancelled successfully",
        tone: "success",
      });
    } catch (error) {
      if (error.response?.status === 401) {
        logout();
        navigate("/login", {
          replace: true,
          state: { from: `${location.pathname}${location.search}` },
        });
        return;
      }

      setFlashState({
        message: extractApiErrorMessage(error, "Unable to cancel this booking."),
        tone: "error",
      });
    } finally {
      setCancellingBookingId("");
    }
  }

  async function handleRetryPayment(booking) {
    try {
      setRetryingBookingId(booking.id);
      setFlashState(null);
      setErrorMessage("");

      const response = await bookingService.retryPayment(booking.id);
      const checkoutUrl = response.data.data?.payment?.checkout_url;

      if (!checkoutUrl) {
        setFlashState({
          message: "Payment checkout is unavailable. Please try again.",
          tone: "error",
        });
        return;
      }

      window.location.href = checkoutUrl;
    } catch (error) {
      if (error.response?.status === 401) {
        logout();
        navigate("/login", {
          replace: true,
          state: { from: `${location.pathname}${location.search}` },
        });
        return;
      }

      setFlashState({
        message: extractApiErrorMessage(error, "Unable to continue this payment."),
        tone: "error",
      });
    } finally {
      setRetryingBookingId("");
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
      <div className="space-y-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-zinc-200/70 bg-white/72 px-6 py-10 shadow-[0_24px_70px_rgba(148,163,184,0.14)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_24px_70px_rgba(2,6,23,0.4)] md:px-8 md:py-12">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-8 top-0 h-48 w-48 rounded-full bg-emerald-200/40 blur-3xl dark:bg-emerald-500/10" />
            <div className="absolute right-0 top-10 h-56 w-56 rounded-full bg-sky-200/35 blur-3xl dark:bg-sky-500/10" />
          </div>

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-400">
                <Ticket size={14} />
                Attendee workspace
              </div>
              <div>
                <h1 className="text-4xl font-semibold tracking-[-0.05em] text-zinc-950 dark:text-white">
                  My bookings
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                  Track confirmed, pending payment, and cancelled event bookings in one place.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Card className="border border-zinc-200/80 bg-white/84 dark:border-white/10 dark:bg-white/[0.05]">
                <CardBody className="gap-2 px-4 py-4">
                  <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                    Confirmed
                  </span>
                  <span className="text-3xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-white">
                    {confirmedCount}
                  </span>
                </CardBody>
              </Card>

              <Card className="border border-zinc-200/80 bg-white/84 dark:border-white/10 dark:bg-white/[0.05]">
                <CardBody className="gap-2 px-4 py-4">
                  <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                    Pending
                  </span>
                  <span className="text-3xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-white">
                    {pendingCount}
                  </span>
                </CardBody>
              </Card>

              <Card className="border border-zinc-200/80 bg-white/84 dark:border-white/10 dark:bg-white/[0.05]">
                <CardBody className="gap-2 px-4 py-4">
                  <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                    Cancelled
                  </span>
                  <span className="text-3xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-white">
                    {cancelledCount}
                  </span>
                </CardBody>
              </Card>
            </div>
          </div>
        </section>

        {flashState?.message ? (
          <BookingFlash message={flashState.message} tone={flashState.tone} />
        ) : null}

        {errorMessage ? <BookingFlash message={errorMessage} tone="error" /> : null}

        {isLoading ? (
          <Card className="border border-zinc-200/80 bg-white/88 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <CardBody className="flex flex-row items-center justify-center gap-3 px-6 py-14 text-zinc-600 dark:text-zinc-400">
              <Spinner size="sm" color="default" />
              <span className="text-sm">Loading bookings...</span>
            </CardBody>
          </Card>
        ) : bookings.length === 0 ? (
          <Card className="border border-dashed border-zinc-300 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            <CardBody className="gap-4 px-6 py-12 text-center">
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-zinc-950 dark:text-white">
                No bookings yet
              </h2>
              <p className="mx-auto max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
                Browse events and book one to start building your schedule.
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
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {bookings.map((booking) => {
              const isConfirmed = booking.status === "confirmed";
              const isPendingPayment = booking.status === "pending_payment";
              const canCancelBooking = isConfirmed || isPendingPayment;
              const displayState = getBookingDisplayState(booking);

              return (
                <Card
                  key={booking.id}
                  className={`overflow-hidden border bg-white/84 shadow-sm transition-all duration-300 dark:bg-white/[0.04] ${
                    isConfirmed || isPendingPayment
                      ? "border-zinc-200/80 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70 dark:border-white/10 dark:hover:shadow-black/20"
                      : "border-zinc-200/70 opacity-75 dark:border-white/10"
                  }`}
                >
                  {booking.image_url ? (
                    <EventCoverImage
                      src={booking.image_url}
                      alt={`${booking.title} cover`}
                      className="h-48 w-full"
                    />
                  ) : (
                    <div className="h-1.5 w-full bg-[linear-gradient(90deg,rgba(16,185,129,0.88),rgba(14,165,233,0.88),rgba(99,102,241,0.78))]" />
                  )}

                  <CardHeader className="flex flex-col items-start gap-3 px-6 pt-6">
                    <div className="flex w-full flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <h2 className="text-xl font-semibold tracking-[-0.03em] text-zinc-950 dark:text-white">
                          {booking.title}
                        </h2>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          {booking.category} in {booking.city || "TBD"}
                        </p>
                      </div>

                      <Chip
                        variant="flat"
                        className={`border capitalize ${getBookingStatusTone(booking.status)}`}
                      >
                        {booking.status.replace("_", " ")}
                      </Chip>
                    </div>
                  </CardHeader>

                  <CardBody className="gap-5 px-6 pb-2">
                    <p className="line-clamp-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                      {booking.description}
                    </p>

                    <div className="grid gap-3 text-sm sm:grid-cols-2">
                      <div className="rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                        <div className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                          <CalendarDays size={14} />
                          Event date
                        </div>
                        <p className="mt-2 font-medium text-zinc-900 dark:text-zinc-100">
                          {formatEventDate(booking.event_date)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                          Booking total
                        </p>
                        <p className="mt-2 font-medium text-zinc-900 dark:text-zinc-100">
                          {formatBookingAmount(
                            booking.total_price ?? booking.amount_paid,
                            booking.currency,
                          )}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03] sm:col-span-2">
                        <div className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                          <MapPin size={14} />
                          Venue
                        </div>
                        <p className="mt-2 font-medium text-zinc-900 dark:text-zinc-100">
                          {formatEventVenue(booking)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03] sm:col-span-2">
                        <div className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                          <Ticket size={14} />
                          Tickets
                        </div>
                        <div className="mt-3 space-y-2">
                          {Array.isArray(booking.items) && booking.items.length > 0 ? (
                            booking.items.map((item) => (
                              <div
                                key={item.id || item.ticket_tier_id}
                                className="flex flex-col gap-1 rounded-xl bg-zinc-50/90 px-3 py-2 dark:bg-white/[0.04] sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div>
                                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                                    {item.ticket_tier?.name || "Ticket tier"}
                                  </p>
                                  {item.ticket_tier?.description ? (
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                      {item.ticket_tier.description}
                                    </p>
                                  ) : null}
                                </div>
                                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                  {item.quantity} x{" "}
                                  {formatBookingAmount(item.unit_price, booking.currency)} ={" "}
                                  {formatBookingAmount(item.total_price, booking.currency)}
                                </p>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                              Ticket details are unavailable for this booking.
                            </p>
                          )}
                        </div>
                        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                          Total quantity: {booking.total_quantity ?? 1}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03] sm:col-span-2">
                        <div className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                          <CreditCard size={14} />
                          Payment
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Chip
                            variant="flat"
                            className={`border capitalize ${getBookingToneClassName(displayState.tone)}`}
                          >
                            {displayState.label}
                          </Chip>
                          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            {formatBookingAmount(
                              booking.amount_paid ?? booking.total_price,
                              booking.currency,
                            )}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                          Payment status: {booking.payment_status || "not paid"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03] sm:col-span-2">
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                          Booked on
                        </p>
                        <p className="mt-2 font-medium text-zinc-900 dark:text-zinc-100">
                          {formatEventDate(booking.booking_date)}
                        </p>
                      </div>
                    </div>
                  </CardBody>

                  <CardFooter className="flex flex-col gap-3 px-6 pb-6 pt-4 sm:flex-row">
                    <Button
                      as={RouterLink}
                      to={`/events/${booking.event_id}`}
                      state={
                        isPendingPayment
                          ? {
                              pendingBookingId: booking.id,
                              pendingBookingMessage:
                                "You already have a pending payment for this event.",
                            }
                          : undefined
                      }
                      variant="bordered"
                      radius="full"
                      className="w-full border-zinc-200 bg-white/70 font-medium text-zinc-950 dark:border-white/10 dark:bg-white/5 dark:text-white sm:w-auto"
                    >
                      View event
                    </Button>

                    {isConfirmed ? (
                      <Button
                        as={RouterLink}
                        to={`/bookings/${booking.id}/tickets`}
                        radius="full"
                        startContent={<QrCode size={15} />}
                        className="w-full bg-zinc-950 font-medium text-white dark:bg-white dark:text-zinc-950 sm:w-auto"
                      >
                        View tickets
                      </Button>
                    ) : null}

                    {isPendingPayment ? (
                      <Button
                        radius="full"
                        startContent={<WalletCards size={15} />}
                        isLoading={retryingBookingId === booking.id}
                        onPress={() => handleRetryPayment(booking)}
                        className="w-full bg-zinc-950 font-medium text-white dark:bg-white dark:text-zinc-950 sm:w-auto"
                      >
                        Continue payment
                      </Button>
                    ) : null}

                    {canCancelBooking ? (
                      <Button
                        radius="full"
                        color="danger"
                        variant="flat"
                        startContent={<XCircle size={15} />}
                        isLoading={cancellingBookingId === booking.id}
                        onPress={() => handleCancelBooking(booking)}
                        className="w-full bg-red-50 font-medium text-red-600 dark:bg-red-500/10 dark:text-red-300 sm:w-auto"
                      >
                        Cancel booking
                      </Button>
                    ) : null}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
