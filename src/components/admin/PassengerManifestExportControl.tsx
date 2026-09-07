"use client";

import { useEffect, useId, useRef, useState } from "react";

import {
  parsePassengerManifestResponse,
  type PassengerManifestPassportMode,
} from "../../lib/passenger-manifest-ui";

type PassengerManifestExportControlProps = {
  flightId: number;
  flightCode: string;
  canExport: boolean;
};

export default function PassengerManifestExportControl({
  flightId,
  flightCode,
  canExport,
}: PassengerManifestExportControlProps) {
  const [open, setOpen] = useState(false);
  const [passportMode, setPassportMode] =
    useState<PassengerManifestPassportMode>("masked");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const passwordInputId = useId();

  function clearPassword() {
    setPassword("");
  }

  function closeDialog() {
    clearPassword();
    setError(null);
    setPassportMode("masked");
    setOpen(false);
  }

  useEffect(() => {
    return () => {
      clearPassword();
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  if (!canExport) {
    return null;
  }

  async function handleExport() {
    if (isLoading) {
      return;
    }

    setError(null);
    setIsLoading(true);

    let objectUrl: string | null = null;

    try {
      const response = await fetch(
        `/api/admin/flights/${flightId}/passenger-manifest`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            passportMode,
            password,
          }),
        }
      );

      clearPassword();

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        const parsed = parsePassengerManifestResponse(
          response.status,
          payload
        );
        setError(parsed.error);
        if (!parsed.keepConfirmOpen) {
          setOpen(false);
          setPassportMode("masked");
        }
        return;
      }

      const blob = await response.blob();
      objectUrl = URL.createObjectURL(blob);

      const disposition = response.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="([^"]+)"/);
      const filename =
        match?.[1] ??
        `FiveStars_Passenger_Manifest_${flightCode.replace(/[^A-Za-z0-9_-]+/g, "_")}.xlsx`;

      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      setOpen(false);
      setPassportMode("masked");
      setError(null);
    } catch {
      clearPassword();
      setError("Unable to export passenger manifest.");
    } finally {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      setIsLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setError(null);
          clearPassword();
          setPassportMode("masked");
          setOpen(true);
        }}
        className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Export Passenger Manifest
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="w-[min(100%,26rem)] rounded-2xl border border-slate-200 bg-white p-0 shadow-xl backdrop:bg-slate-950/40"
        onClose={() => {
          clearPassword();
          setError(null);
          setPassportMode("masked");
          setOpen(false);
        }}
        onCancel={(event) => {
          event.preventDefault();
          if (!isLoading) {
            closeDialog();
          }
        }}
      >
        <form
          className="p-5"
          onSubmit={(event) => {
            event.preventDefault();
            void handleExport();
          }}
        >
          <h2
            id={titleId}
            className="text-base font-semibold tracking-tight text-slate-950"
          >
            Export Passenger Manifest
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Download an Excel passenger list for flight{" "}
            <span className="font-semibold text-slate-900">{flightCode}</span>.
          </p>

          <fieldset className="mt-4">
            <legend className="text-sm font-medium text-slate-700">
              Passport numbers
            </legend>

            <label className="mt-3 flex cursor-pointer gap-3 rounded-xl border border-slate-200 p-3 has-[:checked]:border-primary has-[:checked]:bg-sky-50/60">
              <input
                type="radio"
                name="passportMode"
                value="masked"
                checked={passportMode === "masked"}
                onChange={() => setPassportMode("masked")}
                disabled={isLoading}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-semibold text-slate-900">
                  Masked
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-slate-600">
                  Export passport numbers in masked form.
                </span>
              </span>
            </label>

            <label className="mt-2 flex cursor-pointer gap-3 rounded-xl border border-slate-200 p-3 has-[:checked]:border-primary has-[:checked]:bg-sky-50/60">
              <input
                type="radio"
                name="passportMode"
                value="full"
                checked={passportMode === "full"}
                onChange={() => setPassportMode("full")}
                disabled={isLoading}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-semibold text-slate-900">
                  Full
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-slate-600">
                  Export complete passport numbers for airport operations.
                </span>
              </span>
            </label>
          </fieldset>

          <p className="mt-3 text-xs leading-5 text-amber-800">
            Full passport numbers are sensitive traveler data. This export will
            be recorded in the audit log.
          </p>

          <label
            htmlFor={passwordInputId}
            className="mt-4 block text-sm font-medium text-slate-700"
          >
            Confirm your password
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

          {error ? (
            <p className="mt-2 text-xs font-medium text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={closeDialog}
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
              {isLoading ? "Exporting..." : "Export Excel"}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
