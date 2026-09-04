import {
  getBookingProgressPresentation,
  type BookingProgressStep,
} from "../../lib/booking-status";

function stepClasses(state: BookingProgressStep["state"]) {
  switch (state) {
    case "complete":
      return {
        marker: "border-emerald-600 bg-emerald-600 text-white",
        label: "text-emerald-800",
      };
    case "current":
      return {
        marker: "border-primary bg-primary text-white ring-4 ring-primary/15",
        label: "font-semibold text-primary",
      };
    default:
      return {
        marker: "border-slate-300 bg-white text-slate-400",
        label: "text-slate-500",
      };
  }
}

function stepSymbol(state: BookingProgressStep["state"]) {
  if (state === "complete") {
    return "✓";
  }

  if (state === "current") {
    return "•";
  }

  return "";
}

export default function BookingProgress({ status }: { status: string }) {
  const progress = getBookingProgressPresentation(status);

  if (progress.mode !== "progress") {
    const tone =
      progress.mode === "cancelled"
        ? "border-slate-200 bg-slate-50 text-slate-700"
        : progress.mode === "refunded"
          ? "border-indigo-100 bg-indigo-50 text-indigo-900"
          : progress.mode === "failed"
            ? "border-rose-100 bg-rose-50 text-rose-900"
            : "border-slate-200 bg-slate-50 text-slate-700";

    return (
      <div
        className={`rounded-2xl border px-4 py-4 ${tone}`}
        role="status"
        aria-label={`Booking status: ${progress.label}`}
      >
        <p className="text-sm font-semibold">{progress.label}</p>
        <p className="mt-1 text-sm leading-6 opacity-90">
          {progress.description}
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
      aria-label="Booking progress"
    >
      <ol className="grid gap-3 sm:grid-cols-5">
        {progress.steps.map((step) => {
          const classes = stepClasses(step.state);

          return (
            <li
              key={step.label}
              className="flex min-w-0 items-center gap-3 sm:flex-col sm:items-center sm:text-center"
              aria-current={step.state === "current" ? "step" : undefined}
            >
              <span
                className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${classes.marker}`}
                aria-hidden="true"
              >
                {stepSymbol(step.state)}
              </span>
              <span className={`min-w-0 text-sm ${classes.label}`}>
                {step.label}
                <span className="sr-only">
                  {step.state === "complete"
                    ? ", complete"
                    : step.state === "current"
                      ? ", current"
                      : ", upcoming"}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        {progress.description}
      </p>
    </div>
  );
}
