import { useMemo, useState } from "react";
import { Avatar, Button, Card, CardBody, Chip, Input } from "@heroui/react";
import { CalendarDays, MessageSquare, Search, Send } from "lucide-react";

const PREVIEW_CONVERSATIONS = [
  {
    id: "preview-1",
    participantName: "Karim El Amrani",
    eventTitle: "Startup Networking Night",
    lastMessage: "Is there parking nearby?",
    time: "10:05",
    messages: [
      {
        id: 1,
        sender: "org",
        text: "Hello. This inbox is still a product preview.",
        time: "10:00",
      },
      {
        id: 2,
        sender: "user",
        text: "So messages are not live yet?",
        time: "10:05",
      },
    ],
  },
  {
    id: "preview-2",
    participantName: "Alice Dubois",
    eventTitle: "Startup Networking Night",
    lastMessage: "Thanks for the information.",
    time: "Yesterday",
    messages: [
      {
        id: 1,
        sender: "user",
        text: "Do I need a printed ticket?",
        time: "Yesterday",
      },
      {
        id: 2,
        sender: "org",
        text: "No. Each attendee can use the QR ticket page.",
        time: "Yesterday",
      },
    ],
  },
  {
    id: "preview-3",
    participantName: "Thomas Martin",
    eventTitle: "Web Development Workshop",
    lastMessage: "I may arrive a little late.",
    time: "Tue",
    messages: [
      {
        id: 1,
        sender: "user",
        text: "I may arrive a little late.",
        time: "Tue",
      },
    ],
  },
];

export default function OrganizerInboxPage() {
  const [conversations, setConversations] = useState(PREVIEW_CONVERSATIONS);
  const [activeConversationId, setActiveConversationId] = useState(PREVIEW_CONVERSATIONS[0].id);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId),
    [activeConversationId, conversations],
  );

  const filteredConversations = useMemo(
    () =>
      conversations.filter(
        (conversation) =>
          conversation.participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          conversation.eventTitle.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [conversations, searchQuery],
  );

  function handleSendMessage(event) {
    event.preventDefault();

    if (!newMessage.trim() || !activeConversation) {
      return;
    }

    const nextMessage = {
      id: Date.now(),
      sender: "org",
      text: newMessage.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setConversations((currentConversations) =>
      currentConversations.map((conversation) =>
        conversation.id === activeConversationId
          ? {
              ...conversation,
              lastMessage: nextMessage.text,
              time: nextMessage.time,
              messages: [...conversation.messages, nextMessage],
            }
          : conversation,
      ),
    );
    setNewMessage("");
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:py-12">
      <div className="mb-8 space-y-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-white">
            Organizer inbox preview
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            This page previews the future organizer messaging flow. Real conversation delivery,
            storage, and unread tracking are not implemented yet.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
          <Chip
            size="sm"
            variant="flat"
            className="border border-amber-200 bg-white/80 text-amber-700 dark:border-amber-500/20 dark:bg-white/10 dark:text-amber-300"
          >
            Demo only
          </Chip>
          <span>No messages are sent to attendees from this page yet.</span>
        </div>
      </div>

      <div className="grid h-[600px] grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="flex flex-col border border-zinc-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04] md:col-span-1">
          <div className="border-b border-zinc-200/70 p-4 dark:border-white/10">
            <Input
              placeholder="Search attendee or event..."
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
              filteredConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setActiveConversationId(conversation.id)}
                  className={`block w-full border-b border-zinc-100 p-4 text-left transition-colors last:border-0 hover:bg-zinc-50 dark:border-white/5 dark:hover:bg-white/[0.02] ${
                    activeConversationId === conversation.id
                      ? "bg-sky-50/50 dark:bg-sky-500/10"
                      : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={conversation.participantName}
                        size="sm"
                        className="bg-zinc-900 text-white dark:bg-zinc-200 dark:text-zinc-900"
                      />
                      <div>
                        <p className="text-sm font-semibold text-zinc-950 dark:text-white">
                          {conversation.participantName}
                        </p>
                        <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-sky-600 dark:text-sky-400">
                          <CalendarDays size={10} /> {conversation.eventTitle}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] text-zinc-500">{conversation.time}</span>
                  </div>
                  <p className="mt-2 truncate text-sm text-zinc-600 dark:text-zinc-400">
                    {conversation.lastMessage}
                  </p>
                </button>
              ))
            ) : (
              <div className="p-6 text-center text-sm text-zinc-500">
                No preview conversations match this search.
              </div>
            )}
          </div>
        </Card>

        <Card className="flex flex-col border border-zinc-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04] md:col-span-2">
          {activeConversation ? (
            <>
              <div className="flex items-center justify-between border-b border-zinc-200/70 p-4 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <Avatar
                    name={activeConversation.participantName}
                    size="md"
                    className="bg-zinc-900 text-white dark:bg-zinc-200 dark:text-zinc-900"
                  />
                  <div>
                    <h3 className="text-base font-semibold text-zinc-950 dark:text-white">
                      {activeConversation.participantName}
                    </h3>
                    <Chip
                      size="sm"
                      variant="flat"
                      className="mt-1 bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300"
                    >
                      {activeConversation.eventTitle}
                    </Chip>
                  </div>
                </div>
                <Chip
                  size="sm"
                  variant="flat"
                  className="border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
                >
                  Preview thread
                </Chip>
              </div>

              <CardBody className="flex-1 overflow-y-auto bg-zinc-50/50 p-6 dark:bg-black/20">
                <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                  This thread is local preview UI. It does not send or persist organizer messages.
                </div>

                <div className="flex flex-col gap-4">
                  {activeConversation.messages.map((message) => {
                    const isOrganizerMessage = message.sender === "org";

                    return (
                      <div
                        key={message.id}
                        className={`flex w-full ${isOrganizerMessage ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`flex max-w-[75%] flex-col gap-1 ${isOrganizerMessage ? "items-end" : "items-start"}`}
                        >
                          <div
                            className={`rounded-2xl px-4 py-2 text-sm ${
                              isOrganizerMessage
                                ? "rounded-tr-sm bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                                : "rounded-tl-sm border border-zinc-200/80 bg-white text-zinc-800 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-200"
                            }`}
                          >
                            {message.text}
                          </div>
                          <span className="px-1 text-[10px] text-zinc-400">{message.time}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardBody>

              <div className="border-t border-zinc-200/70 p-4 dark:border-white/10">
                <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                  <Input
                    value={newMessage}
                    onValueChange={setNewMessage}
                    placeholder={`Type a preview reply to ${activeConversation.participantName}...`}
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
              <p>Select a preview conversation</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
