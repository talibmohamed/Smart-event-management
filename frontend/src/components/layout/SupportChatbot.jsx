import { useState, useRef, useEffect } from "react";
import { Card, CardBody, CardHeader, Input, Button } from "@heroui/react";
import { MessageCircle, X, Send, Bot } from "lucide-react";

export default function SupportChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "bot",
      text: "Hello! 👋 I'm the Quickseat assistant. How can I help you today?",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  // 🧠 LE CERVEAU DU BOT (Analyse des mots-clés)
  const getBotResponse = (text) => {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes("ticket") || lowerText.includes("buy")) {
      return "You can buy tickets directly on the event details page. Just click on the 'Book Now' button!";
    } 
    else if (lowerText.includes("refund") || lowerText.includes("cancel")) {
      return "To cancel a ticket or request a refund, please go to your Profile > Dashboard and select the booking you want to cancel.";
    } 
    else if (lowerText.includes("password") || lowerText.includes("login")) {
      return "Having trouble logging in? You can reset your password on the login page by clicking on 'Forgot Password'.";
    }
    else if (lowerText.includes("contact") || lowerText.includes("organizer")) {
      return "You can contact the event organizer directly from the event page, or send an email to support@quickseat.com.";
    }
    else if (lowerText.includes("hello") || lowerText.includes("hi")) {
      return "Hello there! 😊 How can I assist you with your events today?";
    }
    else {
      return "I'm not sure I understand completely. I am a virtual assistant, so try using keywords like 'ticket', 'refund', or 'password'! 🤖";
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // 1. Ajouter le message de l'utilisateur
    const userMessage = {
      id: Date.now(),
      sender: "user",
      text: inputValue,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages((prev) => [...prev, userMessage]);
    const currentInput = inputValue; // On sauvegarde le texte avant de vider l'input
    setInputValue("");

    // 2. Le bot "réfléchit" pendant 1 seconde puis répond intelligemment
    setTimeout(() => {
      const replyText = getBotResponse(currentInput);
      const botResponse = {
        id: Date.now() + 1,
        sender: "bot",
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, botResponse]);
    }, 1000);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <Card className="mb-4 flex h-[450px] w-[350px] flex-col border border-zinc-200/80 bg-white shadow-2xl dark:border-white/10 dark:bg-zinc-900 max-w-[calc(100vw-3rem)]">
          <CardHeader className="flex items-center justify-between border-b border-zinc-200/70 bg-zinc-950 p-4 text-white dark:border-white/10 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <Bot size={18} />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold">Quickseat Assistant</span>
                <span className="text-[10px] text-zinc-300">Online</span>
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
            <div className="flex flex-col gap-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex w-full ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`flex max-w-[85%] flex-col gap-1 ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                    <div
                      className={`rounded-2xl px-4 py-2 text-sm shadow-sm ${
                        msg.sender === "user"
                          ? "bg-sky-500 text-white rounded-tr-sm"
                          : "bg-white border border-zinc-200/80 text-zinc-800 rounded-tl-sm dark:bg-zinc-800 dark:border-white/10 dark:text-zinc-200"
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[10px] text-zinc-400 px-1">{msg.time}</span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </CardBody>

          <div className="border-t border-zinc-200/70 p-3 dark:border-white/10">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <Input
                value={inputValue}
                onValueChange={setInputValue}
                placeholder="Ask your question..."
                variant="flat"
                radius="full"
                className="flex-1"
                classNames={{ inputWrapper: "bg-zinc-100 dark:bg-zinc-800" }}
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
      )}

      <Button
        isIconOnly
        radius="full"
        onPress={() => setIsOpen(!isOpen)}
        className="h-14 w-14 bg-zinc-950 text-white shadow-xl transition-transform hover:scale-105 dark:bg-white dark:text-zinc-950"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </Button>
    </div>
  );
}