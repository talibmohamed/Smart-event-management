import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// 1. Rejoindre la liste d'attente
export const joinWaitlist = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id; // Récupéré par ton authMiddleware

    // Vérifier si l'événement existe
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return res.status(404).json({ error: "Événement non trouvé" });
    }

    // Vérifier si l'utilisateur a déjà un billet confirmé pour cet événement
    const existingBooking = await prisma.booking.findFirst({
      where: {
        event_id: eventId,
        user_id: userId,
        status: "confirmed"
      }
    });

    if (existingBooking) {
      return res.status(400).json({ error: "Vous avez déjà une place réservée pour cet événement." });
    }

    // Ajouter l'utilisateur à la waitlist
    const waitlistEntry = await prisma.waitlist.create({
      data: {
        event_id: eventId,
        user_id: userId,
      },
    });

    res.status(201).json({
      success: true,
      message: "Vous avez rejoint la liste d'attente avec succès.",
      data: waitlistEntry,
    });
  } catch (error) {
    console.error("Erreur joinWaitlist:", error);
    // Gestion du cas où l'utilisateur est déjà dans la liste (contrainte @@unique du schema)
    if (error.code === 'P2002') {
      return res.status(400).json({ error: "Vous êtes déjà inscrit dans la liste d'attente de cet événement." });
    }
    res.status(500).json({ error: "Erreur lors de l'inscription sur la liste d'attente." });
  }
};

// 2. Quitter la liste d'attente
export const leaveWaitlist = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    await prisma.waitlist.delete({
      where: {
        event_id_user_id: {
          event_id: eventId,
          user_id: userId,
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "Vous avez quitté la liste d'attente.",
    });
  } catch (error) {
    console.error("Erreur leaveWaitlist:", error);
    res.status(500).json({ error: "Erreur lors de la désinscription de la liste d'attente." });
  }
};

// 3. Obtenir le statut de l'utilisateur (Savoir s'il est dedans + sa position)
export const getWaitlistStatus = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    // Récupérer toutes les personnes sur la waitlist pour cet événement, triées par date
    const waitlist = await prisma.waitlist.findMany({
      where: { event_id: eventId },
      orderBy: { created_at: 'asc' },
    });

    // Trouver l'index de l'utilisateur actuel
    const userIndex = waitlist.findIndex((entry) => entry.user_id === userId);
    const isWaiting = userIndex !== -1;

    res.status(200).json({
      isWaiting,
      position: isWaiting ? userIndex + 1 : null, // +1 car un index commence à 0
      totalWaiting: waitlist.length,
    });
  } catch (error) {
    console.error("Erreur getWaitlistStatus:", error);
    res.status(500).json({ error: "Erreur lors de la récupération du statut." });
  }
};