import { useState } from "react";
import { Card, CardBody, Input, Button, Avatar, Chip } from "@heroui/react";
import { Search, Send, MessageSquare, CalendarDays } from "lucide-react";

// 1. FAUSSES DONNÉES (MOCK) POUR VISUALISER
const MOCK_CONVERSATIONS = [
  {
    id: "conv-1",
    participantName: "Karim El Amrani",
    eventTitle: "Startup Networking Night",
    lastMessage: "Oui, est-ce qu'il y a un parking à proximité ?",
    time: "10:05",
    unreadCount: 1,
    messages: [
      { id: 1, sender: "org", text: "Bonjour ! Avez-vous des questions concernant l'événement ?", time: "10:00" },
      { id: 2, sender: "user", text: "Oui, est-ce qu'il y a un parking à proximité ?", time: "10:05" },
    ],
  },
  {
    id: "conv-2",
    participantName: "Alice Dubois",
    eventTitle: "Startup Networking Night",
    lastMessage: "Merci pour les infos !",
    time: "Hier",
    unreadCount: 0,
    messages: [
      { id: 1, sender: "user", text: "Est-ce qu'il faut ramener son billet imprimé ?", time: "Hier" },
      { id: 2, sender: "org", text: "Non, le QR code sur le téléphone suffit !", time: "Hier" },
      { id: 3, sender: "user", text: "Merci pour les infos !", time: "Hier" },
    ],
  },
  {
    id: "conv-3",
    participantName: "Thomas Martin",
    eventTitle: "Atelier Web Development",
    lastMessage: "Je serai un peu en retard.",
    time: "Mar",
    unreadCount: 0,
    messages: [
      { id: 1, sender: "user", text: "Je serai un peu en retard.", time: "Mar" },
    ],
  },
];

export default function OrganizerInboxPage() {
  const [conversations, setConversations] = useState(MOCK_CONVERSATIONS);
  const [activeConvId, setActiveConvId] = useState(MOCK_CONVERSATIONS[0].id);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Trouver la conversation actuellement sélectionnée
  const activeConv = conversations.find((c) => c.id === activeConvId);

  // Filtrer les conversations selon la recherche
  const filteredConversations = conversations.filter(
    (c) =>
      c.participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.eventTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Simuler l'envoi d'un message par l'organisateur
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConv) return;

    const newMsgObj = {
      id: Date.now(),
      sender: "org", // C'est l'organisateur qui parle ici
      text: newMessage,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const updatedConversations = conversations.map((conv) => {
      if (conv.id === activeConvId) {
        return {
          ...conv,
          lastMessage: newMessage,
          time: newMsgObj.time,
          messages: [...conv.messages, newMsgObj],
        };
      }
      return conv;
    });

    setConversations(updatedConversations);
    setNewMessage("");
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-white">
          Boîte de réception
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Gérez les questions de vos participants pour tous vos événements.
        </p>
      </div>

      {/* LAYOUT EN GRILLE : Liste à gauche (1/3), Chat à droite (2/3) */}
      <div className="grid h-[600px] grid-cols-1 gap-6 md:grid-cols-3">
        
        {/* ============================================== */}
        {/* COLONNE GAUCHE : LISTE DES CONVERSATIONS       */}
        {/* ============================================== */}
        <Card className="flex flex-col border border-zinc-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04] md:col-span-1">
          <div className="border-b border-zinc-200/70 p-4 dark:border-white/10">
            <Input
              placeholder="Chercher un participant ou événement..."
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
              filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => {
                    setActiveConvId(conv.id);
                    // On simule qu'on a lu le message en mettant unreadCount à 0
                    setConversations((prev) =>
                      prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c))
                    );
                  }}
                  className={`cursor-pointer border-b border-zinc-100 p-4 transition-colors last:border-0 hover:bg-zinc-50 dark:border-white/5 dark:hover:bg-white/[0.02] ${
                    activeConvId === conv.id ? "bg-sky-50/50 dark:bg-sky-500/10" : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar name={conv.participantName} size="sm" className="bg-zinc-900 text-white dark:bg-zinc-200 dark:text-zinc-900" />
                      <div>
                        <p className="text-sm font-semibold text-zinc-950 dark:text-white">
                          {conv.participantName}
                        </p>
                        <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-sky-600 dark:text-sky-400">
                          <CalendarDays size={10} /> {conv.eventTitle}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[11px] text-zinc-500">{conv.time}</span>
                      {conv.unreadCount > 0 && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 truncate text-sm text-zinc-600 dark:text-zinc-400">
                    {conv.lastMessage}
                  </p>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-sm text-zinc-500">Aucune conversation trouvée.</div>
            )}
          </div>
        </Card>

        {/* ============================================== */}
        {/* COLONNE DROITE : LE CHAT ACTIF                 */}
        {/* ============================================== */}
        <Card className="flex flex-col border border-zinc-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04] md:col-span-2">
          {activeConv ? (
            <>
              {/* HEADER DU CHAT */}
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

              {/* HISTORIQUE DES MESSAGES */}
              <CardBody className="flex-1 overflow-y-auto bg-zinc-50/50 p-6 dark:bg-black/20">
                <div className="flex flex-col gap-4">
                  {activeConv.messages.map((msg) => {
                    const isMe = msg.sender === "org"; // Ici "Moi" c'est l'organisateur
                    return (
                      <div key={msg.id} className={`flex w-full ${isMe ? "justify-end" : "justify-start"}`}>
                        <div className={`flex max-w-[75%] flex-col gap-1 ${isMe ? "items-end" : "items-start"}`}>
                          <div
                            className={`rounded-2xl px-4 py-2 text-sm ${
                              isMe
                                ? "bg-zinc-900 text-white rounded-tr-sm dark:bg-white dark:text-zinc-900"
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

              {/* INPUT POUR RÉPONDRE */}
              <div className="border-t border-zinc-200/70 p-4 dark:border-white/10">
                <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                  <Input
                    value={newMessage}
                    onValueChange={setNewMessage}
                    placeholder={`Répondre à ${activeConv.participantName}...`}
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
              <p>Sélectionnez une conversation</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}