import { createContext, useContext, useEffect, useState } from "react"
import authService from "../services/authService"
import { clearStoredSession, persistSession, readStoredSession } from "../services/authStorage"

const AuthContext = createContext(null)

function applySessionState(session, setUser, setToken) {
  persistSession(session)
  setUser(session.user)
  setToken(session.token)
}

function resetSessionState(setUser, setToken) {
  clearStoredSession()
  setUser(null)
  setToken("")
}

export function AuthProvider({ children }) {
  const initialSession = readStoredSession()
  const [user, setUser] = useState(initialSession.user)
  const [token, setToken] = useState(initialSession.token)
  const [isBootstrapping, setIsBootstrapping] = useState(Boolean(initialSession.token))

  useEffect(() => {
    let ignore = false
    const storedSession = readStoredSession()

    if (!storedSession.token) {
      setIsBootstrapping(false)
      return () => {
        ignore = true
      }
    }

    authService
      .getProfile()
      .then((response) => {
        if (ignore) {
          return
        }

        applySessionState(
          {
            user: response.data.data,
            token: storedSession.token,
          },
          setUser,
          setToken,
        )
      })
      .catch((error) => {
        if (ignore) {
          return
        }

        if (error?.response?.status === 401) {
          resetSessionState(setUser, setToken)
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsBootstrapping(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    function handleStorageChange(event) {
      if (event.key !== "quickseat-session") {
        return
      }

      const storedSession = readStoredSession()
      setUser(storedSession.user)
      setToken(storedSession.token)
    }

    window.addEventListener("storage", handleStorageChange)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [])

  async function login(credentials) {
    const response = await authService.login(credentials)
    const session = response.data.data
    applySessionState(session, setUser, setToken)
    return session.user
  }

  async function register(payload) {
    const response = await authService.register(payload)
    const session = response.data.data
    applySessionState(session, setUser, setToken)
    return session.user
  }

  function logout() {
    resetSessionState(setUser, setToken)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user && token),
        isBootstrapping,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }

  return context
}
