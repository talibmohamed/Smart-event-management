import L from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import { Link as RouterLink } from "react-router-dom";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { formatEventDate, formatEventPriceRange } from "../../utils/eventUtils";
import { FRANCE_MAP_CENTER, getMappableEvents } from "../../utils/mapHelpers";

function isValidLatLng(latitude, longitude) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function getSafeZoom(map, minimumZoom = 13) {
  const currentZoom = Number(map.getZoom());

  if (!Number.isFinite(currentZoom)) {
    return minimumZoom;
  }

  return Math.max(currentZoom, minimumZoom);
}

function createMarkerIcon(isSelected) {
  const html = isSelected
    ? `
      <div class="relative flex h-10 w-10 items-center justify-center">
        <span class="absolute inline-flex h-10 w-10 animate-ping rounded-full bg-sky-400/45"></span>
        <span class="absolute inline-flex h-10 w-10 rounded-full bg-sky-400/20"></span>
        <span class="relative inline-flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-white bg-linear-to-br from-sky-500 via-indigo-500 to-violet-600 shadow-[0_10px_30px_rgba(56,189,248,0.45)]">
          <span class="h-2.5 w-2.5 rounded-full bg-white shadow-inner"></span>
        </span>
      </div>
    `
    : `
      <div class="group flex h-9 w-9 items-center justify-center">
        <span class="inline-flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-white bg-linear-to-br from-sky-500 to-sky-700 shadow-[0_8px_22px_rgba(2,132,199,0.35)] transition-transform duration-200 ease-out hover:scale-110">
          <span class="h-2 w-2 rounded-full bg-white"></span>
        </span>
      </div>
    `;

  return L.divIcon({
    className: "",
    html,
    iconSize: isSelected ? [40, 40] : [36, 36],
    iconAnchor: isSelected ? [20, 20] : [18, 18],
    popupAnchor: [0, -18],
  });
}

function MapController({ mappableEvents, focusEventId }) {
  const map = useMap();

  useEffect(() => {
    window.requestAnimationFrame(() => {
      try {
        map.invalidateSize();
      } catch {
        // Ignore transient Leaflet state while responsive containers are changing size.
      }
    });
  }, [map, mappableEvents.length]);

  useEffect(() => {
    if (focusEventId) {
      return;
    }

    try {
      if (mappableEvents.length === 1) {
        const [marker] = mappableEvents;
        if (isValidLatLng(marker.latitude, marker.longitude)) {
          map.setView([marker.latitude, marker.longitude], 12);
        }
        return;
      }

      const validMarkers = mappableEvents.filter(({ latitude, longitude }) =>
        isValidLatLng(latitude, longitude),
      );

      if (validMarkers.length > 1) {
        const bounds = L.latLngBounds(
          validMarkers.map(({ latitude, longitude }) => [latitude, longitude]),
        );

        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [36, 36], maxZoom: 12 });
        }
      }
    } catch {
      // Leaflet can briefly report invalid internal map state during responsive layout changes.
    }
  }, [map, mappableEvents, focusEventId]);

  useEffect(() => {
    if (!focusEventId) {
      return undefined;
    }

    const selectedMarker = mappableEvents.find(
      ({ event, latitude, longitude }) =>
        String(event.id) === String(focusEventId) && isValidLatLng(latitude, longitude),
    );

    if (!selectedMarker) {
      return undefined;
    }

    const targetLatLng = L.latLng(selectedMarker.latitude, selectedMarker.longitude);
    const currentZoom = map.getZoom();
    const targetZoom = getSafeZoom(map, 13);
    const targetInView = map.getBounds().pad(-0.15).contains(targetLatLng);

    let cancelled = false;

    try {
      map.stop();
    } catch {
      // Ignore transient Leaflet state while responsive containers are changing size.
    }

    if (targetInView) {
      try {
        map.flyTo(targetLatLng, Math.max(currentZoom, 12), { duration: 0.6 });
      } catch {
        // Ignore transient Leaflet state while responsive containers are changing size.
      }
      return undefined;
    }

    const outZoom = Math.max(Math.min(currentZoom - 3, 7), 4);

    try {
      map.flyTo(map.getCenter(), outZoom, { duration: 0.45 });
    } catch {
      // Ignore transient Leaflet state while responsive containers are changing size.
    }

    const timeoutId = window.setTimeout(() => {
      if (cancelled) {
        return;
      }
      try {
        map.flyTo(targetLatLng, targetZoom, { duration: 0.75 });
      } catch {
        // Ignore transient Leaflet state while responsive containers are changing size.
      }
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [map, mappableEvents, focusEventId]);

  return null;
}

function MapViewportReporter({ mappableEvents, onViewportEventIdsChange }) {
  const map = useMap();
  const isUserMapInteractionRef = useRef(false);

  useEffect(() => {
    if (!onViewportEventIdsChange) {
      return undefined;
    }

    const mapContainer = map.getContainer();

    function markUserInteraction() {
      isUserMapInteractionRef.current = true;
    }

    function reportVisibleEvents() {
      if (!isUserMapInteractionRef.current) {
        return;
      }

      isUserMapInteractionRef.current = false;

      const bounds = map.getBounds();
      const visibleEventIds = mappableEvents
        .filter(
          ({ latitude, longitude }) =>
            isValidLatLng(latitude, longitude) && bounds.contains([latitude, longitude]),
        )
        .map(({ event }) => String(event.id));

      onViewportEventIdsChange(visibleEventIds);
    }

    map.on("dragstart", markUserInteraction);
    map.on("zoomstart", markUserInteraction);
    map.on("moveend", reportVisibleEvents);
    map.on("zoomend", reportVisibleEvents);
    mapContainer.addEventListener("mousedown", markUserInteraction);
    mapContainer.addEventListener("touchstart", markUserInteraction, { passive: true });

    return () => {
      map.off("dragstart", markUserInteraction);
      map.off("zoomstart", markUserInteraction);
      map.off("moveend", reportVisibleEvents);
      map.off("zoomend", reportVisibleEvents);
      mapContainer.removeEventListener("mousedown", markUserInteraction);
      mapContainer.removeEventListener("touchstart", markUserInteraction);
    };
  }, [map, mappableEvents, onViewportEventIdsChange]);

  return null;
}

export default function EventMap({
  events,
  selectedEventId,
  focusEventId = "",
  onSelectEvent,
  onHoverEvent,
  onViewportEventIdsChange,
  className = "",
}) {
  const mappableEvents = useMemo(() => getMappableEvents(events), [events]);

  if (events.length > 0 && mappableEvents.length === 0) {
    return (
      <div
        className={`flex h-full min-h-0 w-full items-center justify-center rounded-card border border-dashed border-zinc-300 bg-white/82 p-6 text-center dark:border-white/10 dark:bg-white/[0.04] ${className}`}
      >
        <div>
          <p className="text-lg font-semibold tracking-[-0.03em] text-zinc-950 dark:text-white">
            No map coordinates yet
          </p>
          <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            These filtered events do not include valid latitude and longitude values.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative h-full min-h-0 w-full overflow-hidden rounded-card border border-zinc-200/80 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/[0.04] ${className}`}
    >
      <div className="h-full min-h-0 w-full">
        <MapContainer
          center={FRANCE_MAP_CENTER}
          zoom={6}
          scrollWheelZoom={false}
          className="h-full min-h-0 w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapController mappableEvents={mappableEvents} focusEventId={focusEventId} />
          <MapViewportReporter
            mappableEvents={mappableEvents}
            onViewportEventIdsChange={onViewportEventIdsChange}
          />

          {mappableEvents.map(({ event, latitude, longitude }) => {
            if (!isValidLatLng(latitude, longitude)) {
              return null;
            }

            const isSelected = String(event.id) === String(selectedEventId);

            return (
              <Marker
                key={event.id}
                position={[latitude, longitude]}
                icon={createMarkerIcon(isSelected)}
                eventHandlers={{
                  click: () => onSelectEvent(event.id),
                  mouseover: () => onHoverEvent?.(event.id),
                }}
              >
                <Popup>
                  <div className="min-w-60 space-y-2.5 p-3">
                    <span className="inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-sky-700 dark:bg-sky-500/15 dark:text-sky-200">
                      {event.category || "Event"}
                    </span>
                    <p className="text-sm font-semibold leading-snug tracking-tight text-zinc-950 dark:text-white">
                      {event.title}
                    </p>
                    {event.event_date ? (
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">
                        {formatEventDate(event.event_date)}
                      </p>
                    ) : null}
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      {event.city || "City not available"}
                    </p>
                    <div className="flex items-center justify-between gap-2 border-t border-zinc-200 pt-2.5 dark:border-white/10">
                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        {formatEventPriceRange(event)}
                      </span>
                      <RouterLink
                        to={`/events/${event.id}`}
                        className="inline-flex items-center gap-1 rounded-full bg-zinc-950 px-3 py-1.5 text-[0.7rem] font-semibold text-white no-underline transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                      >
                        View
                      </RouterLink>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
