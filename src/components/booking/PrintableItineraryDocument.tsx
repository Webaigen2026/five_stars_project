import BookingStatusBadge from "./BookingStatusBadge";
import CopyBookingReferenceButton from "./CopyBookingReferenceButton";
import {
  formatMoney,
  type PrintItineraryViewModel,
} from "../../lib/print-itinerary";

type PrintableItineraryDocumentProps = {
  model: PrintItineraryViewModel;
};

function PrintSegment({
  segment,
}: {
  segment: PrintItineraryViewModel["segments"][number];
}) {
  return (
    <div className="fs-print-segment fs-print-keep">
      <div className="fs-print-segment-top">
        <p className="fs-print-segment-label">{segment.segmentLabel}</p>
        <p className="fs-print-flight-code">{segment.flightCode}</p>
      </div>

      <div className="fs-print-airports">
        <div className="fs-print-airport">
          <p className="fs-print-iata">{segment.originCode}</p>
          <p className="fs-print-city">{segment.originLabel}</p>
          <p className="fs-print-time">{segment.departureTimeLabel}</p>
          <p className="fs-print-date">{segment.departureDateLabel}</p>
        </div>
        <div className="fs-print-mid">
          <p className="fs-print-duration">{segment.durationLabel}</p>
          <p className="fs-print-stops">Nonstop</p>
        </div>
        <div className="fs-print-airport fs-print-airport-end">
          <p className="fs-print-iata">{segment.destinationCode}</p>
          <p className="fs-print-city">{segment.destinationLabel}</p>
          <p className="fs-print-time">{segment.arrivalTimeLabel}</p>
          <p className="fs-print-date">{segment.arrivalDateLabel}</p>
        </div>
      </div>

      <p className="fs-print-fare">
        Fare: {segment.fareLabel}
        <span className="fs-print-fare-price">
          {segment.farePriceLabel} per passenger
        </span>
      </p>
    </div>
  );
}

export default function PrintableItineraryDocument({
  model,
}: PrintableItineraryDocumentProps) {
  return (
    <article className="fs-print-doc">
      <header className="fs-print-header fs-print-keep">
        <p className="fs-print-brand">{model.brandMark}</p>
        <h1 className="fs-print-title">{model.documentTitle}</h1>
        <p className="fs-print-subtitle">{model.documentSubtitle}</p>
        {model.routeDetail ? (
          <p className="fs-print-route">
            {model.routeDetail}
            {model.routeHeading && model.routeHeading !== model.routeDetail ? (
              <span className="fs-print-route-names"> · {model.routeHeading}</span>
            ) : null}
          </p>
        ) : null}
      </header>

      <section
        className="fs-print-confirm fs-print-keep"
        aria-label="Booking confirmation"
      >
        <div className="fs-print-confirm-item">
          <p className="fs-print-confirm-label">Booking reference</p>
          <p className="fs-print-confirm-value">
            <span className="break-all">{model.bookingReference}</span>
            <span className="print-hide ml-2 inline-flex align-middle">
              <CopyBookingReferenceButton
                bookingReference={model.bookingReference}
              />
            </span>
          </p>
        </div>
        <div className="fs-print-confirm-item">
          <p className="fs-print-confirm-label">Booking created</p>
          <p className="fs-print-confirm-value">{model.createdAtLabel}</p>
        </div>
        <div className="fs-print-confirm-item">
          <p className="fs-print-confirm-label">Status</p>
          <div className="fs-print-confirm-value fs-print-status-wrap">
            <span className="print-hide">
              <BookingStatusBadge status={model.status} />
            </span>
            <span className="fs-print-status-text">{model.statusLabel}</span>
          </div>
        </div>
      </section>

      <p className="fs-print-status-note">{model.confirmationSummary}</p>
      {model.paymentNotice ? (
        <p className="fs-print-payment-note">{model.paymentNotice}</p>
      ) : null}

      <section className="fs-print-section" aria-label="Flight details">
        <h2 className="fs-print-section-title">Trip / flight details</h2>
        {model.segments.length === 0 ? (
          <p className="fs-print-empty">
            Flight details are unavailable for booking {model.bookingReference}.
          </p>
        ) : (
          <div className="fs-print-segments">
            {model.segments.map((segment) => (
              <PrintSegment
                key={`${segment.segmentType}-${segment.flightCode}`}
                segment={segment}
              />
            ))}
          </div>
        )}
      </section>

      <section className="fs-print-section" aria-label="Travelers">
        <h2 className="fs-print-section-title">Travelers</h2>
        <p className="fs-print-traveler-count">{model.travelerLabel}</p>
        {model.travelers.length === 0 ? (
          <p className="fs-print-empty">
            No passenger names are available for this booking.
          </p>
        ) : (
          <ol className="fs-print-travelers">
            {model.travelers.map((traveler, index) => (
              <li key={traveler.id} className="fs-print-traveler fs-print-keep">
                <p className="fs-print-traveler-index">Passenger {index + 1}</p>
                <p className="fs-print-traveler-name">{traveler.displayName}</p>
                <p className="fs-print-traveler-meta">
                  {traveler.passengerTypeLabel}
                  {traveler.nationality ? ` · ${traveler.nationality}` : ""}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      {model.seatLines.length > 0 ? (
        <section className="fs-print-section fs-print-keep" aria-label="Seats">
          <h2 className="fs-print-section-title">Seats</h2>
          <ul className="fs-print-notes">
            {model.seatLines.map((line) => (
              <li
                key={`${line.segmentLabel}-${line.flightCode}-${line.passengerName}-${line.seatNumber}`}
              >
                {line.segmentLabel} · {line.flightCode} — {line.passengerName}:
                Seat {line.seatNumber}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section
        className="fs-print-section fs-print-keep"
        aria-label="Price summary"
      >
        <h2 className="fs-print-section-title">Fare summary</h2>
        <table className="fs-print-price-table">
          <tbody>
            {model.priceLines.map((line) => (
              <tr key={line.key}>
                <td>{line.label}</td>
                <td className="fs-print-amount">{formatMoney(line.amountCents)}</td>
              </tr>
            ))}
            <tr>
              <td>Flight subtotal</td>
              <td className="fs-print-amount">{formatMoney(model.subtotal)}</td>
            </tr>
            <tr>
              <td>Taxes & fees</td>
              <td className="fs-print-amount">
                {formatMoney(model.taxesAndFees)}
              </td>
            </tr>
            {model.seatFeesTotal > 0 ? (
              <tr>
                <td>Seat selection</td>
                <td className="fs-print-amount">
                  {formatMoney(model.seatFeesTotal)}
                </td>
              </tr>
            ) : null}
            <tr className="fs-print-total-row">
              <td>Total</td>
              <td className="fs-print-amount">
                {formatMoney(model.amountDueCents)} USD
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section
        className="fs-print-section fs-print-notes-section"
        aria-label="Important travel information"
      >
        <h2 className="fs-print-section-title">Important travel information</h2>
        <ul className="fs-print-notes">
          {model.importantNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </section>

      <footer className="fs-print-footer">
        <p className="fs-print-footer-line">
          <span className="fs-print-footer-brand">{model.brand}</span>
          <span className="fs-print-footer-sep"> · </span>
          Booking {model.bookingReference}
          <span className="fs-print-footer-sep"> · </span>
          Generated {model.generatedAtLabel}
        </p>
        <p className="fs-print-footer-note">{model.footerNote}</p>
      </footer>
    </article>
  );
}
