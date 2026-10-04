"use client";

import React, { useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { useShallow } from "zustand/react/shallow";
import { StatusBar } from "./ui/StatusBar";
import { ObjectiveTracker } from "./ui/ObjectiveTracker";
import { CommunicationTerminalModal } from "./stations/CommunicationTerminalModal";
import { VoiceArchiveModal } from "./stations/VoiceArchiveModal";
import { SignalMonitorModal } from "./stations/SignalMonitorModal";
import { NetworkMapModal } from "./stations/NetworkMapModal";
import { EmergencyBroadcastModal } from "./stations/EmergencyBroadcastModal";
import { InvestigationBoardModal } from "./ui/InvestigationBoardModal";
import { RADIO_STATIONS } from "../data/mockRadioData";
import { useBlueZoneStore } from "../store/useBlueZoneStore";
import { sound } from "../utils/sound";
import { getStationStatus } from "../utils/stationStatus";
import { BlueZoneCompletionPayload } from "../types/integration.types";

// Dynamically import 3D Canvas to disable SSR cleanly
const RadioRoomScene = dynamic(
  () => import("./scene/RadioRoomScene").then((mod) => mod.RadioRoomScene),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#03060f] text-radio-cyan font-mono text-xs gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-radio-cyan border-t-transparent animate-spin" />
        <span className="tracking-widest uppercase animate-pulse">
          INITIALIZING 3D RADIO HUB ROOM...
        </span>
      </div>
    ),
  }
);

interface RadioHubProps {
  onExit?: () => void;
  onComplete?: (payload: BlueZoneCompletionPayload) => void;
}

export const RadioHub: React.FC<RadioHubProps> = ({ onExit, onComplete }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const {
    activeStation,
    setActiveStation,
    audioEnabled,
    challenge1Solved,
    challenge2Solved,
    challenge3Solved,
    voiceArchiveUnlocked,
    signalMonitorUnlocked,
    networkUnlocked,
    broadcastUnlocked,
    completed,
    investigationBoardOpen,
    openInvestigationBoard,
    closeInvestigationBoard,
  } = useBlueZoneStore(
    useShallow((s) => ({
      activeStation: s.activeStation,
      setActiveStation: s.setActiveStation,
      audioEnabled: s.audioEnabled,
      challenge1Solved: s.challenge1Solved,
      challenge2Solved: s.challenge2Solved,
      challenge3Solved: s.challenge3Solved,
      voiceArchiveUnlocked: s.voiceArchiveUnlocked,
      signalMonitorUnlocked: s.signalMonitorUnlocked,
      networkUnlocked: s.networkUnlocked,
      broadcastUnlocked: s.broadcastUnlocked,
      completed: s.completed,
      investigationBoardOpen: s.investigationBoardOpen,
      openInvestigationBoard: s.openInvestigationBoard,
      closeInvestigationBoard: s.closeInvestigationBoard,
    }))
  );

  const isModalOpen = Boolean(activeStation || investigationBoardOpen);
  const progress = {
    challenge1Solved,
    challenge2Solved,
    challenge3Solved,
    voiceArchiveUnlocked,
    signalMonitorUnlocked,
    networkUnlocked,
    broadcastUnlocked,
    completed,
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const tween = gsap.fromTo(
      containerRef.current,
      { opacity: 0, scale: 1.02 },
      { opacity: 1, scale: 1, duration: 0.6, ease: "power2.out", clearProps: "transform" }
    );
    return () => {
      tween.kill();
    };
  }, []);

  // Global ESC key handler for active modal dismissal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (investigationBoardOpen) {
          e.preventDefault();
          if (audioEnabled) sound.playClick();
          closeInvestigationBoard();
        } else if (activeStation) {
          e.preventDefault();
          if (audioEnabled) sound.playClick();
          setActiveStation(null);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeStation, investigationBoardOpen, audioEnabled, setActiveStation, closeInvestigationBoard]);

  const handleStationClick = (id: (typeof RADIO_STATIONS)[number]["id"]) => {
    if (audioEnabled) sound.playClick();
    setActiveStation(id);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen flex flex-col bg-[#03060f] overflow-hidden select-none"
    >
      {/* Top Status & Telemetry Bar */}
      <StatusBar onExit={onExit} />

      {/* Main 3D World Viewport */}
      {/* min-h-0 lets the viewport shrink below the canvas's last measured size (otherwise the bottom HUD is clipped) */}
      <main className="relative flex-1 min-h-0 w-full h-full">
        <RadioRoomScene />

        {/* Current investigation objective (top-left HUD) */}
        <ObjectiveTracker />

        {/* Bottom Station HUD Quick Selector (Accessibility & Mobile) */}
        {!isModalOpen && (
        <div className="absolute bottom-4 inset-x-0 mx-auto max-w-6xl px-4 pointer-events-none">
          <div className="p-2 rounded-lg bg-radio-panel/90 backdrop-blur-md border border-radio-border flex flex-wrap items-center justify-center gap-2 text-xs font-mono pointer-events-auto">
            {RADIO_STATIONS.map((station) => {
              const isSelected = activeStation === station.id;
              const status = getStationStatus(station.id, progress);
              return (
                <button
                  key={station.id}
                  onClick={() => handleStationClick(station.id)}
                  title={status.requirement ? `REQUIRED: ${status.requirement}` : undefined}
                  className={`px-3 py-1.5 rounded border transition-all flex items-center gap-2 ${
                    isSelected
                      ? "border-radio-cyan bg-cyan-950/60 text-white shadow-cyan-glow scale-105"
                      : status.isLocked
                      ? "border-red-950 bg-red-950/20 text-red-400 hover:border-red-600"
                      : "border-radio-border bg-radio-surface/60 text-radio-text hover:border-radio-cyan/60 hover:text-white"
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: status.color }}
                  />
                  <span className="font-semibold text-[11px] tracking-wider">
                    {station.name}
                  </span>
                  <span className="text-[9px] opacity-80 hidden sm:inline">
                    [{status.label}]
                  </span>
                </button>
              );
            })}
            {/* Investigation Board Button */}
            <button
              onClick={() => {
                if (audioEnabled) sound.playClick();
                openInvestigationBoard();
              }}
              className="px-3 py-1.5 rounded border border-cyan-500/50 bg-cyan-950/40 text-cyan-300 text-[11px] font-bold tracking-wider hover:bg-cyan-900/50 hover:border-cyan-400 transition-all flex items-center gap-2 ml-2"
            >
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              INVESTIGATION BOARD
            </button>
          </div>
        </div>
        )}
      </main>

      {/* 2D React Modals for Active Interactive Stations */}
      {activeStation === "communication-terminal" && (
        <CommunicationTerminalModal onClose={() => setActiveStation(null)} />
      )}
      {activeStation === "voice-archive" && (
        <VoiceArchiveModal onClose={() => setActiveStation(null)} />
      )}
      {activeStation === "signal-monitor" && (
        <SignalMonitorModal onClose={() => setActiveStation(null)} />
      )}
      {activeStation === "network-map" && (
        <NetworkMapModal onClose={() => setActiveStation(null)} />
      )}
      {activeStation === "emergency-broadcast" && (
        <EmergencyBroadcastModal onClose={() => setActiveStation(null)} onComplete={onComplete} />
      )}
      {investigationBoardOpen && (
        <InvestigationBoardModal onClose={closeInvestigationBoard} />
      )}
    </div>
  );
};
