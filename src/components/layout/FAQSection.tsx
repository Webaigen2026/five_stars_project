"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus, Minus } from "lucide-react";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    id: "find-flight-deals",
    question: "How do I find the best Five Stars flight options?",
    answer:
      "Use the Five Stars flight search to compare available routes, travel dates, and fare options between Haiti and the United States. Flexible travel dates may help you find better availability and pricing.",
  },
  {
    id: "manage-booking",
    question: "How can I manage my Five Stars booking?",
    answer:
      "If you have an account, you can review your reservations from My Trips. Guest travelers can use Find My Trip with their booking reference and reservation email.",
  },
  {
    id: "guest-booking",
    question: "Can I book a flight without creating an account?",
    answer:
      "Yes. Five Stars allows guest bookings. You can complete a reservation without creating an account and later access the trip using Find My Trip.",
  },
  {
    id: "cargo",
    question: "Can I send cargo with Five Stars?",
    answer:
      "Yes. You can submit a cargo request for items such as documents, boxes, barrels, pallets, and other approved cargo. The Five Stars team will review the request and follow up with you.",
  },
  {
    id: "charter",
    question: "Does Five Stars offer private charter service?",
    answer:
      "Yes. You can request private air travel based on your route, preferred schedule, passenger count, and travel requirements through the Charter section.",
  },
  {
    id: "baggage",
    question: "Where can I find baggage information for my trip?",
    answer:
      "Baggage allowances may vary by route and fare. Your applicable baggage information will be shown during booking and in your reservation details when available.",
  },
];

export default function FAQSection() {
  const [openItemId, setOpenItemId] = useState<string | null>(null);

  function toggleItem(id: string) {
    setOpenItemId((currentId) => (currentId === id ? null : id));
  }

  return (
    <section className="border-t border-slate-200 bg-white py-14 sm:py-16 lg:py-20">
      <div className="fs-container">
        <div className="grid gap-10 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-20">
          {/* Left side */}
          <div>
            <h2 className="font-american-sans text-[30px] font-light leading-[1.15] tracking-[-0.025em] text-slate-950 sm:text-[34px]">
              Questions about
              <br className="hidden lg:block" /> your trip?
            </h2>

            <p className="mt-4 max-w-[300px] text-[14px] leading-6 text-slate-600">
              Find answers about reservations, managing your trip, cargo,
              charter services, and baggage.
            </p>

            <Link
              href="/contact"
              className="group mt-6 inline-flex items-center gap-2 text-[14px] font-semibold text-slate-950 transition-colors hover:text-[#0078D2]"
            >
              Contact support
              <ArrowRight
                size={15}
                strokeWidth={1.8}
                className="transition-transform duration-200 group-hover:translate-x-1"
              />
            </Link>
          </div>

          {/* FAQ list */}
          <div className="border-t border-slate-200">
            {faqItems.map((item) => {
              const isOpen = openItemId === item.id;
              const buttonId = `faq-button-${item.id}`;
              const panelId = `faq-panel-${item.id}`;

              return (
                <div key={item.id} className="border-b border-slate-200">
                  <h3>
                    <button
                      id={buttonId}
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => toggleItem(item.id)}
                      className="group flex w-full items-center justify-between gap-8 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0078D2]/30 sm:py-[22px]"
                    >
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

                      <span className="flex h-7 w-7 shrink-0 items-center justify-center text-slate-500 transition-colors group-hover:text-[#0078D2]">
                        {isOpen ? (
                          <Minus
                            size={18}
                            strokeWidth={1.6}
                            aria-hidden="true"
                          />
                        ) : (
                          <Plus
                            size={18}
                            strokeWidth={1.6}
                            aria-hidden="true"
                          />
                        )}
                      </span>
                    </button>
                  </h3>

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
                      <p className="max-w-2xl pb-6 pr-12 text-[14px] leading-6 text-slate-600">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}