export const DEFAULT_EVENT_FILTERS = {
  q: "",
  category: "",
  city: "",
  priceMin: "",
  priceMax: "",
  time: "all",
  sort: "date_asc",
};

export const TIME_FILTER_OPTIONS = [
  { value: "all", label: "All times" },
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
];

export const SORT_OPTIONS = [
  { value: "date_asc", label: "Soonest" },
  { value: "date_desc", label: "Latest" },
  { value: "title_asc", label: "Title A-Z" },
  { value: "title_desc", label: "Title Z-A" },
  { value: "price_asc", label: "Price low to high" },
  { value: "price_desc", label: "Price high to low" },
];

const VALID_TIME_FILTERS = new Set(TIME_FILTER_OPTIONS.map((option) => option.value));
const VALID_SORT_OPTIONS = new Set(SORT_OPTIONS.map((option) => option.value));

function buildCurrentIsoTimestamp() {
  return new Date().toISOString();
}

export function parseEventFilterParams(searchParams) {
  return sanitizeEventFilters({
    q: searchParams.get("q") || DEFAULT_EVENT_FILTERS.q,
    category: searchParams.get("category") || DEFAULT_EVENT_FILTERS.category,
    city: searchParams.get("city") || DEFAULT_EVENT_FILTERS.city,
    priceMin: searchParams.get("priceMin") || DEFAULT_EVENT_FILTERS.priceMin,
    priceMax: searchParams.get("priceMax") || DEFAULT_EVENT_FILTERS.priceMax,
    time: searchParams.get("time") || DEFAULT_EVENT_FILTERS.time,
    sort: searchParams.get("sort") || DEFAULT_EVENT_FILTERS.sort,
  });
}

export function sanitizeEventFilters(filters = {}) {
  return {
    q: typeof filters.q === "string" ? filters.q : DEFAULT_EVENT_FILTERS.q,
    category:
      typeof filters.category === "string" ? filters.category : DEFAULT_EVENT_FILTERS.category,
    city: typeof filters.city === "string" ? filters.city : DEFAULT_EVENT_FILTERS.city,
    priceMin: typeof filters.priceMin === "string" ? filters.priceMin : DEFAULT_EVENT_FILTERS.priceMin,
    priceMax: typeof filters.priceMax === "string" ? filters.priceMax : DEFAULT_EVENT_FILTERS.priceMax,
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

  if (filters.priceMin.trim()) {
    params.set("priceMin", filters.priceMin.trim());
  }

  if (filters.priceMax.trim()) {
    params.set("priceMax", filters.priceMax.trim());
  }

  if (filters.time !== DEFAULT_EVENT_FILTERS.time) {
    params.set("time", filters.time);
  }

  if (filters.sort !== DEFAULT_EVENT_FILTERS.sort) {
    params.set("sort", filters.sort);
  }

  return params;
}

export function buildEventListQueryParams(filters, { page = 1, pageSize = 20 } = {}) {
  const params = {
    page,
    pageSize,
    sort: filters.sort,
  };

  if (filters.q.trim()) {
    params.q = filters.q.trim();
  }

  if (filters.category) {
    params.category = filters.category;
  }

  if (filters.city) {
    params.city = filters.city;
  }

  if (filters.priceMin.trim()) {
    params.priceMin = filters.priceMin.trim();
  }

  if (filters.priceMax.trim()) {
    params.priceMax = filters.priceMax.trim();
  }

  if (filters.time === "upcoming") {
    params.dateFrom = buildCurrentIsoTimestamp();
  } else if (filters.time === "past") {
    params.dateTo = buildCurrentIsoTimestamp();
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

export function countActiveEventFilters(filters) {
  return [
    Boolean(filters.q.trim()),
    Boolean(filters.category),
    Boolean(filters.city),
    Boolean(filters.priceMin.trim()),
    Boolean(filters.priceMax.trim()),
    filters.time !== DEFAULT_EVENT_FILTERS.time,
    filters.sort !== DEFAULT_EVENT_FILTERS.sort,
  ].filter(Boolean).length;
}
