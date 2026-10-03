"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

// Short fade/scale-in for station modals so opening reads as a response, not a hard cut.
// The tween is killed on unmount and inline styles are cleared when it finishes.
export function useModalEntrance<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const tween = gsap.fromTo(
      el,
      { opacity: 0, y: 10, scale: 0.985 },
      { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: "power2.out", clearProps: "opacity,transform" }
    );
    return () => {
      tween.kill();
    };
  }, []);

  return ref;
}
