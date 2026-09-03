import { getBookingStatusBadgeClass, getBookingStatusPresentation } from "../../lib/booking-status";

export default function BookingStatusBadge({ status }: { status: string }) {
  const presentation = getBookingStatusPresentation(status);

  return (
    <span
      className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ${getBookingStatusBadgeClass(status)}`}
    >
      {presentation.label}
    </span>
  );
}
