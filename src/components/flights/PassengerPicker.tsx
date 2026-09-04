"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import {
  adjustPassengerComposition,
  canDecrement,
  canIncrement,
  DEFAULT_PASSENGER_COMPOSITION,
  formatPassengerCountLabel,
  MAX_TRAVELERS,
  PASSENGER_CATEGORIES,
  totalPassengers,
  type PassengerComposition,
} from "../../lib/passenger-composition";

type PassengerPickerProps = {
  value: PassengerComposition;
  onChange: (next: PassengerComposition) => void;
  describedBy?: string;
};

export default function PassengerPicker({
  value,
  onChange,
  describedBy,
}: PassengerPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const total = totalPassengers(value);
  const label = formatPassengerCountLabel(total);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function toggleOpen() {
    setOpen((current) => !current);
  }

  function handleReset() {
    onChange({ ...DEFAULT_PASSENGER_COMPOSITION });
  }

  function handleDone() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" && !open) {
      event.preventDefault();
      setOpen(true);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <label
        htmlFor="passenger-picker-trigger"
        className="mb-2 block text-sm font-medium text-slate-700"
      >
        Passengers
      </label>

      <button
        ref={triggerRef}
        id="passenger-picker-trigger"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        aria-describedby={describedBy}
        onClick={toggleOpen}
        onKeyDown={handleTriggerKeyDown}
        className="flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-4 py-3 text-left text-slate-900 outline-none transition hover:border-primary focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
      >
        <span className="font-medium">{label}</span>
        <span aria-hidden="true" className="text-slate-400">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {/* Hidden input keeps native form semantics for total passenger count. */}
      <input type="hidden" name="passengers" value={String(total)} readOnly />

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Select passengers"
          className="absolute left-0 right-0 z-30 mt-2 w-full min-w-[18rem] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:left-auto sm:right-0 sm:w-[22rem]"
        >
          <p className="text-xs text-slate-500">
            Maximum {MAX_TRAVELERS} travelers per booking.
          </p>

          <ul className="mt-4 space-y-4">
            {PASSENGER_CATEGORIES.map((category) => {
              const count = value[category.key];
              const minusDisabled = !canDecrement(value, category.key);
              const plusDisabled = !canIncrement(value, category.key);

              return (
                <li
                  key={category.key}
                  className="flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-950">
                      {category.label}
                    </p>
                    <p className="text-sm text-slate-500">
                      {category.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={category.removeLabel}
                      disabled={minusDisabled}
                      onClick={() =>
                        onChange(
                          adjustPassengerComposition(value, category.key, -1)
                        )
                      }
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-lg font-semibold text-slate-700 transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                    >
                      −
                    </button>
                    <span
                      aria-live="polite"
                      className="w-6 text-center text-base font-semibold text-slate-950"
                    >
                      {count}
                    </span>
                    <button
                      type="button"
                      aria-label={category.addLabel}
                      disabled={plusDisabled}
                      onClick={() =>
                        onChange(
                          adjustPassengerComposition(value, category.key, 1)
                        )
                      }
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-primary/30 bg-sky-50 text-lg font-semibold text-primary transition hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-300"
                    >
                      +
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={handleReset}
              className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              Reset
            </button>

            <p className="text-sm font-medium text-slate-700">
              Total: {label}
            </p>

            <button
              type="button"
              onClick={handleDone}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              Done
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
