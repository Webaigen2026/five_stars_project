"use client";

import FareOptionCard, {
  type FareOptionCardModel,
} from "./FareOptionCard";

import {
  listFareFamilyOptions,
  type FareFamily,
} from "../../lib/fare-families";

type FareFamilyOptionsGridProps = {
  basePriceCents: number;
  disabled?: boolean;
  onSelect?: (family: FareFamily) => void;
  hrefForFamily?: (family: FareFamily) => string;
};

export default function FareFamilyOptionsGrid({
  basePriceCents,
  disabled = false,
  onSelect,
  hrefForFamily,
}: FareFamilyOptionsGridProps) {
  const options: FareOptionCardModel[] =
    listFareFamilyOptions(basePriceCents);

  return (
    <div
      className="
        grid
        min-w-0
        grid-cols-1
        gap-5
        md:grid-cols-2
        xl:grid-cols-3
        xl:items-stretch
        xl:gap-6
      "
    >
      {options.map((option) => (
        <div
          key={option.family}
          className="
            min-w-0
            xl:h-full
          "
        >
          <FareOptionCard
            option={option}
            disabled={disabled}
            onSelect={onSelect}
            href={hrefForFamily?.(option.family)}
          />
        </div>
      ))}
    </div>
  );
}