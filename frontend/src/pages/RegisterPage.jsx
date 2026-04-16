import { useEffect, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Input, Button, Link } from "@heroui/react";
import logoUrl from "../../logo.svg";
import { useAuth } from "../context/AuthContext";
import { extractApiErrorMessage } from "../services/api";
import { getPostAuthPath, PUBLIC_REGISTRATION_ROLES } from "../services/authService";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isAuthenticated, isBootstrapping, user } = useAuth();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "attendee",
  });
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isBootstrapping && isAuthenticated) {
      navigate(getPostAuthPath(user?.role), { replace: true });
    }
  }, [isAuthenticated, isBootstrapping, navigate, user]);

  function handleChange(field) {
    return (event) => {
      setFormData((currentData) => ({
        ...currentData,
        [field]: event.target.value,
      }));
    };
  }

  function handleRoleChange(role) {
    setFormData((currentData) => ({
      ...currentData,
      role,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");

    if (
      !formData.firstName.trim() ||
      !formData.lastName.trim() ||
      !formData.email.trim() ||
      !formData.password.trim() ||
      !formData.confirmPassword.trim()
    ) {
      setErrorMessage("Please fill in all fields.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage("Password confirmation does not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const registeredUser = await register({
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role,
      });

      navigate(getPostAuthPath(registeredUser?.role), { replace: true });
    } catch (error) {
      setErrorMessage(extractApiErrorMessage(error, "Unable to create your account right now."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[#f6f4ff] text-zinc-700 transition-colors dark:bg-[#0A0A0F] dark:text-zinc-300">
      <div className="pointer-events-none absolute top-[-20%] left-[-10%] h-[70%] w-[70%] rounded-full bg-violet-500/12 blur-[150px] dark:bg-violet-600/10" />
      <div className="pointer-events-none absolute bottom-[-20%] right-[-10%] h-[60%] w-[60%] rounded-full bg-sky-500/12 blur-[150px] dark:bg-blue-600/10" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#0f172a08_1px,transparent_1px),linear-gradient(to_bottom,#0f172a08_1px,transparent_1px)] bg-[size:4rem_4rem] dark:bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)]" />

      <div className="relative z-10 hidden w-1/2 overflow-hidden p-12 lg:flex lg:p-24">
        <div className="relative z-20 flex max-w-lg flex-col justify-center">
          <Link as={RouterLink} to="/" className="mb-16 flex items-center gap-2 text-2xl font-bold tracking-tighter text-zinc-950 dark:text-white">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white p-1 shadow-[0_0_15px_rgba(35,21,56,0.18)]">
              <img src={logoUrl} alt="Quickseat logo" className="h-full w-full object-contain" />
            </div>
            Quickseat.
          </Link>

          <h1 className="mb-6 text-5xl font-extrabold leading-[1.1] tracking-tight text-zinc-950 dark:text-white lg:text-6xl">
            Launch <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-600 bg-clip-text text-transparent">moments</span><br />people come back for.
          </h1>
          <p className="mb-12 max-w-md text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
            Join the platform as an attendee or organizer and start shaping better event experiences from the first click.
          </p>
        </div>

        <div className="absolute right-12 top-1/4 z-10 w-72 -rotate-6 rounded-2xl border border-zinc-900/8 bg-white/55 p-5 shadow-[0_8px_32px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-transform duration-500 hover:-rotate-3 hover:scale-105 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_8px_32px_rgba(139,92,246,0.15)]">
          <div className="mb-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-inner" />
            <div>
              <div className="text-sm font-semibold text-zinc-900 dark:text-white">Creator Summit 2026</div>
              <div className="mt-0.5 text-xs text-violet-600 dark:text-violet-400">Organizer tools &bull; Full access</div>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-zinc-900/6 pt-3 dark:border-white/5">
            <div className="flex -space-x-2">
              <div className="h-6 w-6 rounded-full border border-white bg-zinc-300 dark:border-[#0A0A0F] dark:bg-zinc-700" />
              <div className="h-6 w-6 rounded-full border border-white bg-zinc-400 dark:border-[#0A0A0F] dark:bg-zinc-600" />
              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-white bg-zinc-500 text-[10px] font-medium text-white dark:border-[#0A0A0F]">+21</div>
            </div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Early members</div>
          </div>
        </div>

        <div className="absolute bottom-32 left-1/4 z-20 w-60 rotate-3 rounded-2xl border border-zinc-900/8 bg-white/55 p-5 shadow-[0_8px_32px_rgba(59,130,246,0.1)] backdrop-blur-xl transition-transform duration-500 hover:rotate-6 hover:scale-105 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_8px_32px_rgba(59,130,246,0.15)]">
          <div className="mb-1 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">New Registrations</div>
          <div className="mb-2 text-3xl font-bold text-zinc-950 dark:text-white">1,284</div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-500 dark:text-emerald-400">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            <span>Growing every week</span>
          </div>
        </div>

        <div className="absolute left-1/2 top-32 z-10 flex rotate-12 items-center gap-2.5 rounded-full border border-zinc-900/8 bg-white/60 px-4 py-2 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-black/40">
          <div className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
          </div>
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-900 dark:text-white">Open Registration</span>
        </div>
      </div>

      <div className="relative z-20 flex w-full items-center justify-center p-6 sm:p-12 lg:w-1/2">
        <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-zinc-900/10 bg-white/70 p-8 shadow-[0_0_40px_rgba(15,23,42,0.12),inset_0_0_20px_rgba(255,255,255,0.45)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.02] dark:shadow-[0_0_40px_rgba(0,0,0,0.8),inset_0_0_20px_rgba(255,255,255,0.02)] sm:p-10">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/10 to-violet-500/10 dark:from-blue-500/5 dark:to-violet-500/5" />

          <div className="relative z-10">
            <div className="mb-10 flex items-center gap-2 lg:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white p-1 shadow-[0_0_15px_rgba(35,21,56,0.18)]">
                <img src={logoUrl} alt="Quickseat logo" className="h-full w-full object-contain" />
              </div>
              <span className="text-xl font-bold tracking-tighter text-zinc-950 dark:text-white">Quickseat.</span>
            </div>

            <div className="mb-8 space-y-1.5">
              <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">Create your account</h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Set up your access and choose how you want to use the platform.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {errorMessage ? (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-medium text-red-500 dark:text-red-400">
                  {errorMessage}
                </div>
              ) : null}

              <div className="grid gap-6 md:grid-cols-2">
                <Input
                  isRequired
                  label="First name"
                  labelPlacement="outside"
                  placeholder="Jane"
                  variant="flat"
                  size="lg"
                  value={formData.firstName}
                  onChange={handleChange("firstName")}
                  autoComplete="given-name"
                  classNames={{
                    base: "w-full",
                    label: "font-medium !text-zinc-700 dark:!text-zinc-300",
                    inputWrapper: "h-12 w-full border border-zinc-900/8 bg-white/80 shadow-none hover:bg-white focus-within:!bg-white focus-within:ring-2 focus-within:ring-violet-500/40 dark:border-white/[0.05] dark:bg-white/[0.05] dark:hover:bg-white/[0.08] dark:focus-within:!bg-white/[0.08] dark:focus-within:ring-violet-500/50",
                    input: "!text-zinc-900 placeholder:!text-zinc-400 dark:!text-white dark:placeholder:!text-zinc-500",
                  }}
                />

                <Input
                  isRequired
                  label="Last name"
                  labelPlacement="outside"
                  placeholder="Doe"
                  variant="flat"
                  size="lg"
                  value={formData.lastName}
                  onChange={handleChange("lastName")}
                  autoComplete="family-name"
                  classNames={{
                    base: "w-full",
                    label: "font-medium !text-zinc-700 dark:!text-zinc-300",
                    inputWrapper: "h-12 w-full border border-zinc-900/8 bg-white/80 shadow-none hover:bg-white focus-within:!bg-white focus-within:ring-2 focus-within:ring-violet-500/40 dark:border-white/[0.05] dark:bg-white/[0.05] dark:hover:bg-white/[0.08] dark:focus-within:!bg-white/[0.08] dark:focus-within:ring-violet-500/50",
                    input: "!text-zinc-900 placeholder:!text-zinc-400 dark:!text-white dark:placeholder:!text-zinc-500",
                  }}
                />
              </div>

              <Input
                isRequired
                type="email"
                label="Email address"
                labelPlacement="outside"
                placeholder="name@example.com"
                variant="flat"
                size="lg"
                value={formData.email}
                onChange={handleChange("email")}
                autoComplete="email"
                classNames={{
                  base: "w-full",
                  label: "font-medium !text-zinc-700 dark:!text-zinc-300",
                  inputWrapper: "h-12 w-full border border-zinc-900/8 bg-white/80 shadow-none hover:bg-white focus-within:!bg-white focus-within:ring-2 focus-within:ring-violet-500/40 dark:border-white/[0.05] dark:bg-white/[0.05] dark:hover:bg-white/[0.08] dark:focus-within:!bg-white/[0.08] dark:focus-within:ring-violet-500/50",
                  input: "!text-zinc-900 placeholder:!text-zinc-400 dark:!text-white dark:placeholder:!text-zinc-500",
                }}
              />

              <div className="grid gap-6 md:grid-cols-2">
                <Input
                  isRequired
                  label="Password"
                  labelPlacement="outside"
                  placeholder="Create a password"
                  variant="flat"
                  size="lg"
                  type={isPasswordVisible ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange("password")}
                  autoComplete="new-password"
                  classNames={{
                    base: "w-full",
                    label: "font-medium !text-zinc-700 dark:!text-zinc-300",
                    inputWrapper: "h-12 w-full border border-zinc-900/8 bg-white/80 shadow-none hover:bg-white focus-within:!bg-white focus-within:ring-2 focus-within:ring-violet-500/40 dark:border-white/[0.05] dark:bg-white/[0.05] dark:hover:bg-white/[0.08] dark:focus-within:!bg-white/[0.08] dark:focus-within:ring-violet-500/50",
                    input: "!text-zinc-900 placeholder:!text-zinc-400 dark:!text-white dark:placeholder:!text-zinc-500",
                  }}
                  endContent={
                    <Button
                      isIconOnly
                      size="sm"
                      radius="full"
                      variant="light"
                      type="button"
                      onPress={() => setIsPasswordVisible((current) => !current)}
                      aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                      className="min-w-8 text-zinc-500 dark:text-zinc-400"
                    >
                      {isPasswordVisible ? (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </Button>
                  }
                />

                <Input
                  isRequired
                  label="Confirm password"
                  labelPlacement="outside"
                  placeholder="Repeat your password"
                  variant="flat"
                  size="lg"
                  type={isConfirmPasswordVisible ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={handleChange("confirmPassword")}
                  autoComplete="new-password"
                  classNames={{
                    base: "w-full",
                    label: "font-medium !text-zinc-700 dark:!text-zinc-300",
                    inputWrapper: "h-12 w-full border border-zinc-900/8 bg-white/80 shadow-none hover:bg-white focus-within:!bg-white focus-within:ring-2 focus-within:ring-violet-500/40 dark:border-white/[0.05] dark:bg-white/[0.05] dark:hover:bg-white/[0.08] dark:focus-within:!bg-white/[0.08] dark:focus-within:ring-violet-500/50",
                    input: "!text-zinc-900 placeholder:!text-zinc-400 dark:!text-white dark:placeholder:!text-zinc-500",
                  }}
                  endContent={
                    <Button
                      isIconOnly
                      size="sm"
                      radius="full"
                      variant="light"
                      type="button"
                      onPress={() => setIsConfirmPasswordVisible((current) => !current)}
                      aria-label={isConfirmPasswordVisible ? "Hide password confirmation" : "Show password confirmation"}
                      className="min-w-8 text-zinc-500 dark:text-zinc-400"
                    >
                      {isConfirmPasswordVisible ? (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </Button>
                  }
                />
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <p className="text-sm font-semibold text-zinc-950 dark:text-white">Account type</p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    Choose how you want to use Quickseat from day one.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {PUBLIC_REGISTRATION_ROLES.map((roleOption) => {
                    const isSelected = formData.role === roleOption.value;

                    return (
                      <Button
                        key={roleOption.value}
                        type="button"
                        onPress={() => handleRoleChange(roleOption.value)}
                        className={`h-auto justify-start rounded-2xl border px-4 py-4 text-left transition-all ${
                          isSelected
                            ? "border-violet-500/70 bg-violet-500/10 shadow-[0_0_20px_rgba(139,92,246,0.12)]"
                            : "border-zinc-900/8 bg-white/60 hover:bg-white/80 hover:border-zinc-900/14 dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:bg-white/[0.05] dark:hover:border-white/[0.14]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-zinc-950 dark:text-white">{roleOption.label}</p>
                            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{roleOption.description}</p>
                          </div>
                          <div
                            className={`mt-1 h-4 w-4 rounded-full border ${
                              isSelected
                                ? "border-violet-400 bg-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.35)]"
                                : "border-zinc-900/20 bg-transparent dark:border-white/20"
                            }`}
                          />
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>

              <Button
                type="submit"
                isLoading={isSubmitting}
                isDisabled={isSubmitting}
                className="mt-4 h-12 w-full rounded-xl border-0 bg-gradient-to-r from-blue-600 to-violet-600 text-md font-semibold !text-white shadow-[0_0_20px_rgba(139,92,246,0.22)] transition-all hover:from-blue-500 hover:to-violet-500 active:scale-[0.98] dark:shadow-[0_0_20px_rgba(139,92,246,0.3)]"
              >
                Create Account
              </Button>
            </form>

            <p className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-500">
              Already have an account?{" "}
              <Link
                as={RouterLink}
                to="/login"
                className="font-semibold !text-zinc-950 transition-colors hover:!text-violet-600 dark:!text-white dark:hover:!text-violet-400"
              >
                Sign in instead
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
