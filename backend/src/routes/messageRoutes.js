import express from 'express';
import { getEventMessages, getOrganizerMessages, sendMessage } from '../controllers/messageController.js';

const router = express.Router();

// Route pour récupérer les messages d'un événement (pour le participant)
router.get('/event/:eventId', getEventMessages);

// NOUVELLE ROUTE : Pour récupérer tous les messages d'un organisateur
router.get('/organizer/:organizerId', getOrganizerMessages);

// Route pour envoyer un message
router.post('/event/:eventId', sendMessage);

export default router;