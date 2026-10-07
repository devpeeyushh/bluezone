"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import glass from "./entryGlass.module.css";

// Compact glass panel used by VIEW BRIEF and CONTROLS. Closes with its button or ESC; focus moves
// to the close button on open and returns to the opener on close. Listener removed on unmount.

interface Props {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export const EntryPanel: React.FC<Props> = ({ title, onClose, children, className = "" }) => {
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-label={title}
      className={`${glass.glass} ${glass.panelIn} rounded-2xl p-5 font-mono text-radio-text ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] tracking-[0.32em] text-cyan-200/80">{title}</span>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={`Close ${title.toLowerCase()}`}
          className="p-1 -m-1 rounded-full text-radio-text/70 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-300/70"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {children}
    </div>
  );
};
