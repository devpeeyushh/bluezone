"use client";

import React from "react";
import { EntryScreen } from "./EntryScreen";
import { RadioHub } from "./RadioHub";
import { CRTEffect } from "./ui/CRTEffect";
import { useBlueZoneStore } from "../store/useBlueZoneStore";

export interface BlueZoneProps {
  onComplete?: () => void;
  onExit?: () => void;
}

export const BlueZone: React.FC<BlueZoneProps> = ({ onComplete, onExit }) => {
  const { entered, enterHub, completed } = useBlueZoneStore();

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
