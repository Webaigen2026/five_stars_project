import { getCurrentUser } from "../../../../lib/auth";
import { isStaffOrAdmin } from "../../../../lib/authorization";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  if (!isStaffOrAdmin(user.role)) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }

  return Response.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  });
}
