const INTEGER_PATTERN = /^\d+$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}(?:T.+)?$/;
const DECIMAL_PATTERN = /^(?:\d+|\d+\.\d+|\.\d+)$/;

function createValidationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function parsePositiveInteger(rawValue, { name, defaultValue, min = 1, max = Number.MAX_SAFE_INTEGER }) {
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return defaultValue;
  }

  if (typeof rawValue !== "string" || !INTEGER_PATTERN.test(rawValue)) {
    throw createValidationError(`${name} must be an integer`);
  }

  const parsedValue = Number(rawValue);

  if (parsedValue < min) {
    throw createValidationError(`${name} must be greater than or equal to ${min}`);
  }

  if (parsedValue > max) {
    throw createValidationError(`${name} must be less than or equal to ${max}`);
  }

  return parsedValue;
}

export function parsePaginationQuery(rawQuery = {}, {
  defaultPage = 1,
  defaultPageSize = 20,
  maxPageSize = 50,
  defaultSort,
  sortMap,
} = {}) {
  if (!sortMap || !defaultSort || !sortMap[defaultSort]) {
    throw new Error("parsePaginationQuery requires sortMap and defaultSort");
  }

  const page = parsePositiveInteger(rawQuery.page, {
    name: "page",
    defaultValue: defaultPage,
    min: 1,
  });
  const pageSize = parsePositiveInteger(rawQuery.pageSize, {
    name: "pageSize",
    defaultValue: defaultPageSize,
    min: 1,
    max: maxPageSize,
  });

  const sort = rawQuery.sort === undefined || rawQuery.sort === null || rawQuery.sort === ""
    ? defaultSort
    : rawQuery.sort;

  if (typeof sort !== "string" || !sortMap[sort]) {
    throw createValidationError(
      `sort must be one of: ${Object.keys(sortMap).join(", ")}`
    );
  }

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
    sort,
    orderBy: sortMap[sort],
  };
}

export function parseIsoDateQueryValue(rawValue, name) {
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return null;
  }

  if (typeof rawValue !== "string") {
    throw createValidationError(`${name} must be a valid ISO date`);
  }

  if (!ISO_DATE_PATTERN.test(rawValue)) {
    throw createValidationError(`${name} must be a valid ISO date`);
  }

  const parsedDate = new Date(rawValue);

  if (Number.isNaN(parsedDate.getTime())) {
    throw createValidationError(`${name} must be a valid ISO date`);
  }

  return parsedDate;
}

export function parseNonNegativeNumberQueryValue(rawValue, name) {
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return null;
  }

  if (typeof rawValue !== "string" || !DECIMAL_PATTERN.test(rawValue)) {
    throw createValidationError(`${name} must be a non-negative number`);
  }

  const parsedValue = Number(rawValue);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    throw createValidationError(`${name} must be a non-negative number`);
  }

  return parsedValue;
}

export { createValidationError };
