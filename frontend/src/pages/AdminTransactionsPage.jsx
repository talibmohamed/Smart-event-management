import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Input,
  Link,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
} from "@heroui/react";
import { CreditCard, ExternalLink, ReceiptText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { extractApiErrorMessage } from "../services/api";
import adminTransactionService from "../services/adminTransactionService";

const PAGE_SIZE = 20;

const BOOKING_STATUS_OPTIONS = [
  { value: "all", label: "All booking statuses" },
  { value: "confirmed", label: "Confirmed" },
  { value: "pending_payment", label: "Pending payment" },
  { value: "cancelled", label: "Cancelled" },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: "all", label: "All payment statuses" },
  { value: "unpaid", label: "Unpaid" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "expired", label: "Expired" },
];

const SORT_OPTIONS = [
  { value: "date_desc", label: "Newest first" },
  { value: "date_asc", label: "Oldest first" },
  { value: "amount_desc", label: "Amount high-low" },
  { value: "amount_asc", label: "Amount low-high" },
];

function formatDate(value) {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatCents(value, currency = "eur") {
  if (value === null || value === undefined) {
    return "Not recorded";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "eur",
    minimumFractionDigits: 2,
  }).format(Number(value) / 100);
}

function formatInteger(value) {
  return new Intl.NumberFormat("en-US").format(Number(value || 0));
}

function formatStatusLabel(value) {
  return value ? value.replaceAll("_", " ") : "None";
}

function bookingStatusTone(status) {
  if (status === "confirmed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300";
  }

  if (status === "pending_payment") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300";
  }

  return "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-white/10 dark:bg-white/10 dark:text-zinc-300";
}

function paymentStatusTone(status) {
  if (status === "paid") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300";
  }

  if (status === "unpaid") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300";
  }

  if (status === "failed") {
    return "border-red-200 bg-red-50 text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300";
  }

  if (status === "expired") {
    return "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-300";
  }

  return "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-white/10 dark:bg-white/10 dark:text-zinc-300";
}

function selectClassNames() {
  return {
    trigger:
      "h-12 rounded-2xl border border-zinc-200 bg-white/88 px-4 shadow-none data-[hover=true]:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:data-[hover=true]:bg-white/[0.08]",
    value: "text-sm font-medium text-zinc-900 dark:text-zinc-50",
    popoverContent:
      "rounded-2xl border border-zinc-200 bg-white/95 p-1 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/95",
  };
}

function getStripeDashboardUrl(kind, id) {
  if (!id) {
    return "";
  }

  const mode = import.meta.env.VITE_STRIPE_DASHBOARD_MODE === "live" ? "" : "test/";
  const pathByKind = {
    checkout: "checkout/sessions",
    payment: "payments",
    event: "events",
  };

  return `https://dashboard.stripe.com/${mode}${pathByKind[kind]}/${id}`;
}

function DetailStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className="mt-2 break-words font-semibold text-zinc-950 dark:text-white">{value}</p>
    </div>
  );
}

function StripeLinkButton({ kind, id, children }) {
  if (!id) {
    return null;
  }

  return (
    <Button
      as={Link}
      href={getStripeDashboardUrl(kind, id)}
      target="_blank"
      rel="noreferrer"
      radius="full"
      variant="bordered"
      endContent={<ExternalLink size={14} />}
      className="border-zinc-200 bg-white/70 font-medium text-zinc-950 dark:border-white/10 dark:bg-white/5 dark:text-white"
    >
      {children}
    </Button>
  );
}

export default function AdminTransactionsPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [filters, setFilters] = useState({
    q: "",
    status: "all",
    paymentStatus: "all",
    dateFrom: "",
    dateTo: "",
    sort: "date_desc",
  });
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const queryParams = useMemo(
    () => ({
      page: 1,
      pageSize: PAGE_SIZE,
      q: filters.q.trim(),
      status: filters.status === "all" ? "" : filters.status,
      paymentStatus: filters.paymentStatus === "all" ? "" : filters.paymentStatus,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      sort: filters.sort,
    }),
    [filters],
  );

  function handleAuthError(error) {
    const status = error.response?.status;

    if (status === 401 || status === 403) {
      if (status === 401) {
        logout();
        navigate("/login", {
          replace: true,
          state: { from: `${location.pathname}${location.search}` },
        });
      } else {
        setErrorMessage(extractApiErrorMessage(error, "You do not have access to transactions."));
      }

      return true;
    }

    return false;
  }

  async function loadTransactions({ nextPage = 1, append = false } = {}) {
    try {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setErrorMessage("");

      const response = await adminTransactionService.listTransactions({
        ...queryParams,
        page: nextPage,
      });

      setTransactions((currentTransactions) =>
        append
          ? [...currentTransactions, ...(response.data.items || [])]
          : response.data.items || [],
      );
      setPage(response.data.page || nextPage);
      setTotal(response.data.total || 0);
      setHasMore(Boolean(response.data.hasMore));
    } catch (error) {
      if (handleAuthError(error)) {
        return;
      }

      setErrorMessage(extractApiErrorMessage(error, "Unable to load transactions."));
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }

  useEffect(() => {
    let ignore = false;

    async function loadInitialTransactions() {
      try {
        setIsLoading(true);
        setErrorMessage("");
        const response = await adminTransactionService.listTransactions(queryParams);

        if (!ignore) {
          setTransactions(response.data.items || []);
          setPage(response.data.page || 1);
          setTotal(response.data.total || 0);
          setHasMore(Boolean(response.data.hasMore));
        }
      } catch (error) {
        if (ignore) {
          return;
        }

        if (handleAuthError(error)) {
          return;
        }

        setErrorMessage(extractApiErrorMessage(error, "Unable to load transactions."));
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadInitialTransactions();

    return () => {
      ignore = true;
    };
  }, [queryParams]);

  function handleFilterChange(name, value) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value,
    }));
  }

  async function openTransactionDetail(id) {
    setSelectedTransaction(null);
    setDetailError("");
    setIsDetailLoading(true);

    try {
      const response = await adminTransactionService.getTransactionById(id);
      setSelectedTransaction(response.data.data);
    } catch (error) {
      if (handleAuthError(error)) {
        return;
      }

      setDetailError(extractApiErrorMessage(error, "Unable to load transaction details."));
    } finally {
      setIsDetailLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
      <div className="space-y-8">
        <section className="relative overflow-hidden rounded-section border border-zinc-200/70 bg-white/72 px-6 py-10 shadow-elev-2 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] md:px-8 md:py-12">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-10 top-0 h-56 w-56 rounded-full bg-sky-200/40 blur-3xl dark:bg-sky-500/10" />
            <div className="absolute right-0 top-10 h-56 w-56 rounded-full bg-emerald-200/35 blur-3xl dark:bg-emerald-500/10" />
          </div>

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-400">
                <ReceiptText size={14} />
                Payment supervision
              </div>
              <div>
                <h1 className="text-4xl font-semibold tracking-[-0.05em] text-zinc-950 dark:text-white">
                  Platform transactions
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                  Read-only booking/payment ledger for Stripe investigation and platform support.
                  No refunds, overrides, or booking mutations are available here.
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-200/80 bg-white/78 px-5 py-4 text-right dark:border-white/10 dark:bg-white/[0.05]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                Matching transactions
              </p>
              <p className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-white">
                {formatInteger(total)}
              </p>
            </div>
          </div>
        </section>

        <Card className="border border-zinc-200/80 bg-white/88 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <CardBody className="gap-4 p-5">
            <div className="grid gap-4 lg:grid-cols-[1.3fr_0.8fr_0.8fr_0.75fr_0.75fr_0.8fr]">
              <Input
                aria-label="Search transactions"
                value={filters.q}
                onValueChange={(value) => handleFilterChange("q", value)}
                placeholder="Search customer, event, or Stripe ID"
                radius="lg"
                variant="bordered"
                classNames={{
                  inputWrapper:
                    "h-12 rounded-2xl border border-zinc-200 bg-white/88 shadow-none dark:border-white/10 dark:bg-white/[0.06]",
                }}
              />

              <Select
                aria-label="Booking status"
                selectedKeys={[filters.status]}
                onSelectionChange={(keys) =>
                  handleFilterChange("status", Array.from(keys)[0] || "all")
                }
                radius="lg"
                variant="bordered"
                classNames={selectClassNames()}
              >
                {BOOKING_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} textValue={option.label}>
                    {option.label}
                  </SelectItem>
                ))}
              </Select>

              <Select
                aria-label="Payment status"
                selectedKeys={[filters.paymentStatus]}
                onSelectionChange={(keys) =>
                  handleFilterChange("paymentStatus", Array.from(keys)[0] || "all")
                }
                radius="lg"
                variant="bordered"
                classNames={selectClassNames()}
              >
                {PAYMENT_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} textValue={option.label}>
                    {option.label}
                  </SelectItem>
                ))}
              </Select>

              <Input
                aria-label="Date from"
                type="date"
                value={filters.dateFrom}
                onValueChange={(value) => handleFilterChange("dateFrom", value)}
                radius="lg"
                variant="bordered"
                classNames={{
                  inputWrapper:
                    "h-12 rounded-2xl border border-zinc-200 bg-white/88 shadow-none dark:border-white/10 dark:bg-white/[0.06]",
                }}
              />

              <Input
                aria-label="Date to"
                type="date"
                value={filters.dateTo}
                onValueChange={(value) => handleFilterChange("dateTo", value)}
                radius="lg"
                variant="bordered"
                classNames={{
                  inputWrapper:
                    "h-12 rounded-2xl border border-zinc-200 bg-white/88 shadow-none dark:border-white/10 dark:bg-white/[0.06]",
                }}
              />

              <Select
                aria-label="Sort transactions"
                selectedKeys={[filters.sort]}
                onSelectionChange={(keys) =>
                  handleFilterChange("sort", Array.from(keys)[0] || "date_desc")
                }
                radius="lg"
                variant="bordered"
                classNames={selectClassNames()}
              >
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} textValue={option.label}>
                    {option.label}
                  </SelectItem>
                ))}
              </Select>
            </div>
          </CardBody>
        </Card>

        {errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            {errorMessage}
          </div>
        ) : null}

        {isLoading ? (
          <Card className="border border-zinc-200/80 bg-white/88 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <CardBody className="px-6 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Loading transactions...
            </CardBody>
          </Card>
        ) : transactions.length === 0 ? (
          <Card className="border border-dashed border-zinc-300 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            <CardBody className="gap-3 px-6 py-12 text-center">
              <CreditCard className="mx-auto text-zinc-400" size={28} />
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-zinc-950 dark:text-white">
                No transactions match these filters
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Adjust search, status, date range, or sort controls.
              </p>
            </CardBody>
          </Card>
        ) : (
          <section className="space-y-4">
            <div className="hidden overflow-hidden rounded-card border border-zinc-200/80 bg-white/84 shadow-sm dark:border-white/10 dark:bg-white/[0.04] lg:block">
              <div className="grid grid-cols-[0.85fr_1.1fr_1.2fr_0.75fr_0.75fr_0.55fr] gap-4 border-b border-zinc-200/80 px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                <span>Date</span>
                <span>Customer</span>
                <span>Event</span>
                <span>Amount</span>
                <span>Status</span>
                <span />
              </div>

              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className={`grid grid-cols-[0.85fr_1.1fr_1.2fr_0.75fr_0.75fr_0.55fr] gap-4 border-b border-zinc-200/70 px-5 py-5 last:border-b-0 dark:border-white/10 ${
                    transaction.status === "cancelled" ? "bg-zinc-50/70 dark:bg-white/[0.025]" : ""
                  }`}
                >
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {formatDate(transaction.bookingDate)}
                  </p>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-zinc-950 dark:text-white">
                      {transaction.user.name || "Customer"}
                    </p>
                    <p className="mt-1 truncate text-sm text-zinc-600 dark:text-zinc-400">
                      {transaction.user.email}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-zinc-950 dark:text-white">
                      {transaction.event.title}
                    </p>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {formatDate(transaction.event.eventDate)}
                    </p>
                  </div>
                  <p className="font-semibold text-zinc-950 dark:text-white">
                    {formatCents(transaction.amountPaidCents, transaction.currency)}
                  </p>
                  <div className="space-y-2">
                    <Chip
                      variant="flat"
                      className={`border capitalize ${bookingStatusTone(transaction.status)}`}
                    >
                      {formatStatusLabel(transaction.status)}
                    </Chip>
                    <Chip
                      variant="flat"
                      className={`border capitalize ${paymentStatusTone(transaction.paymentStatus)}`}
                    >
                      {formatStatusLabel(transaction.paymentStatus)}
                    </Chip>
                  </div>
                  <Button
                    radius="full"
                    size="sm"
                    variant="bordered"
                    onPress={() => openTransactionDetail(transaction.id)}
                    className="border-zinc-200 bg-white/70 font-medium text-zinc-950 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  >
                    View
                  </Button>
                </div>
              ))}
            </div>

            <div className="grid gap-4 lg:hidden">
              {transactions.map((transaction) => (
                <Card
                  key={transaction.id}
                  className={`border border-zinc-200/80 bg-white/84 shadow-sm dark:border-white/10 dark:bg-white/[0.04] ${
                    transaction.status === "cancelled" ? "opacity-80" : ""
                  }`}
                >
                  <CardHeader className="flex flex-col items-start gap-3 px-5 pt-5">
                    <div className="flex w-full items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-semibold tracking-[-0.02em] text-zinc-950 dark:text-white">
                          {transaction.event.title}
                        </h2>
                        <p className="mt-1 truncate text-sm text-zinc-600 dark:text-zinc-400">
                          {transaction.user.name || transaction.user.email}
                        </p>
                      </div>
                      <Chip
                        variant="flat"
                        className={`border capitalize ${paymentStatusTone(transaction.paymentStatus)}`}
                      >
                        {formatStatusLabel(transaction.paymentStatus)}
                      </Chip>
                    </div>
                  </CardHeader>
                  <CardBody className="gap-4 px-5 pb-5">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <DetailStat label="Date" value={formatDate(transaction.bookingDate)} />
                      <DetailStat
                        label="Amount"
                        value={formatCents(transaction.amountPaidCents, transaction.currency)}
                      />
                      <DetailStat label="Booking" value={formatStatusLabel(transaction.status)} />
                      <DetailStat label="Tickets" value={transaction.ticketsCount} />
                    </div>
                    <Button
                      radius="full"
                      variant="bordered"
                      onPress={() => openTransactionDetail(transaction.id)}
                      className="border-zinc-200 bg-white/70 font-medium text-zinc-950 dark:border-white/10 dark:bg-white/5 dark:text-white"
                    >
                      View details
                    </Button>
                  </CardBody>
                </Card>
              ))}
            </div>

            {hasMore ? (
              <div className="flex justify-center">
                <Button
                  radius="full"
                  variant="bordered"
                  isLoading={isLoadingMore}
                  onPress={() => loadTransactions({ nextPage: page + 1, append: true })}
                  className="border-zinc-200 bg-white/70 px-6 font-medium text-zinc-950 dark:border-white/10 dark:bg-white/5 dark:text-white"
                >
                  Load more
                </Button>
              </div>
            ) : null}
          </section>
        )}
      </div>

      <Modal
        backdrop="blur"
        isOpen={Boolean(selectedTransaction) || isDetailLoading || Boolean(detailError)}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSelectedTransaction(null);
            setDetailError("");
          }
        }}
        size="4xl"
        scrollBehavior="inside"
        classNames={{
          base: "border border-zinc-200 bg-white text-zinc-950 shadow-2xl dark:border-white/10 dark:bg-zinc-950 dark:text-white",
          backdrop: "bg-zinc-950/45 backdrop-blur-sm",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Transaction details
                <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400">
                  Read-only booking/payment state and Stripe investigation IDs.
                </span>
              </ModalHeader>
              <ModalBody>
                {isDetailLoading ? (
                  <div className="rounded-2xl border border-zinc-200/80 px-4 py-8 text-center text-sm text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                    Loading transaction details...
                  </div>
                ) : detailError ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                    {detailError}
                  </div>
                ) : selectedTransaction ? (
                  <div className="space-y-6">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <DetailStat label="Booking ID" value={selectedTransaction.id} />
                      <DetailStat label="Date" value={formatDate(selectedTransaction.bookingDate)} />
                      <DetailStat
                        label="Amount"
                        value={formatCents(selectedTransaction.amountPaidCents, selectedTransaction.currency)}
                      />
                      <DetailStat label="Tickets" value={selectedTransaction.ticketsCount} />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-3">
                      <Card className="border border-zinc-200/80 bg-white/70 shadow-none dark:border-white/10 dark:bg-white/[0.03]">
                        <CardBody className="gap-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                            Customer
                          </p>
                          <p className="font-semibold text-zinc-950 dark:text-white">
                            {selectedTransaction.user.name || "Customer"}
                          </p>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            {selectedTransaction.user.email}
                          </p>
                        </CardBody>
                      </Card>

                      <Card className="border border-zinc-200/80 bg-white/70 shadow-none dark:border-white/10 dark:bg-white/[0.03]">
                        <CardBody className="gap-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                            Event
                          </p>
                          <p className="font-semibold text-zinc-950 dark:text-white">
                            {selectedTransaction.event.title}
                          </p>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            {formatDate(selectedTransaction.event.eventDate)}
                          </p>
                        </CardBody>
                      </Card>

                      <Card className="border border-zinc-200/80 bg-white/70 shadow-none dark:border-white/10 dark:bg-white/[0.03]">
                        <CardBody className="gap-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                            Organizer
                          </p>
                          <p className="font-semibold text-zinc-950 dark:text-white">
                            {selectedTransaction.event.organizer?.name || "Organizer"}
                          </p>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            {selectedTransaction.event.organizer?.email || "Email unavailable"}
                          </p>
                        </CardBody>
                      </Card>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Chip
                        variant="flat"
                        className={`border capitalize ${bookingStatusTone(selectedTransaction.status)}`}
                      >
                        Booking: {formatStatusLabel(selectedTransaction.status)}
                      </Chip>
                      <Chip
                        variant="flat"
                        className={`border capitalize ${paymentStatusTone(selectedTransaction.paymentStatus)}`}
                      >
                        Payment: {formatStatusLabel(selectedTransaction.paymentStatus)}
                      </Chip>
                    </div>

                    <div className="rounded-3xl border border-zinc-200/80 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                      <h3 className="font-semibold text-zinc-950 dark:text-white">Booking items</h3>
                      <div className="mt-3 space-y-2">
                        {selectedTransaction.items?.length ? (
                          selectedTransaction.items.map((item) => (
                            <div
                              key={item.ticketTierId}
                              className="flex flex-col gap-2 rounded-2xl bg-zinc-50/90 px-3 py-3 text-sm dark:bg-white/[0.04] sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div>
                                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                                  {item.ticketTierName}
                                </p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                  {item.quantity} x {formatCents(item.unitPriceCents, selectedTransaction.currency)}
                                </p>
                              </div>
                              <p className="font-semibold text-zinc-950 dark:text-white">
                                {formatCents(item.totalPriceCents, selectedTransaction.currency)}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            No booking item details available.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-zinc-200/80 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                      <h3 className="font-semibold text-zinc-950 dark:text-white">Ticket codes</h3>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedTransaction.ticketCodes?.length ? (
                          selectedTransaction.ticketCodes.map((ticketCode) => (
                            <span
                              key={ticketCode}
                              className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300"
                            >
                              {ticketCode}
                            </span>
                          ))
                        ) : (
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            No ticket codes issued.
                          </p>
                        )}
                        {selectedTransaction.ticketCodesTruncated ? (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                            +{selectedTransaction.ticketsCount - selectedTransaction.ticketCodesReturned} more
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-zinc-200/80 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                      <h3 className="font-semibold text-zinc-950 dark:text-white">Stripe IDs</h3>
                      <div className="mt-3 grid gap-3">
                        <DetailStat
                          label="Checkout session"
                          value={selectedTransaction.stripe.checkoutSessionId || "Not recorded"}
                        />
                        <DetailStat
                          label="Payment intent"
                          value={selectedTransaction.stripe.paymentIntentId || "Not recorded"}
                        />
                        <DetailStat
                          label="Webhook event"
                          value={selectedTransaction.stripe.eventId || "Not recorded"}
                        />
                      </div>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <StripeLinkButton kind="checkout" id={selectedTransaction.stripe.checkoutSessionId}>
                          View checkout session in Stripe
                        </StripeLinkButton>
                        <StripeLinkButton kind="payment" id={selectedTransaction.stripe.paymentIntentId}>
                          View payment intent in Stripe
                        </StripeLinkButton>
                        <StripeLinkButton kind="event" id={selectedTransaction.stripe.eventId}>
                          View webhook event in Stripe
                        </StripeLinkButton>
                      </div>
                    </div>
                  </div>
                ) : null}
              </ModalBody>
              <ModalFooter>
                <Button radius="full" variant="light" onPress={onClose}>
                  Close
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
