import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/** Slim top bar for the standalone demo pages with a link back home. */
export default function DemoNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center px-6">
        <Link
          href="/"
          prefetch={false}
          className="group flex items-center gap-2 text-sm text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
          <span className="font-display font-bold tracking-tight text-foreground">
            Adam Klockars
          </span>
        </Link>
      </div>
    </header>
  );
}
