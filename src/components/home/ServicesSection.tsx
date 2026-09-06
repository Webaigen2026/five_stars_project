import Link from "next/link";
import { ArrowRight } from "lucide-react";

const services = [
  {
    title: "Passenger flights",
    description:
      "Scheduled service between Haiti and the United States.",
    href: "/flights",
    action: "View flights",
  },
  {
    title: "Cargo",
    description:
      "Transport packages, documents, barrels, pallets, and more.",
    href: "/cargo",
    action: "Cargo services",
  },
  {
    title: "Private charter",
    description:
      "Private travel arranged around your destination and schedule.",
    href: "/charter",
    action: "Charter services",
  },
];

export default function ServicesSection() {
  return (
    <section className="bg-white pb-16 pt-6 sm:pb-20 sm:pt-8">
      <div className="fs-container">
        {/* Intro */}
        <div className="border-b border-slate-200 pb-7">
          <div className="grid gap-4 lg:grid-cols-[1fr_420px] lg:items-end">
            <h2 className="font-american-sans text-[32px] font-light leading-tight tracking-[-0.03em] text-slate-950 sm:text-[36px]">
              More ways to travel.
            </h2>

            <p className="max-w-[420px] text-[14px] leading-6 text-slate-600 lg:justify-self-end">
              Passenger travel, cargo transportation, and private charter
              service connecting Haiti and the United States.
            </p>
          </div>
        </div>

        {/* Services */}
        <div className="grid md:grid-cols-3">
          {services.map((service, index) => (
            <div
              key={service.title}
              className={[
                "relative py-8 md:min-h-[190px]",
                index === 0 ? "md:pr-10" : "",
                index === 1
                  ? "border-t border-slate-200 md:border-l md:border-t-0 md:px-10"
                  : "",
                index === 2
                  ? "border-t border-slate-200 md:border-l md:border-t-0 md:pl-10"
                  : "",
              ].join(" ")}
            >
              <h3 className="font-american-sans text-[21px] font-normal tracking-[-0.015em] text-slate-950">
                {service.title}
              </h3>

              <p className="mt-3 max-w-[290px] text-[14px] leading-6 text-slate-600">
                {service.description}
              </p>

              <Link
                href={service.href}
                className="group mt-6 inline-flex items-center gap-2 text-[13px] font-semibold text-slate-950 transition-colors hover:text-[#0078d4]"
              >
                {service.action}

                <ArrowRight
                  size={14}
                  strokeWidth={1.8}
                  className="transition-transform duration-200 group-hover:translate-x-1"
                />
              </Link>
            </div>
          ))}
        </div>

        <div className="border-b border-slate-200" />
      </div>
    </section>
  );
}