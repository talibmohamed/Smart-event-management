import { useEffect, useState } from "react";
import { useLocation, useNavigate, Link as RouterLink } from "react-router-dom";
import { Input, Button, Link } from "@heroui/react";
import logoUrl from "../../logo.svg";
import { useAuth } from "../context/AuthContext";
import { extractApiErrorMessage } from "../services/api";
import { getPostAuthPath } from "../services/authService";

const DEV_SEEDED_ACCOUNTS = [
  "admin@smartevent.test",
  "organizer1@smartevent.test",
  "organizer2@smartevent.test",
  "attendee1@smartevent.test",
  "attendee2@smartevent.test",
  "attendee3@smartevent.test",
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { login, isAuthenticated, isBootstrapping, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const routeMessage =
    typeof location.state?.message === "string" ? location.state.message : "";

  const toggleVisibility = () => setIsVisible((prev) => !prev);
  const redirectPath =
    typeof location.state?.from === "string"
      ? location.state.from
      : getPostAuthPath(user?.role);

  useEffect(() => {
    if (!isBootstrapping && isAuthenticated) {
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, isBootstrapping, navigate, redirectPath]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    setIsLoading(true);

    try {
      await login({
        email: email.trim(),
        password,
      });
    } catch (err) {
      setError(extractApiErrorMessage(err, "Invalid credentials. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  function handleUseSeededAccount(nextEmail) {
    setEmail(nextEmail);
    setPassword("Password123!");
    setError("");
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
            Create <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-600 bg-clip-text text-transparent">nights</span><br />worth remembering.
          </h1>
          <p className="mb-12 max-w-md text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
            Elevate your live experiences. Join world-class organizers in delivering unforgettable moments with absolute clarity.
          </p>
        </div>

        <div className="absolute right-12 top-1/4 z-10 w-72 -rotate-6 rounded-2xl border border-zinc-900/8 bg-white/55 p-5 shadow-[0_8px_32px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-transform duration-500 hover:-rotate-3 hover:scale-105 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_8px_32px_rgba(139,92,246,0.15)]">
          <div className="mb-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-inner" />
            <div>
              <div className="text-sm font-semibold text-zinc-900 dark:text-white">Nebula Music Festival</div>
              <div className="mt-0.5 text-xs text-violet-600 dark:text-violet-400">Oct 24 &bull; VIP Access</div>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-zinc-900/6 pt-3 dark:border-white/5">
            <div className="flex -space-x-2">
              <div className="h-6 w-6 rounded-full border border-white bg-zinc-300 dark:border-[#0A0A0F] dark:bg-zinc-700" />
              <div className="h-6 w-6 rounded-full border border-white bg-zinc-400 dark:border-[#0A0A0F] dark:bg-zinc-600" />
              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-white bg-zinc-500 text-[10px] font-medium text-white dark:border-[#0A0A0F]">+9</div>
            </div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Attending</div>
          </div>
        </div>

        <div className="absolute bottom-32 left-1/4 z-20 w-60 rotate-3 rounded-2xl border border-zinc-900/8 bg-white/55 p-5 shadow-[0_8px_32px_rgba(59,130,246,0.1)] backdrop-blur-xl transition-transform duration-500 hover:rotate-6 hover:scale-105 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_8px_32px_rgba(59,130,246,0.15)]">
          <div className="mb-1 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Total Check-ins</div>
          <div className="mb-2 text-3xl font-bold text-zinc-950 dark:text-white">12,408</div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-500 dark:text-emerald-400">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            <span>+24% this week</span>
          </div>
        </div>

        <div className="absolute left-1/2 top-32 z-10 flex rotate-12 items-center gap-2.5 rounded-full border border-zinc-900/8 bg-white/60 px-4 py-2 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-black/40">
          <div className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500"></span>
          </div>
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-900 dark:text-white">Live Event</span>
        </div>
      </div>

      <div className="relative z-20 flex w-full items-center justify-center p-6 sm:p-12 lg:w-1/2">
        <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-zinc-900/10 bg-white/70 p-8 shadow-[0_0_40px_rgba(15,23,42,0.12),inset_0_0_20px_rgba(255,255,255,0.45)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.02] dark:shadow-[0_0_40px_rgba(0,0,0,0.8),inset_0_0_20px_rgba(255,255,255,0.02)] sm:p-10">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/10 to-violet-500/10 dark:from-blue-500/5 dark:to-violet-500/5" />

          <div className="relative z-10">
            <div className="mb-10 flex items-center gap-2 lg:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white p-1 shadow-[0_0_15px_rgba(35,21,56,0.18)]">
                <img src={logoUrl} alt="Quickseat logo" className="h-full w-full object-contain" />
              </div>
              <span className="text-xl font-bold tracking-tighter text-zinc-950 dark:text-white">Quickseat.</span>
            </div>

            <div className="mb-8 space-y-1.5">
              <h2 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">Welcome back</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Enter your credentials to access your portal.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {routeMessage ? (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  {routeMessage}
                </div>
              ) : null}

              {error ? (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-medium text-red-500 dark:text-red-400">
                  {error}
                </div>
              ) : null}

              <div className="flex flex-col gap-8">
                <Input
                  isRequired
                  type="email"
                  label="Email address"
                  labelPlacement="outside"
                  placeholder="name@example.com"
                  variant="flat"
                  size="lg"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  classNames={{
                    base: "w-full",
                    label: "font-medium !text-zinc-700 dark:!text-zinc-300",
                    inputWrapper: "h-12 w-full border border-zinc-900/8 bg-white/80 shadow-none hover:bg-white focus-within:!bg-white focus-within:ring-2 focus-within:ring-violet-500/40 dark:border-white/[0.05] dark:bg-white/[0.05] dark:hover:bg-white/[0.08] dark:focus-within:!bg-white/[0.08] dark:focus-within:ring-violet-500/50",
                    input: "!text-zinc-900 placeholder:!text-zinc-400 dark:!text-white dark:placeholder:!text-zinc-500"
                  }}
                />

                <Input
                  isRequired
                  label="Password"
                  labelPlacement="outside"
                  placeholder="Enter your password"
                  variant="flat"
                  size="lg"
                  type={isVisible ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  classNames={{
                    base: "w-full",
                    label: "font-medium !text-zinc-700 dark:!text-zinc-300",
                    inputWrapper: "h-12 w-full border border-zinc-900/8 bg-white/80 shadow-none hover:bg-white focus-within:!bg-white focus-within:ring-2 focus-within:ring-violet-500/40 dark:border-white/[0.05] dark:bg-white/[0.05] dark:hover:bg-white/[0.08] dark:focus-within:!bg-white/[0.08] dark:focus-within:ring-violet-500/50",
                    input: "!text-zinc-900 placeholder:!text-zinc-400 dark:!text-white dark:placeholder:!text-zinc-500"
                  }}
                  endContent={
                    <Button
                      isIconOnly
                      size="sm"
                      radius="full"
                      variant="light"
                      type="button"
                      onPress={toggleVisibility}
                      aria-label={isVisible ? "Hide password" : "Show password"}
                      className="min-w-8 text-zinc-500 dark:text-zinc-400"
                    >
                      {isVisible ? (
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

              <div className="-mt-3 flex justify-end">
                <Link
                  as={RouterLink}
                  to="/forgot-password"
                  className="text-sm font-semibold !text-zinc-700 transition-colors hover:!text-violet-600 dark:!text-zinc-300 dark:hover:!text-violet-400"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                isLoading={isLoading}
                isDisabled={isLoading}
                className="mt-4 h-12 w-full rounded-xl border-0 bg-gradient-to-r from-blue-600 to-violet-600 text-md font-semibold !text-white shadow-[0_0_20px_rgba(139,92,246,0.22)] transition-all hover:from-blue-500 hover:to-violet-500 active:scale-[0.98] dark:shadow-[0_0_20px_rgba(139,92,246,0.3)]"
              >
                Sign In
              </Button>
            </form>

            <p className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-500">
              Don't have an account?{" "}
              <Link
                as={RouterLink}
                to="/register"
                className="font-semibold !text-zinc-950 transition-colors hover:!text-violet-600 dark:!text-white dark:hover:!text-violet-400"
              >
                Create one now
              </Link>
            </p>

            {import.meta.env.DEV ? (
              <div className="mt-8 rounded-2xl border border-zinc-900/8 bg-white/70 p-4 text-left dark:border-white/10 dark:bg-white/[0.04]">
                <div className="space-y-1">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                    Development logins
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Seeded password for all accounts: <span className="font-medium text-zinc-900 dark:text-white">Password123!</span>
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {DEV_SEEDED_ACCOUNTS.map((seededEmail) => (
                    <Button
                      key={seededEmail}
                      type="button"
                      size="sm"
                      radius="full"
                      variant="bordered"
                      onPress={() => handleUseSeededAccount(seededEmail)}
                      className="border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-300"
                    >
                      {seededEmail}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
