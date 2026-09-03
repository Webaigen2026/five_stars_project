import {
  BOOKING_STATUS_VALUES,
  type KnownBookingStatus,
} from "./booking-status";

const STATUS_SET = new Set<string>(BOOKING_STATUS_VALUES);

const ALLOWED_TRANSITIONS: Record<
  KnownBookingStatus,
  readonly KnownBookingStatus[]
> = {
  DRAFT: ["PENDING_PAYMENT", "CANCELLED"],
  PENDING_PAYMENT: ["PAID", "FAILED", "CANCELLED"],
  PAID: ["CONFIRMED", "REFUNDED"],
  CONFIRMED: ["TICKETED", "CANCELLED"],
  TICKETED: ["COMPLETED", "CANCELLED"],
  FAILED: ["PENDING_PAYMENT", "CANCELLED"],
  CANCELLED: [],
  REFUNDED: [],
  COMPLETED: [],
};

const INVENTORY_HOLDING_STATUSES = new Set<KnownBookingStatus>([
  "PAID",
  "CONFIRMED",
  "TICKETED",
  "COMPLETED",
]);

const TERMINAL_STATUSES = new Set<KnownBookingStatus>([
  "CANCELLED",
  "REFUNDED",
  "COMPLETED",
]);

const PAYMENT_AUTHORITATIVE_STATUSES = new Set<KnownBookingStatus>([
  "PAID",
  "REFUNDED",
]);

export type BookingLifecycleStatus = KnownBookingStatus;

export function isKnownBookingStatus(
  status: string
): status is KnownBookingStatus {
  return STATUS_SET.has(status);
}

export function getAllowedBookingTransitions(
  status: string
): KnownBookingStatus[] {
  if (!isKnownBookingStatus(status)) {
    return [];
  }

  return [...ALLOWED_TRANSITIONS[status]];
}

export function canTransitionBookingStatus(from: string, to: string) {
  if (!isKnownBookingStatus(from) || !isKnownBookingStatus(to)) {
    return false;
  }

  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function isTerminalBookingStatus(status: string) {
  return isKnownBookingStatus(status) && TERMINAL_STATUSES.has(status);
}

export function doesBookingStatusHoldInventory(status: string) {
  return isKnownBookingStatus(status) && INVENTORY_HOLDING_STATUSES.has(status);
}

export function doesTransitionAcquireInventory(from: string, to: string) {
  return (
    canTransitionBookingStatus(from, to) &&
    !doesBookingStatusHoldInventory(from) &&
    doesBookingStatusHoldInventory(to)
  );
}

export function doesTransitionReleaseInventory(from: string, to: string) {
  return (
    canTransitionBookingStatus(from, to) &&
    doesBookingStatusHoldInventory(from) &&
    !doesBookingStatusHoldInventory(to)
  );
}

/**
 * TICKETED -> COMPLETED consumes an active seat hold without restoring seats.
 * COMPLETED remains a holding *status* so the release matrix does not fire;
 * inventoryHeld is cleared separately because the trip no longer represents
 * an active reservation, and no further transition from COMPLETED is allowed.
 */
export function doesTransitionConsumeInventoryHold(from: string, to: string) {
  return canTransitionBookingStatus(from, to) && to === "COMPLETED";
}

export function isPaymentAuthoritativeStatus(status: string) {
  return (
    isKnownBookingStatus(status) && PAYMENT_AUTHORITATIVE_STATUSES.has(status)
  );
}

export function getAllowedAdminBookingTransitions(
  status: string
): KnownBookingStatus[] {
  return getAllowedBookingTransitions(status).filter(
    (target) => !isPaymentAuthoritativeStatus(target)
  );
}
