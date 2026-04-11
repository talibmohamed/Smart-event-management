const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

const geocodeCache = new Map();

const normalize = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

function getNominatimUserAgent() {
  return (
    process.env.NOMINATIM_USER_AGENT ||
    "SmartEventManagementUniversityProject/1.0 (student project)"
  );
}

export async function geocodeFrenchAddress({ address, city }) {
  const normalizedAddress = String(address || "").trim();
  const normalizedCity = String(city || "").trim();
  const cacheKey = normalize(`${normalizedAddress}|${normalizedCity}|france`);

  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }

  const query = `${normalizedAddress}, ${normalizedCity}, France`;
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "fr");

  if (process.env.NOMINATIM_EMAIL) {
    url.searchParams.set("email", process.env.NOMINATIM_EMAIL);
  }

  let response;

  try {
    response = await fetch(url, {
      headers: {
        "User-Agent": getNominatimUserAgent(),
        Accept: "application/json"
      }
    });
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  let results;

  try {
    results = await response.json();
  } catch {
    return null;
  }

  const firstResult = results[0];

  if (!firstResult?.lat || !firstResult?.lon) {
    return null;
  }

  const coordinates = {
    latitude: Number(firstResult.lat),
    longitude: Number(firstResult.lon)
  };

  if (
    Number.isNaN(coordinates.latitude) ||
    Number.isNaN(coordinates.longitude)
  ) {
    return null;
  }

  geocodeCache.set(cacheKey, coordinates);

  return coordinates;
}
