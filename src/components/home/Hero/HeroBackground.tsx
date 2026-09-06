"use client";

import Image from "next/image";

const IMAGE_SIZES = `
(min-width: 1536px) min(1800px - 28vw - 5rem, calc(100vw - 28vw - 5rem)),
(min-width: 1024px) calc(100vw - 5rem),
100vw
`;

export default function HeroBackground() {
  return (
    <div className="hs-hero-media absolute inset-0 overflow-hidden">
      {/* Light-mode hero background */}
      <Image
        src="/airplane/hero_day_bg.png"
        alt="A Five Stars aircraft cruising above the clouds"
        fill
        priority
        sizes={IMAGE_SIZES}
        className="hs-hero-image block object-cover object-[center_32%] opacity-[0.92] sm:object-[center_28%]"
      />

      {/* Strong full fade into pure white on the right */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-[700px] "
        style={{
          background: `
            linear-gradient(
              to right,
              rgba(255, 255, 255, 0) 0%,
              rgba(255, 255, 255, 0) 48%,
              rgba(255, 255, 255, 0.08) 54%,
              rgba(255, 255, 255, 0.20) 60%,
              rgba(255, 255, 255, 0.38) 66%,
              rgba(255, 255, 255, 0.58) 72%,
              rgba(255, 255, 255, 0.76) 78%,
              rgba(255, 255, 255, 0.90) 83%,
              rgba(255, 255, 255, 0.97) 87%,
              rgba(255, 255, 255, 1) 90%,
              rgba(255, 255, 255, 1) 100%
            )
          `,
        }}
      />

      {/* Soft atmospheric veil */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-white/5"
      />

      {/* Animated bright cloud glow */}
      <div
        aria-hidden="true"
        className="
          cloud-glow
          pointer-events-none
          absolute
          bottom-[-4%]
          left-[-25%]
          h-[38%]
          w-[150%]
          bg-[#ffffff]/90
          blur-3xl
        "
      />
    </div>
  );
}