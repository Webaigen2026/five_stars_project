"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type SVGProps,
} from "react";

import { createPortal } from "react-dom";

import {
  format,
  isValid,
  parse,
  startOfDay,
} from "date-fns";

import {
  DayPicker,
  type DateRange,
} from "react-day-picker";

import "react-day-picker/style.css";

import type { TripType } from "../../lib/flight-search";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type FlightDateRangePickerProps = {
  tripType: TripType;
  departure: string;
  returnDate: string;
  onDepartureChange: (value: string) => void;
  onReturnChange: (value: string) => void;
};

type ActiveField = "departure" | "return";

type PopoverPosition = {
  top: number;
  left: number;
  width: number;
};

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const YMD_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const BRAND_BLUE = "#0078D2";

const dayPickerStyle = {
  "--rdp-accent-color": BRAND_BLUE,
  "--rdp-accent-background-color": "#eaf4fb",
  "--rdp-range_middle-background-color": "#eef6fb",
  "--rdp-range_middle-color": "#0f172a",
  "--rdp-today-color": BRAND_BLUE,

  "--rdp-day-height": "40px",
  "--rdp-day-width": "40px",

  "--rdp-day_button-height": "38px",
  "--rdp-day_button-width": "38px",

  "--rdp-selected-border": `2px solid ${BRAND_BLUE}`,
} as CSSProperties;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}

function ymdToLocalDate(
  value: string
): Date | undefined {
  const trimmed = value.trim();

  if (!YMD_PATTERN.test(trimmed)) {
    return undefined;
  }

  const parsed = parse(
    trimmed,
    "yyyy-MM-dd",
    new Date()
  );

  if (!isValid(parsed)) {
    return undefined;
  }

  if (
    format(parsed, "yyyy-MM-dd") !== trimmed
  ) {
    return undefined;
  }

  return parsed;
}

function localDateToYmd(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function formatDisplayYmd(value: string): string {
  const date = ymdToLocalDate(value);

  if (!date) {
    return "";
  }

  return format(date, "MMM d, yyyy");
}

/* -------------------------------------------------------------------------- */
/* Icons                                                                      */
/* -------------------------------------------------------------------------- */

function CalendarIcon(
  props: SVGProps<SVGSVGElement>
) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect
        x="3"
        y="5"
        width="18"
        height="16"
        rx="1.5"
      />

      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  );
}

function ChevronLeftIcon(
  props: SVGProps<SVGSVGElement>
) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon(
  props: SVGProps<SVGSVGElement>
) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Date field                                                                 */
/* -------------------------------------------------------------------------- */

function DateFieldButton({
  id,
  label,
  value,
  placeholder,
  expanded,
  controlsId,
  onClick,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  expanded: boolean;
  controlsId: string;
  onClick: () => void;
}) {
  const display = formatDisplayYmd(value);

  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      aria-haspopup="dialog"
      aria-controls={controlsId}
      className={cn(
        /*
         * Important:
         * Search button and the other booking controls
         * are 72px high, so this field is also 72px.
         */
        "group flex h-[72px] w-full items-center gap-3",
        "border bg-white px-3.5 text-left",
        "transition-[border-color,box-shadow,background-color] duration-150",

        expanded
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
          {label}
        </span>

        <span
          className={cn(
            "mt-1 block truncate",
            "text-[15px] font-medium leading-5",

            display
              ? "text-slate-950"
              : "text-slate-400"
          )}
        >
          {display || placeholder}
        </span>
      </span>

      <CalendarIcon
        className={cn(
          "h-[16px] w-[16px] shrink-0",
          "transition-colors duration-150",

          expanded
            ? "text-[#0078D2]"
            : "text-slate-500 group-hover:text-slate-700"
        )}
      />
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function FlightDateRangePicker({
  tripType,
  departure,
  returnDate,
  onDepartureChange,
  onReturnChange,
}: FlightDateRangePickerProps) {
  const popoverId = useId();

  const rootRef =
    useRef<HTMLDivElement>(null);

  const popoverRef =
    useRef<HTMLDivElement>(null);

  const [open, setOpen] =
    useState(false);

  const [activeField, setActiveField] =
    useState<ActiveField>("departure");

  const [isWide, setIsWide] =
    useState(false);

  const [popoverPos, setPopoverPos] =
    useState<PopoverPosition | null>(null);

  const isRoundTrip =
    tripType === "round-trip";

  const departureDate =
    ymdToLocalDate(departure);

  const returnLocalDate =
    ymdToLocalDate(returnDate);

  const today =
    startOfDay(new Date());

  const selectedRange:
    | DateRange
    | undefined = isRoundTrip
    ? {
        from: departureDate,
        to: returnLocalDate,
      }
    : undefined;

  /* ------------------------------------------------------------------------ */
  /* Responsive calendar                                                      */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    const media = window.matchMedia(
      "(min-width: 900px)"
    );

    const sync = () => {
      setIsWide(media.matches);
    };

    sync();

    media.addEventListener(
      "change",
      sync
    );

    return () => {
      media.removeEventListener(
        "change",
        sync
      );
    };
  }, []);

  /* ------------------------------------------------------------------------ */
  /* Position popover                                                         */
  /* ------------------------------------------------------------------------ */

  useLayoutEffect(() => {
    if (!open) {
      setPopoverPos(null);
      return;
    }

    function updatePosition() {
      const anchor = rootRef.current;

      if (!anchor) {
        return;
      }

      const rect =
        anchor.getBoundingClientRect();

      /*
       * Two calendars for round trip on desktop.
       * One calendar everywhere else.
       */
      const preferredWidth =
        isRoundTrip && isWide
          ? Math.min(
              700,
              window.innerWidth - 24
            )
          : Math.min(
              370,
              window.innerWidth - 24
            );

      const viewportPadding = 12;

      let left = rect.left;

      if (
        left + preferredWidth >
        window.innerWidth - viewportPadding
      ) {
        left =
          window.innerWidth -
          preferredWidth -
          viewportPadding;
      }

      left = Math.max(
        viewportPadding,
        left
      );

      const estimatedHeight =
        isRoundTrip && isWide
          ? 440
          : 460;

      const spaceBelow =
        window.innerHeight - rect.bottom;

      const shouldOpenAbove =
        spaceBelow < estimatedHeight &&
        rect.top > estimatedHeight;

      const top = shouldOpenAbove
        ? Math.max(
            viewportPadding,
            rect.top -
              estimatedHeight -
              8
          )
        : rect.bottom + 8;

      setPopoverPos({
        top,
        left,
        width: preferredWidth,
      });
    }

    updatePosition();

    window.addEventListener(
      "resize",
      updatePosition
    );

    window.addEventListener(
      "scroll",
      updatePosition,
      true
    );

    return () => {
      window.removeEventListener(
        "resize",
        updatePosition
      );

      window.removeEventListener(
        "scroll",
        updatePosition,
        true
      );
    };
  }, [
    open,
    isRoundTrip,
    isWide,
  ]);

  /* ------------------------------------------------------------------------ */
  /* Close on outside click / Escape                                          */
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
        rootRef.current?.contains(target)
      ) {
        return;
      }

      if (
        popoverRef.current?.contains(target)
      ) {
        return;
      }

      setOpen(false);
    }

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (event.key === "Escape") {
        setOpen(false);
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
  /* Trip type changed                                                        */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!isRoundTrip) {
      setActiveField("departure");
    }
  }, [isRoundTrip]);

  /* ------------------------------------------------------------------------ */
  /* Open field                                                               */
  /* ------------------------------------------------------------------------ */

  function openField(
    field: ActiveField
  ) {
    setActiveField(field);
    setOpen(true);
  }

  /* ------------------------------------------------------------------------ */
  /* Clear                                                                    */
  /* ------------------------------------------------------------------------ */

  function handleClear() {
    if (
      isRoundTrip &&
      activeField === "return"
    ) {
      onReturnChange("");
      return;
    }

    onDepartureChange("");
    onReturnChange("");
  }

  /* ------------------------------------------------------------------------ */
  /* Done                                                                     */
  /* ------------------------------------------------------------------------ */

  function handleDone() {
    setOpen(false);
  }

  /* ------------------------------------------------------------------------ */
  /* One-way selection                                                        */
  /* ------------------------------------------------------------------------ */

  function handleSingleSelect(
    date: Date | undefined
  ) {
    if (!date) {
      onDepartureChange("");
      return;
    }

    onDepartureChange(
      localDateToYmd(date)
    );

    /*
     * One-way travel only needs one date.
     * Close immediately after selection.
     */
    setOpen(false);
  }

  /* ------------------------------------------------------------------------ */
  /* Round-trip selection                                                     */
  /* ------------------------------------------------------------------------ */

  function handleRangeSelect(
    range: DateRange | undefined
  ) {
    if (!range?.from) {
      onDepartureChange("");
      onReturnChange("");
      setActiveField("departure");
      return;
    }

    const nextDeparture =
      localDateToYmd(range.from);

    onDepartureChange(
      nextDeparture
    );

    /*
     * First click = departure.
     * Keep calendar open and guide the user
     * toward selecting a return date.
     */
    if (!range.to) {
      onReturnChange("");
      setActiveField("return");
      return;
    }

    const nextReturn =
      localDateToYmd(range.to);

    onReturnChange(
      nextReturn
    );

    setActiveField("return");
  }

  /* ------------------------------------------------------------------------ */
  /* Calendar settings                                                        */
  /* ------------------------------------------------------------------------ */

  const numberOfMonths =
    isRoundTrip && isWide
      ? 2
      : 1;

  const defaultMonth =
    activeField === "return" &&
    returnLocalDate
      ? returnLocalDate
      : departureDate ?? today;

  /* ------------------------------------------------------------------------ */
  /* Popover                                                                  */
  /* ------------------------------------------------------------------------ */

  const popover =
    open && popoverPos
      ? createPortal(
          <div
            ref={popoverRef}
            id={popoverId}
            role="dialog"
            aria-modal="false"
            aria-label={
              isRoundTrip
                ? "Select departure and return dates"
                : "Select departure date"
            }
            style={{
              position: "fixed",
              top: popoverPos.top,
              left: popoverPos.left,
              width: popoverPos.width,
              zIndex: 100,
            }}
            className="
              border
              border-slate-200
              bg-white
              shadow-[0_18px_50px_rgba(15,23,42,0.16)]
            "
          >
            {/* -------------------------------------------------------- */}
            {/* Calendar header                                          */}
            {/* -------------------------------------------------------- */}

            <div
              className="
                flex
                items-start
                justify-between
                gap-5
                border-b
                border-slate-200
                px-5
                py-4
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
                  {isRoundTrip
                    ? activeField === "departure"
                      ? "Departure"
                      : "Return"
                    : "Travel date"}
                </p>

                <p
                  className="
                    mt-1
                    text-[14px]
                    font-medium
                    text-slate-950
                  "
                >
                  {isRoundTrip
                    ? activeField === "departure"
                      ? "Select your departure date"
                      : "Select your return date"
                    : "Select your departure date"}
                </p>
              </div>

              {isRoundTrip ? (
                <div
                  className="
                    hidden
                    items-center
                    gap-2
                    text-[12px]
                    text-slate-500
                    sm:flex
                  "
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center border text-[11px] font-semibold",
                      activeField === "departure"
                        ? "border-[#0078D2] bg-[#0078D2] text-white"
                        : "border-slate-300 bg-white text-slate-500"
                    )}
                  >
                    1
                  </span>

                  <span>Depart</span>

                  <span className="mx-1 h-px w-5 bg-slate-300" />

                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center border text-[11px] font-semibold",
                      activeField === "return"
                        ? "border-[#0078D2] bg-[#0078D2] text-white"
                        : "border-slate-300 bg-white text-slate-500"
                    )}
                  >
                    2
                  </span>

                  <span>Return</span>
                </div>
              ) : null}
            </div>

            {/* -------------------------------------------------------- */}
            {/* Calendar                                                 */}
            {/* -------------------------------------------------------- */}

            <div className="p-4">
              {isRoundTrip ? (
                <DayPicker
                  mode="range"
                  selected={selectedRange}
                  onSelect={handleRangeSelect}
                  numberOfMonths={
                    numberOfMonths
                  }
                  defaultMonth={
                    defaultMonth
                  }
                  disabled={{
                    before: today,
                  }}
                  showOutsideDays={false}
                  className="fs-flight-day-picker"
                  style={dayPickerStyle}
                  components={{
                    Chevron: ({
                      orientation,
                      ...props
                    }) =>
                      orientation ===
                      "left" ? (
                        <ChevronLeftIcon
                          {...props}
                          className="h-4 w-4"
                        />
                      ) : (
                        <ChevronRightIcon
                          {...props}
                          className="h-4 w-4"
                        />
                      ),
                  }}
                />
              ) : (
                <DayPicker
                  mode="single"
                  selected={
                    departureDate
                  }
                  onSelect={
                    handleSingleSelect
                  }
                  numberOfMonths={1}
                  defaultMonth={
                    defaultMonth
                  }
                  disabled={{
                    before: today,
                  }}
                  showOutsideDays={false}
                  className="fs-flight-day-picker"
                  style={dayPickerStyle}
                  components={{
                    Chevron: ({
                      orientation,
                      ...props
                    }) =>
                      orientation ===
                      "left" ? (
                        <ChevronLeftIcon
                          {...props}
                          className="h-4 w-4"
                        />
                      ) : (
                        <ChevronRightIcon
                          {...props}
                          className="h-4 w-4"
                        />
                      ),
                  }}
                />
              )}
            </div>

            {/* -------------------------------------------------------- */}
            {/* Footer                                                   */}
            {/* -------------------------------------------------------- */}

            <div
              className="
                flex
                items-center
                justify-between
                gap-4
                border-t
                border-slate-200
                px-5
                py-3
              "
            >
              <button
                type="button"
                onClick={
                  handleClear
                }
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
                  focus-visible:ring-[#0078D2]/30
                "
              >
                {isRoundTrip &&
                activeField === "return"
                  ? "Clear return"
                  : "Clear dates"}
              </button>

              <div className="flex items-center gap-4">
                {isRoundTrip &&
                departure &&
                !returnDate ? (
                  <span
                    className="
                      hidden
                      text-[12px]
                      text-slate-500
                      sm:inline
                    "
                  >
                    Now select your return
                  </span>
                ) : null}

                <button
                  type="button"
                  onClick={
                    handleDone
                  }
                  className="
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
          </div>,
          document.body
        )
      : null;

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative",

        /*
         * For round trips, the component becomes
         * departure + return.
         */
        isRoundTrip &&
          "grid gap-2 md:col-span-2 md:grid-cols-2"
      )}
    >
      {/* Departure */}

      <DateFieldButton
        id="departure"
        label="Depart"
        value={departure}
        placeholder="Select date"
        expanded={
          open &&
          activeField === "departure"
        }
        controlsId={popoverId}
        onClick={() =>
          openField("departure")
        }
      />

      {/* Return */}

      {isRoundTrip ? (
        <DateFieldButton
          id="returnDate"
          label="Return"
          value={returnDate}
          placeholder="Select date"
          expanded={
            open &&
            activeField === "return"
          }
          controlsId={popoverId}
          onClick={() =>
            openField("return")
          }
        />
      ) : null}

      {/* Form values */}

      <input
        type="hidden"
        name="departure"
        value={departure}
        readOnly
      />

      {isRoundTrip ? (
        <input
          type="hidden"
          name="returnDate"
          value={returnDate}
          readOnly
        />
      ) : null}

      {popover}
    </div>
  );
}