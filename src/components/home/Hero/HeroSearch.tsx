
import HeroAirplaneCutout from "./HeroAirplaneCutout";
import HeroBackground from "./HeroBackground";
import TravelImageWall from "./TravelImageWall";
import FlightSearchForm from "../../flights/FlightSearchForm";

export default function HeroSearch() {
  return (
    <section className="relative w-full overflow-x-clip bg-background">
      <div className="mx-auto w-full max-w-[1800px] ">
        {/*
          Mobile/tablet: only the main hero is shown.
          lg+: hero and travel image wall display in 2 columns.
          2xl+: the image-wall column becomes wider.
        */}
        <div
          className="
            grid min-w-0 grid-cols-1
            gap-[clamp(1.25rem,2.5vw,2.75rem)]
         
            dark:bg-surface

            sm:rounded-3xl
            sm:p-10

            lg:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]
            lg:items-stretch
            lg:gap-8

            2xl:grid-cols-[minmax(0,1fr)_minmax(22rem,28vw)]
            2xl:gap-10
          "
        >
          {/* ============================================================= */}
          {/* LEFT COLUMN — MAIN HERO                                       */}
          {/* ============================================================= */}
          <div className="min-w-0">
            <div className="relative">
              {/* Hero card */}
              <div className="hs-hero-card relative isolate overflow-hidden ">
                <HeroBackground />

                {/* Subtle bottom wash for form readability */}
                <div
                  aria-hidden="true"
                  className="
                    pointer-events-none
                    absolute inset-0
                    bg-gradient-to-t
                    from-slate-950/20
                    via-transparent
                    to-transparent
                    dark:from-[#140227]/35
                  "
                />

                {/* Hero content */}
                <div
                  className="
                    relative z-20
                    flex min-h-[13rem] flex-col justify-end
                    px-5 pb-4 pt-14

                    sm:min-h-[min(28svh,16rem)]
                    sm:pb-[clamp(1rem,1.5vw,1.25rem)]
                    sm:pt-[clamp(1rem,3vw,2rem)]

                    lg:min-h-[15rem]
                    xl:min-h-[13rem]
                    2xl:min-h-[16rem]
                  "
                >
           
           
                  {/* <div className="flex w-full max-w-7xl  flex-col gap-6 sm:gap-8">
                  <FlightSearchForm />
                  </div> */}

                
             
             


                </div>

             
              </div>


              {/* ========================================================= */}
              {/* FOREGROUND AIRPLANE                                       */}
              {/* ========================================================= */}
              <div
                aria-hidden="true"
                className="
                  pointer-events-none
                  absolute inset-0
                  z-40
                  overflow-visible

                  -translate-y-[3rem]
                  mr-20

                  md:mr-0
                  md:translate-y-0
                "
              >
                <HeroAirplaneCutout />
              </div>

              

            </div>
            <div className="flex w-full max-w-7xl  flex-col gap-6 sm:gap-8">
                  <FlightSearchForm />
                  </div>
          </div>

          {/* ============================================================= */}
          {/* RIGHT COLUMN — TRAVEL IMAGE WALL                              */}
          {/* ============================================================= */}
          <aside className="hidden min-w-0 self-stretch lg:block">
            <div
              className="
                h-full
                w-full
                overflow-hidden

                rounded-[clamp(1.25rem,2.2vw,1.75rem)]
                px-2
                py-2

                lg:max-w-[23rem]
                2xl:max-w-none
              "
            >
              <TravelImageWall />
            </div>
          </aside>
        </div>
      </div>

      <style>{`
        /* ------------------------------------------------------------------ */
        /* Hero card                                                          */
        /* ------------------------------------------------------------------ */

        .hs-hero-card {
          border: 0;
          background: #edf1f4;
         

        .dark .hs-hero-card {
          background: var(--surface);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.05),
            0 18px 45px -20px rgba(229, 46, 122, 0.18);
        }

        /* ------------------------------------------------------------------ */
        /* Background image                                                   */
        /* ------------------------------------------------------------------ */

        .hs-hero-media {
          -webkit-mask-image: radial-gradient(
            ellipse 98% 94% at 50% 44%,
            #000 65%,
            rgba(0, 0, 0, 0.96) 78%,
            rgba(0, 0, 0, 0.72) 90%,
            transparent 100%
          );

          mask-image: radial-gradient(
            ellipse 98% 94% at 50% 44%,
            #000 65%,
            rgba(0, 0, 0, 0.96) 78%,
            rgba(0, 0, 0, 0.72) 90%,
            transparent 100%
          );

          -webkit-mask-repeat: no-repeat;
          mask-repeat: no-repeat;

          -webkit-mask-size: 100% 100%;
          mask-size: 100% 100%;
        }

        @keyframes hs-ken-burns {
          from {
            transform: scale(1.07);
          }

          to {
            transform: scale(1);
          }
        }

        .hs-hero-image {
          animation: hs-ken-burns 14s ease-out forwards;
        }

        /* ------------------------------------------------------------------ */
        /* Centered foreground airplane                                       */
        /* ------------------------------------------------------------------ */

        .hs-plane {
          /*
            The element starts at the horizontal center of the hero.
            translateX(-50%) centers its own width around that point.
          */
          left: 50%;
          width: 100%;
          transform-origin: center center;

          --hs-plane-x: 0px;
          --hs-plane-y: -7.5rem;
          --hs-plane-scale: 0.92;

          opacity: 0;

          animation:
            hs-plane-enter 1s cubic-bezier(0.16, 1, 0.3, 1) forwards,
            hs-plane-float 7s ease-in-out infinite;

          animation-delay: 0.3s, 1.3s;
        }

        @media (min-width: 640px) {
          .hs-plane {
            --hs-plane-y: -6rem;
            --hs-plane-scale: 0.96;
          }
        }

        @media (min-width: 1024px) {
          .hs-plane {
            --hs-plane-y: -5rem;
            --hs-plane-scale: 1;
          }
        }

        @media (min-width: 1280px) {
          .hs-plane {
            --hs-plane-y: -4.5rem;
            --hs-plane-scale: 1;
          }
        }

        @keyframes hs-plane-enter {
          from {
            opacity: 0;

            transform:
              translateX(
                calc(-50% + var(--hs-plane-x, 0px) - 1.5rem)
              )
              translateY(calc(var(--hs-plane-y, 0px) + 16px))
              scale(calc(var(--hs-plane-scale, 1) * 0.96));
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
              translateY(calc(var(--hs-plane-y, 0px) - 10px))
              scale(var(--hs-plane-scale, 1));
          }
        }

        /* ------------------------------------------------------------------ */
        /* Reduced motion                                                     */
        /* ------------------------------------------------------------------ */

        @media (prefers-reduced-motion: reduce) {
          .hs-hero-image {
            animation: none;
          }

          .hs-plane {
            opacity: 1;
            animation: none;

            transform:
              translateX(calc(-50% + var(--hs-plane-x, 0px)))
              translateY(var(--hs-plane-y, 0px))
              scale(var(--hs-plane-scale, 1));
          }
        }
      `}</style>
    </section>
  );
}