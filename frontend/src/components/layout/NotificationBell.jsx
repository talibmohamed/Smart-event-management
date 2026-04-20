import {
  Badge,
  Button,
  Chip,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@heroui/react";
import { Bell, CalendarDays, CheckCheck, Circle, Clock3 } from "lucide-react";

function formatNotificationDate(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificationBell({
  notifications = [],
  unreadCount = 0,
  onNotificationPress,
  onMarkAllRead,
}) {
  return (
    <Popover placement="bottom-end" offset={12}>
      <PopoverTrigger>
        <Button
          isIconOnly
          variant="light"
          radius="full"
          aria-label="Notifications"
          className="text-zinc-600 hover:bg-white/70 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white"
        >
          <Badge
            color="danger"
            content={unreadCount}
            isInvisible={unreadCount === 0}
            shape="circle"
          >
            <Bell size={19} />
          </Badge>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[25rem] max-w-[calc(100vw-1.5rem)] overflow-hidden border border-zinc-900/8 bg-white/95 p-0 shadow-2xl shadow-zinc-950/10 backdrop-blur-xl dark:border-white/10 dark:bg-[#101014]/95">
        <div className="w-full">
          <div className="flex items-start justify-between gap-4 border-b border-zinc-900/8 px-4 py-4 dark:border-white/10">
            <div>
              <p className="text-base font-semibold tracking-[-0.02em] text-zinc-950 dark:text-white">
                Notifications
              </p>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                Stay updated on bookings, payments, and ticket activity.
              </p>
            </div>
            <Chip
              size="sm"
              variant="flat"
              className="bg-zinc-100 text-zinc-700 dark:bg-white/10 dark:text-zinc-200"
            >
              {unreadCount} unread
            </Chip>
          </div>

          <div className="max-h-[26rem] overflow-y-auto px-2 py-2">
            {notifications.length > 0 ? (
              <div className="flex flex-col gap-2">
                {notifications.map((notification) => {
                  const isUnread = !notification.read_at;

                  return (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => onNotificationPress?.(notification)}
                      className={`group w-full rounded-2xl border p-3 text-left outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-sky-500/50 ${
                        isUnread
                          ? "border-sky-200 bg-sky-50/85 hover:border-sky-300 hover:bg-sky-50 dark:border-sky-400/20 dark:bg-sky-400/10 dark:hover:border-sky-400/35"
                          : "border-zinc-900/8 bg-white/70 hover:border-zinc-300 hover:bg-zinc-50 dark:border-white/8 dark:bg-white/[0.03] dark:hover:border-white/14 dark:hover:bg-white/[0.06]"
                      }`}
                    >
                      <div className="flex gap-3">
                        <div
                          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                            isUnread
                              ? "bg-sky-500 text-white shadow-sm shadow-sky-500/20"
                              : "bg-zinc-100 text-zinc-500 dark:bg-white/10 dark:text-zinc-300"
                          }`}
                        >
                          {isUnread ? <Bell size={16} /> : <CalendarDays size={16} />}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="line-clamp-1 text-sm font-semibold text-zinc-950 dark:text-white">
                              {notification.title}
                            </p>
                            {isUnread && (
                              <Circle
                                size={8}
                                className="mt-1.5 shrink-0 fill-sky-500 text-sky-500"
                              />
                            )}
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-600 dark:text-zinc-400">
                            {notification.message}
                          </p>
                          <div className="mt-2 flex items-center gap-1.5 text-[0.68rem] font-medium uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
                            <Clock3 size={12} />
                            <span>{formatNotificationDate(notification.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-white/10 dark:text-zinc-500">
                  <Bell size={20} />
                </div>
                <p className="mt-4 text-sm font-semibold text-zinc-950 dark:text-white">
                  No notifications yet
                </p>
                <p className="mt-1 max-w-56 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                  Booking, payment, event, and ticket updates will appear here.
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-zinc-900/8 bg-zinc-50/80 px-3 py-3 dark:border-white/10 dark:bg-white/[0.03]">
            <Button
              fullWidth
              size="sm"
              radius="full"
              variant="flat"
              startContent={<CheckCheck size={15} />}
              isDisabled={unreadCount === 0}
              onPress={onMarkAllRead}
              className="bg-white font-semibold text-zinc-700 shadow-sm dark:bg-white/10 dark:text-zinc-200"
            >
              Mark all as read
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
