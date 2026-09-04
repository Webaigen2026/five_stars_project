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
    description: "Booking created. Payment has not been completed.",
    confirmationSummary: "Booking created. Payment has not been completed.",
    paymentAvailable: true,
    kind: "active",
  },
  PENDING_PAYMENT: {
    label: "Pending payment",
    description: "Payment confirmation is pending.",
    confirmationSummary: "Payment confirmation is pending.",
    paymentAvailable: true,
    kind: "active",
  },
  PAID: {
    label: "Paid",
    description: "Payment received.",
    confirmationSummary: "Payment received.",
    paymentAvailable: false,
    kind: "active",
  },
  CONFIRMED: {
    label: "Confirmed",
    description: "Your booking is confirmed.",
    confirmationSummary: "Your booking is confirmed.",
    paymentAvailable: false,
    kind: "active",
  },
  TICKETED: {
    label: "Ticketed",
    description: "Your ticket has been issued.",
    confirmationSummary: "Your ticket has been issued.",
    paymentAvailable: false,
    kind: "active",
  },
  COMPLETED: {
    label: "Completed",
    description: "This trip is complete.",
    confirmationSummary: "This trip is complete.",
    paymentAvailable: false,
    kind: "complete",
  },
  CANCELLED: {
    label: "Cancelled",
    description: "This booking has been cancelled.",
    confirmationSummary: "This booking has been cancelled.",
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
    description: "Payment was not completed.",
    confirmationSummary: "Payment was not completed.",
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

export const BOOKING_PROGRESS_STAGES = [
  "Created",
  "Payment",
  "Confirmed",
  "Ticketed",
  "Completed",
] as const;

export type BookingProgressStage = (typeof BOOKING_PROGRESS_STAGES)[number];

export type BookingProgressStepState = "complete" | "current" | "upcoming";

export type BookingProgressStep = {
  label: BookingProgressStage;
  state: BookingProgressStepState;
};

export type BookingProgressPresentation = {
  mode: "progress" | "cancelled" | "refunded" | "failed" | "unknown";
  label: string;
  description: string;
  steps: BookingProgressStep[];
};

function buildProgressSteps(currentIndex: number): BookingProgressStep[] {
  return BOOKING_PROGRESS_STAGES.map((label, index) => {
    if (index < currentIndex) {
      return { label, state: "complete" };
    }

    if (index === currentIndex) {
      return { label, state: "current" };
    }

    return { label, state: "upcoming" };
  });
}

/**
 * Presentation-only progress mapping. Does not change lifecycle values.
 */
export function getBookingProgressPresentation(
  status: string
): BookingProgressPresentation {
  const presentation = getBookingStatusPresentation(status);

  switch (status) {
    case "DRAFT":
      return {
        mode: "progress",
        label: presentation.label,
        description: presentation.description,
        steps: buildProgressSteps(0),
      };
    case "PENDING_PAYMENT":
      return {
        mode: "progress",
        label: presentation.label,
        description: presentation.description,
        steps: buildProgressSteps(1),
      };
    case "PAID":
      return {
        mode: "progress",
        label: presentation.label,
        description: presentation.description,
        steps: [
          { label: "Created", state: "complete" },
          { label: "Payment", state: "complete" },
          { label: "Confirmed", state: "upcoming" },
          { label: "Ticketed", state: "upcoming" },
          { label: "Completed", state: "upcoming" },
        ],
      };
    case "CONFIRMED":
      return {
        mode: "progress",
        label: presentation.label,
        description: presentation.description,
        steps: buildProgressSteps(2),
      };
    case "TICKETED":
      return {
        mode: "progress",
        label: presentation.label,
        description: presentation.description,
        steps: buildProgressSteps(3),
      };
    case "COMPLETED":
      return {
        mode: "progress",
        label: presentation.label,
        description: presentation.description,
        steps: BOOKING_PROGRESS_STAGES.map((label) => ({
          label,
          state: "complete" as const,
        })),
      };
    case "CANCELLED":
      return {
        mode: "cancelled",
        label: presentation.label,
        description: presentation.description,
        steps: [],
      };
    case "REFUNDED":
      return {
        mode: "refunded",
        label: presentation.label,
        description: presentation.description,
        steps: [],
      };
    case "FAILED":
      return {
        mode: "failed",
        label: presentation.label,
        description: presentation.description,
        steps: [],
      };
    default:
      return {
        mode: "unknown",
        label: presentation.label,
        description: presentation.description,
        steps: [],
      };
  }
}
