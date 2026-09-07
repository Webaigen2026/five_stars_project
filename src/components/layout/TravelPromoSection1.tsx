"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bell, ArrowRight } from "lucide-react";

export default function TravelPromoSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;

    if (!section) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.18,
        rootMargin: "0px 0px -8% 0px",
      }
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="bg-background py-12 sm:py-16 lg:py-20"
    >
      <div className="mx-auto w-full max-w-full px-4 sm:px-6 lg:px-10">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.7fr)] lg:gap-12 xl:gap-16">
          {/* Decorative traveler artwork */}
          <div
            className={[
              "order-2 flex justify-center transition-all duration-1000 ease-out lg:order-1 lg:justify-end",
              inView
                ? "translate-x-0 translate-y-0 opacity-100"
                : "-translate-x-8 translate-y-4 opacity-0",
            ].join(" ")}
          >
            <Image
              src="/airplane/avatars.png"
              alt="Travelers preparing for their next trip"
              width={500}
              height={500}
              sizes="
                (max-width: 639px) 240px,
                (max-width: 1023px) 320px,
                380px
              "
              className="
                h-auto
                w-full
                max-w-[240px]
                object-contain
                sm:max-w-[320px]
                lg:max-w-[380px]
              "
            />
          </div>

          {/* Promotional content */}
          <div
            className={[
              "order-1 min-w-0 transition-all duration-1000 ease-out lg:order-2",
              inView
                ? "translate-x-0 translate-y-0 opacity-100"
                : "translate-x-8 translate-y-5 opacity-0",
            ].join(" ")}
            style={{
              transitionDelay: inView ? "120ms" : "0ms",
            }}
          >
            <PromoCard inView={inView} />
          </div>
        </div>
      </div>
    </section>
  );
}

function PromoCard({ inView }: { inView: boolean }) {
  return (
    <article
      className="
        relative
        overflow-hidden
        rounded-[28px]
        bg-white
        p-4
        shadow-[-6px_-6px_14px_var(--color-neu-highlight),6px_6px_14px_var(--color-neu-shadow)]
        sm:rounded-[32px]
        sm:p-6
        lg:p-8
        dark:bg-surface
        dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_20px_50px_-24px_rgba(0,0,0,0.55)]
      "
    >
      <div className="grid items-center gap-7 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] lg:gap-10">
        <div
          className={[
            "transition-all duration-1000 ease-out",
            inView
              ? "translate-y-0 scale-100 opacity-100"
              : "translate-y-5 scale-[0.97] opacity-0",
          ].join(" ")}
          style={{
            transitionDelay: inView ? "220ms" : "0ms",
          }}
        >
          <PromoImage />
        </div>

        <div
          className={[
            "min-w-0 text-center transition-all duration-1000 ease-out lg:text-left",
            inView
              ? "translate-y-0 opacity-100"
              : "translate-y-6 opacity-0",
          ].join(" ")}
          style={{
            transitionDelay: inView ? "320ms" : "0ms",
          }}
        >
          <div
            className={[
              "flex justify-center transition-all duration-700 ease-out lg:justify-start",
              inView
                ? "translate-y-0 opacity-100"
                : "translate-y-3 opacity-0",
            ].join(" ")}
            style={{
              transitionDelay: inView ? "380ms" : "0ms",
            }}
          >
            {/* <div
              className="
                inline-flex
                items-center
                gap-2
                rounded-full
                border
                border-sky-100
                bg-sky-50
                px-3
                py-1.5
                text-xs
                font-semibold
                uppercase
                tracking-[0.14em]
                text-primary
              "
            >
              <Bell className="h-3.5 w-3.5" aria-hidden="true" />
              Flight Alerts
            </div> */}
          </div>

          <h2
            className="
              font-american-sans
            
              text-3xl
              font-light
              tracking-[-0.015em]
              text-slate-950
            "
          >
            Missed the fare drop again?
          </h2>

          <p className="mt-3 text-lg font-normal leading-7 text-slate-600">
            Turn on Flight Alerts and we&apos;ll notify you the moment prices
            change on your route—so you can book at the right time without
            repeatedly checking.
          </p>

          <Link
            href="/flights"
            className="
              group
              mt-6
              inline-flex
              items-center
              gap-2
              font-american-sans
              text-lg
              leading-7
              transition-all
              duration-300
              hover:scale-105
            "
          >
            Visit Flights

            <ArrowRight
              className="
                h-4
                w-4
                transition-transform
                duration-300
                group-hover:translate-x-1
              "
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>
    </article>
  );
}

function PromoImage() {
  return (
    <div
      className="
        group
        relative
        aspect-[4/3]
        w-full
        overflow-hidden
      
        bg-surface
        shadow-[0_14px_40px_rgba(15,23,42,0.12)]
     
        lg:h-[300px]
        lg:aspect-auto
      "
    >
      <Image
        src="/airplane/boston.webp"
        alt="Aerial view of Boston"
        fill
        priority
        sizes="
          (max-width: 639px) calc(100vw - 4rem),
          (max-width: 1023px) calc(100vw - 6rem),
          400px
        "
        className="
          object-cover
          object-center
          transition-transform
          duration-700
          ease-out
          motion-safe:group-hover:scale-105
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-0
          bg-gradient-to-t
          from-black/20
          via-transparent
          to-white/[0.05]
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-0
          rounded-[inherit]
          ring-1
          ring-inset
          ring-white/25
        "
      />
    </div>
  );
}