import { Button, Chip } from "@heroui/react";
import { ChevronDown, ChevronUp, ListFilter, MapPinned } from "lucide-react";
import { useRef, useState } from "react";
import EventCard from "./EventCard";
import EventMap from "./EventMap";

const SHEET_TRANSLATES = {
  peek: "calc(100% - 5rem)",
  half: "42%",
  full: "6%",
};

const NEXT_SNAP_UP = {
  peek: "half",
  half: "full",
  full: "full",
};

const NEXT_SNAP_DOWN = {
  peek: "peek",
  half: "peek",
  full: "half",
};

function getResultLabel(count) {
  return count === 1 ? "1 event" : `${count} events`;
}

export default function MobileEventsMapSheet({
  displayedEvents,
  filteredEvents,
  selectedEventId,
  mappableCount,
  activeFilterCount,
  isMapAreaPrioritized,
  mapAreaEventCount,
  onSelectEvent,
  onViewportEventIdsChange,
  onClearMapPriority,
}) {
  const [sheetSnap, setSheetSnap] = useState("half");
  const [dragOffset, setDragOffset] = useState(0);
  const [focusedMapEventId, setFocusedMapEventId] = useState("");
  const dragStartYRef = useRef(null);
  const hasDraggedRef = useRef(false);
  const eventCardRefs = useRef({});

  function scrollToEventCard(eventId) {
    window.requestAnimationFrame(() => {
      eventCardRefs.current[eventId]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }

  function handleMarkerSelect(eventId) {
    setSheetSnap("half");
    setFocusedMapEventId("");
    onSelectEvent(eventId);
    scrollToEventCard(eventId);
  }

  function handleCardSelect(eventId) {
    setFocusedMapEventId(eventId);
    onSelectEvent(eventId);
  }

  function handleCardHover(eventId) {
    onSelectEvent(eventId);
  }

  function handleHandlePress() {
    if (hasDraggedRef.current) {
      hasDraggedRef.current = false;
      return;
    }

    setSheetSnap((currentSnap) => (currentSnap === "full" ? "half" : "full"));
  }

  function handlePointerDown(event) {
    dragStartYRef.current = event.clientY;
    hasDraggedRef.current = false;
    setDragOffset(0);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handlePointerMove(event) {
    if (dragStartYRef.current === null) {
      return;
    }

    const nextOffset = event.clientY - dragStartYRef.current;
    if (Math.abs(nextOffset) > 8) {
      hasDraggedRef.current = true;
    }

    setDragOffset(Math.max(-160, Math.min(220, nextOffset)));
  }

  function handlePointerEnd() {
    if (dragStartYRef.current === null) {
      return;
    }

    const nextOffset = dragOffset;
    dragStartYRef.current = null;
    setDragOffset(0);

    if (nextOffset < -56) {
      setSheetSnap((currentSnap) => NEXT_SNAP_UP[currentSnap]);
      return;
    }

    if (nextOffset > 56) {
      setSheetSnap((currentSnap) => NEXT_SNAP_DOWN[currentSnap]);
    }
  }

  const sheetTransform = `translateY(calc(${SHEET_TRANSLATES[sheetSnap]} + ${dragOffset}px))`;

  return (
    <div className="relative h-[calc(100svh-8.5rem)] min-h-[34rem] overflow-hidden rounded-[1.75rem] border border-zinc-200/80 bg-zinc-100 dark:border-white/10 dark:bg-zinc-950 lg:hidden">
      <EventMap
        events={filteredEvents}
        selectedEventId={selectedEventId}
        focusEventId={focusedMapEventId}
        onSelectEvent={handleMarkerSelect}
        onViewportEventIdsChange={onViewportEventIdsChange}
        className="absolute inset-0 h-full rounded-none border-0 shadow-none"
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] flex justify-center px-4 pt-4">
        <div className="pointer-events-auto flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full border border-zinc-200/80 bg-white/90 px-4 py-2 text-xs font-semibold text-zinc-700 shadow-lg shadow-zinc-900/10 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/80 dark:text-zinc-200">
          <MapPinned size={14} />
          <span className="truncate">{getResultLabel(displayedEvents.length)} in this view</span>
        </div>
      </div>

      <section
        className={`absolute inset-x-0 bottom-0 z-[600] h-[88%] rounded-t-[2rem] border border-zinc-200/80 bg-white shadow-[0_-20px_60px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-zinc-950 dark:shadow-black/40 ${
          dragStartYRef.current === null ? "transition-transform duration-300 ease-out" : ""
        }`}
        style={{ transform: sheetTransform }}
      >
        <div
          role="button"
          tabIndex={0}
          aria-label="Drag events panel"
          className="touch-none px-5 pb-3 pt-3"
          onClick={handleHandlePress}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              handleHandlePress();
            }
          }}
        >
          <div className="mx-auto h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-white/20" />
        </div>

        <div className="flex h-[calc(100%-2.25rem)] flex-col">
          <div className="border-b border-zinc-200/80 px-5 pb-4 dark:border-white/10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-[-0.03em] text-zinc-950 dark:text-white">
                  {getResultLabel(displayedEvents.length)}
                </h2>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Pull up for events, pull down for the map.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  isIconOnly
                  size="sm"
                  radius="full"
                  variant="light"
                  aria-label={sheetSnap === "full" ? "Show less events" : "Show more events"}
                  onPress={() => setSheetSnap((currentSnap) => NEXT_SNAP_UP[currentSnap])}
                >
                  <ChevronUp size={16} />
                </Button>
                <Button
                  isIconOnly
                  size="sm"
                  radius="full"
                  variant="light"
                  aria-label="Show map"
                  onPress={() => setSheetSnap("peek")}
                >
                  <ChevronDown size={16} />
                </Button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Chip
                variant="flat"
                className="border border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-white/10 dark:bg-white/10 dark:text-zinc-200"
              >
                {mappableCount} on map
              </Chip>
              {activeFilterCount > 0 ? (
                <Chip
                  variant="flat"
                  className="border border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-white/10 dark:bg-white/10 dark:text-zinc-200"
                >
                  <ListFilter size={13} />
                  {activeFilterCount} active
                </Chip>
              ) : null}
              {mapAreaEventCount !== null ? (
                <Chip
                  variant="flat"
                  className="border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200"
                >
                  {mapAreaEventCount} prioritized
                </Chip>
              ) : null}
              {isMapAreaPrioritized ? (
                <Button
                  size="sm"
                  radius="full"
                  variant="bordered"
                  onPress={onClearMapPriority}
                  className="h-8 border-zinc-200 bg-white/80 text-xs font-semibold text-zinc-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-200"
                >
                  Reset map
                </Button>
              ) : null}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-28 pt-4">
            <div className="grid gap-4">
              {displayedEvents.map((event) => (
                <div
                  key={event.id}
                  ref={(node) => {
                    if (node) {
                      eventCardRefs.current[event.id] = node;
                    } else {
                      delete eventCardRefs.current[event.id];
                    }
                  }}
                >
                  <EventCard
                    event={event}
                    isSelected={event.id === selectedEventId}
                    onSelect={handleCardSelect}
                    onHover={handleCardHover}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
