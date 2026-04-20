export function formatEventPrice(price) {
  const numericPrice = Number(price);

  if (Number.isNaN(numericPrice) || numericPrice <= 0) {
    return "Free";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(numericPrice);
}

function formatCurrencyPrice(price) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(Number(price) || 0);
}

export function formatEventPriceRange(event = {}) {
  const minPrice = Number(event.min_price ?? event.price);
  const maxPrice = Number(event.max_price ?? event.min_price ?? event.price);

  if (!Number.isFinite(minPrice)) {
    return "Free";
  }

  if (!Number.isFinite(maxPrice) || minPrice === maxPrice) {
    return formatEventPrice(minPrice);
  }

  if (minPrice <= 0 && maxPrice <= 0) {
    return "Free";
  }

  return `From ${formatCurrencyPrice(minPrice)}`;
}

export function formatEventDate(dateValue, options = {}) {
  if (!dateValue) {
    return "Date not available";
  }

  const parsedDate = new Date(dateValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Date not available";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    ...options,
  }).format(parsedDate);
}

export function formatEventDateInTimezone(dateValue, timezone = "Europe/Paris", options = {}) {
  return formatEventDate(dateValue, {
    timeZone: timezone || "Europe/Paris",
    ...options,
  });
}

export function formatEventTimeRange(startsAt, endsAt, timezone = "Europe/Paris") {
  const start = new Date(startsAt);
  const end = new Date(endsAt);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Time not available";
  }

  const sameDay = start.toLocaleDateString("en-GB", { timeZone: timezone }) ===
    end.toLocaleDateString("en-GB", { timeZone: timezone });
  const timeFormatter = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  });

  if (sameDay) {
    return `${timeFormatter.format(start)} - ${timeFormatter.format(end)}`;
  }

  return `${formatEventDateInTimezone(startsAt, timezone)} - ${formatEventDateInTimezone(endsAt, timezone)}`;
}

export function formatEventVenue(event = {}) {
  const address = event.address?.trim?.() || "";
  const city = event.city?.trim?.() || "";

  if (address && city) {
    return `${address}, ${city}`;
  }

  return address || city || "Venue not available";
}

export function isUpcomingEvent(dateValue) {
  const parsedDate = new Date(dateValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return false;
  }

  return parsedDate.getTime() >= Date.now();
}

export function getEventAvailability(event = {}) {
  const capacity = Number(event.capacity);
  const confirmedBookings = Number(event.confirmed_bookings);
  const remainingSeats = Number(event.remaining_seats);
  const hasRemainingSeats = Number.isFinite(remainingSeats);
  const hasConfirmedBookings = Number.isFinite(confirmedBookings);
  const hasCapacity = Number.isFinite(capacity);
  const isFull = Boolean(event.is_full) || (hasRemainingSeats && remainingSeats <= 0);

  return {
    capacity: hasCapacity ? capacity : null,
    confirmedBookings: hasConfirmedBookings ? confirmedBookings : null,
    remainingSeats: hasRemainingSeats ? Math.max(remainingSeats, 0) : null,
    isFull,
  };
}

export function formatEventAvailability(event = {}) {
  const availability = getEventAvailability(event);

  if (availability.isFull) {
    return "Event full";
  }

  if (availability.remainingSeats !== null) {
    return `${availability.remainingSeats} seat${availability.remainingSeats === 1 ? "" : "s"} remaining`;
  }

  if (availability.capacity !== null) {
    return `${availability.capacity} seat${availability.capacity === 1 ? "" : "s"} available`;
  }

  return "Availability not available";
}

export function toDateTimeLocalValue(dateValue) {
  if (!dateValue) {
    return "";
  }

  const parsedDate = new Date(dateValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");
  const hours = String(parsedDate.getHours()).padStart(2, "0");
  const minutes = String(parsedDate.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export const DEFAULT_EVENT_TIMEZONE = "Europe/Paris";
export const EVENT_TIMEZONE_OPTIONS = [
  "Europe/Paris",
  "Europe/London",
  "Europe/Madrid",
  "Europe/Berlin",
  "Europe/Rome",
  "Europe/Brussels",
  "Europe/Amsterdam",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Dubai",
];

export const DEFAULT_TICKET_TIERS = [
  {
    name: "Early Bird",
    description: "Limited early access",
    price: "10",
    capacity: "20",
    is_active: true,
    sort_order: 0,
  },
  {
    name: "Standard",
    description: "General admission",
    price: "25",
    capacity: "60",
    is_active: true,
    sort_order: 1,
  },
  {
    name: "VIP",
    description: "Premium access",
    price: "50",
    capacity: "20",
    is_active: true,
    sort_order: 2,
  },
];

function cloneDefaultTicketTiers() {
  return DEFAULT_TICKET_TIERS.map((tier) => ({ ...tier }));
}

export function normalizeTicketTiers(ticketTiers) {
  if (!Array.isArray(ticketTiers) || ticketTiers.length === 0) {
    return cloneDefaultTicketTiers();
  }

  return ticketTiers
    .slice()
    .sort((firstTier, secondTier) => Number(firstTier.sort_order ?? 0) - Number(secondTier.sort_order ?? 0))
    .map((tier, index) => ({
      id: tier.id,
      name: tier.name || "",
      description: tier.description || "",
      price: tier.price?.toString?.() ?? "0",
      capacity: tier.capacity?.toString?.() ?? "",
      sold_quantity: Number(tier.sold_quantity) || 0,
      remaining_quantity:
        tier.remaining_quantity === null || tier.remaining_quantity === undefined
          ? null
          : Math.max(Number(tier.remaining_quantity) || 0, 0),
      is_active: tier.is_active !== false,
      sort_order: Number.isFinite(Number(tier.sort_order)) ? Number(tier.sort_order) : index,
    }));
}

export function getActiveTicketTiers(event = {}) {
  return Array.isArray(event.ticket_tiers)
    ? event.ticket_tiers
        .filter((tier) => tier?.is_active !== false)
        .slice()
        .sort((firstTier, secondTier) => Number(firstTier.sort_order ?? 0) - Number(secondTier.sort_order ?? 0))
    : [];
}

export function getTicketTierRemainingQuantity(tier = {}) {
  const remainingQuantity = Number(tier.remaining_quantity);

  if (Number.isFinite(remainingQuantity)) {
    return Math.max(remainingQuantity, 0);
  }

  const capacity = Number(tier.capacity);
  const soldQuantity = Number(tier.sold_quantity);

  if (Number.isFinite(capacity)) {
    return Math.max(capacity - (Number.isFinite(soldQuantity) ? soldQuantity : 0), 0);
  }

  return 0;
}

export function calculateTicketTierTotal(ticketTiers = []) {
  return ticketTiers.reduce((total, tier) => total + Number(tier.capacity || 0), 0);
}

export function normalizeAgendaTracks(agendaTracks = []) {
  if (!Array.isArray(agendaTracks)) {
    return [];
  }

  return agendaTracks
    .slice()
    .sort((firstTrack, secondTrack) => Number(firstTrack.sort_order ?? 0) - Number(secondTrack.sort_order ?? 0))
    .map((track, trackIndex) => ({
      id: track.id,
      name: track.name || "",
      description: track.description || "",
      sort_order: Number.isFinite(Number(track.sort_order)) ? Number(track.sort_order) : trackIndex,
      sessions: Array.isArray(track.sessions)
        ? track.sessions
            .slice()
            .sort((firstSession, secondSession) => {
              const firstTime = new Date(firstSession.starts_at).getTime();
              const secondTime = new Date(secondSession.starts_at).getTime();
              return firstTime - secondTime || Number(firstSession.sort_order ?? 0) - Number(secondSession.sort_order ?? 0);
            })
            .map((session, sessionIndex) => ({
              id: session.id,
              title: session.title || "",
              description: session.description || "",
              speaker_name: session.speaker_name || "",
              location: session.location || "",
              starts_at: toDateTimeLocalValue(session.starts_at),
              ends_at: toDateTimeLocalValue(session.ends_at),
              sort_order: Number.isFinite(Number(session.sort_order)) ? Number(session.sort_order) : sessionIndex,
            }))
        : [],
    }));
}

export function toEventFormValues(event = {}) {
  return {
    title: event.title || "",
    description: event.description || "",
    category: event.category || "",
    address: event.address || "",
    city: event.city || "",
    event_date: toDateTimeLocalValue(event.event_date),
    event_end_date: toDateTimeLocalValue(event.event_end_date),
    timezone: event.timezone || DEFAULT_EVENT_TIMEZONE,
    capacity: event.capacity?.toString() || "",
    price: event.min_price?.toString?.() || event.price?.toString?.() || "0",
    ticket_tiers: normalizeTicketTiers(event.ticket_tiers),
    agenda_tracks: normalizeAgendaTracks(event.agenda_tracks),
  };
}

export const EVENT_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
export const EVENT_IMAGE_MAX_SIZE = 5 * 1024 * 1024;
export const EVENT_IMAGE_ERROR_MESSAGE =
  "Event image must be a JPEG, PNG, or WebP file under 5MB";

export function validateEventImageFile(file) {
  if (!file) {
    return "";
  }

  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

  if (!allowedTypes.has(file.type) || file.size > EVENT_IMAGE_MAX_SIZE) {
    return EVENT_IMAGE_ERROR_MESSAGE;
  }

  return "";
}

export function buildEventPayload(values, imageOptions = {}) {
  const payload = new FormData();
  const ticketTiers = normalizeTicketTiers(values.ticket_tiers).map((tier, index) => ({
    ...(tier.id ? { id: tier.id } : {}),
    name: tier.name.trim(),
    description: tier.description.trim(),
    price: Number(tier.price),
    capacity: Number(tier.capacity),
    is_active: tier.is_active !== false,
    sort_order: index,
  }));
  const activePrices = ticketTiers
    .filter((tier) => tier.is_active)
    .map((tier) => tier.price)
    .filter((price) => Number.isFinite(price));
  const compatibilityPrice = activePrices.length > 0 ? Math.min(...activePrices) : 0;

  payload.append("title", values.title.trim());
  payload.append("description", values.description.trim());
  payload.append("category", values.category.trim());
  payload.append("address", values.address.trim());
  payload.append("city", values.city.trim());
  payload.append("event_date", new Date(values.event_date).toISOString());
  if (values.event_end_date) {
    payload.append("event_end_date", new Date(values.event_end_date).toISOString());
  }
  payload.append("timezone", values.timezone || DEFAULT_EVENT_TIMEZONE);
  payload.append("capacity", String(Number(values.capacity)));
  payload.append("price", String(compatibilityPrice));
  payload.append("ticket_tiers", JSON.stringify(ticketTiers));
  payload.append(
    "agenda_tracks",
    JSON.stringify(
      normalizeAgendaTracks(values.agenda_tracks).map((track, trackIndex) => ({
        ...(track.id ? { id: track.id } : {}),
        name: track.name.trim(),
        description: track.description.trim(),
        sort_order: trackIndex,
        sessions: track.sessions.map((session, sessionIndex) => ({
          ...(session.id ? { id: session.id } : {}),
          title: session.title.trim(),
          description: session.description.trim(),
          speaker_name: session.speaker_name.trim(),
          location: session.location.trim(),
          starts_at: new Date(session.starts_at).toISOString(),
          ends_at: new Date(session.ends_at).toISOString(),
          sort_order: sessionIndex,
        })),
      }))
    )
  );

  if (imageOptions.coverImageFile) {
    payload.append("cover_image", imageOptions.coverImageFile);
  }

  if (imageOptions.removeImage) {
    payload.append("remove_image", "true");
  }

  return payload;
}
