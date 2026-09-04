"use client";

import { useEffect, useState } from "react";

import { formatAirportLabelFromCode } from "../../../data/airports";
import {
  combineAdminDateAndTime,
  splitDatetimeLocalForAdmin,
  type AdminTimePeriod,
} from "../../../lib/admin-datetime";
import {
  calendarDateInTimeZone,
  getAirportTimeZone,
} from "../../../lib/airport-timezones";
import AdminDatePicker from "./AdminDatePicker";
import AdminTimePicker from "./AdminTimePicker";

type AdminAirportDateTimeFieldProps = {
  id: string;
  title: string;
  helper: string;
  airportCode: string;
  airportCityFallback?: string;
  value: string;
  onChange: (datetimeLocal: string) => void;
};

export default function AdminAirportDateTimeField({
  id,
  title,
  helper,
  airportCode,
  airportCityFallback,
  value,
  onChange,
}: AdminAirportDateTimeFieldProps) {
  const timeZone = getAirportTimeZone(airportCode);
  const parsed = splitDatetimeLocalForAdmin(value);

  const [date, setDate] = useState<string | null>(parsed?.date ?? null);
  const [hour12, setHour12] = useState<number | null>(parsed?.hour12 ?? null);
  const [minute, setMinute] = useState<number | null>(parsed?.minute ?? null);
  const [period, setPeriod] = useState<AdminTimePeriod | null>(
    parsed?.period ?? null
  );

  useEffect(() => {
    const next = splitDatetimeLocalForAdmin(value);
    setDate(next?.date ?? null);
    setHour12(next?.hour12 ?? null);
    setMinute(next?.minute ?? null);
    setPeriod(next?.period ?? null);
  }, [value]);

  const airportLabel =
    formatAirportLabelFromCode(airportCode) ||
    (airportCode
      ? `${airportCityFallback || airportCode} (${airportCode})`
      : "Airport pending");

  const todayDate = calendarDateInTimeZone(new Date().toISOString(), timeZone);

  function commit(next: {
    date: string | null;
    hour12: number | null;
    minute: number | null;
    period: AdminTimePeriod | null;
  }) {
    setDate(next.date);
    setHour12(next.hour12);
    setMinute(next.minute);
    setPeriod(next.period);

    const composed = combineAdminDateAndTime(next);
    if (composed) {
      onChange(composed);
    }
  }

  return (
    <fieldset className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-2">
      <legend className="px-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
        {title}
      </legend>

      <div className="mt-2">
        <p className="text-base font-semibold text-slate-950">{airportLabel}</p>
        <p className="mt-1 text-sm text-slate-500">{timeZone}</p>
        <p className="mt-2 text-sm text-slate-600">{helper}</p>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <AdminDatePicker
          id={`${id}-date`}
          label="Date"
          value={date}
          todayDate={todayDate}
          onChange={(nextDate) =>
            commit({
              date: nextDate,
              hour12,
              minute,
              period,
            })
          }
        />
        <AdminTimePicker
          id={`${id}-time`}
          label="Time"
          hour12={hour12}
          minute={minute}
          period={period}
          onChange={(time) =>
            commit({
              date,
              hour12: time.hour12,
              minute: time.minute,
              period: time.period,
            })
          }
        />
      </div>
    </fieldset>
  );
}
