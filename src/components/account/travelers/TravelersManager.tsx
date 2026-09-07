"use client";

import { useState } from "react";

import DeleteTravelerButton from "./DeleteTravelerButton";
import TravelerForm from "./TravelerForm";

import { maskPassportNumber } from "../../../lib/sensitive-data";
import type { SafeTraveler } from "../../../lib/traveler-shared";

const buttonClassName =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0078D2] px-5 py-3 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(0,120,210,0.18)] transition hover:bg-[#006bbd] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078D2]/30 focus-visible:ring-offset-2";

const secondaryButtonClassName =
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#0078D2]/30 hover:bg-[#f5faff] hover:text-[#0078D2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078D2]/30";

function PlusIcon() {
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
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function EditIcon() {
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
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
    </svg>
  );
}

function TicketCutouts() {
  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-5 -top-5 z-30 h-10 w-10 rounded-full bg-slate-50"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-5 -top-5 z-30 h-10 w-10 rounded-full bg-slate-50"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-5 -left-5 z-30 h-10 w-10 rounded-full bg-slate-50"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-5 -right-5 z-30 h-10 w-10 rounded-full bg-slate-50"
      />
    </>
  );
}

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
    <div className="space-y-7">
      {/* Intro */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          Saved travelers can be reused on future bookings. Changing a profile
          does not update past bookings. Your primary traveler is used for the
          &quot;Myself&quot; option during booking.
        </p>

        {!isAdding ? (
          <button
            type="button"
            onClick={() => startAdd(false)}
            className={`${buttonClassName} shrink-0`}
          >
            <PlusIcon />
            Add traveler
          </button>
        ) : null}
      </div>

      {/* Add traveler ticket */}
      {isAdding ? (
        <section className="relative isolate min-w-0">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-10 -bottom-3 -z-10 h-8 rounded-[50%] bg-slate-950/10 blur-2xl"
          />

          <div className="relative overflow-hidden bg-white shadow-[0_8px_30px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/90">
            <TicketCutouts />

            <div className="relative border-b border-dashed border-slate-300 px-5 py-6 sm:px-6">
              <span
                aria-hidden="true"
                className="absolute -bottom-3 -left-3 h-6 w-6 rounded-full bg-slate-50 ring-1 ring-slate-200"
              />
              <span
                aria-hidden="true"
                className="absolute -bottom-3 -right-3 h-6 w-6 rounded-full bg-slate-50 ring-1 ring-slate-200"
              />

              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
                Traveler ticket
              </p>

              <h2 className="font-american-sans mt-2 text-2xl font-light tracking-[-0.025em] text-slate-950">
                {addAsPrimary ? "Add myself" : "Add traveler"}
              </h2>
            </div>

            <div className="px-5 py-6 sm:px-6">
              <TravelerForm
                key={addAsPrimary ? "primary" : "traveler"}
                defaultPrimary={addAsPrimary}
                onCancel={() => setIsAdding(false)}
                onSaved={() => setIsAdding(false)}
              />
            </div>
          </div>
        </section>
      ) : null}

      {/* Empty state ticket */}
      {travelers.length === 0 && !isAdding ? (
        <section className="relative isolate">
          <div className="relative overflow-hidden bg-white px-6 py-10 text-center shadow-[0_8px_30px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/90">
            <TicketCutouts />

            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
              Traveler ticket
            </p>

            <h2 className="font-american-sans mt-3 text-3xl font-light tracking-[-0.03em] text-slate-950">
              No saved travelers yet
            </h2>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
              Add yourself or another traveler to speed up future bookings.
            </p>

            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => startAdd(false)}
                className={buttonClassName}
              >
                <PlusIcon />
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

            <div className="mt-8 border-t border-dashed border-slate-300 pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Five Stars • Traveler profiles
              </p>
            </div>
          </div>
        </section>
      ) : (
        <div className="grid min-w-0 gap-6 xl:grid-cols-2">
          {travelers.map((traveler) => {
            const fullName =
              `${traveler.firstName} ${traveler.lastName}`.trim();

            const label = traveler.label?.trim();
            const isEditing = editingId === traveler.id;

            return (
              <article
                key={traveler.id}
                className="group relative isolate min-w-0"
              >
                {/* Ticket shadow */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-8 -bottom-3 -z-10 h-8 rounded-[50%] bg-slate-950/10 blur-2xl transition group-hover:bg-slate-950/15"
                />

                <div className="relative h-full overflow-hidden bg-white shadow-[0_8px_28px_rgba(15,23,42,0.07)] ring-1 ring-slate-200/90 transition duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_14px_34px_rgba(15,23,42,0.10)]">
                  <TicketCutouts />

                  {isEditing ? (
                    <>
                      <div className="relative border-b border-dashed border-slate-300 px-5 py-6 sm:px-6">
                        <span
                          aria-hidden="true"
                          className="absolute -bottom-3 -left-3 h-6 w-6 rounded-full bg-slate-50 ring-1 ring-slate-200"
                        />
                        <span
                          aria-hidden="true"
                          className="absolute -bottom-3 -right-3 h-6 w-6 rounded-full bg-slate-50 ring-1 ring-slate-200"
                        />

                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
                          Traveler ticket
                        </p>

                        <h2 className="font-american-sans mt-2 text-2xl font-light tracking-[-0.025em] text-slate-950">
                          Edit traveler
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                          {fullName || "Saved traveler"}
                        </p>
                      </div>

                      <div className="px-5 py-6 sm:px-6">
                        <TravelerForm
                          traveler={traveler}
                          onCancel={() => setEditingId(null)}
                          onSaved={() => setEditingId(null)}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="flex h-full min-w-0">
                      {/* Main ticket */}
                      <div className="flex min-w-0 flex-1 flex-col justify-between px-5 py-6 sm:px-6">
                        <div className="min-w-0">
                          {/* Ticket header */}
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
                                Traveler
                              </p>

                              {traveler.isPrimary ? (
                                <span className="rounded-md border border-[#0078D2]/15 bg-[#0078D2]/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#0078D2]">
                                  Primary
                                </span>
                              ) : null}
                            </div>

                            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                              Five Stars
                            </span>
                          </div>

                          {/* Passenger identity */}
                          <h2 className="font-american-sans mt-3 break-words text-[1.8rem] font-light leading-tight tracking-[-0.03em] text-slate-950">
                            {fullName || "Saved traveler"}
                          </h2>

                          {label ? (
                            <p className="mt-1 text-sm text-slate-500">
                              {label}
                            </p>
                          ) : null}

                          {/* Ticket details */}
                          <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-5 border-t border-slate-100 pt-5">
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                Nationality
                              </p>
                              <p className="mt-1 text-sm font-medium text-slate-950">
                                {traveler.nationality}
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                Passport country
                              </p>
                              <p className="mt-1 text-sm font-medium text-slate-950">
                                {traveler.passportCountry}
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                Passport
                              </p>
                              <p className="mt-1 font-mono text-sm font-medium text-slate-950">
                                {maskPassportNumber(traveler.passportNumber)}
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                Expires
                              </p>
                              <p className="mt-1 text-sm font-medium text-slate-950">
                                {traveler.passportExpiry}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="mt-6 border-t border-dashed border-slate-300 pt-4">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                            Five Stars • Traveler profile
                          </p>
                        </div>
                      </div>

                      {/* Ticket stub */}
                      <div className="relative flex w-[88px] shrink-0 flex-col items-center justify-center border-l border-dashed border-slate-300 bg-slate-50/80 px-2">
                        <span
                          aria-hidden="true"
                          className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-slate-50 ring-1 ring-slate-200"
                        />
                        <span
                          aria-hidden="true"
                          className="absolute -bottom-3 -left-3 h-6 w-6 rounded-full bg-slate-50 ring-1 ring-slate-200"
                        />

                        <button
                          type="button"
                          onClick={() => {
                            setIsAdding(false);
                            setEditingId(traveler.id);
                          }}
                          aria-label={`Edit ${fullName || "traveler"}`}
                          className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-[#0078D2] shadow-sm transition hover:border-[#0078D2]/30 hover:bg-[#0078D2] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078D2]/30"
                        >
                          <EditIcon />
                        </button>

                        <span className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                          Edit
                        </span>

                        <div className="my-4 h-px w-8 bg-slate-200" />

                        <DeleteTravelerButton
                          travelerId={traveler.id}
                          travelerName={fullName || "this traveler"}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}