import Link from "next/link";
import { ArrowRight } from "lucide-react";

const services = [
  {
    title: "Passenger service",
    description:
      "Scheduled passenger flights connecting Haiti and the United States.",
    href: "/flights",
    action: "Explore flights",
  },
  {
    title: "Cargo transportation",
    description:
      "Transportation for packages, documents, barrels, pallets, and other approved cargo.",
    href: "/cargo",
    action: "Cargo services",
  },
  {
    title: "Private charter",
    description:
      "Private air travel arranged around your destination, schedule, and travel requirements.",
    href: "/charter",
    action: "Request a charter",
  },
];

export default function ServicesSection() {
  return (
    <section className="border-t border-slate-200 bg-white">
      <div className="fs-container py-12 sm:py-14 lg:py-16">
        {/* Section heading */}
        <div className="grid gap-5 pb-7 lg:grid-cols-[1fr_420px] lg:items-end">
          <div>
            <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#0078d4]">
              Services
            </p>

            <h2 className="font-american-sans text-[32px] font-light leading-tight tracking-[-0.03em] text-slate-950 sm:text-[36px]">
              Passenger, cargo and charter.
            </h2>
          </div>

          <p className="max-w-[420px] text-[14px] leading-6 text-slate-600 lg:justify-self-end">
            Travel and transportation services connecting Haiti and the
            United States.
          </p>
        </div>

        {/* Service directory */}
        <div className="border-y border-slate-200">
          {services.map((service) => (
            <div
              key={service.title}
              className="
                group
                grid
                gap-4
                border-b
                border-slate-200
                py-7
                last:border-b-0
                sm:py-8
                lg:grid-cols-[280px_1fr_190px]
                lg:items-center
                lg:gap-10
              "
            >
              {/* Service name */}
              <h3 className="font-american-sans text-[21px] font-normal tracking-[-0.015em] text-slate-950">
                {service.title}
              </h3>

              {/* Description */}
              <p className="max-w-[540px] text-[14px] leading-6 text-slate-600">
                {service.description}
              </p>

              {/* Action */}
              <div className="lg:flex lg:justify-end">
                <Link
                  href={service.href}
                  className="
                    inline-flex
                    items-center
                    gap-3
                    text-[13px]
                    font-semibold
                    text-slate-950
                    transition-colors
                    duration-200
                    hover:text-[#0078d4]
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-[#0078d4]/30
                    focus-visible:ring-offset-4
                  "
                >
                  {service.action}

                  <ArrowRight
                    size={15}
                    strokeWidth={1.8}
                    className="
                      transition-transform
                      duration-200
                      group-hover:translate-x-1
                    "
                    aria-hidden="true"
                  />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}