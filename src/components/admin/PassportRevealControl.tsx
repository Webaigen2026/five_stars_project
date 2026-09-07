"use client";

import { useEffect, useId, useRef, useState } from "react";

import {
  PASSPORT_REVEAL_AUTO_HIDE_MS,
  parsePassportRevealResponse,
  shouldRenderRevealControl,
} from "../../lib/passport-reveal-ui";

type PassportRevealControlProps = {
  passengerId: number;
  maskedPassport: string;
  canReveal: boolean;
};

export default function PassportRevealControl({
  passengerId,
  maskedPassport,
  canReveal,
}: PassportRevealControlProps) {
  const [passportNumber, setPassportNumber] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const passwordInputId = useId();

  function clearHideTimer() {
    if (hideTimerRef.current != null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }

  function clearPassword() {
    setPassword("");
  }

  function closeConfirm() {
    clearPassword();
    setConfirmOpen(false);
  }

  function hidePassport() {
    clearHideTimer();
    setPassportNumber(null);
  }

  useEffect(() => {
    return () => {
      clearHideTimer();
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (confirmOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [confirmOpen]);

  async function handleConfirmReveal() {
    if (isLoading || passportNumber !== null) {
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/admin/passengers/${passengerId}/passport`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ password }),
          cache: "no-store",
          credentials: "same-origin",
        }
      );

      clearPassword();

      const payload = (await response.json().catch(() => null)) as unknown;
      const parsed = parsePassportRevealResponse(response.status, payload);

      if (!parsed.ok) {
        setPassportNumber(null);
        setError(parsed.error);

        if (!parsed.keepConfirmOpen) {
          setConfirmOpen(false);
        }

        return;
      }

      setConfirmOpen(false);
      setPassportNumber(parsed.passportNumber);
      clearHideTimer();
      hideTimerRef.current = window.setTimeout(() => {
        setPassportNumber(null);
        hideTimerRef.current = null;
      }, PASSPORT_REVEAL_AUTO_HIDE_MS);
    } catch {
      clearPassword();
      setPassportNumber(null);
      setConfirmOpen(false);
      setError("Unable to reveal passport number.");
    } finally {
      setIsLoading(false);
    }
  }

  const isRevealed = passportNumber !== null;
  const showReveal = shouldRenderRevealControl(canReveal);

  return (
    <div className="min-w-[10rem]">
      <div className="flex items-center gap-3">
        <span className="font-mono text-slate-950 tabular-nums">
          {isRevealed ? passportNumber : maskedPassport}
        </span>

        {showReveal ? (
          isRevealed ? (
            <button
              type="button"
              onClick={hidePassport}
              aria-expanded={true}
              className="shrink-0 text-sm font-medium text-slate-600 transition hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Hide
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setError(null);
                clearPassword();
                setConfirmOpen(true);
              }}
              disabled={isLoading}
              aria-expanded={false}
              className="shrink-0 text-sm font-medium text-primary transition hover:text-primary-hover disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Reveal
            </button>
          )
        ) : null}
      </div>

      {isRevealed ? (
        <p className="mt-1 text-xs text-slate-500">
          Automatically hidden after 30 seconds.
        </p>
      ) : null}

      {error && !confirmOpen ? (
        <p className="mt-1 text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="w-[min(100%,24rem)] rounded-2xl border border-slate-200 bg-white p-0 shadow-xl backdrop:bg-slate-950/40"
        onClose={() => {
          clearPassword();
          setConfirmOpen(false);
        }}
        onCancel={(event) => {
          event.preventDefault();
          if (!isLoading) {
            closeConfirm();
          }
        }}
      >
        <form
          className="p-5"
          onSubmit={(event) => {
            event.preventDefault();
            void handleConfirmReveal();
          }}
        >
          <h2
            id={titleId}
            className="text-base font-semibold tracking-tight text-slate-950"
          >
            Confirm your password
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            For your security, confirm your password to view this passport
            number.
          </p>

          <label
            htmlFor={passwordInputId}
            className="mt-4 block text-sm font-medium text-slate-700"
          >
            Password
          </label>
          <input
            id={passwordInputId}
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isLoading}
            className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-slate-50"
          />

          {error && confirmOpen ? (
            <p className="mt-2 text-xs font-medium text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={closeConfirm}
              disabled={isLoading}
              className="rounded-xl px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || password.length === 0}
              aria-busy={isLoading}
              className="rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {isLoading ? "Verifying..." : "Reveal passport"}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
