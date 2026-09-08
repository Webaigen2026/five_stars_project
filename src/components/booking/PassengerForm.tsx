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

function TicketCutouts() {
  return (
    <>
      <span
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -left-4
          -top-4
          z-20
          hidden
          h-8
          w-8
          rounded-full
          bg-slate-50
          sm:block
        "
      />

      <span
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -right-4
          -top-4
          z-20
          hidden
          h-8
          w-8
          rounded-full
          bg-slate-50
          sm:block
        "
      />

      <span
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -bottom-4
          -left-4
          z-20
          hidden
          h-8
          w-8
          rounded-full
          bg-slate-50
          sm:block
        "
      />

      <span
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -bottom-4
          -right-4
          z-20
          hidden
          h-8
          w-8
          rounded-full
          bg-slate-50
          sm:block
        "
      />
    </>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

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
      onDateOfBirthChange?.(
        defaults.dateOfBirth,
        validateDob(defaults.dateOfBirth)
      );
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

    return result.valid
      ? null
      : (result.message ?? "Invalid date of birth.");
  }

  function handleDobChange(value: string) {
    setDateOfBirth(value);
    onDateOfBirthChange?.(value, validateDob(value));
  }

  const shownError = dateOfBirthError ?? null;

  const fieldClassName =
    "min-h-12 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-[#0078D2] focus:ring-2 focus:ring-[#0078D2]/15";

  const labelClassName =
    "mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500";

  return (
    <section className="group relative isolate min-w-0">
      {/* Floating shadow */}
      <span
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-x-8
          -bottom-3
          -z-10
          h-8
          rounded-[50%]
          bg-slate-950/[0.06]
          blur-2xl
        "
      />

      {/* Ticket */}
      <div
        className="
          relative
          overflow-hidden
          bg-white
          shadow-[0_8px_30px_rgba(15,23,42,0.06)]
        "
      >
        <TicketCutouts />

        {/* =====================================================
            TICKET HEADER
        ===================================================== */}
        <div
          className="
            relative
            border-b
            border-dashed
            border-slate-300
            px-5
            py-5
            sm:px-6
            sm:py-6
          "
        >
          <span
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              -bottom-3
              -left-3
              z-20
              h-6
              w-6
              rounded-full
              bg-slate-50
            "
          />

          <span
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              -bottom-3
              -right-3
              z-20
              h-6
              w-6
              rounded-full
              bg-slate-50
            "
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0078D2]">
                Passenger {String(passengerNumber).padStart(2, "0")}
              </p>

              {categoryLabel ? (
                <>
                  <h2
                    className="
                      font-american-sans
                      mt-2
                      text-2xl
                      font-light
                      tracking-[-0.025em]
                      text-slate-950
                      sm:text-3xl
                    "
                  >
                    {categoryLabel}
                  </h2>

                  {categoryDescription ? (
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                      {categoryDescription}
                    </p>
                  ) : null}
                </>
              ) : (
                <h2
                  className="
                    font-american-sans
                    mt-2
                    text-2xl
                    font-light
                    tracking-[-0.025em]
                    text-slate-950
                    sm:text-3xl
                  "
                >
                  Passenger information
                </h2>
              )}
            </div>

            {resolvedType ? (
              <span
                className="
                  inline-flex
                  w-fit
                  shrink-0
                  rounded-full
                  bg-[#0078D2]/[0.07]
                  px-3
                  py-1.5
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-[0.1em]
                  text-[#0078D2]
                "
              >
                {resolvedType.replaceAll("_", " ")}
              </span>
            ) : null}
          </div>
        </div>

        {/* =====================================================
            PASSENGER DETAILS
        ===================================================== */}
        <div className="px-5 py-6 sm:px-6 sm:py-7">
          <div className="mb-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Personal information
            </p>

            <p className="mt-1 text-sm text-slate-600">
              Enter details exactly as they appear on the traveler&apos;s
              documents.
            </p>
          </div>

          <div className="grid gap-x-5 gap-y-5 md:grid-cols-2">
            {/* First name */}
            <div>
              <label
                htmlFor={`firstName-${index}`}
                className={labelClassName}
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
                className={fieldClassName}
              />
            </div>

            {/* Last name */}
            <div>
              <label
                htmlFor={`lastName-${index}`}
                className={labelClassName}
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
                className={fieldClassName}
              />
            </div>

            {/* Date of birth */}
            <div>
              <label
                htmlFor={`dateOfBirth-${index}`}
                className={labelClassName}
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
                  shownError
                    ? `dateOfBirth-error-${index}`
                    : undefined
                }
                className={[
                  "min-h-12 w-full rounded-lg border bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:ring-2",
                  shownError
                    ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                    : "border-slate-300 hover:border-slate-400 focus:border-[#0078D2] focus:ring-[#0078D2]/15",
                ].join(" ")}
              />

              {shownError ? (
                <p
                  id={`dateOfBirth-error-${index}`}
                  role="alert"
                  className="
                    mt-2
                    border-l-2
                    border-red-500
                    bg-red-50
                    px-3
                    py-2
                    text-sm
                    font-medium
                    text-red-700
                  "
                >
                  {shownError}
                </p>
              ) : null}
            </div>

            {/* Gender */}
            <div>
              <label
                htmlFor={`gender-${index}`}
                className={labelClassName}
              >
                Gender
              </label>

              <div className="relative">
                <select
                  id={`gender-${index}`}
                  name={`passengers.${index}.gender`}
                  required
                  defaultValue={defaults.gender}
                  className="
                    min-h-12
                    w-full
                    appearance-none
                    rounded-lg
                    border
                    border-slate-300
                    bg-white
                    px-4
                    py-3
                    pr-11
                    text-sm
                    text-slate-950
                    outline-none
                    transition
                    hover:border-slate-400
                    focus:border-[#0078D2]
                    focus:ring-2
                    focus:ring-[#0078D2]/15
                  "
                >
                  <option value="" disabled>
                    Select gender
                  </option>

                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>

                <span
                  aria-hidden="true"
                  className="
                    pointer-events-none
                    absolute
                    right-4
                    top-1/2
                    -translate-y-1/2
                    text-slate-400
                  "
                >
                  <ChevronDownIcon />
                </span>
              </div>
            </div>
          </div>

          {/* =====================================================
              DOCUMENT PERFORATION
          ===================================================== */}
          <div className="my-7 flex items-center gap-3">
            <span className="h-px flex-1 border-t border-dashed border-slate-300" />

            <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Travel document
            </span>

            <span className="h-px flex-1 border-t border-dashed border-slate-300" />
          </div>

          {/* =====================================================
              TRAVEL DOCUMENT
          ===================================================== */}
          <div className="grid gap-x-5 gap-y-5 md:grid-cols-2">
            {/* Nationality */}
            <div>
              <label
                htmlFor={`nationality-${index}`}
                className={labelClassName}
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
                className={fieldClassName}
              />
            </div>

            {/* Passport country */}
            <div>
              <label
                htmlFor={`passportCountry-${index}`}
                className={labelClassName}
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
                className={fieldClassName}
              />
            </div>

            {/* Passport number */}
            <div>
              <label
                htmlFor={`passportNumber-${index}`}
                className={labelClassName}
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
                className={`${fieldClassName} uppercase`}
              />
            </div>

            {/* Passport expiry */}
            <div>
              <label
                htmlFor={`passportExpiry-${index}`}
                className={labelClassName}
              >
                Passport expiration
              </label>

              <input
                id={`passportExpiry-${index}`}
                name={`passengers.${index}.passportExpiry`}
                type="date"
                required
                defaultValue={defaults.passportExpiry}
                className={fieldClassName}
              />
            </div>
          </div>

          {/* =====================================================
              SAVE TRAVELER
          ===================================================== */}
          {showSaveCheckbox ? (
            <label
              className="
                mt-7
                flex
                cursor-pointer
                items-start
                gap-3
                border-t
                border-dashed
                border-slate-200
                pt-5
                text-sm
                text-slate-700
              "
            >
              <input
                type="checkbox"
                name={`passengers.${index}.saveTraveler`}
                className="
                  mt-0.5
                  h-4
                  w-4
                  shrink-0
                  rounded
                  border-slate-300
                  text-[#0078D2]
                  focus:ring-[#0078D2]/20
                "
              />

              <span>
                <span className="font-semibold text-slate-950">
                  Save this traveler
                </span>

                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  Reuse these traveler details on future Five Stars bookings.
                </span>
              </span>
            </label>
          ) : null}

          {/* =====================================================
              TICKET FOOTER
          ===================================================== */}
          <div
            className="
              mt-7
              flex
              flex-col
              gap-2
              border-t
              border-dashed
              border-slate-200
              pt-4
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Five Stars • Passenger {String(passengerNumber).padStart(2, "0")}
            </p>

            <p className="text-xs text-slate-400">
              Traveler information
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}