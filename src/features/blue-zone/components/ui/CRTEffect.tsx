import React from "react";

export const CRTEffect: React.FC = () => {
  return (
    <div className="pointer-events-none fixed inset-0 z-[120] overflow-hidden select-none">
      {/* Scanline overlay */}
      <div 
        className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0),rgba(255,255,255,0)_50%,rgba(0,0,0,0.3)_50%,rgba(0,0,0,0.3))] bg-[length:100%_4px] opacity-40 mix-blend-overlay" 
      />
      {/* Moving scanline beam */}
      <div className="absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent animate-scanline pointer-events-none" />
      {/* Vignette border */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_60%,rgba(3,6,15,0.85)_100%)]" />
      {/* Phosphor color tinge */}
      <div className="absolute inset-0 bg-cyan-950/10 mix-blend-color" />
    </div>
  );
};
