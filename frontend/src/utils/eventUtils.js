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

export function toEventFormValues(event = {}) {
  return {
    title: event.title || "",
    description: event.description || "",
    category: event.category || "",
    address: event.address || "",
    city: event.city || "",
    event_date: toDateTimeLocalValue(event.event_date),
    capacity: event.capacity?.toString() || "",
    price: event.price?.toString() || "0",
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

  payload.append("title", values.title.trim());
  payload.append("description", values.description.trim());
  payload.append("category", values.category.trim());
  payload.append("address", values.address.trim());
  payload.append("city", values.city.trim());
  payload.append("event_date", new Date(values.event_date).toISOString());
  payload.append("capacity", String(Number(values.capacity)));
  payload.append("price", String(Number(values.price)));

  if (imageOptions.coverImageFile) {
    payload.append("cover_image", imageOptions.coverImageFile);
  }

  if (imageOptions.removeImage) {
    payload.append("remove_image", "true");
  }

  return payload;
}
