"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  /** seconds to wait before animating in */
  delay?: number;
  /** px to travel on the y-axis */
  y?: number;
  className?: string;
  /** animate every time it enters the viewport instead of just once */
  repeat?: boolean;
};

/**
 * Fades + lifts its children into view as the user scrolls them onscreen.
 * The workhorse of the landing page's scroll-reveal feel.
 */
export function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
  repeat = false,
}: RevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: !repeat, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
