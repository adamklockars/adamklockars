import Image from "next/image";
import { FileDown } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { RESUME_PATH } from "@/lib/site";

const tags = [
  "Engineering Leadership",
  "Developer Platforms & APIs",
  "App Marketplaces",
  "Distributed Systems",
  "Platform Monetization",
  "AI-Assisted Workflows",
  "CI/CD & Reliability",
  "Cross-Functional Leadership",
];

export default function About() {
  return (
    <section id="about" className="scroll-mt-20 px-6 py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-[auto_1fr] md:gap-16">
        <Reveal className="justify-self-center md:justify-self-start">
          <div className="relative">
            <div
              aria-hidden
              className="absolute -inset-4 -z-10 rounded-3xl bg-accent/20 blur-2xl"
            />
            <Image
              src="/profile.jpg"
              alt="Adam Oscar Klockars"
              width={240}
              height={240}
              className="size-44 rounded-3xl border border-border object-cover sm:size-56"
            />
          </div>
        </Reveal>

        <div>
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">
              About
            </p>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl">
              I build platforms — and the teams behind them.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-5 max-w-2xl leading-relaxed text-muted">
              I&apos;m an engineering leader with close to 15 years building and
              scaling enterprise SaaS platforms, APIs and developer ecosystems —
              lately with a focus on AI-powered, data-driven product
              capabilities. Most recently I led US engineering for Zoom&apos;s
              App Marketplace; before that, I spent years at SurveyMonkey growing
              its developer platform and integrations and leading the initial
              build-out of its Market Research Solutions. The projects above are
              what I build on my own time.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <ul className="mt-7 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full border border-border bg-surface px-4 py-1.5 text-sm text-foreground/80"
                >
                  {tag}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.2}>
            <a
              href={RESUME_PATH}
              download
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-transform hover:scale-[1.03] active:scale-95"
            >
              <FileDown className="size-4" />
              Download résumé
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
