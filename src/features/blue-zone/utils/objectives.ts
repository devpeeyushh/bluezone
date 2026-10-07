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
      text: "Reconstruct the intercepted transmission.",
      location: "COMMUNICATION TERMINAL",
    };
  }
  // CTF 02 (challenge3Solved flag) comes before the voice/signal investigation
  if (!s.challenge3Solved) {
    return {
      id: "c3",
      step: 2,
      text: "Find the compromised relay node and decrypt it.",
      location: "NETWORK MAP",
    };
  }
  if (!s.challenge2Solved) {
    return {
      id: "c2",
      step: 3,
      text: "Cross-reference failed transmission evidence.",
      location: "VOICE ARCHIVE // SIGNAL MONITOR",
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
