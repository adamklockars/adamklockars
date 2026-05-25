"use client";

import { useEffect, useState } from "react";
import { motion, useScroll, useSpring } from "motion/react";
import { projects } from "@/content/projects";
import { scrollToId } from "@/lib/scroll";

const sections = [
  { id: "top", label: "Top" },
  ...projects.map((p) => ({ id: p.id, label: p.name })),
  { id: "play", label: "Play" },
  { id: "experience", label: "Experience" },
  { id: "about", label: "About" },
];

export default function ScrollChrome() {
  const [active, setActive] = useState("top");
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.4,
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      // "intersecting" only while a section straddles the viewport midline.
      { rootMargin: "-50% 0px -50% 0px", threshold: 0 },
    );
    for (const { id } of sections) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* top progress bar */}
      <motion.div
        style={{ scaleX: progress }}
        className="fixed inset-x-0 top-0 z-50 h-[3px] origin-left bg-accent"
      />

      {/* side dot nav (desktop only) */}
      <nav
        aria-label="Section navigation"
        className="fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-end gap-4 lg:flex"
      >
        {sections.map(({ id, label }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => scrollToId(id)}
              className="group flex items-center gap-3"
              aria-label={`Go to ${label}`}
              aria-current={isActive ? "true" : undefined}
            >
              <span
                className={`whitespace-nowrap font-mono text-xs uppercase tracking-widest transition-all duration-300 ${
                  isActive
                    ? "text-foreground opacity-100"
                    : "text-muted opacity-0 group-hover:opacity-100"
                }`}
              >
                {label}
              </span>
              <span
                className={`block rounded-full transition-all duration-300 ${
                  isActive
                    ? "h-2.5 w-2.5 bg-accent"
                    : "h-1.5 w-1.5 bg-faint group-hover:bg-foreground"
                }`}
              />
            </button>
          );
        })}
      </nav>
    </>
  );
}
