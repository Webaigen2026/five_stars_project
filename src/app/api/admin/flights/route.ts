import { getCurrentUser } from "../../../../lib/auth";
import { isAdmin } from "../../../../lib/authorization";
import {
  AdminFlightRequestError,
  isUniqueViolation,
  parseFlightWriteInput,
  toSafeFlight,
} from "../../../../lib/admin-flights";
import { db } from "../../../../prisma/db";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return jsonError("Not authenticated.", 401);
    }

    if (!isAdmin(user.role)) {
      return jsonError("Forbidden.", 403);
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      throw new AdminFlightRequestError("Invalid JSON body.", 400);
    }

    const input = parseFlightWriteInput(body);

    const existingFlight = await db.orm.public.Flight.where({
      code: input.code,
    }).first();

    if (existingFlight) {
      throw new AdminFlightRequestError(
        "A flight with this code already exists.",
        409
      );
    }

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
    ).create(input);

    return Response.json({ flight: toSafeFlight(flight) }, { status: 201 });
  } catch (error) {
    if (error instanceof AdminFlightRequestError) {
      return jsonError(error.message, error.status);
    }

    if (isUniqueViolation(error)) {
      return jsonError("A flight with this code already exists.", 409);
    }

    console.error("Failed to create flight:", error);
    return jsonError("Unable to create flight.", 500);
  }
}
