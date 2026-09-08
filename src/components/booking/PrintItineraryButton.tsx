"use client";

export default function PrintItineraryButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#0078D2] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#006bbd] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078D2]/30"
    >
      Print / Save PDF
    </button>
  );
}
