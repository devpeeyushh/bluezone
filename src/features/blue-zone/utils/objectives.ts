import { ProgressSnapshot } from "./stationStatus";

// Current investigation objective, derived from the existing progression flags.
// Wording describes the task and where to go — never the answer.

export interface ObjectiveInfo {
  id: "c1" | "c2" | "c3" | "broadcast" | "complete";
  step: number; // 1-based, out of OBJECTIVE_STEPS
  text: string;
  location: string;
}

export const OBJECTIVE_STEPS = 4;

export function getCurrentObjective(s: ProgressSnapshot): ObjectiveInfo {
  if (!s.challenge1Solved) {
    return {
      id: "c1",
      step: 1,
      text: "Reconstruct the degraded communication packet.",
      location: "COMMUNICATION TERMINAL",
    };
  }
  if (!s.challenge2Solved) {
    return {
      id: "c2",
      step: 2,
      text: "Cross-reference failed transmission evidence.",
      location: "VOICE ARCHIVE // SIGNAL MONITOR",
    };
  }
  if (!s.challenge3Solved) {
    return {
      id: "c3",
      step: 3,
      text: "Reconstruct the resident communication mesh.",
      location: "NETWORK MAP",
    };
  }
  if (!s.completed) {
    return {
      id: "broadcast",
      step: 4,
      text: "Trace the emergency broadcast origin.",
      location: "EMERGENCY BROADCAST RELAY",
    };
  }
  return {
    id: "complete",
    step: OBJECTIVE_STEPS,
    text: "Communication trail complete.",
    location: "NEXT REQUIRED SECTOR // FORENSICS",
  };
}
