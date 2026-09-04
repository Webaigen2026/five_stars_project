"use client";

import FareOptionCard, { type FareOptionCardModel } from "./FareOptionCard";
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
  const options: FareOptionCardModel[] = listFareFamilyOptions(basePriceCents);

  return (
    <div className="grid gap-4 lg:grid-cols-3 lg:items-stretch lg:gap-5">
      {options.map((option) => (
        <FareOptionCard
          key={option.family}
          option={option}
          disabled={disabled}
          onSelect={onSelect}
          href={hrefForFamily?.(option.family)}
        />
      ))}
    </div>
  );
}
