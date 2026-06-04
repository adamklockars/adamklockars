import Link from "next/link";
import {
  ArrowUpRight,
  Grid3x3,
  Images,
  Rocket,
  PiggyBank,
  Dumbbell,
} from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";

const experiments = [
  {
    href: "/tic-tac-toe",
    title: "Tic-Tac-Toe",
    blurb:
      "Two players or you against a (cheerfully naive) computer. Rebuilt from the original server-rendered version — now instant, no page reloads.",
    icon: Grid3x3,
    accent: "#7c6cff",
  },
  {
    href: "/side-scroller",
    title: "If Then Explosion",
    blurb:
      "A retro green cave-flyer rebuilt from the spaceship game I first wrote in Turing. Thread the triangle ship through walls that pinch toward the centre while aliens squeeze the gap — there's always a way through.",
    icon: Rocket,
    accent: "#48e0a0",
  },
  {
    href: "/flying-pig",
    title: "Robo Pig Attack",
    blurb:
      "An endless runner in the spirit of Robot Unicorn Attack — only the galloping unicorn is a winged robo-pig. Jump, flap, and dash through crystals as far as you can.",
    icon: PiggyBank,
    accent: "#ff5db1",
  },
  {
    href: "/swole-mate",
    title: "Swole Mate",
    blurb:
      "A Tamagotchi-style handheld: keep a little guy fed and rested while grinding out reps for GAINS. Click a lot, watch the number climb, and don’t let him starve or collapse from over-training.",
    icon: Dumbbell,
    accent: "#f472b6",
  },
  {
    href: "/collage",
    title: "Collage Studio",
    blurb:
      "Drag photos onto a canvas, arrange them across multiple boards, and export the result as an image. The old Pinprint tool, reborn with modern drag-and-drop.",
    icon: Images,
    accent: "#f59e0b",
  },
];

export default function PlaySection() {
  return (
    <section id="play" className="scroll-mt-20 px-6 py-28">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">
            Play
          </p>
          <h2 className="mt-4 max-w-2xl font-display text-4xl font-bold tracking-tight sm:text-5xl">
            A few things I built for fun
          </h2>
          <p className="mt-4 max-w-xl text-muted">
            Tic-Tac-Toe and the collage tool are rebuilt from the original 2012
            Django version of this site. The games are newer — built from
            scratch, inspired by projects and games from past experiences. They
            all run entirely in your browser.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {experiments.map((exp, i) => {
            const Icon = exp.icon;
            return (
              <Reveal key={exp.href} delay={i * 0.08}>
                <Link
                  href={exp.href}
                  prefetch={false}
                  style={{ ["--color-accent" as string]: exp.accent }}
                  className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface p-8 transition-all duration-300 hover:-translate-y-1 hover:border-accent/50"
                >
                  <div
                    aria-hidden
                    className="absolute -right-16 -top-16 size-40 rounded-full opacity-0 blur-3xl transition-opacity duration-300 group-hover:opacity-40"
                    style={{ background: "var(--color-accent)" }}
                  />
                  <div className="flex size-12 items-center justify-center rounded-xl border border-border bg-background text-accent">
                    <Icon className="size-6" />
                  </div>
                  <h3 className="mt-6 flex items-center gap-2 font-display text-2xl font-semibold">
                    {exp.title}
                    <ArrowUpRight className="size-5 text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent" />
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    {exp.blurb}
                  </p>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
