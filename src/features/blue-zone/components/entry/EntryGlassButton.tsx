"use client";

import React from "react";
import { ArrowRight } from "lucide-react";
import glass from "./entryGlass.module.css";
import { entryState } from "./entryState";

// Primary action. Hover/focus lifts the glass, moves a specular highlight with the cursor (CSS
// variables written straight to the element) and raises the scene's transmission via entryState.

interface Props {
  onActivate: () => void;
  onHoverCue?: () => void;
  disabled?: boolean;
}

export const EntryGlassButton: React.FC<Props> = ({ onActivate, onHoverCue, disabled }) => {
  const enter = () => {
    if (entryState.hover === 1) return;
    entryState.hover = 1;
    onHoverCue?.();
  };
  const leave = () => {
    entryState.hover = 0;
  };

  return (
    <button
      type="button"
      onClick={onActivate}
      disabled={disabled}
      onPointerEnter={enter}
      onPointerLeave={leave}
      onFocus={enter}
      onBlur={leave}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
      className={`${glass.cta} inline-flex items-center gap-4 pl-5 pr-6 py-3.5 sm:py-4 text-radio-textBright font-mono text-xs sm:text-sm font-semibold tracking-[0.28em] disabled:cursor-default`}
    >
      <span className={`${glass.ctaDot} w-2 h-2 rounded-full bg-cyan-300`} aria-hidden />
      <span>ENTER FACILITY</span>
      <ArrowRight className={`${glass.ctaArrow} w-4 h-4 text-cyan-200`} aria-hidden />
    </button>
  );
};
