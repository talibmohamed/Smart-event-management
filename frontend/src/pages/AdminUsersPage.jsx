import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Tooltip,
} from "@heroui/react";
import { ShieldCheck, UserCog, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import adminUserService from "../services/adminUserService";
import { extractApiErrorMessage } from "../services/api";

const PAGE_SIZE = 20;

const ROLE_OPTIONS = [
  { value: "all", label: "All roles" },
  { value: "attendee", label: "Attendee" },
  { value: "organizer", label: "Organizer" },
  { value: "admin", label: "Admin" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
];

const SORT_OPTIONS = [
  { value: "created_desc", label: "Newest first" },
  { value: "created_asc", label: "Oldest first" },
  { value: "email_asc", label: "Email A-Z" },
  { value: "email_desc", label: "Email Z-A" },
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

function roleTone(role) {
  if (role === "admin") {
    return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300";
  }

  if (role === "organizer") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300";
  }

  return "border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-white/10 dark:bg-white/10 dark:text-zinc-300";
}

function statusTone(status) {
  if (status === "suspended") {
    return "border-red-200 bg-red-50 text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300";
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

function DetailStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className="mt-2 font-semibold text-zinc-950 dark:text-white">{value}</p>
    </div>
  );
}

export default function AdminUsersPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [filters, setFilters] = useState({
    q: "",
    role: "all",
    status: "all",
    sort: "created_desc",
  });
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [flashMessage, setFlashMessage] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [pendingAction, setPendingAction] = useState(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const queryParams = useMemo(
    () => ({
      page: 1,
      pageSize: PAGE_SIZE,
      q: filters.q.trim(),
      role: filters.role === "all" ? "" : filters.role,
      status: filters.status === "all" ? "" : filters.status,
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
        setErrorMessage(extractApiErrorMessage(error, "You do not have access to admin users."));
      }

      return true;
    }

    return false;
  }

  async function loadUsers({ nextPage = 1, append = false } = {}) {
    try {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setErrorMessage("");

      const response = await adminUserService.listUsers({
        ...queryParams,
        page: nextPage,
      });

      setUsers((currentUsers) =>
        append ? [...currentUsers, ...(response.data.items || [])] : response.data.items || [],
      );
      setPage(response.data.page || nextPage);
      setTotal(response.data.total || 0);
      setHasMore(Boolean(response.data.hasMore));
    } catch (error) {
      if (handleAuthError(error)) {
        return;
      }

      setErrorMessage(extractApiErrorMessage(error, "Unable to load users."));
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }

  useEffect(() => {
    let ignore = false;

    async function loadInitialUsers() {
      try {
        setIsLoading(true);
        setErrorMessage("");
        const response = await adminUserService.listUsers(queryParams);

        if (!ignore) {
          setUsers(response.data.items || []);
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

        setErrorMessage(extractApiErrorMessage(error, "Unable to load users."));
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadInitialUsers();

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

  async function openUserDetail(userId) {
    setSelectedUser(null);
    setDetailError("");
    setIsDetailLoading(true);

    try {
      const response = await adminUserService.getUserById(userId);
      setSelectedUser(response.data.data);
    } catch (error) {
      if (handleAuthError(error)) {
        return;
      }

      setDetailError(extractApiErrorMessage(error, "Unable to load user details."));
    } finally {
      setIsDetailLoading(false);
    }
  }

  function mergeUpdatedUser(updatedUser) {
    setUsers((currentUsers) =>
      currentUsers.map((currentUser) =>
        currentUser.id === updatedUser.id ? { ...currentUser, ...updatedUser } : currentUser,
      ),
    );
    setSelectedUser((currentUser) =>
      currentUser?.id === updatedUser.id ? { ...currentUser, ...updatedUser } : currentUser,
    );
  }

  async function confirmPendingAction() {
    if (!pendingAction) {
      return;
    }

    try {
      setIsActionLoading(true);
      setFlashMessage("");

      const response =
        pendingAction.kind === "role"
          ? await adminUserService.updateUserRole(pendingAction.userId, pendingAction.value)
          : await adminUserService.updateUserStatus(pendingAction.userId, pendingAction.value);

      mergeUpdatedUser(response.data.data);
      setFlashMessage(response.data.message || "User updated successfully");
      setPendingAction(null);
    } catch (error) {
      if (handleAuthError(error)) {
        return;
      }

      setFlashMessage(extractApiErrorMessage(error, "Unable to update user."));
    } finally {
      setIsActionLoading(false);
    }
  }

  const selfSelected = selectedUser?.id === user?.id;
  const nextStatus = selectedUser?.status === "suspended" ? "active" : "suspended";

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
      <div className="space-y-8">
        <section className="relative overflow-hidden rounded-section border border-zinc-200/70 bg-white/72 px-6 py-10 shadow-elev-2 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] md:px-8 md:py-12">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-10 top-0 h-56 w-56 rounded-full bg-sky-200/40 blur-3xl dark:bg-sky-500/10" />
            <div className="absolute right-0 top-10 h-56 w-56 rounded-full bg-amber-200/35 blur-3xl dark:bg-amber-500/10" />
          </div>

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-400">
                <ShieldCheck size={14} />
                Admin controls
              </div>
              <div>
                <h1 className="text-4xl font-semibold tracking-[-0.05em] text-zinc-950 dark:text-white">
                  Platform users
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                  Search users, inspect account activity, change platform roles, and suspend or
                  reactivate accounts from one backend-guarded admin surface.
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-200/80 bg-white/78 px-5 py-4 text-right dark:border-white/10 dark:bg-white/[0.05]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                Matching users
              </p>
              <p className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-white">
                {total}
              </p>
            </div>
          </div>
        </section>

        <Card className="border border-zinc-200/80 bg-white/88 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <CardBody className="gap-4 p-5">
            <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr_0.8fr_0.9fr]">
              <Input
                aria-label="Search users"
                value={filters.q}
                onValueChange={(value) => handleFilterChange("q", value)}
                placeholder="Search by name or email"
                radius="lg"
                variant="bordered"
                classNames={{
                  inputWrapper:
                    "h-12 rounded-2xl border border-zinc-200 bg-white/88 shadow-none dark:border-white/10 dark:bg-white/[0.06]",
                }}
              />

              <Select
                aria-label="Role filter"
                selectedKeys={[filters.role]}
                onSelectionChange={(keys) => handleFilterChange("role", Array.from(keys)[0] || "all")}
                radius="lg"
                variant="bordered"
                classNames={selectClassNames()}
              >
                {ROLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} textValue={option.label}>
                    {option.label}
                  </SelectItem>
                ))}
              </Select>

              <Select
                aria-label="Status filter"
                selectedKeys={[filters.status]}
                onSelectionChange={(keys) =>
                  handleFilterChange("status", Array.from(keys)[0] || "all")
                }
                radius="lg"
                variant="bordered"
                classNames={selectClassNames()}
              >
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} textValue={option.label}>
                    {option.label}
                  </SelectItem>
                ))}
              </Select>

              <Select
                aria-label="Sort users"
                selectedKeys={[filters.sort]}
                onSelectionChange={(keys) =>
                  handleFilterChange("sort", Array.from(keys)[0] || "created_desc")
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

        {flashMessage ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
            {flashMessage}
          </div>
        ) : null}

        {isLoading ? (
          <Card className="border border-zinc-200/80 bg-white/88 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <CardBody className="px-6 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Loading users...
            </CardBody>
          </Card>
        ) : users.length === 0 ? (
          <Card className="border border-dashed border-zinc-300 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            <CardBody className="gap-3 px-6 py-12 text-center">
              <UsersRound className="mx-auto text-zinc-400" size={28} />
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-zinc-950 dark:text-white">
                No users match these filters
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Adjust the search, role, status, or sort controls.
              </p>
            </CardBody>
          </Card>
        ) : (
          <section className="space-y-4">
            <div className="hidden overflow-hidden rounded-card border border-zinc-200/80 bg-white/84 shadow-sm dark:border-white/10 dark:bg-white/[0.04] lg:block">
              <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_0.8fr_0.6fr] gap-4 border-b border-zinc-200/80 px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                <span>User</span>
                <span>Role</span>
                <span>Status</span>
                <span>Created</span>
                <span>Bookings</span>
                <span />
              </div>

              {users.map((account) => (
                <div
                  key={account.id}
                  className={`grid grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_0.8fr_0.6fr] gap-4 border-b border-zinc-200/70 px-5 py-5 last:border-b-0 dark:border-white/10 ${
                    account.status === "suspended" ? "bg-red-50/35 dark:bg-red-500/[0.04]" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-zinc-950 dark:text-white">
                      {account.name || "Unnamed user"}
                    </p>
                    <p className="mt-1 truncate text-sm text-zinc-600 dark:text-zinc-400">
                      {account.email}
                    </p>
                  </div>
                  <div>
                    <Chip variant="flat" className={`border capitalize ${roleTone(account.role)}`}>
                      {account.role}
                    </Chip>
                  </div>
                  <div>
                    <Chip
                      variant="flat"
                      className={`border capitalize ${statusTone(account.status)}`}
                    >
                      {account.status}
                    </Chip>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {formatDate(account.createdAt)}
                  </p>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {account.bookingsCount} bookings
                  </p>
                  <Button
                    radius="full"
                    size="sm"
                    variant="bordered"
                    onPress={() => openUserDetail(account.id)}
                    className="border-zinc-200 bg-white/70 font-medium text-zinc-950 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  >
                    View
                  </Button>
                </div>
              ))}
            </div>

            <div className="grid gap-4 lg:hidden">
              {users.map((account) => (
                <Card
                  key={account.id}
                  className={`border border-zinc-200/80 bg-white/84 shadow-sm dark:border-white/10 dark:bg-white/[0.04] ${
                    account.status === "suspended" ? "ring-1 ring-red-200 dark:ring-red-500/20" : ""
                  }`}
                >
                  <CardHeader className="flex flex-col items-start gap-3 px-5 pt-5">
                    <div className="flex w-full items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-semibold tracking-[-0.02em] text-zinc-950 dark:text-white">
                          {account.name || "Unnamed user"}
                        </h2>
                        <p className="mt-1 truncate text-sm text-zinc-600 dark:text-zinc-400">
                          {account.email}
                        </p>
                      </div>
                      <Chip variant="flat" className={`border capitalize ${statusTone(account.status)}`}>
                        {account.status}
                      </Chip>
                    </div>
                  </CardHeader>
                  <CardBody className="gap-4 px-5 pb-5">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <DetailStat label="Role" value={account.role} />
                      <DetailStat label="Bookings" value={account.bookingsCount} />
                      <DetailStat label="Events" value={account.eventsOrganizedCount} />
                      <DetailStat label="Created" value={formatDate(account.createdAt)} />
                    </div>
                    <Button
                      radius="full"
                      variant="bordered"
                      onPress={() => openUserDetail(account.id)}
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
                  onPress={() => loadUsers({ nextPage: page + 1, append: true })}
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
        isOpen={Boolean(selectedUser) || isDetailLoading || Boolean(detailError)}
        onOpenChange={(isOpen) => {
          if (!isOpen && !isActionLoading) {
            setSelectedUser(null);
            setDetailError("");
          }
        }}
        size="3xl"
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
                User details
                <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400">
                  Role and suspension actions are still enforced by backend middleware.
                </span>
              </ModalHeader>
              <ModalBody>
                {isDetailLoading ? (
                  <div className="rounded-2xl border border-zinc-200/80 px-4 py-8 text-center text-sm text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                    Loading user details...
                  </div>
                ) : detailError ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                    {detailError}
                  </div>
                ) : selectedUser ? (
                  <div className="space-y-6">
                    <div className="flex flex-col gap-4 rounded-3xl border border-zinc-200/80 bg-zinc-50/70 p-5 dark:border-white/10 dark:bg-white/[0.03] sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
                          <UserCog size={22} />
                        </div>
                        <h2 className="truncate text-2xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-white">
                          {selectedUser.name || "Unnamed user"}
                        </h2>
                        <p className="mt-1 truncate text-sm text-zinc-600 dark:text-zinc-400">
                          {selectedUser.email}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Chip variant="flat" className={`border capitalize ${roleTone(selectedUser.role)}`}>
                          {selectedUser.role}
                        </Chip>
                        <Chip
                          variant="flat"
                          className={`border capitalize ${statusTone(selectedUser.status)}`}
                        >
                          {selectedUser.status}
                        </Chip>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <DetailStat label="Bookings" value={selectedUser.bookingsCount} />
                      <DetailStat label="Events organized" value={selectedUser.eventsOrganizedCount} />
                      <DetailStat label="Created" value={formatDate(selectedUser.createdAt)} />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-3xl border border-zinc-200/80 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                          Role
                        </p>
                        <Select
                          aria-label="Change user role"
                          selectedKeys={[selectedUser.role]}
                          isDisabled={selfSelected}
                          onSelectionChange={(keys) => {
                            const nextRole = Array.from(keys)[0];

                            if (nextRole && nextRole !== selectedUser.role) {
                              setPendingAction({
                                kind: "role",
                                userId: selectedUser.id,
                                value: nextRole,
                                title: "Change user role",
                                message: `Change ${selectedUser.email} to ${nextRole}? Existing organized events stay owned by this user.`,
                              });
                            }
                          }}
                          radius="lg"
                          variant="bordered"
                          classNames={selectClassNames()}
                        >
                          {ROLE_OPTIONS.filter((option) => option.value !== "all").map((option) => (
                            <SelectItem key={option.value} textValue={option.label}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </Select>
                        {selfSelected ? (
                          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                            You cannot change your own role.
                          </p>
                        ) : null}
                      </div>

                      <div className="rounded-3xl border border-zinc-200/80 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                          Account status
                        </p>
                        <Tooltip
                          content="You cannot suspend yourself"
                          isDisabled={!selfSelected}
                          placement="top"
                        >
                          <span className="inline-flex">
                            <Button
                              radius="full"
                              color={nextStatus === "suspended" ? "danger" : "success"}
                              variant="flat"
                              isDisabled={selfSelected}
                              onPress={() =>
                                setPendingAction({
                                  kind: "status",
                                  userId: selectedUser.id,
                                  value: nextStatus,
                                  title:
                                    nextStatus === "suspended"
                                      ? "Suspend user"
                                      : "Reactivate user",
                                  message:
                                    nextStatus === "suspended"
                                      ? `Suspend ${selectedUser.email}? This blocks login and invalidates existing JWT access through middleware checks. Existing bookings and payments are not cancelled.`
                                      : `Reactivate ${selectedUser.email}? They will be able to log in again.`,
                                })
                              }
                            >
                              {nextStatus === "suspended" ? "Suspend user" : "Unsuspend user"}
                            </Button>
                          </span>
                        </Tooltip>
                        {selfSelected ? (
                          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                            You cannot suspend your own account.
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-3xl border border-zinc-200/80 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                        <h3 className="font-semibold text-zinc-950 dark:text-white">
                          Recent bookings
                        </h3>
                        <div className="mt-3 space-y-2">
                          {selectedUser.recentBookings?.length ? (
                            selectedUser.recentBookings.map((booking) => (
                              <div
                                key={booking.id}
                                className="rounded-2xl bg-zinc-50/90 px-3 py-2 text-sm dark:bg-white/[0.04]"
                              >
                                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                                  {booking.eventTitle}
                                </p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                  {booking.status} | {formatDate(booking.createdAt)}
                                </p>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                              No recent bookings.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="rounded-3xl border border-zinc-200/80 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                        <h3 className="font-semibold text-zinc-950 dark:text-white">
                          Recent events organized
                        </h3>
                        <div className="mt-3 space-y-2">
                          {selectedUser.recentEventsOrganized?.length ? (
                            selectedUser.recentEventsOrganized.map((event) => (
                              <div
                                key={event.id}
                                className="rounded-2xl bg-zinc-50/90 px-3 py-2 text-sm dark:bg-white/[0.04]"
                              >
                                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                                  {event.title}
                                </p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                  Starts {formatDate(event.startsAt)}
                                </p>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                              No organized events.
                            </p>
                          )}
                        </div>
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

      <Modal
        backdrop="blur"
        isOpen={Boolean(pendingAction)}
        onOpenChange={(isOpen) => {
          if (!isOpen && !isActionLoading) {
            setPendingAction(null);
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
              <ModalHeader>{pendingAction?.title}</ModalHeader>
              <ModalBody>
                <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                  {pendingAction?.message}
                </p>
              </ModalBody>
              <ModalFooter>
                <Button
                  radius="full"
                  variant="light"
                  isDisabled={isActionLoading}
                  onPress={onClose}
                >
                  Cancel
                </Button>
                <Button
                  radius="full"
                  color={pendingAction?.value === "suspended" ? "danger" : "primary"}
                  isLoading={isActionLoading}
                  onPress={confirmPendingAction}
                >
                  Confirm
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
