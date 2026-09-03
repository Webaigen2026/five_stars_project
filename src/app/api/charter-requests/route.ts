import { getCurrentUser } from "../../../lib/auth";
import {
  CharterRequestError,
  parseCharterCreateInput,
  toSafeCharterRequest,
} from "../../../lib/charter";
import { createUniqueCharterReference } from "../../../lib/request-reference";
import { db } from "../../../prisma/db";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      throw new CharterRequestError("Invalid JSON body.", 400);
    }

    const input = parseCharterCreateInput(body);
    const currentUser = await getCurrentUser();
    const reference = await createUniqueCharterReference();

    const charterRequest = await db.orm.public.CharterRequest.select(
      "id",
      "userId",
      "reference",
      "fullName",
      "email",
      "phone",
      "origin",
      "destination",
      "departureDate",
      "returnDate",
      "passengerCount",
      "aircraftPreference",
      "budget",
      "notes",
      "status",
      "createdAt",
      "updatedAt"
    ).create({
      ...input,
      reference,
      status: "NEW",
      ...(currentUser ? { userId: currentUser.id } : {}),
    });

    return Response.json(
      { request: toSafeCharterRequest(charterRequest) },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof CharterRequestError) {
      return jsonError(error.message, error.status);
    }

    console.error("Failed to create charter request:", error);
    return jsonError("Unable to create charter request.", 500);
  }
}
