"use client";

import { ReactLenis, type LenisRef } from "lenis/react";
import { useEffect, useRef, useState } from "react";

/**
 * Site-wide smooth/inertia scrolling via Lenis. When `root` is set, Lenis
 * attaches to the document and renders children directly (no wrapper element),
 * so there's no hydration mismatch when we fall back for reduced-motion users.
 */
export default function SmoothScroll({
  children,
}: {
  children: React.ReactNode;
}) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const lenisRef = useRef<LenisRef>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Expose the Lenis instance so the section nav can scroll programmatically.
  useEffect(() => {
    window.__lenis = lenisRef.current?.lenis ?? undefined;
    return () => {
      window.__lenis = undefined;
    };
  }, [reducedMotion]);

  if (reducedMotion) return <>{children}</>;

  return (
    <ReactLenis root options={{ lerp: 0.1, smoothWheel: true }} ref={lenisRef}>
      {children}
    </ReactLenis>
  );
}
