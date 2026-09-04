"use client";

import type { AdminTimePeriod } from "../../../lib/admin-datetime";
import { formatAdminTimeLabel, hour12To24 } from "../../../lib/admin-datetime";

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
const MINUTES = Array.from({ length: 60 }, (_, index) => index);

const selectClassName =
  "rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-medium text-slate-950 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

type AdminTimePickerProps = {
  id: string;
  label: string;
  hour12: number | null;
  minute: number | null;
  period: AdminTimePeriod | null;
  onChange: (next: {
    hour12: number;
    minute: number;
    period: AdminTimePeriod;
  }) => void;
};

export default function AdminTimePicker({
  id,
  label,
  hour12,
  minute,
  period,
  onChange,
}: AdminTimePickerProps) {
  const isComplete = hour12 != null && minute != null && period != null;
  const summary = isComplete
    ? formatAdminTimeLabel(hour12To24(hour12, period), minute)
    : "Select hour, minute, and AM/PM";

  function emit(next: {
    hour12: number | null;
    minute: number | null;
    period: AdminTimePeriod | null;
  }) {
    if (next.hour12 == null || next.minute == null || next.period == null) {
      return;
    }

    onChange({
      hour12: next.hour12,
      minute: next.minute,
      period: next.period,
    });
  }

  return (
    <div>
      <p className="mb-2 block text-sm font-medium text-slate-700">{label}</p>

      <div className="flex flex-wrap items-center gap-2">
        <select
          id={`${id}-hour`}
          aria-label={`${label} hour`}
          value={hour12 ?? ""}
          onChange={(event) => {
            const nextHour =
              event.target.value === "" ? null : Number(event.target.value);
            emit({
              hour12: nextHour,
              minute: minute ?? 0,
              period: period ?? "AM",
            });
          }}
          className={selectClassName}
        >
          <option value="">Hour</option>
          {HOURS.map((hour) => (
            <option key={hour} value={hour}>
              {hour}
            </option>
          ))}
        </select>

        <span aria-hidden="true" className="text-lg font-semibold text-slate-400">
          :
        </span>

        <select
          id={`${id}-minute`}
          aria-label={`${label} minute`}
          value={minute ?? ""}
          onChange={(event) => {
            const nextMinute =
              event.target.value === "" ? null : Number(event.target.value);
            emit({
              hour12: hour12 ?? 12,
              minute: nextMinute,
              period: period ?? "AM",
            });
          }}
          className={selectClassName}
        >
          <option value="">Min</option>
          {MINUTES.map((value) => (
            <option key={value} value={value}>
              {String(value).padStart(2, "0")}
            </option>
          ))}
        </select>

        <select
          id={`${id}-period`}
          aria-label={`${label} AM or PM`}
          value={period ?? ""}
          onChange={(event) => {
            const nextPeriod =
              event.target.value === ""
                ? null
                : (event.target.value as AdminTimePeriod);
            emit({
              hour12: hour12 ?? 12,
              minute: minute ?? 0,
              period: nextPeriod,
            });
          }}
          className={selectClassName}
        >
          <option value="">AM/PM</option>
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>

        <span
          className={`ml-1 w-full text-sm sm:ml-2 sm:w-auto ${
            isComplete ? "font-medium text-slate-700" : "text-slate-500"
          }`}
        >
          {summary}
        </span>
      </div>
    </div>
  );
}
