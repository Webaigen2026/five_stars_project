"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

export default function TravelPromoSection() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="w-full overflow-hidden bg-white">
      <div
        className="
          mx-auto
          w-full
          max-w-[1440px]
          px-4
          py-14
          sm:px-6
          sm:py-16
          lg:px-8
          lg:py-20
          xl:px-10
        "
      >
        <motion.div
          initial={
            shouldReduceMotion
              ? { opacity: 1 }
              : { opacity: 0, y: 18 }
          }
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{
            duration: shouldReduceMotion ? 0 : 0.65,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="
            grid
            min-w-0
            grid-cols-1
            border-y
            border-slate-200
            lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]
          "
        >
          {/* ============================================================= */}
          {/* IMAGE                                                         */}
          {/* ============================================================= */}

          <div
            className="
              relative
              min-h-[280px]
              overflow-hidden
              bg-slate-100
              sm:min-h-[340px]
              lg:min-h-[410px]
            "
          >
            <Image
              src="/airplane/boston.webp"
              alt="Aerial view of Boston"
              fill
              sizes="
                (max-width: 1023px) 100vw,
                60vw
              "
              className="
                object-cover
                object-center
                transition-transform
                duration-700
                ease-out
                motion-safe:hover:scale-[1.015]
              "
            />

            <div
              aria-hidden="true"
              className="
                pointer-events-none
                absolute
                inset-0
                bg-gradient-to-r
                from-slate-950/[0.06]
                via-transparent
                to-transparent
              "
            />

            {/* Small route marker */}
            <div
              className="
                absolute
                bottom-5
                left-5
                bg-white
                px-4
                py-3
                shadow-[0_8px_24px_rgba(15,23,42,0.12)]
                sm:bottom-6
                sm:left-6
              "
            >
              <p
                className="
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-[0.18em]
                  text-slate-500
                "
              >
                Featured destination
              </p>

              <p
                className="
                  mt-1
                  font-american-sans
                  text-[17px]
                  font-medium
                  text-slate-950
                "
              >
                Boston, Massachusetts
              </p>
            </div>
          </div>

          {/* ============================================================= */}
          {/* CONTENT                                                       */}
          {/* ============================================================= */}

          <div
            className="
              flex
              min-w-0
              items-center
              bg-white
              px-6
              py-10
              sm:px-8
              sm:py-12
              lg:border-l
              lg:border-slate-200
              lg:px-10
              lg:py-14
              xl:px-12
            "
          >
            <div className="max-w-[480px]">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="h-px w-7 bg-[#0078D2]"
                />

                <p
                  className="
                    text-[11px]
                    font-semibold
                    uppercase
                    tracking-[0.2em]
                    text-slate-500
                  "
                >
                  Flight alerts
                </p>
              </div>

              <h2
                className="
                  mt-5
                  font-american-sans
                  text-[32px]
                  font-light
                  leading-[1.08]
                  tracking-[-0.03em]
                  text-slate-950
                  sm:text-[38px]
                  lg:text-[42px]
                "
              >
                Missed the fare drop again?
              </h2>

              <p
                className="
                  mt-5
                  max-w-[440px]
                  text-[15px]
                  leading-7
                  text-slate-600
                  sm:text-base
                "
              >
                Turn on Flight Alerts and we&apos;ll notify you when prices
                change on your route, so you can book when the timing is
                right.
              </p>

              <div
                className="
                  mt-8
                  border-t
                  border-slate-200
                  pt-6
                "
              >
                <Link
                  href="/flights"
                  className="
                    group
                    inline-flex
                    min-h-11
                    items-center
                    gap-3
                    text-[15px]
                    font-semibold
                    text-slate-950
                    transition-colors
                    hover:text-[#0078D2]
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-[#0078D2]/30
                    focus-visible:ring-offset-4
                  "
                >
                  Explore flights

                  <ArrowRight
                    aria-hidden="true"
                    className="
                      h-4
                      w-4
                      text-[#0078D2]
                      transition-transform
                      duration-200
                      group-hover:translate-x-1
                    "
                  />
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}