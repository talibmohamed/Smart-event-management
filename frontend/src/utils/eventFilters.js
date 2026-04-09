export const DEFAULT_EVENT_FILTERS = {
  q: "",
  category: "",
  city: "",
  price: "all",
  time: "all",
  sort: "soonest",
};

export const PRICE_FILTER_OPTIONS = [
  { value: "all", label: "All prices" },
  { value: "free", label: "Free" },
  { value: "paid", label: "Paid" },
];

export const TIME_FILTER_OPTIONS = [
  { value: "all", label: "All times" },
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
];

export const SORT_OPTIONS = [
  { value: "soonest", label: "Soonest" },
  { value: "latest", label: "Latest" },
  { value: "price-asc", label: "Price low to high" },
  { value: "price-desc", label: "Price high to low" },
];

const VALID_PRICE_FILTERS = new Set(PRICE_FILTER_OPTIONS.map((option) => option.value));
const VALID_TIME_FILTERS = new Set(TIME_FILTER_OPTIONS.map((option) => option.value));
const VALID_SORT_OPTIONS = new Set(SORT_OPTIONS.map((option) => option.value));

function normalizeText(value) {
  return (value || "").toString().trim().toLowerCase();
}

function parseDateValue(dateValue) {
  const parsedDate = new Date(dateValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
}

function parsePriceValue(priceValue) {
  const numericPrice = Number(priceValue);

  if (Number.isNaN(numericPrice)) {
    return 0;
  }

  return numericPrice;
}

export function parseEventFilterParams(searchParams) {
  const nextFilters = {
    q: searchParams.get("q") || DEFAULT_EVENT_FILTERS.q,
    category: searchParams.get("category") || DEFAULT_EVENT_FILTERS.category,
    city: searchParams.get("city") || DEFAULT_EVENT_FILTERS.city,
    price: searchParams.get("price") || DEFAULT_EVENT_FILTERS.price,
    time: searchParams.get("time") || DEFAULT_EVENT_FILTERS.time,
    sort: searchParams.get("sort") || DEFAULT_EVENT_FILTERS.sort,
  };

  return sanitizeEventFilters(nextFilters);
}

export function sanitizeEventFilters(filters, options = {}) {
  const categories = options.categories || [];
  const cities = options.cities || [];

  return {
    q: typeof filters.q === "string" ? filters.q : DEFAULT_EVENT_FILTERS.q,
    category: categories.includes(filters.category) ? filters.category : DEFAULT_EVENT_FILTERS.category,
    city: cities.includes(filters.city) ? filters.city : DEFAULT_EVENT_FILTERS.city,
    price: VALID_PRICE_FILTERS.has(filters.price) ? filters.price : DEFAULT_EVENT_FILTERS.price,
    time: VALID_TIME_FILTERS.has(filters.time) ? filters.time : DEFAULT_EVENT_FILTERS.time,
    sort: VALID_SORT_OPTIONS.has(filters.sort) ? filters.sort : DEFAULT_EVENT_FILTERS.sort,
  };
}

export function buildEventFilterSearchParams(filters) {
  const params = new URLSearchParams();

  if (filters.q.trim()) {
    params.set("q", filters.q.trim());
  }

  if (filters.category) {
    params.set("category", filters.category);
  }

  if (filters.city) {
    params.set("city", filters.city);
  }

  if (filters.price !== DEFAULT_EVENT_FILTERS.price) {
    params.set("price", filters.price);
  }

  if (filters.time !== DEFAULT_EVENT_FILTERS.time) {
    params.set("time", filters.time);
  }

  if (filters.sort !== DEFAULT_EVENT_FILTERS.sort) {
    params.set("sort", filters.sort);
  }

  return params;
}

export function getEventFilterOptions(events) {
  const categories = Array.from(
    new Set(events.map((event) => event.category).filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right));

  const cities = Array.from(
    new Set(events.map((event) => event.city).filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right));

  return { categories, cities };
}

export function getFilteredAndSortedEvents(events, filters) {
  const now = Date.now();
  const normalizedQuery = normalizeText(filters.q);

  const filteredEvents = events.filter((event) => {
    const title = normalizeText(event.title);
    const description = normalizeText(event.description);
    const category = normalizeText(event.category);
    const address = normalizeText(event.address);
    const city = normalizeText(event.city);
    const price = parsePriceValue(event.price);
    const parsedDate = parseDateValue(event.event_date);
    const eventTime = parsedDate?.getTime() ?? null;

    const matchesQuery =
      !normalizedQuery ||
      title.includes(normalizedQuery) ||
      description.includes(normalizedQuery) ||
      category.includes(normalizedQuery) ||
      address.includes(normalizedQuery) ||
      city.includes(normalizedQuery);

    const matchesCategory = !filters.category || event.category === filters.category;
    const matchesCity = !filters.city || event.city === filters.city;
    const matchesPrice =
      filters.price === "all" ||
      (filters.price === "free" && price <= 0) ||
      (filters.price === "paid" && price > 0);

    const matchesTime =
      filters.time === "all" ||
      (filters.time === "upcoming" && eventTime !== null && eventTime >= now) ||
      (filters.time === "past" && eventTime !== null && eventTime < now);

    return (
      matchesQuery &&
      matchesCategory &&
      matchesCity &&
      matchesPrice &&
      matchesTime
    );
  });

  return [...filteredEvents].sort((left, right) => {
    const leftDate = parseDateValue(left.event_date)?.getTime() ?? 0;
    const rightDate = parseDateValue(right.event_date)?.getTime() ?? 0;
    const leftPrice = parsePriceValue(left.price);
    const rightPrice = parsePriceValue(right.price);

    switch (filters.sort) {
      case "latest":
        return rightDate - leftDate;
      case "price-asc":
        return leftPrice - rightPrice || leftDate - rightDate;
      case "price-desc":
        return rightPrice - leftPrice || leftDate - rightDate;
      case "soonest":
      default:
        return leftDate - rightDate;
    }
  });
}

export function countActiveEventFilters(filters) {
  return [
    Boolean(filters.q.trim()),
    Boolean(filters.category),
    Boolean(filters.city),
    filters.price !== DEFAULT_EVENT_FILTERS.price,
    filters.time !== DEFAULT_EVENT_FILTERS.time,
    filters.sort !== DEFAULT_EVENT_FILTERS.sort,
  ].filter(Boolean).length;
}
