"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Minus, Plus } from "lucide-react";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    id: "find-flight-options",
    question: "How do I find the best Five Stars flight options?",
    answer:
      "Use the Five Stars flight search to review available routes, travel dates, and fare options between Haiti and the United States. If your schedule is flexible, checking nearby travel dates may provide additional availability.",
  },
  {
    id: "manage-booking",
    question: "How can I manage my Five Stars booking?",
    answer:
      "Signed-in travelers can review their reservations from My Trips. If you booked as a guest, use Find My Trip with your booking reference and the email address used for the reservation.",
  },
  {
    id: "guest-booking",
    question: "Can I book a flight without creating an account?",
    answer:
      "Yes. You can complete a reservation as a guest without creating an account. After booking, you can access your reservation through Find My Trip.",
  },
  {
    id: "cargo",
    question: "Can I send cargo with Five Stars?",
    answer:
      "Yes. Five Stars accepts cargo requests for documents, packages, barrels, pallets, and other approved items. Submit your shipment details through Cargo Services and the team can review your request.",
  },
  {
    id: "charter",
    question: "Does Five Stars offer private charter service?",
    answer:
      "Yes. Private charter requests can be submitted based on your departure location, destination, preferred schedule, passenger count, and travel requirements.",
  },
  {
    id: "baggage",
    question: "Where can I find baggage information for my trip?",
    answer:
      "Baggage allowances can vary by route and fare. Applicable baggage information is provided during booking and, when available, within your reservation details.",
  },
];

export default function FAQSection() {
  const [openItemId, setOpenItemId] = useState<string | null>(null);

  function toggleItem(id: string) {
    setOpenItemId((currentId) => (currentId === id ? null : id));
  }

  return (
    <section className="border-t border-slate-200 bg-white pt-14 pb-12 sm:pt-16 sm:pb-14 lg:pt-20 lg:pb-16">
      <div className="fs-container">
        <div className="grid gap-10 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-20">
          {/* Left information column */}
          <div className="lg:pt-1">
            <p className="mb-4 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#0078D2]">
              Travel support
            </p>

            <h2 className="font-american-sans text-[30px] font-light leading-[1.15] tracking-[-0.025em] text-slate-950 sm:text-[34px]">
              Before you travel.
            </h2>

            <p className="mt-4 max-w-[295px] text-[14px] leading-6 text-slate-600">
              Quick answers about reservations, guest bookings, baggage,
              cargo, and private charter service.
            </p>

            <div className="mt-7 max-w-[295px] border-t border-slate-200 pt-5">
              <p className="text-[13px] leading-5 text-slate-500">
                Need help with an existing reservation?
              </p>

              <Link
                href="/contact"
                className="group mt-2 inline-flex items-center gap-2 text-[14px] font-semibold text-slate-950 transition-colors hover:text-[#0078D2]"
              >
                Contact Five Stars

                <ArrowRight
                  size={15}
                  strokeWidth={1.8}
                  aria-hidden="true"
                  className="transition-transform duration-200 group-hover:translate-x-1"
                />
              </Link>
            </div>
          </div>

          {/* FAQ column */}
          <div>
            <div className="border-t border-slate-300">
              {faqItems.map((item, index) => {
                const isOpen = openItemId === item.id;

                const buttonId = `faq-button-${item.id}`;
                const panelId = `faq-panel-${item.id}`;

                return (
                  <div
                    key={item.id}
                    className="border-b border-slate-200"
                  >
                    <h3>
                      <button
                        id={buttonId}
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        onClick={() => toggleItem(item.id)}
                        className="group grid w-full grid-cols-[38px_minmax(0,1fr)_28px] items-center gap-4 py-[21px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0078D2]/30 sm:grid-cols-[42px_minmax(0,1fr)_28px] sm:py-[22px]"
                      >
                        {/* Number */}
                        <span
                          aria-hidden="true"
                          className={[
                            "text-[11px] font-semibold tracking-[0.12em] transition-colors",
                            isOpen
                              ? "text-[#0078D2]"
                              : "text-slate-400 group-hover:text-[#0078D2]",
                          ].join(" ")}
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>

                        {/* Question */}
                        <span
                          className={[
                            "text-[15px] font-medium leading-6 transition-colors",
                            isOpen
                              ? "text-[#0078D2]"
                              : "text-slate-950 group-hover:text-[#0078D2]",
                          ].join(" ")}
                        >
                          {item.question}
                        </span>

                        {/* Plus / minus */}
                        <span
                          className={[
                            "flex h-7 w-7 items-center justify-center transition-colors",
                            isOpen
                              ? "text-[#0078D2]"
                              : "text-slate-400 group-hover:text-[#0078D2]",
                          ].join(" ")}
                        >
                          {isOpen ? (
                            <Minus
                              size={17}
                              strokeWidth={1.6}
                              aria-hidden="true"
                            />
                          ) : (
                            <Plus
                              size={17}
                              strokeWidth={1.6}
                              aria-hidden="true"
                            />
                          )}
                        </span>
                      </button>
                    </h3>

                    {/* Answer */}
                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      className={[
                        "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
                        isOpen
                          ? "grid-rows-[1fr] opacity-100"
                          : "grid-rows-[0fr] opacity-0",
                      ].join(" ")}
                    >
                      <div className="overflow-hidden">
                        <div className="grid grid-cols-[38px_minmax(0,1fr)_28px] gap-4 sm:grid-cols-[42px_minmax(0,1fr)_28px]">
                          <div />

                          <p className="max-w-[680px] pb-6 text-[14px] leading-6 text-slate-600">
                            {item.answer}
                          </p>

                          <div />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reservation utility row */}
            <div className="flex flex-col gap-4 border-b border-slate-200 py-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[13px] text-slate-500">
                Looking for your reservation?
              </p>

              <div className="flex flex-wrap items-center gap-x-7 gap-y-3">
                <Link
                  href="/find-my-trip"
                  className="group inline-flex items-center gap-2 text-[13px] font-semibold text-slate-950 transition-colors hover:text-[#0078D2]"
                >
                  Find My Trip

                  <ArrowRight
                    size={14}
                    strokeWidth={1.8}
                    aria-hidden="true"
                    className="transition-transform duration-200 group-hover:translate-x-1"
                  />
                </Link>

                <Link
                  href="/my-trips"
                  className="group inline-flex items-center gap-2 text-[13px] font-semibold text-slate-950 transition-colors hover:text-[#0078D2]"
                >
                  My Trips

                  <ArrowRight
                    size={14}
                    strokeWidth={1.8}
                    aria-hidden="true"
                    className="transition-transform duration-200 group-hover:translate-x-1"
                  />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}