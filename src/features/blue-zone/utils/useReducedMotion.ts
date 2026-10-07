"use client";

import { useEffect, useState } from "react";

// prefers-reduced-motion as a React value. Kept free of three.js so DOM-only screens (the landing
// UI) can use it without pulling the 3D bundle in eagerly. Re-exported by scene/environment/envUtils.
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}
