import QRCode from "qrcode";

export const getTicketUrl = (bookingId) =>
  `${process.env.FRONTEND_URL || "http://localhost:5173"}/bookings/${bookingId}/tickets`;

export const buildEmailTickets = async (tickets) => {
  try {
    const emailTickets = await Promise.all(
      tickets.map(async (ticket, index) => {
        const contentId = `ticket-qr-${index}-${ticket.ticket_code}`;
        const qrBuffer = await QRCode.toBuffer(ticket.qr_value || ticket.ticket_code, {
          type: "png",
          margin: 1,
          width: 180,
        });

        return {
        ticket_code: ticket.ticket_code,
        ticket_tier_name: ticket.ticket_tier?.name,
          qr_src: `cid:${contentId}`,
          qr_attachment: {
            filename: `ticket-qr-${index + 1}.png`,
            content: qrBuffer,
            contentType: "image/png",
            contentId,
          },
        };
      })
    );

    return {
      tickets: emailTickets.map(({ qr_attachment, ...ticket }) => ticket),
      attachments: emailTickets.map((ticket) => ticket.qr_attachment),
    };
  } catch (error) {
    console.error("Ticket QR email generation failed:", error);

    return {
      tickets: tickets.map((ticket) => ({
        ticket_code: ticket.ticket_code,
        ticket_tier_name: ticket.ticket_tier?.name,
        qr_src: null,
      })),
      attachments: [],
    };
  }
};
