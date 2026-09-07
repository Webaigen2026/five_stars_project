"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { OPTIONAL_VERIFICATION_COPY } from "../../lib/auth-email-policy";

export default function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const registered = searchParams.get("registered") === "1";
  const verificationEmailFailed =
    searchParams.get("verification_email") === "failed";

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const formData = new FormData(event.currentTarget);

    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; success?: boolean }
        | null;

      if (!response.ok) {
        setError(
          payload?.error ?? "Unable to sign in. Please try again."
        );
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Unable to sign in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="
        fs-auth-card
        w-full
        max-w-md
      
        bg-white
        px-6
        py-7
        shadow-[0_14px_40px_rgba(15,23,42,0.07)]
        sm:px-8
        sm:py-8
      "
    >
      {/* Header */}
      <div className="border-b border-slate-100 pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Welcome back
        </p>

        <h1
          className="
            font-american-sans
            mt-3
            text-3xl
            font-light
            tracking-[-0.025em]
            text-slate-950
            sm:text-4xl
          "
        >
          Sign in to Five Stars.
        </h1>

        <p className="mt-3 max-w-sm text-base leading-7 text-slate-600">
          Access your trips, cargo requests, and charter requests.
        </p>

        {registered && !error ? (
          <div className="mt-5 border-l-2 border-emerald-500 bg-emerald-50/70 px-4 py-3">
            <p className="text-sm font-semibold text-emerald-800">
              Account created. You can sign in now.
            </p>

            {verificationEmailFailed ? (
              <p className="mt-1.5 text-sm leading-6 text-amber-800">
                {
                  OPTIONAL_VERIFICATION_COPY.loginAfterRegisterEmailFailed
                }
              </p>
            ) : (
              <p className="mt-1.5 text-sm leading-6 text-slate-600">
                {OPTIONAL_VERIFICATION_COPY.loginAfterRegister}
              </p>
            )}
          </div>
        ) : null}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-semibold text-slate-800"
          >
            Email
          </label>

          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="
              w-full
              border
              border-slate-300
              bg-white
              px-4
              py-3.5
              text-slate-950
              outline-none
              transition
              placeholder:text-slate-400
              hover:border-slate-400
              focus:border-primary
              focus:ring-2
              focus:ring-primary/15
            "
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label
              htmlFor="password"
              className="block text-sm font-semibold text-slate-800"
            >
              Password
            </label>

            <Link
              href="/forgot-password"
              className="
                text-sm
                font-semibold
                text-primary
                transition
                hover:text-primary-hover
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-primary/30
              "
            >
              Forgot password?
            </Link>
          </div>

          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="Enter your password"
            className="
              w-full
              border
              border-slate-300
              bg-white
              px-4
              py-3.5
              text-slate-950
              outline-none
              transition
              placeholder:text-slate-400
              hover:border-slate-400
              focus:border-primary
              focus:ring-2
              focus:ring-primary/15
            "
          />
        </div>

        {error ? (
          <div
            role="alert"
            className="
              border-l-2
              border-red-500
              bg-red-50
              px-4
              py-3
              text-sm
              font-medium
              text-red-700
            "
          >
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="
            inline-flex
            min-h-12
            w-full
            items-center
            justify-center
            bg-primary
            px-5
            py-3.5
            text-sm
            font-semibold
            text-white
            shadow-[0_8px_20px_rgba(2,132,199,0.18)]
            transition-all
            duration-200
            hover:bg-primary-hover
            hover:shadow-[0_12px_26px_rgba(2,132,199,0.22)]
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-primary/30
            focus-visible:ring-offset-2
            disabled:cursor-not-allowed
            disabled:opacity-60
          "
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>

      {/* Secondary actions */}
      <div className="mt-7 border-t border-slate-100 pt-5">
        <p className="text-center text-sm text-slate-600">
          Looking for a guest booking?{" "}
          <Link
            href="/find-trip"
            className="
              font-semibold
              text-primary
              transition
              hover:text-primary-hover
            "
          >
            Find My Trip
          </Link>
        </p>

        <p className="mt-3 text-center text-sm text-slate-600">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="
              font-semibold
              text-primary
              transition
              hover:text-primary-hover
            "
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}