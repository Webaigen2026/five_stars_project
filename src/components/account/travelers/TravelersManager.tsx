"use client";

import { useState } from "react";

import DeleteTravelerButton from "./DeleteTravelerButton";
import TravelerForm from "./TravelerForm";
import {
  maskPassportNumber,
  travelerDisplayName,
  type SafeTraveler,
} from "../../../lib/traveler-shared";

export default function TravelersManager({
  travelers,
}: {
  travelers: SafeTraveler[];
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Saved travelers can be reused on future bookings. Changing a profile
          does not update past bookings.
        </p>
        {!isAdding && (
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setIsAdding(true);
            }}
            className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover"
          >
            Add traveler
          </button>
        )}
      </div>

      {isAdding && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">Add traveler</h2>
          <div className="mt-5">
            <TravelerForm
              onCancel={() => setIsAdding(false)}
              onSaved={() => setIsAdding(false)}
            />
          </div>
        </div>
      )}

      {travelers.length === 0 && !isAdding ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-950">
            No saved travelers yet
          </h2>
          <p className="mt-3 text-slate-600">
            Save traveler details once and reuse them the next time you book.
          </p>
        </div>
      ) : (
        travelers.map((traveler) => (
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
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-semibold text-slate-950">
                      {travelerDisplayName(traveler)}
                    </h2>
                    {traveler.isPrimary && (
                      <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-primary">
                        Primary
                      </span>
                    )}
                  </div>
                  <dl className="mt-4 space-y-2 text-sm">
                    <div className="flex gap-3">
                      <dt className="w-40 text-slate-500">Nationality</dt>
                      <dd className="text-slate-950">{traveler.nationality}</dd>
                    </div>
                    <div className="flex gap-3">
                      <dt className="w-40 text-slate-500">Passport country</dt>
                      <dd className="text-slate-950">{traveler.passportCountry}</dd>
                    </div>
                    <div className="flex gap-3">
                      <dt className="w-40 text-slate-500">Passport number</dt>
                      <dd className="font-mono text-slate-950">
                        {maskPassportNumber(traveler.passportNumber)}
                      </dd>
                    </div>
                    <div className="flex gap-3">
                      <dt className="w-40 text-slate-500">Passport expiration</dt>
                      <dd className="text-slate-950">{traveler.passportExpiry}</dd>
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
                    className="text-sm font-semibold text-primary transition hover:text-primary-hover"
                  >
                    Edit
                  </button>
                  <DeleteTravelerButton
                    travelerId={traveler.id}
                    travelerName={travelerDisplayName(traveler)}
                  />
                </div>
              </div>
            )}
          </article>
        ))
      )}
    </div>
  );
}
