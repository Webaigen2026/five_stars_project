"use client";

import { useState } from "react";

export default function CopyBookingReferenceButton({
  bookingReference,
}: {
  bookingReference: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      if (!navigator.clipboard?.writeText) {
        return;
      }

      await navigator.clipboard.writeText(bookingReference);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      aria-label={
        copied
          ? `Booking reference ${bookingReference} copied`
          : `Copy booking reference`
      }
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
