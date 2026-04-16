const SESSION_STORAGE_KEY = "quickseat-session"

function emptySession() {
  return { user: null, token: "" }
}

function parseStoredSession() {
  const rawSession = window.localStorage.getItem(SESSION_STORAGE_KEY)

  if (!rawSession) {
    return null
  }

  try {
    const parsedSession = JSON.parse(rawSession)

    return {
      user: parsedSession?.user ?? null,
      token: parsedSession?.token ?? "",
    }
  } catch {
    window.localStorage.removeItem(SESSION_STORAGE_KEY)
    return null
  }
}

export function readStoredSession() {
  if (typeof window === "undefined") {
    return emptySession()
  }

  return parseStoredSession() || emptySession()
}

export function persistSession(session) {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
}

export function clearStoredSession() {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.removeItem(SESSION_STORAGE_KEY)
}
