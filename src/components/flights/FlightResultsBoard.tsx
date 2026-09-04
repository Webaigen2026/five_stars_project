"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import FareSelectionModal from "./FareSelectionModal";
import FlightResultCard, {
  type FlightResultCardFlight,
} from "./FlightResultCard";
import type { FareFamily } from "../../lib/fare-families";
import {
  DEFAULT_FLIGHT_RESULTS_FILTERS,
  applyFlightResultsFilters,
  isDefaultFlightResultsFilters,
  parseMaxPriceDollarsInput,
  type DepartureTimeBand,
  type FlightResultsFilterState,
  type FlightResultsSort,
  type StopsFilter,
} from "../../lib/flight-results-filters";
import {
  buildFareContinueHref,
  formatSearchDate,
  formatSearchDateLong,
} from "../../lib/flight-search";

export type BoardFlight = FlightResultCardFlight & {
  stops?: number;
};

export type BoardAlternateGroup = {
  date: string;
  flights: BoardFlight[];
};

export type FareContinueContext = {
  mode: "one-way" | "round-trip-outbound" | "round-trip-return";
  passengers: string;
  adults: string;
  seniors: string;
  children: string;
  infants: string;
  from?: string;
  to?: string;
  departure?: string;
  returnDate?: string;
  outboundFlightId?: number;
  outboundFareFamily?: string;
  passengerCount: number;
};

type FlightResultsBoardProps = {
  requestedDate: string;
  exactFlights: BoardFlight[];
  alternateGroups: BoardAlternateGroup[];
  selectLabel?: string;
  /** Remount key so round-trip return step starts with default filters. */
  filterScopeKey: string;
  headingMode?: "available" | "step";
  fareContinue: FareContinueContext;
};

const selectClassName =
  "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30";

const labelClassName =
  "block text-xs font-semibold uppercase tracking-wide text-slate-500";

function FilterControls({
  filters,
  onChange,
  onReset,
  maxCatalogPriceDollars,
  idPrefix,
}: {
  filters: FlightResultsFilterState;
  onChange: (next: FlightResultsFilterState) => void;
  onReset: () => void;
  maxCatalogPriceDollars: number;
  idPrefix: string;
}) {
  const [priceDraft, setPriceDraft] = useState(
    filters.maxPriceDollars == null ? "" : String(filters.maxPriceDollars)
  );

  useEffect(() => {
    setPriceDraft(
      filters.maxPriceDollars == null ? "" : String(filters.maxPriceDollars)
    );
  }, [filters.maxPriceDollars]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1.1fr_1fr_1fr_1.2fr_auto] lg:items-end">
      <div>
        <label className={labelClassName} htmlFor={`${idPrefix}-departure`}>
          Departure
        </label>
        <select
          id={`${idPrefix}-departure`}
          className={selectClassName}
          value={filters.departureBand}
          onChange={(event) =>
            onChange({
              ...filters,
              departureBand: event.target.value as DepartureTimeBand,
            })
          }
        >
          <option value="any">Any time</option>
          <option value="morning">Morning (5:00 AM–11:59 AM)</option>
          <option value="afternoon">Afternoon (12:00 PM–4:59 PM)</option>
          <option value="evening">Evening (5:00 PM–11:59 PM)</option>
          <option value="overnight">Overnight (12:00 AM–4:59 AM)</option>
        </select>
      </div>

      <div>
        <label className={labelClassName} htmlFor={`${idPrefix}-max-price`}>
          Max price
        </label>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-sm text-slate-500" aria-hidden>
            $
          </span>
          <input
            id={`${idPrefix}-max-price`}
            type="number"
            inputMode="decimal"
            min={0}
            max={Math.max(maxCatalogPriceDollars, 0)}
            step={1}
            placeholder="No limit"
            className={`${selectClassName} mt-0`}
            value={priceDraft}
            onChange={(event) => {
              setPriceDraft(event.target.value);
              onChange({
                ...filters,
                maxPriceDollars: parseMaxPriceDollarsInput(event.target.value),
              });
            }}
          />
        </div>
      </div>

      <div>
        <label className={labelClassName} htmlFor={`${idPrefix}-stops`}>
          Stops
        </label>
        <select
          id={`${idPrefix}-stops`}
          className={selectClassName}
          value={filters.stops}
          onChange={(event) =>
            onChange({
              ...filters,
              stops: event.target.value as StopsFilter,
            })
          }
        >
          <option value="nonstop">Nonstop</option>
          <option value="any">Any</option>
        </select>
      </div>

      <div>
        <label className={labelClassName} htmlFor={`${idPrefix}-sort`}>
          Sort by
        </label>
        <select
          id={`${idPrefix}-sort`}
          className={selectClassName}
          value={filters.sort}
          onChange={(event) =>
            onChange({
              ...filters,
              sort: event.target.value as FlightResultsSort,
            })
          }
        >
          <option value="recommended">Recommended</option>
          <option value="price-asc">Lowest price</option>
          <option value="price-desc">Highest price</option>
          <option value="departure-asc">Earliest departure</option>
          <option value="departure-desc">Latest departure</option>
        </select>
      </div>

      <div className="flex items-end">
        <button
          type="button"
          onClick={onReset}
          disabled={isDefaultFlightResultsFilters(filters)}
          className="inline-flex w-full justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

function FlightResultsFiltersBar({
  filters,
  onChange,
  onReset,
  maxCatalogPriceDollars,
}: {
  filters: FlightResultsFilterState;
  onChange: (next: FlightResultsFilterState) => void;
  onReset: () => void;
  maxCatalogPriceDollars: number;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const desktopId = useId();
  const mobileId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (mobileOpen && !dialog.open) {
      dialog.showModal();
    } else if (!mobileOpen && dialog.open) {
      dialog.close();
    }
  }, [mobileOpen]);

  return (
    <div className="mb-8">
      <div className="hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:block">
        <p className="text-sm font-semibold text-slate-950">Filters</p>
        <div className="mt-4">
          <FilterControls
            idPrefix={desktopId}
            filters={filters}
            onChange={onChange}
            onReset={onReset}
            maxCatalogPriceDollars={maxCatalogPriceDollars}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 lg:hidden">
        <button
          type="button"
          className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          onClick={() => setMobileOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={mobileOpen}
        >
          Filters
        </button>

        <div className="min-w-0 flex-1">
          <label className={labelClassName} htmlFor={`${mobileId}-sort-inline`}>
            Sort by
          </label>
          <select
            id={`${mobileId}-sort-inline`}
            className={selectClassName}
            value={filters.sort}
            onChange={(event) =>
              onChange({
                ...filters,
                sort: event.target.value as FlightResultsSort,
              })
            }
          >
            <option value="recommended">Recommended</option>
            <option value="price-asc">Lowest price</option>
            <option value="price-desc">Highest price</option>
            <option value="departure-asc">Earliest departure</option>
            <option value="departure-desc">Latest departure</option>
          </select>
        </div>
      </div>

      <dialog
        ref={dialogRef}
        className="m-auto w-[min(100%,24rem)] rounded-3xl border border-slate-200 bg-white p-0 shadow-xl backdrop:bg-slate-950/40"
        aria-labelledby={titleId}
        onClose={() => setMobileOpen(false)}
        onCancel={(event) => {
          event.preventDefault();
          setMobileOpen(false);
        }}
      >
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 id={titleId} className="text-lg font-semibold text-slate-950">
              Filters
            </h2>
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-600 transition hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              onClick={() => setMobileOpen(false)}
            >
              Close
            </button>
          </div>

          <div className="mt-4">
            <FilterControls
              idPrefix={`${mobileId}-panel`}
              filters={filters}
              onChange={onChange}
              onReset={onReset}
              maxCatalogPriceDollars={maxCatalogPriceDollars}
            />
          </div>

          <button
            type="button"
            className="mt-5 inline-flex w-full justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            onClick={() => setMobileOpen(false)}
          >
            Show results
          </button>
        </div>
      </dialog>
    </div>
  );
}

function FlightResultsBoardInner({
  requestedDate,
  exactFlights,
  alternateGroups,
  selectLabel = "Select Flight",
  headingMode = "available",
  fareContinue,
}: Omit<FlightResultsBoardProps, "filterScopeKey">) {
  const router = useRouter();
  const [filters, setFilters] = useState<FlightResultsFilterState>(
    DEFAULT_FLIGHT_RESULTS_FILTERS
  );
  const [selectedFlight, setSelectedFlight] = useState<BoardFlight | null>(
    null
  );
  const openerRef = useRef<HTMLElement | null>(null);

  const hadExactSearch = exactFlights.length > 0;
  const hadAlternateSearch = alternateGroups.some(
    (group) => group.flights.length > 0
  );

  const maxCatalogPriceDollars = useMemo(() => {
    const prices = [
      ...exactFlights.map((flight) => flight.price),
      ...alternateGroups.flatMap((group) =>
        group.flights.map((flight) => flight.price)
      ),
    ];
    if (prices.length === 0) {
      return 1000;
    }
    return Math.ceil(Math.max(...prices) / 100);
  }, [exactFlights, alternateGroups]);

  const filtered = useMemo(
    () => applyFlightResultsFilters(exactFlights, alternateGroups, filters),
    [exactFlights, alternateGroups, filters]
  );

  const reset = () => setFilters(DEFAULT_FLIGHT_RESULTS_FILTERS);

  const allHidden =
    filtered.exactCount === 0 && filtered.alternateCount === 0;

  const fareModalOpen = selectedFlight != null;

  function openFareModal(flight: BoardFlight) {
    openerRef.current =
      typeof document !== "undefined"
        ? (document.activeElement as HTMLElement | null)
        : null;
    setSelectedFlight(flight);
  }

  function closeFareModal() {
    setSelectedFlight(null);
    const opener = openerRef.current;
    openerRef.current = null;
    if (opener && typeof opener.focus === "function") {
      window.setTimeout(() => opener.focus(), 0);
    }
  }

  function handleSelectFare(family: FareFamily) {
    if (!selectedFlight) {
      return;
    }

    const href = buildFareContinueHref({
      mode: fareContinue.mode,
      fareFamily: family,
      flightCode: selectedFlight.code,
      flightId: selectedFlight.id,
      passengers: fareContinue.passengers,
      adults: fareContinue.adults,
      seniors: fareContinue.seniors,
      children: fareContinue.children,
      infants: fareContinue.infants,
      from: fareContinue.from,
      to: fareContinue.to,
      departure: fareContinue.departure,
      returnDate: fareContinue.returnDate,
      outboundFlightId: fareContinue.outboundFlightId,
      outboundFareFamily: fareContinue.outboundFareFamily,
    });

    router.push(href);
  }

  const legLabel =
    fareContinue.mode === "round-trip-return"
      ? "Choose your return fare"
      : fareContinue.mode === "round-trip-outbound"
        ? "Choose your outbound fare"
        : "Choose your fare";

  function renderCards(flights: BoardFlight[]) {
    return (
      <div className="space-y-5">
        {flights.map((flight) => (
          <FlightResultCard
            key={flight.id}
            flight={flight}
            selectLabel={selectLabel}
            onSelect={() => openFareModal(flight)}
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      <FlightResultsFiltersBar
        filters={filters}
        onChange={setFilters}
        onReset={reset}
        maxCatalogPriceDollars={maxCatalogPriceDollars}
      />

      {allHidden ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center">
          <h3 className="text-2xl font-semibold text-slate-950">
            No flights match your filters.
          </h3>
          <p className="mt-3 text-slate-600">
            Try adjusting departure time, price, or sort options.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              {headingMode === "available" ? (
                <h2 className="text-2xl font-semibold text-slate-950">
                  Available flights
                </h2>
              ) : null}
              {filtered.exactCount > 0 && requestedDate ? (
                <p className="mb-0 mt-2 text-sm font-medium text-slate-600">
                  {formatSearchDateLong(requestedDate)}
                </p>
              ) : null}
            </div>

            {filtered.exactCount > 0 ? (
              <p className="text-sm text-slate-500">
                {filtered.exactCount}{" "}
                {filtered.exactCount === 1 ? "flight" : "flights"} found
              </p>
            ) : null}
          </div>

          {filtered.exactCount > 0 ? (
            renderCards(filtered.exactFlights)
          ) : hadExactSearch ? (
            <div className="rounded-3xl border border-amber-200 bg-amber-50/80 px-6 py-5">
              <h3 className="text-lg font-semibold text-slate-950">
                No flights on your selected date match these filters.
              </h3>
              {filtered.alternateCount > 0 ? (
                <p className="mt-2 text-sm text-slate-600">
                  Matching flights on nearby dates are listed below.
                </p>
              ) : null}
            </div>
          ) : hadAlternateSearch ? (
            <div className="rounded-3xl border border-amber-200 bg-amber-50/80 px-6 py-5">
              <h3 className="text-lg font-semibold text-slate-950">
                No flights available on {formatSearchDate(requestedDate)}.
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Nearby flights on the same route are listed below.
              </p>
            </div>
          ) : null}

          {filtered.alternateGroups.length > 0 ? (
            <div className="mt-12 border-t border-slate-200 pt-10">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-slate-950">
                  Other available flights
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Nearby dates on the same route with enough seats.
                </p>
              </div>

              <div className="space-y-10">
                {filtered.alternateGroups.map((group) => (
                  <div key={group.date}>
                    <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                      {formatSearchDateLong(group.date)}
                    </p>
                    {renderCards(group.flights)}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}

      <FareSelectionModal
        isOpen={fareModalOpen}
        flight={selectedFlight}
        passengerCount={fareContinue.passengerCount}
        legLabel={legLabel}
        onClose={closeFareModal}
        onSelectFare={handleSelectFare}
      />
    </div>
  );
}

export default function FlightResultsBoard(props: FlightResultsBoardProps) {
  return (
    <FlightResultsBoardInner
      key={props.filterScopeKey}
      requestedDate={props.requestedDate}
      exactFlights={props.exactFlights}
      alternateGroups={props.alternateGroups}
      selectLabel={props.selectLabel}
      headingMode={props.headingMode}
      fareContinue={props.fareContinue}
    />
  );
}
