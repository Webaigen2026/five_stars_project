import type { CSSProperties } from "react";

import Link from "next/link";

import {
  ArrowRight,
  MapPin,
  Plane,
} from "lucide-react";

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

const originCities: RouteCity[] = [
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

function cssVars(
  vars: Record<string, string>
): CSSProperties {
  return vars as CSSProperties;
}

function createRoutePath(
  origin: RouteCity,
  destination: RouteCity,
  destinationIndex: number
) {
  const horizontalDistance =
    destination.x - origin.x;

  const midpointX =
    origin.x + horizontalDistance * 0.56;

  const arcHeight = Math.min(
    155,
    58 + horizontalDistance * 0.11
  );

  const destinationOffset =
    destinationIndex === 0 ? -10 : 12;

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
      aria-labelledby="route-map-heading"
      className="
        relative
        overflow-hidden
        border-y
        border-slate-200
        bg-[#F7F9FB]
      "
    >
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
        <div
          className="
            grid
            items-center
            gap-10
            lg:grid-cols-[350px_minmax(0,1fr)]
            lg:gap-12
            xl:grid-cols-[380px_minmax(0,1fr)]
            xl:gap-16
          "
        >
          {/* =====================================================
              LEFT CONTENT
          ====================================================== */}

          <div>
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
                Our network
              </p>
            </div>

            <h2
              id="route-map-heading"
              className="
                mt-4
                font-american-sans
                text-[34px]
                font-light
                leading-[1.08]
                tracking-[-0.035em]
                text-slate-950
                sm:text-[40px]
                lg:text-[42px]
              "
            >
              Connecting the U.S.
              <br />
              and Haiti.
            </h2>

            <p
              className="
                mt-4
                max-w-[380px]
                text-[15px]
                leading-7
                text-slate-600
                sm:text-base
              "
            >
              Five Stars connects key U.S. gateways
              with destinations across Haiti, making
              travel between both countries simpler.
            </p>

            {/* Gateway summary */}

            <div className="mt-7 border-y border-slate-200">
              <RouteRow
                code="BOS"
                city="Boston"
              />

              <RouteRow
                code="JFK"
                city="New York"
              />

              <RouteRow
                code="MIA"
                city="Miami"
                last
              />
            </div>

            {/* Haiti destinations */}

            <div className="mt-6">
              <p
                className="
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-[0.17em]
                  text-slate-500
                "
              >
                Haiti destinations
              </p>

              <div
                className="
                  mt-3
                  flex
                  flex-wrap
                  gap-x-5
                  gap-y-2
                "
              >
                <div
                  className="
                    flex
                    items-center
                    gap-2
                    text-sm
                    font-medium
                    text-slate-800
                  "
                >
                  <MapPin
                    aria-hidden="true"
                    className="h-4 w-4 text-[#0078D2]"
                  />

                  Cap-Haïtien
                </div>

                <div
                  className="
                    flex
                    items-center
                    gap-2
                    text-sm
                    font-medium
                    text-slate-800
                  "
                >
                  <MapPin
                    aria-hidden="true"
                    className="h-4 w-4 text-[#0078D2]"
                  />

                  Port-au-Prince
                </div>
              </div>
            </div>

            <Link
              href="/flights"
              className="
                group
                mt-7
                inline-flex
                items-center
                gap-2
                text-sm
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

          {/* =====================================================
              ROUTE MAP
          ====================================================== */}

          <figure className="relative min-w-0">
            <div
              className="
                relative
                overflow-hidden
                border
                border-slate-200
                bg-white
                px-3
                py-4
                sm:px-5
                sm:py-5
                lg:px-6
                lg:py-6
              "
            >
              {/* Map header */}

              <div
                className="
                  flex
                  items-center
                  justify-between
                  gap-4
                  border-b
                  border-slate-200
                  px-1
                  pb-4
                "
              >
                <div>
                  <p
                    className="
                      text-[10px]
                      font-semibold
                      uppercase
                      tracking-[0.17em]
                      text-slate-500
                    "
                  >
                    Route network
                  </p>

                  <p
                    className="
                      mt-1
                      text-sm
                      font-semibold
                      text-slate-900
                    "
                  >
                    United States → Haiti
                  </p>
                </div>

                <div
                  className="
                    hidden
                    items-center
                    gap-2
                    text-xs
                    font-medium
                    text-slate-500
                    sm:flex
                  "
                >
                  <span
                    aria-hidden="true"
                    className="
                      h-2
                      w-2
                      rounded-full
                      bg-[#0078D2]
                    "
                  />

                  Five Stars gateways
                </div>
              </div>

              <svg
                viewBox="0 0 1000 560"
                className="
                  relative
                  mx-auto
                  mt-2
                  block
                  h-auto
                  w-full
                  max-w-[900px]
                "
                role="img"
                aria-labelledby="
                  route-map-title
                  route-map-description
                "
              >
                <title id="route-map-title">
                  Five Stars routes from the United
                  States to Haiti
                </title>

                <desc id="route-map-description">
                  A map showing flight routes from
                  Boston, New York and Miami to
                  Cap-Haïtien and Port-au-Prince in
                  Haiti.
                </desc>

                <defs>
                  <filter
                    id="map-soft-shadow"
                    x="-20%"
                    y="-20%"
                    width="140%"
                    height="140%"
                  >
                    <feDropShadow
                      dx="0"
                      dy="3"
                      stdDeviation="5"
                      floodColor="#0F172A"
                      floodOpacity="0.08"
                    />
                  </filter>

                  <filter
                    id="destination-glow"
                    x="-150%"
                    y="-150%"
                    width="400%"
                    height="400%"
                  >
                    <feGaussianBlur
                      stdDeviation="3"
                      result="blur"
                    />

                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>

                  <linearGradient
                    id="route-line-gradient"
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="0"
                  >
                    <stop
                      offset="0%"
                      stopColor="#0078D2"
                      stopOpacity="0.30"
                    />

                    <stop
                      offset="55%"
                      stopColor="#0078D2"
                      stopOpacity="0.65"
                    />

                    <stop
                      offset="100%"
                      stopColor="#0078D2"
                      stopOpacity="0.95"
                    />
                  </linearGradient>
                </defs>

                {/* Map images */}

                <g
                  aria-hidden="true"
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

                {/* Route lines */}

                <g aria-hidden="true">
                  {originCities.flatMap(
                    (origin, originIndex) =>
                      destinationCities.map(
                        (
                          destination,
                          destinationIndex
                        ) => {
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
                              className="
                                route-path
                                fill-none
                              "
                              stroke="url(#route-line-gradient)"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              vectorEffect="non-scaling-stroke"
                              style={cssVars({
                                "--route-delay": `${routeDelay}s`,
                              })}
                            />
                          );
                        }
                      )
                  )}
                </g>

                {/* U.S. gateways */}

                <g aria-hidden="true">
                  {originCities.map((city) => (
                    <g key={city.code}>
                      <circle
                        cx={city.x}
                        cy={city.y}
                        r="10"
                        fill="#0078D2"
                        opacity="0.10"
                      />

                      <circle
                        cx={city.x}
                        cy={city.y}
                        r="5"
                        fill="#0078D2"
                      />

                      <circle
                        cx={city.x}
                        cy={city.y}
                        r="2"
                        fill="white"
                      />

                      <text
                        x={city.labelX ?? city.x}
                        y={
                          city.labelY ??
                          city.y - 13
                        }
                        textAnchor={
                          city.labelAnchor ??
                          "middle"
                        }
                        className="
                          fill-slate-800
                          text-[13px]
                          font-semibold
                        "
                      >
                        {city.label}
                      </text>
                    </g>
                  ))}
                </g>

                {/* Haiti destinations */}

                <g aria-hidden="true">
                  {destinationCities.map(
                    (city, index) => (
                      <g key={city.code}>
                        <circle
                          cx={city.x}
                          cy={city.y}
                          r="16"
                          className="destination-pulse"
                          fill="#0078D2"
                          opacity="0.12"
                          style={cssVars({
                            "--pulse-delay": `${
                              index * 0.35
                            }s`,
                          })}
                        />

                        <circle
                          cx={city.x}
                          cy={city.y}
                          r="9"
                          fill="white"
                          stroke="#0078D2"
                          strokeWidth="2"
                          vectorEffect="non-scaling-stroke"
                        />

                        <circle
                          cx={city.x}
                          cy={city.y}
                          r="5"
                          fill="#0078D2"
                          filter="url(#destination-glow)"
                        />

                        <text
                          x={city.labelX}
                          y={city.labelY}
                          textAnchor={
                            city.labelAnchor
                          }
                          className="
                            fill-slate-900
                            text-[13px]
                            font-bold
                          "
                        >
                          {city.label}
                        </text>
                      </g>
                    )
                  )}
                </g>

                <text
                  x="822"
                  y="405"
                  aria-hidden="true"
                  className="
                    fill-slate-500
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-[0.2em]
                  "
                >
                  Haiti
                </text>
              </svg>
            </div>

            <figcaption className="sr-only">
              Available Five Stars routes between
              Boston, New York and Miami in the United
              States and Cap-Haïtien and Port-au-Prince
              in Haiti.
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
            route-draw
            1.6s
            cubic-bezier(0.16, 1, 0.3, 1)
            forwards;

          animation-delay:
            var(--route-delay, 0.2s);
        }

        .destination-pulse {
          transform-box: fill-box;
          transform-origin: center;

          animation:
            destination-pulse
            3s
            ease-in-out
            infinite;

          animation-delay:
            var(--pulse-delay, 0s);
        }

        @keyframes route-draw {
          0% {
            stroke-dashoffset: 1;
            opacity: 0;
          }

          20% {
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
            opacity: 0.08;
            transform: scale(0.85);
          }

          50% {
            opacity: 0.22;
            transform: scale(1.15);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .route-path {
            animation: none;
            stroke-dashoffset: 0;
            opacity: 1;
          }

          .destination-pulse {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}

/* ===============================================================
   ROUTE ROW
================================================================ */

function RouteRow({
  code,
  city,
  last = false,
}: {
  code: string;
  city: string;
  last?: boolean;
}) {
  return (
    <div
      className={`
        flex
        items-center
        justify-between
        gap-4
        py-3.5
        ${last ? "" : "border-b border-slate-200"}
      `}
    >
      <div className="flex items-center gap-3">
        <div
          className="
            flex
            h-7
            w-10
            items-center
            justify-center
            bg-[#0078D2]/[0.07]
            text-[10px]
            font-bold
            tracking-[0.08em]
            text-[#0078D2]
          "
        >
          {code}
        </div>

        <span
          className="
            text-sm
            font-semibold
            text-slate-800
          "
        >
          {city}
        </span>
      </div>

      <Plane
        aria-hidden="true"
        className="
          h-4
          w-4
          rotate-45
          text-slate-400
        "
      />
    </div>
  );
}