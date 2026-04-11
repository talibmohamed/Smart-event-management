export const FRANCE_MAP_CENTER = [46.7111, 1.7191];

export function parseEventCoordinate(value) {
  const coordinate = Number(value);

  if (!Number.isFinite(coordinate)) {
    return null;
  }

  return coordinate;
}

export function getEventCoordinates(event) {
  const latitude = parseEventCoordinate(event.latitude);
  const longitude = parseEventCoordinate(event.longitude);

  if (
    latitude === null ||
    longitude === null ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return { latitude, longitude };
}

export function getMappableEvents(events) {
  return events
    .map((event) => {
      const coordinates = getEventCoordinates(event);

      if (!coordinates) {
        return null;
      }

      return {
        event,
        ...coordinates,
      };
    })
    .filter(Boolean);
}
