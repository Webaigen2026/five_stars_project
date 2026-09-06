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

type FlightDateRangePickerProps = {
  tripType: TripType;
  departure: string;
  returnDate: string;
  onDepartureChange: (value: string) => void;
  onReturnChange: (value: string) => void;
};

const YMD_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SELECTED_BLUE = "#0078D2";
const RANGE_GRAY = "#e2e8f0";

const dayPickerStyle = {
  "--rdp-accent-color": SELECTED_BLUE,
  "--rdp-accent-background-color": RANGE_GRAY,
  "--rdp-range_middle-background-color": RANGE_GRAY,
  "--rdp-today-color": SELECTED_BLUE,
  "--rdp-day-height": "40px",
  "--rdp-day-width": "40px",
  "--rdp-day_button-height": "38px",
  "--rdp-day_button-width": "38px",
  "--rdp-selected-border": `2px solid ${SELECTED_BLUE}`,
} as CSSProperties;

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

  return date
    ? format(date, "yyyy/MM/dd")
    : "";
}

function CalendarIcon(
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
      <rect
        x="3"
        y="5"
        width="18"
        height="16"
        rx="2"
      />
      <path d="M8 3v4M16 3v4M3 11h18" />
    </svg>
  );
}

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
        "flex h-[76px] w-full items-center gap-3 rounded-md border bg-white px-3.5 py-2 text-left transition",
        "border-slate-300 hover:border-slate-400",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078D2]/30",
        expanded &&
          "border-[#0078D2] ring-2 ring-[#0078D2]/25"
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold leading-4 text-slate-500">
          {label}
        </span>

        <span
          className={cn(
            "mt-1 block truncate text-base font-medium leading-6",
            display
              ? "text-slate-950"
              : "text-slate-400"
          )}
        >
          {display || placeholder}
        </span>
      </span>

      <CalendarIcon className="h-4 w-4 shrink-0 text-slate-500" />
    </button>
  );
}

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

  const [open, setOpen] = useState(false);

  const [activeField, setActiveField] =
    useState<"departure" | "return">(
      "departure"
    );

  const [isWide, setIsWide] =
    useState(false);

  const [popoverPos, setPopoverPos] =
    useState<{
      top: number;
      left: number;
      width: number;
    } | null>(null);

  const isRoundTrip =
    tripType === "round-trip";

  const departureDate =
    ymdToLocalDate(departure);

  const returnLocalDate =
    ymdToLocalDate(returnDate);

  const today = startOfDay(new Date());

  const selectedRange:
    | DateRange
    | undefined = isRoundTrip
    ? {
        from: departureDate,
        to: returnLocalDate,
      }
    : undefined;

  useEffect(() => {
    const media = window.matchMedia(
      "(min-width: 768px)"
    );

    const sync = () =>
      setIsWide(media.matches);

    sync();

    media.addEventListener(
      "change",
      sync
    );

    return () =>
      media.removeEventListener(
        "change",
        sync
      );
  }, []);

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

      const preferredWidth =
        isRoundTrip && isWide
          ? Math.min(
              640,
              window.innerWidth - 16
            )
          : Math.min(
              352,
              window.innerWidth - 16
            );

      const left = Math.min(
        Math.max(8, rect.left),
        Math.max(
          8,
          window.innerWidth -
            preferredWidth -
            8
        )
      );

      setPopoverPos({
        top: rect.bottom + 8,
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
  }, [open, isRoundTrip, isWide]);

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

  function openField(
    field: "departure" | "return"
  ) {
    setActiveField(field);
    setOpen(true);
  }

  function handleClear() {
    onDepartureChange("");
    onReturnChange("");
  }

  function handleDone() {
    setOpen(false);
  }

  function handleSingleSelect(
    date: Date | undefined
  ) {
    onDepartureChange(
      date ? localDateToYmd(date) : ""
    );
  }

  function handleRangeSelect(
    range: DateRange | undefined
  ) {
    if (!range?.from) {
      onDepartureChange("");
      onReturnChange("");
      return;
    }

    const nextDeparture =
      localDateToYmd(range.from);

    onDepartureChange(nextDeparture);

    if (range.to) {
      onReturnChange(
        localDateToYmd(range.to)
      );
    } else {
      onReturnChange("");
    }
  }

  const numberOfMonths =
    isRoundTrip && isWide ? 2 : 1;

  const defaultMonth =
    departureDate ?? today;

  const popover =
    open && popoverPos
      ? createPortal(
          <div
            ref={popoverRef}
            id={popoverId}
            role="dialog"
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
              zIndex: 80,
            }}
            className="rounded-lg border border-slate-200 bg-white p-3 shadow-xl"
          >
            {isRoundTrip ? (
              <DayPicker
                mode="range"
                selected={selectedRange}
                onSelect={
                  handleRangeSelect
                }
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
              />
            ) : (
              <DayPicker
                mode="single"
                selected={departureDate}
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
              />
            )}

            <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078D2]/30"
              >
                Clear
              </button>

              <button
                type="button"
                onClick={handleDone}
                className="bg-[#0078D2] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0066b3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078D2]/30"
              >
                Done
              </button>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative",
        isRoundTrip &&
          "grid gap-4 md:col-span-2 md:grid-cols-2"
      )}
    >
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