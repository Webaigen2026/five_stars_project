"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Bounded refresh while webhook may still be processing.
 * Does not mark payment paid client-side.
 */
export default function PaymentProcessingPoller({
  active,
  maxAttempts = 6,
  intervalMs = 2500,
}: {
  active: boolean;
  maxAttempts?: number;
  intervalMs?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!active) {
      return;
    }

    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      router.refresh();
      if (attempts >= maxAttempts) {
        window.clearInterval(timer);
      }
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [active, intervalMs, maxAttempts, router]);

  return null;
}
