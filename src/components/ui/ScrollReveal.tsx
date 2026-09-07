"use client";

import { type ReactNode, useRef } from "react";
import { motion } from "framer-motion";

type ScrollRevealProps = {
  children: ReactNode;
  delay?: number;
  className?: string;
};

export default function ScrollReveal({
  children,
  delay = 0,
  className = "",
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  return (
    <motion.div
      ref={ref}
      className={`w-full min-w-0 max-w-full ${className}`.trim()}
      initial={{
        opacity: 0,
        y: 48,
        scale: 0.985,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
        scale: 1,
      }}
      viewport={{
        once: false,
        amount: 0.14,
        margin: "-5% 0px -8% 0px",
      }}
      transition={{
        duration: 0.85,
        delay: delay / 1000,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}