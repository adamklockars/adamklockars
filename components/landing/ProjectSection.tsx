"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "motion/react";
import { ArrowUpRight, Check } from "lucide-react";
import type { Project } from "@/content/projects";
import { Reveal } from "@/components/ui/Reveal";

export default function ProjectSection({
  project,
  index,
}: {
  project: Project;
  index: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const reverse = index % 2 === 1;

  // Scroll-linked parallax for the mockup as the section passes through view.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [70, -70]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.94, 1, 0.94]);
  const ghostY = useTransform(scrollYProgress, [0, 1], [40, -40]);

  return (
    <section
      ref={ref}
      id={project.id}
      style={{ ["--color-accent" as string]: project.accent }}
      className="relative flex min-h-[100svh] scroll-mt-20 items-center overflow-hidden px-6 py-24"
    >
      {/* Ghost index number */}
      <motion.span
        aria-hidden
        style={{ y: ghostY }}
        className="pointer-events-none absolute -top-4 right-2 select-none font-display text-[28vw] font-bold leading-none text-surface-2/60 sm:right-8 sm:text-[20vw]"
      >
        {String(index + 1).padStart(2, "0")}
      </motion.span>

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Text column */}
        <div className={reverse ? "lg:order-2" : ""}>
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">
              {project.kicker}
            </p>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-4 font-display text-5xl font-bold tracking-tight sm:text-6xl">
              {project.name}
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-4 text-xl font-medium text-foreground/90 text-balance">
              {project.tagline}
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="mt-5 max-w-md leading-relaxed text-muted">
              {project.description}
            </p>
          </Reveal>

          <Reveal delay={0.2}>
            <ul className="mt-7 grid gap-3 sm:grid-cols-2">
              {project.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-accent" />
                  <span className="text-foreground/80">{feature}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.25}>
            <div className="mt-9">
              {project.url ? (
                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent/20"
                >
                  Visit site
                  <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </a>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium text-faint">
                  Coming soon
                </span>
              )}
            </div>
          </Reveal>
        </div>

        {/* Mockup column */}
        <motion.div
          style={{ y, scale }}
          className={reverse ? "lg:order-1" : ""}
        >
          <BrowserMockup project={project} />
        </motion.div>
      </div>
    </section>
  );
}

function BrowserMockup({ project }: { project: Project }) {
  const host = project.url
    ? project.url.replace(/^https?:\/\//, "").replace(/\/$/, "")
    : "comingsoon.app";

  return (
    <div className="relative">
      {/* accent glow */}
      <div
        aria-hidden
        className="absolute -inset-8 -z-10 rounded-[2rem] opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, var(--color-accent), transparent)",
        }}
      />
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl shadow-black/40">
        {/* browser chrome */}
        <div className="flex items-center gap-2 border-b border-border bg-surface-2 px-4 py-3">
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
          <div className="ml-3 flex-1 truncate rounded-md bg-background/60 px-3 py-1 text-center font-mono text-xs text-muted">
            {host}
          </div>
        </div>

        {/* body */}
        {project.image ? (
          <Image
            src={project.image}
            alt={`${project.name} screenshot`}
            width={1200}
            height={800}
            className="h-auto w-full"
          />
        ) : (
          <div className="relative aspect-[4/3] overflow-hidden">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(135deg, color-mix(in oklab, var(--color-accent) 22%, transparent), transparent 60%)",
              }}
            />
            <div className="relative flex h-full flex-col gap-4 p-7">
              <div className="h-3 w-1/3 rounded-full bg-accent/60" />
              <div className="h-10 w-3/4 rounded-lg bg-foreground/10" />
              <div className="h-3 w-2/3 rounded-full bg-foreground/10" />
              <div className="mt-auto grid grid-cols-3 gap-3">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-xl border border-border bg-background/40"
                    style={
                      i === 1
                        ? {
                            borderColor:
                              "color-mix(in oklab, var(--color-accent) 50%, transparent)",
                          }
                        : undefined
                    }
                  />
                ))}
              </div>
              <div
                className="flex h-11 items-center justify-center rounded-xl text-sm font-medium text-background"
                style={{ background: "var(--color-accent)" }}
              >
                {project.name}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
