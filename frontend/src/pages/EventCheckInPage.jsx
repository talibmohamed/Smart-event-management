import {
  Button,
  Card,
  CardBody,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
} from "@heroui/react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Mail,
  QrCode,
  RotateCcw,
  Search,
  ShieldAlert,
  UserCheck,
  Video,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link as RouterLink, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { extractApiErrorMessage } from "../services/api";
import ticketService from "../services/ticketService";
import { formatEventDate, formatEventVenue } from "../utils/eventUtils";

function normalizeTicketPayload(payload = {}) {
  const ticket = payload.ticket || payload;
  const event = payload.event || ticket.event || {};
  const attendee = payload.attendee || ticket.attendee || {};
  const ticketTier = payload.ticket_tier || ticket.ticket_tier || {};

  return {
    id: ticket.id,
    ticket_code: ticket.ticket_code || payload.ticket_code || "",
    status: ticket.status || payload.status || "unknown",
    checked_in_at: ticket.checked_in_at || payload.checked_in_at || null,
    qr_value: ticket.qr_value || payload.qr_value || ticket.ticket_code || payload.ticket_code || "",
    event,
    attendee,
    ticket_tier: ticketTier,
  };
}

function getStatusClassName(status) {
  if (status === "valid") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300";
  }

  if (status === "used") {
    return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300";
  }

  if (status === "cancelled") {
    return "border-red-200 bg-red-50 text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300";
  }

  return "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-white/10 dark:bg-white/10 dark:text-zinc-300";
}

function formatAttendeeName(attendee = {}) {
  return [attendee.first_name, attendee.last_name].filter(Boolean).join(" ") || "Attendee";
}

export default function EventCheckInPage() {
  const { id: eventId } = useParams();
  const [manualCode, setManualCode] = useState("");
  const [validatedTicket, setValidatedTicket] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [scannerMessage, setScannerMessage] = useState("");
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function stopScanner() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setIsScanning(false);
  }

  useEffect(() => {
    return () => {
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, []);

  function clearPreview() {
    setManualCode("");
    setValidatedTicket(null);
    setErrorMessage("");
    setSuccessMessage("");
    setScannerMessage("");
  }

  async function validateTicketCode(ticketCode) {
    const normalizedCode = ticketCode.trim();

    if (!normalizedCode) {
      setErrorMessage("Enter or scan a ticket code first.");
      return;
    }

    try {
      setIsValidating(true);
      setErrorMessage("");
      setSuccessMessage("");
      setValidatedTicket(null);

      const response = await ticketService.getTicket(normalizedCode);
      setValidatedTicket(normalizeTicketPayload(response.data.data || {}));
      setManualCode(normalizedCode);
    } catch (error) {
      if (error.response?.status === 401) {
        logout();
        navigate("/login", {
          replace: true,
          state: { from: `${location.pathname}${location.search}` },
        });
        return;
      }

      setErrorMessage(extractApiErrorMessage(error, "Unable to validate this ticket."));
    } finally {
      setIsValidating(false);
    }
  }

  async function startScanner() {
    if (!videoRef.current) {
      return;
    }

    try {
      stopScanner();
      setErrorMessage("");
      setSuccessMessage("");
      setScannerMessage("Starting camera...");

      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader();
      let hasDetectedCode = false;

      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, _error, activeControls) => {
          if (!result || hasDetectedCode) {
            return;
          }

          const ticketCode = result.getText().trim();

          if (!ticketCode) {
            return;
          }

          hasDetectedCode = true;
          activeControls.stop();
          controlsRef.current = null;
          setIsScanning(false);
          setScannerMessage("QR detected. Scanner paused until you scan again.");
          validateTicketCode(ticketCode);
        },
      );

      controlsRef.current = controls;
      setIsScanning(true);
      setScannerMessage("Scanner active. Point the camera at a ticket QR code.");
    } catch (error) {
      setIsScanning(false);
      setScannerMessage("");
      setErrorMessage(
        error?.message ||
          "Camera access is unavailable. You can still enter the ticket code manually.",
      );
    }
  }

  async function handleManualValidate(event) {
    event.preventDefault();
    stopScanner();
    await validateTicketCode(manualCode);
  }

  async function handleScanAgain() {
    clearPreview();
    await startScanner();
  }

  async function handleCheckIn() {
    if (!validatedTicket?.ticket_code) {
      return;
    }

    try {
      setIsCheckingIn(true);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await ticketService.checkInTicket(validatedTicket.ticket_code);
      const updatedTicket = response.data.data || {};

      setValidatedTicket((currentTicket) => ({
        ...currentTicket,
        status: updatedTicket.status || "used",
        checked_in_at: updatedTicket.checked_in_at || currentTicket?.checked_in_at || null,
      }));
      setIsCheckInModalOpen(false);
      setSuccessMessage(response.data.message || "Ticket checked in successfully");
    } catch (error) {
      if (error.response?.status === 401) {
        logout();
        navigate("/login", {
          replace: true,
          state: { from: `${location.pathname}${location.search}` },
        });
        return;
      }

      setErrorMessage(extractApiErrorMessage(error, "Unable to check in this ticket."));
    } finally {
      setIsCheckingIn(false);
    }
  }

  const ticketEventId = validatedTicket?.event?.id || validatedTicket?.event_id || "";
  const hasEventMismatch = Boolean(validatedTicket && ticketEventId && ticketEventId !== eventId);
  const cannotVerifyEventMatch = Boolean(validatedTicket && !ticketEventId);
  const canCheckIn =
    validatedTicket?.status === "valid" && !hasEventMismatch && !cannotVerifyEventMatch;
  const warningMessage = hasEventMismatch
    ? "This ticket belongs to a different event. It cannot be checked in from this event page."
    : cannotVerifyEventMatch
      ? "This ticket response does not include an event id, so the frontend cannot verify this page context."
      : "";

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
                <ClipboardCheck size={14} />
                Event check-in
              </div>

              <div>
                <h1 className="text-4xl font-semibold tracking-[-0.05em] text-zinc-950 dark:text-white">
                  Check in attendees
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                  Scan a ticket QR code or enter a ticket code manually. The ticket is validated
                  first; check-in only happens after confirmation.
                </p>
              </div>
            </div>

            <Chip
              variant="flat"
              className="w-fit border border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-white/10 dark:bg-white/10 dark:text-zinc-200"
            >
              Event context: {eventId}
            </Chip>
          </div>
        </section>

        {errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
            {successMessage}
          </div>
        ) : null}

        {warningMessage ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
            {warningMessage}
          </div>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
          <Card className="border border-zinc-200/80 bg-white/88 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <CardBody className="gap-5 p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-white">
                    QR scanner
                  </h2>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    Camera scanning pauses automatically after a QR code is detected.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    radius="full"
                    startContent={<Video size={15} />}
                    isLoading={isScanning && !scannerMessage}
                    onPress={startScanner}
                    className="bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                  >
                    {isScanning ? "Restart scanner" : "Start scanner"}
                  </Button>
                  <Button
                    radius="full"
                    variant="bordered"
                    startContent={<QrCode size={15} />}
                    onPress={handleScanAgain}
                    className="border-zinc-200 bg-white/70 font-medium text-zinc-950 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  >
                    Scan again
                  </Button>
                </div>
              </div>

              <div className="overflow-hidden rounded-[1.5rem] border border-zinc-200 bg-zinc-950 dark:border-white/10">
                <video
                  ref={videoRef}
                  className="aspect-video w-full bg-zinc-950 object-cover"
                  muted
                  playsInline
                />
              </div>

              {scannerMessage ? (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{scannerMessage}</p>
              ) : null}

              <form onSubmit={handleManualValidate} className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <Input
                  label="Manual ticket code"
                  labelPlacement="outside"
                  placeholder="SEM-ABC123"
                  value={manualCode}
                  onChange={(event) => setManualCode(event.target.value)}
                  radius="lg"
                  classNames={{
                    inputWrapper:
                      "bg-white/80 dark:bg-white/5 border border-zinc-200 dark:border-white/10 shadow-none",
                  }}
                />
                <div className="flex items-end gap-2">
                  <Button
                    type="submit"
                    radius="full"
                    startContent={<Search size={15} />}
                    isLoading={isValidating}
                    className="bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                  >
                    Validate
                  </Button>
                  <Button
                    type="button"
                    radius="full"
                    variant="bordered"
                    startContent={<RotateCcw size={15} />}
                    onPress={() => {
                      stopScanner();
                      clearPreview();
                    }}
                    className="border-zinc-200 bg-white/70 font-medium text-zinc-950 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  >
                    Reset
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>

          <Card
            className={`border bg-white/88 shadow-sm dark:bg-white/[0.04] ${
              warningMessage
                ? "border-amber-200 dark:border-amber-500/20"
                : "border-zinc-200/80 dark:border-white/10"
            }`}
          >
            <CardBody className="gap-5 p-6">
              <div>
                <h2 className="text-2xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-white">
                  Ticket preview
                </h2>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Validate the ticket before confirming check-in.
                </p>
              </div>

              {isValidating ? (
                <div className="flex min-h-64 flex-row items-center justify-center gap-3 text-zinc-600 dark:text-zinc-400">
                  <Spinner size="sm" color="default" />
                  <span className="text-sm">Validating ticket...</span>
                </div>
              ) : !validatedTicket ? (
                <div className="flex min-h-64 flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-zinc-300 px-6 text-center dark:border-white/10">
                  <ShieldAlert className="h-10 w-10 text-zinc-400" />
                  <h3 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-zinc-950 dark:text-white">
                    No ticket validated
                  </h3>
                  <p className="mt-2 max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
                    Scan a QR code or enter a ticket code to load the ticket preview.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                        Ticket code
                      </p>
                      <p className="mt-2 font-mono text-2xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-white">
                        {validatedTicket.ticket_code}
                      </p>
                    </div>
                    <Chip
                      variant="flat"
                      className={`w-fit border capitalize ${getStatusClassName(validatedTicket.status)}`}
                    >
                      {validatedTicket.status}
                    </Chip>
                  </div>

                  <div className="grid gap-3 text-sm">
                    <div className="rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                        Event
                      </p>
                      <p className="mt-2 font-medium text-zinc-900 dark:text-zinc-100">
                        {validatedTicket.event?.title || "Event unavailable"}
                      </p>
                      {validatedTicket.event?.event_date ? (
                        <p className="mt-1 flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                          <CalendarDays size={14} />
                          {formatEventDate(validatedTicket.event.event_date)}
                        </p>
                      ) : null}
                      <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                        {formatEventVenue(validatedTicket.event)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                        Attendee
                      </p>
                      <p className="mt-2 font-medium text-zinc-900 dark:text-zinc-100">
                        {formatAttendeeName(validatedTicket.attendee)}
                      </p>
                      {validatedTicket.attendee?.email ? (
                        <p className="mt-1 flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                          <Mail size={14} />
                          {validatedTicket.attendee.email}
                        </p>
                      ) : null}
                    </div>

                    <div className="rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                        Ticket tier
                      </p>
                      <p className="mt-2 font-medium text-zinc-900 dark:text-zinc-100">
                        {validatedTicket.ticket_tier?.name || "Ticket tier unavailable"}
                      </p>
                    </div>

                    {validatedTicket.checked_in_at ? (
                      <div className="rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                          Checked in
                        </p>
                        <p className="mt-2 font-medium text-zinc-900 dark:text-zinc-100">
                          {formatEventDate(validatedTicket.checked_in_at)}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    {canCheckIn ? (
                      <Button
                        radius="full"
                        startContent={<UserCheck size={15} />}
                        isLoading={isCheckingIn}
                        onPress={() => setIsCheckInModalOpen(true)}
                        className="bg-emerald-600 text-white"
                      >
                        Check in
                      </Button>
                    ) : (
                      <Button
                        radius="full"
                        isDisabled
                        startContent={
                          validatedTicket.status === "used" ? (
                            <CheckCircle2 size={15} />
                          ) : (
                            <XCircle size={15} />
                          )
                        }
                      >
                        Check-in unavailable
                      </Button>
                    )}

                    <Button
                      radius="full"
                      variant="bordered"
                      startContent={<QrCode size={15} />}
                      onPress={handleScanAgain}
                      className="border-zinc-200 bg-white/70 font-medium text-zinc-950 dark:border-white/10 dark:bg-white/5 dark:text-white"
                    >
                      Scan again
                    </Button>
                  </div>
                </>
              )}
            </CardBody>
          </Card>
        </section>
      </div>

      <Modal
        backdrop="blur"
        isOpen={isCheckInModalOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen && !isCheckingIn) {
            setIsCheckInModalOpen(false);
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
                Confirm check-in
                <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400">
                  This marks the ticket as used.
                </span>
              </ModalHeader>
              <ModalBody>
                <div className="grid gap-3 text-sm">
                  <div className="rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                      Attendee
                    </p>
                    <p className="mt-2 font-medium text-zinc-900 dark:text-zinc-100">
                      {formatAttendeeName(validatedTicket?.attendee)}
                    </p>
                    {validatedTicket?.attendee?.email ? (
                      <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                        {validatedTicket.attendee.email}
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                      Event
                    </p>
                    <p className="mt-2 font-medium text-zinc-900 dark:text-zinc-100">
                      {validatedTicket?.event?.title || "Event unavailable"}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                        Tier
                      </p>
                      <p className="mt-2 font-medium text-zinc-900 dark:text-zinc-100">
                        {validatedTicket?.ticket_tier?.name || "Ticket"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                        Ticket code
                      </p>
                      <p className="mt-2 font-mono font-medium text-zinc-900 dark:text-zinc-100">
                        {validatedTicket?.ticket_code || "Unavailable"}
                      </p>
                    </div>
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button
                  radius="full"
                  variant="light"
                  onPress={onClose}
                  isDisabled={isCheckingIn}
                >
                  Back
                </Button>
                <Button
                  radius="full"
                  color="success"
                  isLoading={isCheckingIn}
                  onPress={handleCheckIn}
                  className="text-white"
                >
                  Confirm check-in
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
