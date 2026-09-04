"use client";

import { useEffect, useState } from "react";

import {
  passengerTypeFromCategoryKey,
  type PassengerCategoryKey,
  type PassengerType,
} from "../../lib/passenger-composition";
import { validatePassengerAgeForType } from "../../lib/passenger-age";

export type PassengerFormValues = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  passportNumber: string;
  passportCountry: string;
  passportExpiry: string;
};

export const EMPTY_PASSENGER_VALUES: PassengerFormValues = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "",
  nationality: "",
  passportNumber: "",
  passportCountry: "",
  passportExpiry: "",
};

type PassengerFormProps = {
  index: number;
  defaults?: PassengerFormValues;
  showSaveCheckbox?: boolean;
  categoryLabel?: string;
  categoryDescription?: string;
  categoryKey?: PassengerCategoryKey;
  passengerType?: PassengerType;
  departureDate?: string | null;
  dateOfBirthError?: string | null;
  onDateOfBirthChange?: (value: string, error: string | null) => void;
};

export default function PassengerForm({
  index,
  defaults = EMPTY_PASSENGER_VALUES,
  showSaveCheckbox = false,
  categoryLabel,
  categoryDescription,
  categoryKey,
  passengerType,
  departureDate,
  dateOfBirthError,
  onDateOfBirthChange,
}: PassengerFormProps) {
  const passengerNumber = index + 1;
  const resolvedType =
    passengerType ??
    (categoryKey ? passengerTypeFromCategoryKey(categoryKey) : undefined);

  const [dateOfBirth, setDateOfBirth] = useState(defaults.dateOfBirth);

  useEffect(() => {
    setDateOfBirth(defaults.dateOfBirth);
    if (defaults.dateOfBirth) {
      onDateOfBirthChange?.(defaults.dateOfBirth, validateDob(defaults.dateOfBirth));
    } else {
      onDateOfBirthChange?.("", null);
    }
    // Only re-validate when autofill defaults change for this remounted slot.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: defaults-driven autofill
  }, [defaults.dateOfBirth]);

  function validateDob(value: string) {
    if (!value || !departureDate || !resolvedType) {
      return null;
    }

    const result = validatePassengerAgeForType({
      dateOfBirth: value,
      departureDate,
      passengerType: resolvedType,
    });

    return result.valid ? null : (result.message ?? "Invalid date of birth.");
  }

  function handleDobChange(value: string) {
    setDateOfBirth(value);
    onDateOfBirthChange?.(value, validateDob(value));
  }

  const shownError = dateOfBirthError ?? null;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
          Passenger {passengerNumber}
        </p>

        {categoryLabel ? (
          <>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              {categoryLabel}
            </h2>
            {categoryDescription ? (
              <p className="mt-1 text-sm text-slate-600">{categoryDescription}</p>
            ) : null}
          </>
        ) : (
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            Passenger information
          </h2>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label
            htmlFor={`firstName-${index}`}
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            First name
          </label>

          <input
            id={`firstName-${index}`}
            name={`passengers.${index}.firstName`}
            type="text"
            required
            placeholder="First name"
            defaultValue={defaults.firstName}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label
            htmlFor={`lastName-${index}`}
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Last name
          </label>

          <input
            id={`lastName-${index}`}
            name={`passengers.${index}.lastName`}
            type="text"
            required
            placeholder="Last name"
            defaultValue={defaults.lastName}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label
            htmlFor={`dateOfBirth-${index}`}
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Date of birth
          </label>

          <input
            id={`dateOfBirth-${index}`}
            name={`passengers.${index}.dateOfBirth`}
            type="date"
            required
            value={dateOfBirth}
            onChange={(event) => handleDobChange(event.target.value)}
            aria-invalid={shownError ? true : undefined}
            aria-describedby={
              shownError ? `dateOfBirth-error-${index}` : undefined
            }
            className={[
              "w-full rounded-xl border bg-white px-4 py-3 outline-none transition focus:ring-2",
              shownError
                ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                : "border-slate-300 focus:border-primary focus:ring-primary/20",
            ].join(" ")}
          />

          {shownError ? (
            <p
              id={`dateOfBirth-error-${index}`}
              role="alert"
              className="mt-2 text-sm font-medium text-red-600"
            >
              {shownError}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor={`gender-${index}`}
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Gender
          </label>

          <select
            id={`gender-${index}`}
            name={`passengers.${index}.gender`}
            required
            defaultValue={defaults.gender}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="" disabled>
              Select gender
            </option>

            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <div>
          <label
            htmlFor={`nationality-${index}`}
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Nationality
          </label>

          <input
            id={`nationality-${index}`}
            name={`passengers.${index}.nationality`}
            type="text"
            required
            placeholder="Haitian"
            defaultValue={defaults.nationality}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label
            htmlFor={`passportNumber-${index}`}
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Passport number
          </label>

          <input
            id={`passportNumber-${index}`}
            name={`passengers.${index}.passportNumber`}
            type="text"
            required
            placeholder="Passport number"
            autoComplete="off"
            defaultValue={defaults.passportNumber}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 uppercase outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label
            htmlFor={`passportCountry-${index}`}
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Passport issuing country
          </label>

          <input
            id={`passportCountry-${index}`}
            name={`passengers.${index}.passportCountry`}
            type="text"
            required
            placeholder="Haiti"
            defaultValue={defaults.passportCountry}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label
            htmlFor={`passportExpiry-${index}`}
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Passport expiration
          </label>

          <input
            id={`passportExpiry-${index}`}
            name={`passengers.${index}.passportExpiry`}
            type="date"
            required
            defaultValue={defaults.passportExpiry}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {showSaveCheckbox && (
        <label className="mt-5 flex items-start gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            name={`passengers.${index}.saveTraveler`}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20"
          />
          <span>Save this traveler to my account</span>
        </label>
      )}
    </div>
  );
}
