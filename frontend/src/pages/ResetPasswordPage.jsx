import { useState } from "react";
import { Link as RouterLink, useNavigate, useSearchParams } from "react-router-dom";
import { Button, Input, Link } from "@heroui/react";
import authService from "../services/authService";
import { extractApiErrorMessage } from "../services/api";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");

    if (!token) {
      setErrorMessage("Password reset token is missing.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Password confirmation does not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await authService.resetPassword({ token, password });
      navigate("/login", {
        replace: true,
        state: {
          message: response.data?.message || "Password reset successfully. You can now sign in.",
        },
      });
    } catch (error) {
      setErrorMessage(extractApiErrorMessage(error, "Unable to reset your password right now."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[#f6f4ff] text-zinc-700 transition-colors dark:bg-[#0A0A0F] dark:text-zinc-300">
      <div className="pointer-events-none absolute top-[-20%] left-[-10%] h-[70%] w-[70%] rounded-full bg-violet-500/12 blur-[150px] dark:bg-violet-600/10" />
      <div className="pointer-events-none absolute bottom-[-20%] right-[-10%] h-[60%] w-[60%] rounded-full bg-sky-500/12 blur-[150px] dark:bg-blue-600/10" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#0f172a08_1px,transparent_1px),linear-gradient(to_bottom,#0f172a08_1px,transparent_1px)] bg-[size:4rem_4rem] dark:bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)]" />

      <div className="relative z-20 flex w-full items-center justify-center p-6 sm:p-12">
        <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-zinc-900/10 bg-white/70 p-8 shadow-[0_0_40px_rgba(15,23,42,0.12),inset_0_0_20px_rgba(255,255,255,0.45)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.02] dark:shadow-[0_0_40px_rgba(0,0,0,0.8),inset_0_0_20px_rgba(255,255,255,0.02)] sm:p-10">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/10 to-violet-500/10 dark:from-blue-500/5 dark:to-violet-500/5" />

          <div className="relative z-10">
            <Link as={RouterLink} to="/" className="mb-10 flex items-center gap-2 text-xl font-bold tracking-tighter text-zinc-950 dark:text-white">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 shadow-[0_0_15px_rgba(139,92,246,0.35)] dark:shadow-[0_0_15px_rgba(139,92,246,0.5)]">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              SmartEvent.
            </Link>

            <div className="mb-8 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">
                Secure reset
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">
                Choose a new password
              </h1>
              <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                Reset links expire after 60 minutes. Use a password with at least 6 characters.
              </p>
            </div>

            {!token ? (
              <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm font-medium text-amber-700 dark:text-amber-300">
                This reset link is missing a token. Request a new password reset email.
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-6">
              {errorMessage ? (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-medium text-red-500 dark:text-red-400">
                  {errorMessage}
                </div>
              ) : null}

              <Input
                isRequired
                label="New password"
                labelPlacement="outside"
                placeholder="Enter a new password"
                variant="flat"
                size="lg"
                type={isPasswordVisible ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                classNames={{
                  base: "w-full",
                  label: "font-medium !text-zinc-700 dark:!text-zinc-300",
                  inputWrapper: "h-12 w-full border border-zinc-900/8 bg-white/80 shadow-none hover:bg-white focus-within:!bg-white focus-within:ring-2 focus-within:ring-violet-500/40 dark:border-white/[0.05] dark:bg-white/[0.05] dark:hover:bg-white/[0.08] dark:focus-within:!bg-white/[0.08] dark:focus-within:ring-violet-500/50",
                  input: "!text-zinc-900 placeholder:!text-zinc-400 dark:!text-white dark:placeholder:!text-zinc-500",
                }}
                endContent={
                  <button
                    type="button"
                    onClick={() => setIsPasswordVisible((current) => !current)}
                    aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                    className="flex h-full items-center justify-center px-1 text-zinc-500 transition-colors hover:text-zinc-900 focus:outline-none dark:text-zinc-400 dark:hover:text-white"
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
                  </button>
                }
              />

              <Input
                isRequired
                label="Confirm password"
                labelPlacement="outside"
                placeholder="Repeat your new password"
                variant="flat"
                size="lg"
                type={isConfirmPasswordVisible ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                classNames={{
                  base: "w-full",
                  label: "font-medium !text-zinc-700 dark:!text-zinc-300",
                  inputWrapper: "h-12 w-full border border-zinc-900/8 bg-white/80 shadow-none hover:bg-white focus-within:!bg-white focus-within:ring-2 focus-within:ring-violet-500/40 dark:border-white/[0.05] dark:bg-white/[0.05] dark:hover:bg-white/[0.08] dark:focus-within:!bg-white/[0.08] dark:focus-within:ring-violet-500/50",
                  input: "!text-zinc-900 placeholder:!text-zinc-400 dark:!text-white dark:placeholder:!text-zinc-500",
                }}
                endContent={
                  <button
                    type="button"
                    onClick={() => setIsConfirmPasswordVisible((current) => !current)}
                    aria-label={isConfirmPasswordVisible ? "Hide password confirmation" : "Show password confirmation"}
                    className="flex h-full items-center justify-center px-1 text-zinc-500 transition-colors hover:text-zinc-900 focus:outline-none dark:text-zinc-400 dark:hover:text-white"
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
                  </button>
                }
              />

              <Button
                type="submit"
                isLoading={isSubmitting}
                isDisabled={isSubmitting || !token}
                className="h-12 w-full rounded-xl border-0 bg-gradient-to-r from-blue-600 to-violet-600 text-md font-semibold !text-white shadow-[0_0_20px_rgba(139,92,246,0.22)] transition-all hover:from-blue-500 hover:to-violet-500 active:scale-[0.98] dark:shadow-[0_0_20px_rgba(139,92,246,0.3)]"
              >
                Reset Password
              </Button>
            </form>

            <p className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-500">
              Need a new link?{" "}
              <Link
                as={RouterLink}
                to="/forgot-password"
                className="font-semibold !text-zinc-950 transition-colors hover:!text-violet-600 dark:!text-white dark:hover:!text-violet-400"
              >
                Request reset email
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
