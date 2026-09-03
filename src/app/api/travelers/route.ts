import { getCurrentUser } from "../../../lib/auth";
import {
  TravelerError,
  createTraveler,
  listTravelersForUser,
  parseTravelerInput,
} from "../../../lib/travelers";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return jsonError("Not authenticated.", 401);
    }

    const travelers = await listTravelersForUser(currentUser.id);

    return Response.json({ travelers });
  } catch (error) {
    console.error("Failed to list travelers.");
    console.error(error);
    return jsonError("Unable to load travelers.", 500);
  }
}

export async function POST(request: Request) {
  try {
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

    return Response.json({ traveler }, { status: 201 });
  } catch (error) {
    if (error instanceof TravelerError) {
      return jsonError(error.message, error.status);
    }

    console.error("Failed to create traveler.");
    console.error(error);
    return jsonError("Unable to save traveler.", 500);
  }
}
