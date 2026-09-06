"use client";

import { useRouter } from "next/navigation";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

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
  "mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none transition hover:border-slate-300 hover:bg-white focus:border-primary focus:bg-white focus-visible:ring-2 focus-visible:ring-primary/15";

const labelClassName =
  "block text-[10px] font-semibold uppercase tracking-[0.17em] text-slate-400";

function TicketSurface({
  children,
  className = "",
  tone = "white",
}: {
  children: ReactNode;
  className?: string;
  tone?: "white" | "amber";
}) {
  const isAmber = tone === "amber";
  const bodyClassName = isAmber ? "bg-amber-50/80" : "bg-slate-50";
  const borderClassName = isAmber ? "border-amber-200" : "border-slate-200";
  const cutoutClassName = "bg-slate-50";

  return (
    <div
      className={`relative  isolate ${bodyClassName}  ${className}`}
    >
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 border-y ${borderClassName}`}
      />

      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -left-5 -top-5 z-20 h-10 w-10 rounded-full  ${borderClassName} bg-white`}
      />
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -bottom-5 -left-5 z-20 h-10 w-10 rounded-full  ${borderClassName} bg-white`}
      />
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -right-5 -top-5 z-20 h-10 w-10 rounded-full ${borderClassName} bg-white`}
      />
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -bottom-5 -right-5 z-20 h-10 w-10 rounded-full  ${borderClassName} bg-white`}
      />

      <div className="relative z-10">{children}</div>
    </div>
  );
}

function CloseIcon() {

  return (

    <svg

aria-hidden="true"

viewBox="0 0 20 20"

className="h-4 w-4"

fill="none"

stroke="currentColor"

strokeWidth="2"

    >

      <path d="M5 5l10 10M15 5 5 15" strokeLinecap="round" />

    </svg>

  );

}

function FilterControls({

filters,

onChange,

maxCatalogPriceDollars,

idPrefix,

variant = "sidebar",

}: {

  filters: FlightResultsFilterState;

  onChange: (next: FlightResultsFilterState) => void;

  onReset: () => void;

  maxCatalogPriceDollars: number;

  idPrefix: string;

/** sidebar = desktop stacked column; drawer = mobile stacked column. */

  variant?: "sidebar" | "drawer";

}) {

  const [priceDraft, setPriceDraft] = useState(

    filters.maxPriceDollars == null ? "" : String(filters.maxPriceDollars)

  );

  useEffect(() => {

    setPriceDraft(

filters.maxPriceDollars == null ? "" : String(filters.maxPriceDollars)

    );

  }, [filters.maxPriceDollars]);

  const layoutClassName = "grid gap-5";

  return (

    <div className={layoutClassName}>

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

  const [drawerOpen, setDrawerOpen] = useState(false);

  const dialogRef = useRef<HTMLDialogElement>(null);

  const filtersButtonRef = useRef<HTMLButtonElement>(null);

  const titleId = useId();

  const desktopId = useId();

  const drawerId = useId();

  useEffect(() => {

    const dialog = dialogRef.current;

    if (!dialog) {

      return;

    }

    if (drawerOpen && !dialog.open) {

      dialog.showModal();

    } else if (!drawerOpen && dialog.open) {

      dialog.close();

    }

  }, [drawerOpen]);

  useEffect(() => {

    if (!drawerOpen) {

      return;

    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {

      document.body.style.overflow = previousOverflow;

    };

  }, [drawerOpen]);

  function openDrawer() {

    setDrawerOpen(true);

  }

  function closeDrawer() {

    setDrawerOpen(false);

    window.setTimeout(() => {

      filtersButtonRef.current?.focus();

    }, 0);

  }

  return (

    <>

      <div

className="

          hidden

          min-[900px]:block

          min-[900px]:sticky

          min-[900px]:top-20

          min-[900px]:self-start

        "

      >

        <TicketSurface className="transition duration-300 ">
          <div className="relative px-5 py-5 lg:px-6 lg:py-6">
            <div className="flex items-start justify-between gap-3 border-b border-dashed border-slate-200 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                    Flight search
                  </span>
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Filters
                  </span>
                </div>
                <p className="mt-2 text-xl font-american-sans tracking-tight text-slate-950">
                  Refine your trip
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Narrow the available flights to match your preferences.
                </p>
              </div>

              {!isDefaultFlightResultsFilters(filters) ? (
                <button
                  type="button"
                  onClick={onReset}
                  className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-primary transition hover:border-primary hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  Reset
                </button>
              ) : null}
            </div>

            <div className="mt-5">
              <FilterControls
                idPrefix={desktopId}
                variant="sidebar"
                filters={filters}
                onChange={onChange}
                onReset={onReset}
                maxCatalogPriceDollars={maxCatalogPriceDollars}
              />
            </div>

            <div className="mt-6 border-t border-dashed border-slate-200 pt-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Search options
                </span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 text-primary"
                  aria-hidden="true"
                >
                  <path d="M4 12h16" />
                  <path d="m14 6 6 6-6 6" />
                </svg>
              </div>
            </div>
          </div>
        </TicketSurface>

      </div>

      <div className="mb-5 min-[900px]:hidden">

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">

          <button

ref={filtersButtonRef}

type="button"

className="

              inline-flex

              min-h-11

              w-full

              items-center

              justify-center

              border-y

              border-slate-200

              bg-white

              px-4

              py-2.5

              text-sm

              font-american-sans

              text-slate-900

              shadow-sm

              transition

              hover:border-primary

              hover:text-primary

              focus-visible:outline-none

              focus-visible:ring-2

              focus-visible:ring-primary/30

              sm:w-auto

            "

onClick={openDrawer}

aria-haspopup="dialog"

aria-expanded={drawerOpen}

          >

            Filters

          </button>

          <div className="min-w-0 flex-1">

            <label

className={labelClassName}

htmlFor={`${drawerId}-sort-inline`}

            >

              Sort by

            </label>

            <select

id={`${drawerId}-sort-inline`}

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

role="dialog"

aria-modal="true"

aria-labelledby={titleId}

className="

            fixed

            inset-0

            m-0

            max-h-none

            w-full

            max-w-none

            border-0

            bg-transparent

            p-0

            open:flex

            open:items-end

            open:justify-center

            sm:open:items-stretch

            sm:open:justify-end

            [&::backdrop]:bg-slate-950/40

            [&::backdrop]:backdrop-blur-[1px]

          "

onClose={closeDrawer}

onCancel={(event) => {

            event.preventDefault();

            closeDrawer();

          }}

onClick={(event) => {

            if (event.target === dialogRef.current) {

              closeDrawer();

            }

          }}

        >

          <div

className="

              flex

              max-h-[88dvh]

              w-full

              max-w-full

              flex-col

              overflow-hidden

              border-y

              border-slate-200

              bg-white

              shadow-2xl

              sm:h-full

              sm:max-h-none

              sm:w-[min(100%,25rem)]

              sm:rounded-none

              sm:rounded-l-3xl

              sm:border-y-0

              sm:border-r-0

            "

onClick={(event) => event.stopPropagation()}

          >

            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">

              <h2

id={titleId}

className="text-lg font-american-sans tracking-tight text-slate-950"

              >

                Filters

              </h2>

              <button

type="button"

onClick={closeDrawer}

className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"

aria-label="Close filters"

              >

                <CloseIcon />

              </button>

            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">

              <FilterControls

idPrefix={`${drawerId}-panel`}

variant="drawer"

filters={filters}

onChange={onChange}

onReset={onReset}

maxCatalogPriceDollars={maxCatalogPriceDollars}

              />

            </div>

            <div className="shrink-0 space-y-3 border-t border-slate-200 bg-white px-5 py-4">

              <button

type="button"

onClick={onReset}

disabled={isDefaultFlightResultsFilters(filters)}

className="inline-flex w-full justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-american-sans text-slate-800 transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-40"

              >

                Reset filters

              </button>

              <button

type="button"

className="inline-flex w-full justify-center rounded-xl bg-primary px-4 py-3 text-sm font-american-sans text-white transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"

onClick={closeDrawer}

              >

                Show results

              </button>

            </div>

          </div>

        </dialog>

      </div>

    </>

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

      <div className="space-y-4 sm:space-y-5">

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

      <div

className="

          min-[900px]:grid

          min-[900px]:grid-cols-[240px_minmax(0,1fr)]

          min-[1024px]:grid-cols-[260px_minmax(0,1fr)]

          min-[1280px]:grid-cols-[280px_minmax(0,1fr)]

          min-[900px]:gap-5

          lg:gap-6

          xl:gap-8

        "

      >

        <FlightResultsFiltersBar

filters={filters}

onChange={setFilters}

onReset={reset}

maxCatalogPriceDollars={maxCatalogPriceDollars}

        />

        <div className="min-w-0">

          {allHidden ? (

            <TicketSurface>
              <div className="px-6 py-8 text-center sm:px-8 sm:py-10">

              <h3 className="text-2xl font-american-sans text-slate-950">

                No flights match your filters.

              </h3>

              <p className="mt-2 text-slate-600">

                Try adjusting departure time, price, or sort options.

              </p>

              <button

type="button"

onClick={reset}

className="mt-5 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-american-sans text-white transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"

              >

                Reset filters

              </button>

              </div>
            </TicketSurface>

          ) : (

            <>

              <div className="mb-6 flex flex-col gap-3 border-b border-dashed border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">

                <div>

                  {headingMode === "available" ? (

                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                        Flight options
                      </p>
                      <h2 className="mt-1 text-2xl font-american-sans tracking-tight text-slate-950">
                        Available flights
                      </h2>
                    </div>

                  ) : null}

                  {filtered.exactCount > 0 && requestedDate ? (

                    <p className="mb-0 mt-1.5 text-sm font-medium text-slate-600">

                      {formatSearchDateLong(requestedDate)}

                    </p>

                  ) : null}

                </div>

                {filtered.exactCount > 0 ? (

                  <p className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500">

                    {filtered.exactCount}{" "}

                    {filtered.exactCount === 1 ? "flight" : "flights"} found

                  </p>

                ) : null}

              </div>

              {filtered.exactCount > 0 ? (

                renderCards(filtered.exactFlights)

              ) : hadExactSearch ? (

                <TicketSurface tone="amber">
                  <div className="px-6 py-5 sm:px-7 sm:py-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700">Travel notice</p>
                  <h3 className="text-lg font-american-sans text-slate-950">

                    No flights on your selected date match these filters.

                  </h3>

                  {filtered.alternateCount > 0 ? (

                    <p className="mt-2 text-sm text-slate-600">

                      Matching flights on nearby dates are listed below.

                    </p>

                  ) : null}

                  </div>
                </TicketSurface>

              ) : hadAlternateSearch ? (

                <TicketSurface tone="amber">
                  <div className="px-6 py-5 sm:px-7 sm:py-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700">Travel notice</p>
                  <h3 className="text-lg font-american-sans text-slate-950">

                    No flights available on {formatSearchDate(requestedDate)}.

                  </h3>

                  <p className="mt-2 text-sm text-slate-600">

                    Nearby flights on the same route are listed below.

                  </p>

                  </div>
                </TicketSurface>

              ) : null}

              {filtered.alternateGroups.length > 0 ? (

                <div className="mt-10 border-t border-dashed border-slate-300 pt-8 sm:mt-12 sm:pt-10">

                  <div className="mb-6 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                        Flexible travel
                      </p>
                      <h2 className="mt-1 text-2xl font-american-sans tracking-tight text-slate-950">
                        Other available flights
                      </h2>
                      <p className="mt-1.5 text-sm text-slate-600">
                        Nearby dates on the same route with enough seats.
                      </p>
                    </div>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="hidden h-5 w-5 text-slate-400 sm:block"
                      aria-hidden="true"
                    >
                      <path d="M4 12h16" />
                      <path d="m14 6 6 6-6 6" />
                    </svg>
                  </div>

                  <div className="space-y-7 sm:space-y-8">

                    {filtered.alternateGroups.map((group) => (

                      <div key={group.date}>

                        <div className="mb-4 flex items-center gap-3">
                          <span className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.17em] text-primary">
                            {formatSearchDateLong(group.date)}
                          </span>
                          <span className="h-px flex-1 border-t border-dashed border-slate-200" />
                        </div>

                        {renderCards(group.flights)}

                      </div>

                    ))}

                  </div>

                </div>

              ) : null}

            </>

          )}

        </div>

      </div>

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