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

  const bookingReference = (searchParams.get("ref") ?? "")
    .trim()
    .toUpperCase();

  const email = (searchParams.get("email") ?? "").trim().toLowerCase();

  const maskedEmail = email
    ? maskEmailForDisplay(email)
    : "your email";

  const inputId = useId();

  const [digits, setDigits] = useState<string[]>(
    Array.from({ length: CODE_LENGTH }, () => "")
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [info, setInfo] = useState(
    "This code expires in 10 minutes."
  );

  const [cooldown, setCooldown] = useState(
    RESEND_COOLDOWN_SECONDS
  );

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

    const chars = cleaned
      .slice(0, CODE_LENGTH - index)
      .split("");

    const next = [...digits];

    chars.forEach((char, offset) => {
      next[index + offset] = char;
    });

    updateDigits(next);

    focusIndex(
      Math.min(index + chars.length, CODE_LENGTH - 1)
    );
  }

  function handleKeyDown(
    index: number,
    event: KeyboardEvent<HTMLInputElement>
  ) {
    if (
      event.key === "Backspace" &&
      !digits[index] &&
      index > 0
    ) {
      event.preventDefault();

      const next = [...digits];
      next[index - 1] = "";

      updateDigits(next);
      focusIndex(index - 1);
    }
  }

  function handlePaste(
    event: ClipboardEvent<HTMLInputElement>
  ) {
    event.preventDefault();

    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, CODE_LENGTH);

    if (!pasted) {
      return;
    }

    const next = Array.from(
      { length: CODE_LENGTH },
      (_, index) => pasted[index] ?? ""
    );

    updateDigits(next);

    focusIndex(
      Math.min(pasted.length, CODE_LENGTH) - 1
    );
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
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
      const response = await fetch(
        "/api/guest/find-trip/verify",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code }),
        }
      );

      const payload = (await response
        .json()
        .catch(() => null)) as
        | {
            error?: string;
            bookingReference?: string;
          }
        | null;

      if (!response.ok) {
        setError(
          payload?.error ??
            "The code is incorrect or has expired."
        );
        return;
      }

      const reference =
        payload?.bookingReference ?? bookingReference;

      router.push(
        `/my-trips/${encodeURIComponent(reference)}`
      );
    } catch {
      setError(
        "The code is incorrect or has expired."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    if (
      isResending ||
      cooldown > 0 ||
      !bookingReference ||
      !email
    ) {
      return;
    }

    setError(null);
    setIsResending(true);

    try {
      const response = await fetch(
        "/api/guest/find-trip",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            bookingReference,
            email,
          }),
        }
      );

      if (!response.ok) {
        setError(
          "Unable to resend the code. Please try again."
        );
        return;
      }

      setInfo(
        "A new verification code has been sent. This code expires in 10 minutes."
      );

      setCooldown(RESEND_COOLDOWN_SECONDS);

      setDigits(
        Array.from({ length: CODE_LENGTH }, () => "")
      );

      focusIndex(0);
    } catch {
      setError(
        "Unable to resend the code. Please try again."
      );
    } finally {
      setIsResending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[620px]">
      {/* Section heading */}
      <div className="border-b border-slate-200 pb-4">
      <h2 className="text-[18px] font-semibold tracking-[-0.015em] text-slate-950">
  Verification code
</h2>

        <p className="mt-1 text-[12px] leading-5 text-slate-500">
          Enter the six-digit verification code sent to{" "}
          <span className="font-medium text-slate-700">
            {maskedEmail}
          </span>
          .
        </p>

        {bookingReference && (
          <p className="mt-1 text-[10.5px] leading-[18px] text-slate-500">
            Booking reference:{" "}
            <span className="fs-nums font-medium text-slate-700">
              {bookingReference}
            </span>
          </p>
        )}
      </div>

      {/* Verification form */}
      <form onSubmit={handleSubmit} className="pt-5">
        <div>
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-[12px] font-medium text-slate-700"
          >
            Verification code
            <span
              className="ml-0.5 text-red-500"
              aria-hidden="true"
            >
              *
            </span>
          </label>

          <div
            className="grid max-w-[360px] grid-cols-6 gap-2"
            role="group"
            aria-label="Six-digit verification code"
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
                autoComplete={
                  index === 0
                    ? "one-time-code"
                    : "off"
                }
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                aria-label={`Digit ${
                  index + 1
                } of ${CODE_LENGTH}`}
                onChange={(event) =>
                  handleChange(
                    index,
                    event.target.value
                  )
                }
                onKeyDown={(event) =>
                  handleKeyDown(index, event)
                }
                onPaste={handlePaste}
                className="h-[44px] min-w-0 rounded-[4px] border border-slate-300 bg-white text-center text-[16px] font-semibold text-slate-950 outline-none transition-colors hover:border-slate-400 focus:border-[#0078D2] focus:ring-1 focus:ring-[#0078D2]"
              />
            ))}
          </div>

          {info && (
            <p className="mt-2 text-[10.5px] leading-[18px] text-slate-500">
              {info}
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="mt-4 border-l-2 border-red-500 bg-red-50 px-3.5 py-2.5"
          >
            <p className="text-[12px] font-medium leading-5 text-red-700">
              {error}
            </p>
          </div>
        )}

        {/* Primary action */}
        <div className="mt-5">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-[40px] min-w-[138px] items-center justify-center rounded-[4px] bg-[#0078D2] px-6 text-[13px] font-semibold text-white transition-colors hover:bg-[#006bbd] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? "Verifying..."
              : "Verify code"}
          </button>
        </div>
      </form>

      {/* Resend */}
      <div className="mt-6 border-t border-slate-200 pt-5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-[12px] font-medium text-slate-800">
            Didn&apos;t receive the code?
          </p>

          <button
            type="button"
            onClick={() => void handleResend()}
            disabled={
              isResending ||
              cooldown > 0 ||
              !bookingReference ||
              !email
            }
            className="text-[12px] font-semibold text-[#0078D2] transition-colors hover:text-[#006bbd] disabled:cursor-not-allowed disabled:text-slate-400"
          >
            {cooldown > 0
              ? `Resend in ${cooldown}s`
              : isResending
                ? "Sending..."
                : "Resend code"}
          </button>
        </div>

        <p className="mt-1 text-[10.5px] leading-[18px] text-slate-500">
          Verification codes expire after 10 minutes.
        </p>
      </div>

      {/* Start over */}
      <div className="mt-5 border-t border-slate-200 pt-4">
        <Link
          href="/find-trip"
          className="text-[12px] font-semibold text-[#0078D2] transition-colors hover:text-[#006bbd]"
        >
          Start over
        </Link>

        <p className="mt-1 text-[10.5px] leading-[18px] text-slate-500">
          Return to Find My Trip to use a different booking
          reference or email address.
        </p>
      </div>
    </div>
  );
}