import { Button, Card, CardBody, Input } from "@heroui/react"
import { useEffect, useState } from "react"
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { extractApiErrorMessage } from "../services/api"
import { getPostAuthPath } from "../services/authService"

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isAuthenticated, isBootstrapping, user } = useAuth()
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    if (!isBootstrapping && isAuthenticated) {
      navigate(getPostAuthPath(user?.role), { replace: true })
    }
  }, [isAuthenticated, isBootstrapping, navigate, user])

  function handleChange(field) {
    return (event) => {
      setFormData((currentData) => ({
        ...currentData,
        [field]: event.target.value,
      }))
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage("")
    setIsSubmitting(true)

    try {
      const authenticatedUser = await login({
        email: formData.email.trim(),
        password: formData.password,
      })

      navigate(location.state?.from || getPostAuthPath(authenticatedUser?.role), {
        replace: true,
      })
    } catch (error) {
      setErrorMessage(extractApiErrorMessage(error, "Unable to sign in with those credentials."))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex justify-center px-6 py-12 md:py-16">
      <Card className="w-full max-w-md border border-slate-200/80 bg-white/90 shadow-xl shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-black/20">
        <CardBody className="gap-5 p-6 md:p-8">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Welcome back</p>
            <h1 className="text-2xl font-bold">Login to your account</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Access your bookings, dashboards, and event management tools.
            </p>
          </div>

          {errorMessage ? (
            <div className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {errorMessage}
            </div>
          ) : null}

          <form className="grid gap-4" onSubmit={handleSubmit}>
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={handleChange("email")}
              autoComplete="email"
              isRequired
            />
            <Input
              label="Password"
              type="password"
              value={formData.password}
              onChange={handleChange("password")}
              autoComplete="current-password"
              isRequired
            />
            <Button color="primary" type="submit" isLoading={isSubmitting} className="mt-2">
              Login
            </Button>
          </form>

          <p className="text-sm text-slate-600 dark:text-slate-400">
            Don&apos;t have an account?{" "}
            <RouterLink to="/register" className="font-semibold text-primary">
              Create one
            </RouterLink>
          </p>
        </CardBody>
      </Card>
    </div>
  )
}
