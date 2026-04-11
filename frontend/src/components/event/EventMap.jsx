import L from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import { Link as RouterLink } from "react-router-dom";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { formatEventPrice } from "../../utils/eventUtils";
import { FRANCE_MAP_CENTER, getMappableEvents } from "../../utils/mapHelpers";

function createMarkerIcon(isSelected) {
  return L.divIcon({
    className: "",
    html: `
      <div class="${
        isSelected
          ? "h-9 w-9 rounded-full border-[3px] border-white bg-zinc-950 shadow-xl shadow-zinc-950/30 ring-4 ring-sky-400/35"
          : "h-8 w-8 rounded-full border-[3px] border-white bg-sky-600 shadow-lg shadow-sky-900/25"
      } flex items-center justify-center">
        <div class="h-2.5 w-2.5 rounded-full bg-white"></div>
      </div>
    `,
    iconSize: isSelected ? [36, 36] : [32, 32],
    iconAnchor: isSelected ? [18, 18] : [16, 16],
    popupAnchor: [0, -18],
  });
}

function MapController({ mappableEvents, selectedEventId }) {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();
  }, [map, mappableEvents.length]);

  useEffect(() => {
    const selectedMarker = mappableEvents.find(({ event }) => event.id === selectedEventId);

    if (selectedMarker) {
      map.flyTo([selectedMarker.latitude, selectedMarker.longitude], Math.max(map.getZoom(), 13), {
        duration: 0.45,
      });
      return;
    }

    if (mappableEvents.length === 1) {
      const [marker] = mappableEvents;
      map.setView([marker.latitude, marker.longitude], 12);
      return;
    }

    if (mappableEvents.length > 1) {
      const bounds = L.latLngBounds(
        mappableEvents.map(({ latitude, longitude }) => [latitude, longitude]),
      );
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 12 });
    }
  }, [map, mappableEvents, selectedEventId]);

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
        .filter(({ latitude, longitude }) => bounds.contains([latitude, longitude]))
        .map(({ event }) => String(event.id));

      onViewportEventIdsChange(visibleEventIds);
    }

    map.on("dragstart", markUserInteraction);
    map.on("zoomstart", markUserInteraction);
    map.on("moveend", reportVisibleEvents);
    map.on("zoomend", reportVisibleEvents);
    mapContainer.addEventListener("wheel", markUserInteraction, { passive: true });
    mapContainer.addEventListener("mousedown", markUserInteraction);
    mapContainer.addEventListener("touchstart", markUserInteraction, { passive: true });

    return () => {
      map.off("dragstart", markUserInteraction);
      map.off("zoomstart", markUserInteraction);
      map.off("moveend", reportVisibleEvents);
      map.off("zoomend", reportVisibleEvents);
      mapContainer.removeEventListener("wheel", markUserInteraction);
      mapContainer.removeEventListener("mousedown", markUserInteraction);
      mapContainer.removeEventListener("touchstart", markUserInteraction);
    };
  }, [map, mappableEvents, onViewportEventIdsChange]);

  return null;
}

export default function EventMap({
  events,
  selectedEventId,
  onSelectEvent,
  onViewportEventIdsChange,
  className = "",
}) {
  const mappableEvents = useMemo(() => getMappableEvents(events), [events]);

  if (events.length > 0 && mappableEvents.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-[1.75rem] border border-dashed border-zinc-300 bg-white/82 p-6 text-center dark:border-white/10 dark:bg-white/[0.04] ${className}`}
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
      className={`overflow-hidden rounded-[1.75rem] border border-zinc-200/80 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/[0.04] ${className}`}
    >
      <MapContainer
        center={FRANCE_MAP_CENTER}
        zoom={6}
        scrollWheelZoom
        className="h-full min-h-[24rem] w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController mappableEvents={mappableEvents} selectedEventId={selectedEventId} />
        <MapViewportReporter
          mappableEvents={mappableEvents}
          onViewportEventIdsChange={onViewportEventIdsChange}
        />

        {mappableEvents.map(({ event, latitude, longitude }) => {
          const isSelected = event.id === selectedEventId;

          return (
            <Marker
              key={event.id}
              position={[latitude, longitude]}
              icon={createMarkerIcon(isSelected)}
              eventHandlers={{
                click: () => onSelectEvent(event.id),
              }}
            >
              <Popup>
                <div className="min-w-44 space-y-2">
                  <p className="text-sm font-semibold text-zinc-950">{event.title}</p>
                  <p className="text-xs text-zinc-600">{event.city || "City not available"}</p>
                  <p className="text-xs font-medium text-zinc-900">
                    {formatEventPrice(event.price)}
                  </p>
                  <RouterLink
                    to={`/events/${event.id}`}
                    className="inline-flex text-xs font-semibold text-sky-700 hover:text-sky-900"
                  >
                    View details
                  </RouterLink>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
