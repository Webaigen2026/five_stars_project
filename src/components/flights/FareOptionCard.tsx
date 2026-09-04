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

export default function FareOptionCard({
  option,
  disabled = false,
  onSelect,
  href,
}: FareOptionCardProps) {
  const selectLabel = `Select ${getFareFamilyLabel(option.family).replace("StarJet ", "")}`;
  const buttonClassName =
    "mt-5 inline-flex w-full justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <article
      className={`relative flex h-full flex-col rounded-3xl border bg-white p-6 pt-10 shadow-sm ${
        option.highlighted
          ? "border-primary ring-2 ring-primary/20"
          : "border-slate-200"
      }`}
    >
      {option.highlighted ? (
        <span className="absolute right-4 top-4 rounded-full bg-primary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
          Most popular
        </span>
      ) : null}

      <div className="min-h-14">
        <h2 className="text-2xl font-semibold text-slate-950 pr-24 sm:pr-28">
          {option.label}
        </h2>
        <p className="mt-1 text-sm font-medium text-primary">
          {option.description}
        </p>
      </div>

      <ul className="mt-6 flex-1 space-y-2.5 text-sm text-slate-600">
        {option.benefits.map((benefit) => (
          <li key={benefit} className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>{benefit}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8 border-t border-slate-100 pt-6">
        <p className="text-sm text-slate-500">From</p>
        <p className="mt-1 text-3xl font-semibold text-slate-950">
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
