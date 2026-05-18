import { useState, useEffect } from "react";
import { Card, CardBody, Input, Button, Avatar, Chip } from "@heroui/react";
import { Search, Send, MessageSquare, CalendarDays } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function OrganizerInboxPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // 1. CHARGER ET REGROUPER LES MESSAGES EN VRAIES CONVERSATIONS 1-À-1
  useEffect(() => {
    if (!user?.id) return;

    async function loadInbox() {
      try {
        setIsLoading(true);
        const response = await fetch(`http://localhost:5000/api/messages/organizer/${user.id}`);
        if (!response.ok) throw new Error("Erreur serveur");
        const allMessages = await response.json();

        const convMap = {};

        allMessages.forEach((msg) => {
          // Déterminer qui est le participant (l'autre personne qui n'est pas l'organisateur)
          const isFromOrganizer = msg.user_id === user.id;
          const participantId = isFromOrganizer ? msg.recipient_id : msg.user_id;

          if (!participantId) return;

          const convKey = `${msg.event_id}_${participantId}`;

          if (!convMap[convKey]) {
            convMap[convKey] = {
              id: convKey,
              eventId: msg.event_id,
              eventTitle: msg.event?.title || "Événement",
              participantId: participantId,
              participantName: isFromOrganizer ? "Chargement..." : `${msg.user?.first_name} ${msg.user?.last_name}`,
              lastMessage: msg.text,
              time: new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              messages: [],
            };
          }

          // Si le message vient du participant, on extrait son vrai nom
          if (!isFromOrganizer && msg.user) {
            convMap[convKey].participantName = `${msg.user.first_name} ${msg.user.last_name}`;
          }

          convMap[convKey].lastMessage = msg.text;
          convMap[convKey].time = new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          
          convMap[convKey].messages.push({
            id: msg.id,
            sender: isFromOrganizer ? "org" : "user",
            text: msg.text,
            time: new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          });
        });

        const convList = Object.values(convMap);
        setConversations(convList);

        if (convList.length > 0 && !activeConvId) {
          setActiveConvId(convList[0].id);
        }
      } catch (error) {
        console.error("Erreur chargement Inbox:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadInbox();
  }, [user, activeConvId]);

  const activeConv = conversations.find((c) => c.id === activeConvId);

  const filteredConversations = conversations.filter(
    (c) =>
      c.participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.eventTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 2. RÉPONDRE DIRECTEMENT AU PARTICIPANT DANS SA CONVERSATION DÉDIÉE
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConv || !user?.id) return;

    const textToSend = newMessage;
    setNewMessage("");

    try {
      const response = await fetch(`http://localhost:5000/api/messages/event/${activeConv.eventId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToSend,
          userId: user.id, // Moi (Organisateur)
          recipientId: activeConv.participantId, // Le participant spécifique !
        }),
      });

      if (!response.ok) throw new Error("Erreur envoi");
      const savedMsg = await response.json();

      // Mettre à jour l'interface locale directement
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConv.id
            ? {
                ...c,
                lastMessage: textToSend,
                time: new Date(savedMsg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                messages: [...c.messages, { id: savedMsg.id, sender: "org", text: textToSend, time: "Maintenant" }],
              }
            : c
        )
      );
    } catch (error) {
      console.error("Erreur réponse inbox:", error);
      setNewMessage(textToSend);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-white">
          Inbox
        </h1>
        
      </div>

      <div className="grid h-[600px] grid-cols-1 gap-6 md:grid-cols-3">
        {/* COLONNE GAUCHE : LISTE DES PARTICIPANTS */}
        <Card className="flex flex-col border border-zinc-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04] md:col-span-1">
          <div className="border-b border-zinc-200/70 p-4 dark:border-white/10">
            <Input
              placeholder="Search participants or events..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              startContent={<Search size={16} className="text-zinc-400" />}
              variant="flat"
              radius="lg"
              classNames={{ inputWrapper: "bg-zinc-100 dark:bg-zinc-800/50" }}
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-6 text-center text-sm text-zinc-400">Loading messages...</div>
            ) : filteredConversations.length > 0 ? (
              filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={`cursor-pointer border-b border-zinc-100 p-4 transition-colors last:border-0 hover:bg-zinc-50 dark:border-white/5 dark:hover:bg-white/[0.02] ${
                    activeConvId === conv.id ? "bg-sky-50/50 dark:bg-sky-500/10" : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar name={conv.participantName} size="sm" className="bg-zinc-900 text-white dark:bg-zinc-200 dark:text-zinc-900" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-950 dark:text-white">
                          {conv.participantName}
                        </p>
                        <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-sky-600 dark:text-sky-400 truncate">
                          <CalendarDays size={10} /> {conv.eventTitle}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] text-zinc-500 shrink-0">{conv.time}</span>
                  </div>
                  <p className="mt-2 truncate text-sm text-zinc-600 dark:text-zinc-400">
                    {conv.lastMessage}
                  </p>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-sm text-zinc-500">No conversations yet.</div>
            )}
          </div>
        </Card>

        {/* COLONNE DROITE : LE CHAT 1-À-1 SÉLECTIONNÉ */}
        <Card className="flex flex-col border border-zinc-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04] md:col-span-2">
          {activeConv ? (
            <>
              <div className="flex items-center justify-between border-b border-zinc-200/70 p-4 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <Avatar name={activeConv.participantName} size="md" className="bg-zinc-900 text-white dark:bg-zinc-200 dark:text-zinc-900" />
                  <div>
                    <h3 className="text-base font-semibold text-zinc-950 dark:text-white">
                      {activeConv.participantName}
                    </h3>
                    <Chip size="sm" variant="flat" className="mt-1 bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">
                      {activeConv.eventTitle}
                    </Chip>
                  </div>
                </div>
              </div>

              <CardBody className="flex-1 overflow-y-auto bg-zinc-50/50 p-6 dark:bg-black/20">
                <div className="flex flex-col gap-4">
                  {activeConv.messages.map((msg, index) => {
                    const isMe = msg.sender === "org";
                    return (
                      <div key={index} className={`flex w-full ${isMe ? "justify-end" : "justify-start"}`}>
                        <div className={`flex max-w-[75%] flex-col gap-1 ${isMe ? "items-end" : "items-start"}`}>
                          <div
                            className={`rounded-2xl px-4 py-2 text-sm shadow-sm ${
                              isMe
                                ? "bg-zinc-900 text-white rounded-tr-sm dark:bg-white dark:text-zinc-950"
                                : "bg-white border border-zinc-200/80 text-zinc-800 rounded-tl-sm dark:bg-zinc-800 dark:border-white/10 dark:text-zinc-200"
                            }`}
                          >
                            {msg.text}
                          </div>
                          <span className="text-[10px] text-zinc-400 px-1">{msg.time}</span>
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
                    placeholder={`Reply to ${activeConv.participantName}...`}
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
              <p>Sélectionnez une conversation pour voir le fil des messages</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}