"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type VerifyState = "verifying" | "success" | "error";

export default function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [state, setState] = useState<VerifyState>(
    token ? "verifying" : "error"
  );
  const [error, setError] = useState(
    token
      ? "This verification link is invalid or has expired."
      : "This verification link is missing a token."
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    async function verify() {
      try {
        const response = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          setError(
            payload?.error ??
              "This verification link is invalid or has expired."
          );
          setState("error");
          return;
        }

        setState("success");
      } catch {
        if (!cancelled) {
          setError("This verification link is invalid or has expired.");
          setState("error");
        }
      }
    }

    void verify();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
        Email Verification
      </p>

      {state === "verifying" && (
        <>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Verifying your email
          </h1>
          <p className="mt-4 text-slate-600">
            Please wait while we confirm your verification link.
          </p>
        </>
      )}

      {state === "success" && (
        <>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Email verified successfully.
          </h1>
          <p className="mt-4 text-slate-600">
            You can now sign in to your Five Stars account.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex rounded-xl bg-primary px-6 py-3 font-semibold text-white transition hover:bg-primary-hover"
          >
            Sign in
          </Link>
        </>
      )}

      {state === "error" && (
        <>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Verification failed
          </h1>
          <p className="mt-4 text-slate-600">{error}</p>
          <Link
            href="/login"
            className="mt-6 inline-flex rounded-xl bg-primary px-6 py-3 font-semibold text-white transition hover:bg-primary-hover"
          >
            Back to sign in
          </Link>
        </>
      )}
    </div>
  );
}
