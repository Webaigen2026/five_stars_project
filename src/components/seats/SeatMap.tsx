"use client";

import type { SeatMapCellView } from "../../lib/seat-selection";

type SeatMapProps = {
  rows: Array<{ row: number; cells: SeatMapCellView[] }>;
  onSelectSeat: (seatNumber: string) => void;
  busy?: boolean;
};

function seatButtonClass(cell: SeatMapCellView) {
  switch (cell.state) {
    case "selected":
      return "bg-primary text-white border-primary";
    case "occupied":
      return "bg-slate-200 text-slate-500 border-slate-300 cursor-not-allowed";
    case "blocked":
      return "bg-slate-100 text-slate-400 border-dashed border-slate-300 cursor-not-allowed";
    default:
      if (cell.zone === "PREFERRED" || cell.zone === "EXTRA_LEGROOM") {
        return "bg-amber-50 text-slate-900 border-amber-400 hover:border-primary hover:bg-amber-100";
      }
      if (cell.feeCents === 0) {
        return "bg-emerald-50 text-slate-900 border-emerald-300 hover:border-primary hover:bg-emerald-100";
      }
      return "bg-white text-slate-900 border-slate-300 hover:border-primary hover:bg-sky-50";
  }
}

function seatButtonLabel(cell: SeatMapCellView) {
  if (cell.state === "occupied") {
    return "X";
  }
  if (cell.state === "blocked") {
    return "—";
  }
  if (cell.zone === "PREFERRED") {
    return "P";
  }
  if (cell.zone === "EXTRA_LEGROOM") {
    return "XL";
  }
  if (cell.feeCents && cell.feeCents > 0) {
    return `$${(cell.feeCents / 100).toFixed(0)}`;
  }
  return cell.seatNumber?.replace(/^\d+/, "") ?? "";
}

export default function SeatMap({ rows, onSelectSeat, busy = false }: SeatMapProps) {
  return (
    <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        Front of aircraft
      </p>

      <div className="mx-auto w-max min-w-full">
        <div className="mb-2 grid grid-cols-[2rem_repeat(7,2.5rem)] gap-1 text-center text-xs font-semibold text-slate-500">
          <span />
          <span>A</span>
          <span>B</span>
          <span>C</span>
          <span className="text-slate-300">|</span>
          <span>D</span>
          <span>E</span>
          <span>F</span>
        </div>

        <div className="space-y-1">
          {rows.map(({ row, cells }) => (
            <div
              key={row}
              className="grid grid-cols-[2rem_repeat(7,2.5rem)] gap-1 items-center"
            >
              <span className="text-center text-xs font-semibold text-slate-500">
                {row}
              </span>
              {cells.map((cell, index) =>
                cell.kind === "aisle" ? (
                  <span
                    key={`aisle-${row}-${index}`}
                    className="text-center text-slate-300"
                    aria-hidden
                  >
                    |
                  </span>
                ) : (
                  <button
                    key={cell.seatNumber}
                    type="button"
                    disabled={cell.disabled || busy}
                    aria-label={cell.ariaLabel}
                    title={cell.ariaLabel}
                    onClick={() => {
                      if (cell.seatNumber) {
                        onSelectSeat(cell.seatNumber);
                      }
                    }}
                    className={`h-10 w-10 rounded-lg border text-[10px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-80 ${seatButtonClass(cell)}`}
                  >
                    {seatButtonLabel(cell)}
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      </div>

      <ul className="mt-6 flex flex-wrap gap-4 text-xs text-slate-600">
        <li className="inline-flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-slate-300 bg-white text-[9px] font-semibold">
            A
          </span>
          Available
        </li>
        <li className="inline-flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-emerald-300 bg-emerald-50 text-[9px] font-semibold">
            A
          </span>
          Included
        </li>
        <li className="inline-flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-primary bg-primary text-[9px] font-semibold text-white">
            A
          </span>
          Selected
        </li>
        <li className="inline-flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-slate-300 bg-slate-200 text-[9px] font-semibold">
            X
          </span>
          Occupied
        </li>
        <li className="inline-flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-amber-400 bg-amber-50 text-[9px] font-semibold">
            P
          </span>
          Preferred / paid
        </li>
        <li className="inline-flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-dashed border-slate-300 bg-slate-100 text-[9px] font-semibold text-slate-400">
            —
          </span>
          Blocked
        </li>
      </ul>
    </div>
  );
}
