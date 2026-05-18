import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// 1. Récupérer les messages d'un événement (isolés pour un participant)
export const getEventMessages = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { userId } = req.query; // On récupère l'ID de l'utilisateur qui fait la demande

    let whereClause = { event_id: eventId };

    // Si on a l'ID du participant, on filtre pour ne lui montrer que SES messages 
    // (ceux qu'il a envoyés ou qu'il a reçus)
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

// 2. NOUVEAU : Récupérer TOUS les messages pour la boîte de réception de l'organisateur
export const getOrganizerMessages = async (req, res) => {
  try {
    const { organizerId } = req.params;
    
    const messages = await prisma.message.findMany({
      where: {
        event: { organizer_id: organizerId } // On cherche via l'organisateur de l'événement
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

// 3. Envoyer un nouveau message
export const sendMessage = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { text, userId, recipientId } = req.body; // Ajout du recipientId

    if (!text || !userId) {
      return res.status(400).json({ error: "Texte et utilisateur requis" });
    }

    const newMessage = await prisma.message.create({
      data: {
        text,
        event_id: eventId,
        user_id: userId,
        recipient_id: recipientId || null // S'il y a un destinataire, on le sauvegarde
      },
      include: {
        user: {
          select: { id: true, first_name: true, last_name: true }
        }
      }
    });
    
    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Erreur sendMessage:", error);
    res.status(500).json({ error: "Erreur lors de l'envoi du message" });
  }
};