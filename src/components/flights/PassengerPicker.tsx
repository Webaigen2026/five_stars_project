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
  onChange: (
    next: PassengerComposition
  ) => void;
  describedBy?: string;
};

function ChevronDownIcon({
  open,
}: {
  open: boolean;
}) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className={[
        "h-4 w-4 transition-transform duration-200",
        open
          ? "rotate-180"
          : "rotate-0",
      ].join(" ")}
    >
      <path
        d="m5.5 7.5 4.5 4.5 4.5-4.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function PassengerPicker({
  value,
  onChange,
  describedBy,
}: PassengerPickerProps) {
  const [open, setOpen] =
    useState(false);

  const rootRef =
    useRef<HTMLDivElement>(null);

  const triggerRef =
    useRef<HTMLButtonElement>(null);

  const panelId = useId();

  const total =
    totalPassengers(value);

  const label =
    formatPassengerCountLabel(total);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(
      event: MouseEvent
    ) {
      if (
        !rootRef.current?.contains(
          event.target as Node
        )
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(
      event: globalThis.KeyboardEvent
    ) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener(
      "mousedown",
      handlePointerDown
    );

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handlePointerDown
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [open]);

  function toggleOpen() {
    setOpen(
      (current) => !current
    );
  }

  function handleReset() {
    onChange({
      ...DEFAULT_PASSENGER_COMPOSITION,
    });
  }

  function handleDone() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleTriggerKeyDown(
    event: KeyboardEvent<HTMLButtonElement>
  ) {
    if (
      (event.key === "ArrowDown" ||
        event.key === "Enter" ||
        event.key === " ") &&
      !open
    ) {
      event.preventDefault();
      setOpen(true);
    }
  }

  return (
    <div
      ref={rootRef}
      className="relative min-w-0"
    >
      <button
        ref={triggerRef}
        id="passenger-picker-trigger"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        aria-describedby={describedBy}
        onClick={toggleOpen}
        onKeyDown={
          handleTriggerKeyDown
        }
        className="
          group
          flex
          h-[76px]
          w-full
          items-center
          justify-between
          gap-3
          rounded-md
          border
          border-slate-300
          bg-white
          px-3.5
          py-2
          text-left
          transition
          hover:border-slate-400
          focus-visible:border-[#0078D2]
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-[#0078D2]/25
        "
      >
        <span className="min-w-0">
          <span className="block text-xs font-semibold leading-4 text-slate-500">
            Passengers
          </span>

          <span className="mt-1 block truncate text-base font-semibold leading-6 text-slate-900">
            {label}
          </span>
        </span>

        <span className="shrink-0 text-slate-400 transition-colors group-hover:text-[#0078D2]">
          <ChevronDownIcon
            open={open}
          />
        </span>
      </button>

      <input
        type="hidden"
        name="passengers"
        value={String(total)}
        readOnly
      />

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Select passengers"
          className="
            absolute
            left-0
            right-0
            z-50
            mt-2
            w-full
            overflow-hidden
            border
            border-slate-200
            bg-white
            shadow-[0_18px_50px_rgba(15,23,42,0.14)]
            sm:left-auto
            sm:right-0
            sm:w-[24rem]
            sm:max-w-[calc(100vw-2rem)]
          "
        >
          <div className="border-b border-slate-200 px-5 py-4">
            <p className="font-american-sans text-xl font-light tracking-[-0.015em] text-slate-950">
              Travelers
            </p>

            <p className="mt-1 text-sm leading-5 text-slate-500">
              Select up to{" "}
              {MAX_TRAVELERS} travelers
              for this booking.
            </p>
          </div>

          <ul className="divide-y divide-slate-200">
            {PASSENGER_CATEGORIES.map(
              (category) => {
                const count =
                  value[category.key];

                const minusDisabled =
                  !canDecrement(
                    value,
                    category.key
                  );

                const plusDisabled =
                  !canIncrement(
                    value,
                    category.key
                  );

                return (
                  <li
                    key={category.key}
                    className="flex items-center justify-between gap-5 px-5 py-4"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-base font-semibold text-slate-950">
                        {category.label}
                      </p>

                      <p className="mt-0.5 text-sm leading-5 text-slate-500">
                        {
                          category.description
                        }
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <button
                        type="button"
                        aria-label={
                          category.removeLabel
                        }
                        disabled={
                          minusDisabled
                        }
                        onClick={() =>
                          onChange(
                            adjustPassengerComposition(
                              value,
                              category.key,
                              -1
                            )
                          )
                        }
                        className="
                          inline-flex
                          h-9
                          w-9
                          items-center
                          justify-center
                          rounded-full
                          border
                          border-slate-300
                          bg-white
                          text-lg
                          font-medium
                          text-slate-700
                          transition
                          hover:border-[#0078D2]
                          hover:text-[#0078D2]
                          focus-visible:outline-none
                          focus-visible:ring-2
                          focus-visible:ring-[#0078D2]/30
                          disabled:cursor-not-allowed
                          disabled:border-slate-200
                          disabled:bg-slate-100
                          disabled:text-slate-400
                        "
                      >
                        −
                      </button>

                      <span
                        aria-live="polite"
                        className="fs-nums w-7 text-center text-base font-semibold text-slate-950"
                      >
                        {count}
                      </span>

                      <button
                        type="button"
                        aria-label={
                          category.addLabel
                        }
                        disabled={
                          plusDisabled
                        }
                        onClick={() =>
                          onChange(
                            adjustPassengerComposition(
                              value,
                              category.key,
                              1
                            )
                          )
                        }
                        className="
                          inline-flex
                          h-9
                          w-9
                          items-center
                          justify-center
                          rounded-full
                          border
                          border-[#0078D2]
                          bg-[#0078D2]
                          text-lg
                          font-medium
                          text-white
                          transition
                          hover:bg-[#006bbd]
                          focus-visible:outline-none
                          focus-visible:ring-2
                          focus-visible:ring-[#0078D2]/30
                          disabled:cursor-not-allowed
                          disabled:border-slate-200
                          disabled:bg-slate-100
                          disabled:text-slate-400
                        "
                      >
                        +
                      </button>
                    </div>
                  </li>
                );
              }
            )}
          </ul>

          <div className="border-t border-slate-200 bg-slate-50/70 px-5 py-4">
            <div className="mb-4 flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-slate-500">
                Total travelers
              </p>

              <p className="fs-nums text-sm font-semibold text-slate-950">
                {label}
              </p>
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078D2]/30"
              >
                Reset
              </button>

              <button
                type="button"
                onClick={handleDone}
                className="min-w-[7rem] bg-[#0078D2] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#006bbd] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078D2]/30"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}