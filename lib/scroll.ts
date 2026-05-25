import type Lenis from "lenis";

declare global {
  interface Window {
    __lenis?: Lenis;
  }
}

/** Smoothly scroll to a section by id, using Lenis when it's active. */
export function scrollToId(id: string) {
  if (typeof window === "undefined") return;
  const el = document.getElementById(id);
  if (!el) return;
  if (window.__lenis) {
    window.__lenis.scrollTo(el, { offset: 0 });
  } else {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}
