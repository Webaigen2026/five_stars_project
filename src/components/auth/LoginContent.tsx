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
        setError(payload?.error ?? "Unable to sign in. Please try again.");
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
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
          Welcome Back
        </p>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Sign in to Five Stars
        </h1>

        <p className="mt-3 text-slate-600">
          Access your trips, cargo requests, and charter requests.
        </p>

        {registered && !error && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-green-700">
              Account created. You can sign in now.
            </p>
            {verificationEmailFailed ? (
              <p className="text-sm text-amber-800">
                {OPTIONAL_VERIFICATION_COPY.loginAfterRegisterEmailFailed}
              </p>
            ) : (
              <p className="text-sm text-slate-600">
                {OPTIONAL_VERIFICATION_COPY.loginAfterRegister}
              </p>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Email
          </label>

          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-sm font-semibold text-primary"
            >
              Forgot password?
            </Link>
          </div>

          <input
            id="password"
            name="password"
            type="password"
            required
            placeholder="Enter your password"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {error && (
          <p className="text-sm font-medium text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-primary px-5 py-3 font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Looking for a guest booking?{" "}
        <Link href="/find-trip" className="font-semibold text-primary">
          Find My Trip
        </Link>
      </p>

      <p className="mt-3 text-center text-sm text-slate-600">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-semibold text-primary">
          Create one
        </Link>
      </p>
    </div>
  );
}
