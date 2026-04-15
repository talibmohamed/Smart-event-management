import QRCode from "qrcode";

export const getTicketUrl = (bookingId) =>
  `${process.env.FRONTEND_URL || "http://localhost:5173"}/bookings/${bookingId}/tickets`;

export const buildEmailTickets = async (tickets) => {
  try {
    return await Promise.all(
      tickets.map(async (ticket) => ({
        ticket_code: ticket.ticket_code,
        ticket_tier_name: ticket.ticket_tier?.name,
        qr_data_url: await QRCode.toDataURL(ticket.qr_value || ticket.ticket_code),
      }))
    );
  } catch (error) {
    console.error("Ticket QR email generation failed:", error);

    return tickets.map((ticket) => ({
      ticket_code: ticket.ticket_code,
      ticket_tier_name: ticket.ticket_tier?.name,
      qr_data_url: null,
    }));
  }
};
