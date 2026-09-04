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
  travelerDisplayName,
  type SafeTraveler,
} from "../../lib/traveler-shared";
import {
  formatArrivalTime,
  formatDepartureDateShort,
  formatDepartureTime,
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

type PassengersContentProps = {
  tripType?: TripType;
  roundTripOutbound?: RoundTripFlightSummary | null;
  roundTripReturn?: RoundTripFlightSummary | null;
  roundTripInvalid?: boolean;
};

function travelerToPassengerValues(traveler: SafeTraveler): PassengerFormValues {
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

export default function PassengersContent({
  tripType = "one-way",
  roundTripOutbound = null,
  roundTripReturn = null,
  roundTripInvalid = false,
}: PassengersContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [travelers, setTravelers] = useState<SafeTraveler[] | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [selections, setSelections] = useState<string[]>([]);

  const isRoundTrip = tripType === "round-trip";
  const flightId = searchParams.get("flight") ?? "";
  const passengerParam = searchParams.get("passengers") ?? "1";

  const parsedPassengerCount = Number.parseInt(passengerParam, 10);

  const passengerCount =
    Number.isNaN(parsedPassengerCount) || parsedPassengerCount < 1
      ? 1
      : Math.min(parsedPassengerCount, 6);

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
  }, [passengerCount]);

  const primaryTraveler = useMemo(
    () => travelers?.find((traveler) => traveler.isPrimary) ?? null,
    [travelers]
  );

  const usedTravelerIds = useMemo(() => {
    const ids = new Set<number>();

    for (const selection of selections) {
      const id = selectionToTravelerId(selection, primaryTraveler?.id ?? null);

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

    if (isRoundTrip) {
      setError("Round-trip checkout is coming next.");
      return;
    }

    if (isSubmitting) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const passengers = Array.from({ length: passengerCount }, (_, index) => {
      const passenger = { ...EMPTY_PASSENGER_VALUES };

      for (const field of PASSENGER_FIELDS) {
        passenger[field] = String(
          formData.get(`passengers.${index}.${field}`) ?? ""
        ).trim();
      }

      return passenger;
    });

    const saveFlags = Array.from({ length: passengerCount }, (_, index) => {
      return formData.get(`passengers.${index}.saveTraveler`) === "on";
    });

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          flightCode: flightId,
          passengers,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { bookingReference?: string; error?: string }
        | null;

      if (!response.ok) {
        setError(
          payload?.error ?? "Unable to create booking. Please try again."
        );
        return;
      }

      if (!payload?.bookingReference) {
        setError("Booking was created, but no reference was returned.");
        return;
      }

      if (isSignedIn) {
        const saveRequests = passengers.flatMap((passenger, index) => {
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
                label: `${passenger.firstName} ${passenger.lastName}`.trim(),
                isPrimary: false,
              }),
            }).catch(() => null),
          ];
        });

        await Promise.all(saveRequests);
      }

      router.push(
        `/checkout?booking=${encodeURIComponent(payload.bookingReference)}`
      );
    } catch {
      setError("Unable to create booking. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const showTravelerControls = isSignedIn && travelers !== null;

  return (
    <>
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Passenger Details
          </p>

          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Who is traveling?
          </h1>

          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
            Enter passenger information exactly as it appears on each
            traveler&apos;s travel documents.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {!isRoundTrip && flightId ? (
              <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
                Flight{" "}
                <span className="font-semibold text-slate-950">{flightId}</span>
              </div>
            ) : null}

            {isRoundTrip ? (
              <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
                Round trip
              </div>
            ) : null}

            <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
              Travelers{" "}
              <span className="font-semibold text-slate-950">
                {passengerCount}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12">
        {isRoundTrip ? (
          <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Trip summary</h2>

            {roundTripInvalid || !roundTripOutbound || !roundTripReturn ? (
              <p className="mt-3 text-sm text-slate-600">
                We could not verify the selected outbound and return flights.
                Please{" "}
                <Link
                  href="/flights"
                  className="font-semibold text-primary transition hover:text-primary-hover"
                >
                  search again
                </Link>
                .
              </p>
            ) : (
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                    Outbound
                  </p>
                  <p className="mt-2 text-xl font-semibold text-slate-950">
                    {formatRoute(
                      roundTripOutbound.originCode,
                      roundTripOutbound.destinationCode
                    )}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {formatDepartureDateShort(roundTripOutbound)} ·{" "}
                    {formatDepartureTime(roundTripOutbound)} →{" "}
                    {formatArrivalTime(roundTripOutbound)}
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {roundTripOutbound.code}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                    Return
                  </p>
                  <p className="mt-2 text-xl font-semibold text-slate-950">
                    {formatRoute(
                      roundTripReturn.originCode,
                      roundTripReturn.destinationCode
                    )}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {formatDepartureDateShort(roundTripReturn)} ·{" "}
                    {formatDepartureTime(roundTripReturn)} →{" "}
                    {formatArrivalTime(roundTripReturn)}
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {roundTripReturn.code}
                  </p>
                </div>
              </div>
            )}

            <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Round-trip checkout is coming next. Passenger details can be
              prepared here, but a booking will not be created yet.
            </p>
          </div>
        ) : null}

        {showTravelerControls && travelers.length === 0 && (
          <p className="mb-6 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600">
            Save your traveler details for faster booking next time.{" "}
            <Link
              href="/account/travelers"
              className="font-semibold text-primary transition hover:text-primary-hover"
            >
              Add a saved traveler
            </Link>
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {Array.from({ length: passengerCount }).map((_, index) => {
            const selection = selections[index] ?? "";
            const travelerId = selectionToTravelerId(
              selection,
              primaryTraveler?.id ?? null
            );
            const filledFromProfile = travelerId != null;
            const myselfSelectedWithoutPrimary =
              selection === SELECTION_MYSELF && !primaryTraveler;

            return (
              <div key={index} className="space-y-3">
                {showTravelerControls && (
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                      Passenger {index + 1}
                    </p>
                    <label
                      htmlFor={`traveler-select-${index}`}
                      className="mt-3 block text-sm font-medium text-slate-700"
                    >
                      Who is traveling?
                    </label>
                    <select
                      id={`traveler-select-${index}`}
                      value={selection}
                      onChange={(event) =>
                        handleSelectionChange(index, event.target.value)
                      }
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">Select traveler</option>
                      <option
                        value={SELECTION_MYSELF}
                        disabled={
                          primaryTraveler != null &&
                          usedTravelerIds.has(primaryTraveler.id) &&
                          selectionToTravelerId(
                            selection,
                            primaryTraveler.id
                          ) !== primaryTraveler.id
                        }
                      >
                        Myself
                      </option>
                      {(travelers ?? [])
                        .filter((traveler) => !traveler.isPrimary)
                        .map((traveler) => {
                          const selectedElsewhere =
                            usedTravelerIds.has(traveler.id) &&
                            selectionToTravelerId(
                              selection,
                              primaryTraveler?.id ?? null
                            ) !== traveler.id;

                          return (
                            <option
                              key={traveler.id}
                              value={`id:${traveler.id}`}
                              disabled={selectedElsewhere}
                            >
                              {travelerDisplayName(traveler)}
                            </option>
                          );
                        })}
                      <option value={SELECTION_OTHER}>Someone else</option>
                    </select>

                    {myselfSelectedWithoutPrimary && (
                      <p className="mt-3 text-sm text-slate-600">
                        Set up my traveler profile to fill these details
                        automatically.{" "}
                        <Link
                          href="/account/travelers"
                          className="font-semibold text-primary transition hover:text-primary-hover"
                        >
                          Set up my traveler profile
                        </Link>
                      </p>
                    )}

                    {filledFromProfile && (
                      <p className="mt-3 text-sm text-slate-600">
                        Details filled from your saved traveler profile. You
                        can review them below.
                      </p>
                    )}
                  </div>
                )}

                <PassengerForm
                  key={`${index}-${selection}`}
                  index={index}
                  defaults={defaultsForIndex(index)}
                  showSaveCheckbox={
                    isSignedIn &&
                    (selection === SELECTION_OTHER || selection === "")
                  }
                />
              </div>
            );
          })}

          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  Ready to continue?
                </h2>

                <p className="mt-1 text-sm text-slate-600">
                  {isRoundTrip
                    ? "Round-trip booking persistence is not available yet."
                    : "Review the passenger details before continuing to checkout."}
                </p>

                {error ? (
                  <p className="mt-3 text-sm font-medium text-red-600">
                    {error}
                  </p>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={isSubmitting || isRoundTrip || roundTripInvalid}
                className="rounded-xl bg-primary px-6 py-3 font-semibold text-white transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isRoundTrip
                  ? "Round-trip checkout coming next"
                  : isSubmitting
                    ? "Creating booking..."
                    : "Continue to Checkout"}
              </button>
            </div>
          </div>
        </form>
      </section>
    </>
  );
}
