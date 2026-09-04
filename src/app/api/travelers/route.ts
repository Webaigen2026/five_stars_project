import { getCurrentUser } from "../../../lib/auth";
import { logServerError } from "../../../lib/sensitive-data";
import {
  rejectUntrustedMutation,
  sensitiveJson,
} from "../../../lib/request-security";
import {
  TravelerError,
  createTraveler,
  listTravelersForUser,
  parseTravelerInput,
} from "../../../lib/travelers";

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return sensitiveJson({ error: message }, { status });
}

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return jsonError("Not authenticated.", 401);
    }

    const travelers = await listTravelersForUser(currentUser.id);

    return sensitiveJson({ travelers });
  } catch (error) {
    logServerError("Failed to list travelers.", error);
    return jsonError("Unable to load travelers.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const rejected = rejectUntrustedMutation(request);

    if (rejected) {
      return rejected;
    }

    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return jsonError("Not authenticated.", 401);
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      throw new TravelerError("Invalid JSON body.", 400);
    }

    const input = parseTravelerInput(body);
    const traveler = await createTraveler(currentUser.id, input);

    return sensitiveJson({ traveler }, { status: 201 });
  } catch (error) {
    if (error instanceof TravelerError) {
      return jsonError(error.message, error.status);
    }

    logServerError("Failed to create traveler.", error);
    return jsonError("Unable to save traveler.", 500);
  }
}
