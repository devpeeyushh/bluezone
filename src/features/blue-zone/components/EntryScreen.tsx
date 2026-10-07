"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useShallow } from "zustand/react/shallow";
import { sound } from "../utils/sound";
import { useBlueZoneStore } from "../store/useBlueZoneStore";
import { getCurrentObjective, OBJECTIVE_STEPS } from "../utils/objectives";
import { usePrefersReducedMotion } from "../utils/useReducedMotion";
import glass from "./entry/entryGlass.module.css";
import { EntryGlassButton } from "./entry/EntryGlassButton";
import { EntryBriefPanel, EntryMissionCard } from "./entry/EntryMissionCard";
import { EntryControlsPanel } from "./entry/EntryControls";
import { ENTER_DURATION, ENTER_DURATION_REDUCED, entryState, resetEntryState } from "./entry/entryState";

// Cinematic landing: the real Blue Zone world as the hero (lazy-loaded, client-only), a sparse
// editorial UI on top that never moves with the world, and a short transition that ends by calling
// the existing onEnter (store.enterHub) exactly as before.
const EntryHeroScene = dynamic(() => import("./entry/EntryHeroScene"), {
  ssr: false,
  loading: () => null,
});

interface EntryScreenProps {
  onEnter: () => void;
}

type Panel = "brief" | "controls" | null;

export const EntryScreen: React.FC<EntryScreenProps> = ({ onEnter }) => {
  const reducedMotion = usePrefersReducedMotion();
  const { audioEnabled, toggleAudio } = useBlueZoneStore(
    useShallow((s) => ({ audioEnabled: s.audioEnabled, toggleAudio: s.toggleAudio }))
  );
  // Flat progress flags (shallow-compared), for the mission step only
  const progress = useBlueZoneStore(
    useShallow((s) => ({
      challenge1Solved: s.challenge1Solved,
      challenge2Solved: s.challenge2Solved,
      challenge3Solved: s.challenge3Solved,
      voiceArchiveUnlocked: s.voiceArchiveUnlocked,
      signalMonitorUnlocked: s.signalMonitorUnlocked,
      networkUnlocked: s.networkUnlocked,
      broadcastUnlocked: s.broadcastUnlocked,
      completed: s.completed,
    }))
  );
  const objective = getCurrentObjective(progress);

  const [panel, setPanel] = useState<Panel>(null);
  const [leaving, setLeaving] = useState(false);
  const [veil, setVeil] = useState(false);
  const enteringRef = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Pointer → normalised parallax input (written to a plain object; no re-render per move)
  useEffect(() => {
    resetEntryState();
    const onMove = (e: PointerEvent) => {
      entryState.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      entryState.pointerY = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      timers.current.forEach(clearTimeout);
      timers.current = [];
      resetEntryState();
    };
  }, []);

  const closePanel = useCallback(() => setPanel(null), []);

  const handleEnter = () => {
    // Ignore repeat clicks while the transition is running
    if (enteringRef.current) return;
    enteringRef.current = true;
    setPanel(null);
    entryState.entering = true;
    if (audioEnabled) sound.enterFacility();

    const duration = (reducedMotion ? ENTER_DURATION_REDUCED : ENTER_DURATION) * 1000;
    setLeaving(true);
    timers.current.push(setTimeout(() => setVeil(true), Math.max(0, duration - 380)));
    // Hand off to the existing entry flow (store.enterHub via BlueZoneRoot)
    timers.current.push(setTimeout(onEnter, duration));
  };

  const handleAudioToggle = () => {
    const next = !audioEnabled;
    toggleAudio();
    // Keep the existing engine in step (inside the facility this is done by useFacilityAudio)
    sound.setEnabled(next);
    if (next) sound.playStationTone(920);
  };

  return (
    <div className="relative w-full h-full min-h-screen overflow-x-hidden overflow-y-auto select-none bg-[#030914] text-radio-text">
      {/* Hero world */}
      <div className="fixed inset-0" aria-hidden>
        <EntryHeroScene />
      </div>

      {/* Legibility shading (static: the UI never moves with the world) */}
      <div
        className="fixed inset-0 pointer-events-none bg-[linear-gradient(90deg,rgba(3,9,20,0.82)_0%,rgba(3,9,20,0.45)_38%,rgba(3,9,20,0)_68%)]"
        aria-hidden
      />
      <div
        className="fixed inset-x-0 bottom-0 h-1/3 pointer-events-none bg-[linear-gradient(0deg,rgba(3,9,20,0.75),rgba(3,9,20,0))]"
        aria-hidden
      />

      {/* Interface */}
      <div
        className={`relative z-10 min-h-screen h-full flex flex-col justify-between gap-8 px-5 py-5 sm:px-10 sm:py-8 lg:px-14 lg:py-10 ${
          leaving ? glass.uiLeaving : ""
        }`}
      >
        {/* Top */}
        <header className="flex items-start justify-between gap-6 font-mono">
          <div className="text-[10px] sm:text-[11px] leading-relaxed tracking-[0.32em]">
            <div className="text-radio-textBright">MANU PROTOCOL</div>
            <div className="text-radio-text/60">// ARCHIVE CYCLE 03</div>
          </div>
          <div className="flex items-start gap-3">
            <div className="hidden sm:block text-right text-[10px] sm:text-[11px] leading-relaxed tracking-[0.32em]">
              <div className="text-radio-textBright">FACILITY 03-RF</div>
              <div className="flex items-center justify-end gap-2 text-cyan-200/80">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-300" aria-hidden />
                SYSTEM ONLINE
              </div>
            </div>
            <button
              type="button"
              onClick={handleAudioToggle}
              aria-label="Sound"
              aria-pressed={audioEnabled}
              title={audioEnabled ? "Mute audio" : "Enable audio (headphones recommended)"}
              className={`${glass.ghost} rounded-full px-3 py-1.5 text-[10px] tracking-[0.28em] text-radio-text/80`}
            >
              SOUND {audioEnabled ? "ON" : "OFF"}
            </button>
          </div>
        </header>

        {/* Hero */}
        <main className={`${glass.rise} max-w-[44rem]`}>
          <h1 className="font-sans font-extralight text-white tracking-[-0.045em] leading-[0.8] text-[clamp(3.5rem,min(13.5vw,17vh),11.5rem)] bg-[linear-gradient(180deg,#ffffff_0%,#dff6ff_55%,rgba(150,215,240,0.75)_100%)] bg-clip-text text-transparent">
            BLUE
            <br />
            ZONE
          </h1>
          <div className="mt-[clamp(1rem,3vh,2rem)] font-mono text-[11px] sm:text-[13px] leading-[1.9] tracking-[0.42em] text-radio-textBright">
            RADIO COMMUNICATION
            <br />
            SECTOR
          </div>
          <div className="mt-4 flex items-center gap-2.5 font-mono text-[10px] tracking-[0.34em] text-amber-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-300/90" aria-hidden />
            COMMUNICATION NETWORK // OFFLINE
          </div>
          <div className="mt-[clamp(1.5rem,5vh,2.75rem)]">
            <EntryGlassButton
              onActivate={handleEnter}
              disabled={leaving}
              onHoverCue={() => {
                if (audioEnabled) sound.focus("station");
              }}
            />
          </div>
        </main>

        {/* Bottom */}
        <footer className="flex flex-wrap items-end justify-between gap-4">
          <div className="relative">
            {panel === "brief" && (
              <div className="absolute bottom-full left-0 mb-3 z-20">
                <EntryBriefPanel onClose={closePanel} />
              </div>
            )}
            <EntryMissionCard
              step={objective.step}
              steps={OBJECTIVE_STEPS}
              complete={objective.id === "complete"}
              onViewBrief={() => setPanel(panel === "brief" ? null : "brief")}
            />
          </div>
          <div className="relative">
            {panel === "controls" && (
              <div className="absolute bottom-full left-0 sm:left-auto sm:right-0 mb-3 z-20">
                <EntryControlsPanel onClose={closePanel} />
              </div>
            )}
            <button
              type="button"
              onClick={() => setPanel(panel === "controls" ? null : "controls")}
              aria-expanded={panel === "controls"}
              className={`${glass.ghost} rounded-full pl-1.5 pr-4 py-1.5 inline-flex items-center gap-2.5 font-mono text-[10px] tracking-[0.3em] text-radio-text/85`}
            >
              <span className="w-6 h-6 rounded-full border border-white/20 inline-flex items-center justify-center text-[11px] text-radio-textBright">
                ?
              </span>
              CONTROLS
            </button>
          </div>
        </footer>
      </div>

      {/* Atmospheric hand-off into the facility */}
      <div
        className={`fixed inset-0 z-20 pointer-events-none bg-[radial-gradient(ellipse_at_60%_45%,#0a2a3e_0%,#030914_70%)] ${glass.veil} ${
          veil ? glass.veilOn : ""
        }`}
        aria-hidden
      />
    </div>
  );
};
