import { useState } from "react";
import { Card, CardBody, CardHeader, Input, Button, Avatar } from "@heroui/react";
import { Send, MessageSquare } from "lucide-react";

export default function EventChat({ eventTitle = "Cet événement" }) {
  // 1. FAUSSES DONNÉES (en attendant le vrai backend)
  const [messages, setMessages] = useState([
    {
      id: 1,
      senderId: "org-1",
      senderName: "Organisateur",
      text: "Bonjour ! Avez-vous des questions concernant l'événement ?",
      time: "10:00",
      isMe: false, // true si c'est moi qui envoie, false si c'est l'autre
    },
    {
      id: 2,
      senderId: "user-1",
      senderName: "Moi",
      text: "Oui, est-ce qu'il y a un parking à proximité ?",
      time: "10:05",
      isMe: true,
    }
  ]);

  const [newMessage, setNewMessage] = useState("");

  // 2. FONCTION POUR ENVOYER UN MESSAGE (Front-end uniquement pour le moment)
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const newMsgObj = {
      id: Date.now(),
      senderId: "user-1",
      senderName: "Moi",
      text: newMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
    };

    setMessages([...messages, newMsgObj]);
    setNewMessage(""); // On vide le champ de texte
  };

  return (
    <Card className="w-full border border-zinc-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
      {/* HEADER DU CHAT */}
      <CardHeader className="flex items-center gap-3 border-b border-zinc-200/70 p-4 dark:border-white/10">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white">
          <MessageSquare size={18} />
        </div>
        <div>
          <h3 className="text-md font-semibold text-zinc-900 dark:text-white">
            Contacter l'organisateur
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {eventTitle}
          </p>
        </div>
      </CardHeader>

      {/* ZONE DES MESSAGES */}
      <CardBody className="h-80 overflow-y-auto p-4 flex flex-col gap-4 bg-zinc-50/50 dark:bg-black/20">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex w-full ${msg.isMe ? "justify-end" : "justify-start"}`}
          >
            <div className={`flex max-w-[75%] flex-col gap-1 ${msg.isMe ? "items-end" : "items-start"}`}>
              <div
                className={`rounded-2xl px-4 py-2 text-sm ${
                  msg.isMe
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-tr-sm"
                    : "bg-white border border-zinc-200/80 text-zinc-800 dark:bg-zinc-800 dark:border-white/10 dark:text-zinc-200 rounded-tl-sm"
                }`}
              >
                {msg.text}
              </div>
              <span className="text-[10px] text-zinc-400 px-1">{msg.time}</span>
            </div>
          </div>
        ))}
      </CardBody>

      {/* ZONE DE SAISIE */}
      <div className="border-t border-zinc-200/70 p-3 dark:border-white/10">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Input
            value={newMessage}
            onValueChange={setNewMessage}
            placeholder="Écrivez votre message..."
            variant="flat"
            radius="full"
            className="flex-1"
            classNames={{
              input: "text-sm",
              inputWrapper: "bg-zinc-100 dark:bg-zinc-800"
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
      </div>
    </Card>
  );
}