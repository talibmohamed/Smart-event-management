import PDFDocument from "pdfkit";
import QRCode from "qrcode";

const appName = "Smart Event Management";

const formatDate = (value) =>
  new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const safeText = (value) => String(value ?? "");

const addTicketPage = async (doc, { booking, event, ticket }) => {
  const qrBuffer = await QRCode.toBuffer(ticket.qr_value || ticket.ticket_code, {
    type: "png",
    margin: 1,
    width: 220,
  });

  doc
    .fontSize(22)
    .font("Helvetica-Bold")
    .text(appName, { align: "center" })
    .moveDown(0.5);

  doc
    .fontSize(16)
    .font("Helvetica-Bold")
    .text("Event Ticket", { align: "center" })
    .moveDown(1);

  doc.font("Helvetica").fontSize(12);
  doc.text(`Event: ${safeText(event?.title)}`);
  doc.text(`Date: ${event?.event_date ? formatDate(event.event_date) : "N/A"}`);
  doc.text(`Location: ${[event?.address, event?.city].filter(Boolean).join(", ") || "N/A"}`);
  doc.moveDown(0.75);
  doc.text(`Ticket tier: ${safeText(ticket.ticket_tier?.name || "Ticket")}`);
  doc.text(`Ticket code: ${safeText(ticket.ticket_code)}`);
  doc.text(`Ticket status: ${safeText(ticket.status)}`);
  doc.text(`Booking ID: ${safeText(booking?.id)}`);
  doc.moveDown(0.75);
  doc.text(
    `Attendee: ${safeText(ticket.attendee?.first_name)} ${safeText(ticket.attendee?.last_name)}`
  );
  doc.text(`Email: ${safeText(ticket.attendee?.email)}`);
  doc.moveDown(1);

  const qrX = (doc.page.width - 220) / 2;
  doc.image(qrBuffer, qrX, doc.y, { width: 220, height: 220 });
  doc.moveDown(15);
  doc
    .fontSize(10)
    .fillColor("#555555")
    .text("Present this QR code at event check-in. Do not share it publicly.", {
      align: "center",
    })
    .fillColor("#000000");
};

export const getTicketPdfFilename = (bookingId) =>
  `smart-event-tickets-${bookingId}.pdf`;

export const generateTicketsPdf = async ({ booking, event, tickets }) => {
  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
    autoFirstPage: false,
  });
  const chunks = [];

  doc.on("data", (chunk) => chunks.push(chunk));

  const finished = new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  for (const ticket of tickets) {
    doc.addPage();
    await addTicketPage(doc, { booking, event, ticket });
  }

  doc.end();
  return finished;
};

export const buildTicketPdfAttachment = async ({ booking, event, tickets }) => {
  try {
    const pdfBuffer = await generateTicketsPdf({ booking, event, tickets });

    return {
      filename: getTicketPdfFilename(booking.id),
      content: pdfBuffer.toString("base64"),
    };
  } catch (error) {
    console.error(
      JSON.stringify({
        scope: "ticket_pdf",
        action: "generate_failed",
        booking_id: booking?.id,
        error: error.message,
      })
    );

    return null;
  }
};
