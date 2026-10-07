"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

// Short entrance for station modals so opening reads as a response, not a hard cut:
// the backdrop (the panel's parent) darkens in while the panel rises and scales into place.
// Reduced motion: a quick fade only. Tweens are killed on unmount and inline styles cleared when done.
export function useModalEntrance<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced =
      typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const backdrop = el.parentElement;
    const tweens: gsap.core.Tween[] = [];

    if (backdrop) {
      tweens.push(
        gsap.fromTo(
          backdrop,
          { opacity: 0 },
          { opacity: 1, duration: reduced ? 0.1 : 0.22, ease: "power1.out", clearProps: "opacity" }
        )
      );
    }
    tweens.push(
      reduced
        ? gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.1, clearProps: "opacity" })
        : gsap.fromTo(
            el,
            { opacity: 0, y: 14, scale: 0.97 },
            { opacity: 1, y: 0, scale: 1, duration: 0.28, delay: 0.04, ease: "power3.out", clearProps: "opacity,transform" }
          )
    );
    return () => {
      tweens.forEach((t) => t.kill());
      // A killed tween can leave a partial inline opacity behind (e.g. fast open/close)
      if (backdrop) gsap.set(backdrop, { clearProps: "opacity" });
    };
  }, []);

  return ref;
}
