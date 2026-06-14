import { useEffect, useRef, useState } from "react";
import { Button, Card, CardBody, CardHeader, Chip, Input } from "@heroui/react";
import { Bot, MessageCircle, Send, X } from "lucide-react";

function getCurrentTimeLabel() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getBotResponse(text) {
  const lowerText = text.toLowerCase();

  if (lowerText.includes("ticket") || lowerText.includes("buy")) {
    return "You can buy tickets from the ticket section on each event details page.";
  }

  if (lowerText.includes("refund") || lowerText.includes("cancel")) {
    return "Go to My Bookings to cancel an eligible booking. Refund behavior depends on the booking status.";
  }

  if (lowerText.includes("password") || lowerText.includes("login")) {
    return "If you cannot sign in, use the Forgot Password flow from the login page.";
  }

  if (lowerText.includes("contact") || lowerText.includes("organizer")) {
    return "Organizer messaging is still in preview. For now, use the event page details and booking flow.";
  }

  if (lowerText.includes("hello") || lowerText.includes("hi")) {
    return "Hello. Ask about tickets, bookings, login, or organizers.";
  }

  return "This demo assistant can answer basic product questions about tickets, bookings, login, and organizers.";
}

export default function SupportChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "bot",
      text: "Hello. I am the Quickseat assistant. How can I help you?",
      time: getCurrentTimeLabel(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [isOpen, messages]);

  function handleSendMessage(event) {
    event.preventDefault();

    if (!inputValue.trim()) {
      return;
    }

    const currentInput = inputValue.trim();

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: Date.now(),
        sender: "user",
        text: currentInput,
        time: getCurrentTimeLabel(),
      },
    ]);
    setInputValue("");

    window.setTimeout(() => {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: Date.now() + 1,
          sender: "bot",
          text: getBotResponse(currentInput),
          time: getCurrentTimeLabel(),
        },
      ]);
    }, 400);
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen ? (
        <Card className="mb-4 flex h-[450px] w-[350px] max-w-[calc(100vw-3rem)] flex-col border border-zinc-200/80 bg-white shadow-2xl dark:border-white/10 dark:bg-zinc-900">
          <CardHeader className="flex items-center justify-between border-b border-zinc-200/70 bg-zinc-950 p-4 text-white dark:border-white/10 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <Bot size={18} />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold">Quickseat Assistant</span>
                <span className="text-[10px] text-zinc-300">Demo only</span>
              </div>
            </div>
            <Button
              isIconOnly
              size="sm"
              variant="light"
              onPress={() => setIsOpen(false)}
              className="text-zinc-300 hover:text-white"
            >
              <X size={18} />
            </Button>
          </CardHeader>

          <CardBody className="flex-1 overflow-y-auto bg-zinc-50/50 p-4 dark:bg-black/20">
            <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
              <span>This assistant is a product preview. Responses are local and not AI-backed.</span>
              <Chip
                size="sm"
                variant="flat"
                className="border border-amber-200 bg-white/80 text-amber-700 dark:border-amber-500/20 dark:bg-white/10 dark:text-amber-300"
              >
                Preview
              </Chip>
            </div>
            <div className="flex flex-col gap-4">
              {messages.map((message) => {
                const isUser = message.sender === "user";

                return (
                  <div
                    key={message.id}
                    className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`flex max-w-[85%] flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`rounded-2xl px-4 py-2 text-sm shadow-sm ${
                          isUser
                            ? "rounded-tr-sm bg-sky-500 text-white"
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
              <div ref={messagesEndRef} />
            </div>
          </CardBody>

          <div className="border-t border-zinc-200/70 p-3 dark:border-white/10">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <Input
                value={inputValue}
                onValueChange={setInputValue}
                placeholder="Ask a product question..."
                variant="flat"
                radius="full"
                className="flex-1"
                classNames={{
                  inputWrapper: "bg-zinc-100 dark:bg-zinc-800",
                }}
              />
              <Button
                isIconOnly
                type="submit"
                radius="full"
                isDisabled={!inputValue.trim()}
                className="bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
              >
                <Send size={16} />
              </Button>
            </form>
          </div>
        </Card>
      ) : null}

      <Button
        isIconOnly
        radius="full"
        onPress={() => setIsOpen((currentState) => !currentState)}
        className="h-14 w-14 bg-zinc-950 text-white shadow-xl transition-transform hover:scale-105 dark:bg-white dark:text-zinc-950"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </Button>
    </div>
  );
}
