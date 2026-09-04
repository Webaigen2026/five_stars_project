import FlightSearchForm from "../../components/flights/FlightSearchForm";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-slate-950 text-white h-[130vh]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.18),transparent_35%)]" />

      <div className="relative mx-auto max-w-7xl px-6 py-20 sm:py-24 lg:py-28">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-400">
            Haiti ↔ United States
          </p>

          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Fly smarter between Haiti and the United States.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Search flights, manage your trips, request cargo shipping, and
            arrange charter services from one modern travel platform.
          </p>
        </div>

        <div className="mt-12">
          <FlightSearchForm />
        </div>
      </div>
    </section>
  );
}