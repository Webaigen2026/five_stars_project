"use client";

import Link from "next/link";

import {
  getFareFamilyLabel,
  type FareFamily,
} from "../../lib/fare-families";

import { formatMoney } from "../../lib/trip-formatting";

export type FareOptionCardModel = {
  family: FareFamily;
  label: string;
  description: string;
  benefits: string[];
  priceCents: number;
  highlighted: boolean;
};

type FareOptionCardProps = {
  option: FareOptionCardModel;
  disabled?: boolean;

  /** Prefer button callback for modal; href for static /fare fallback. */
  onSelect?: (family: FareFamily) => void;

  href?: string;
};

/** Presentation-only: which benefit lines are framed as restrictions. */
const RESTRICTED_BENEFIT_COPY = new Set([
  "Seat selection available for a fee",
  "Changes/cancellations may have a fee",
]);

function BenefitIcon({
  positive,
}: {
  positive: boolean;
}) {
  if (positive) {
    return (
      <span
        className="
          mt-0.5
          flex
          h-5
          w-5
          shrink-0
          items-center
          justify-center
          rounded-full
          bg-emerald-50
          text-emerald-700
        "
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 16 16"
          className="h-3 w-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            d="M3.5 8.5 6.5 11.5 12.5 4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }

  return (
    <span
      className="
        mt-0.5
        flex
        h-5
        w-5
        shrink-0
        items-center
        justify-center
        rounded-full
        bg-slate-100
        text-slate-400
      "
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 16 16"
        className="h-3 w-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          d="M4 8h8"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function TicketCorners() {
  return (
    <>
      <span
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -left-4
          -top-4
          z-20
          hidden
          h-8
          w-8
          rounded-full
          bg-white
          sm:block
        "
      />

      <span
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -right-4
          -top-4
          z-20
          hidden
          h-8
          w-8
          rounded-full
          bg-white
          sm:block
        "
      />

      <span
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -bottom-4
          -left-4
          z-20
          hidden
          h-8
          w-8
          rounded-full
          bg-white
          sm:block
        "
      />

      <span
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -bottom-4
          -right-4
          z-20
          hidden
          h-8
          w-8
          rounded-full
          bg-white
          sm:block
        "
      />
    </>
  );
}

export default function FareOptionCard({
  option,
  disabled = false,
  onSelect,
  href,
}: FareOptionCardProps) {
  const selectLabel = `Select ${getFareFamilyLabel(option.family).replace(
    "Five Stars ",
    ""
  )}`;

  const buttonClassName = option.highlighted
    ? `
        group/button
        inline-flex
        min-h-12
        w-full
        items-center
        justify-center
        gap-2
        rounded-lg
        bg-[#0078D2]
        px-5
        py-3
        text-sm
        font-semibold
        text-white
        shadow-[0_5px_14px_rgba(0,120,210,0.18)]
        transition
        hover:bg-[#006bbd]
        hover:shadow-[0_8px_20px_rgba(0,120,210,0.24)]
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-[#0078D2]/30
        focus-visible:ring-offset-2
        disabled:cursor-not-allowed
        disabled:opacity-50
        disabled:shadow-none
      `
    : `
        group/button
        inline-flex
        min-h-12
        w-full
        items-center
        justify-center
        gap-2
        rounded-lg
        border
        border-slate-300
        bg-white
        px-5
        py-3
        text-sm
        font-semibold
        text-[#0078D2]
        transition
        hover:border-[#0078D2]/30
        hover:bg-[#f5faff]
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-[#0078D2]/30
        focus-visible:ring-offset-2
        disabled:cursor-not-allowed
        disabled:opacity-50
      `;

  return (
    <article
      className="
        group
        relative
        isolate
        flex
        h-full
        min-w-0
        flex-col
        transition-transform
        duration-200
        hover:-translate-y-0.5
      "
    >
      {/* Soft floating shadow */}
      <span
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-x-7
          -bottom-3
          -z-10
          h-8
          rounded-[50%]
          bg-slate-950/[0.06]
          blur-2xl
          transition
          duration-200
          group-hover:bg-slate-950/[0.09]
        "
      />

      {/* Fare ticket */}
      <div
        className={`
          relative
          flex
          h-full
          min-w-0
          flex-col
          overflow-hidden
          bg-white
          shadow-[0_8px_28px_rgba(15,23,42,0.06)]
          transition-shadow
          duration-200
          group-hover:shadow-[0_14px_34px_rgba(15,23,42,0.09)]
          ${
            option.highlighted
              ? "shadow-[0_10px_34px_rgba(0,120,210,0.10)]"
              : ""
          }
        `}
      >
        <TicketCorners />

        {/* =====================================================
            FARE HEADER
        ===================================================== */}
        <div
          className="
            relative
            border-b
            border-dashed
            border-slate-300
            px-5
            pb-5
            pt-5
            sm:px-6
          "
        >
          <span
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              -bottom-3
              -left-3
              z-20
              h-6
              w-6
              rounded-full
              bg-white
            "
          />

          <span
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              -bottom-3
              -right-3
              z-20
              h-6
              w-6
              rounded-full
              bg-white
            "
          />

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0078D2]">
                Fare family
              </p>

              <h2
                className="
                  font-american-sans
                  mt-2
                  text-2xl
                  font-light
                  tracking-[-0.025em]
                  text-slate-950
                  sm:text-[1.75rem]
                "
              >
                {option.label}
              </h2>
            </div>

            {option.highlighted ? (
              <span
                className="
                  inline-flex
                  shrink-0
                  rounded-full
                  bg-[#0078D2]
                  px-3
                  py-1.5
                  text-[9px]
                  font-semibold
                  uppercase
                  tracking-[0.1em]
                  text-white
                "
              >
                Most popular
              </span>
            ) : null}
          </div>

          <p className="mt-2 text-sm font-medium leading-6 text-[#0078D2]">
            {option.description}
          </p>
        </div>

        {/* =====================================================
            BENEFITS
        ===================================================== */}
        <div className="flex flex-1 flex-col px-5 py-5 sm:px-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Included
            </p>

            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              {option.benefits.map((benefit) => {
                const positive =
                  !RESTRICTED_BENEFIT_COPY.has(benefit);

                return (
                  <li
                    key={benefit}
                    className="flex items-start gap-3"
                  >
                    <BenefitIcon positive={positive} />

                    <span
                      className={
                        positive
                          ? "text-slate-700"
                          : "text-slate-500"
                      }
                    >
                      {benefit}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Spacer keeps pricing aligned across cards */}
          <div className="flex-1" />

          {/* ===================================================
              PRICE STUB
          =================================================== */}
          <div
            className="
              relative
              mt-6
              border-t
              border-dashed
              border-slate-300
              pt-5
            "
          >
            <span
              aria-hidden="true"
              className="
                pointer-events-none
                absolute
                -left-8
                -top-3
                h-6
                w-6
                rounded-full
                bg-white
                sm:-left-9
              "
            />

            <span
              aria-hidden="true"
              className="
                pointer-events-none
                absolute
                -right-8
                -top-3
                h-6
                w-6
                rounded-full
                bg-white
                sm:-right-9
              "
            />

            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  From
                </p>

                <p
                  className="
                    fs-nums
                    mt-1
                    text-3xl
                    font-semibold
                    tracking-[-0.035em]
                    text-slate-950
                    sm:text-4xl
                  "
                >
                  {formatMoney(option.priceCents)}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  per passenger
                </p>
              </div>

              <p
                className="
                  hidden
                  text-right
                  text-[9px]
                  font-semibold
                  uppercase
                  tracking-[0.14em]
                  text-slate-400
                  sm:block
                "
              >
                Five Stars
                <br />
                Fare
              </p>
            </div>

            <div className="mt-5">
              {href ? (
                <Link
                  href={href}
                  className={buttonClassName}
                  aria-disabled={disabled}
                  tabIndex={disabled ? -1 : undefined}
                  onClick={(event) => {
                    if (disabled) {
                      event.preventDefault();
                    }
                  }}
                >
                  <span>{selectLabel}</span>

                  <span className="transition-transform duration-200 group-hover/button:translate-x-0.5">
                    <ArrowRightIcon />
                  </span>
                </Link>
              ) : (
                <button
                  type="button"
                  className={buttonClassName}
                  disabled={disabled}
                  onClick={() => onSelect?.(option.family)}
                >
                  <span>{selectLabel}</span>

                  <span className="transition-transform duration-200 group-hover/button:translate-x-0.5">
                    <ArrowRightIcon />
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bottom ticket branding */}
        <div
          className="
            border-t
            border-dashed
            border-slate-200
            bg-slate-50/50
            px-5
            py-2.5
            text-center
          "
        >
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Five Stars • {option.label}
          </p>
        </div>
      </div>
    </article>
  );
}