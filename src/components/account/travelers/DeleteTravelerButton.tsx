"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteTravelerButton({
  travelerId,
  travelerName,
}: {
  travelerId: number;
  travelerName: string;
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (isDeleting) {
      return;
    }

    const confirmed = window.confirm(
      `Delete saved traveler ${travelerName}? This will not change past bookings.`
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/travelers/${travelerId}`, {
        method: "DELETE",
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        setError(payload?.error ?? "Unable to delete traveler.");
        return;
      }

      router.refresh();
    } catch {
      setError("Unable to delete traveler.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void handleDelete()}
        disabled={isDeleting}
        className="text-sm font-semibold text-rose-700 transition hover:text-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isDeleting ? "Deleting traveler..." : "Delete traveler"}
      </button>
      {error && <p className="mt-1 text-sm font-medium text-red-600">{error}</p>}
    </div>
  );
}
