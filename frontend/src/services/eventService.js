import api from "./api";

function getEventMutationConfig(payload) {
  if (payload instanceof FormData) {
    return {
      transformRequest: [
        (data, headers) => {
          headers.delete?.("Content-Type");
          return data;
        },
      ],
    };
  }

  return undefined;
}

const eventService = {
  getEvents() {
    return api.get("/events");
  },

  getEventById(id) {
    return api.get(`/events/${id}`);
  },

  createEvent(payload) {
    return api.post("/events", payload, getEventMutationConfig(payload));
  },

  updateEvent(id, payload) {
    return api.put(`/events/${id}`, payload, getEventMutationConfig(payload));
  },

  deleteEvent(id) {
    return api.delete(`/events/${id}`);
  },

  getEventAttendees(id, status = "confirmed") {
    const config = status && status !== "confirmed" ? { params: { status } } : undefined;

    return api.get(`/events/${id}/attendees`, config);
  },

  // ==========================================
  // NOUVEAU : Fonction pour envoyer l'avis (Participant)
  // ==========================================
  submitFeedback(eventId, payload) {
    return api.post(`/events/${eventId}/feedback`, payload);
  },

  // ==========================================
  // NOUVEAU : Fonction pour récupérer les avis (Organisateur)
  // ==========================================
  getEventFeedbackStats(eventId) {
    return api.get(`/events/${eventId}/feedback`);
  },
};

export default eventService;