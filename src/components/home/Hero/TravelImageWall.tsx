"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

type WallImage = {
  src: string;
  alt: string;
};

type ActiveTransition = {
  slot: number;
  nextImageIndex: number;
};

const IMAGE_POOL: WallImage[] = [
  {
    src: "/airplane/greatnessdon-ai-generated-8635794_1920.jpg",
    alt: "Airplane wing above the clouds",
  },
  {
    src: "/airplane/kim_r_hunter-airplane-5645875_1920.jpg",
    alt: "Passenger inside an airplane cabin",
  },
  {
    src: "/airplane/ornaw-flight-4516478_1920.jpg",
    alt: "Tropical travel destination",
  },
  {
    src: "/airplane/istockphoto-1276398647-612x612.jpg",
    alt: "Airplane landing at sunset",
  },
  {
    src: "/airplane/airplane.jpg",
    alt: "Airplane flying through a blue night sky",
  },
  {
    src: "/airplane/image.png",
    alt: "Airplane cruising above bright clouds",
  },
  {
    src: "/airplane/boston.webp",
    alt: "Aerial travel view of Boston",
  },
];

const INITIAL_ASSIGNMENTS = [0, 1, 2, 3, 4, 5];

const IMAGE_HOLD_DURATION = 5000;
const CROSSFADE_DURATION = 1800;

const WINDOW_RADIUS =
  "50% 50% 42% 42% / 64% 64% 28% 28%";

const GLASS_RADIUS =
  "50% 50% 40% 40% / 62% 62% 26% 26%";

export default function TravelImageWall() {
  const [assignments, setAssignments] =
    useState<number[]>(INITIAL_ASSIGNMENTS);

  const [transition, setTransition] =
    useState<ActiveTransition | null>(null);

  const nextSlotRef = useRef(0);

  useEffect(() => {
    if (transition) {
      return;
    }

    const timerId = window.setTimeout(() => {
      const visibleImages = new Set(assignments);

      const spareImageIndex = IMAGE_POOL.findIndex(
        (_, imageIndex) => !visibleImages.has(imageIndex)
      );

      if (spareImageIndex === -1) {
        return;
      }

      const slot =
        nextSlotRef.current % INITIAL_ASSIGNMENTS.length;

      nextSlotRef.current =
        (nextSlotRef.current + 1) %
        INITIAL_ASSIGNMENTS.length;

      setTransition({
        slot,
        nextImageIndex: spareImageIndex,
      });
    }, IMAGE_HOLD_DURATION);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [assignments, transition]);

  const completeTransition = useCallback(() => {
    setTransition((activeTransition) => {
      if (!activeTransition) {
        return null;
      }

      setAssignments((currentAssignments) => {
        const nextAssignments = [...currentAssignments];

        nextAssignments[activeTransition.slot] =
          activeTransition.nextImageIndex;

        return nextAssignments;
      });

      return null;
    });
  }, []);

  return (
    <div className="relative mx-auto flex h-full w-full max-w-full items-center overflow-visible px-1 sm:px-2 lg:px-0">
      <div className="grid w-full min-w-0 grid-cols-2 items-start gap-3 min-[400px]:gap-4 sm:gap-5 lg:gap-4 xl:gap-5">
        <ImageColumn
          slotIndexes={[0, 1, 2]}
          assignments={assignments}
          transition={transition}
          onTransitionComplete={completeTransition}
          priority
        />

        <ImageColumn
          slotIndexes={[3, 4, 5]}
          assignments={assignments}
          transition={transition}
          onTransitionComplete={completeTransition}
          className="-mt-[clamp(2.5rem,4vw,1.5rem)]"
        />
      </div>
    </div>
  );
}

function ImageColumn({
  slotIndexes,
  assignments,
  transition,
  onTransitionComplete,
  priority = false,
  className = "",
}: {
  slotIndexes: number[];
  assignments: number[];
  transition: ActiveTransition | null;
  onTransitionComplete: () => void;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div
      className={[
        "flex min-w-0 flex-col gap-3",
        "min-[400px]:gap-4 sm:gap-5 lg:gap-6",
        className,
      ].join(" ")}
    >
      {slotIndexes.map((slot, rowIndex) => {
        const currentImage =
          IMAGE_POOL[assignments[slot]];

        const isChanging = transition?.slot === slot;

        const nextImage =
          isChanging && transition
            ? IMAGE_POOL[transition.nextImageIndex]
            : undefined;

        return (
          <TravelCircle
            key={slot}
            currentImage={currentImage}
            nextImage={nextImage}
            priority={priority && rowIndex === 0}
            onTransitionComplete={
              isChanging ? onTransitionComplete : undefined
            }
          />
        );
      })}
    </div>
  );
}

function TravelCircle({
  currentImage,
  nextImage,
  priority = false,
  onTransitionComplete,
}: {
  currentImage: WallImage;
  nextImage?: WallImage;
  priority?: boolean;
  onTransitionComplete?: () => void;
}) {
  const [showIncomingImage, setShowIncomingImage] =
    useState(false);

  useEffect(() => {
    if (!nextImage) {
      setShowIncomingImage(false);
      return;
    }

    let frameOne: number | undefined;
    let frameTwo: number | undefined;
    let completionTimer: number | undefined;

    frameOne = window.requestAnimationFrame(() => {
      frameTwo = window.requestAnimationFrame(() => {
        setShowIncomingImage(true);
      });
    });

    completionTimer = window.setTimeout(() => {
      onTransitionComplete?.();
    }, CROSSFADE_DURATION + 120);

    return () => {
      if (frameOne !== undefined) {
        window.cancelAnimationFrame(frameOne);
      }

      if (frameTwo !== undefined) {
        window.cancelAnimationFrame(frameTwo);
      }

      if (completionTimer !== undefined) {
        window.clearTimeout(completionTimer);
      }
    };
  }, [nextImage, onTransitionComplete]);

  return (
    <div
      className="
        group
        relative
        mx-auto
        aspect-square
        w-full
        max-w-[clamp(7rem,34vw,12rem)]
        bg-white
        p-[clamp(0.4rem,1.4vw,0.65rem)]
        shadow-[-3px_-3px_7px_var(--neu-highlight),3px_3px_7px_var(--neu-shadow)]
        dark:bg-surface
      "
      style={{
        borderRadius: WINDOW_RADIUS,
      }}
    >
      <div
        className="relative h-full w-full overflow-hidden bg-slate-200"
        style={{
          borderRadius: GLASS_RADIUS,
          boxShadow:
            "inset 0 0 0 1px rgba(15,23,42,0.15), inset 0 2px 4px rgba(15,23,42,0.25)",
        }}
      >
        {/* Current image */}
        <Image
          src={currentImage.src}
          alt={currentImage.alt}
          fill
          priority={priority}
          sizes="
            (max-width: 399px) calc(50vw - 22px),
            (max-width: 639px) calc(50vw - 32px),
            (max-width: 1023px) 224px,
            (max-width: 1535px) 208px,
            224px
          "
          className="
            absolute
            inset-0
            object-cover
            transition-transform
            duration-[1800ms]
            ease-out
            motion-safe:group-hover:scale-[1.025]
          "
        />

        {/* Incoming image */}
        {nextImage ? (
          <Image
            src={nextImage.src}
            alt={nextImage.alt}
            fill
            sizes="
              (max-width: 399px) calc(50vw - 22px),
              (max-width: 639px) calc(50vw - 32px),
              (max-width: 1023px) 224px,
              (max-width: 1535px) 208px,
              224px
            "
            className={[
              "absolute inset-0 object-cover",
              "transition-[opacity,transform]",
              "duration-[1800ms]",
              "ease-[cubic-bezier(0.22,1,0.36,1)]",
              showIncomingImage
                ? "scale-100 opacity-100"
                : "scale-[1.018] opacity-0",
            ].join(" ")}
          />
        ) : null}

        {/* Glass tint */}
        <div
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            inset-0
            z-10
            bg-gradient-to-br
            from-sky-50/10
            via-transparent
            to-slate-900/25
          "
        />

        {/* Window reflection */}
        <div
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            -left-1/4
            -top-1/4
            z-20
            h-1/2
            w-3/4
            rotate-[-25deg]
            rounded-full
            bg-white/25
            blur-md
          "
        />
      </div>
    </div>
  );
}