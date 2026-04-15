import { Button, Card, CardBody, Chip, Spinner } from "@heroui/react";
import { ArrowLeft, CalendarDays, Mail, MapPin, Printer, QrCode, Ticket } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { extractApiErrorMessage } from "../services/api";
import ticketService from "../services/ticketService";
import { formatEventDate, formatEventVenue } from "../utils/eventUtils";

function getTicketStatusClassName(status) {
  if (status === "valid") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300";
  }

  if (status === "used") {
    return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300";
  }

  return "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-white/10 dark:bg-white/10 dark:text-zinc-300";
}

function formatAttendeeName(attendee = {}) {
  return [attendee.first_name, attendee.last_name].filter(Boolean).join(" ") || "Attendee";
}

function TicketErrorState({ title, message }) {
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
            to="/my-bookings"
            radius="full"
            className="bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
          >
            Back to My Bookings
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

export default function BookingTicketsPage() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [event, setEvent] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [errorStatus, setErrorStatus] = useState(null);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let ignore = false;

    async function loadTickets() {
      try {
        setIsLoading(true);
        setErrorMessage("");
        setErrorStatus(null);

        const response = await ticketService.getBookingTickets(id);
        const payload = response.data.data || {};

        if (!ignore) {
          setBooking(payload.booking || null);
          setEvent(payload.event || null);
          setTickets(payload.tickets || []);
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

        setErrorStatus(status || "network");
        setErrorMessage(
          status === 409
            ? "Tickets will be available after booking confirmation."
            : extractApiErrorMessage(error, "Unable to load tickets right now."),
        );
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadTickets();

    return () => {
      ignore = true;
    };
  }, [id, location.pathname, location.search, logout, navigate]);

  const venue = useMemo(() => formatEventVenue(event || {}), [event]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        <Card className="border border-zinc-200/80 bg-white/88 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <CardBody className="flex min-h-64 flex-row items-center justify-center gap-3 text-zinc-600 dark:text-zinc-400">
            <Spinner size="sm" color="default" />
            <span className="text-sm">Loading tickets...</span>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12 md:py-16">
        <TicketErrorState
          title={errorStatus === 409 ? "Tickets not ready yet" : "Unable to load tickets"}
          message={errorMessage}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
      <div className="space-y-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-zinc-200/70 bg-white/72 px-6 py-10 shadow-[0_24px_70px_rgba(148,163,184,0.14)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_24px_70px_rgba(2,6,23,0.4)] md:px-8 md:py-12 print:border-none print:bg-white print:p-0 print:shadow-none">
          <div className="pointer-events-none absolute inset-0 print:hidden">
            <div className="absolute -left-8 top-0 h-48 w-48 rounded-full bg-emerald-200/40 blur-3xl dark:bg-emerald-500/10" />
            <div className="absolute right-0 top-10 h-56 w-56 rounded-full bg-sky-200/35 blur-3xl dark:bg-sky-500/10" />
          </div>

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <Button
                as={RouterLink}
                to="/my-bookings"
                radius="full"
                variant="light"
                startContent={<ArrowLeft size={15} />}
                className="px-0 text-zinc-600 dark:text-zinc-300 print:hidden"
              >
                Back to My Bookings
              </Button>

              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-400">
                <Ticket size={14} />
                Confirmed tickets
              </div>

              <div>
                <h1 className="text-4xl font-semibold tracking-[-0.05em] text-zinc-950 dark:text-white">
                  {event?.title || "Your tickets"}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                  Present each QR code at check-in. Each purchased ticket quantity has its own QR
                  code.
                </p>
              </div>
            </div>

            <Button
              radius="full"
              startContent={<Printer size={15} />}
              onPress={() => window.print()}
              className="bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 print:hidden"
            >
              Print tickets
            </Button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3 print:grid-cols-3">
          <Card className="border border-zinc-200/80 bg-white/88 shadow-sm dark:border-white/10 dark:bg-white/[0.04] print:border-zinc-200 print:bg-white print:shadow-none">
            <CardBody className="gap-2 px-5 py-4">
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                <CalendarDays size={14} />
                Date
              </span>
              <span className="text-sm font-semibold text-zinc-950 dark:text-white">
                {formatEventDate(event?.event_date)}
              </span>
            </CardBody>
          </Card>

          <Card className="border border-zinc-200/80 bg-white/88 shadow-sm dark:border-white/10 dark:bg-white/[0.04] print:border-zinc-200 print:bg-white print:shadow-none md:col-span-2">
            <CardBody className="gap-2 px-5 py-4">
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                <MapPin size={14} />
                Venue
              </span>
              <span className="text-sm font-semibold text-zinc-950 dark:text-white">
                {venue}
              </span>
            </CardBody>
          </Card>
        </section>

        {tickets.length === 0 ? (
          <Card className="border border-dashed border-zinc-300 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            <CardBody className="gap-4 px-6 py-12 text-center">
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-zinc-950 dark:text-white">
                No tickets found
              </h2>
              <p className="mx-auto max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
                This confirmed booking did not return ticket records.
              </p>
            </CardBody>
          </Card>
        ) : (
          <section className="grid gap-5 lg:grid-cols-2 print:grid-cols-2">
            {tickets.map((ticket) => (
              <Card
                key={ticket.id || ticket.ticket_code}
                className="overflow-hidden border border-zinc-200/80 bg-white/88 shadow-sm dark:border-white/10 dark:bg-white/[0.04] print:break-inside-avoid print:border-zinc-200 print:bg-white print:shadow-none"
              >
                <CardBody className="gap-6 p-6">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-3">
                      <Chip
                        variant="flat"
                        className={`w-fit border capitalize ${getTicketStatusClassName(ticket.status)}`}
                      >
                        {ticket.status || "unknown"}
                      </Chip>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                          Ticket code
                        </p>
                        <p className="mt-2 font-mono text-xl font-semibold tracking-[-0.03em] text-zinc-950 dark:text-white">
                          {ticket.ticket_code}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-zinc-200 bg-white p-3 print:border-zinc-200">
                      <QRCodeSVG
                        value={ticket.qr_value || ticket.ticket_code || ""}
                        size={164}
                        level="M"
                        marginSize={2}
                        title={`QR code for ticket ${ticket.ticket_code}`}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <div className="rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03] print:border-zinc-200 print:bg-white">
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                        Tier
                      </p>
                      <p className="mt-2 font-medium text-zinc-900 dark:text-zinc-100">
                        {ticket.ticket_tier?.name || "Ticket"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03] print:border-zinc-200 print:bg-white">
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                        Booking
                      </p>
                      <p className="mt-2 font-medium text-zinc-900 dark:text-zinc-100">
                        {booking?.status || "confirmed"} / {booking?.payment_status || "paid"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03] print:border-zinc-200 print:bg-white sm:col-span-2">
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                        Attendee
                      </p>
                      <p className="mt-2 font-medium text-zinc-900 dark:text-zinc-100">
                        {formatAttendeeName(ticket.attendee)}
                      </p>
                      {ticket.attendee?.email ? (
                        <p className="mt-1 flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                          <Mail size={14} />
                          {ticket.attendee.email}
                        </p>
                      ) : null}
                    </div>

                    {ticket.checked_in_at ? (
                      <div className="rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03] print:border-zinc-200 print:bg-white sm:col-span-2">
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                          Checked in
                        </p>
                        <p className="mt-2 font-medium text-zinc-900 dark:text-zinc-100">
                          {formatEventDate(ticket.checked_in_at)}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </CardBody>
              </Card>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
