import { getCurrentUser } from "../../../lib/auth";
import {
  CargoRequestError,
  parseCargoCreateInput,
  toSafeCargoRequest,
} from "../../../lib/cargo";
import { createUniqueCargoReference } from "../../../lib/request-reference";
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
      throw new CargoRequestError("Invalid JSON body.", 400);
    }

    const input = parseCargoCreateInput(body);
    const currentUser = await getCurrentUser();
    const reference = await createUniqueCargoReference();

    const cargoRequest = await db.orm.public.CargoRequest.select(
      "id",
      "userId",
      "reference",
      "fullName",
      "email",
      "phone",
      "origin",
      "destination",
      "cargoType",
      "description",
      "quantity",
      "weight",
      "preferredDate",
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
      { request: toSafeCargoRequest(cargoRequest) },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof CargoRequestError) {
      return jsonError(error.message, error.status);
    }

    console.error("Failed to create cargo request:", error);
    return jsonError("Unable to create cargo request.", 500);
  }
}
