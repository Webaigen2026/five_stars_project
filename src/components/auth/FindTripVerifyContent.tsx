"use client";

import {
  ClipboardEvent,
  FormEvent,
  KeyboardEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { maskEmailForDisplay } from "../../lib/guest-trip-access";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

export default function FindTripVerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingReference = (searchParams.get("ref") ?? "").trim().toUpperCase();
  const email = (searchParams.get("email") ?? "").trim().toLowerCase();
  const maskedEmail = email ? maskEmailForDisplay(email) : "your email";
  const inputId = useId();

  const [digits, setDigits] = useState<string[]>(
    Array.from({ length: CODE_LENGTH }, () => "")
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState("This code expires in 10 minutes.");
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const timer = window.setTimeout(() => {
      setCooldown((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  function focusIndex(index: number) {
    inputsRef.current[index]?.focus();
  }

  function updateDigits(next: string[]) {
    setDigits(next.slice(0, CODE_LENGTH));
  }

  function handleChange(index: number, value: string) {
    const cleaned = value.replace(/\D/g, "");
    if (!cleaned) {
      const next = [...digits];
      next[index] = "";
      updateDigits(next);
      return;
    }

    const chars = cleaned.slice(0, CODE_LENGTH - index).split("");
    const next = [...digits];
    chars.forEach((char, offset) => {
      next[index + offset] = char;
    });
    updateDigits(next);
    focusIndex(Math.min(index + chars.length, CODE_LENGTH - 1));
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      event.preventDefault();
      const next = [...digits];
      next[index - 1] = "";
      updateDigits(next);
      focusIndex(index - 1);
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, CODE_LENGTH);
    if (!pasted) {
      return;
    }
    const next = Array.from({ length: CODE_LENGTH }, (_, index) => {
      return pasted[index] ?? "";
    });
    updateDigits(next);
    focusIndex(Math.min(pasted.length, CODE_LENGTH) - 1);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const code = digits.join("");
    if (code.length !== CODE_LENGTH) {
      setError("Enter the six-digit verification code.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/guest/find-trip/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; bookingReference?: string }
        | null;

      if (!response.ok) {
        setError(
          payload?.error ?? "The code is incorrect or has expired."
        );
        return;
      }

      const reference =
        payload?.bookingReference ?? bookingReference;
      router.push(`/my-trips/${encodeURIComponent(reference)}`);
    } catch {
      setError("The code is incorrect or has expired.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    if (isResending || cooldown > 0 || !bookingReference || !email) {
      return;
    }

    setError(null);
    setIsResending(true);

    try {
      const response = await fetch("/api/guest/find-trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingReference, email }),
      });

      if (!response.ok) {
        setError("Unable to resend the code. Please try again.");
        return;
      }

      setInfo(
        "If the booking information matches, we've sent a verification code. This code expires in 10 minutes."
      );
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setDigits(Array.from({ length: CODE_LENGTH }, () => ""));
      focusIndex(0);
    } catch {
      setError("Unable to resend the code. Please try again.");
    } finally {
      setIsResending(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
          Five Stars
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Enter verification code
        </h1>
        <p className="mt-3 text-slate-600">
          We sent a six-digit code to:{" "}
          <span className="font-medium text-slate-900">{maskedEmail}</span>
        </p>
        {info ? <p className="mt-2 text-sm text-slate-500">{info}</p> : null}
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label htmlFor={inputId} className="sr-only">
            Six-digit verification code
          </label>
          <div
            className="flex justify-between gap-2"
            role="group"
            aria-labelledby={inputId}
          >
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(element) => {
                  inputsRef.current[index] = element;
                }}
                id={index === 0 ? inputId : undefined}
                type="text"
                inputMode="numeric"
                autoComplete={index === 0 ? "one-time-code" : "off"}
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                aria-label={`Digit ${index + 1} of ${CODE_LENGTH}`}
                onChange={(event) => handleChange(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(index, event)}
                onPaste={handlePaste}
                className="h-12 w-10 rounded-xl border border-slate-300 text-center text-xl font-semibold tracking-widest outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 sm:h-14 sm:w-12"
              />
            ))}
          </div>
        </div>

        {error ? (
          <p className="text-sm font-medium text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-primary px-5 py-3 font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Verifying..." : "Verify code"}
        </button>
      </form>

      <div className="mt-6 space-y-3 text-center text-sm text-slate-600">
        <p>
          Didn&apos;t receive it?{" "}
          <button
            type="button"
            onClick={() => void handleResend()}
            disabled={isResending || cooldown > 0 || !bookingReference || !email}
            className="font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cooldown > 0
              ? `Resend code (${cooldown}s)`
              : isResending
                ? "Sending..."
                : "Resend code"}
          </button>
        </p>
        <p>
          <Link href="/find-trip" className="font-semibold text-primary">
            Start over
          </Link>
        </p>
      </div>
    </div>
  );
}
