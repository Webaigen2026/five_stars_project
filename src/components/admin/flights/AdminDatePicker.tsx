"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import {
  formatAdminDateLabel,
  isValidAdminCalendarDate,
} from "../../../lib/admin-datetime";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

type AdminDatePickerProps = {
  id: string;
  label: string;
  value: string | null;
  onChange: (date: string) => void;
  /** YYYY-MM-DD in the relevant airport timezone (optional today hint). */
  todayDate?: string | null;
};

function parseYearMonthDay(date: string) {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function toDateString(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function shiftMonth(year: number, month: number, delta: number) {
  const index = year * 12 + (month - 1) + delta;
  const nextYear = Math.floor(index / 12);
  const nextMonth = (index % 12) + 1;
  return { year: nextYear, month: nextMonth };
}

function buildMonthCells(year: number, month: number) {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: Array<{ date: string; day: number } | null> = [];

  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ date: toDateString(year, month, day), day });
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

export default function AdminDatePicker({
  id,
  label,
  value,
  onChange,
  todayDate = null,
}: AdminDatePickerProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const selected = value && isValidAdminCalendarDate(value) ? value : null;
  const initialParts =
    parseYearMonthDay(selected ?? todayDate ?? "") ??
    parseYearMonthDay("2026-09-01")!;

  const [viewYear, setViewYear] = useState(initialParts.year);
  const [viewMonth, setViewMonth] = useState(initialParts.month);

  useEffect(() => {
    if (!open) {
      return;
    }

    const parts = parseYearMonthDay(selected ?? todayDate ?? "");
    if (parts) {
      setViewYear(parts.year);
      setViewMonth(parts.month);
    }
  }, [open, selected, todayDate]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(Date.UTC(viewYear, viewMonth - 1, 1, 12))),
    [viewMonth, viewYear]
  );

  const cells = useMemo(
    () => buildMonthCells(viewYear, viewMonth),
    [viewMonth, viewYear]
  );

  const display = selected ? formatAdminDateLabel(selected) : "Select date";

  return (
    <div ref={rootRef} className="relative">
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium text-slate-700"
      >
        {label}
      </label>
      <button
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-left text-sm text-slate-950 outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
      >
        <span className={selected ? "font-medium" : "text-slate-500"}>
          {display}
        </span>
        <span aria-hidden="true" className="text-slate-400">
          <svg
            viewBox="0 0 20 20"
            fill="none"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <rect
              x="3"
              y="4"
              width="14"
              height="13"
              rx="2"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M3 8h14M7 2.5v3M13 2.5v3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </button>

      {open ? (
        <div
          id={listboxId}
          role="dialog"
          aria-label={`${label} calendar`}
          className="absolute z-30 mt-2 w-[min(100%,20rem)] rounded-2xl border border-slate-200 bg-white p-4 shadow-lg"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => {
                const next = shiftMonth(viewYear, viewMonth, -1);
                setViewYear(next.year);
                setViewMonth(next.month);
              }}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              ‹
            </button>
            <p className="text-sm font-semibold text-slate-950">{monthLabel}</p>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => {
                const next = shiftMonth(viewYear, viewMonth, 1);
                setViewYear(next.year);
                setViewMonth(next.month);
              }}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
            {WEEKDAYS.map((day) => (
              <span key={day} className="py-1">
                {day}
              </span>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((cell, index) => {
              if (!cell) {
                return <span key={`empty-${index}`} className="h-9" />;
              }

              const isSelected = cell.date === selected;
              const isToday = cell.date === todayDate;

              return (
                <button
                  key={cell.date}
                  type="button"
                  aria-label={formatAdminDateLabel(cell.date)}
                  aria-pressed={isSelected}
                  onClick={() => {
                    onChange(cell.date);
                    setOpen(false);
                  }}
                  className={[
                    "h-9 rounded-lg text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                    isSelected
                      ? "bg-primary text-white"
                      : isToday
                        ? "bg-sky-50 text-primary"
                        : "text-slate-800 hover:bg-slate-100",
                  ].join(" ")}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
