import {
  Button,
  Card,
  CardBody,
  CardFooter,
  Chip,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import { ArrowRight, CalendarClock, CreditCard, MapPin, QrCode, Ticket, WalletCards, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import EventCoverImage from "../components/event/EventCoverImage";
import { BookingCardSkeleton, StatCardsSkeleton } from "../components/ui/LoadingSkeletons";
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

function BookingCard({
  booking,
  displayState,
  isConfirmed,
  isPendingPayment,
  canCancelBooking,
  cancellingBookingId,
  retryingBookingId,
  onCancelBooking,
  onRetryPayment,
}) {
  const isActiveBooking = isConfirmed || isPendingPayment;

  return (
    <Card
      className={`group w-full overflow-hidden rounded-[1.75rem] border bg-white/76 shadow-[0_18px_55px_rgba(148,163,184,0.14)] backdrop-blur-xl transition-all duration-300 dark:bg-white/[0.045] dark:shadow-black/15 ${
        isActiveBooking
          ? "border-zinc-200/80 hover:-translate-y-1 hover:border-zinc-300/90 hover:bg-white/90 hover:shadow-[0_26px_70px_rgba(148,163,184,0.24)] dark:border-white/10 dark:hover:border-white/18 dark:hover:bg-white/[0.065] dark:hover:shadow-black/30"
          : "border-zinc-200/70 opacity-75 dark:border-white/10"
      }`}
    >
      <div className="relative p-3 pb-0">
        {booking.image_url ? (
          <EventCoverImage
            src={booking.image_url}
            alt={`${booking.title} cover`}
            className="h-48 w-full rounded-[1.35rem]"
            imageClassName="transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="relative h-32 overflow-hidden rounded-[1.35rem] bg-[radial-gradient(circle_at_18%_18%,rgba(14,165,233,0.34),transparent_34%),radial-gradient(circle_at_85%_15%,rgba(139,92,246,0.3),transparent_34%),linear-gradient(135deg,rgba(241,245,249,0.96),rgba(226,232,240,0.82))] dark:bg-[radial-gradient(circle_at_18%_18%,rgba(56,189,248,0.24),transparent_34%),radial-gradient(circle_at_85%_15%,rgba(139,92,246,0.22),transparent_34%),linear-gradient(135deg,rgba(39,39,42,0.92),rgba(15,23,42,0.86))]">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.06)_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-35 dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)]" />
            <div className="absolute bottom-4 left-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-white/72 text-sky-600 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10 dark:text-sky-200">
              <CalendarClock size={18} />
            </div>
          </div>
        )}

        <div className="absolute left-6 top-6 flex max-w-[calc(100%-3rem)] flex-wrap items-center gap-2">
          <span className="truncate rounded-full border border-white/55 bg-white/82 px-3 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-zinc-700 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/58 dark:text-zinc-200">
            {booking.category || "Event"}
          </span>
          <Chip
            variant="flat"
            className={`shrink-0 border capitalize shadow-sm backdrop-blur-md ${getBookingStatusTone(booking.status)}`}
          >
            {booking.status?.replace("_", " ") || "Unknown"}
          </Chip>
        </div>
      </div>

      <CardBody className="gap-5 px-5 pb-0 pt-5">
        <div className="space-y-3">
          <h2 className="text-[1.35rem] font-semibold leading-tight tracking-[-0.045em] text-zinc-950 dark:text-white">
            {booking.title}
          </h2>
          <p className="line-clamp-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
            {booking.description}
          </p>
        </div>

        <div className="space-y-3 border-y border-zinc-200/70 py-4 text-sm dark:border-white/10">
          <div className="flex items-start gap-3 text-zinc-700 dark:text-zinc-300">
            <CalendarClock size={16} className="mt-0.5 shrink-0 text-sky-600 dark:text-sky-300" />
            <span className="font-medium leading-6 text-zinc-900 dark:text-zinc-100">
              {formatEventDate(booking.event_date)}
            </span>
          </div>

          <div className="flex items-start gap-3 text-zinc-700 dark:text-zinc-300">
            <MapPin size={16} className="mt-0.5 shrink-0 text-sky-600 dark:text-sky-300" />
            <span className="line-clamp-2 font-medium leading-6 text-zinc-900 dark:text-zinc-100">
              {formatEventVenue(booking)}
            </span>
          </div>
        </div>

        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-2xl bg-zinc-100/80 px-4 py-3 dark:bg-white/8">
            <div className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
              <CreditCard size={14} />
              Booking total
            </div>
            <p className="mt-2 font-semibold text-zinc-950 dark:text-white">
              {formatBookingAmount(booking.total_price ?? booking.amount_paid, booking.currency)}
            </p>
          </div>

          <div className="rounded-2xl bg-zinc-100/80 px-4 py-3 dark:bg-white/8">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
              Payment
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Chip
                variant="flat"
                className={`border capitalize ${getBookingToneClassName(displayState.tone)}`}
              >
                {displayState.label}
              </Chip>
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {booking.payment_status || "not paid"}
              </span>
            </div>
          </div>

          <div className="rounded-2xl bg-zinc-100/80 px-4 py-3 dark:bg-white/8 sm:col-span-2">
            <div className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
              <Ticket size={14} />
              Tickets
            </div>
            <div className="mt-3 space-y-2">
              {Array.isArray(booking.items) && booking.items.length > 0 ? (
                booking.items.map((item) => (
                  <div
                    key={item.id || item.ticket_tier_id}
                    className="flex flex-col gap-1 rounded-xl bg-white/75 px-3 py-2 dark:bg-white/[0.04] sm:flex-row sm:items-center sm:justify-between"
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
                      {item.quantity} x {formatBookingAmount(item.unit_price, booking.currency)} ={" "}
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

          <div className="rounded-2xl bg-zinc-100/80 px-4 py-3 dark:bg-white/8 sm:col-span-2">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
              Booked on
            </p>
            <p className="mt-2 font-medium text-zinc-900 dark:text-zinc-100">
              {formatEventDate(booking.booking_date)}
            </p>
          </div>
        </div>

      </CardBody>

      <CardFooter className="flex flex-col gap-3 px-5 pb-5 pt-5 sm:flex-row sm:flex-wrap">
        <Button
          as={RouterLink}
          to={`/events/${booking.event_id}`}
          state={
            isPendingPayment
              ? {
                  pendingBookingId: booking.id,
                  pendingBookingMessage: "You already have a pending payment for this event.",
                }
              : undefined
          }
          radius="full"
          className="h-11 w-full bg-zinc-950 text-white shadow-sm transition-all duration-300 group-hover:translate-x-0.5 group-hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:group-hover:bg-zinc-200 sm:w-auto"
          endContent={<ArrowRight size={15} />}
        >
          View event
        </Button>

        {isConfirmed ? (
          <Button
            as={RouterLink}
            to={`/bookings/${booking.id}/tickets`}
            radius="full"
            variant="bordered"
            startContent={<QrCode size={15} />}
            className="h-11 w-full border-zinc-200 bg-white/70 font-medium text-zinc-950 dark:border-white/10 dark:bg-white/5 dark:text-white sm:w-auto"
          >
            View tickets
          </Button>
        ) : null}

        {isPendingPayment ? (
          <Button
            radius="full"
            startContent={<WalletCards size={15} />}
            isLoading={retryingBookingId === booking.id}
            onPress={() => onRetryPayment(booking)}
            className="h-11 w-full bg-zinc-950 font-medium text-white dark:bg-white dark:text-zinc-950 sm:w-auto"
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
            onPress={() => onCancelBooking(booking)}
            className="h-11 w-full bg-red-50 font-medium text-red-600 dark:bg-red-500/10 dark:text-red-300 sm:w-auto"
          >
            Cancel booking
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [flashState, setFlashState] = useState(null);
  const [cancellingBookingId, setCancellingBookingId] = useState("");
  const [retryingBookingId, setRetryingBookingId] = useState("");
  const [bookingPendingCancel, setBookingPendingCancel] = useState(null);
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

  async function handleCancelBooking() {
    const booking = bookingPendingCancel;

    if (!booking) {
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
      setBookingPendingCancel(null);
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

            {isLoading ? (
              <div className="min-w-0 flex-1 lg:max-w-xl">
                <StatCardsSkeleton />
              </div>
            ) : (
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
            )}
          </div>
        </section>

        {flashState?.message ? (
          <BookingFlash message={flashState.message} tone={flashState.tone} />
        ) : null}

        {errorMessage ? <BookingFlash message={errorMessage} tone="error" /> : null}

        {isLoading ? (
          <BookingCardSkeleton count={2} />
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
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  displayState={displayState}
                  isConfirmed={isConfirmed}
                  isPendingPayment={isPendingPayment}
                  canCancelBooking={canCancelBooking}
                  cancellingBookingId={cancellingBookingId}
                  retryingBookingId={retryingBookingId}
                  onCancelBooking={setBookingPendingCancel}
                  onRetryPayment={handleRetryPayment}
                />
              );
            })}
          </div>
        )}
      </div>

      <Modal
        backdrop="blur"
        isOpen={Boolean(bookingPendingCancel)}
        onOpenChange={(isOpen) => {
          if (!isOpen && !cancellingBookingId) {
            setBookingPendingCancel(null);
          }
        }}
        placement="center"
        classNames={{
          base: "border border-zinc-200 bg-white text-zinc-950 shadow-2xl dark:border-white/10 dark:bg-zinc-950 dark:text-white",
          backdrop: "bg-zinc-950/45 backdrop-blur-sm",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Cancel booking
                <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400">
                  This will cancel your current reservation for this event.
                </span>
              </ModalHeader>
              <ModalBody>
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                  Cancel your booking for "{bookingPendingCancel?.title}"?
                </div>
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-2xl bg-zinc-100/80 px-4 py-3 dark:bg-white/8">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                      Booking status
                    </p>
                    <p className="mt-2 font-medium capitalize text-zinc-900 dark:text-zinc-100">
                      {bookingPendingCancel?.status?.replace("_", " ") || "Unknown"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-zinc-100/80 px-4 py-3 dark:bg-white/8">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                      Payment status
                    </p>
                    <p className="mt-2 font-medium capitalize text-zinc-900 dark:text-zinc-100">
                      {bookingPendingCancel?.payment_status || "Unknown"}
                    </p>
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button
                  radius="full"
                  variant="light"
                  onPress={onClose}
                  isDisabled={Boolean(cancellingBookingId)}
                >
                  Keep booking
                </Button>
                <Button
                  radius="full"
                  color="danger"
                  isLoading={Boolean(cancellingBookingId)}
                  onPress={handleCancelBooking}
                >
                  Cancel booking
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
