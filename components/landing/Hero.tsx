"use client";

import { motion } from "motion/react";
import { ArrowDown, FileDown } from "lucide-react";
import { RESUME_PATH } from "@/lib/site";

const ease = [0.22, 1, 0.36, 1] as const;

export default function Hero() {
  return (
    <section
      id="top"
      className="relative flex min-h-[100svh] flex-col justify-center px-6"
    >
      <div className="mx-auto w-full max-w-6xl">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          className="mb-6 font-mono text-sm uppercase tracking-[0.3em] text-accent"
        >
          Engineering Leader · Ottawa
        </motion.p>

        <h1 className="font-display text-[clamp(2.75rem,9vw,7.5rem)] font-bold leading-[0.95] tracking-tight">
          {["Adam", "Klockars"].map((word, i) => (
            <motion.span
              key={word}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 + i * 0.1, ease }}
              className="block text-gradient"
            >
              {word}
            </motion.span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease }}
          className="mt-8 max-w-2xl text-lg leading-relaxed text-muted text-balance"
        >
          Engineering leader with 10+ years building and scaling enterprise SaaS
          platforms, APIs and developer ecosystems — most recently leading App
          Marketplace engineering at Zoom. Below: a few things I&apos;ve been
          building on the side, plus a couple of playable experiments.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.55, ease }}
          className="mt-10 flex flex-wrap items-center gap-3"
        >
          <a
            href="#predictvs"
            className="rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-transform hover:scale-[1.03] active:scale-95"
          >
            See the work
          </a>
          <a
            href={RESUME_PATH}
            download
            className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent/20"
          >
            <FileDown className="size-4" />
            Download résumé
          </a>
          <a
            href="#play"
            className="rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:border-foreground/40 hover:bg-surface"
          >
            Play something
          </a>
        </motion.div>
      </div>

      <motion.a
        href="#predictvs"
        aria-label="Scroll to projects"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute inset-x-0 bottom-8 mx-auto flex w-fit flex-col items-center gap-2 text-faint"
      >
        <span className="font-mono text-xs uppercase tracking-[0.3em]">
          Scroll
        </span>
        <motion.span
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <ArrowDown className="size-4" />
        </motion.span>
      </motion.a>
    </section>
  );
}
