import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// 1. Récupérer les messages d'un événement (isolés pour un participant)
export const getEventMessages = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { userId } = req.query; 

    let whereClause = { event_id: eventId };

    if (userId) {
      whereClause = {
        event_id: eventId,
        OR: [
          { user_id: userId },
          { recipient_id: userId }
        ]
      };
    }

    const messages = await prisma.message.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, first_name: true, last_name: true }
        }
      },
      orderBy: { created_at: 'asc' }
    });
    
    res.status(200).json(messages);
  } catch (error) {
    console.error("Erreur getEventMessages:", error);
    res.status(500).json({ error: "Erreur lors de la récupération des messages" });
  }
};

// 2. Récupérer TOUS les messages pour la boîte de réception de l'organisateur
export const getOrganizerMessages = async (req, res) => {
  try {
    const { organizerId } = req.params;
    
    const messages = await prisma.message.findMany({
      where: {
        event: { organizer_id: organizerId } 
      },
      include: {
        user: { select: { id: true, first_name: true, last_name: true } },
        event: { select: { id: true, title: true } }
      },
      orderBy: { created_at: 'asc' }
    });
    
    res.status(200).json(messages);
  } catch (error) {
    console.error("Erreur getOrganizerMessages:", error);
    res.status(500).json({ error: "Erreur boîte de réception" });
  }
};

// 3. Envoyer un nouveau message ET créer la notification 🔔
export const sendMessage = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { text, userId, recipientId } = req.body; 

    if (!text || !userId) {
      return res.status(400).json({ error: "Texte et utilisateur requis" });
    }

    // A. On va chercher l'événement pour savoir qui est l'organisateur
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { organizer_id: true, title: true }
    });

    if (!event) {
      return res.status(404).json({ error: "Événement non trouvé" });
    }

    // B. On crée le message normalement
    const newMessage = await prisma.message.create({
      data: {
        text,
        event_id: eventId,
        user_id: userId,
        recipient_id: recipientId || null 
      },
      include: {
        user: {
          select: { id: true, first_name: true, last_name: true }
        }
      }
    });

    // C. LOGIQUE DE LA CLOCHE : Qui doit recevoir l'alerte ?
    const isSenderOrganizer = userId === event.organizer_id;
    // Si c'est l'organisateur qui envoie, le destinataire est le participant. Sinon, c'est l'inverse.
    const targetUserId = isSenderOrganizer ? recipientId : event.organizer_id;

    if (targetUserId) {
      // On insère l'alerte dans la table Notification
      await prisma.notification.create({
        data: {
          user_id: targetUserId,
          type: "NEW_MESSAGE",
          title: isSenderOrganizer ? "New message from the organizer" : "New message from a participant",
          message: isSenderOrganizer 
            ? `The organizer has answered your question about the event. "${event.title}".`
            : `${newMessage.user.first_name} sent a message to "${event.title}".`,
          data: {
            eventId: eventId,
            conversationId: isSenderOrganizer ? userId : targetUserId
          }
        }
      });
    }
    
    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Erreur sendMessage:", error);
    res.status(500).json({ error: "Erreur lors de l'envoi du message" });
  }
};