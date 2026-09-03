import { getCurrentUser } from "../../../../../lib/auth";
import { isAdmin } from "../../../../../lib/authorization";
import {
  AdminFlightRequestError,
  isUniqueViolation,
  parseFlightWriteInput,
  toSafeFlight,
} from "../../../../../lib/admin-flights";
import { db } from "../../../../../prisma/db";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function parseFlightId(value: string) {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return jsonError("Not authenticated.", 401);
    }

    if (!isAdmin(user.role)) {
      return jsonError("Forbidden.", 403);
    }

    const { id: rawId } = await params;
    const id = parseFlightId(rawId);

    if (id == null) {
      return jsonError("Flight not found.", 404);
    }

    const existingFlight = await db.orm.public.Flight.where({ id }).first();

    if (!existingFlight) {
      return jsonError("Flight not found.", 404);
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      throw new AdminFlightRequestError("Invalid JSON body.", 400);
    }

    const input = parseFlightWriteInput(body);

    if (input.code !== existingFlight.code) {
      const duplicate = await db.orm.public.Flight.where({
        code: input.code,
      }).first();

      if (duplicate) {
        throw new AdminFlightRequestError(
          "A flight with this code already exists.",
          409
        );
      }
    }

    await db.orm.public.Flight.where({ id }).update(input);

    const flight = await db.orm.public.Flight.select(
      "id",
      "code",
      "airline",
      "aircraft",
      "origin",
      "originCode",
      "destination",
      "destinationCode",
      "departureTime",
      "arrivalTime",
      "durationMinutes",
      "price",
      "totalSeats",
      "availableSeats",
      "status",
      "createdAt",
      "updatedAt"
    )
      .where({ id })
      .first();

    if (!flight) {
      return jsonError("Flight not found.", 404);
    }

    return Response.json({ flight: toSafeFlight(flight) });
  } catch (error) {
    if (error instanceof AdminFlightRequestError) {
      return jsonError(error.message, error.status);
    }

    if (isUniqueViolation(error)) {
      return jsonError("A flight with this code already exists.", 409);
    }

    console.error("Failed to update flight:", error);
    return jsonError("Unable to update flight.", 500);
  }
}
