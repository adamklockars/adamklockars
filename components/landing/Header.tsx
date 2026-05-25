"use client";

import { useEffect, useState } from "react";
import { FileDown } from "lucide-react";
import { scrollToId } from "@/lib/scroll";
import { RESUME_PATH } from "@/lib/site";

const links = [
  { id: "predictvs", label: "Work" },
  { id: "experience", label: "Experience" },
  { id: "play", label: "Play" },
  { id: "about", label: "About" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
        scrolled
          ? "border-b border-border bg-background/70 backdrop-blur-md"
          : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <button
          onClick={() => scrollToId("top")}
          className="font-display text-lg font-bold tracking-tight"
          aria-label="Back to top"
        >
          AK<span className="text-accent">.</span>
        </button>

        <div className="flex items-center gap-2">
          <nav className="hidden items-center gap-1 sm:flex">
            {links.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => scrollToId(id)}
                className="rounded-full px-4 py-2 text-sm text-muted transition-colors hover:bg-surface hover:text-foreground"
              >
                {label}
              </button>
            ))}
          </nav>
          <a
            href={RESUME_PATH}
            download
            className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent/20"
          >
            <FileDown className="size-4" />
            Résumé
          </a>
        </div>
      </div>
    </header>
  );
}
