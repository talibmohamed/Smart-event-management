import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Button, Input, Link } from "@heroui/react";
import authService from "../services/authService";
import { extractApiErrorMessage } from "../services/api";

const NEUTRAL_RESET_MESSAGE = "If an account exists, a reset link was sent.";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!email.trim()) {
      setErrorMessage("Email is required");
      return;
    }

    setIsSubmitting(true);

    try {
      await authService.forgotPassword(email.trim());
      setSuccessMessage(NEUTRAL_RESET_MESSAGE);
      setEmail("");
    } catch (error) {
      setErrorMessage(
        extractApiErrorMessage(error, "Unable to request a password reset right now."),
      );
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
                Account recovery
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">
                Reset your password
              </h1>
              <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                Enter your email address and we will send reset instructions if the account exists.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {successMessage ? (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  {successMessage}
                </div>
              ) : null}

              {errorMessage ? (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-medium text-red-500 dark:text-red-400">
                  {errorMessage}
                </div>
              ) : null}

              <Input
                isRequired
                type="email"
                label="Email address"
                labelPlacement="outside"
                placeholder="name@example.com"
                variant="flat"
                size="lg"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                classNames={{
                  base: "w-full",
                  label: "font-medium !text-zinc-700 dark:!text-zinc-300",
                  inputWrapper: "h-12 w-full border border-zinc-900/8 bg-white/80 shadow-none hover:bg-white focus-within:!bg-white focus-within:ring-2 focus-within:ring-violet-500/40 dark:border-white/[0.05] dark:bg-white/[0.05] dark:hover:bg-white/[0.08] dark:focus-within:!bg-white/[0.08] dark:focus-within:ring-violet-500/50",
                  input: "!text-zinc-900 placeholder:!text-zinc-400 dark:!text-white dark:placeholder:!text-zinc-500",
                }}
              />

              <Button
                type="submit"
                isLoading={isSubmitting}
                isDisabled={isSubmitting}
                className="h-12 w-full rounded-xl border-0 bg-gradient-to-r from-blue-600 to-violet-600 text-md font-semibold !text-white shadow-[0_0_20px_rgba(139,92,246,0.22)] transition-all hover:from-blue-500 hover:to-violet-500 active:scale-[0.98] dark:shadow-[0_0_20px_rgba(139,92,246,0.3)]"
              >
                Send Reset Link
              </Button>
            </form>

            <p className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-500">
              Remembered your password?{" "}
              <Link
                as={RouterLink}
                to="/login"
                className="font-semibold !text-zinc-950 transition-colors hover:!text-violet-600 dark:!text-white dark:hover:!text-violet-400"
              >
                Back to login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
