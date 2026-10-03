"use client";

import React, { useState, useEffect } from "react";

interface GlitchTextProps {
  text: string;
  className?: string;
  glitchIntensity?: number; // 0 to 1
}

const GLITCH_CHARS = "01!<>-_/[]{}—=+*^?#________";

export const GlitchText: React.FC<GlitchTextProps> = ({
  text,
  className = "",
  glitchIntensity = 0.08,
}) => {
  const [displayText, setDisplayText] = useState(text);

  useEffect(() => {
    if (glitchIntensity <= 0) return;

    let restoreTimer: ReturnType<typeof setTimeout> | null = null;
    const interval = setInterval(() => {
      if (Math.random() < glitchIntensity) {
        const chars = text.split("");
        const numGlitches = Math.max(1, Math.floor(chars.length * 0.15));
        for (let i = 0; i < numGlitches; i++) {
          const idx = Math.floor(Math.random() * chars.length);
          chars[idx] = GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
        }
        setDisplayText(chars.join(""));
        if (restoreTimer) clearTimeout(restoreTimer);
        restoreTimer = setTimeout(() => setDisplayText(text), 120);
      }
    }, 600);

    return () => {
      clearInterval(interval);
      if (restoreTimer) clearTimeout(restoreTimer);
    };
  }, [text, glitchIntensity]);

  return <span className={className}>{displayText}</span>;
};
