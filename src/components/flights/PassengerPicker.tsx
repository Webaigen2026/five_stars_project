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

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type PassengerPickerProps = {
  value: PassengerComposition;

  onChange: (
    next: PassengerComposition
  ) => void;

  describedBy?: string;
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function cn(
  ...classes: Array<
    string | false | null | undefined
  >
): string {
  return classes.filter(Boolean).join(" ");
}

/* -------------------------------------------------------------------------- */
/* Icons                                                                      */
/* -------------------------------------------------------------------------- */

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
      className={cn(
        "h-4 w-4",
        "transition-transform duration-200",
        open ? "rotate-180" : "rotate-0"
      )}
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

function MinusIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className="h-[15px] w-[15px]"
    >
      <path
        d="M5 10h10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className="h-[15px] w-[15px]"
    >
      <path
        d="M10 5v10M5 10h10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Passenger Picker                                                           */
/* -------------------------------------------------------------------------- */

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

  const firstControlRef =
    useRef<HTMLButtonElement>(null);

  const panelId = useId();

  const total =
    totalPassengers(value);

  const label =
    formatPassengerCountLabel(total);

  /* ------------------------------------------------------------------------ */
  /* Outside click / Escape                                                   */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(
      event: MouseEvent
    ) {
      const target =
        event.target as Node | null;

      if (!target) {
        return;
      }

      if (
        !rootRef.current?.contains(target)
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

  /* ------------------------------------------------------------------------ */
  /* Open                                                                     */
  /* ------------------------------------------------------------------------ */

  function openPicker() {
    setOpen(true);
  }

  function closePicker() {
    setOpen(false);

    requestAnimationFrame(() => {
      triggerRef.current?.focus();
    });
  }

  function toggleOpen() {
    if (open) {
      closePicker();
      return;
    }

    openPicker();
  }

  /* ------------------------------------------------------------------------ */
  /* Reset                                                                    */
  /* ------------------------------------------------------------------------ */

  function handleReset() {
    onChange({
      ...DEFAULT_PASSENGER_COMPOSITION,
    });
  }

  /* ------------------------------------------------------------------------ */
  /* Done                                                                     */
  /* ------------------------------------------------------------------------ */

  function handleDone() {
    closePicker();
  }

  /* ------------------------------------------------------------------------ */
  /* Keyboard                                                                 */
  /* ------------------------------------------------------------------------ */

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

      openPicker();

      if (event.key === "ArrowDown") {
        requestAnimationFrame(() => {
          firstControlRef.current?.focus();
        });
      }
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <div
      ref={rootRef}
      className="relative min-w-0"
    >
      {/* ------------------------------------------------------------------ */}
      {/* Trigger                                                            */}
      {/* ------------------------------------------------------------------ */}

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
        className={cn(
          "group",
          "flex h-[72px] w-full",
          "items-center justify-between gap-3",

          "border bg-white px-3.5",
          "text-left",

          "transition-[border-color,box-shadow,background-color] duration-150",

          open
            ? "border-[#0078D2] ring-1 ring-[#0078D2]/15"
            : "border-slate-300 hover:border-slate-400",

          "focus-visible:outline-none",
          "focus-visible:border-[#0078D2]",
          "focus-visible:ring-2",
          "focus-visible:ring-[#0078D2]/20"
        )}
      >
        <span className="min-w-0 flex-1">
          <span
            className="
              block
              text-[11px]
              font-semibold
              leading-4
              text-slate-500
            "
          >
            Passengers
          </span>

          <span
            className="
              mt-1
              block
              truncate
              text-[15px]
              font-medium
              leading-5
              text-slate-950
            "
          >
            {label}
          </span>
        </span>

        <span
          className={cn(
            "shrink-0",
            "transition-colors duration-150",

            open
              ? "text-[#0078D2]"
              : "text-slate-500 group-hover:text-slate-700"
          )}
        >
          <ChevronDownIcon
            open={open}
          />
        </span>
      </button>

      {/* Form value */}

      <input
        type="hidden"
        name="passengers"
        value={String(total)}
        readOnly
      />

      {/* ------------------------------------------------------------------ */}
      {/* Dropdown                                                           */}
      {/* ------------------------------------------------------------------ */}

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Select passengers"
          className="
            absolute
            left-0
            right-0
            z-[70]
            mt-2

            w-full
            overflow-hidden

            border
            border-slate-200
            bg-white

            shadow-[0_18px_50px_rgba(15,23,42,0.15)]

            sm:left-auto
            sm:right-0
            sm:w-[390px]
            sm:max-w-[calc(100vw-24px)]
          "
        >
          {/* -------------------------------------------------------------- */}
          {/* Header                                                         */}
          {/* -------------------------------------------------------------- */}

          <div
            className="
              border-b
              border-slate-200
              px-5
              py-4
            "
          >
            <div
              className="
                flex
                items-start
                justify-between
                gap-5
              "
            >
              <div>
                <p
                  className="
                    text-[11px]
                    font-semibold
                    uppercase
                    tracking-[0.16em]
                    text-[#0078D2]
                  "
                >
                  Travelers
                </p>

                <h3
                  className="
                    mt-1
                    font-american-sans
                    text-[20px]
                    font-light
                    leading-7
                    tracking-[-0.02em]
                    text-slate-950
                  "
                >
                  Who is traveling?
                </h3>
              </div>

              <div className="shrink-0 text-right">
                <p
                  className="
                    fs-nums
                    text-[20px]
                    font-medium
                    leading-7
                    text-slate-950
                  "
                >
                  {total}
                </p>

                <p
                  className="
                    text-[11px]
                    text-slate-500
                  "
                >
                  {total === 1
                    ? "traveler"
                    : "travelers"}
                </p>
              </div>
            </div>

            <p
              className="
                mt-2
                max-w-[300px]
                text-[13px]
                leading-5
                text-slate-500
              "
            >
              Select up to{" "}
              {MAX_TRAVELERS} travelers
              for this reservation.
            </p>
          </div>

          {/* -------------------------------------------------------------- */}
          {/* Passenger categories                                           */}
          {/* -------------------------------------------------------------- */}

          <ul className="divide-y divide-slate-200">
            {PASSENGER_CATEGORIES.map(
              (category, index) => {
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
                    className="
                      flex
                      min-h-[82px]
                      items-center
                      justify-between
                      gap-5
                      px-5
                      py-3.5
                    "
                  >
                    {/* Description */}

                    <div className="min-w-0 pr-2">
                      <p
                        className="
                          text-[14px]
                          font-semibold
                          leading-5
                          text-slate-950
                        "
                      >
                        {category.label}
                      </p>

                      <p
                        className="
                          mt-0.5
                          text-[12px]
                          leading-[18px]
                          text-slate-500
                        "
                      >
                        {
                          category.description
                        }
                      </p>
                    </div>

                    {/* Counter */}

                    <div
                      className="
                        flex
                        shrink-0
                        items-center
                        gap-2
                      "
                    >
                      <button
                        ref={
                          index === 0
                            ? firstControlRef
                            : undefined
                        }
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

                          border
                          border-slate-300
                          bg-white
                          text-slate-700

                          transition-colors
                          duration-150

                          hover:border-[#0078D2]
                          hover:text-[#0078D2]

                          focus-visible:outline-none
                          focus-visible:ring-2
                          focus-visible:ring-[#0078D2]/25

                          disabled:cursor-not-allowed
                          disabled:border-slate-200
                          disabled:bg-slate-50
                          disabled:text-slate-300
                        "
                      >
                        <MinusIcon />
                      </button>

                      <span
                        aria-live="polite"
                        aria-atomic="true"
                        className="
                          fs-nums
                          w-8
                          text-center
                          text-[15px]
                          font-semibold
                          text-slate-950
                        "
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

                          border
                          border-[#0078D2]
                          bg-[#0078D2]
                          text-white

                          transition-colors
                          duration-150

                          hover:border-[#006bbd]
                          hover:bg-[#006bbd]

                          focus-visible:outline-none
                          focus-visible:ring-2
                          focus-visible:ring-[#0078D2]/30
                          focus-visible:ring-offset-1

                          active:bg-[#005fa8]

                          disabled:cursor-not-allowed
                          disabled:border-slate-200
                          disabled:bg-slate-100
                          disabled:text-slate-400
                        "
                      >
                        <PlusIcon />
                      </button>
                    </div>
                  </li>
                );
              }
            )}
          </ul>

          {/* -------------------------------------------------------------- */}
          {/* Footer                                                         */}
          {/* -------------------------------------------------------------- */}

          <div
            className="
              border-t
              border-slate-200
              bg-slate-50/60
              px-5
              py-4
            "
          >
            <div
              className="
                mb-3
                flex
                items-center
                justify-between
                gap-4
              "
            >
              <span
                className="
                  text-[12px]
                  font-medium
                  text-slate-500
                "
              >
                Total travelers
              </span>

              <span
                className="
                  fs-nums
                  text-[13px]
                  font-semibold
                  text-slate-950
                "
              >
                {label}
              </span>
            </div>

            <div
              className="
                flex
                items-center
                justify-between
                gap-3
              "
            >
              <button
                type="button"
                onClick={handleReset}
                className="
                  px-1
                  py-2

                  text-[13px]
                  font-medium
                  text-slate-500

                  transition-colors

                  hover:text-slate-950

                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-[#0078D2]/25
                "
              >
                Reset
              </button>

              <button
                type="button"
                onClick={handleDone}
                className="
                  min-w-[104px]
                  bg-[#0078D2]
                  px-5
                  py-2.5

                  text-[13px]
                  font-semibold
                  text-white

                  transition-colors

                  hover:bg-[#006bbd]

                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-[#0078D2]/30
                  focus-visible:ring-offset-2

                  active:bg-[#005fa8]
                "
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