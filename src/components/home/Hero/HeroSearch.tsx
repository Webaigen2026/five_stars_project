import HeroAirplaneCutout from "./HeroAirplaneCutout";
import HeroBackground from "./HeroBackground";
import TravelImageWall from "./TravelImageWall";
import FlightSearchForm from "../../flights/FlightSearchForm";

export default function HeroSearch() {
  return (
    <section className="relative w-full min-w-0 overflow-x-clip bg-white">
      <div
        className="
          mx-auto
          w-full
          max-w-[1440px]
          px-4
          sm:px-6
          lg:px-8
          xl:px-10
        "
      >
        <div
          className="
            grid
            min-w-0
            grid-cols-1
            gap-8
            py-6
            sm:py-8
            lg:grid-cols-[minmax(0,1fr)_300px]
            lg:items-start
            lg:gap-8
            lg:py-10
            xl:grid-cols-[minmax(0,1fr)_320px]
            xl:gap-10
          "
        >
          {/* ============================================================= */}
          {/* MAIN BOOKING AREA                                             */}
          {/* ============================================================= */}

          <div className="min-w-0">
            {/* Hero image */}
            <div
              className="
                relative
                isolate
                h-[220px]
                w-full
                min-w-0
                overflow-hidden
                bg-slate-100
                sm:h-[260px]
                md:h-[280px]
                lg:h-[250px]
                xl:h-[270px]
              "
            >
              <HeroBackground />

              {/* Very light image treatment only */}
              <div
                aria-hidden="true"
                className="
                  pointer-events-none
                  absolute
                  inset-0
                  z-10
                  bg-gradient-to-t
                  from-slate-950/[0.08]
                  via-transparent
                  to-transparent
                "
              />

              {/* Airplane is decorative and cannot affect document width */}
              <div
                aria-hidden="true"
                className="
                  pointer-events-none
                  absolute
                  inset-0
                  z-20
                  overflow-hidden
                "
              >
                <HeroAirplaneCutout />
              </div>
            </div>

            {/* Booking/search panel */}
            <div
              className="
                relative
                z-30
                min-w-0
                border-x
                border-b
                border-slate-200
                bg-white
                px-4
                py-6
                shadow-[0_18px_45px_-35px_rgba(15,23,42,0.35)]
                sm:px-6
                sm:py-7
                lg:px-7
                lg:py-7
                xl:px-8
              "
            >
              <FlightSearchForm />
            </div>
          </div>

          {/* ============================================================= */}
          {/* TRAVEL VISUALS                                                */}
          {/* ============================================================= */}

          <aside
            aria-label="Five Stars travel destinations"
            className="
              hidden
              min-w-0
              overflow-hidden
              lg:block
            "
          >
            <div
              className="
                mx-auto
                w-full
                max-w-[300px]
                overflow-hidden
                xl:max-w-[320px]
              "
            >
              <TravelImageWall />
            </div>
          </aside>
        </div>
      </div>

      <style>{`
        /*
         * Hero airplane
         *
         * Keep the decorative airplane centered without allowing its
         * oversized artwork to participate in page layout.
         */
        .hs-plane {
          left: 50%;
          width: 100%;
          transform-origin: center center;

          --hs-plane-x: 0px;
          --hs-plane-y: -5.5rem;
          --hs-plane-scale: 0.9;

          opacity: 0;

          animation:
            hs-plane-enter 900ms cubic-bezier(0.16, 1, 0.3, 1) forwards,
            hs-plane-float 7s ease-in-out infinite;

          animation-delay: 180ms, 1.1s;
        }

        @media (min-width: 640px) {
          .hs-plane {
            --hs-plane-y: -5rem;
            --hs-plane-scale: 0.94;
          }
        }

        @media (min-width: 1024px) {
          .hs-plane {
            --hs-plane-y: -4.5rem;
            --hs-plane-scale: 0.98;
          }
        }

        @media (min-width: 1280px) {
          .hs-plane {
            --hs-plane-y: -4rem;
            --hs-plane-scale: 1;
          }
        }

        @keyframes hs-plane-enter {
          from {
            opacity: 0;
            transform:
              translateX(calc(-50% + var(--hs-plane-x, 0px) - 20px))
              translateY(calc(var(--hs-plane-y, 0px) + 12px))
              scale(calc(var(--hs-plane-scale, 1) * 0.97));
          }

          to {
            opacity: 1;
            transform:
              translateX(calc(-50% + var(--hs-plane-x, 0px)))
              translateY(var(--hs-plane-y, 0px))
              scale(var(--hs-plane-scale, 1));
          }
        }

        @keyframes hs-plane-float {
          0%,
          100% {
            transform:
              translateX(calc(-50% + var(--hs-plane-x, 0px)))
              translateY(var(--hs-plane-y, 0px))
              scale(var(--hs-plane-scale, 1));
          }

          50% {
            transform:
              translateX(calc(-50% + var(--hs-plane-x, 0px)))
              translateY(calc(var(--hs-plane-y, 0px) - 6px))
              scale(var(--hs-plane-scale, 1));
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .hs-plane {
            opacity: 1;
            animation: none;

            transform:
              translateX(calc(-50% + var(--hs-plane-x, 0px)))
              translateY(var(--hs-plane-y, 0px))
              scale(var(--hs-plane-scale, 1));
          }

          .hs-hero-image {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}