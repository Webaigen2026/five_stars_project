import { getCurrentUser } from "../../../../lib/auth";
import { logServerError } from "../../../../lib/sensitive-data";
import {
  rejectUntrustedMutation,
  sensitiveJson,
} from "../../../../lib/request-security";
import {
  TravelerError,
  deleteOwnedTraveler,
  parsePositiveInt,
  parseTravelerInput,
  updateOwnedTraveler,
} from "../../../../lib/travelers";

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return sensitiveJson({ error: message }, { status });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rejected = rejectUntrustedMutation(request);

    if (rejected) {
      return rejected;
    }

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

    return sensitiveJson({ traveler });
  } catch (error) {
    if (error instanceof TravelerError) {
      return jsonError(error.message, error.status);
    }

    logServerError("Failed to update traveler.", error);
    return jsonError("Unable to update traveler.", 500);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rejected = rejectUntrustedMutation(request);

    if (rejected) {
      return rejected;
    }

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

    return sensitiveJson({ success: true });
  } catch (error) {
    if (error instanceof TravelerError) {
      return jsonError(error.message, error.status);
    }

    logServerError("Failed to delete traveler.", error);
    return jsonError("Unable to delete traveler.", 500);
  }
}
