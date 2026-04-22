import * as feedbackModel from '../models/feedback.js'; // 👈 On importe le Model

// 1. Participant : Laisser un avis
export const submitFeedback = async (req, res) => {
  try {
    const event_id = req.params.id;
    const { rating, comment } = req.body;
    const user_id = req.user.id; 

    // On utilise le Model
    const event = await feedbackModel.getEventById(event_id);

    if (!event) return res.status(404).json({ message: "Événement non trouvé" });
    if (new Date(event.event_date) > new Date()) {
      return res.status(400).json({ message: "Événement non terminé." });
    }

    const booking = await feedbackModel.getConfirmedBooking(user_id, event_id);

    if (!booking) {
      return res.status(403).json({ message: "Participation requise pour voter." });
    }

    // On utilise le Model
    const feedback = await feedbackModel.upsertFeedback(user_id, event_id, rating, comment);

    res.status(201).json({ message: "Avis enregistré", feedback });
  } catch (error) {
    console.error("Erreur feedback:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// 2. Organisateur : Récupérer les stats
export const getEventFeedbackStats = async (req, res) => {
  try {
    const event_id = req.params.id;

    // On utilise le Model
    const feedbacks = await feedbackModel.getFeedbacksByEvent(event_id);

    if (feedbacks.length === 0) {
      return res.status(200).json({ averageRating: 0, totalReviews: 0, feedbacks: [] });
    }

    // La logique mathématique reste dans le contrôleur (ou pourrait aller dans un service)
    const totalRating = feedbacks.reduce((acc, curr) => acc + curr.rating, 0);
    const averageRating = (totalRating / feedbacks.length).toFixed(1);

    res.status(200).json({
      averageRating: parseFloat(averageRating),
      totalReviews: feedbacks.length,
      feedbacks
    });
  } catch (error) {
    console.error("Erreur stats feedback:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

export default { submitFeedback, getEventFeedbackStats };