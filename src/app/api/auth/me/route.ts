import { getCurrentUser } from "../../../../lib/auth";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  // Explicit public subset — do not return canViewSensitiveTravelerData.
  return Response.json({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      emailVerified: user.emailVerified,
    },
  });
}
