import { getCurrentUser } from "../../../../lib/auth";
import {
  TravelerError,
  deleteOwnedTraveler,
  parsePositiveInt,
  parseTravelerInput,
  updateOwnedTraveler,
} from "../../../../lib/travelers";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return jsonError("Not authenticated.", 401);
    }

    const { id: rawId } = await params;
    const id = parsePositiveInt(rawId);

    if (id == null) {
      return jsonError("Traveler not found.", 404);
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      throw new TravelerError("Invalid JSON body.", 400);
    }

    const input = parseTravelerInput(body);
    const traveler = await updateOwnedTraveler(currentUser.id, id, input);

    return Response.json({ traveler });
  } catch (error) {
    if (error instanceof TravelerError) {
      return jsonError(error.message, error.status);
    }

    console.error("Failed to update traveler.");
    console.error(error);
    return jsonError("Unable to update traveler.", 500);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return jsonError("Not authenticated.", 401);
    }

    const { id: rawId } = await params;
    const id = parsePositiveInt(rawId);

    if (id == null) {
      return jsonError("Traveler not found.", 404);
    }

    await deleteOwnedTraveler(currentUser.id, id);

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof TravelerError) {
      return jsonError(error.message, error.status);
    }

    console.error("Failed to delete traveler.");
    console.error(error);
    return jsonError("Unable to delete traveler.", 500);
  }
}
