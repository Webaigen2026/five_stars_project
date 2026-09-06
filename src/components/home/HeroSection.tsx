import FlightSearchForm from "../../components/flights/FlightSearchForm";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden text-white">
      <div className="fs-container relative py-12 sm:py-16 lg:py-20">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-black">
            Haiti ↔ United States
          </p>

          <h1 className="mt-3 font-american-sans text-4xl font-light tracking-[-0.025em] text-black sm:text-5xl lg:text-6xl">
            Fly smarter between Haiti and the United States.
          </h1>

          <p className="mt-4 max-w-2xl text-lg font-normal leading-7 text-black">
            Search flights, manage your trips, request cargo shipping, and
            arrange charter services from one modern travel platform.
          </p>
        </div>

        <div className="mt-8">
          <FlightSearchForm />
        </div>
      </div>
    </section>
  );
}