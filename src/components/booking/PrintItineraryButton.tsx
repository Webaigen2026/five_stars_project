"use client";

export default function PrintItineraryButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover"
    >
      Print / Save PDF
    </button>
  );
}
