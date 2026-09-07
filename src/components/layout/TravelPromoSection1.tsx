"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  motion,
  useReducedMotion,
} from "framer-motion";

const viewportSettings = {
  once: false,
  amount: 0.18,
  margin: "0px 0px -8% 0px",
} as const;

export default function TravelPromoSection() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section
      className="
        w-full
        min-w-0
        max-w-full
        overflow-x-clip
        bg-background
        py-12
        sm:py-16
        lg:py-20
      "
    >
      <div
        className="
          mx-auto
          w-full
          min-w-0
          max-w-[1800px]
          px-4
          sm:px-6
          lg:px-10
        "
      >
        <div
          className="
            mx-auto
            grid
            w-full
            min-w-0
            max-w-full
            grid-cols-1
            justify-items-center
            gap-8
            lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.7fr)]
            lg:items-center
            lg:justify-items-stretch
            lg:gap-12
            xl:gap-16
          "
        >
          {/* Decorative traveler artwork */}
          <motion.div
            className="
              order-2
              mx-auto
              flex
              w-full
              min-w-0
              max-w-full
              justify-center
              lg:order-1
              lg:mx-0
              lg:justify-end
            "
            initial={
              shouldReduceMotion
                ? { opacity: 1 }
                : {
                    opacity: 0,
                    y: 24,
                  }
            }
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={viewportSettings}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.9,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <motion.div
              className="
                mx-auto
                flex
                w-full
                min-w-0
                max-w-full
                items-center
                justify-center
                lg:mx-0
                lg:justify-end
              "
              whileInView={
                shouldReduceMotion
                  ? {}
                  : {
                      scale: [0.98, 1],
                    }
              }
              viewport={viewportSettings}
              transition={{
                duration: 1,
                ease: [0.22, 1, 0.36, 1],
              }}
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
                  mx-auto
                  block
                  h-auto
                  w-full
                  max-w-[240px]
                  object-contain
                  object-center
                  sm:max-w-[320px]
                  lg:mx-0
                  lg:w-full
                  lg:max-w-[380px]
                "
              />
            </motion.div>
          </motion.div>

          {/* Promotional content */}
          <motion.div
            className="
              order-1
              mx-auto
              w-full
              min-w-0
              max-w-full
              lg:order-2
              lg:mx-0
            "
            initial={
              shouldReduceMotion
                ? { opacity: 1 }
                : {
                    opacity: 0,
                    y: 28,
                  }
            }
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={viewportSettings}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.95,
              delay: shouldReduceMotion ? 0 : 0.08,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <PromoCard
              shouldReduceMotion={Boolean(
                shouldReduceMotion
              )}
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function PromoCard({
  shouldReduceMotion,
}: {
  shouldReduceMotion: boolean;
}) {
  return (
    <motion.article
      className="
        relative
        mx-auto
        w-full
        min-w-0
        max-w-full
        overflow-hidden
        rounded-[24px]
        bg-white
        p-5
        shadow-[-6px_-6px_14px_var(--color-neu-highlight),6px_6px_14px_var(--color-neu-shadow)]
        sm:rounded-[28px]
        sm:p-6
        lg:mx-0
        lg:rounded-[32px]
        lg:p-8
        dark:bg-surface
        dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_20px_50px_-24px_rgba(0,0,0,0.55)]
      "
      initial={
        shouldReduceMotion
          ? { opacity: 1 }
          : {
              opacity: 0,
              scale: 0.985,
            }
      }
      whileInView={{
        opacity: 1,
        scale: 1,
      }}
      viewport={viewportSettings}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.85,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <div
        className="
          grid
          w-full
          min-w-0
          max-w-full
          grid-cols-1
          items-center
          justify-items-center
          gap-7
          lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]
          lg:justify-items-stretch
          lg:gap-10
        "
      >
        {/* Promo image */}
        <motion.div
          className="
            mx-auto
            w-full
            min-w-0
            max-w-full
            lg:mx-0
          "
          initial={
            shouldReduceMotion
              ? { opacity: 1 }
              : {
                  opacity: 0,
                  y: 30,
                  scale: 0.96,
                }
          }
          whileInView={{
            opacity: 1,
            y: 0,
            scale: 1,
          }}
          viewport={viewportSettings}
          transition={{
            duration: shouldReduceMotion ? 0 : 0.9,
            delay: shouldReduceMotion ? 0 : 0.14,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <PromoImage />
        </motion.div>

        {/*
          Text column: keep full-width on mobile but inset from the card
          edges so centered lines do not sit flush against the border
          (previously read as right-side clipping).
        */}
        <motion.div
          className="
            mx-auto
            w-full
            min-w-0
            max-w-full
            px-3
            text-center
            sm:px-4
            lg:mx-0
            lg:max-w-none
            lg:px-0
            lg:text-left
          "
          initial="hidden"
          whileInView="visible"
          viewport={viewportSettings}
          variants={{
            hidden: {},
            visible: {
              transition: {
                staggerChildren: shouldReduceMotion
                  ? 0
                  : 0.1,
                delayChildren: shouldReduceMotion
                  ? 0
                  : 0.18,
              },
            },
          }}
        >
          <motion.h2
            className="
              font-american-sans
              mx-auto
              w-full
              min-w-0
              max-w-[32rem]
              text-balance
              break-words
              text-3xl
              font-light
              leading-tight
              tracking-[-0.015em]
              text-slate-950
              sm:text-4xl
              lg:mx-0
            "
            variants={{
              hidden: shouldReduceMotion
                ? {
                    opacity: 1,
                    y: 0,
                  }
                : {
                    opacity: 0,
                    y: 24,
                  },

              visible: {
                opacity: 1,
                y: 0,
                transition: {
                  duration: shouldReduceMotion
                    ? 0
                    : 0.75,
                  ease: [0.22, 1, 0.36, 1],
                },
              },
            }}
          >
            Missed the fare drop again?
          </motion.h2>

          <motion.p
            className="
              mx-auto
              mt-3
              w-full
              min-w-0
              max-w-[32rem]
              break-words
              text-pretty
              text-base
              font-normal
              leading-7
              text-slate-600
              sm:text-lg
              lg:mx-0
            "
            variants={{
              hidden: shouldReduceMotion
                ? {
                    opacity: 1,
                    y: 0,
                  }
                : {
                    opacity: 0,
                    y: 20,
                  },

              visible: {
                opacity: 1,
                y: 0,
                transition: {
                  duration: shouldReduceMotion
                    ? 0
                    : 0.75,
                  ease: [0.22, 1, 0.36, 1],
                },
              },
            }}
          >
            Turn on Flight Alerts and we&apos;ll notify you
            the moment prices change on your route—so you
            can book at the right time without repeatedly
            checking.
          </motion.p>

          <motion.div
            className="
              flex
              w-full
              min-w-0
              max-w-full
              justify-center
              lg:justify-start
            "
            variants={{
              hidden: shouldReduceMotion
                ? {
                    opacity: 1,
                    y: 0,
                  }
                : {
                    opacity: 0,
                    y: 18,
                  },

              visible: {
                opacity: 1,
                y: 0,
                transition: {
                  duration: shouldReduceMotion
                    ? 0
                    : 0.7,
                  ease: [0.22, 1, 0.36, 1],
                },
              },
            }}
          >
            <Link
              href="/flights"
              className="
                group
                mt-6
                inline-flex
                items-center
                justify-center
                gap-2
                font-american-sans
                text-lg
                leading-7
                text-[#0078D2]
                transition-all
                duration-300
                hover:text-[#006bbd]
                motion-safe:hover:scale-105
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-[#0078D2]/30
                focus-visible:ring-offset-4
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
          </motion.div>
        </motion.div>
      </div>
    </motion.article>
  );
}

function PromoImage() {
  return (
    <motion.div
      className="
        group
        relative
        mx-auto
        aspect-[4/3]
        w-full
        min-w-0
        max-w-full
        overflow-hidden
        bg-surface
        shadow-[0_14px_40px_rgba(15,23,42,0.12)]
        lg:mx-0
        lg:h-[300px]
        lg:aspect-auto
      "
      whileHover={{
        scale: 1.01,
      }}
      transition={{
        duration: 0.4,
        ease: [0.22, 1, 0.36, 1],
      }}
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

      {/* Image shading */}
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

      {/* Fine image edge */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-0
          ring-1
          ring-inset
          ring-white/25
        "
      />
    </motion.div>
  );
}