"use client";

import React, { useRef } from "react";

// Compact evidence navigation shared by the CTF stations. WAI-ARIA tabs pattern:
// arrow keys / Home / End move between tabs, only the active tab is in the tab order.

export interface CtfTab<T extends string> {
  id: T;
  label: string;
  marker?: boolean; // small dot, e.g. "has new content"
}

interface Props<T extends string> {
  idPrefix: string;
  tabs: CtfTab<T>[];
  active: T;
  onChange: (id: T) => void;
  label: string;
}

export function CtfTabs<T extends string>({ idPrefix, tabs, active, onChange, label }: Props<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const focusTab = (index: number) => {
    const next = (index + tabs.length) % tabs.length;
    onChange(tabs[next].id);
    refs.current[next]?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "ArrowRight") focusTab(index + 1);
    else if (e.key === "ArrowLeft") focusTab(index - 1);
    else if (e.key === "Home") focusTab(0);
    else if (e.key === "End") focusTab(tabs.length - 1);
    else return;
    e.preventDefault();
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex gap-1 overflow-x-auto px-3 pt-2 border-b border-radio-border bg-radio-dark/80 [scrollbar-width:none]"
    >
      {tabs.map((tab, i) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className={`relative shrink-0 px-3 py-2 text-[10px] font-bold tracking-[0.2em] rounded-t border-x border-t transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-radio-cyan ${
              selected
                ? "border-radio-cyan/50 bg-cyan-950/50 text-radio-textBright"
                : "border-transparent text-radio-textMuted hover:text-radio-text hover:bg-slate-900/60"
            }`}
          >
            {tab.label}
            {tab.marker && (
              <span className="absolute top-1.5 right-1 w-1.5 h-1.5 rounded-full bg-amber-300" aria-hidden />
            )}
          </button>
        );
      })}
    </div>
  );
}

export const CtfTabPanel: React.FC<{ idPrefix: string; active: string; children: React.ReactNode }> = ({
  idPrefix,
  active,
  children,
}) => (
  <div
    role="tabpanel"
    id={`${idPrefix}-panel`}
    aria-labelledby={`${idPrefix}-tab-${active}`}
    className="flex-1 overflow-y-auto p-4 sm:p-6 bg-radio-dark/95"
  >
    {children}
  </div>
);
