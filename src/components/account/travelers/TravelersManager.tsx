"use client";

import { useState } from "react";

import DeleteTravelerButton from "./DeleteTravelerButton";
import TravelerForm from "./TravelerForm";
import { maskPassportNumber } from "../../../lib/sensitive-data";
import type { SafeTraveler } from "../../../lib/traveler-shared";

const buttonClassName =
  "rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30";
const secondaryButtonClassName =
  "rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30";

export default function TravelersManager({
  travelers,
}: {
  travelers: SafeTraveler[];
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [addAsPrimary, setAddAsPrimary] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  function startAdd(asPrimary: boolean) {
    setEditingId(null);
    setAddAsPrimary(asPrimary);
    setIsAdding(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          Saved travelers can be reused on future bookings. Changing a profile
          does not update past bookings. Your primary traveler is used for the
          &quot;Myself&quot; option during booking.
        </p>
        {!isAdding && (
          <button
            type="button"
            onClick={() => startAdd(false)}
            className={buttonClassName}
          >
            Add traveler
          </button>
        )}
      </div>

      {isAdding && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">
            {addAsPrimary ? "Add myself" : "Add traveler"}
          </h2>
          <div className="mt-5">
            <TravelerForm
              key={addAsPrimary ? "primary" : "traveler"}
              defaultPrimary={addAsPrimary}
              onCancel={() => setIsAdding(false)}
              onSaved={() => setIsAdding(false)}
            />
          </div>
        </div>
      )}

      {travelers.length === 0 && !isAdding ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-950">
            No saved travelers yet.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-slate-600">
            Add yourself or another traveler to speed up future bookings.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => startAdd(false)}
              className={buttonClassName}
            >
              Add traveler
            </button>
            <button
              type="button"
              onClick={() => startAdd(true)}
              className={secondaryButtonClassName}
            >
              Add myself
            </button>
          </div>
        </div>
      ) : (
        travelers.map((traveler) => {
          const fullName = `${traveler.firstName} ${traveler.lastName}`.trim();
          const label = traveler.label?.trim();

          return (
            <article
              key={traveler.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              {editingId === traveler.id ? (
                <>
                  <h2 className="text-xl font-semibold text-slate-950">
                    Edit traveler
                  </h2>
                  <div className="mt-5">
                    <TravelerForm
                      traveler={traveler}
                      onCancel={() => setEditingId(null)}
                      onSaved={() => setEditingId(null)}
                    />
                  </div>
                </>
              ) : (
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="break-words text-2xl font-semibold text-slate-950">
                        {fullName || "Saved traveler"}
                      </h2>
                      {traveler.isPrimary && (
                        <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-primary">
                          Primary
                        </span>
                      )}
                    </div>
                    {label ? (
                      <p className="mt-1 break-words text-sm text-slate-600">
                        {label}
                      </p>
                    ) : null}
                    <dl className="mt-4 space-y-2 text-sm">
                      <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
                        <dt className="w-40 shrink-0 text-slate-500">
                          Nationality
                        </dt>
                        <dd className="break-words text-slate-950">
                          {traveler.nationality}
                        </dd>
                      </div>
                      <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
                        <dt className="w-40 shrink-0 text-slate-500">
                          Passport country
                        </dt>
                        <dd className="break-words text-slate-950">
                          {traveler.passportCountry}
                        </dd>
                      </div>
                      <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
                        <dt className="w-40 shrink-0 text-slate-500">
                          Passport number
                        </dt>
                        <dd className="font-mono text-slate-950">
                          {maskPassportNumber(traveler.passportNumber)}
                        </dd>
                      </div>
                      <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
                        <dt className="w-40 shrink-0 text-slate-500">
                          Passport expiration
                        </dt>
                        <dd className="text-slate-950">
                          {traveler.passportExpiry}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAdding(false);
                        setEditingId(traveler.id);
                      }}
                      className="text-sm font-semibold text-primary transition hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    >
                      Edit traveler
                    </button>
                    <DeleteTravelerButton
                      travelerId={traveler.id}
                      travelerName={fullName || "this traveler"}
                    />
                  </div>
                </div>
              )}
            </article>
          );
        })
      )}
    </div>
  );
}
