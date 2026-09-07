"use client";

import type { SeatMapCellView } from "../../lib/seat-selection";

type SeatMapProps = {
  rows: Array<{ row: number; cells: SeatMapCellView[] }>;
  onSelectSeat: (seatNumber: string) => void;
  busy?: boolean;
  /** Existing layout exit rows — display only; no eligibility changes. */
  exitRows?: number[];
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function seatButtonClass(cell: SeatMapCellView) {
  switch (cell.state) {
    case "selected":
      return "border-[#0078D2] bg-[#0078D2] text-white shadow-[0_4px_12px_rgba(0,120,210,0.28)]";
    case "occupied":
      return "cursor-not-allowed border-slate-300 bg-slate-200 text-slate-500";
    case "blocked":
      return "cursor-not-allowed border-dashed border-slate-300 bg-slate-100 text-slate-400";
    default:
      if (cell.zone === "PREFERRED" || cell.zone === "EXTRA_LEGROOM") {
        return "border-amber-400 bg-amber-50 text-slate-900 hover:border-[#0078D2] hover:bg-amber-100/80";
      }
      if (cell.feeCents === 0) {
        return "border-[#0078D2]/45 bg-[#EAF5FC] text-[#0078D2] hover:border-[#0078D2] hover:bg-[#d9eef9]";
      }
      return "border-slate-300 bg-white text-slate-900 hover:border-[#0078D2] hover:bg-[#EAF5FC]";
  }
}

function seatButtonLabel(cell: SeatMapCellView) {
  if (cell.state === "occupied") {
    return "X";
  }
  if (cell.state === "blocked") {
    return "—";
  }
  // Always show the seat letter (A–F). Zone/price are conveyed by styling,
  // legend, aria-label, and the selection summary — not by replacing identity.
  return cell.seatNumber?.replace(/^\d+/, "") ?? "";
}

function LegendSwatch({
  className,
  children,
}: {
  className: string;
  children: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-4 items-center justify-center rounded-t-md border text-[8px] font-semibold",
        className
      )}
      aria-hidden
    >
      {children}
    </span>
  );
}

export default function SeatMap({
  rows,
  onSelectSeat,
  busy = false,
  exitRows = [],
}: SeatMapProps) {
  const exitRowSet = new Set(exitRows);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
      <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Front of aircraft
        </p>
      </div>

      {/* Controlled horizontal scroll for narrow viewports — page itself stays stable */}
      <div className="overflow-x-auto overscroll-x-contain px-3 py-5 sm:px-5">
        <div className="mx-auto w-max max-w-none rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-b from-slate-50 to-white px-3 py-4 sm:px-4">
          <div
            className="mb-3 grid items-center gap-x-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500"
            style={{
              gridTemplateColumns: "2rem repeat(3, 2.75rem) 1.25rem repeat(3, 2.75rem)",
            }}
          >
            <span aria-hidden />
            <span>A</span>
            <span>B</span>
            <span>C</span>
            <span aria-hidden className="text-slate-300">
              ·
            </span>
            <span>D</span>
            <span>E</span>
            <span>F</span>
          </div>

          <div className="space-y-1.5">
            {rows.map(({ row, cells }) => {
              const showExitLabel = exitRowSet.has(row);

              return (
                <div key={row}>
                  {showExitLabel ? (
                    <div className="mb-1.5 flex items-center gap-2 px-1">
                      <span className="h-px flex-1 bg-amber-200" aria-hidden />
                      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700">
                        Exit row
                      </span>
                      <span className="h-px flex-1 bg-amber-200" aria-hidden />
                    </div>
                  ) : null}

                  <div
                    className="grid items-center gap-x-1.5"
                    style={{
                      gridTemplateColumns:
                        "2rem repeat(3, 2.75rem) 1.25rem repeat(3, 2.75rem)",
                    }}
                  >
                    <span className="fs-nums text-center text-xs font-medium text-slate-500">
                      {row}
                    </span>
                    {cells.map((cell, index) =>
                      cell.kind === "aisle" ? (
                        <span
                          key={`aisle-${row}-${index}`}
                          className="flex h-11 items-center justify-center"
                          aria-hidden
                        >
                          <span className="h-7 w-px rounded-full bg-slate-200" />
                        </span>
                      ) : (
                        <button
                          key={cell.seatNumber}
                          type="button"
                          disabled={cell.disabled || busy}
                          aria-label={cell.ariaLabel}
                          aria-pressed={cell.state === "selected"}
                          title={cell.ariaLabel}
                          onClick={() => {
                            if (cell.seatNumber) {
                              onSelectSeat(cell.seatNumber);
                            }
                          }}
                          className={cn(
                            "relative mx-auto flex h-11 w-11 shrink-0 items-end justify-center pb-1.5 text-[10px] font-semibold transition duration-150",
                            "rounded-t-[0.65rem] rounded-b-md border",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078D2]/40 focus-visible:ring-offset-2",
                            "disabled:opacity-90",
                            "motion-safe:enabled:hover:scale-[1.02] motion-safe:enabled:active:scale-[0.98]",
                            seatButtonClass(cell)
                          )}
                        >
                          <span
                            aria-hidden
                            className="pointer-events-none absolute inset-x-1 top-1 h-2 rounded-t-md bg-black/5"
                          />
                          <span className="relative z-[1]">{seatButtonLabel(cell)}</span>
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-x-3 gap-y-2.5 border-t border-slate-100 px-4 py-4 text-xs text-slate-600 sm:flex sm:flex-wrap sm:gap-4 sm:px-5">
        <li className="inline-flex items-center gap-2">
          <LegendSwatch className="border-slate-300 bg-white text-slate-700">
            A
          </LegendSwatch>
          Available
        </li>
        <li className="inline-flex items-center gap-2">
          <LegendSwatch className="border-[#0078D2]/45 bg-[#EAF5FC] text-[#0078D2]">
            A
          </LegendSwatch>
          Included
        </li>
        <li className="inline-flex items-center gap-2">
          <LegendSwatch className="border-[#0078D2] bg-[#0078D2] text-white">
            A
          </LegendSwatch>
          Selected
        </li>
        <li className="inline-flex items-center gap-2">
          <LegendSwatch className="border-slate-300 bg-slate-200 text-slate-500">
            X
          </LegendSwatch>
          Occupied
        </li>
        <li className="inline-flex items-center gap-2">
          <LegendSwatch className="border-amber-400 bg-amber-50 text-slate-800">
            P
          </LegendSwatch>
          Preferred / paid
        </li>
        <li className="inline-flex items-center gap-2">
          <LegendSwatch className="border-dashed border-slate-300 bg-slate-100 text-slate-400">
            —
          </LegendSwatch>
          Blocked
        </li>
      </ul>
    </div>
  );
}
