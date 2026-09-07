"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

const IMAGE_SIZES = `
  (min-width: 1536px) min(
    1800px - 28vw - 5rem,
    calc(100vw - 28vw - 5rem)
  ),
  (min-width: 1024px) calc(100vw - 5rem),
  130vw
`;

const FLY_OFF_DISTANCE = 500;
const SMOOTHING = 0.15;
const SETTLE_THRESHOLD = 0.0008;

export default function HeroAirplaneCutout() {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;

    if (!wrapper) return;

    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    if (reducedMotionQuery.matches) {
      wrapper.style.transform = "none";
      wrapper.style.opacity = "1";
      wrapper.style.visibility = "visible";
      return;
    }

    let heroTop = 0;
    let targetProgress = 0;
    let renderedProgress = 0;
    let animationFrameId: number | null = null;

    const measureHeroTop = () => {
      const rect = wrapper.getBoundingClientRect();
      heroTop = rect.top + window.scrollY;
    };

    const applyProgress = (progress: number) => {
      const easedProgress = progress * (2 - progress);

      const translatePixels = easedProgress * 140;
      const translatePercent = easedProgress * 60;
      const rotation = easedProgress * 8;
      const opacity = 1 - easedProgress;

      wrapper.style.transform =
        `translateX(calc(${translatePixels}px + ${translatePercent}%)) ` +
        `rotate(${rotation}deg)`;

      wrapper.style.opacity = String(opacity);
      wrapper.style.visibility =
        opacity <= 0.01 ? "hidden" : "visible";
    };

    const tick = () => {
      const delta = targetProgress - renderedProgress;

      if (Math.abs(delta) < SETTLE_THRESHOLD) {
        renderedProgress = targetProgress;
        applyProgress(renderedProgress);
        animationFrameId = null;
        return;
      }

      renderedProgress += delta * SMOOTHING;
      applyProgress(renderedProgress);

      animationFrameId = window.requestAnimationFrame(tick);
    };

    const requestTick = () => {
      if (animationFrameId === null) {
        animationFrameId = window.requestAnimationFrame(tick);
      }
    };

    const updateTarget = () => {
      const scrolledPastHero = Math.max(0, window.scrollY - heroTop);

      targetProgress = Math.min(
        1,
        scrolledPastHero / FLY_OFF_DISTANCE,
      );

      requestTick();
    };

    const handleResize = () => {
      measureHeroTop();
      updateTarget();
    };

    measureHeroTop();
    updateTarget();
    applyProgress(renderedProgress);

    window.addEventListener("scroll", updateTarget, {
      passive: true,
    });

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("scroll", updateTarget);
      window.removeEventListener("resize", handleResize);

      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      aria-hidden="true"
      className="
        pointer-events-none
        absolute inset-0 z-40
        overflow-x-clip
        transform-gpu
      "
      style={{
        opacity: 1,
        visibility: "visible",
        willChange: "transform, opacity",
      }}
    >
      {/*
        Wider airplane canvas (visual only).
        Oversizing is clipped by this decorative viewport so document
        width stays stable on mobile.
      */}
      <div
        className="
          hs-plane
          pointer-events-none
          absolute inset-y-0
          -left-[12%]
          w-[130%]
          max-w-none

          sm:-left-[14%]
          sm:w-[136%]

          lg:-left-[16%]
          lg:w-[142%]

          xl:-left-[18%]
          xl:w-[148%]
        "
      >
        {/* Light-mode airplane (Five Stars has no theme provider) */}
        <Image
          src="/airplane/airplane_day_wt_bg.png"
          alt=""
          fill
          priority
          sizes={IMAGE_SIZES}
          className="
            object-contain
            object-center
           
            sm:object-contain
            sm:object-center
          "
        />
      </div>
    </div>
  );
}
