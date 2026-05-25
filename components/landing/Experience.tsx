import { GraduationCap } from "lucide-react";
import { experience, education } from "@/content/experience";
import { Reveal } from "@/components/ui/Reveal";

export default function Experience() {
  return (
    <section id="experience" className="scroll-mt-20 px-6 py-28">
      <div className="mx-auto max-w-4xl">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">
            Experience
          </p>
          <h2 className="mt-4 max-w-2xl font-display text-4xl font-bold tracking-tight sm:text-5xl">
            A decade of platforms, APIs &amp; developer ecosystems
          </h2>
          <p className="mt-4 max-w-2xl text-muted">
            10+ years building and scaling enterprise SaaS platforms and
            developer ecosystems — leading cross-functional teams to ship
            platform intelligence, automation, and developer-productivity gains.
          </p>
        </Reveal>

        <div className="mt-14 border-l border-border pl-8">
          {experience.map((role) => (
            <Reveal key={role.company + role.period} className="relative mb-10">
              <span className="absolute -left-[2.45rem] top-1.5 size-3 rounded-full bg-accent ring-4 ring-background" />
              <p className="font-mono text-xs uppercase tracking-widest text-faint">
                {role.period}
              </p>
              <h3 className="mt-1.5 font-display text-xl font-semibold">
                {role.title}
              </h3>
              <p className="text-sm font-medium text-accent">{role.company}</p>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
                {role.blurb}
              </p>
            </Reveal>
          ))}

          {/* Education */}
          <Reveal className="relative">
            <span className="absolute -left-[2.55rem] top-0.5 flex size-5 -translate-x-px items-center justify-center rounded-full bg-surface ring-4 ring-background">
              <GraduationCap className="size-3 text-muted" />
            </span>
            <p className="font-mono text-xs uppercase tracking-widest text-faint">
              {education.period}
            </p>
            <h3 className="mt-1.5 font-display text-xl font-semibold">
              {education.credential}
            </h3>
            <p className="text-sm font-medium text-accent">
              {education.school}
            </p>
            <p className="mt-2 text-sm text-muted">{education.detail}</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
