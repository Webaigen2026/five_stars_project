import "server-only";

import { db } from "../prisma/db";
import { BookingDomainError } from "./booking-errors";
import {
  canTransitionBookingStatus,
  doesTransitionAcquireInventory,
  doesTransitionConsumeInventoryHold,
  doesTransitionReleaseInventory,
  isPaymentAuthoritativeStatus,
} from "./booking-lifecycle";

export type BookingTransitionSource = "ADMIN" | "SYSTEM" | "PAYMENT";

export type BookingTransitionActor = {
  userId?: number;
  role?: string;
};

export type TransitionedBooking = {
  id: number;
  bookingReference: string;
  userId: number | null;
  flightId: number;
  passengerCount: number;
  subtotal: number;
  taxesAndFees: number;
  total: number;
  status: string;
  inventoryHeld: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BookingTransitionResult = {
  booking: TransitionedBooking;
  noop: boolean;
};

type TransactionClient = Parameters<Parameters<typeof db.transaction>[0]>[0];

const BOOKING_RETURNING = [
  "id",
  "bookingReference",
  "userId",
  "flightId",
  "passengerCount",
  "subtotal",
  "taxesAndFees",
  "total",
  "status",
  "inventoryHeld",
  "createdAt",
  "updatedAt",
] as const;

async function collectRows<T>(result: unknown): Promise<T[]> {
  if (result == null) {
    return [];
  }

  if (typeof result === "object" && Symbol.asyncIterator in result) {
    const rows: T[] = [];

    for await (const row of result as AsyncIterable<T>) {
      rows.push(row);
    }

    return rows;
  }

  return (await result) as T[];
}

async function queryReturning<T>(
  tx: TransactionClient,
  plan: Parameters<TransactionClient["query"]>[0]
) {
  return collectRows<T>(tx.query(plan));
}

function assertPositivePassengerCount(passengerCount: number) {
  if (!Number.isInteger(passengerCount) || passengerCount < 1) {
    throw new BookingDomainError("INVENTORY_INCONSISTENT");
  }
}

async function acquireInventory(
  tx: TransactionClient,
  flightId: number,
  passengerCount: number
) {
  assertPositivePassengerCount(passengerCount);

  const plan = tx.sql.public.flight
    .update((flight, fns) => ({
      availableSeats: fns.raw`${flight.availableSeats} - ${passengerCount}`.returns(
        "pg/int4@1"
      ),
    }))
    .where((flight, fns) =>
      fns.and(
        fns.eq(flight.id, flightId),
        fns.gte(flight.availableSeats, passengerCount)
      )
    )
    .returning("id", "availableSeats", "totalSeats")
    .build();

  const rows = await queryReturning<{
    id: number;
    availableSeats: number;
    totalSeats: number;
  }>(tx, plan);

  if (rows.length === 1) {
    const [flight] = rows;

    if (flight.availableSeats < 0) {
      throw new BookingDomainError("INVENTORY_INCONSISTENT");
    }

    return;
  }

  const flight = await tx.orm.public.Flight.where({ id: flightId }).first();

  if (!flight) {
    throw new BookingDomainError("FLIGHT_NOT_FOUND");
  }

  if (flight.availableSeats < passengerCount) {
    throw new BookingDomainError("INSUFFICIENT_INVENTORY");
  }

  throw new BookingDomainError("INVENTORY_INCONSISTENT");
}

async function releaseInventory(
  tx: TransactionClient,
  flightId: number,
  passengerCount: number
) {
  assertPositivePassengerCount(passengerCount);

  const plan = tx.sql.public.flight
    .update((flight, fns) => ({
      availableSeats: fns.raw`${flight.availableSeats} + ${passengerCount}`.returns(
        "pg/int4@1"
      ),
    }))
    .where((flight, fns) =>
      fns.and(
        fns.eq(flight.id, flightId),
        fns.lte(
          fns.raw`${flight.availableSeats} + ${passengerCount}`.returns(
            "pg/int4@1"
          ),
          flight.totalSeats
        )
      )
    )
    .returning("id", "availableSeats", "totalSeats")
    .build();

  const rows = await queryReturning<{
    id: number;
    availableSeats: number;
    totalSeats: number;
  }>(tx, plan);

  if (rows.length === 1) {
    const [flight] = rows;

    if (flight.availableSeats > flight.totalSeats) {
      throw new BookingDomainError("INVENTORY_INCONSISTENT");
    }

    return;
  }

  const flight = await tx.orm.public.Flight.where({ id: flightId }).first();

  if (!flight) {
    throw new BookingDomainError("FLIGHT_NOT_FOUND");
  }

  throw new BookingDomainError("INVENTORY_INCONSISTENT");
}

async function claimBookingStatus(
  tx: TransactionClient,
  bookingId: number,
  fromStatus: string,
  toStatus: string
) {
  const plan = tx.sql.public.booking
    .update({ status: toStatus })
    .where((booking, fns) =>
      fns.and(
        fns.eq(booking.id, bookingId),
        fns.eq(booking.status, fromStatus)
      )
    )
    .returning(...BOOKING_RETURNING)
    .build();

  const rows = await queryReturning<TransitionedBooking>(tx, plan);

  if (rows.length !== 1) {
    throw new BookingDomainError("INVALID_BOOKING_TRANSITION");
  }

  return rows[0];
}

async function setInventoryHeld(
  tx: TransactionClient,
  bookingId: number,
  fromHeld: boolean,
  toHeld: boolean
) {
  const plan = tx.sql.public.booking
    .update({ inventoryHeld: toHeld })
    .where((booking, fns) =>
      fns.and(
        fns.eq(booking.id, bookingId),
        fns.eq(booking.inventoryHeld, fromHeld)
      )
    )
    .returning(...BOOKING_RETURNING)
    .build();

  const rows = await queryReturning<TransitionedBooking>(tx, plan);

  if (rows.length !== 1) {
    throw new BookingDomainError("INVENTORY_INCONSISTENT");
  }

  return rows[0];
}

export async function transitionBookingStatus(input: {
  bookingId: number;
  toStatus: string;
  source: BookingTransitionSource;
  actor?: BookingTransitionActor;
}): Promise<BookingTransitionResult> {
  const { bookingId, toStatus, source } = input;

  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    throw new BookingDomainError("BOOKING_NOT_FOUND");
  }

  const existing = await db.orm.public.Booking.where({ id: bookingId }).first();

  if (!existing) {
    throw new BookingDomainError("BOOKING_NOT_FOUND");
  }

  if (existing.status === toStatus) {
    return {
      booking: existing,
      noop: true,
    };
  }

  if (!canTransitionBookingStatus(existing.status, toStatus)) {
    throw new BookingDomainError("INVALID_BOOKING_TRANSITION");
  }

  if (isPaymentAuthoritativeStatus(toStatus) && source !== "PAYMENT") {
    throw new BookingDomainError("PAYMENT_AUTHORITY_REQUIRED");
  }

  const acquireCandidate = doesTransitionAcquireInventory(
    existing.status,
    toStatus
  );
  const releaseCandidate = doesTransitionReleaseInventory(
    existing.status,
    toStatus
  );
  const consumeHold = doesTransitionConsumeInventoryHold(
    existing.status,
    toStatus
  );

  const booking = await db.transaction(async (tx) => {
    let claimed = await claimBookingStatus(
      tx,
      bookingId,
      existing.status,
      toStatus
    );

    // inventoryHeld on the claimed row is still the pre-transition marker
    // because this UPDATE only changed status.
    const held = claimed.inventoryHeld === true;

    if (acquireCandidate && !held) {
      await acquireInventory(tx, claimed.flightId, claimed.passengerCount);
      claimed = await setInventoryHeld(tx, bookingId, false, true);
    }

    if (releaseCandidate && held) {
      await releaseInventory(tx, claimed.flightId, claimed.passengerCount);
      claimed = await setInventoryHeld(tx, bookingId, true, false);
    } else if (consumeHold && held) {
      // COMPLETED consumes an active hold without restoring seats.
      claimed = await setInventoryHeld(tx, bookingId, true, false);
    }

    return claimed;
  });

  return {
    booking,
    noop: false,
  };
}
