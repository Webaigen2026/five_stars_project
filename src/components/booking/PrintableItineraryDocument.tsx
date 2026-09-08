import BookingStatusBadge from "./BookingStatusBadge";
import CopyBookingReferenceButton from "./CopyBookingReferenceButton";

import {
  formatMoney,
  type PrintItineraryViewModel,
} from "../../lib/print-itinerary";

type PrintableItineraryDocumentProps = {
  model: PrintItineraryViewModel;
};

function ArrowRightIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function RouteConnector({
  durationLabel,
  stopsLabel = "Nonstop",
  compact = false,
}: {
  durationLabel?: string;
  stopsLabel?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={[
        "fs-print-mid min-w-0 text-center",
        compact ? "px-1" : "px-2",
      ].join(" ")}
    >
      {durationLabel ? (
        <p
          className="
            fs-print-duration
            fs-nums
            text-[10px]
            font-semibold
            uppercase
            tracking-[0.14em]
            text-slate-500
          "
        >
          {durationLabel}
        </p>
      ) : null}

      <div
        className={[
          "flex items-center",
          durationLabel ? "mt-2" : "mt-0",
        ].join(" ")}
      >
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#0078D2]"
        />
        <div className="relative mx-1.5 h-px flex-1 border-t border-dashed border-[#0078D2]/50">
          <span
            className="
              absolute
              left-1/2
              top-1/2
              -translate-x-1/2
              -translate-y-1/2
              bg-white
              px-0.5
              text-[#0078D2]
            "
          >
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </span>
        </div>
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#0078D2]"
        />
      </div>

      {stopsLabel ? (
        <p
          className="
            fs-print-stops
            mt-2
            text-[10px]
            font-semibold
            uppercase
            tracking-[0.12em]
            text-slate-400
          "
        >
          {stopsLabel}
        </p>
      ) : null}
    </div>
  );
}

function PrintSegment({
  segment,
}: {
  segment: PrintItineraryViewModel["segments"][number];
}) {
  return (
    <article
      className="
        fs-print-segment
        fs-print-keep
        border
        border-slate-200
        bg-white
      "
    >
      <div
        className="
          fs-print-segment-top
          flex
          items-center
          justify-between
          gap-4
          border-b
          border-dashed
          border-slate-300
          px-4
          py-2.5
          sm:px-5
        "
      >
        <p
          className="
            fs-print-segment-label
            text-[10px]
            font-semibold
            uppercase
            tracking-[0.16em]
            text-[#0078D2]
          "
        >
          {segment.segmentLabel}
        </p>

        <p
          className="
            fs-print-flight-code
            fs-nums
            text-sm
            font-semibold
            tracking-[0.04em]
            text-slate-950
          "
        >
          {segment.flightCode}
        </p>
      </div>

      <div
        className="
          fs-print-airports
          grid
          grid-cols-1
          items-center
          gap-4
          px-4
          py-5
          sm:grid-cols-[minmax(0,1fr)_minmax(5.5rem,7.5rem)_minmax(0,1fr)]
          sm:gap-3
          sm:px-5
        "
      >
        <div className="fs-print-airport min-w-0">
          <p
            className="
              fs-print-iata
              font-american-sans
              fs-nums
              text-[2.35rem]
              leading-none
              font-light
              tracking-[-0.04em]
              text-slate-950
              sm:text-4xl
            "
          >
            {segment.originCode}
          </p>

          <p className="fs-print-city mt-1.5 text-sm text-slate-600">
            {segment.originLabel}
          </p>

          <p
            className="
              fs-print-time
              fs-nums
              mt-3
              text-lg
              font-semibold
              text-slate-950
            "
          >
            {segment.departureTimeLabel}
          </p>

          <p className="fs-print-date mt-0.5 text-xs text-slate-500">
            {segment.departureDateLabel}
          </p>
        </div>

        <RouteConnector durationLabel={segment.durationLabel} />

        <div className="fs-print-airport fs-print-airport-end min-w-0 sm:text-right">
          <p
            className="
              fs-print-iata
              font-american-sans
              fs-nums
              text-[2.35rem]
              leading-none
              font-light
              tracking-[-0.04em]
              text-slate-950
              sm:text-4xl
            "
          >
            {segment.destinationCode}
          </p>

          <p className="fs-print-city mt-1.5 text-sm text-slate-600">
            {segment.destinationLabel}
          </p>

          <p
            className="
              fs-print-time
              fs-nums
              mt-3
              text-lg
              font-semibold
              text-slate-950
            "
          >
            {segment.arrivalTimeLabel}
          </p>

          <p className="fs-print-date mt-0.5 text-xs text-slate-500">
            {segment.arrivalDateLabel}
          </p>
        </div>
      </div>

      <div
        className="
          fs-print-fare
          flex
          flex-wrap
          items-center
          justify-between
          gap-2
          border-t
          border-dashed
          border-slate-300
          px-4
          py-2.5
          text-xs
          sm:px-5
        "
      >
        <div className="min-w-0 text-slate-600">
          <span className="font-medium text-slate-700">Fare</span>
          <span className="ml-2">{segment.fareLabel}</span>
        </div>

        <span
          className="
            fs-print-fare-price
            fs-nums
            font-semibold
            text-slate-950
          "
        >
          {segment.farePriceLabel} per passenger
        </span>
      </div>
    </article>
  );
}

function RouteHero({ model }: { model: PrintItineraryViewModel }) {
  const primary = model.segments[0];
  const originCode = primary?.originCode;
  const destinationCode = primary?.destinationCode;
  const originCity = primary?.originLabel;
  const destinationCity = primary?.destinationLabel;

  if (!originCode || !destinationCode) {
    if (!model.routeDetail) {
      return null;
    }

    return (
      <div className="fs-print-route mt-7 border-t border-dashed border-slate-200 pt-6">
        <p className="font-american-sans text-2xl font-light tracking-[-0.03em] text-slate-950">
          {model.routeDetail}
        </p>
        {model.routeHeading && model.routeHeading !== model.routeDetail ? (
          <p className="fs-print-route-names mt-1 text-sm text-slate-500">
            {model.routeHeading}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className="
        fs-print-route
        mt-7
        border-t
        border-dashed
        border-slate-200
        pt-6
      "
      aria-label={model.routeDetail ?? undefined}
    >
      <div
        className="
          fs-print-route-hero
          grid
          grid-cols-1
          items-center
          gap-4
          sm:grid-cols-[minmax(0,1fr)_minmax(6rem,9rem)_minmax(0,1fr)]
          sm:gap-3
        "
      >
        <div className="min-w-0">
          <p
            className="
              fs-print-route-code
              font-american-sans
              fs-nums
              text-4xl
              leading-none
              font-light
              tracking-[-0.045em]
              text-slate-950
              sm:text-5xl
            "
          >
            {originCode}
          </p>
          {originCity ? (
            <p className="fs-print-route-city mt-2 text-sm text-slate-500">
              {originCity}
            </p>
          ) : null}
        </div>

        <div className="fs-print-route-mid min-w-0">
          <RouteConnector
            durationLabel={undefined}
            stopsLabel={model.isRoundTrip ? "Round trip" : undefined}
            compact
          />
        </div>

        <div className="min-w-0 sm:text-right">
          <p
            className="
              fs-print-route-code
              font-american-sans
              fs-nums
              text-4xl
              leading-none
              font-light
              tracking-[-0.045em]
              text-slate-950
              sm:text-5xl
            "
          >
            {destinationCode}
          </p>
          {destinationCity ? (
            <p className="fs-print-route-city mt-2 text-sm text-slate-500">
              {destinationCity}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function PrintableItineraryDocument({
  model,
}: PrintableItineraryDocumentProps) {
  return (
    <article
      className="
        fs-print-doc
        mx-auto
        w-full
        min-w-0
        max-w-[8.5in]
        bg-white
        text-slate-950
      "
    >
      {/* DOCUMENT HEADER */}
      <header className="fs-print-header fs-print-keep pb-7">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <p
              className="
                fs-print-brand
                text-[11px]
                font-semibold
                uppercase
                tracking-[0.22em]
                text-[#0078D2]
              "
            >
              {model.brandMark}
            </p>

            <h1
              className="
                fs-print-title
                font-american-sans
                mt-3
                text-[2.15rem]
                leading-[1.05]
                font-light
                tracking-[-0.04em]
                text-slate-950
                sm:text-4xl
              "
            >
              {model.documentTitle}
            </h1>

            <p
              className="
                fs-print-subtitle
                mt-2
                max-w-xl
                text-sm
                leading-6
                text-slate-500
              "
            >
              {model.documentSubtitle}
            </p>
          </div>

          <div
            aria-hidden="true"
            className="
              hidden
              border-l
              border-dashed
              border-slate-200
              pl-5
              text-right
              sm:block
            "
          >
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Travel document
            </p>
            <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
              Five Stars
            </p>
          </div>
        </div>

        <RouteHero model={model} />
      </header>

      {/* BOOKING TICKET STUB */}
      <section
        className="
          fs-print-confirm
          fs-print-keep
          mt-7
          grid
          grid-cols-1
          divide-y
          divide-dashed
          divide-slate-300
          border-y
          border-dashed
          border-slate-300
          bg-slate-50/40
          sm:grid-cols-3
          sm:divide-x
          sm:divide-y-0
        "
        aria-label="Booking confirmation"
      >
        <div className="fs-print-confirm-item px-4 py-3.5 sm:px-5">
          <p className="fs-print-confirm-label text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Booking reference
          </p>

          <div className="fs-print-confirm-value mt-1.5 flex min-w-0 flex-wrap items-center gap-2">
            <span className="fs-nums break-all text-lg font-semibold tracking-[0.04em] text-slate-950">
              {model.bookingReference}
            </span>

            <span className="print-hide inline-flex align-middle">
              <CopyBookingReferenceButton
                bookingReference={model.bookingReference}
              />
            </span>
          </div>
        </div>

        <div className="fs-print-confirm-item px-4 py-3.5 sm:px-5">
          <p className="fs-print-confirm-label text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Booking created
          </p>
          <p className="fs-print-confirm-value mt-1.5 text-sm font-medium text-slate-950">
            {model.createdAtLabel}
          </p>
        </div>

        <div className="fs-print-confirm-item px-4 py-3.5 sm:px-5">
          <p className="fs-print-confirm-label text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Status
          </p>
          <div className="fs-print-confirm-value fs-print-status-wrap mt-1.5">
            <span className="print-hide">
              <BookingStatusBadge status={model.status} />
            </span>
            <span className="fs-print-status-text text-sm font-semibold text-slate-950">
              {model.statusLabel}
            </span>
          </div>
        </div>
      </section>

      {/* STATUS / PAYMENT NOTICE */}
      <div className="fs-print-keep mt-4 space-y-2">
        <p className="fs-print-status-note text-sm leading-6 text-slate-600">
          {model.confirmationSummary}
        </p>

        {model.paymentNotice ? (
          <p
            className="
              fs-print-payment-note
              border-l-2
              border-[#0078D2]
              bg-[rgba(0,120,210,0.04)]
              px-3
              py-2
              text-xs
              leading-5
              text-slate-600
            "
          >
            {model.paymentNotice}
          </p>
        ) : null}
      </div>

      {/* FLIGHT DETAILS */}
      <section className="fs-print-section mt-9" aria-label="Flight details">
        <div className="mb-4">
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
            Itinerary
          </p>
          <h2 className="fs-print-section-title font-american-sans mt-1.5 text-2xl font-light tracking-[-0.025em] text-slate-950">
            Trip / flight details
          </h2>
        </div>

        {model.segments.length === 0 ? (
          <p className="fs-print-empty border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-600">
            Flight details are unavailable for booking {model.bookingReference}.
          </p>
        ) : (
          <div className="fs-print-segments space-y-4">
            {model.segments.map((segment) => (
              <PrintSegment
                key={`${segment.segmentType}-${segment.flightCode}`}
                segment={segment}
              />
            ))}
          </div>
        )}
      </section>

      {/* TRAVELERS */}
      <section className="fs-print-section mt-9" aria-label="Travelers">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
              Manifest
            </p>
            <h2 className="fs-print-section-title font-american-sans mt-1.5 text-2xl font-light tracking-[-0.025em] text-slate-950">
              Travelers
            </h2>
          </div>
          <p className="fs-print-traveler-count text-xs font-medium text-slate-500">
            {model.travelerLabel}
          </p>
        </div>

        {model.travelers.length === 0 ? (
          <p className="fs-print-empty border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-600">
            No passenger names are available for this booking.
          </p>
        ) : (
          <ol className="fs-print-travelers divide-y divide-dashed divide-slate-200 border-y border-dashed border-slate-300">
            {model.travelers.map((traveler, index) => (
              <li
                key={traveler.id}
                className="fs-print-traveler fs-print-keep px-1 py-3.5 sm:px-2"
              >
                <p className="fs-print-traveler-index text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0078D2]">
                  Passenger {String(index + 1).padStart(2, "0")}
                </p>
                <p className="fs-print-traveler-name mt-1 text-sm font-semibold text-slate-950">
                  {traveler.displayName}
                </p>
                <p className="fs-print-traveler-meta mt-0.5 text-xs text-slate-500">
                  {traveler.passengerTypeLabel}
                  {traveler.nationality ? ` · ${traveler.nationality}` : ""}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* SEATS */}
      {model.seatLines.length > 0 ? (
        <section
          className="fs-print-section fs-print-keep mt-9"
          aria-label="Seats"
        >
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
            Seating
          </p>
          <h2 className="fs-print-section-title font-american-sans mt-1.5 text-2xl font-light tracking-[-0.025em] text-slate-950">
            Selected seats
          </h2>

          <ul className="fs-print-seats mt-3 divide-y divide-dashed divide-slate-200 border-y border-dashed border-slate-300">
            {model.seatLines.map((line) => (
              <li
                key={`${line.segmentLabel}-${line.flightCode}-${line.passengerName}-${line.seatNumber}`}
                className="flex items-center justify-between gap-4 px-1 py-3 sm:px-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {line.passengerName}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {line.segmentLabel} · {line.flightCode}
                  </p>
                </div>
                <span className="fs-nums shrink-0 text-base font-semibold tracking-[0.04em] text-[#0078D2]">
                  {line.seatNumber}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* FARE SUMMARY */}
      <section
        className="fs-print-section fs-print-keep mt-9"
        aria-label="Price summary"
      >
        <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
          Fare
        </p>
        <h2 className="fs-print-section-title font-american-sans mt-1.5 text-2xl font-light tracking-[-0.025em] text-slate-950">
          Fare summary
        </h2>

        <table className="fs-print-price-table mt-4 w-full text-sm">
          <tbody>
            {model.priceLines.map((line) => (
              <tr key={line.key}>
                <td className="py-2 text-slate-600">{line.label}</td>
                <td className="fs-print-amount fs-nums py-2 text-right font-medium text-slate-950">
                  {formatMoney(line.amountCents)}
                </td>
              </tr>
            ))}

            <tr>
              <td className="py-2 text-slate-600">Flight subtotal</td>
              <td className="fs-print-amount fs-nums py-2 text-right font-medium text-slate-950">
                {formatMoney(model.subtotal)}
              </td>
            </tr>

            <tr>
              <td className="py-2 text-slate-600">Taxes &amp; fees</td>
              <td className="fs-print-amount fs-nums py-2 text-right font-medium text-slate-950">
                {formatMoney(model.taxesAndFees)}
              </td>
            </tr>

            {model.seatFeesTotal > 0 ? (
              <tr>
                <td className="py-2 text-slate-600">Seat selection</td>
                <td className="fs-print-amount fs-nums py-2 text-right font-medium text-slate-950">
                  {formatMoney(model.seatFeesTotal)}
                </td>
              </tr>
            ) : null}

            <tr className="fs-print-total-row border-t border-dashed border-slate-300">
              <td className="pt-3 pb-1 text-sm font-semibold uppercase tracking-[0.1em] text-slate-950">
                Total
              </td>
              <td className="fs-print-amount fs-nums pt-3 pb-1 text-right text-xl font-semibold text-slate-950">
                {formatMoney(model.amountDueCents)} USD
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* IMPORTANT NOTES */}
      <section
        className="
          fs-print-section
          fs-print-notes-section
          mt-9
          border-t
          border-dashed
          border-slate-300
          pt-6
        "
        aria-label="Important travel information"
      >
        <h2 className="fs-print-section-title font-american-sans text-xl font-light tracking-[-0.02em] text-slate-950">
          Important travel information
        </h2>

        <ul className="fs-print-notes mt-3 space-y-2 text-xs leading-5 text-slate-600">
          {model.importantNotes.map((note) => (
            <li key={note} className="flex items-start gap-2">
              <span
                aria-hidden="true"
                className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-400"
              />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* DOCUMENT FOOTER */}
      <footer className="fs-print-footer mt-10 border-t border-slate-200 pt-5">
        <p className="fs-print-footer-line text-[10px] leading-5 text-slate-500">
          <span className="fs-print-footer-brand font-semibold uppercase tracking-[0.1em] text-[#0078D2]">
            {model.brand}
          </span>
          <span className="fs-print-footer-sep"> · </span>
          Booking {model.bookingReference}
          <span className="fs-print-footer-sep"> · </span>
          Generated {model.generatedAtLabel}
        </p>

        <p className="fs-print-footer-note mt-2 max-w-2xl text-[10px] leading-5 text-slate-400">
          {model.footerNote}
        </p>
      </footer>
    </article>
  );
}
