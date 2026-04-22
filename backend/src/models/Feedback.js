import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Récupérer un événement
export const getEventById = async (eventId) => {
  return await prisma.event.findUnique({ where: { id: eventId } });
};

// Vérifier si un utilisateur a bien un billet confirmé pour un événement
export const getConfirmedBooking = async (userId, eventId) => {
  return await prisma.booking.findFirst({
    where: { user_id: userId, event_id: eventId, status: 'confirmed' }
  });
};

// Créer ou mettre à jour un avis
export const upsertFeedback = async (userId, eventId, rating, comment) => {
  return await prisma.feedback.upsert({
    where: { user_id_event_id: { user_id: userId, event_id: eventId } },
    update: { rating: parseInt(rating), comment: comment || null },
    create: { user_id: userId, event_id: eventId, rating: parseInt(rating), comment: comment || null }
  });
};

// Récupérer tous les avis d'un événement
export const getFeedbacksByEvent = async (eventId) => {
  return await prisma.feedback.findMany({
    where: { event_id: eventId },
    include: { user: { select: { first_name: true, last_name: true } } },
    orderBy: { created_at: 'desc' }
  });
};