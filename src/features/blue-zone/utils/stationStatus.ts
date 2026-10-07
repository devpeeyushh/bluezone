import { StationId } from "../types/radio.types";
import { BlueZoneState } from "../store/useBlueZoneStore";

// Single source of truth for station status, shared by the in-world tags,
// the HUD interaction prompt and the bottom station selector.
// Derived purely from the existing progression flags in the store.

export type ProgressSnapshot = Pick<
  BlueZoneState,
  | "challenge1Solved"
  | "challenge2Solved"
  | "challenge3Solved"
  | "voiceArchiveUnlocked"
  | "signalMonitorUnlocked"
  | "networkUnlocked"
  | "broadcastUnlocked"
  | "completed"
> & {
  // Optional so existing snapshot builders stay valid; only the station tag/selector pass it
  ctf03Solved?: boolean;
};

export interface StationStatusInfo {
  label: string; // short badge label
  promptStatus: string; // fuller status line for the interaction prompt
  color: string;
  isLocked: boolean;
  requirement: string | null; // what must be done first (never the answer)
}

const COLOR = {
  locked: "#ff3344",
  verified: "#10b981",
  cyan: "#00f0ff",
  cyanSoft: "#00d2ff",
  amber: "#ffb703",
};

const locked = (requirement: string, promptStatus = "LOCKED"): StationStatusInfo => ({
  label: "LOCKED",
  promptStatus,
  color: COLOR.locked,
  isLocked: true,
  requirement,
});

const open = (label: string, color: string): StationStatusInfo => ({
  label,
  promptStatus: label,
  color,
  isLocked: false,
  requirement: null,
});

export function getSolvedCount(s: ProgressSnapshot): number {
  return (s.challenge1Solved ? 1 : 0) + (s.challenge2Solved ? 1 : 0) + (s.challenge3Solved ? 1 : 0);
}

export function getStationStatus(id: StationId, s: ProgressSnapshot): StationStatusInfo {
  switch (id) {
    case "communication-terminal":
      return s.challenge1Solved ? open("VERIFIED", COLOR.verified) : open("AVAILABLE", COLOR.cyan);

    // Hosts the standalone CTF 03, so the station itself is never locked
    case "voice-archive":
      return s.ctf03Solved ? open("VERIFIED", COLOR.verified) : open("AVAILABLE", COLOR.cyanSoft);

    case "signal-monitor":
      if (!s.signalMonitorUnlocked) return locked("COMPLETE CTF 02 // NETWORK MAP");
      return s.challenge2Solved ? open("VERIFIED", COLOR.verified) : open("AVAILABLE", COLOR.amber);

    case "network-map":
      if (!s.networkUnlocked) return locked("COMPLETE CTF 01 // COMMUNICATION TERMINAL");
      return s.challenge3Solved ? open("VERIFIED", COLOR.verified) : open("AVAILABLE", COLOR.cyan);

    case "emergency-broadcast":
      if (!s.broadcastUnlocked) {
        return locked(`COMPLETE 3 INVESTIGATION CHALLENGES [${getSolvedCount(s)}/3]`, "SECURITY LOCKED");
      }
      return s.completed ? open("COMPLETE", COLOR.verified) : open("OVERRIDE READY", COLOR.amber);
  }
}
