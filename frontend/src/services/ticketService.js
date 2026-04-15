import api from "./api";
import { readStoredSession } from "./authStorage";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

async function extractPdfErrorMessage(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      const payload = await response.json();

      return payload?.message || "Unable to download ticket PDF.";
    } catch {
      return "Unable to download ticket PDF.";
    }
  }

  return "Unable to download ticket PDF.";
}

const ticketService = {
  getBookingTickets(bookingId) {
    return api.get(`/bookings/${bookingId}/tickets`);
  },

  async downloadBookingTicketsPdf(bookingId) {
    const { token } = readStoredSession();
    const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/tickets/pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      const error = new Error(await extractPdfErrorMessage(response));
      error.status = response.status;
      throw error;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `smart-event-tickets-${bookingId}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },

  getTicket(ticketCode) {
    return api.get(`/tickets/${encodeURIComponent(ticketCode)}`);
  },

  checkInTicket(ticketCode) {
    return api.post(`/tickets/${encodeURIComponent(ticketCode)}/check-in`);
  },
};

export default ticketService;
