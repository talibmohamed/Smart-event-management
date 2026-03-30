import { Button, Card, CardBody, Input } from "@heroui/react"
import { useEffect, useState } from "react"
import { Link as RouterLink, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { extractApiErrorMessage } from "../services/api"
import { getPostAuthPath, PUBLIC_REGISTRATION_ROLES } from "../services/authService"

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register, isAuthenticated, isBootstrapping, user } = useAuth()
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "attendee",
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

  function handleRoleChange(role) {
    setFormData((currentData) => ({
      ...currentData,
      role,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage("")

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage("Password confirmation does not match.")
      return
    }

    setIsSubmitting(true)

    try {
      const registeredUser = await register({
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role,
      })

      navigate(getPostAuthPath(registeredUser?.role), { replace: true })
    } catch (error) {
      setErrorMessage(extractApiErrorMessage(error, "Unable to create your account right now."))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex justify-center px-6 py-12 md:py-16">
      <Card className="w-full max-w-xl border border-slate-200/80 bg-white/90 shadow-xl shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-black/20">
        <CardBody className="gap-5 p-6 md:p-8">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Create account</p>
            <h1 className="text-2xl font-bold">Start using Smart Event Management</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Register as an attendee to book events or as an organizer to publish them.
            </p>
          </div>

          {errorMessage ? (
            <div className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {errorMessage}
            </div>
          ) : null}

          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="First name"
                value={formData.firstName}
                onChange={handleChange("firstName")}
                autoComplete="given-name"
                isRequired
              />
              <Input
                label="Last name"
                value={formData.lastName}
                onChange={handleChange("lastName")}
                autoComplete="family-name"
                isRequired
              />
            </div>

            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={handleChange("email")}
              autoComplete="email"
              isRequired
            />

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Password"
                type="password"
                value={formData.password}
                onChange={handleChange("password")}
                autoComplete="new-password"
                isRequired
              />
              <Input
                label="Confirm password"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange("confirmPassword")}
                autoComplete="new-password"
                isRequired
              />
            </div>

            <div className="grid gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Account type</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Choose how you want to use the platform.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {PUBLIC_REGISTRATION_ROLES.map((roleOption) => (
                  <button
                    key={roleOption.value}
                    type="button"
                    onClick={() => handleRoleChange(roleOption.value)}
                    className={`rounded-2xl border px-4 py-4 text-left transition ${
                      formData.role === roleOption.value
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-slate-200 bg-white hover:border-primary/40 dark:border-slate-800 dark:bg-slate-950"
                    }`}
                  >
                    <p className="font-semibold">{roleOption.label}</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{roleOption.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <Button color="primary" type="submit" isLoading={isSubmitting} className="mt-2">
              Register
            </Button>
          </form>

          <p className="text-sm text-slate-600 dark:text-slate-400">
            Already have an account?{" "}
            <RouterLink to="/login" className="font-semibold text-primary">
              Log in
            </RouterLink>
          </p>
        </CardBody>
      </Card>
    </div>
  )
}
