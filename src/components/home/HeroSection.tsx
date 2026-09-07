import FlightSearchForm from "../../components/flights/FlightSearchForm";

export default function HeroSection() {
  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="fs-container">
        <div className="py-10 sm:py-12 lg:py-14">
          {/* Route */}
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="h-px w-6 shrink-0 bg-[#0078D2]"
            />

            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-600">
              Haiti
              <span className="mx-2 text-slate-400">↔</span>
              United States
            </p>
          </div>

          {/* Main content */}
          <div className="mt-4 max-w-[760px]">
            <h1 className="font-american-sans text-[34px] font-light leading-[1.08] tracking-[-0.03em] text-slate-950 sm:text-[38px] lg:text-[42px]">
              Travel between Haiti and the United States.
            </h1>

            <p className="mt-3 max-w-[620px] text-[14px] leading-6 text-slate-600 sm:text-[15px]">
              Search scheduled passenger flights and plan your journey with
              Five Stars.
            </p>
          </div>

          {/* Booking */}
          <div className="mt-7">
            <FlightSearchForm />
          </div>
        </div>
      </div>
    </section>
  );
}