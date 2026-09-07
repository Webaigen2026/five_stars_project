"use client";

import { useState } from "react";

import Link from "next/link";

import { ChevronDown } from "lucide-react";

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
    setOpenItemId((currentId) =>
      currentId === id ? null : id
    );
  }

  return (
    <section className="border-t border-slate-200 bg-white py-14 sm:py-16 lg:py-20">
      <div className="mx-auto w-full max-w-full px-4 sm:px-6 lg:px-20">
        {/* Section heading */}
        <div className="mb-10 sm:mb-12">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-3xl">
            

              <h2 className="font-american-sans mt-2 text-3xl font-light tracking-[-0.025em] text-slate-950 sm:text-4xl">
                Frequently asked questions
              </h2>

              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                Find quick answers about flights, bookings, cargo,
                charter services, and managing your trip with Five Stars.
              </p>
            </div>

            <Link
              href="/contact"
              className="
                inline-flex
                w-fit
                items-center
                text-sm
                font-semibold
                text-[#0078D2]
                transition
                hover:text-[#005a9e]
                hover:underline
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-[#0078D2]/30
                focus-visible:ring-offset-4
              "
            >
              Contact support
            </Link>
          </div>
        </div>

        {/* FAQ grid */}
        <div className="grid gap-x-10 lg:grid-cols-2">
          {faqItems.map((item) => {
            const isOpen = openItemId === item.id;

            const buttonId = `faq-button-${item.id}`;
            const panelId = `faq-panel-${item.id}`;

            return (
              <article
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
                    className="
                      group
                      flex
                      w-full
                      items-center
                      justify-between
                      gap-5
                      py-5
                      text-left
                      focus-visible:outline-none
                      focus-visible:ring-2
                      focus-visible:ring-inset
                      focus-visible:ring-[#0078D2]/40
                      sm:py-6
                    "
                  >
                    <span
                      className={[
                        "text-[15px] font-semibold leading-6 transition-colors duration-200 sm:text-base",
                        isOpen
                          ? "text-[#0078D2]"
                          : "text-slate-950 group-hover:text-[#0078D2]",
                      ].join(" ")}
                    >
                      {item.question}
                    </span>

                    <span
                      className={[
                        "inline-flex h-9 w-9 shrink-0 items-center justify-center  transition-all duration-300",
                        isOpen
                          ? "rotate-180  text-[#0078D2]"
                          : "bg-transparent text-slate-400 group-hover:bg-[#f4f9fd] group-hover:text-[#0078D2]",
                      ].join(" ")}
                    >
                      <ChevronDown
                        className="h-5 w-5"
                        aria-hidden="true"
                      />
                    </span>
                  </button>
                </h3>

                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className={[
                    "grid transition-all duration-300 ease-in-out",
                    isOpen
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0",
                  ].join(" ")}
                >
                  <div className="overflow-hidden">
                    <p className="max-w-xl pb-6 pr-10 text-sm leading-7 text-slate-600 sm:text-[15px]">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

      
      </div>
    </section>
  );
}