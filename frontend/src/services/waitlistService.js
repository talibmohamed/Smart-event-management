import api from "./api"; 

const waitlistService = {
  // Rejoindre la liste
  joinWaitlist: async (eventId) => {
    const response = await api.post(`/waitlist/${eventId}/join`);
    return response.data;
  },

  // Quitter la liste
  leaveWaitlist: async (eventId) => {
    const response = await api.delete(`/waitlist/${eventId}/leave`);
    return response.data;
  },

  getStatus: async (eventId) => {
    const response = await api.get(`/waitlist/${eventId}/status`);
    return response.data;
  }
};

export default waitlistService;