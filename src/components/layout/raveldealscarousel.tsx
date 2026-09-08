"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

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

    if (!track) {
      return;
    }

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

    if (!track || !firstCard) {
      return;
    }

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
    <section className="relative overflow-hidden bg-white">
      <div
        className="
          mx-auto
          w-full
          max-w-[1540px]
          px-5
          py-12
          sm:px-6
          sm:py-14
          lg:px-10
          lg:py-16
          xl:px-12
        "
      >
        {/* =========================================================
            SECTION HEADER
        ========================================================== */}

        <div className="border-b border-slate-200 pb-6 sm:pb-7">
          <div
            className="
              flex
              flex-col
              gap-6
              lg:flex-row
              lg:items-end
              lg:justify-between
            "
          >
            <div className="max-w-[700px]">
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
                    tracking-[0.19em]
                    text-[#0078D2]
                  "
                >
                  Featured fares
                </p>
              </div>

              <h2
                className="
                  mt-4
                  font-american-sans
                  text-[32px]
                  font-light
                  leading-[1.08]
                  tracking-[-0.035em]
                  text-slate-950
                  sm:text-[38px]
                  lg:text-[42px]
                "
              >
                Explore current fares.
              </h2>

              <p
                className="
                  mt-3
                  max-w-[590px]
                  text-[15px]
                  leading-6
                  text-slate-600
                  sm:text-base
                  sm:leading-7
                "
              >
                Browse selected round-trip fares and find a
                trip that fits your schedule.
              </p>
            </div>

            <div
              className="
                flex
                items-center
                justify-between
                gap-5
                sm:justify-start
                lg:justify-end
              "
            >
              <Link
                href="/flights"
                className="
                  group
                  inline-flex
                  items-center
                  gap-2
                  text-sm
                  font-semibold
                  text-slate-900
                  transition-colors
                  hover:text-[#0078D2]
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-[#0078D2]/30
                  focus-visible:ring-offset-4
                "
              >
                View all fares

                <ArrowUpRight
                  aria-hidden="true"
                  className="
                    h-4
                    w-4
                    text-[#0078D2]
                    transition-transform
                    duration-200
                    group-hover:-translate-y-0.5
                    group-hover:translate-x-0.5
                  "
                />
              </Link>

              <div className="flex items-center">
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
          </div>
        </div>

        {/* =========================================================
            CAROUSEL
        ========================================================== */}

        <div className="mt-7 sm:mt-8">
          <div
            ref={trackRef}
            onScroll={updateEdges}
            className="
              -mx-5
              flex
              snap-x
              snap-mandatory
              gap-4
              overflow-x-auto
              overscroll-x-contain
              px-5
              pb-2
              scroll-smooth
              [scrollbar-width:none]
              sm:-mx-6
              sm:gap-5
              sm:px-6
              lg:mx-0
              lg:gap-5
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
        </div>

        {/* =========================================================
            DISCLAIMER
        ========================================================== */}

        <div
          className="
            mt-7
            flex
            flex-col
            gap-2
            border-t
            border-slate-200
            pt-4
            text-[12px]
            leading-5
            text-slate-500
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <p>
            Fares shown are sample round-trip prices and may
            vary by travel date and availability.
          </p>

          <p className="shrink-0">
            Prices shown in USD.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ===============================================================
   DEAL CARD
================================================================ */

function DealCard({ deal }: { deal: TravelDeal }) {
  return (
    <article
      className="
        group
        flex
        w-[86vw]
        max-w-[350px]
        shrink-0
        snap-start
        flex-col
        overflow-hidden
        border
        border-slate-200
        bg-white
        sm:w-[340px]
        sm:max-w-none
        lg:w-[calc((100%-2.5rem)/3)]
        lg:min-w-[300px]
        xl:min-w-[350px]
      "
    >
      {/* Image */}

      <div
        className="
          relative
          h-[185px]
          overflow-hidden
          bg-slate-100
          sm:h-[195px]
          lg:h-[205px]
        "
      >
        <Image
          src={deal.imageUrl}
          alt={deal.imageAlt}
          fill
          sizes="
            (min-width: 1280px) 350px,
            (min-width: 1024px) 32vw,
            (min-width: 640px) 340px,
            86vw
          "
          className="
            object-cover
            transition-transform
            duration-500
            ease-out
            group-hover:scale-[1.02]
          "
        />

        <div
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            inset-0
            bg-gradient-to-t
            from-slate-950/70
            via-slate-950/10
            to-transparent
          "
        />

        <div
          className="
            absolute
            inset-x-0
            bottom-0
            px-5
            pb-5
            pt-12
          "
        >
          <p
            className="
              mb-1
              text-[10px]
              font-semibold
              uppercase
              tracking-[0.18em]
              text-white/75
            "
          >
            Destination
          </p>

          <h3
            className="
              font-american-sans
              text-[25px]
              font-light
              leading-tight
              tracking-[-0.025em]
              text-white
            "
          >
            {deal.city}
          </h3>
        </div>
      </div>

      {/* Details */}

      <div className="flex flex-1 flex-col px-5 py-5">
        <div
          className="
            flex
            items-center
            gap-2
            text-[13px]
            font-medium
            text-slate-700
          "
        >
          <Plane
            aria-hidden="true"
            className="h-[15px] w-[15px] shrink-0 text-[#0078D2]"
          />

          <span>Non-stop</span>
        </div>

        <div
          className="
            mt-3
            flex
            items-center
            gap-2
            text-[13px]
            text-slate-600
          "
        >
          <Clock3
            aria-hidden="true"
            className="h-[15px] w-[15px] shrink-0 text-[#0078D2]"
          />

          <span>{deal.duration}</span>
        </div>

        <p className="mt-2 text-[13px] text-slate-500">
          {deal.dateRange}
        </p>

        {/* Fare */}

        <div className="mt-5 border-t border-slate-200 pt-4">
          <p
            className="
              text-[10px]
              font-semibold
              uppercase
              tracking-[0.16em]
              text-slate-500
            "
          >
            Round-trip from
          </p>

          <div
            className="
              mt-2
              flex
              items-end
              justify-between
              gap-4
            "
          >
            <div className="flex items-end gap-1.5">
              <span
                className="
                  fs-nums
                  font-american-sans
                  text-[32px]
                  font-light
                  leading-none
                  tracking-[-0.035em]
                  text-slate-950
                "
              >
                ${deal.priceFrom}
              </span>

              <span
                className="
                  mb-[3px]
                  text-[11px]
                  font-medium
                  text-slate-500
                "
              >
                USD
              </span>
            </div>

            <Link
              href={`/flights?destination=${encodeURIComponent(
                deal.city
              )}`}
              aria-label={`View flights to ${deal.city}`}
              className="
                group/link
                inline-flex
                shrink-0
                items-center
                gap-1.5
                text-[13px]
                font-semibold
                text-slate-900
                transition-colors
                hover:text-[#0078D2]
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-[#0078D2]/30
                focus-visible:ring-offset-4
              "
            >
              View flights

              <ArrowRight
                aria-hidden="true"
                className="
                  h-4
                  w-4
                  text-[#0078D2]
                  transition-transform
                  duration-200
                  group-hover/link:translate-x-1
                "
              />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ===============================================================
   NAVIGATION BUTTON
================================================================ */

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
          ? "Previous fares"
          : "Next fares"
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
        text-slate-700
        transition-colors
        first:border-r-0
        hover:border-slate-900
        hover:bg-slate-950
        hover:text-white
        focus-visible:relative
        focus-visible:z-10
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-[#0078D2]/30
        disabled:cursor-not-allowed
        disabled:bg-slate-50
        disabled:text-slate-300
        disabled:hover:border-slate-300
      "
    >
      <Icon
        aria-hidden="true"
        className="h-4 w-4"
      />
    </button>
  );
}