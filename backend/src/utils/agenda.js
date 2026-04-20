const MAX_TRACKS = 10;
const MAX_SESSIONS = 50;
const DEFAULT_TIMEZONE = "Europe/Paris";

function parseJsonIfString(value, fieldName) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

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
}

export function isValidTimezone(timezone) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function normalizeTimezone(timezone) {
  const value = String(timezone || DEFAULT_TIMEZONE).trim();
  return isValidTimezone(value) ? value : null;
}

function normalizeDate(value, fieldName) {
  const parsed = new Date(value);

  if (!value || Number.isNaN(parsed.getTime())) {
    const error = new Error(`${fieldName} must be a valid date`);
    error.statusCode = 400;
    throw error;
  }

  return parsed;
}

function validateSameTrackOverlap(sessions) {
  const sortedSessions = sessions
    .slice()
    .sort((first, second) => first.starts_at.getTime() - second.starts_at.getTime());

  for (let index = 1; index < sortedSessions.length; index += 1) {
    const previousSession = sortedSessions[index - 1];
    const currentSession = sortedSessions[index];

    if (currentSession.starts_at < previousSession.ends_at) {
      const error = new Error("Sessions in the same track cannot overlap");
      error.statusCode = 400;
      throw error;
    }
  }
}

export function parseEventAgenda({
  rawAgendaTracks,
  eventDate,
  eventEndDate = null,
}) {
  const parsedTracks = parseJsonIfString(rawAgendaTracks, "agenda_tracks");

  if (parsedTracks === undefined) {
    return undefined;
  }

  if (!Array.isArray(parsedTracks)) {
    const error = new Error("agenda_tracks must be an array");
    error.statusCode = 400;
    throw error;
  }

  if (parsedTracks.length > MAX_TRACKS) {
    const error = new Error("Event agenda can have a maximum of 10 tracks");
    error.statusCode = 400;
    throw error;
  }

  const eventStart = normalizeDate(eventDate, "event_date");
  const eventEnd = eventEndDate ? normalizeDate(eventEndDate, "event_end_date") : null;

  if (eventEnd && eventEnd <= eventStart) {
    const error = new Error("Event end date must be after event start date");
    error.statusCode = 400;
    throw error;
  }

  let totalSessions = 0;

  const tracks = parsedTracks.map((track, trackIndex) => {
    const name = String(track?.name || "").trim();

    if (!name) {
      const error = new Error("Agenda track name is required");
      error.statusCode = 400;
      throw error;
    }

    const rawSessions = Array.isArray(track.sessions) ? track.sessions : [];
    totalSessions += rawSessions.length;

    const sessions = rawSessions.map((session, sessionIndex) => {
      const title = String(session?.title || "").trim();

      if (!title || !session?.starts_at || !session?.ends_at) {
        const error = new Error("Session title, starts_at, and ends_at are required");
        error.statusCode = 400;
        throw error;
      }

      const startsAt = normalizeDate(session.starts_at, "session starts_at");
      const endsAt = normalizeDate(session.ends_at, "session ends_at");

      if (endsAt <= startsAt) {
        const error = new Error("Session end time must be after start time");
        error.statusCode = 400;
        throw error;
      }

      if (startsAt < eventStart) {
        const error = new Error("Sessions must start on or after the event start date");
        error.statusCode = 400;
        throw error;
      }

      if (eventEnd && endsAt > eventEnd) {
        const error = new Error("Sessions must end on or before the event end date");
        error.statusCode = 400;
        throw error;
      }

      return {
        id: session.id || null,
        title,
        description: session.description ? String(session.description).trim() : null,
        speaker_name: session.speaker_name ? String(session.speaker_name).trim() : null,
        location: session.location ? String(session.location).trim() : null,
        starts_at: startsAt,
        ends_at: endsAt,
        sort_order: Number.isNaN(Number(session.sort_order))
          ? sessionIndex
          : Number(session.sort_order),
      };
    });

    validateSameTrackOverlap(sessions);

    return {
      id: track.id || null,
      name,
      description: track.description ? String(track.description).trim() : null,
      sort_order: Number.isNaN(Number(track.sort_order))
        ? trackIndex
        : Number(track.sort_order),
      sessions,
    };
  });

  if (totalSessions > MAX_SESSIONS) {
    const error = new Error("Event agenda can have a maximum of 50 sessions");
    error.statusCode = 400;
    throw error;
  }

  return tracks;
}

export function formatAgendaTrack(track) {
  return {
    id: track.id,
    event_id: track.event_id,
    name: track.name,
    description: track.description,
    sort_order: Number(track.sort_order || 0),
    created_at: track.created_at,
    sessions: (track.sessions || [])
      .slice()
      .sort((first, second) => {
        const timeDiff = new Date(first.starts_at).getTime() - new Date(second.starts_at).getTime();
        return timeDiff || Number(first.sort_order || 0) - Number(second.sort_order || 0);
      })
      .map((session) => ({
        id: session.id,
        event_id: session.event_id,
        track_id: session.track_id,
        title: session.title,
        description: session.description,
        speaker_name: session.speaker_name,
        location: session.location,
        starts_at: session.starts_at,
        ends_at: session.ends_at,
        sort_order: Number(session.sort_order || 0),
        created_at: session.created_at,
      })),
  };
}
