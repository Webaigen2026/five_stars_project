"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ChevronDown,
} from "lucide-react";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    id: "find-flight-deals",
    question:
      "How do I find the best Five Stars flight options?",
    answer:
      "Use the Five Stars flight search to compare available routes, travel dates, and fare options between Haiti and the United States. Flexible travel dates may help you find better availability and pricing.",
  },
  {
    id: "manage-booking",
    question:
      "How can I manage my Five Stars booking?",
    answer:
      "If you have an account, you can review your reservations from My Trips. Guest travelers can use Find My Trip with their booking reference and reservation email.",
  },
  {
    id: "guest-booking",
    question:
      "Can I book a flight without creating an account?",
    answer:
      "Yes. Five Stars allows guest bookings. You can complete a reservation without creating an account and later access the trip using Find My Trip.",
  },
  {
    id: "cargo",
    question:
      "Can I send cargo with Five Stars?",
    answer:
      "Yes. You can submit a cargo request for items such as documents, boxes, barrels, pallets, and other approved cargo. The Five Stars team will review the request and follow up with you.",
  },
  {
    id: "charter",
    question:
      "Does Five Stars offer private charter service?",
    answer:
      "Yes. You can request private air travel based on your route, preferred schedule, passenger count, and travel requirements through the Charter section.",
  },
  {
    id: "baggage",
    question:
      "Where can I find baggage information for my trip?",
    answer:
      "Baggage allowances may vary by route and fare. Your applicable baggage information will be shown during booking and in your reservation details when available.",
  },
];

export default function FAQSection() {
  const [openItemId, setOpenItemId] =
    useState<string | null>(null);

  function toggleItem(id: string) {
    setOpenItemId((currentId) =>
      currentId === id ? null : id
    );
  }

  return (
    <section
      className="
        border-t
        border-slate-200
        bg-white
      "
      aria-labelledby="faq-heading"
    >
      <div
        className="
          mx-auto
          w-full
          max-w-[1540px]
          px-5
          pt-14
          pb-12
          sm:px-6
          sm:pt-16
          sm:pb-14
          lg:px-10
          lg:pt-20
          lg:pb-16
          xl:px-12
        "
      >
        {/* ===============================================
            HEADER
        ================================================ */}

        <div
          className="
            grid
            gap-6
            border-b
            border-slate-200
            pb-8
            lg:grid-cols-[minmax(0,1fr)_auto]
            lg:items-end
          "
        >
          <div className="max-w-[700px]">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="
                  h-px
                  w-7
                  bg-[#0078D2]
                "
              />

              <p
                className="
                  text-[11px]
                  font-semibold
                  uppercase
                  tracking-[0.19em]
                  text-[#0078D2]
                "
              >
                Help center
              </p>
            </div>

            <h2
              id="faq-heading"
              className="
                mt-4
                font-american-sans
                text-[32px]
                font-light
                leading-[1.1]
                tracking-[-0.035em]
                text-slate-950
                sm:text-[38px]
                lg:text-[42px]
              "
            >
              Frequently asked questions.
            </h2>

            <p
              className="
                mt-4
                max-w-[620px]
                text-[15px]
                leading-7
                text-slate-600
                sm:text-base
              "
            >
              Find quick answers about flights,
              bookings, cargo, charter services,
              and managing your trip with Five Stars.
            </p>
          </div>

          <Link
            href="/contact"
            className="
              group
              inline-flex
              w-fit
              items-center
              gap-2
              text-sm
              font-semibold
              text-slate-900
              transition-colors
              hover:text-[#0078D2]
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-[#0078D2]/30
              focus-visible:ring-offset-4
            "
          >
            Contact support

            <ArrowUpRight
              aria-hidden="true"
              className="
                h-4
                w-4
                text-[#0078D2]
                transition-transform
                duration-200
                group-hover:-translate-y-0.5
                group-hover:translate-x-0.5
              "
            />
          </Link>
        </div>

        {/* ===============================================
            FAQ GRID
        ================================================ */}

        <div
          className="
            grid
            lg:grid-cols-2
            lg:gap-x-16
            xl:gap-x-24
          "
        >
          {faqItems.map((item) => {
            const isOpen =
              openItemId === item.id;

            const buttonId =
              `faq-button-${item.id}`;

            const panelId =
              `faq-panel-${item.id}`;

            return (
              <article
                key={item.id}
                className="
                  border-b
                  border-slate-200
                "
              >
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() =>
                      toggleItem(item.id)
                    }
                    className="
                      group
                      flex
                      w-full
                      items-start
                      justify-between
                      gap-6
                      py-6
                      text-left
                      focus-visible:outline-none
                      focus-visible:ring-2
                      focus-visible:ring-inset
                      focus-visible:ring-[#0078D2]/30
                      sm:py-7
                    "
                  >
                    <span
                      className={`
                        max-w-[540px]
                        text-[15px]
                        font-semibold
                        leading-6
                        transition-colors
                        duration-200
                        sm:text-base

                        ${
                          isOpen
                            ? "text-[#0078D2]"
                            : "text-slate-900 group-hover:text-[#0078D2]"
                        }
                      `}
                    >
                      {item.question}
                    </span>

                    <span
                      className={`
                        mt-0.5
                        inline-flex
                        h-8
                        w-8
                        shrink-0
                        items-center
                        justify-center
                        border
                        transition-all
                        duration-200

                        ${
                          isOpen
                            ? "rotate-180 border-[#0078D2] bg-[#0078D2] text-white"
                            : "border-slate-300 bg-white text-slate-500 group-hover:border-[#0078D2] group-hover:text-[#0078D2]"
                        }
                      `}
                    >
                      <ChevronDown
                        aria-hidden="true"
                        className="h-4 w-4"
                      />
                    </span>
                  </button>
                </h3>

                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className={`
                    grid
                    transition-all
                    duration-300
                    ease-in-out

                    ${
                      isOpen
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    }
                  `}
                >
                  <div className="overflow-hidden">
                    <p
                      className="
                        max-w-[540px]
                        pb-7
                        pr-10
                        text-[14px]
                        leading-7
                        text-slate-600
                        sm:text-[15px]
                      "
                    >
                      {item.answer}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* ===============================================
            SUPPORT ROW
        ================================================ */}

        <div
          className="
            mt-7
            flex
            flex-col
            gap-3
            border-t
            border-slate-200
            pt-6
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <p className="text-sm text-slate-600">
            Still have questions about your trip?
          </p>

          <Link
            href="/contact"
            className="
              group
              inline-flex
              w-fit
              items-center
              gap-2
              text-sm
              font-semibold
              text-slate-900
              transition-colors
              hover:text-[#0078D2]
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-[#0078D2]/30
              focus-visible:ring-offset-4
            "
          >
            Get help from Five Stars

            <ArrowUpRight
              aria-hidden="true"
              className="
                h-4
                w-4
                text-[#0078D2]
                transition-transform
                duration-200
                group-hover:-translate-y-0.5
                group-hover:translate-x-0.5
              "
            />
          </Link>
        </div>
      </div>
    </section>
  );
}