"use client";

import { useShallow } from "zustand/react/shallow";
import { useBlueZoneStore } from "../../../store/useBlueZoneStore";
import { getSolvedCount, ProgressSnapshot } from "../../../utils/stationStatus";
import { REDUCED_MOTION_SCALE, usePrefersReducedMotion } from "./envUtils";

// Read-only view of existing progression for the visual environment.
// level: 0 = objective 01, 1 = objective 02, 2 = objective 03, 3 = objective 04 (broadcast pending), 4 = complete.
export interface EnvironmentState {
  level: number;
  completed: boolean;
  converging: boolean; // Emergency Broadcast cinematic is running
  motion: number; // 1, or REDUCED_MOTION_SCALE when prefers-reduced-motion
}

// Existing progression flags (same snapshot the HUD uses for station status)
export function useProgressSnapshot(): ProgressSnapshot {
  return useBlueZoneStore(
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
}

export function useEnvironmentState(): EnvironmentState {
  const { solved, completed, stage } = useBlueZoneStore(
    useShallow((s) => ({ solved: getSolvedCount(s), completed: s.completed, stage: s.cinematicStage }))
  );
  const reduced = usePrefersReducedMotion();
  return {
    level: completed ? 4 : solved,
    completed,
    converging: stage === "stabilizing" || stage === "reconstructing" || stage === "revealed",
    motion: reduced ? REDUCED_MOTION_SCALE : 1,
  };
}
