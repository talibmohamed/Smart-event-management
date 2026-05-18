import { useState, useEffect } from "react";
import { Card, CardBody, CardHeader, Input, Button } from "@heroui/react";
import { Send, MessageSquare } from "lucide-react";

export default function EventChat({ eventId, eventTitle = "Cet événement", currentUserId }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // 1. CHARGER LES MESSAGES DEPUIS LE BACKEND
  useEffect(() => {
    if (!eventId) return;

    const fetchMessages = async () => {
      try {
        // RAPPEL: Assure-toi que 5000 est bien le port de ton backend !
        const response = await fetch(`http://localhost:5000/api/messages/event/${eventId}`);
        if (!response.ok) throw new Error("Erreur serveur");
        
        const data = await response.json();
        
        const formattedMessages = data.map((msg) => ({
          id: msg.id,
          text: msg.text,
          isMe: msg.user_id === currentUserId,
          senderName: msg.user ? `${msg.user.first_name} ${msg.user.last_name}` : "Utilisateur",
          time: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }));

        setMessages(formattedMessages);
      } catch (error) {
        console.error("Erreur lors du chargement des messages:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
  }, [eventId, currentUserId]);

  // 2. ENVOYER UN MESSAGE AU BACKEND
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUserId || !eventId) return;

    const textToSend = newMessage;
    setNewMessage(""); // Vide l'input pour être réactif

    try {
      const response = await fetch(`http://localhost:5000/api/messages/event/${eventId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text: textToSend, 
          userId: currentUserId 
        }),
      });

      if (!response.ok) throw new Error("Erreur lors de l'envoi");

      const savedMsg = await response.json();

      const newMsgObj = {
        id: savedMsg.id,
        text: savedMsg.text,
        isMe: true,
        senderName: "Moi",
        time: new Date(savedMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, newMsgObj]);
    } catch (error) {
      console.error("Erreur d'envoi:", error);
      setNewMessage(textToSend); // Remet le texte en cas d'erreur
    }
  };

  return (
    <Card className="w-full border border-zinc-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
      <CardHeader className="flex items-center gap-3 border-b border-zinc-200/70 p-4 dark:border-white/10">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white">
          <MessageSquare size={18} />
        </div>
        <div>
          <h3 className="text-md font-semibold text-zinc-900 dark:text-white">
            Discussion - {eventTitle}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {eventTitle}
          </p>
        </div>
      </CardHeader>

      <CardBody className="h-80 overflow-y-auto p-4 flex flex-col gap-4 bg-zinc-50/50 dark:bg-black/20">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-zinc-400">
            Chargement des messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-zinc-400">
            Aucun message. Soyez le premier à écrire !
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex w-full ${msg.isMe ? "justify-end" : "justify-start"}`}>
              <div className={`flex max-w-[75%] flex-col gap-1 ${msg.isMe ? "items-end" : "items-start"}`}>
                <div
                  className={`rounded-2xl px-4 py-2 text-sm shadow-sm ${
                    msg.isMe
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-tr-sm"
                      : "bg-white border border-zinc-200/80 text-zinc-800 dark:bg-zinc-800 dark:border-white/10 dark:text-zinc-200 rounded-tl-sm"
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[10px] text-zinc-400 px-1">{msg.time} • {msg.senderName}</span>
              </div>
            </div>
          ))
        )}
      </CardBody>

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