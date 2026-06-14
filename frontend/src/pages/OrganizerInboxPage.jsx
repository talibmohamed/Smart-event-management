import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Avatar, Button, Card, CardBody, Chip, Input } from "@heroui/react";
import { ArrowLeft, CalendarDays, MessageSquare, Search, Send } from "lucide-react";
import { Link as RouterLink, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { extractApiErrorMessage } from "../services/api";
import conversationService from "../services/conversationService";

function formatPersonName(user = {}) {
  return [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email || "User";
}

function getCounterpart(conversation, role) {
  return role === "organizer" ? conversation.attendee : conversation.organizer;
}

function upsertConversation(currentConversations, nextConversation) {
  const existingConversation = currentConversations.find(
    (conversation) => conversation.id === nextConversation.id,
  );

  if (!existingConversation) {
    return [nextConversation, ...currentConversations];
  }

  return currentConversations
    .map((conversation) =>
      conversation.id === nextConversation.id ? { ...conversation, ...nextConversation } : conversation,
    )
    .sort(
      (left, right) =>
        new Date(right.last_message_at || right.created_at).getTime() -
        new Date(left.last_message_at || left.created_at).getTime(),
    );
}

function EmptyState({ title, description }) {
  return (
    <Card className="border border-dashed border-zinc-300 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
      <CardBody className="gap-4 px-6 py-12 text-center">
        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-zinc-950 dark:text-white">
          {title}
        </h2>
        <p className="mx-auto max-w-xl text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
      </CardBody>
    </Card>
  );
}

export default function OrganizerInboxPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState("");
  const [activeConversation, setActiveConversation] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isListLoading, setIsListLoading] = useState(true);
  const [isConversationLoading, setIsConversationLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [flashMessage, setFlashMessage] = useState("");
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token, logout } = useAuth();
  const socketConnectionRef = useRef(null);
  const previousConversationIdRef = useRef("");

  const isOrganizerView = user?.role === "organizer";
  const pageTitle = isOrganizerView ? "Inbox" : "My messages";
  const pageDescription = isOrganizerView
    ? "Reply to attendee questions and keep event conversations organized."
    : "Chat with organizers about your booked events.";
  const counterpartLabel = isOrganizerView ? "attendee" : "organizer";
  const primaryRoute = isOrganizerView ? "/dashboard" : "/my-bookings";
  const primaryRouteLabel = isOrganizerView ? "Back to dashboard" : "Back to my bookings";

  const filteredConversations = useMemo(
    () =>
      conversations.filter((conversation) => {
        const counterpart = getCounterpart(conversation, user?.role);
        const counterpartName = formatPersonName(counterpart).toLowerCase();
        const eventTitle = conversation.event?.title?.toLowerCase() || "";
        const query = searchQuery.toLowerCase();

        return counterpartName.includes(query) || eventTitle.includes(query);
      }),
    [conversations, searchQuery, user?.role],
  );

  const redirectToLogin = useCallback(() => {
    logout();
    navigate("/login", {
      replace: true,
      state: { from: `${location.pathname}${location.search}` },
    });
  }, [location.pathname, location.search, logout, navigate]);

  const syncConversationList = useCallback((nextConversation) => {
    if (!nextConversation) {
      return;
    }

    setConversations((currentConversations) => upsertConversation(currentConversations, nextConversation));
  }, []);

  const markConversationRead = useCallback(
    async (conversationId) => {
      if (!conversationId) {
        return;
      }

      try {
        const response = await conversationService.markRead(conversationId);
        const payload = response.data.data || {};

        setConversations((currentConversations) =>
          currentConversations.map((conversation) =>
            conversation.id === conversationId
              ? { ...conversation, unread_count: payload.unread_count ?? 0 }
              : conversation,
          ),
        );
        if (typeof payload.total_unread_count === "number") {
          setTotalUnreadCount(payload.total_unread_count);
        }
      } catch (error) {
        if (error.response?.status === 401) {
          redirectToLogin();
        }
      }
    },
    [redirectToLogin],
  );

  const loadConversation = useCallback(
    async (conversationId) => {
      if (!conversationId) {
        return;
      }

      try {
        setIsConversationLoading(true);
        setFlashMessage("");

        const response = await conversationService.getConversation(conversationId);
        const nextConversation = response.data.data?.conversation;

        setActiveConversationId(conversationId);
        setActiveConversation(nextConversation);
        syncConversationList(nextConversation);
        await markConversationRead(conversationId);
      } catch (error) {
        if (error.response?.status === 401) {
          redirectToLogin();
          return;
        }

        setFlashMessage(extractApiErrorMessage(error, "Unable to load this conversation."));
      } finally {
        setIsConversationLoading(false);
      }
    },
    [markConversationRead, redirectToLogin, syncConversationList],
  );

  const openConversationByBooking = useCallback(
    async (bookingId) => {
      if (!bookingId) {
        return;
      }

      try {
        setIsConversationLoading(true);
        setFlashMessage("");

        const response = await conversationService.openConversation(bookingId);
        const nextConversation = response.data.data?.conversation;

        if (!nextConversation) {
          return;
        }

        setActiveConversationId(nextConversation.id);
        setActiveConversation(nextConversation);
        syncConversationList(nextConversation);
        await markConversationRead(nextConversation.id);
        setSearchParams((currentParams) => {
          const nextParams = new URLSearchParams(currentParams);
          nextParams.set("conversation", nextConversation.id);
          nextParams.delete("booking");
          return nextParams;
        });
      } catch (error) {
        if (error.response?.status === 401) {
          redirectToLogin();
          return;
        }

        setFlashMessage(extractApiErrorMessage(error, "Unable to open this conversation."));
      } finally {
        setIsConversationLoading(false);
      }
    },
    [markConversationRead, redirectToLogin, setSearchParams, syncConversationList],
  );

  useEffect(() => {
    let ignore = false;

    async function loadConversations() {
      try {
        setIsListLoading(true);
        setErrorMessage("");

        const response = await conversationService.listConversations();
        const payload = response.data.data || {};
        const nextConversations = payload.conversations || [];

        if (ignore) {
          return;
        }

        setConversations(nextConversations);
        setTotalUnreadCount(payload.total_unread_count || 0);

        const conversationFromQuery = searchParams.get("conversation");
        const bookingFromQuery = searchParams.get("booking");

        if (bookingFromQuery) {
          await openConversationByBooking(bookingFromQuery);
          return;
        }

        if (conversationFromQuery) {
          await loadConversation(conversationFromQuery);
          return;
        }

        if (nextConversations.length > 0) {
          await loadConversation(nextConversations[0].id);
        }
      } catch (error) {
        if (ignore) {
          return;
        }

        if (error.response?.status === 401) {
          redirectToLogin();
          return;
        }

        setErrorMessage(extractApiErrorMessage(error, "Unable to load conversations right now."));
      } finally {
        if (!ignore) {
          setIsListLoading(false);
        }
      }
    }

    loadConversations();

    return () => {
      ignore = true;
    };
  }, [loadConversation, location.pathname, location.search, openConversationByBooking, redirectToLogin, searchParams]);

  useEffect(() => {
    if (!token || !user) {
      return undefined;
    }

    const connection = conversationService.connect({
      token,
      onMessage({ conversation_id: conversationId, message }) {
        if (!conversationId || !message) {
          return;
        }

        if (conversationId === activeConversationId) {
          setActiveConversation((currentConversation) => {
            if (!currentConversation || currentConversation.id !== conversationId) {
              return currentConversation;
            }

            if (currentConversation.messages.some((currentMessage) => currentMessage.id === message.id)) {
              return currentConversation;
            }

            return {
              ...currentConversation,
              last_message_at: message.created_at,
              last_message: {
                id: message.id,
                body: message.body,
                sender_id: message.sender_id,
                created_at: message.created_at,
              },
              messages: [...currentConversation.messages, message],
            };
          });

          if (message.sender_id !== user.id) {
            void markConversationRead(conversationId);
          }
        }
      },
      onSummaryUpdate({ conversation }) {
        if (!conversation) {
          return;
        }

        syncConversationList(conversation);

        if (conversation.id === activeConversationId) {
          setActiveConversation((currentConversation) =>
            currentConversation
              ? {
                  ...currentConversation,
                  ...conversation,
                  messages: currentConversation.messages,
                }
              : currentConversation,
          );
        }
      },
      onRead({ conversation_id: conversationId, user_id: readerId, unread_count: unreadCount, total_unread_count: totalUnread }) {
        if (readerId !== user.id) {
          return;
        }

        setConversations((currentConversations) =>
          currentConversations.map((conversation) =>
            conversation.id === conversationId
              ? { ...conversation, unread_count: unreadCount ?? 0 }
              : conversation,
          ),
        );

        if (typeof totalUnread === "number") {
          setTotalUnreadCount(totalUnread);
        }
      },
    });

    socketConnectionRef.current = connection;

    return () => {
      connection.disconnect();
      socketConnectionRef.current = null;
    };
  }, [activeConversationId, markConversationRead, syncConversationList, token, user]);

  useEffect(() => {
    const connection = socketConnectionRef.current;

    if (!connection) {
      return undefined;
    }

    if (previousConversationIdRef.current) {
      connection.leaveConversation(previousConversationIdRef.current);
    }

    if (activeConversationId) {
      connection.joinConversation(activeConversationId);
      previousConversationIdRef.current = activeConversationId;
    }

    return () => {
      if (activeConversationId) {
        connection.leaveConversation(activeConversationId);
      }
    };
  }, [activeConversationId]);

  async function handleSendMessage(event) {
    event.preventDefault();

    if (!newMessage.trim() || !activeConversationId) {
      return;
    }

    try {
      setIsSending(true);
      setFlashMessage("");

      const response = await conversationService.sendMessage(activeConversationId, newMessage.trim());
      const payload = response.data.data || {};
      const sentMessage = payload.message;
      const nextConversationSummary = payload.conversation;

      setActiveConversation((currentConversation) => {
        if (!currentConversation || !sentMessage) {
          return currentConversation;
        }

        if (currentConversation.messages.some((message) => message.id === sentMessage.id)) {
          return currentConversation;
        }

        return {
          ...currentConversation,
          ...(nextConversationSummary || {}),
          messages: [...currentConversation.messages, sentMessage],
        };
      });
      syncConversationList(nextConversationSummary);
      setNewMessage("");
    } catch (error) {
      if (error.response?.status === 401) {
        redirectToLogin();
        return;
      }

      setFlashMessage(extractApiErrorMessage(error, "Unable to send this message."));
    } finally {
      setIsSending(false);
    }
  }

  const headerConversation = activeConversation || conversations.find((conversation) => conversation.id === activeConversationId) || null;
  const headerCounterpart = headerConversation ? getCounterpart(headerConversation, user?.role) : null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:py-12">
      <div className="mb-8 space-y-4">
        <div className="flex flex-col gap-3">
          <Button
            as={RouterLink}
            to={primaryRoute}
            radius="full"
            variant="light"
            startContent={<ArrowLeft size={15} />}
            className="w-fit px-0 text-zinc-600 dark:text-zinc-300"
          >
            {primaryRouteLabel}
          </Button>

          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-white">
              {pageTitle}
            </h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{pageDescription}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white/84 px-4 py-3 text-sm text-zinc-700 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300">
          <Chip
            size="sm"
            variant="flat"
            className="border border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-white/10 dark:bg-white/10 dark:text-zinc-200"
          >
            {conversations.length} conversation{conversations.length === 1 ? "" : "s"}
          </Chip>
          <Chip
            size="sm"
            variant="flat"
            className="border border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-white/10 dark:bg-white/10 dark:text-zinc-200"
          >
            {totalUnreadCount} unread
          </Chip>
        </div>
      </div>

      {errorMessage ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          {errorMessage}
        </div>
      ) : null}

      {flashMessage ? (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
          {flashMessage}
        </div>
      ) : null}

      {isListLoading ? (
        <EmptyState title="Loading conversations" description="Fetching your latest conversation activity." />
      ) : conversations.length === 0 ? (
        <EmptyState
          title="No conversations yet"
          description={
            isOrganizerView
              ? "Organizer conversations will appear here once attendees start chatting or you message them from attendee management."
              : "Your event conversations will appear here after you open one from a booked event."
          }
        />
      ) : (
        <div className="grid h-[600px] grid-cols-1 gap-6 md:grid-cols-3">
          <Card className="flex flex-col border border-zinc-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04] md:col-span-1">
            <div className="border-b border-zinc-200/70 p-4 dark:border-white/10">
              <Input
                placeholder={`Search ${counterpartLabel} or event...`}
                value={searchQuery}
                onValueChange={setSearchQuery}
                startContent={<Search size={16} className="text-zinc-400" />}
                variant="flat"
                radius="lg"
                classNames={{ inputWrapper: "bg-zinc-100 dark:bg-zinc-800/50" }}
              />
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredConversations.length > 0 ? (
                filteredConversations.map((conversation) => {
                  const counterpart = getCounterpart(conversation, user?.role);

                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => {
                        setSearchParams((currentParams) => {
                          const nextParams = new URLSearchParams(currentParams);
                          nextParams.set("conversation", conversation.id);
                          nextParams.delete("booking");
                          return nextParams;
                        });
                        void loadConversation(conversation.id);
                      }}
                      className={`block w-full border-b border-zinc-100 p-4 text-left transition-colors last:border-0 hover:bg-zinc-50 dark:border-white/5 dark:hover:bg-white/[0.02] ${
                        activeConversationId === conversation.id
                          ? "bg-sky-50/50 dark:bg-sky-500/10"
                          : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar
                            name={formatPersonName(counterpart)}
                            size="sm"
                            className="bg-zinc-900 text-white dark:bg-zinc-200 dark:text-zinc-900"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-zinc-950 dark:text-white">
                              {formatPersonName(counterpart)}
                            </p>
                            <p className="flex items-center gap-1 truncate text-[10px] font-medium uppercase tracking-wider text-sky-600 dark:text-sky-400">
                              <CalendarDays size={10} /> {conversation.event?.title}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="text-[11px] text-zinc-500">
                            {new Date(conversation.last_message_at || conversation.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {conversation.unread_count > 0 ? (
                            <Chip
                              size="sm"
                              variant="flat"
                              className="bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200"
                            >
                              {conversation.unread_count}
                            </Chip>
                          ) : null}
                        </div>
                      </div>
                      <p className="mt-2 truncate text-sm text-zinc-600 dark:text-zinc-400">
                        {conversation.last_message?.body || "No messages yet"}
                      </p>
                    </button>
                  );
                })
              ) : (
                <div className="p-6 text-center text-sm text-zinc-500">
                  No conversations match this search.
                </div>
              )}
            </div>
          </Card>

          <Card className="flex flex-col border border-zinc-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04] md:col-span-2">
            {headerConversation ? (
              <>
                <div className="flex items-center justify-between border-b border-zinc-200/70 p-4 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={formatPersonName(headerCounterpart)}
                      size="md"
                      className="bg-zinc-900 text-white dark:bg-zinc-200 dark:text-zinc-900"
                    />
                    <div>
                      <h3 className="text-base font-semibold text-zinc-950 dark:text-white">
                        {formatPersonName(headerCounterpart)}
                      </h3>
                      <Chip
                        size="sm"
                        variant="flat"
                        className="mt-1 bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300"
                      >
                        {headerConversation.event?.title}
                      </Chip>
                    </div>
                  </div>
                </div>

                <CardBody className="flex-1 overflow-y-auto bg-zinc-50/50 p-6 dark:bg-black/20">
                  {isConversationLoading ? (
                    <div className="flex h-full items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
                      Loading conversation...
                    </div>
                  ) : activeConversation?.messages?.length ? (
                    <div className="flex flex-col gap-4">
                      {activeConversation.messages.map((message) => {
                        const isMine = message.sender_id === user?.id;

                        return (
                          <div
                            key={message.id}
                            className={`flex w-full ${isMine ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`flex max-w-[75%] flex-col gap-1 ${isMine ? "items-end" : "items-start"}`}
                            >
                              <div
                                className={`rounded-2xl px-4 py-2 text-sm ${
                                  isMine
                                    ? "rounded-tr-sm bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                                    : "rounded-tl-sm border border-zinc-200/80 bg-white text-zinc-800 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-200"
                                }`}
                              >
                                {message.body}
                              </div>
                              <span className="px-1 text-[10px] text-zinc-400">
                                {new Date(message.created_at).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
                      No messages yet. Start the conversation.
                    </div>
                  )}
                </CardBody>

                <div className="border-t border-zinc-200/70 p-4 dark:border-white/10">
                  <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                    <Input
                      value={newMessage}
                      onValueChange={setNewMessage}
                      placeholder={`Reply to ${formatPersonName(headerCounterpart)}...`}
                      variant="flat"
                      radius="full"
                      className="flex-1"
                      classNames={{ inputWrapper: "bg-zinc-100 dark:bg-zinc-800/50" }}
                    />
                    <Button
                      isIconOnly
                      type="submit"
                      radius="full"
                      isDisabled={!newMessage.trim()}
                      isLoading={isSending}
                      className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                    >
                      <Send size={16} />
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-zinc-400">
                <MessageSquare size={48} className="mb-4 opacity-50" />
                <p>Select a conversation to view the thread</p>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
