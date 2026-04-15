import { Button, Card, CardBody, Chip } from "@heroui/react";
import { CalendarDays, MapPin, Minus, PencilLine, Plus, Ticket, Users, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useLocation, useNavigate, useParams } from "react-router-dom";
import EventCoverImage from "../components/event/EventCoverImage";
import { DetailPageSkeleton } from "../components/ui/LoadingSkeletons";
import { useAuth } from "../context/AuthContext";
import { extractApiErrorMessage } from "../services/api";
import bookingService from "../services/bookingService";
import eventService from "../services/eventService";
import {
  formatEventAvailability,
  formatEventDate,
  formatEventPrice,
  formatEventPriceRange,
  formatEventVenue,
  getActiveTicketTiers,
  getEventAvailability,
  getTicketTierRemainingQuantity,
} from "../utils/eventUtils";

export default function EventDetailsPage() {
  const [eventRecord, setEventRecord] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [bookingMessage, setBookingMessage] = useState(null);
  const [isBooking, setIsBooking] = useState(false);
  const [isRetryingPayment, setIsRetryingPayment] = useState(false);
  const [hasCreatedBooking, setHasCreatedBooking] = useState(false);
  const [ticketQuantities, setTicketQuantities] = useState({});
  const { id } = useParams();
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let ignore = false;

    async function loadEvent() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const response = await eventService.getEventById(id);

        if (!ignore) {
          setEventRecord(response.data.data);
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

        if (error.response?.status === 404) {
          setErrorMessage("Event not found");
          return;
        }

        setErrorMessage(extractApiErrorMessage(error, "Unable to load this event."));
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadEvent();

    return () => {
      ignore = true;
    };
  }, [id, location.pathname, location.search, logout, navigate]);

  const canEditEvent = useMemo(() => {
    if (!user || !eventRecord) {
      return false;
    }

    return user.role === "admin" || eventRecord.organizer_id === user.id;
  }, [eventRecord, user]);
  const isAttendee = user?.role === "attendee";
  const pendingBookingId =
    typeof location.state?.pendingBookingId === "string"
      ? location.state.pendingBookingId
      : "";
  const availability = useMemo(() => getEventAvailability(eventRecord || {}), [eventRecord]);
  const activeTicketTiers = useMemo(() => getActiveTicketTiers(eventRecord || {}), [eventRecord]);
  const selectedTicketItems = useMemo(
    () =>
      activeTicketTiers
        .map((tier) => ({
          ticket_tier_id: tier.id,
          quantity: Number(ticketQuantities[tier.id]) || 0,
          tier,
        }))
        .filter((item) => item.ticket_tier_id && item.quantity > 0),
    [activeTicketTiers, ticketQuantities],
  );
  const selectedTicketQuantity = useMemo(
    () => selectedTicketItems.reduce((total, item) => total + item.quantity, 0),
    [selectedTicketItems],
  );
  const selectedTicketTotal = useMemo(
    () =>
      selectedTicketItems.reduce(
        (total, item) => total + item.quantity * Number(item.tier.price || 0),
        0,
      ),
    [selectedTicketItems],
  );
  const hasBookableTicketTiers = activeTicketTiers.some(
    (tier) => getTicketTierRemainingQuantity(tier) > 0,
  );
  const isBookingDisabled =
    hasCreatedBooking ||
    availability.isFull ||
    !hasBookableTicketTiers ||
    (isAuthenticated && !isAttendee) ||
    (isAuthenticated && isAttendee && selectedTicketQuantity === 0);
  const bookingButtonLabel = hasCreatedBooking
    ? "Booked"
    : availability.isFull
      ? "Event full"
      : !hasBookableTicketTiers
        ? "Sold out"
      : !isAuthenticated
        ? "Login to book"
        : !isAttendee
          ? "Attendees only"
          : selectedTicketQuantity > 0
            ? `Book ${selectedTicketQuantity} ticket${selectedTicketQuantity === 1 ? "" : "s"}`
            : "Select tickets";

  useEffect(() => {
    setTicketQuantities({});
  }, [eventRecord?.id]);

  useEffect(() => {
    if (location.state?.pendingBookingMessage) {
      setBookingMessage({
        tone: "error",
        message: location.state.pendingBookingMessage,
      });
    }
  }, [location.state]);

  async function handleBookEvent() {
    if (!isAuthenticated) {
      navigate("/login", {
        state: { from: `${location.pathname}${location.search}` },
      });
      return;
    }

    if (!isAttendee || availability.isFull) {
      return;
    }

    if (selectedTicketItems.length === 0) {
      setBookingMessage({
        tone: "error",
        message: "Select at least one ticket tier.",
      });
      return;
    }

    try {
      setIsBooking(true);
      setBookingMessage(null);

      const response = await bookingService.createBooking(
        id,
        selectedTicketItems.map((item) => ({
          ticket_tier_id: item.ticket_tier_id,
          quantity: item.quantity,
        })),
      );
      const bookingResult = response.data.data;

      if (bookingResult?.payment_required) {
        const checkoutUrl = bookingResult.payment?.checkout_url;

        if (!checkoutUrl) {
          setBookingMessage({
            tone: "error",
            message: "Payment checkout is unavailable. Please try again.",
          });
          return;
        }

        setBookingMessage({
          tone: "success",
          message: response.data.message || "Redirecting to secure checkout...",
        });
        window.location.href = checkoutUrl;
        return;
      }

      setBookingMessage({
        tone: "success",
        message: response.data.message || "Booking created successfully",
      });
      setHasCreatedBooking(true);
    } catch (error) {
      if (error.response?.status === 401) {
        logout();
        navigate("/login", {
          replace: true,
          state: { from: `${location.pathname}${location.search}` },
        });
        return;
      }

      setBookingMessage({
        tone: "error",
        message: extractApiErrorMessage(error, "Unable to book this event."),
      });
    } finally {
      setIsBooking(false);
    }
  }

  async function handleRetryPayment() {
    if (!pendingBookingId) {
      return;
    }

    try {
      setIsRetryingPayment(true);
      setBookingMessage(null);

      const response = await bookingService.retryPayment(pendingBookingId);
      const checkoutUrl = response.data.data?.payment?.checkout_url;

      if (!checkoutUrl) {
        setBookingMessage({
          tone: "error",
          message: "Payment checkout is unavailable. Please try again.",
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

      setBookingMessage({
        tone: "error",
        message: extractApiErrorMessage(error, "Unable to continue this payment."),
      });
    } finally {
      setIsRetryingPayment(false);
    }
  }

  function handleTicketQuantityChange(tier, nextQuantity) {
    const remainingQuantity = getTicketTierRemainingQuantity(tier);
    const currentQuantity = Number(ticketQuantities[tier.id]) || 0;
    const otherSelectedQuantity = selectedTicketQuantity - currentQuantity;
    const maxAllowedQuantity = Math.max(Math.min(remainingQuantity, 5 - otherSelectedQuantity), 0);
    const safeQuantity = Math.min(Math.max(Number(nextQuantity) || 0, 0), maxAllowedQuantity);

    setTicketQuantities((currentQuantities) => ({
      ...currentQuantities,
      [tier.id]: safeQuantity,
    }));
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 md:py-16">
      <Card className="overflow-hidden border border-zinc-200/80 bg-white/88 shadow-[0_24px_70px_rgba(148,163,184,0.12)] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_24px_70px_rgba(2,6,23,0.4)]">
        <CardBody className="gap-6 p-6 md:p-8">
          {isLoading ? (
            <DetailPageSkeleton />
          ) : errorMessage ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
              {errorMessage}
            </div>
          ) : (
            <>
              {eventRecord.image_url ? (
                <EventCoverImage
                  src={eventRecord.image_url}
                  alt={`${eventRecord.title} cover`}
                  className="h-72 rounded-[1.75rem] border border-zinc-200/70 dark:border-white/10 md:h-96"
                />
              ) : null}

              <div className="relative overflow-hidden rounded-[1.75rem] border border-zinc-200/70 bg-zinc-50/85 px-5 py-6 dark:border-white/10 dark:bg-white/[0.03] md:px-6 md:py-7">
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute -left-6 top-0 h-40 w-40 rounded-full bg-sky-200/45 blur-3xl dark:bg-sky-500/10" />
                  <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-indigo-200/35 blur-3xl dark:bg-indigo-500/10" />
                </div>

                <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <Chip
                        variant="flat"
                        className="border border-zinc-200 bg-white/90 text-zinc-700 dark:border-white/10 dark:bg-white/10 dark:text-zinc-200"
                      >
                        {eventRecord.category}
                      </Chip>
                      <Chip
                        variant="flat"
                        className="border border-zinc-200 bg-white/90 text-zinc-700 dark:border-white/10 dark:bg-white/10 dark:text-zinc-200"
                      >
                        {formatEventPriceRange(eventRecord)}
                      </Chip>
                    </div>

                    <div>
                      <h1 className="text-3xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-white">
                        {eventRecord.title}
                      </h1>
                      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                        Organized by{" "}
                        {[eventRecord.first_name, eventRecord.last_name].filter(Boolean).join(" ") ||
                          eventRecord.organizer_email ||
                          "Organizer"}
                      </p>
                    </div>
                  </div>

                  {canEditEvent ? (
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Button
                        as={RouterLink}
                        to={`/events/${eventRecord.id}/edit`}
                        radius="full"
                        startContent={<PencilLine size={15} />}
                        className="bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                      >
                        Edit Event
                      </Button>
                      {pendingBookingId ? (
                        <Button
                          radius="full"
                          variant="bordered"
                          startContent={<WalletCards size={15} />}
                          isLoading={isRetryingPayment}
                          onPress={handleRetryPayment}
                          className="border-zinc-200 bg-white/80 font-medium text-zinc-950 dark:border-white/10 dark:bg-white/5 dark:text-white"
                        >
                          Continue payment
                        </Button>
                      ) : (
                        <Button
                          radius="full"
                          variant="bordered"
                          startContent={<Ticket size={15} />}
                          isLoading={isBooking}
                          isDisabled={isBookingDisabled}
                          onPress={handleBookEvent}
                          className="border-zinc-200 bg-white/80 font-medium text-zinc-950 dark:border-white/10 dark:bg-white/5 dark:text-white"
                        >
                          {bookingButtonLabel}
                        </Button>
                      )}
                    </div>
                  ) : pendingBookingId ? (
                    <Button
                      radius="full"
                      startContent={<WalletCards size={15} />}
                      isLoading={isRetryingPayment}
                      onPress={handleRetryPayment}
                      className="bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                    >
                      Continue payment
                    </Button>
                  ) : (
                    <Button
                      radius="full"
                      startContent={<Ticket size={15} />}
                      isLoading={isBooking}
                      isDisabled={isBookingDisabled}
                      onPress={handleBookEvent}
                      className="bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                    >
                      {bookingButtonLabel}
                    </Button>
                  )}
                </div>
              </div>

              {bookingMessage?.message ? (
                <div
                  className={`rounded-2xl border px-4 py-3 text-sm ${
                    bookingMessage.tone === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                      : "border-red-200 bg-red-50 text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
                  }`}
                >
                  {bookingMessage.message}
                </div>
              ) : null}

              <p className="text-sm leading-7 text-zinc-700 dark:text-zinc-300">
                {eventRecord.description}
              </p>

              <div className="rounded-[1.75rem] border border-zinc-200/80 bg-white/72 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <h2 className="text-xl font-semibold tracking-[-0.03em] text-zinc-950 dark:text-white">
                      Choose tickets
                    </h2>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      Select up to 5 tickets across available tiers. Prices are calculated by the backend.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-zinc-200 bg-white/80 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.05]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                      Total
                    </p>
                    <p className="mt-1 font-semibold text-zinc-950 dark:text-white">
                      {selectedTicketQuantity} ticket{selectedTicketQuantity === 1 ? "" : "s"} |{" "}
                      {formatEventPrice(selectedTicketTotal)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4">
                  {activeTicketTiers.length > 0 ? (
                    activeTicketTiers.map((tier) => {
                      const remainingQuantity = getTicketTierRemainingQuantity(tier);
                      const selectedQuantity = Number(ticketQuantities[tier.id]) || 0;
                      const isTierSoldOut = remainingQuantity <= 0;
                      const canIncrease =
                        !isTierSoldOut && selectedTicketQuantity < 5 && selectedQuantity < remainingQuantity;

                      return (
                        <div
                          key={tier.id}
                          className={`rounded-2xl border px-4 py-4 ${
                            isTierSoldOut
                              ? "border-zinc-200/70 bg-zinc-50/80 opacity-70 dark:border-white/10 dark:bg-white/[0.02]"
                              : "border-zinc-200/80 bg-white/80 dark:border-white/10 dark:bg-white/[0.04]"
                          }`}
                        >
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-semibold tracking-[-0.03em] text-zinc-950 dark:text-white">
                                  {tier.name}
                                </h3>
                                <Chip
                                  variant="flat"
                                  className="border border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-white/10 dark:bg-white/10 dark:text-zinc-200"
                                >
                                  {formatEventPrice(tier.price)}
                                </Chip>
                              </div>
                              {tier.description ? (
                                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                  {tier.description}
                                </p>
                              ) : null}
                              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                                {isTierSoldOut
                                  ? "Sold out"
                                  : `${remainingQuantity} remaining`}
                              </p>
                            </div>

                            <div className="flex w-fit items-center gap-2 rounded-full border border-zinc-200 bg-white/80 p-1 dark:border-white/10 dark:bg-white/[0.05]">
                              <Button
                                isIconOnly
                                size="sm"
                                radius="full"
                                variant="light"
                                aria-label={`Decrease ${tier.name} quantity`}
                                isDisabled={selectedQuantity <= 0}
                                onPress={() => handleTicketQuantityChange(tier, selectedQuantity - 1)}
                              >
                                <Minus size={15} />
                              </Button>
                              <span className="w-8 text-center text-sm font-semibold text-zinc-950 dark:text-white">
                                {selectedQuantity}
                              </span>
                              <Button
                                isIconOnly
                                size="sm"
                                radius="full"
                                variant="light"
                                aria-label={`Increase ${tier.name} quantity`}
                                isDisabled={!canIncrease}
                                onPress={() => handleTicketQuantityChange(tier, selectedQuantity + 1)}
                              >
                                <Plus size={15} />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/80 px-4 py-4 text-sm text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                      Ticket tiers are not available for this event.
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                    <CalendarDays size={14} />
                    Date
                  </div>
                  <p className="mt-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {formatEventDate(eventRecord.event_date)}
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                    <MapPin size={14} />
                    Venue
                  </div>
                  <p className="mt-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {formatEventVenue(eventRecord)}
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                    <Users size={14} />
                    Availability
                  </div>
                  <p className="mt-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {formatEventAvailability(eventRecord)}
                  </p>
                </div>
              </div>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
