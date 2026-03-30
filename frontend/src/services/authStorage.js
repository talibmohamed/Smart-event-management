const SESSION_STORAGE_KEY = "smart-event-session"

export function readStoredSession() {
  if (typeof window === "undefined") {
    return { user: null, token: "" }
  }

  const rawSession = window.localStorage.getItem(SESSION_STORAGE_KEY)

  if (!rawSession) {
    return { user: null, token: "" }
  }

  try {
    const parsedSession = JSON.parse(rawSession)

    return {
      user: parsedSession?.user ?? null,
      token: parsedSession?.token ?? "",
    }
  } catch {
    window.localStorage.removeItem(SESSION_STORAGE_KEY)

    return { user: null, token: "" }
  }
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
