export const BOOKING_STATUS_VALUES = [
  "DRAFT",
  "PENDING_PAYMENT",
  "PAID",
  "CONFIRMED",
  "TICKETED",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
  "FAILED",
] as const;

export type KnownBookingStatus = (typeof BOOKING_STATUS_VALUES)[number];

export type BookingStatusKind =
  | "active"
  | "complete"
  | "cancelled"
  | "failed"
  | "unknown";

export type BookingStatusPresentation = {
  status: string;
  label: string;
  description: string;
  confirmationSummary: string;
  paymentAvailable: boolean;
  kind: BookingStatusKind;
};

const STATUS_PRESENTATION: Record<
  KnownBookingStatus,
  Omit<BookingStatusPresentation, "status">
> = {
  DRAFT: {
    label: "Draft",
    description:
      "Your booking has been created but payment has not been completed.",
    confirmationSummary: "Booking created — payment not completed.",
    paymentAvailable: true,
    kind: "active",
  },
  PENDING_PAYMENT: {
    label: "Pending payment",
    description: "Your payment is awaiting confirmation.",
    confirmationSummary: "Payment confirmation pending.",
    paymentAvailable: true,
    kind: "active",
  },
  PAID: {
    label: "Paid",
    description: "Payment was received. Your booking is being confirmed.",
    confirmationSummary: "Payment received.",
    paymentAvailable: false,
    kind: "active",
  },
  CONFIRMED: {
    label: "Confirmed",
    description: "Your booking is confirmed.",
    confirmationSummary: "Booking confirmed.",
    paymentAvailable: false,
    kind: "active",
  },
  TICKETED: {
    label: "Ticketed",
    description: "Your ticket has been issued.",
    confirmationSummary: "Ticket issued.",
    paymentAvailable: false,
    kind: "active",
  },
  COMPLETED: {
    label: "Completed",
    description: "This trip has been completed.",
    confirmationSummary: "This trip has been completed.",
    paymentAvailable: false,
    kind: "complete",
  },
  CANCELLED: {
    label: "Cancelled",
    description: "This booking has been cancelled.",
    confirmationSummary: "Booking cancelled.",
    paymentAvailable: false,
    kind: "cancelled",
  },
  REFUNDED: {
    label: "Refunded",
    description: "This booking has been refunded.",
    confirmationSummary: "This booking has been refunded.",
    paymentAvailable: false,
    kind: "cancelled",
  },
  FAILED: {
    label: "Failed",
    description: "This booking could not be completed.",
    confirmationSummary: "This booking could not be completed.",
    paymentAvailable: false,
    kind: "failed",
  },
};

export function getBookingStatusPresentation(
  status: string
): BookingStatusPresentation {
  const known = STATUS_PRESENTATION[status as KnownBookingStatus];

  if (known) {
    return {
      status,
      ...known,
    };
  }

  return {
    status,
    label: status,
    description: "Booking status is being reviewed.",
    confirmationSummary: "Booking status is being reviewed.",
    paymentAvailable: false,
    kind: "unknown",
  };
}

export function getBookingStatusBadgeClass(status: string) {
  const { kind, status: value } = getBookingStatusPresentation(status);

  if (value === "PENDING_PAYMENT") {
    return "bg-amber-50 text-amber-800";
  }

  switch (kind) {
    case "complete":
      return "bg-emerald-50 text-emerald-800";
    case "cancelled":
      return value === "REFUNDED"
        ? "bg-indigo-50 text-indigo-800"
        : "bg-slate-100 text-slate-700";
    case "failed":
      return "bg-rose-50 text-rose-800";
    case "active":
      return "bg-sky-50 text-primary";
    default:
      return "bg-slate-100 text-slate-700";
  }
}
