import type { CSSProperties } from "react";

import Image from "next/image";

interface RouteCity {
  code: string;
  label: string;
  x: number;
  y: number;
  labelX?: number;
  labelY?: number;
  labelAnchor?: "start" | "middle" | "end";
  emphasis?: boolean;
}

// City coordinates are geographically derived: each city's real
// latitude/longitude was run through a projection fitted to this specific
// map image (using its actual coastline extremes as control points), then
// converted into this SVG's coordinate space. Coastal cities were snapped
// to the nearest point on the actual landmass so they sit on the coast
// rather than just offshore.
const originCities: RouteCity[] = [
  // {
  //   code: "SEA",
  //   label: "Seattle",
  //   x: 191,
  //   y: 161,
  //   labelX: 191,
  //   labelY: 143,
  // },
  // {
  //   code: "LAX",
  //   label: "Los Angeles",
  //   x: 246,
  //   y: 338,
  //   labelX: 232,
  //   labelY: 320,
  //   labelAnchor: "end",
  //   emphasis: true,
  // },
  // {
  //   code: "SAN",
  //   label: "San Diego",
  //   x: 264,
  //   y: 347,
  //   labelX: 252,
  //   labelY: 369,
  //   labelAnchor: "end",
  // },
  // {
  //   code: "LAS",
  //   label: "Las Vegas",
  //   x: 259,
  //   y: 319,
  //   labelX: 259,
  //   labelY: 301,
  // },
  // {
  //   code: "DEN",
  //   label: "Denver",
  //   x: 359,
  //   y: 251,
  //   labelX: 359,
  //   labelY: 232,
  // },
  // {
  //   code: "DFW",
  //   label: "Dallas",
  //   x: 438,
  //   y: 342,
  //   labelX: 438,
  //   labelY: 364,
  // },
  // {
  //   code: "ORD",
  //   label: "Chicago",
  //   x: 530,
  //   y: 193,
  //   labelX: 530,
  //   labelY: 174,
  // },
  // {
  //   code: "ATL",
  //   label: "Atlanta",
  //   x: 560,
  //   y: 308,
  //   labelX: 560,
  //   labelY: 290,
  // },
  // {
  //   code: "IAD",
  //   label: "Washington, D.C.",
  //   x: 633,
  //   y: 220,
  //   labelX: 633,
  //   labelY: 201,
  // },

  {
    code: "BOS",
    label: "Boston",
    x: 692,
    y: 170,
    labelX: 692,
    labelY: 138,
    emphasis: true,
  },

  {
    code: "JFK",
    label: "New York",
    x: 663,
    y: 169,
    labelX: 663,
    labelY: 167,
    emphasis: true,
  },

  {
    code: "MIA",
    label: "Miami",
    x: 630,
    y: 350,
    labelX: 622,
    labelY: 376,
    emphasis: true,
  },
];

const destinationCities: RouteCity[] = [
  {
    code: "CAP",
    label: "Cap-Haïtien",
    x: 898,
    y: 355,
    labelX: 898,
    labelY: 326,
    labelAnchor: "middle",
    emphasis: true,
  },

  {
    code: "PAP",
    label: "Port-au-Prince",
    x: 930,
    y: 398,
    labelX: 930,
    labelY: 430,
    labelAnchor: "middle",
    emphasis: true,
  },
];

const USA_MAP = {
  x: -50,
  y: -20,
  width: 1000,
  height: 560,
};

const HAITI_MAP = {
  x: 780,
  y: 260,
  width: 250,
  height: 250,
};

// Small typed helper so custom-property style objects (--route-delay,
// --pulse-delay) don't each need their own "as CSSProperties" cast.
function cssVars(vars: Record<string, string>): CSSProperties {
  return vars as CSSProperties;
}

function createRoutePath(
  origin: RouteCity,
  destination: RouteCity,
  destinationIndex: number
) {
  const horizontalDistance = destination.x - origin.x;
  const midpointX = origin.x + horizontalDistance * 0.56;

  /**
   * Longer routes receive a higher arc. The second Haiti destination gets
   * a slightly different control point so the two route lines do not sit
   * directly on top of one another.
   */
  const arcHeight = Math.min(155, 58 + horizontalDistance * 0.11);

  const destinationOffset = destinationIndex === 0 ? -10 : 12;

  const midpointY =
    Math.min(origin.y, destination.y) -
    arcHeight +
    destinationOffset;

  return `M ${origin.x} ${origin.y}
          Q ${midpointX} ${midpointY}
            ${destination.x} ${destination.y}`;
}

export default function RouteMap() {
  return (
    <section
      className="relative overflow-hidden bg-background "
      aria-labelledby="route-map-heading"
    >
      {/* Decorative background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b from-accent/5 to-transparent"
      />

      <div className="mx-auto w-full max-w-full px-4 sm:px-6 lg:px-8">
        {/* Section heading */}
        {/*
        <header className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-accent sm:text-sm">
            Our destinations
          </p>

          <h2
            id="route-map-heading"
            className="mt-3 text-3xl font-bold tracking-tight text-primary sm:text-4xl lg:text-5xl"
          >
            Where we fly
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-secondary sm:text-base">
            Request a flight from cities across the United States to
            Cap-Haïtien or Port-au-Prince.
          </p>
        </header>
        */}

        {/* Illustration and map */}
        <div className="mt-10 grid items-center gap-8 sm:mt-12 lg:grid-cols-[minmax(240px,0.7fr)_minmax(0,1.8fr)] lg:gap-10 xl:gap-14">
          {/* Traveler illustration */}
          <div className="flex justify-center lg:justify-start">
            <div className="relative aspect-[4/5] w-full max-w-xs sm:max-w-sm lg:max-w-none">
              <Image
                src="/airplane/avatarblack.png"
                alt="Travelers preparing for a Caribbean flight"
                fill
                priority
                sizes="(max-width: 640px) 80vw, (max-width: 1024px) 45vw, 28vw"
                className="object-contain object-center drop-shadow-[0_20px_30px_rgba(0,0,0,0.12)]"
              />
            </div>
          </div>

          {/* Route map */}
          <figure className="relative min-w-0">
            <div className="relative overflow-hidden">
              <svg
                viewBox="0 0 1000 560"
                className="relative block h-auto w-full"
                role="img"
                aria-labelledby="route-map-title route-map-description"
              >
                <title id="route-map-title">
                  Five Stars routes from the United States to Haiti
                </title>

                <desc id="route-map-description">
                  A map showing flight routes from cities in the United States
                  to Cap-Haïtien and Port-au-Prince in Haiti.
                </desc>

                <defs>
                  {/* Map shadow */}
                  <filter
                    id="map-soft-shadow"
                    x="-20%"
                    y="-20%"
                    width="140%"
                    height="140%"
                  >
                    <feDropShadow
                      dx="0"
                      dy="6"
                      stdDeviation="8"
                      floodColor="currentColor"
                      floodOpacity="0.16"
                    />
                  </filter>

                  {/* Destination marker glow */}
                  <filter
                    id="destination-glow"
                    x="-150%"
                    y="-150%"
                    width="400%"
                    height="400%"
                  >
                    <feGaussianBlur
                      stdDeviation="3.5"
                      result="blur"
                    />

                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>

                  {/* Refined route glow */}
                  <filter
                    id="route-soft-glow"
                    x="-40%"
                    y="-40%"
                    width="180%"
                    height="180%"
                  >
                    <feGaussianBlur
                      stdDeviation="1.5"
                      result="routeBlur"
                    />

                    <feMerge>
                      <feMergeNode in="routeBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>

                  {/* Five Stars route gradient */}
                  <linearGradient
                    id="route-line-gradient"
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="0"
                  >
                    <stop
                      offset="0%"
                      stopColor="#0284C7"
                      stopOpacity="0.34"
                    />

                    <stop
                      offset="42%"
                      stopColor="#0EA5E9"
                      stopOpacity="0.62"
                    />

                    <stop
                      offset="76%"
                      stopColor="#38BDF8"
                      stopOpacity="0.82"
                    />

                    <stop
                      offset="100%"
                      stopColor="#06B6D4"
                      stopOpacity="0.96"
                    />
                  </linearGradient>
                </defs>

                {/* Country maps */}
                <g
                  aria-hidden="true"
                  className="text-[color:var(--shadow-color)]"
                  filter="url(#map-soft-shadow)"
                >
                  <image
                    href="/maps/map2.png"
                    x={USA_MAP.x}
                    y={USA_MAP.y}
                    width={USA_MAP.width}
                    height={USA_MAP.height}
                    preserveAspectRatio="xMidYMid meet"
                  />

                  <image
                    href="/maps/map4.png"
                    x={HAITI_MAP.x}
                    y={HAITI_MAP.y}
                    width={HAITI_MAP.width}
                    height={HAITI_MAP.height}
                    preserveAspectRatio="xMidYMid meet"
                  />
                </g>

                {/* Flight routes */}
                <g aria-hidden="true">
                  {originCities.flatMap((origin, originIndex) =>
                    destinationCities.map(
                      (destination, destinationIndex) => {
                        const routeDelay =
                          0.12 +
                          originIndex * 0.045 +
                          destinationIndex * 0.025;

                        return (
                          <path
                            key={`${origin.code}-${destination.code}`}
                            d={createRoutePath(
                              origin,
                              destination,
                              destinationIndex
                            )}
                            pathLength="1"
                            className="route-path fill-none"
                            stroke="url(#route-line-gradient)"
                            strokeWidth={
                              origin.emphasis ? 2.15 : 1.45
                            }
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                            filter="url(#route-soft-glow)"
                            style={cssVars({
                              "--route-delay": `${routeDelay}s`,
                            })}
                          />
                        );
                      }
                    )
                  )}
                </g>

                {/* Origin city markers */}
                <g aria-hidden="true">
                  {originCities.map((city) => (
                    <g key={city.code}>
                      {city.emphasis && (
                        <circle
                          cx={city.x}
                          cy={city.y}
                          r="11"
                          className="origin-highlight fill-sky-400/15"
                        />
                      )}

                      <circle
                        cx={city.x}
                        cy={city.y}
                        r={city.emphasis ? 5 : 3.75}
                        className={
                          city.emphasis
                            ? "fill-sky-500"
                            : "fill-sky-400/80"
                        }
                      />

                      <text
                        x={city.labelX ?? city.x}
                        y={city.labelY ?? city.y - 13}
                        textAnchor={
                          city.labelAnchor ?? "middle"
                        }
                        className={
                          city.emphasis
                            ? "fill-primary text-[13px] font-bold"
                            : "fill-secondary text-[11px] font-semibold"
                        }
                      >
                        {city.label}
                      </text>
                    </g>
                  ))}
                </g>

                {/* Haiti destination markers */}
                <g aria-hidden="true">
                  {destinationCities.map((city, index) => (
                    <g key={city.code}>
                      <circle
                        cx={city.x}
                        cy={city.y}
                        r="16"
                        className="destination-pulse fill-cyan-400/15"
                        style={cssVars({
                          "--pulse-delay": `${index * 0.35}s`,
                        })}
                      />

                      <circle
                        cx={city.x}
                        cy={city.y}
                        r="10"
                        className="fill-none stroke-cyan-400/60"
                        strokeWidth="1.6"
                        vectorEffect="non-scaling-stroke"
                      />

                      <circle
                        cx={city.x}
                        cy={city.y}
                        r="6"
                        className="fill-cyan-500"
                        filter="url(#destination-glow)"
                      />

                      <text
                        x={city.labelX}
                        y={city.labelY}
                        textAnchor={city.labelAnchor}
                        className="fill-primary text-[13px] font-bold"
                      >
                        {city.label}
                      </text>
                    </g>
                  ))}
                </g>

                {/* Haiti inset label */}
                <text
                  x="822"
                  y="405"
                  aria-hidden="true"
                  className="fill-secondary text-[10px] font-bold uppercase tracking-[0.2em]"
                >
                  Haiti
                </text>
              </svg>
            </div>

            <figcaption className="sr-only">
              Available Five Stars routes between cities in the
              United States and destinations in Haiti.
            </figcaption>
          </figure>
        </div>
      </div>

      <style>{`
        .route-path {
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          opacity: 0;

          animation:
            route-draw 1.9s cubic-bezier(0.16, 1, 0.3, 1)
            forwards;

          animation-delay: var(--route-delay, 0.2s);
        }

        .destination-pulse,
        .origin-highlight {
          transform-box: fill-box;
          transform-origin: center;
        }

        .destination-pulse {
          animation:
            destination-pulse 2.8s ease-in-out infinite;

          animation-delay: var(--pulse-delay, 0s);
        }

        .origin-highlight {
          animation:
            origin-highlight 3.2s ease-in-out infinite;
        }

        @keyframes route-draw {
          0% {
            stroke-dashoffset: 1;
            opacity: 0;
          }

          18% {
            opacity: 1;
          }

          100% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
        }

        @keyframes destination-pulse {
          0%,
          100% {
            opacity: 0.22;
            transform: scale(0.82);
          }

          50% {
            opacity: 0.68;
            transform: scale(1.18);
          }
        }

        @keyframes origin-highlight {
          0%,
          100% {
            opacity: 0.18;
            transform: scale(0.9);
          }

          50% {
            opacity: 0.5;
            transform: scale(1.08);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .route-path {
            animation: none;
            stroke-dashoffset: 0;
            opacity: 1;
          }

          .destination-pulse,
          .origin-highlight {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}