import { Button, Card, CardBody, Chip, Spinner } from "@heroui/react";
import { AlertTriangle, CheckCircle2, Clock3, CreditCard, QrCode, Ticket, WalletCards, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useLocation, useNavigate, useParams } from "react-router-dom";
import EventCoverImage from "../components/event/EventCoverImage";
import { useAuth } from "../context/AuthContext";
import { extractApiErrorMessage } from "../services/api";
import bookingService from "../services/bookingService";
import {
  formatBookingAmount,
  getBookingDisplayState,
  getBookingToneClassName,
  isFinalBookingPaymentState,
} from "../utils/bookingUtils";
import { formatEventDate, formatEventVenue } from "../utils/eventUtils";

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 30;

function StatusIcon({ tone, isPolling }) {
  if (isPolling) {
    return <Spinner size="sm" color="default" />;
  }

  if (tone === "success") {
    return <CheckCircle2 size={22} />;
  }

  if (tone === "error") {
    return <XCircle size={22} />;
  }

  if (tone === "warning") {
    return <Clock3 size={22} />;
  }

  return <AlertTriangle size={22} />;
}

export default function BookingStatusPage() {
  const [booking, setBooking] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(false);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [retryErrorMessage, setRetryErrorMessage] = useState("");
  const [isRetryingPayment, setIsRetryingPayment] = useState(false);
  const { id } = useParams();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let ignore = false;
    let timeoutId;
    let attempts = 0;

    async function pollBooking() {
      try {
        setIsPolling(true);
        setErrorMessage("");

        const response = await bookingService.getBookingById(id);
        const nextBooking = response.data.data;

        if (ignore) {
          return;
        }

        setBooking(nextBooking);
        setIsLoading(false);

        if (isFinalBookingPaymentState(nextBooking)) {
          setIsPolling(false);
          return;
        }

        attempts += 1;

        if (attempts >= MAX_POLL_ATTEMPTS) {
          setHasTimedOut(true);
          setIsPolling(false);
          return;
        }

        timeoutId = window.setTimeout(pollBooking, POLL_INTERVAL_MS);
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

        setIsLoading(false);
        setIsPolling(false);
        setErrorMessage(extractApiErrorMessage(error, "Unable to check this booking status."));
      }
    }

    pollBooking();

    return () => {
      ignore = true;
      window.clearTimeout(timeoutId);
    };
  }, [id, location.pathname, location.search, logout, navigate]);

  const displayState = useMemo(() => getBookingDisplayState(booking), [booking]);
  const toneClassName = getBookingToneClassName(displayState.tone);
  const returnContext = location.pathname.endsWith("/payment-cancelled")
    ? "You returned from Stripe before checkout confirmation."
    : "You returned from Stripe Checkout.";
  const canRetryPayment = booking?.status === "pending_payment";

  async function handleRetryPayment() {
    if (!booking?.id) {
      return;
    }

    try {
      setIsRetryingPayment(true);
      setRetryErrorMessage("");

      const response = await bookingService.retryPayment(booking.id);
      const checkoutUrl = response.data.data?.payment?.checkout_url;

      if (!checkoutUrl) {
        setRetryErrorMessage("Payment checkout is unavailable. Please try again.");
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

      setRetryErrorMessage(extractApiErrorMessage(error, "Unable to continue this payment."));
    } finally {
      setIsRetryingPayment(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 md:py-16">
      <Card className="overflow-hidden border border-zinc-200/80 bg-white/88 shadow-[0_24px_70px_rgba(148,163,184,0.12)] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_24px_70px_rgba(2,6,23,0.4)]">
        <CardBody className="gap-6 p-6 md:p-8">
          {isLoading ? (
            <div className="flex min-h-64 flex-row items-center justify-center gap-3 text-zinc-600 dark:text-zinc-400">
              <Spinner size="sm" color="default" />
              <span className="text-sm">Checking booking status...</span>
            </div>
          ) : errorMessage ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
              {errorMessage}
            </div>
          ) : (
            <>
              {booking?.image_url ? (
                <EventCoverImage
                  src={booking.image_url}
                  alt={`${booking.title} cover`}
                  className="h-64 rounded-[1.75rem] border border-zinc-200/70 dark:border-white/10 md:h-80"
                />
              ) : null}

              {retryErrorMessage ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                  {retryErrorMessage}
                </div>
              ) : null}

              <section className={`rounded-[1.75rem] border px-5 py-6 ${toneClassName}`}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-3">
                    <div className="mt-0.5">
                      <StatusIcon tone={displayState.tone} isPolling={isPolling} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-80">
                        Stripe booking status
                      </p>
                      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
                        {hasTimedOut ? "Still waiting for confirmation" : displayState.title}
                      </h1>
                      <p className="mt-2 max-w-2xl text-sm leading-6 opacity-90">
                        {hasTimedOut
                          ? "The payment may still be processing. Check My Bookings again in a moment."
                          : displayState.description}
                      </p>
                      <p className="mt-2 text-xs opacity-75">{returnContext}</p>
                    </div>
                  </div>

                  <Chip variant="flat" className={`border capitalize ${toneClassName}`}>
                    {displayState.label}
                  </Chip>
                </div>
              </section>

              {booking ? (
                <section className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                      Event
                    </p>
                    <p className="mt-2 font-medium text-zinc-900 dark:text-zinc-100">
                      {booking.title || "Event"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                      Booking
                    </p>
                    <p className="mt-2 font-medium capitalize text-zinc-900 dark:text-zinc-100">
                      {booking.status} / {booking.payment_status || "not paid"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                    <div className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                      <CreditCard size={14} />
                      Booking total
                    </div>
                    <p className="mt-2 font-medium text-zinc-900 dark:text-zinc-100">
                      {formatBookingAmount(
                        booking.total_price ?? booking.amount_paid,
                        booking.currency,
                      )}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03] md:col-span-3">
                    <div className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                      <Ticket size={14} />
                      Tickets
                    </div>
                    <div className="mt-3 grid gap-2">
                      {Array.isArray(booking.items) && booking.items.length > 0 ? (
                        booking.items.map((item) => (
                          <div
                            key={item.id || item.ticket_tier_id}
                            className="flex flex-col gap-1 rounded-xl bg-zinc-50/90 px-3 py-2 dark:bg-white/[0.04] sm:flex-row sm:items-center sm:justify-between"
                          >
                            <p className="font-medium text-zinc-900 dark:text-zinc-100">
                              {item.ticket_tier?.name || "Ticket tier"} x {item.quantity}
                            </p>
                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
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
                  </div>

                  <div className="rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                      Event date
                    </p>
                    <p className="mt-2 font-medium text-zinc-900 dark:text-zinc-100">
                      {formatEventDate(booking.event_date)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03] md:col-span-2">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                      Venue
                    </p>
                    <p className="mt-2 font-medium text-zinc-900 dark:text-zinc-100">
                      {formatEventVenue(booking)}
                    </p>
                  </div>
                </section>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  as={RouterLink}
                  to="/my-bookings"
                  radius="full"
                  className="bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                >
                  Go to My Bookings
                </Button>
                {booking?.status === "confirmed" ? (
                  <Button
                    as={RouterLink}
                    to={`/bookings/${booking.id}/tickets`}
                    radius="full"
                    startContent={<QrCode size={15} />}
                    className="bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                  >
                    View tickets
                  </Button>
                ) : null}
                {canRetryPayment ? (
                  <Button
                    radius="full"
                    startContent={<WalletCards size={15} />}
                    isLoading={isRetryingPayment}
                    onPress={handleRetryPayment}
                    className="bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                  >
                    Continue payment
                  </Button>
                ) : null}
                {booking?.event_id ? (
                  <Button
                    as={RouterLink}
                    to={`/events/${booking.event_id}`}
                    radius="full"
                    variant="bordered"
                    className="border-zinc-200 bg-white/70 font-medium text-zinc-950 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  >
                    Back to event
                  </Button>
                ) : null}
              </div>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
