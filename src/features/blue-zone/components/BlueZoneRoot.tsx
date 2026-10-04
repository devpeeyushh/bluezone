"use client";

import React from "react";
import { EntryScreen } from "./EntryScreen";
import { RadioHub } from "./RadioHub";
import { CRTEffect } from "./ui/CRTEffect";
import { useShallow } from "zustand/react/shallow";
import { useBlueZoneStore } from "../store/useBlueZoneStore";
import { BlueZoneCompletionPayload } from "../types/integration.types";

export interface BlueZoneProps {
  // Fired once when the Emergency Broadcast reveal completes. The parent decides what happens next
  // (Blue Zone never navigates on its own). A zero-argument handler is still valid.
  onComplete?: (payload: BlueZoneCompletionPayload) => void;
  // Fired when the player presses EXIT HUB.
  onExit?: () => void;
}

export const BlueZone: React.FC<BlueZoneProps> = ({ onComplete, onExit }) => {
  // Select only what this root needs. Subscribing to the whole store re-rendered the entire tree
  // (including the 3D scene) on every session-timer tick.
  const { entered, enterHub } = useBlueZoneStore(
    useShallow((s) => ({ entered: s.entered, enterHub: s.enterHub }))
  );

  const handleZoneExit = () => {
    if (onExit) onExit();
  };

  return (
    <div className="relative w-full h-full min-h-screen bg-radio-dark text-radio-text font-mono overflow-hidden">
      {/* Cinematic CRT Scanlines & Grain Overlay */}
      <CRTEffect />

      {/* Main Flow: Screen 1 Entry vs Screen 2 Radio Hub */}
      {!entered ? (
        <EntryScreen onEnter={enterHub} />
      ) : (
        <RadioHub onExit={handleZoneExit} onComplete={onComplete} />
      )}
    </div>
  );
};

export default BlueZone;
