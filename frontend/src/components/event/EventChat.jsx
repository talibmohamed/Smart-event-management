import { useState } from "react";
import { Button, Card, CardBody, CardHeader, Chip, Input } from "@heroui/react";
import { MessageSquare, Send } from "lucide-react";

const PREVIEW_MESSAGES = [
  {
    id: 1,
    text: "Hello. This is a preview of organizer messaging for this event.",
    time: "10:00",
    isMe: false,
  },
  {
    id: 2,
    text: "So this thread is not live yet?",
    time: "10:05",
    isMe: true,
  },
  {
    id: 3,
    text: "Correct. Real event messaging will arrive with backend conversation support.",
    time: "10:06",
    isMe: false,
  },
];

export default function EventChat({ eventTitle = "This event" }) {
  const [messages, setMessages] = useState(PREVIEW_MESSAGES);
  const [newMessage, setNewMessage] = useState("");

  function handleSendMessage(event) {
    event.preventDefault();

    if (!newMessage.trim()) {
      return;
    }

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: Date.now(),
        text: newMessage.trim(),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isMe: true,
      },
    ]);
    setNewMessage("");
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
              Organizer messaging preview
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{eventTitle}</p>
          </div>
        </div>
        <Chip
          size="sm"
          variant="flat"
          className="border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
        >
          Demo only
        </Chip>
      </CardHeader>

      <CardBody className="gap-4 bg-zinc-50/50 p-4 dark:bg-black/20">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
          This thread is local preview UI only. Messages are not stored, delivered, or visible to organizers yet.
        </div>

        <div className="flex h-72 flex-col gap-4 overflow-y-auto">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex w-full ${message.isMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`flex max-w-[75%] flex-col gap-1 ${message.isMe ? "items-end" : "items-start"}`}
              >
                <div
                  className={`rounded-2xl px-4 py-2 text-sm ${
                    message.isMe
                      ? "rounded-tr-sm bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                      : "rounded-tl-sm border border-zinc-200/80 bg-white text-zinc-800 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-200"
                  }`}
                >
                  {message.text}
                </div>
                <span className="px-1 text-[10px] text-zinc-400">{message.time}</span>
              </div>
            </div>
          ))}
        </div>

        <form
          onSubmit={handleSendMessage}
          className="flex items-center gap-2 border-t border-zinc-200/70 pt-3 dark:border-white/10"
        >
          <Input
            value={newMessage}
            onValueChange={setNewMessage}
            placeholder="Type a preview message..."
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
            className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
          >
            <Send size={16} />
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
