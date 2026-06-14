import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card, CardBody, CardHeader, Chip, Input } from "@heroui/react";
import { Lock, MessageSquare, Send } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { extractApiErrorMessage } from "../../services/api";
import bookingService from "../../services/bookingService";
import conversationService from "../../services/conversationService";

function findEligibleBooking(bookings, eventId) {
  return bookings.find(
    (booking) =>
      booking.event_id === eventId &&
      ["confirmed", "pending_payment"].includes(booking.status),
  );
}

export default function EventChat({ eventId, eventTitle = "This event" }) {
  const [conversation, setConversation] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const socketConnectionRef = useRef(null);
  const activeConversationIdRef = useRef("");

  const redirectToLogin = useCallback(() => {
    logout();
    navigate("/login", {
      replace: true,
      state: { from: `${location.pathname}${location.search}` },
    });
  }, [location.pathname, location.search, logout, navigate]);

  const markRead = useCallback(
    async (conversationId) => {
      if (!conversationId) {
        return;
      }

      try {
        await conversationService.markRead(conversationId);
      } catch (error) {
        if (error.response?.status === 401) {
          redirectToLogin();
        }
      }
    },
    [redirectToLogin],
  );

  useEffect(() => {
    let ignore = false;

    async function loadConversation() {
      try {
        setIsLoading(true);
        setErrorMessage("");
        setIsLocked(false);

        const bookingsResponse = await bookingService.getMyBookings();
        const bookings = bookingsResponse.data.data || [];
        const booking = findEligibleBooking(bookings, eventId);

        if (!booking) {
          if (!ignore) {
            setConversation(null);
            setIsLocked(true);
          }
          return;
        }

        const conversationResponse = await conversationService.openConversation(booking.id);
        const nextConversation = conversationResponse.data.data?.conversation;

        if (!ignore) {
          setConversation(nextConversation);
          if (nextConversation?.id) {
            await markRead(nextConversation.id);
          }
        }
      } catch (error) {
        if (ignore) {
          return;
        }

        if (error.response?.status === 401) {
          redirectToLogin();
          return;
        }

        if (error.response?.status === 403) {
          setIsLocked(true);
          return;
        }

        setErrorMessage(extractApiErrorMessage(error, "Unable to load event messaging."));
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadConversation();

    return () => {
      ignore = true;
    };
  }, [eventId, markRead, redirectToLogin]);

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

        if (conversationId !== activeConversationIdRef.current) {
          return;
        }

        setConversation((currentConversation) => {
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
          void markRead(conversationId);
        }
      },
    });

    socketConnectionRef.current = connection;

    return () => {
      connection.disconnect();
      socketConnectionRef.current = null;
    };
  }, [markRead, token, user]);

  useEffect(() => {
    const connection = socketConnectionRef.current;

    if (!connection || !conversation?.id) {
      return undefined;
    }

    connection.joinConversation(conversation.id);
    activeConversationIdRef.current = conversation.id;

    return () => {
      connection.leaveConversation(conversation.id);
    };
  }, [conversation?.id]);

  async function handleSendMessage(event) {
    event.preventDefault();

    if (!conversation?.id || !newMessage.trim()) {
      return;
    }

    try {
      setIsSending(true);
      setErrorMessage("");

      const response = await conversationService.sendMessage(conversation.id, newMessage.trim());
      const payload = response.data.data || {};
      const sentMessage = payload.message;
      const nextConversationSummary = payload.conversation;

      setConversation((currentConversation) => {
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
      setNewMessage("");
    } catch (error) {
      if (error.response?.status === 401) {
        redirectToLogin();
        return;
      }

      setErrorMessage(extractApiErrorMessage(error, "Unable to send this message."));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Card className="w-full border border-zinc-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
      <CardHeader className="flex items-center justify-between gap-4 border-b border-zinc-200/70 p-4 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white">
            <MessageSquare size={18} />
          </div>
          <div>
            <h3 className="text-md font-semibold text-zinc-900 dark:text-white">
              Message organizer
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{eventTitle}</p>
          </div>
        </div>
        <Chip
          size="sm"
          variant="flat"
          className="border border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-white/10 dark:bg-white/10 dark:text-zinc-200"
        >
          Live
        </Chip>
      </CardHeader>

      <CardBody className="gap-4 bg-zinc-50/50 p-4 dark:bg-black/20">
        {isLoading ? (
          <div className="flex h-72 items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
            Loading conversation...
          </div>
        ) : isLocked ? (
          <div className="flex h-72 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-300 bg-white/70 px-6 text-center dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 dark:bg-white/10 dark:text-zinc-300">
              <Lock size={18} />
            </div>
            <p className="text-sm font-semibold text-zinc-950 dark:text-white">
              Messaging is available after booking
            </p>
            <p className="max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
              Book this event first. Once you have a confirmed or pending booking, you can chat with the organizer here.
            </p>
          </div>
        ) : errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            {errorMessage}
          </div>
        ) : (
          <>
            <div className="flex h-72 flex-col gap-4 overflow-y-auto">
              {conversation?.messages?.length ? (
                conversation.messages.map((message) => {
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
                })
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
                  No messages yet. Start the conversation.
                </div>
              )}
            </div>

            <form
              onSubmit={handleSendMessage}
              className="flex items-center gap-2 border-t border-zinc-200/70 pt-3 dark:border-white/10"
            >
              <Input
                value={newMessage}
                onValueChange={setNewMessage}
                placeholder="Write your message..."
                variant="flat"
                radius="full"
                className="flex-1"
                classNames={{
                  input: "text-sm",
                  inputWrapper: "bg-zinc-100 dark:bg-zinc-800",
                }}
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
          </>
        )}
      </CardBody>
    </Card>
  );
}
