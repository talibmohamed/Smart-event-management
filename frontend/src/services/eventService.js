import api from "./api";

const eventService = {
  getEvents() {
    return api.get("/events");
  },

  getEventById(id) {
    return api.get(`/events/${id}`);
  },

  createEvent(payload) {
    return api.post("/events", payload);
  },

  updateEvent(id, payload) {
    return api.put(`/events/${id}`, payload);
  },

  deleteEvent(id) {
    return api.delete(`/events/${id}`);
  },
};

export default eventService;
