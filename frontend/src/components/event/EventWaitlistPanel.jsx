import { Button, Card, CardBody, Chip } from "@heroui/react";
import { Clock3 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { extractApiErrorMessage } from "../../services/api";
import waitlistService from "../../services/waitlistService";

const DEFAULT_STATUS = {
  is_waiting: false,
  position: null,
  total_waiting: 0,
};

export default function EventWaitlistPanel({ eventId, isVisible = false }) {
  const [status, setStatus] = useState(DEFAULT_STATUS);
  const [isLoading, setIsLoading] = useState(false);
  const [messageState, setMessageState] = useState(null);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAttendee = user?.role === "attendee";

  const redirectToLogin = useCallback(() => {
    logout();
    navigate("/login", {
      replace: true,
      state: { from: `${location.pathname}${location.search}` },
    });
  }, [location.pathname, location.search, logout, navigate]);

  const loadStatus = useCallback(async () => {
    if (!isVisible || !isAuthenticated || !isAttendee) {
      return;
    }

    try {
      setIsLoading(true);
      const response = await waitlistService.getMyStatus(eventId);
      setStatus(response.data.data || DEFAULT_STATUS);
    } catch (error) {
      if (error.response?.status === 401) {
        redirectToLogin();
        return;
      }

      setMessageState({
        tone: "error",
        message: extractApiErrorMessage(error, "Unable to load waitlist status."),
      });
    } finally {
      setIsLoading(false);
    }
  }, [eventId, isAttendee, isAuthenticated, isVisible, redirectToLogin]);

  useEffect(() => {
    setStatus(DEFAULT_STATUS);
    setMessageState(null);
  }, [eventId]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  async function handleToggle() {
    if (!isAuthenticated || !isAttendee) {
      return;
    }

    try {
      setIsLoading(true);
      setMessageState(null);

      const response = status.is_waiting
        ? await waitlistService.leaveWaitlist(eventId)
        : await waitlistService.joinWaitlist(eventId);

      if (status.is_waiting) {
        setStatus(DEFAULT_STATUS);
      } else {
        setStatus(response.data.data || DEFAULT_STATUS);
      }

      setMessageState({
        tone: "success",
        message: response.data.message || "Waitlist updated successfully",
      });
    } catch (error) {
      if (error.response?.status === 401) {
        redirectToLogin();
        return;
      }

      setMessageState({
        tone: "error",
        message: extractApiErrorMessage(error, "Unable to update waitlist status."),
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (!isVisible || !isAttendee) {
    return null;
  }

  return (
    <Card className="border border-zinc-200/80 bg-white/84 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <CardBody className="gap-4 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 dark:bg-white/10 dark:text-zinc-200">
                <Clock3 size={18} />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-[-0.03em] text-zinc-950 dark:text-white">
                  Waitlist
                </h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  This event is currently full. You can join the waitlist and keep your place in line.
                </p>
              </div>
            </div>

            {status.is_waiting ? (
              <div className="flex flex-wrap items-center gap-2">
                <Chip
                  variant="flat"
                  className="border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300"
                >
                  Position #{status.position}
                </Chip>
                <Chip
                  variant="flat"
                  className="border border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-white/10 dark:bg-white/10 dark:text-zinc-200"
                >
                  {status.total_waiting} waiting
                </Chip>
              </div>
            ) : null}
          </div>

          <Button
            radius="full"
            variant={status.is_waiting ? "bordered" : "solid"}
            isLoading={isLoading}
            onPress={handleToggle}
            className={
              status.is_waiting
                ? "border-zinc-200 bg-white/80 font-medium text-zinc-950 dark:border-white/10 dark:bg-white/5 dark:text-white"
                : "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
            }
          >
            {status.is_waiting ? "Leave waitlist" : "Join waitlist"}
          </Button>
        </div>

        {messageState?.message ? (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              messageState.tone === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                : "border-red-200 bg-red-50 text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
            }`}
          >
            {messageState.message}
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
