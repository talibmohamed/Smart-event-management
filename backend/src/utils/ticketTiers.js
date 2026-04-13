export const MAX_TICKET_TIERS = 10;
export const MAX_TICKETS_PER_BOOKING = 5;

const parseJsonIfString = (value, fieldName) => {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    const error = new Error(`${fieldName} must be valid JSON`);
    error.statusCode = 400;
    throw error;
  }
};

export const parseEventTicketTiers = ({
  rawTicketTiers,
  fallbackPrice,
  eventCapacity,
}) => {
  const parsed = parseJsonIfString(rawTicketTiers, "ticket_tiers");
  const tiers = parsed === undefined || parsed === null || parsed === ""
    ? [
        {
          name: "Standard",
          description: "Standard ticket",
          price: fallbackPrice,
          capacity: eventCapacity,
          is_active: true,
          sort_order: 0,
        },
      ]
    : parsed;

  if (!Array.isArray(tiers) || tiers.length < 1 || tiers.length > MAX_TICKET_TIERS) {
    const error = new Error("Event must have between 1 and 10 ticket tiers");
    error.statusCode = 400;
    throw error;
  }

  const normalizedTiers = tiers.map((tier, index) => {
    const name = String(tier?.name || "").trim();
    const price = Number(tier?.price);
    const capacity = Number(tier?.capacity);

    if (!name || Number.isNaN(price) || price < 0 || Number.isNaN(capacity) || capacity <= 0) {
      const error = new Error("Each ticket tier requires name, price >= 0, and capacity > 0");
      error.statusCode = 400;
      throw error;
    }

    return {
      id: tier.id || null,
      name,
      description: tier.description ? String(tier.description).trim() : null,
      price,
      capacity,
      is_active: tier.is_active === undefined ? true : tier.is_active === true || tier.is_active === "true",
      sort_order: Number.isNaN(Number(tier.sort_order)) ? index : Number(tier.sort_order),
    };
  });

  const tierCapacityTotal = normalizedTiers.reduce((sum, tier) => sum + tier.capacity, 0);

  if (tierCapacityTotal > eventCapacity) {
    const error = new Error("Ticket tier capacities cannot exceed event capacity");
    error.statusCode = 400;
    throw error;
  }

  return normalizedTiers;
};

export const parseBookingItems = (rawItems) => {
  const parsed = parseJsonIfString(rawItems, "items");

  if (parsed === undefined || parsed === null || parsed === "") {
    return null;
  }

  if (!Array.isArray(parsed) || parsed.length < 1) {
    const error = new Error("At least one ticket item is required");
    error.statusCode = 400;
    throw error;
  }

  const normalizedItems = parsed.map((item) => {
    const ticketTierId = item?.ticket_tier_id;
    const quantity = Number(item?.quantity);

    if (!ticketTierId || Number.isNaN(quantity) || quantity <= 0) {
      const error = new Error("Each booking item requires ticket_tier_id and quantity > 0");
      error.statusCode = 400;
      throw error;
    }

    return {
      ticket_tier_id: ticketTierId,
      quantity,
    };
  });

  const totalQuantity = normalizedItems.reduce((sum, item) => sum + item.quantity, 0);

  if (totalQuantity > MAX_TICKETS_PER_BOOKING) {
    const error = new Error("You can book a maximum of 5 tickets per booking");
    error.statusCode = 400;
    throw error;
  }

  return normalizedItems;
};
