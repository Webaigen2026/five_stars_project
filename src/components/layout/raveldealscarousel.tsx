"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import {
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Plane,
} from "lucide-react";

import { useIsMounted } from "../../lib/useIsMounted";

interface TravelDeal {
  city: string;
  duration: string;
  dateRange: string;
  priceFrom: number;
  imageUrl: string;
  imageAlt: string;
}

const deals: TravelDeal[] = [
  {
    city: "Washington, D.C.",
    duration: "1h 44m, non-stop",
    dateRange: "Thu 8/20 – Mon 8/24",
    priceFrom: 109,
    imageUrl: "/location/CitadelleLaferriereHaiti.jpg",
    imageAlt: "Travel destination",
  },
  {
    city: "Baltimore",
    duration: "1h 43m, non-stop",
    dateRange: "Tue 8/25 – Sat 8/29",
    priceFrom: 117,
    imageUrl: "/location/mid-beach-aerial1-1440x900.jpg",
    imageAlt: "Travel destination",
  },
  {
    city: "Knoxville",
    duration: "2h 28m, non-stop",
    dateRange: "Sat 8/22 – Sat 8/29",
    priceFrom: 142,
    imageUrl: "/location/Newyork.webp",
    imageAlt: "Travel destination",
  },
  {
    city: "Raleigh",
    duration: "2h 8m, non-stop",
    dateRange: "Mon 8/24 – Thu 8/27",
    priceFrom: 149,
    imageUrl: "/location/palas.webp",
    imageAlt: "Travel destination",
  },
];

export default function TravelDealsCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);

  const mounted = useIsMounted();

  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const updateEdges = useCallback(() => {
    const track = trackRef.current;

    if (!track) return;

    const tolerance = 4;

    setAtStart(track.scrollLeft <= tolerance);

    setAtEnd(
      track.scrollLeft + track.clientWidth >=
        track.scrollWidth - tolerance
    );
  }, []);

  useEffect(() => {
    updateEdges();

    window.addEventListener("resize", updateEdges);

    return () => {
      window.removeEventListener("resize", updateEdges);
    };
  }, [updateEdges]);

  function scrollByCard(direction: "prev" | "next") {
    const track = trackRef.current;

    const firstCard =
      track?.firstElementChild as HTMLElement | null;

    if (!track || !firstCard) return;

    const styles = window.getComputedStyle(track);

    const gap = Number.parseFloat(
      styles.columnGap || styles.gap || "0"
    );

    const distance = firstCard.offsetWidth + gap;

    track.scrollBy({
      left: direction === "next" ? distance : -distance,
      behavior: "smooth",
    });
  }

  return (
    <section className="overflow-hidden bg-[#f5f6f7] py-14 sm:py-16 lg:py-20">
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-10 xl:px-16">
        {/* Header */}
        <div className="mb-10 flex flex-col gap-5 border-b border-slate-300 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
          

            <h2
              className="
                font-american-sans
                mt-3
                text-3xl
                font-light
                tracking-[-0.025em]
                text-slate-950
                sm:text-4xl
              "
            >
              Travel deals worth checking out.
            </h2>

            <p className="mt-3 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              Explore selected fares and find a trip that fits your schedule
              and budget.
            </p>
          </div>

          <Link
            href="/deals"
            className="
              group
              inline-flex
              w-fit
              items-center
              gap-2
              text-sm
              font-semibold
              text-primary
              transition
              hover:text-primary-hover
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-primary/30
            "
          >
            Explore all deals

            <ArrowUpRight
              className="
                h-4
                w-4
                transition-transform
                duration-200
                group-hover:-translate-y-0.5
                group-hover:translate-x-0.5
              "
              aria-hidden="true"
            />
          </Link>
        </div>

        {/* Carousel */}
        <div
          ref={trackRef}
          onScroll={updateEdges}
          className="
            -mx-4
            flex
            snap-x
            snap-mandatory
            gap-5
            overflow-x-auto
            px-4
            pb-4
            scroll-smooth
            [scrollbar-width:none]
            sm:-mx-6
            sm:px-6
            lg:mx-0
            lg:gap-6
            lg:px-0
            [&::-webkit-scrollbar]:hidden
          "
        >
          {deals.map((deal) => (
            <DealCard
              key={`${deal.city}-${deal.dateRange}`}
              deal={deal}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-end gap-2">
          <NavButton
            direction="prev"
            disabled={mounted && atStart}
            onClick={() => scrollByCard("prev")}
          />

          <NavButton
            direction="next"
            disabled={mounted && atEnd}
            onClick={() => scrollByCard("next")}
          />
        </div>
      </div>
    </section>
  );
}

function DealCard({
  deal,
}: {
  deal: TravelDeal;
}) {
  return (
    <article
      className="
        group
        flex
        w-[84vw]
        max-w-[380px]
        shrink-0
        snap-start
        flex-col
        border
        border-slate-200
        bg-white
        shadow-[0_8px_24px_rgba(15,23,42,0.06)]
        transition-all
        duration-300
        hover:-translate-y-1
        hover:border-slate-300
        hover:shadow-[0_16px_34px_rgba(15,23,42,0.10)]
        sm:w-[360px]
        sm:max-w-none
        lg:w-[390px]
        xl:w-[410px]
      "
    >
      {/* Image */}
      <div className="relative h-56 overflow-hidden bg-slate-100 lg:h-60">
        <Image
          src={deal.imageUrl}
          alt={deal.imageAlt}
          fill
          sizes="
            (min-width: 1280px) 410px,
            (min-width: 1024px) 390px,
            (min-width: 640px) 360px,
            84vw
          "
          className="
            object-cover
            transition-transform
            duration-700
            ease-out
            group-hover:scale-[1.03]
          "
        />

        <div
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            inset-0
            bg-gradient-to-t
            from-slate-950/45
            via-slate-950/[0.03]
            to-transparent
          "
        />

        <div className="absolute inset-x-0 bottom-0 border-t border-white/20 bg-slate-950/20 px-5 py-4 backdrop-blur-[2px]">
          <h3
            className="
              font-american-sans
              text-2xl
              font-light
              tracking-[-0.02em]
              text-white
            "
          >
            {deal.city}
          </h3>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col px-5 py-5 sm:px-6">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Plane
            className="h-4 w-4 shrink-0 text-primary"
            aria-hidden="true"
          />

          <span>Non-stop</span>
        </div>

        <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
          <Clock3
            className="h-4 w-4 shrink-0 text-primary"
            aria-hidden="true"
          />

          <span>{deal.duration}</span>
        </div>

        <p className="mt-2 text-sm text-slate-500">
          {deal.dateRange}
        </p>

        <div className="mt-6 border-t border-slate-200 pt-5">
          <div className="flex items-end justify-between gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Round-trip from
              </p>

              <div className="mt-1 flex items-end gap-1">
                <p
                  className="
                    fs-nums
                    font-american-sans
                    text-3xl
                    font-light
                    tracking-[-0.025em]
                    text-slate-950
                  "
                >
                  ${deal.priceFrom}
                </p>

                <span className="mb-1 text-xs text-slate-500">
                  USD
                </span>
              </div>
            </div>

            <Link
              href={`/flights?destination=${encodeURIComponent(
                deal.city
              )}`}
              aria-label={`View flights to ${deal.city}`}
              className="
                group/button
                inline-flex
                items-center
                gap-2
                border-b
                border-primary
                pb-1
                text-sm
                font-semibold
                text-primary
                transition
                hover:border-primary-hover
                hover:text-primary-hover
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-primary/30
              "
            >
              View flights

              <ArrowRight
                className="
                  h-4
                  w-4
                  transition-transform
                  duration-200
                  group-hover/button:translate-x-1
                "
                aria-hidden="true"
              />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

function NavButton({
  direction,
  disabled,
  onClick,
}: {
  direction: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon =
    direction === "prev"
      ? ChevronLeft
      : ChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={
        direction === "prev"
          ? "Previous deals"
          : "Next deals"
      }
      className="
        inline-flex
        h-10
        w-10
        items-center
        justify-center
        border
        border-slate-300
        bg-white
        text-slate-800
        transition-all
        duration-200
        hover:border-primary
        hover:bg-primary
        hover:text-white
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-primary/30
        disabled:cursor-not-allowed
        disabled:opacity-30
        disabled:hover:border-slate-300
        disabled:hover:bg-white
        disabled:hover:text-slate-800
      "
    >
      <Icon
        className="h-5 w-5"
        aria-hidden="true"
      />
    </button>
  );
}