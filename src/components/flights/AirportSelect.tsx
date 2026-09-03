"use client";

import {
  formatAirportLabel,
  formatAirportOption,
  getAirportByCode,
  getAirportsByCountry,
} from "../../data/airports";

type AirportSelectProps = {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (code: string) => void;
  excludeCode?: string;
  required?: boolean;
  describedBy?: string;
};

export default function AirportSelect({
  id,
  name,
  label,
  value,
  onChange,
  excludeCode,
  required = true,
  describedBy,
}: AirportSelectProps) {
  const selected = getAirportByCode(value);
  const groups = getAirportsByCountry();

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium text-slate-700"
      >
        {label}
      </label>

      <div className="flex items-stretch gap-2">
        <select
          id={id}
          name={name}
          required={required}
          value={value}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Select airport</option>
          {groups.map(([country, airports]) => (
            <optgroup key={country} label={country}>
              {airports.map((airport) => (
                <option
                  key={airport.code}
                  value={airport.code}
                  disabled={airport.code === excludeCode}
                >
                  {formatAirportOption(airport)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label={`Clear ${label}`}
            className="rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Clear
          </button>
        ) : null}
      </div>

      {selected ? (
        <p className="mt-2 text-xs leading-5 text-slate-500">
          {formatAirportLabel(selected)}
          <span className="block sm:inline">
            <span className="hidden sm:inline"> · </span>
            {selected.name}
          </span>
        </p>
      ) : (
        <p className="mt-2 text-xs leading-5 text-slate-400">
          Choose a city and airport code.
        </p>
      )}
    </div>
  );
}
