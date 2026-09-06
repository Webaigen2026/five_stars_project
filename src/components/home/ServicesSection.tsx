import Link from "next/link";

const services = [
  {
    title: "Passenger Flights",
    description:
      "Search available routes, reserve seats, and manage your upcoming trips.",
    href: "/flights",
    action: "Explore flights",
  },
  {
    title: "Cargo Shipping",
    description:
      "Request transportation for documents, boxes, barrels, pallets, and more.",
    href: "/cargo",
    action: "Ship cargo",
  },
  {
    title: "Private Charter",
    description:
      "Request customized private air travel based on your route and schedule.",
    href: "/charter",
    action: "Request charter",
  },
];

export default function ServicesSection() {
  return (
    <section className="bg-white py-12 sm:py-16">
      <div className="fs-container">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Our Services
          </p>

          <h2 className="font-american-sans mt-2 text-3xl font-light tracking-[-0.025em] text-slate-950 sm:text-4xl">
            More than just a flight booking platform.
          </h2>

          <p className="mt-3 text-lg font-normal leading-7 text-slate-600">
            Five Stars brings passenger travel, cargo shipping, and private
            charter services together in one simple experience.
          </p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {services.map((service) => (
            <article
              key={service.title}
              className="group fs-card-pad rounded-3xl border border-slate-200 bg-white transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-lg font-bold text-primary">
                {service.title.charAt(0)}
              </div>

              <h3 className="font-american-sans text-xl font-light tracking-[-0.015em] text-slate-950">
                {service.title}
              </h3>

              <p className="mt-2 font-normal leading-7 text-slate-600">
                {service.description}
              </p>

              <Link
                href={service.href}
                className="mt-4 inline-flex text-sm font-semibold text-primary transition group-hover:text-primary-hover"
              >
                {service.action} →
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}