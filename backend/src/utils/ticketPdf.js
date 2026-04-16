import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import SVGtoPDF from "svg-to-pdfkit";

const appName = "Quickseat";
const appSlogan = "YOUR SEAT, FASTER THAN EVER";

const colors = {
  ink: "#111827",
  muted: "#667085",
  border: "#dbe4ee",
  surface: "#f5f8fb",
  card: "#ffffff",
  brand: "#231538",
  brandSoft: "#f0ecf8",
  accent: "#0f766e",
  accentSoft: "#dff7f1",
  white: "#ffffff",
  brandLight: "#f8f4ff",
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../..");
const logoPath = path.join(repoRoot, "frontend", "logo.svg");
const logoWithSloganPath = path.join(repoRoot, "frontend", "logo + slogen.svg");

let cachedLogoSvg = null;
let cachedLogoWithSloganSvg = null;
let logosLoaded = false;

const formatDate = (value) =>
  new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const safeText = (value) => String(value ?? "");

const truncate = (value, maxLength) => {
  const text = safeText(value);
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
};

const sanitizeSvgForPdf = (svg) =>
  svg
    .replace(/<image\b[\s\S]*?\/>/gi, "")
    .replace(/<mask\b[\s\S]*?<\/mask>/gi, "")
    .replace(/\sfilter="[^"]*"/gi, "");

const readLogoSvg = (filePath) => {
  try {
    return sanitizeSvgForPdf(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
};

const loadLogos = () => {
  if (!logosLoaded) {
    cachedLogoSvg = readLogoSvg(logoPath);
    cachedLogoWithSloganSvg = readLogoSvg(logoWithSloganPath);
    logosLoaded = true;
  }

  return {
    logoSvg: cachedLogoSvg,
    logoWithSloganSvg: cachedLogoWithSloganSvg,
  };
};

const drawSvgIfAvailable = (doc, svg, x, y, options) => {
  if (!svg) {
    return false;
  }

  try {
    SVGtoPDF(doc, svg, x, y, {
      width: options.width,
      height: options.height,
      preserveAspectRatio: "xMidYMid meet",
      assumePt: true,
    });
    return true;
  } catch (error) {
    console.error(
      JSON.stringify({
        scope: "ticket_pdf",
        action: "logo_svg_render_failed",
        error: error.message,
      })
    );
    return false;
  }
};

const drawPill = (doc, label, x, y, width, options = {}) => {
  const background = options.background || colors.accentSoft;
  const foreground = options.foreground || colors.accent;

  doc
    .roundedRect(x, y, width, 24, 12)
    .fill(background)
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(foreground)
    .text(String(label).toUpperCase(), x, y + 7, {
      width,
      align: "center",
    });
};

const drawBrandMark = (doc, x, y, size, options = {}) => {
  const foreground = options.foreground || colors.brand;
  const background = options.background || colors.brandSoft;
  const accent = options.accent || colors.accent;

  doc.roundedRect(x, y, size, size, size * 0.24).fill(background);
  doc
    .circle(x + size * 0.34, y + size * 0.34, size * 0.16)
    .fill(foreground)
    .circle(x + size * 0.66, y + size * 0.66, size * 0.16)
    .fill(foreground);
  doc
    .roundedRect(x + size * 0.24, y + size * 0.49, size * 0.52, size * 0.14, size * 0.07)
    .fill(accent);
};

const drawBrandLockup = (doc, x, y, options = {}) => {
  const onDark = options.onDark || false;
  const markSize = options.markSize || 34;
  const textColor = onDark ? colors.white : colors.brand;
  const mutedColor = onDark ? "#d8cfee" : colors.muted;
  const markBackground = onDark ? colors.white : colors.brandSoft;

  drawBrandMark(doc, x, y, markSize, {
    foreground: colors.brand,
    background: markBackground,
    accent: colors.accent,
  });

  doc
    .font("Helvetica-Bold")
    .fontSize(options.titleSize || 17)
    .fillColor(textColor)
    .text(appName, x + markSize + 10, y + 5, {
      width: options.width || 190,
    })
    .font("Helvetica")
    .fontSize(options.sloganSize || 8)
    .fillColor(mutedColor)
    .text(appSlogan, x + markSize + 10, y + 25, {
      width: options.width || 190,
    });
};

const drawLogoBox = (doc, x, y, width, height, options = {}) => {
  const logoSvg = options.logoSvg || null;

  doc
    .roundedRect(x, y, width, height, 16)
    .fill(options.background || colors.white);

  if (drawSvgIfAvailable(doc, logoSvg, x + 12, y + 9, {
    width: width - 24,
    height: height - 18,
  })) {
    return;
  }

  drawBrandLockup(doc, x + 16, y + 10, {
    onDark: false,
    markSize: 30,
    titleSize: 16,
    sloganSize: 7,
    width: width - 56,
  });
};

const drawDetail = (doc, label, value, x, y, width) => {
  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor(colors.muted)
    .text(String(label).toUpperCase(), x, y, {
      width,
      characterSpacing: 0.4,
    });

  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor(colors.ink)
    .text(truncate(value || "N/A", 58), x, y + 14, {
      width,
      lineGap: 2,
    });
};

const drawDashedDivider = (doc, x, y, width) => {
  doc
    .moveTo(x, y)
    .lineTo(x + width, y)
    .dash(6, { space: 6 })
    .lineWidth(1)
    .strokeColor(colors.border)
    .stroke()
    .undash();
};

const addTicketPage = async (doc, { booking, event, ticket }) => {
  const { logoSvg, logoWithSloganSvg } = loadLogos();
  const qrValue = ticket.qr_value || ticket.ticket_code;
  const qrBuffer = await QRCode.toBuffer(qrValue, {
    type: "png",
    margin: 1,
    width: 240,
    color: {
      dark: colors.brand,
      light: "#ffffff",
    },
  });

  const page = {
    width: doc.page.width,
    height: doc.page.height,
  };
  const margin = 42;
  const ticketX = margin;
  const ticketY = 54;
  const ticketW = page.width - margin * 2;
  const ticketH = page.height - 108;
  const contentX = ticketX + 28;
  const contentW = ticketW - 56;
  const headerH = 168;
  const qrSize = 176;
  const qrBoxW = 212;
  const qrBoxX = ticketX + ticketW - qrBoxW - 28;
  const detailsX = contentX;
  const detailsW = qrBoxX - detailsX - 28;
  const attendeeName = `${safeText(ticket.attendee?.first_name)} ${safeText(ticket.attendee?.last_name)}`.trim();
  const location = [event?.address, event?.city].filter(Boolean).join(", ") || "N/A";

  doc.rect(0, 0, page.width, page.height).fill(colors.surface);

  doc
    .roundedRect(ticketX, ticketY, ticketW, ticketH, 28)
    .fill(colors.card)
    .strokeColor(colors.border)
    .lineWidth(1)
    .stroke();

  doc
    .save()
    .roundedRect(ticketX, ticketY, ticketW, headerH, 28)
    .clip()
    .rect(ticketX, ticketY, ticketW, headerH)
    .fill(colors.brand);

  doc
    .circle(ticketX + ticketW - 46, ticketY + 32, 86)
    .fill("#33204d")
    .circle(ticketX + ticketW - 110, ticketY + 122, 46)
    .fill("#4a326a")
    .restore();

  drawLogoBox(doc, contentX, ticketY + 24, 184, 56, {
    logoSvg: logoWithSloganSvg || logoSvg,
  });

  drawPill(doc, "Admission ticket", ticketX + ticketW - 188, ticketY + 34, 142, {
    background: "#ffffff",
    foreground: colors.brand,
  });

  doc
    .font("Helvetica-Bold")
    .fontSize(25)
    .fillColor("#ffffff")
    .text(truncate(event?.title || "Event ticket", 56), contentX, ticketY + 94, {
      width: contentW - 70,
      lineGap: 2,
    });

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#ded6ec")
    .text("Show this ticket at the event entrance. The QR code contains only the ticket code.", contentX, ticketY + 140, {
      width: contentW - 90,
    });

  const bodyY = ticketY + headerH + 30;

  doc
    .roundedRect(qrBoxX, bodyY, qrBoxW, 284, 22)
    .fill("#fbfdff")
    .strokeColor(colors.border)
    .stroke();

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(colors.muted)
    .text("SCAN AT CHECK-IN", qrBoxX, bodyY + 20, {
      width: qrBoxW,
      align: "center",
      characterSpacing: 0.6,
    });

  doc.image(qrBuffer, qrBoxX + (qrBoxW - qrSize) / 2, bodyY + 46, {
    width: qrSize,
    height: qrSize,
  });

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(colors.brand)
    .text(safeText(ticket.ticket_code), qrBoxX + 18, bodyY + 234, {
      width: qrBoxW - 36,
      align: "center",
    });

  drawPill(doc, ticket.status || "valid", qrBoxX + 55, bodyY + 256, 102, {
    background: ticket.status === "used" ? "#e5e7eb" : colors.accentSoft,
    foreground: ticket.status === "used" ? colors.muted : colors.accent,
  });

  doc
    .roundedRect(detailsX, bodyY, detailsW, 284, 22)
    .fill("#ffffff")
    .strokeColor(colors.border)
    .stroke();

  drawPill(doc, ticket.ticket_tier?.name || "Ticket", detailsX + 22, bodyY + 22, 126);

  drawDetail(doc, "Date and time", event?.event_date ? formatDate(event.event_date) : "N/A", detailsX + 22, bodyY + 66, detailsW - 44);
  drawDetail(doc, "Location", location, detailsX + 22, bodyY + 118, detailsW - 44);
  drawDetail(doc, "Attendee", attendeeName || "N/A", detailsX + 22, bodyY + 170, detailsW - 44);
  drawDetail(doc, "Email", ticket.attendee?.email || "N/A", detailsX + 22, bodyY + 222, detailsW - 44);

  const bookingY = bodyY + 318;
  drawDashedDivider(doc, contentX, bookingY, contentW);

  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor(colors.muted)
    .text("BOOKING ID", contentX, bookingY + 24, { characterSpacing: 0.4 })
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(colors.ink)
    .text(safeText(booking?.id), contentX, bookingY + 40, { width: 250 });

  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor(colors.muted)
    .text("TICKET CODE", contentX + 280, bookingY + 24, { characterSpacing: 0.4 })
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(colors.ink)
    .text(safeText(ticket.ticket_code), contentX + 280, bookingY + 40, { width: 210 });

  const footerY = ticketY + ticketH - 86;
  doc
    .roundedRect(contentX, footerY, contentW, 48, 16)
    .fill(colors.brandSoft);

  drawBrandMark(doc, contentX + 16, footerY + 10, 28, {
    foreground: colors.brand,
    background: colors.white,
    accent: colors.accent,
  });

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(colors.brand)
    .text("Keep this ticket private", contentX + 56, footerY + 10, {
      width: contentW - 70,
    })
    .font("Helvetica")
    .fontSize(9)
    .fillColor(colors.muted)
    .text("Sharing the QR code may allow someone else to use your ticket before you arrive.", contentX + 56, footerY + 26, {
      width: contentW - 70,
    });

  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#98a2b3")
    .text(`${appName} - generated ticket`, margin, page.height - 30, {
      width: page.width - margin * 2,
      align: "center",
    });
};

export const getTicketPdfFilename = (bookingId) =>
  `smart-event-tickets-${bookingId}.pdf`;

export const generateTicketsPdf = async ({ booking, event, tickets }) => {
  const doc = new PDFDocument({
    size: "A4",
    margin: 0,
    autoFirstPage: false,
    info: {
      Title: `${appName} Tickets`,
      Author: appName,
      Subject: event?.title || "Event tickets",
    },
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
