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

function BenefitIcon({ positive }: { positive: boolean }) {
  if (positive) {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M3.5 8.5 6.5 11.5 12.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M4 8h8" strokeLinecap="round" />
    </svg>
  );
}

export default function FareOptionCard({
  option,
  disabled = false,
  onSelect,
  href,
}: FareOptionCardProps) {
  const selectLabel = `Select ${getFareFamilyLabel(option.family).replace("StarJet ", "")}`;
  const buttonClassName = option.highlighted
    ? "mt-5 inline-flex w-full justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
    : "mt-5 inline-flex w-full justify-center rounded-xl border border-primary/30 bg-sky-50 px-5 py-3 text-sm font-semibold text-primary transition hover:border-primary hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <article
      className={`relative flex h-full flex-col rounded-3xl border bg-white p-5 pt-9 shadow-sm sm:p-6 sm:pt-10 ${
        option.highlighted
          ? "border-primary ring-2 ring-primary/15"
          : "border-slate-200"
      }`}
    >
      {option.highlighted ? (
        <span className="absolute right-3 top-3 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white sm:right-4 sm:top-4 sm:px-3 sm:py-1 sm:text-xs">
          Most popular
        </span>
      ) : null}

      <div className={option.highlighted ? "min-h-14 pr-20 sm:pr-24" : "min-h-14"}>
        <h2 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
          {option.label}
        </h2>
        <p className="mt-1 text-sm font-medium text-primary">
          {option.description}
        </p>
      </div>

      <ul className="mt-5 flex-1 space-y-2.5 text-sm leading-6 text-slate-600">
        {option.benefits.map((benefit) => {
          const positive = !RESTRICTED_BENEFIT_COPY.has(benefit);
          return (
            <li key={benefit} className="flex gap-2.5">
              <BenefitIcon positive={positive} />
              <span>{benefit}</span>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 border-t border-slate-100 pt-5">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          From
        </p>
        <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          {formatMoney(option.priceCents)}
        </p>
        <p className="mt-1 text-xs text-slate-500">per passenger</p>

        {href ? (
          <Link href={href} className={buttonClassName} aria-disabled={disabled}>
            {selectLabel}
          </Link>
        ) : (
          <button
            type="button"
            className={buttonClassName}
            disabled={disabled}
            onClick={() => onSelect?.(option.family)}
          >
            {selectLabel}
          </button>
        )}
      </div>
    </article>
  );
}
