"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { useRouter, useSearchParams } from "next/navigation";

import PassengerForm, {
  EMPTY_PASSENGER_VALUES,
  type PassengerFormValues,
} from "./PassengerForm";

import type { TripType } from "../../lib/flight-search";

import {
  passengerTypeFromCategoryKey,
  resolvePassengerDetailsModel,
  type PassengerCompositionParamInput,
  type TravelerCategorySlot,
} from "../../lib/passenger-composition";

import { validatePassengerAgeForType } from "../../lib/passenger-age";

import {
  travelerDisplayName,
  type SafeTraveler,
} from "../../lib/traveler-shared";

import {
  formatArrivalTime,
  formatDepartureDateShort,
  formatDepartureTime,
  formatMoney,
  formatRoute,
} from "../../lib/trip-formatting";

const PASSENGER_FIELDS = [
  "firstName",
  "lastName",
  "dateOfBirth",
  "gender",
  "nationality",
  "passportNumber",
  "passportCountry",
  "passportExpiry",
] as const;

const SELECTION_OTHER = "other";
const SELECTION_MYSELF = "myself";

export type RoundTripFlightSummary = {
  id: number;
  code: string;
  origin: string;
  originCode: string;
  destination: string;
  destinationCode: string;
  departureTime: string;
  arrivalTime: string;
};

export type FareSummary = {
  flightCode: string;
  fareFamily: string;
  fareLabel: string;
  priceCents: number;
};

type PassengersContentProps = {
  tripType?: TripType;
  roundTripOutbound?: RoundTripFlightSummary | null;
  roundTripReturn?: RoundTripFlightSummary | null;
  roundTripInvalid?: boolean;

  /** Origin-local YYYY-MM-DD for the outbound flight departure. */
  outboundDepartureDate?: string | null;

  oneWayFare?: FareSummary | null;
  outboundFare?: FareSummary | null;
  returnFare?: FareSummary | null;

  /** Server-normalized slots from /passengers search params (preferred). */
  initialTravelerSlots?: TravelerCategorySlot[];

  initialPassengerCount?: number;
  initialCompositionSummary?: string;
  initialCompositionParams?: PassengerCompositionParamInput;
};

function travelerToPassengerValues(
  traveler: SafeTraveler
): PassengerFormValues {
  return {
    firstName: traveler.firstName,
    lastName: traveler.lastName,
    dateOfBirth: traveler.dateOfBirth,
    gender: traveler.gender,
    nationality: traveler.nationality,
    passportNumber: traveler.passportNumber,
    passportCountry: traveler.passportCountry,
    passportExpiry: traveler.passportExpiry,
  };
}

function selectionToTravelerId(
  selection: string,
  primaryId: number | null
): number | null {
  if (selection === SELECTION_MYSELF) {
    return primaryId;
  }

  if (selection.startsWith("id:")) {
    const id = Number(selection.slice(3));

    return Number.isInteger(id) && id > 0 ? id : null;
  }

  return null;
}

function TicketCorners() {
  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-4 -top-4 z-20 hidden h-8 w-8 rounded-full bg-slate-50 sm:block"
      />

      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-4 -top-4 z-20 hidden h-8 w-8 rounded-full bg-slate-50 sm:block"
      />

      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-4 -left-4 z-20 hidden h-8 w-8 rounded-full bg-slate-50 sm:block"
      />

      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-4 -right-4 z-20 hidden h-8 w-8 rounded-full bg-slate-50 sm:block"
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

function ArrowRightIcon() {
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
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3 w-3"
      aria-hidden="true"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

export default function PassengersContent({
  tripType = "one-way",
  roundTripOutbound = null,
  roundTripReturn = null,
  roundTripInvalid = false,
  outboundDepartureDate = null,
  oneWayFare = null,
  outboundFare = null,
  returnFare = null,
  initialTravelerSlots,
  initialCompositionSummary,
  initialCompositionParams,
}: PassengersContentProps) {
  const router = useRouter();

  const searchParams = useSearchParams();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [travelers, setTravelers] = useState<SafeTraveler[] | null>(null);

  const [isSignedIn, setIsSignedIn] = useState(false);

  const [selections, setSelections] = useState<string[]>([]);

  const [dobErrors, setDobErrors] = useState<Array<string | null>>([]);

  const isRoundTrip = tripType === "round-trip";

  const flightId = searchParams.get("flight") ?? "";

  const detailsModel = useMemo(() => {
    return resolvePassengerDetailsModel({
      passengers:
        searchParams.get("passengers") ??
        initialCompositionParams?.passengers ??
        null,

      adults:
        searchParams.get("adults") ??
        initialCompositionParams?.adults ??
        null,

      seniors:
        searchParams.get("seniors") ??
        initialCompositionParams?.seniors ??
        null,

      children:
        searchParams.get("children") ??
        initialCompositionParams?.children ??
        null,

      infants:
        searchParams.get("infants") ??
        initialCompositionParams?.infants ??
        null,
    });
  }, [searchParams, initialCompositionParams]);

  // Prefer server-expanded slots when provided; otherwise derive from URL params.
  // Header count always equals rendered form count — never a separate legacy cap.
  const travelerSlots =
    initialTravelerSlots &&
    initialTravelerSlots.length === detailsModel.passengerCount
      ? initialTravelerSlots
      : detailsModel.slots;

  const passengerCount = travelerSlots.length;

  const compositionSummary =
    initialCompositionSummary &&
    travelerSlots.length === detailsModel.passengerCount
      ? initialCompositionSummary
      : detailsModel.summary;

  const composition = detailsModel.composition;

  useEffect(() => {
    let cancelled = false;

    async function loadTravelers() {
      try {
        const response = await fetch("/api/travelers");

        if (response.status === 401) {
          if (!cancelled) {
            setIsSignedIn(false);
            setTravelers(null);
          }

          return;
        }

        const payload = (await response.json().catch(() => null)) as
          | { travelers?: SafeTraveler[] }
          | null;

        if (!cancelled && response.ok) {
          setIsSignedIn(true);
          setTravelers(payload?.travelers ?? []);
        }
      } catch {
        if (!cancelled) {
          setIsSignedIn(false);
          setTravelers(null);
        }
      }
    }

    void loadTravelers();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setSelections((current) => {
      if (current.length === passengerCount) {
        return current;
      }

      return Array.from(
        { length: passengerCount },
        (_, index) => current[index] ?? ""
      );
    });

    setDobErrors((current) => {
      if (current.length === passengerCount) {
        return current;
      }

      return Array.from(
        { length: passengerCount },
        (_, index) => current[index] ?? null
      );
    });
  }, [passengerCount]);

  function setDobErrorAt(index: number, message: string | null) {
    setDobErrors((current) => {
      const next = Array.from(
        { length: passengerCount },
        (_, i) => current[i] ?? null
      );

      next[index] = message;

      return next;
    });
  }

  function validateDobForSlot(
    index: number,
    dateOfBirth: string
  ): string | null {
    if (!dateOfBirth || !outboundDepartureDate) {
      return null;
    }

    const slot = travelerSlots[index];

    if (!slot) {
      return null;
    }

    const result = validatePassengerAgeForType({
      dateOfBirth,
      departureDate: outboundDepartureDate,
      passengerType: passengerTypeFromCategoryKey(slot.key),
    });

    return result.valid
      ? null
      : (result.message ?? "Invalid date of birth.");
  }

  const primaryTraveler = useMemo(
    () => travelers?.find((traveler) => traveler.isPrimary) ?? null,
    [travelers]
  );

  const usedTravelerIds = useMemo(() => {
    const ids = new Set<number>();

    for (const selection of selections) {
      const id = selectionToTravelerId(
        selection,
        primaryTraveler?.id ?? null
      );

      if (id != null) {
        ids.add(id);
      }
    }

    return ids;
  }, [selections, primaryTraveler]);

  function defaultsForIndex(index: number): PassengerFormValues {
    const selection = selections[index] ?? "";

    const travelerId = selectionToTravelerId(
      selection,
      primaryTraveler?.id ?? null
    );

    if (travelerId == null) {
      return EMPTY_PASSENGER_VALUES;
    }

    const traveler = travelers?.find((item) => item.id === travelerId);

    return traveler
      ? travelerToPassengerValues(traveler)
      : EMPTY_PASSENGER_VALUES;
  }

  function handleSelectionChange(index: number, value: string) {
    setSelections((current) => {
      const next = [...current];

      next[index] = value;

      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    if (
      isRoundTrip &&
      (roundTripInvalid || !roundTripOutbound || !roundTripReturn)
    ) {
      setError("Selected round-trip flights could not be verified.");
      return;
    }

    const formData = new FormData(event.currentTarget);

    const passengers = Array.from(
      { length: passengerCount },
      (_, index) => {
        const passenger = { ...EMPTY_PASSENGER_VALUES };

        for (const field of PASSENGER_FIELDS) {
          passenger[field] = String(
            formData.get(`passengers.${index}.${field}`) ?? ""
          ).trim();
        }

        return passenger;
      }
    );

    const nextDobErrors = passengers.map((passenger, index) =>
      validateDobForSlot(index, passenger.dateOfBirth)
    );

    setDobErrors(nextDobErrors);

    const firstAgeError = nextDobErrors.find((message) =>
      Boolean(message)
    );

    if (firstAgeError) {
      setError(firstAgeError);
      return;
    }

    if (!outboundDepartureDate) {
      setError(
        "Outbound departure date is required to validate traveler ages."
      );

      return;
    }

    const saveFlags = Array.from(
      { length: passengerCount },
      (_, index) =>
        formData.get(`passengers.${index}.saveTraveler`) === "on"
    );

    setError(null);

    setIsSubmitting(true);

    try {
      const compositionPayload = {
        adults: String(composition.adults),
        seniors: String(composition.seniors),
        children: String(composition.children),
        infants: String(composition.infantsInSeat),
      };

      const body = isRoundTrip
        ? {
            tripType: "round-trip",
            outboundFlightId: roundTripOutbound!.id,
            returnFlightId: roundTripReturn!.id,
            outboundFareFamily:
              outboundFare?.fareFamily ?? "BASIC",
            returnFareFamily:
              returnFare?.fareFamily ?? "BASIC",
            passengers,
            ...compositionPayload,

            ...(!isSignedIn
              ? {
                  contactEmail: String(
                    formData.get("contactEmail") ?? ""
                  ).trim(),
                }
              : {}),
          }
        : {
            flightCode: flightId,
            fareFamily: oneWayFare?.fareFamily ?? "BASIC",
            passengers,
            ...compositionPayload,

            ...(!isSignedIn
              ? {
                  contactEmail: String(
                    formData.get("contactEmail") ?? ""
                  ).trim(),
                }
              : {}),
          };

      const response = await fetch("/api/bookings", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(body),
      });

      const payload = (await response.json().catch(() => null)) as
        | { bookingReference?: string; error?: string }
        | null;

      if (!response.ok) {
        setError(
          payload?.error ??
            "Unable to create booking. Please try again."
        );

        return;
      }

      if (!payload?.bookingReference) {
        setError(
          "Booking was created, but no reference was returned."
        );

        return;
      }

      if (isSignedIn) {
        const saveRequests = passengers.flatMap(
          (passenger, index) => {
            if (!saveFlags[index]) {
              return [];
            }

            return [
              fetch("/api/travelers", {
                method: "POST",

                headers: {
                  "Content-Type": "application/json",
                },

                body: JSON.stringify({
                  ...passenger,

                  label:
                    `${passenger.firstName} ${passenger.lastName}`.trim(),

                  isPrimary: false,
                }),
              }).catch(() => null),
            ];
          }
        );

        await Promise.all(saveRequests);
      }

      router.push(
        `/my-trips/${encodeURIComponent(
          payload.bookingReference
        )}/seats`
      );
    } catch {
      setError("Unable to create booking. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const showTravelerControls =
    isSignedIn && travelers !== null;

  return (
    <>
      {/* =========================================================
          PAGE HEADER
      ========================================================= */}
      <section className="border-b border-slate-200 bg-white">
        <div className="fs-container fs-section-y">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0078D2]">
            Passenger details
          </p>

          <h1
            className="
              font-american-sans
              mt-3
              text-4xl
              font-light
              tracking-[-0.03em]
              text-slate-950
              sm:text-5xl
            "
          >
            Who is traveling?
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            Enter passenger information exactly as it appears on each
            traveler&apos;s travel documents.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            {!isRoundTrip && flightId ? (
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Flight
                </span>

                <span className="fs-nums font-semibold text-slate-950">
                  {flightId}
                </span>

                {oneWayFare ? (
                  <span className="text-sm text-slate-500">
                    · {oneWayFare.fareLabel} ·{" "}
                    {formatMoney(oneWayFare.priceCents)}
                  </span>
                ) : null}
              </div>
            ) : null}

            {isRoundTrip ? (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Trip
                </span>

                <span className="text-sm font-semibold text-slate-950">
                  Round trip
                </span>
              </div>
            ) : null}

            <div className="flex min-w-0 items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Travelers
              </span>

              <span className="fs-nums font-semibold text-slate-950">
                {passengerCount}
              </span>

              {compositionSummary ? (
                <span className="text-sm text-slate-500">
                  · {compositionSummary}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          BOOKING CONTENT
      ========================================================= */}
      <section className="fs-container-narrow fs-section-y">
        {/* =======================================================
            ROUND-TRIP SUMMARY
        ======================================================= */}
        {isRoundTrip ? (
          <section className="relative isolate mb-8">
            <span
              aria-hidden="true"
              className="
                pointer-events-none
                absolute
                inset-x-10
                -bottom-3
                -z-10
                h-8
                rounded-[50%]
                bg-slate-950/[0.06]
                blur-2xl
              "
            />

            <div
              className="
                relative
                overflow-hidden
                bg-white
                shadow-[0_8px_30px_rgba(15,23,42,0.06)]
              "
            >
              <TicketCorners />

              <div
                className="
                  relative
                  border-b
                  border-dashed
                  border-slate-300
                  px-5
                  py-5
                  sm:px-6
                "
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-3 -left-3 h-6 w-6 rounded-full bg-slate-50"
                />

                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-3 -right-3 h-6 w-6 rounded-full bg-slate-50"
                />

                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
                  Trip summary
                </p>

                <h2
                  className="
                    font-american-sans
                    mt-2
                    text-2xl
                    font-light
                    tracking-[-0.025em]
                    text-slate-950
                  "
                >
                  Your selected flights
                </h2>
              </div>

              {roundTripInvalid ||
              !roundTripOutbound ||
              !roundTripReturn ? (
                <div className="px-5 py-6 sm:px-6">
                  <p className="text-sm leading-6 text-slate-600">
                    We could not verify the selected outbound and
                    return flights. Please{" "}
                    <Link
                      href="/flights"
                      className="font-semibold text-[#0078D2] transition hover:text-[#006bbd]"
                    >
                      search again
                    </Link>
                    .
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid sm:grid-cols-2">
                    {/* Outbound */}
                    <div className="min-w-0 px-5 py-6 sm:px-6 sm:pr-7">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
                        Outbound
                      </p>

                      <p
                        className="
                          font-american-sans
                          mt-2
                          text-2xl
                          font-light
                          tracking-[-0.025em]
                          text-slate-950
                        "
                      >
                        {formatRoute(
                          roundTripOutbound.originCode,
                          roundTripOutbound.destinationCode
                        )}
                      </p>

                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {formatDepartureDateShort(
                          roundTripOutbound
                        )}
                        <span className="mx-2 text-slate-300">
                          ·
                        </span>
                        {formatDepartureTime(roundTripOutbound)}
                        <span className="mx-2 text-slate-300">
                          →
                        </span>
                        {formatArrivalTime(roundTripOutbound)}
                      </p>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="fs-nums text-sm font-semibold text-slate-950">
                          {roundTripOutbound.code}
                        </span>

                        {outboundFare ? (
                          <>
                            <span className="h-1 w-1 rounded-full bg-slate-300" />

                            <span className="text-sm text-slate-500">
                              {outboundFare.fareLabel}
                            </span>

                            <span className="h-1 w-1 rounded-full bg-slate-300" />

                            <span className="fs-nums text-sm font-semibold text-slate-950">
                              {formatMoney(
                                outboundFare.priceCents
                              )}
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>

                    {/* Return */}
                    <div
                      className="
                        relative
                        min-w-0
                        border-t
                        border-dashed
                        border-slate-300
                        px-5
                        py-6
                        sm:border-l
                        sm:border-t-0
                        sm:px-6
                        sm:pl-7
                      "
                    >
                      <span
                        aria-hidden="true"
                        className="
                          pointer-events-none
                          absolute
                          -left-3
                          -top-3
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
                          -right-3
                          -top-3
                          h-6
                          w-6
                          rounded-full
                          bg-slate-50
                          sm:hidden
                        "
                      />

                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
                        Return
                      </p>

                      <p
                        className="
                          font-american-sans
                          mt-2
                          text-2xl
                          font-light
                          tracking-[-0.025em]
                          text-slate-950
                        "
                      >
                        {formatRoute(
                          roundTripReturn.originCode,
                          roundTripReturn.destinationCode
                        )}
                      </p>

                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {formatDepartureDateShort(
                          roundTripReturn
                        )}
                        <span className="mx-2 text-slate-300">
                          ·
                        </span>
                        {formatDepartureTime(roundTripReturn)}
                        <span className="mx-2 text-slate-300">
                          →
                        </span>
                        {formatArrivalTime(roundTripReturn)}
                      </p>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="fs-nums text-sm font-semibold text-slate-950">
                          {roundTripReturn.code}
                        </span>

                        {returnFare ? (
                          <>
                            <span className="h-1 w-1 rounded-full bg-slate-300" />

                            <span className="text-sm text-slate-500">
                              {returnFare.fareLabel}
                            </span>

                            <span className="h-1 w-1 rounded-full bg-slate-300" />

                            <span className="fs-nums text-sm font-semibold text-slate-950">
                              {formatMoney(
                                returnFare.priceCents
                              )}
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-slate-300 bg-slate-50/50 px-5 py-3 text-center sm:px-6">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Five Stars • One booking • Two flights
                    </p>
                  </div>
                </>
              )}
            </div>
          </section>
        ) : null}

        {/* =======================================================
            NO SAVED TRAVELERS NOTICE
        ======================================================= */}
        {showTravelerControls &&
        travelers.length === 0 ? (
          <div
            className="
              mb-7
              border-l-2
              border-[#0078D2]
              bg-[#0078D2]/[0.035]
              px-4
              py-3
            "
          >
            <p className="text-sm leading-6 text-slate-600">
              Save your traveler details for faster booking next
              time.{" "}
              <Link
                href="/account/travelers"
                className="font-semibold text-[#0078D2] transition hover:text-[#006bbd]"
              >
                Add a saved traveler
              </Link>
            </p>
          </div>
        ) : null}

        {/* =======================================================
            BOOKING FORM
        ======================================================= */}
        <form
          onSubmit={handleSubmit}
          className="space-y-8"
        >
          {/* =====================================================
              GUEST CONTACT TICKET
          ===================================================== */}
          {!isSignedIn ? (
            <section className="relative isolate min-w-0">
              <span
                aria-hidden="true"
                className="
                  pointer-events-none
                  absolute
                  inset-x-8
                  -bottom-3
                  -z-10
                  h-7
                  rounded-[50%]
                  bg-slate-950/[0.05]
                  blur-xl
                "
              />

              <div
                className="
                  relative
                  overflow-hidden
                  bg-white
                  shadow-[0_7px_24px_rgba(15,23,42,0.05)]
                "
              >
                <TicketCorners />

                <div className="grid md:grid-cols-[minmax(0,1fr)_260px]">
                  <div className="min-w-0 px-5 py-6 sm:px-6">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
                      Contact
                    </p>

                    <h2
                      className="
                        font-american-sans
                        mt-2
                        text-2xl
                        font-light
                        tracking-[-0.025em]
                        text-slate-950
                      "
                    >
                      Continue as guest
                    </h2>

                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                      We&apos;ll use this email for booking
                      updates. An account is not required to book.
                    </p>

                    <label
                      htmlFor="contactEmail"
                      className="
                        mt-5
                        block
                        text-[11px]
                        font-semibold
                        uppercase
                        tracking-[0.12em]
                        text-slate-500
                      "
                    >
                      Contact email
                    </label>

                    <input
                      id="contactEmail"
                      name="contactEmail"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="you@example.com"
                      className="
                        mt-2
                        min-h-12
                        w-full
                        rounded-lg
                        border
                        border-slate-300
                        bg-white
                        px-4
                        py-3
                        text-sm
                        text-slate-950
                        outline-none
                        transition
                        placeholder:text-slate-400
                        hover:border-slate-400
                        focus:border-[#0078D2]
                        focus:ring-2
                        focus:ring-[#0078D2]/15
                      "
                    />
                  </div>

                  <aside
                    className="
                      relative
                      border-t
                      border-dashed
                      border-slate-300
                      bg-slate-50/60
                      px-5
                      py-6
                      md:border-l
                      md:border-t-0
                    "
                  >
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -left-3 -top-3 h-6 w-6 rounded-full bg-slate-50"
                    />

                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-3 -top-3 h-6 w-6 rounded-full bg-slate-50 md:hidden"
                    />

                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Have an account?
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Sign in to use saved traveler profiles and
                      manage this trip from your account.
                    </p>

                    <Link
                      href="/login"
                      className="
                        mt-4
                        inline-flex
                        min-h-10
                        items-center
                        justify-center
                        rounded-lg
                        border
                        border-slate-300
                        bg-white
                        px-4
                        text-sm
                        font-semibold
                        text-[#0078D2]
                        transition
                        hover:border-[#0078D2]/30
                        hover:bg-[#f5faff]
                        focus-visible:outline-none
                        focus-visible:ring-2
                        focus-visible:ring-[#0078D2]/30
                      "
                    >
                      Sign in
                    </Link>
                  </aside>
                </div>
              </div>
            </section>
          ) : null}

          {/* =====================================================
              PASSENGERS
          ===================================================== */}
          {travelerSlots.map((slot, index) => {
            const selection =
              selections[index] ?? "";

            const travelerId =
              selectionToTravelerId(
                selection,
                primaryTraveler?.id ?? null
              );

            const filledFromProfile =
              travelerId != null;

            const myselfSelectedWithoutPrimary =
              selection === SELECTION_MYSELF &&
              !primaryTraveler;

            return (
              <div
                key={`${slot.key}-${index}`}
                className="space-y-4"
              >
                {/* ===============================================
                    SAVED TRAVELER SELECTOR
                =============================================== */}
                {showTravelerControls ? (
                  <section className="relative isolate min-w-0">
                    <span
                      aria-hidden="true"
                      className="
                        pointer-events-none
                        absolute
                        inset-x-8
                        -bottom-3
                        -z-10
                        h-7
                        rounded-[50%]
                        bg-slate-950/[0.05]
                        blur-xl
                      "
                    />

                    <div
                      className="
                        relative
                        overflow-hidden
                        bg-white
                        shadow-[0_7px_24px_rgba(15,23,42,0.05)]
                      "
                    >
                      <TicketCorners />

                      <div
                        className="
                          relative
                          border-b
                          border-dashed
                          border-slate-300
                          px-5
                          py-5
                          sm:px-6
                        "
                      >
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute -bottom-3 -left-3 h-6 w-6 rounded-full bg-slate-50"
                        />

                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute -bottom-3 -right-3 h-6 w-6 rounded-full bg-slate-50"
                        />

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
                              Passenger{" "}
                              {String(index + 1).padStart(
                                2,
                                "0"
                              )}
                            </p>

                            <h2
                              className="
                                font-american-sans
                                mt-2
                                text-2xl
                                font-light
                                tracking-[-0.025em]
                                text-slate-950
                              "
                            >
                              {slot.label}
                            </h2>

                            <p className="mt-1 text-sm leading-6 text-slate-500">
                              {slot.description}
                            </p>
                          </div>

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
                            Traveler
                          </span>
                        </div>
                      </div>

                      <div className="px-5 py-5 sm:px-6">
                        <label
                          htmlFor={`traveler-select-${index}`}
                          className="
                            block
                            text-[11px]
                            font-semibold
                            uppercase
                            tracking-[0.12em]
                            text-slate-500
                          "
                        >
                          Who is traveling?
                        </label>

                        <div className="relative mt-2">
                          <select
                            id={`traveler-select-${index}`}
                            value={selection}
                            onChange={(event) =>
                              handleSelectionChange(
                                index,
                                event.target.value
                              )
                            }
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
                            <option value="">
                              Select traveler
                            </option>

                            <option
                              value={SELECTION_MYSELF}
                              disabled={
                                primaryTraveler != null &&
                                usedTravelerIds.has(
                                  primaryTraveler.id
                                ) &&
                                selectionToTravelerId(
                                  selection,
                                  primaryTraveler.id
                                ) !== primaryTraveler.id
                              }
                            >
                              Myself
                            </option>

                            {(travelers ?? [])
                              .filter(
                                (traveler) =>
                                  !traveler.isPrimary
                              )
                              .map((traveler) => {
                                const selectedElsewhere =
                                  usedTravelerIds.has(
                                    traveler.id
                                  ) &&
                                  selectionToTravelerId(
                                    selection,
                                    primaryTraveler?.id ??
                                      null
                                  ) !== traveler.id;

                                return (
                                  <option
                                    key={traveler.id}
                                    value={`id:${traveler.id}`}
                                    disabled={
                                      selectedElsewhere
                                    }
                                  >
                                    {travelerDisplayName(
                                      traveler
                                    )}
                                  </option>
                                );
                              })}

                            <option
                              value={SELECTION_OTHER}
                            >
                              Someone else
                            </option>
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

                        {myselfSelectedWithoutPrimary ? (
                          <div
                            className="
                              mt-4
                              border-l-2
                              border-[#0078D2]
                              bg-[#0078D2]/[0.035]
                              px-4
                              py-3
                            "
                          >
                            <p className="text-sm leading-6 text-slate-600">
                              Set up your traveler profile
                              to fill these details
                              automatically.{" "}
                              <Link
                                href="/account/travelers"
                                className="font-semibold text-[#0078D2] transition hover:text-[#006bbd]"
                              >
                                Set up my traveler
                                profile
                              </Link>
                            </p>
                          </div>
                        ) : null}

                        {filledFromProfile ? (
                          <div
                            className="
                              mt-4
                              flex
                              items-start
                              gap-3
                              bg-slate-50
                              px-4
                              py-3
                            "
                          >
                            <span
                              aria-hidden="true"
                              className="
                                mt-0.5
                                flex
                                h-5
                                w-5
                                shrink-0
                                items-center
                                justify-center
                                rounded-full
                                bg-emerald-50
                                text-emerald-700
                              "
                            >
                              <CheckIcon />
                            </span>

                            <p className="text-sm leading-6 text-slate-600">
                              Details filled from your
                              saved traveler profile.
                              Review them below before
                              continuing.
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </section>
                ) : null}

                {/* ===============================================
                    PASSENGER FORM TICKET
                =============================================== */}
                <PassengerForm
                  key={`${index}-${selection}-${slot.key}`}
                  index={index}
                  defaults={defaultsForIndex(index)}
                  categoryLabel={slot.label}
                  categoryDescription={
                    slot.description
                  }
                  categoryKey={slot.key}
                  passengerType={passengerTypeFromCategoryKey(
                    slot.key
                  )}
                  departureDate={
                    outboundDepartureDate
                  }
                  dateOfBirthError={
                    dobErrors[index] ?? null
                  }
                  onDateOfBirthChange={(
                    _value,
                    message
                  ) =>
                    setDobErrorAt(index, message)
                  }
                  showSaveCheckbox={
                    isSignedIn &&
                    (selection === SELECTION_OTHER ||
                      selection === "")
                  }
                />
              </div>
            );
          })}

          {/* =====================================================
              FINAL CONTINUE TICKET
          ===================================================== */}
          <section className="relative isolate min-w-0 pt-1">
            <span
              aria-hidden="true"
              className="
                pointer-events-none
                absolute
                inset-x-8
                -bottom-3
                -z-10
                h-7
                rounded-[50%]
                bg-slate-950/[0.05]
                blur-xl
              "
            />

            <div
              className="
                relative
                overflow-hidden
                bg-white
                shadow-[0_7px_24px_rgba(15,23,42,0.05)]
              "
            >
              <TicketCorners />

              <div
                className="
                  flex
                  flex-col
                  gap-5
                  px-5
                  py-6
                  sm:px-6
                  sm:py-7
                  md:flex-row
                  md:items-center
                  md:justify-between
                "
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
                    Passenger information
                  </p>

                  <h2
                    className="
                      font-american-sans
                      mt-2
                      text-2xl
                      font-light
                      tracking-[-0.025em]
                      text-slate-950
                    "
                  >
                    Ready to continue?
                  </h2>

                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                    Review all passenger details
                    before continuing to seat
                    selection and checkout.
                  </p>

                  {error ? (
                    <div
                      role="alert"
                      className="
                        mt-4
                        border-l-2
                        border-red-500
                        bg-red-50
                        px-4
                        py-3
                      "
                    >
                      <p className="text-sm font-medium text-red-700">
                        {error}
                      </p>
                    </div>
                  ) : null}
                </div>

                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    (isRoundTrip &&
                      (roundTripInvalid ||
                        !roundTripOutbound ||
                        !roundTripReturn))
                  }
                  className="
                    group
                    inline-flex
                    min-h-12
                    w-full
                    shrink-0
                    items-center
                    justify-center
                    gap-2
                    rounded-lg
                    bg-[#0078D2]
                    px-6
                    py-3
                    text-sm
                    font-semibold
                    text-white
                    shadow-[0_5px_14px_rgba(0,120,210,0.18)]
                    transition
                    hover:bg-[#006bbd]
                    hover:shadow-[0_8px_20px_rgba(0,120,210,0.24)]
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-[#0078D2]/30
                    focus-visible:ring-offset-2
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                    disabled:shadow-none
                    md:w-auto
                    md:min-w-[220px]
                  "
                >
                  <span>
                    {isSubmitting
                      ? "Creating booking..."
                      : "Continue to Checkout"}
                  </span>

                  {!isSubmitting ? (
                    <span className="transition-transform duration-200 group-hover:translate-x-0.5">
                      <ArrowRightIcon />
                    </span>
                  ) : null}
                </button>
              </div>

              <div
                className="
                  border-t
                  border-dashed
                  border-slate-300
                  bg-slate-50/50
                  px-5
                  py-3
                  text-center
                  sm:px-6
                "
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Five Stars • Passenger information
                </p>
              </div>
            </div>
          </section>
        </form>
      </section>
    </>
  );
}