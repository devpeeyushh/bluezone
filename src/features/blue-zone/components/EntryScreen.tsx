"use client";

import React, { useEffect, useRef } from "react";
import { Radio, AlertTriangle, ArrowRight, Cpu, Crosshair } from "lucide-react";
import gsap from "gsap";
import { GlitchText } from "./ui/GlitchText";
import { AudioWaveform } from "./ui/AudioWaveform";
import { sound } from "../utils/sound";
import { useBlueZoneStore } from "../store/useBlueZoneStore";

interface EntryScreenProps {
  onEnter: () => void;
}

// Short, atmospheric onboarding: what this sector is, what to do, how to move. No solutions.
const CONTROLS: { keys: string; action: string }[] = [
  { keys: "W A S D", action: "MOVE" },
  { keys: "MOUSE", action: "LOOK" },
  { keys: "E", action: "INTERACT" },
  { keys: "SHIFT", action: "SPRINT" },
  { keys: "ESC", action: "RELEASE CURSOR" },
];

export const EntryScreen: React.FC<EntryScreenProps> = ({ onEnter }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const enteringRef = useRef(false);
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const audioEnabled = useBlueZoneStore((state) => state.audioEnabled);

  // Kill the exit fade if the screen unmounts mid-transition
  useEffect(() => {
    return () => {
      tweenRef.current?.kill();
    };
  }, []);

  const handleEnterClick = () => {
    // Ignore repeat clicks while the exit transition is running
    if (enteringRef.current) return;
    enteringRef.current = true;

    if (audioEnabled) {
      sound.playStationTone(1100);
      sound.playRadioSquelch();
    }

    if (containerRef.current) {
      tweenRef.current = gsap.to(containerRef.current, {
        opacity: 0,
        scale: 0.98,
        duration: 0.45,
        ease: "power2.inOut",
        onComplete: onEnter,
      });
    } else {
      onEnter();
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-screen flex flex-col justify-between p-6 sm:p-10 font-mono text-radio-text bg-[#040813] select-none overflow-hidden"
    >
      {/* Background Ambience Lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0c1a32_1px,transparent_1px),linear-gradient(to_bottom,#0c1a32_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

      {/* Top Header */}
      <div className="relative z-10 flex flex-wrap items-center justify-between border-b border-radio-border pb-4 gap-4">
        <div className="flex items-center gap-2 text-radio-cyan">
          <Radio className="w-5 h-5 animate-pulse" />
          <span className="font-bold tracking-widest text-sm text-radio-textBright">
            MANU PROTOCOL // ARCHIVE CYCLE
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-radio-textMuted">
          <Cpu className="w-4 h-4 text-cyan-500" />
          <span>FACILITY CODE: SECTOR-03-RF</span>
        </div>
      </div>

      {/* Center Cinematic Entry Area */}
      <div className="relative z-10 my-auto w-full max-w-6xl py-6 grid grid-cols-1 lg:grid-cols-[minmax(0,42rem)_minmax(0,21rem)] gap-8 lg:gap-14 items-center">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded border border-cyan-500/40 bg-cyan-950/30 text-radio-cyan text-xs font-semibold tracking-widest mb-4">
            <span className="w-2 h-2 rounded-full bg-radio-cyan animate-ping" />
            <span>CONTAINMENT SECTOR // BLUE ZONE</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-radio-textBright tracking-tight mb-2">
            RADIO COMMUNICATION SECTOR
          </h1>

          <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold tracking-wider mb-5">
            <AlertTriangle className="w-4 h-4" />
            <GlitchText text="COMMUNICATION NETWORK OFFLINE" className="text-amber-300 font-bold" />
          </div>

          <p className="text-sm sm:text-base text-radio-text/80 leading-relaxed mb-6">
            The only emergency backup for Sanctuary population was Community. After records stabilized, residents abandoned assigned locations with a singular system note: <span className="text-radio-cyan underline">&ldquo;Resident responded to citywide emergency alert.&rdquo;</span> The broadcast trail converges here.
          </p>

          {/* Small System Status Area */}
          <div className="p-4 rounded-lg border border-radio-border bg-radio-surface/80 backdrop-blur-md mb-6">
            <div className="text-[11px] text-radio-textMuted tracking-wider mb-3 font-semibold">
              ACTIVE RF TELEMETRY MONITOR:
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded bg-radio-dark/80 border border-radio-border">
                <div className="text-[10px] text-radio-textMuted uppercase">Incoming Transmissions</div>
                <div className="text-2xl font-bold text-radio-cyan mt-1">14 <span className="text-xs font-normal text-slate-400">LOGGED</span></div>
              </div>

              <div className="p-3 rounded bg-radio-dark/80 border border-radio-border">
                <div className="text-[10px] text-radio-textMuted uppercase">Failed Transmissions</div>
                <div className="text-2xl font-bold text-red-400 mt-1">89 <span className="text-xs font-normal text-slate-400">CORRUPTED</span></div>
              </div>

              <div className="p-3 rounded bg-radio-dark/80 border border-radio-border">
                <div className="text-[10px] text-radio-textMuted uppercase">Unknown Signals</div>
                <div className="text-2xl font-bold text-amber-400 mt-1">3 <span className="text-xs font-normal text-slate-400">CARRIERS</span></div>
              </div>
            </div>

            {/* Mini Waveform preview */}
            <div className="mt-3 pt-3 border-t border-radio-border/60">
              <AudioWaveform height={32} frequency={0.07} amplitude={12} noise={0.4} color="#00f0ff" />
            </div>
          </div>

          {/* Enter Button */}
          <button
            onClick={handleEnterClick}
            className="group relative inline-flex items-center gap-3 px-8 py-4 rounded bg-cyan-500/10 hover:bg-cyan-500/20 border border-radio-cyan text-radio-textBright font-bold text-sm tracking-wider shadow-cyan-glow transition-all hover:scale-105 active:scale-95"
          >
            <Radio className="w-5 h-5 text-radio-cyan" />
            <span>[ ENTER FACILITY ]</span>
            <ArrowRight className="w-4 h-4 text-radio-cyan group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Sector Briefing: objective + controls */}
        <aside className="rounded-lg border border-radio-border bg-black/50 backdrop-blur-md overflow-hidden">
          <div className="px-4 py-2.5 border-b border-radio-border bg-radio-surface/70 text-[11px] font-bold tracking-[0.25em] text-radio-textBright">
            SECTOR BRIEFING
          </div>

          <div className="p-4 space-y-5">
            <div>
              <div className="text-[10px] tracking-[0.2em] text-cyan-400 font-bold mb-1.5">OBJECTIVE</div>
              <p className="text-xs text-radio-textBright leading-relaxed">
                Reconstruct the communication trail and determine the origin of the emergency broadcast.
              </p>
            </div>

            <div>
              <div className="text-[10px] tracking-[0.2em] text-cyan-400 font-bold mb-2">CONTROLS</div>
              <dl className="space-y-1.5">
                {CONTROLS.map(({ keys, action }) => (
                  <div key={action} className="flex items-center gap-3 text-[11px]">
                    <dt className="w-20 shrink-0">
                      <kbd className="inline-block px-1.5 py-0.5 rounded border border-cyan-800/70 bg-cyan-950/40 text-cyan-200 font-mono text-[10px] tracking-wider">
                        {keys}
                      </kbd>
                    </dt>
                    <dd className="text-radio-text tracking-wider">{action}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="flex items-start gap-2 pt-3 border-t border-radio-border/60 text-[10px] text-radio-textMuted leading-relaxed">
              <Crosshair className="w-3.5 h-3.5 shrink-0 mt-px text-cyan-600" />
              <span>Inside the facility, click the viewport to engage controls. Approach a console and press [E] to access it.</span>
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom Footer Telemetry */}
      <div className="relative z-10 border-t border-radio-border pt-4 flex flex-wrap items-center justify-between text-xs text-radio-textMuted">
        <div>ISOLATION ARCHITECTURE // BLUE ZONE STANDALONE CONTAINER</div>
        <div>JOIN SCHEMA: Sanctuary_ID</div>
      </div>
    </div>
  );
};
