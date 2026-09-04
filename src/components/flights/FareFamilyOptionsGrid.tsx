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
    <div className="grid gap-6 lg:grid-cols-3 lg:items-stretch">
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
